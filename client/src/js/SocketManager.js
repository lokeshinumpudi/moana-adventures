import { io } from 'socket.io-client';
import * as THREE from 'three';
import { Ship } from './components/Ship.js';
import { Character } from './components/Character.js';

export class SocketManager {
  constructor(game) {
    this.game = game;
    this.otherPlayers = new Map();
    this.lastUpdateTime = 0;
    this.updateInterval = 100; // Update rate: 10 times per second (reduced from 20)
    
    // Performance optimization settings
    this.interpolationFactor = 0.1; // Lower = smoother but more latency
    this.positionThreshold = 0.05; // Minimum position change before sending update
    this.rotationThreshold = 0.01; // Minimum rotation change before sending update
    this.lastSentState = null; // Store last sent state to check for significant changes
    
    // Level of detail settings for distant players
    this.lodDistanceThreshold = 50; // Distance at which to reduce detail
    this.visibilityRange = 150; // Maximum range to show other players
    
    this.init();
  }
  
  init() {
    // Connect to socket server
    const socketUrl = import.meta.env.PROD 
      ? 'https://your-production-server.com' // Update with your production URL
      : 'http://localhost:3000';
      
    this.socket = io(socketUrl, {
      // Configure Socket.IO options for better performance
      transports: ['websocket'],
      upgrade: false, // Disable polling
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000
    });
    
    // Set up event handlers
    this.setupEventHandlers();
    
    // Send join event when connected
    this.socket.on('connect', () => {
      console.log('Connected to server with ID:', this.socket.id);
      
      this.socket.emit('player:join', {
        name: 'Player ' + Math.floor(Math.random() * 1000),
        color: '#' + Math.floor(Math.random() * 16777215).toString(16)
      });
    });
    
    // Set up update loop for sending player data
    this.setupUpdateLoop();
  }
  
  setupEventHandlers() {
    // Receive existing players
    this.socket.on('players:list', (players) => {
      console.log('Received existing players:', players);
      
      // Handle players in batches to avoid frame drops
      this.processBatchedPlayers(players);
    });
    
    // New player joined
    this.socket.on('player:joined', (player) => {
      console.log('New player joined:', player);
      this.addOtherPlayer(player);
    });
    
    // Player updated
    this.socket.on('player:updated', (playerData) => {
      this.updateOtherPlayer(playerData);
    });
    
    // Player left
    this.socket.on('player:left', (playerId) => {
      console.log('Player left:', playerId);
      this.removeOtherPlayer(playerId);
    });
    
    // Disconnection
    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });
    
    // Error handling
    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  }
  
  processBatchedPlayers(players) {
    // Process players in batches to avoid frame drops
    const batchSize = 3;
    let currentBatch = 0;
    
    const processBatch = () => {
      const start = currentBatch * batchSize;
      const end = Math.min(start + batchSize, players.length);
      
      // Process a batch of players
      for (let i = start; i < end; i++) {
        this.addOtherPlayer(players[i]);
      }
      
      currentBatch++;
      
      // Schedule next batch if needed
      if (currentBatch * batchSize < players.length) {
        setTimeout(processBatch, 300);
      }
    };
    
    // Start processing
    processBatch();
  }
  
  setupUpdateLoop() {
    // We no longer override the game.update method
    // The Game class will call our update method directly
  }
  
  update(delta) {
    // Interpolate other players' positions
    this.interpolateOtherPlayers(delta);
    
    // Send player state to server at fixed interval
    const now = Date.now();
    if (now - this.lastUpdateTime > this.updateInterval) {
      this.sendGameState();
      this.lastUpdateTime = now;
    }
  }
  
  hasSignificantChanges(currentState) {
    // Skip throttling if we haven't sent anything yet
    if (!this.lastSentState) return true;
    
    // Check if ship position has changed significantly
    const positionChanged = 
      Math.abs(currentState.ship.position.x - this.lastSentState.ship.position.x) > this.positionThreshold ||
      Math.abs(currentState.ship.position.y - this.lastSentState.ship.position.y) > this.positionThreshold ||
      Math.abs(currentState.ship.position.z - this.lastSentState.ship.position.z) > this.positionThreshold;
    
    // Check if rotation has changed significantly
    const rotationChanged = 
      Math.abs(currentState.ship.rotation.y - this.lastSentState.ship.rotation.y) > this.rotationThreshold;
    
    // Check if health has changed
    const healthChanged = currentState.ship.health !== this.lastSentState.ship.health;
    
    // Always send if projectiles have changed
    const projectilesChanged = 
      !this.lastSentState.projectiles || 
      currentState.projectiles.length !== this.lastSentState.projectiles.length;
    
    return positionChanged || rotationChanged || healthChanged || projectilesChanged;
  }
  
  sendGameState() {
    // Only send if connected and game is running
    if (this.socket && this.socket.connected && this.game.isRunning) {
      const gameState = this.game.getGameState();
      
      // Check if there are significant changes before sending
      if (this.hasSignificantChanges(gameState)) {
        this.socket.emit('player:state', gameState);
        this.lastSentState = gameState;
      }
    }
  }
  
  addOtherPlayer(playerData) {
    // Don't add if it's our own player or already exists
    if (playerData.id === this.socket.id || this.otherPlayers.has(playerData.id)) {
      return;
    }
    
    // Create a new ship for the other player
    const otherShip = new Ship();
    
    // Use a simplified init since we don't need full functionality for other players
    otherShip.init().then(() => {
      // Create character for the ship
      const character = new Character();
      character.init().then(() => {
        // Disable hairPhysics on remote characters to save performance
        character.hairPhysicsEnabled = false;
        
        // Set initial position if available
        if (playerData.ship && playerData.ship.position) {
          otherShip.mesh.position.set(
            playerData.ship.position.x,
            playerData.ship.position.y,
            playerData.ship.position.z
          );
          
          if (playerData.ship.rotation) {
            otherShip.mesh.rotation.set(
              playerData.ship.rotation.x,
              playerData.ship.rotation.y,
              playerData.ship.rotation.z
            );
          }
          
          character.mesh.position.copy(otherShip.getCharacterPosition());
        }
        
        // Add to scene
        this.game.scene.add(otherShip.mesh);
        this.game.scene.add(character.mesh);
        
        // Store player data
        this.otherPlayers.set(playerData.id, {
          id: playerData.id,
          name: playerData.name,
          ship: otherShip,
          character: character,
          projectiles: [],
          // Add interpolation data
          interpolation: {
            position: new THREE.Vector3().copy(otherShip.mesh.position),
            rotation: new THREE.Euler().copy(otherShip.mesh.rotation),
            targetPosition: new THREE.Vector3().copy(otherShip.mesh.position),
            targetRotation: new THREE.Euler().copy(otherShip.mesh.rotation),
            lastUpdateTime: Date.now()
          }
        });
      });
    });
  }
  
  updateOtherPlayer(playerData) {
    const player = this.otherPlayers.get(playerData.id);
    if (!player) return;
    
    // Update interpolation targets
    if (playerData.ship) {
      if (playerData.ship.position) {
        player.interpolation.targetPosition.set(
          playerData.ship.position.x,
          playerData.ship.position.y,
          playerData.ship.position.z
        );
      }
      
      if (playerData.ship.rotation) {
        player.interpolation.targetRotation.set(
          playerData.ship.rotation.x,
          playerData.ship.rotation.y,
          playerData.ship.rotation.z
        );
      }
      
      player.interpolation.lastUpdateTime = Date.now();
    }
    
    // Update projectiles - create new ones or update existing
    if (playerData.projectiles && playerData.projectiles.length > 0) {
      playerData.projectiles.forEach(projectileData => {
        let projectile = player.projectiles.find(p => p.id === projectileData.id);
        
        // Create new projectile if doesn't exist
        if (!projectile) {
          projectile = player.ship.createProjectile();
          this.game.scene.add(projectile.mesh);
          player.projectiles.push(projectile);
        }
        
        // Update projectile position and velocity
        if (projectileData.position) {
          projectile.mesh.position.set(
            projectileData.position.x,
            projectileData.position.y,
            projectileData.position.z
          );
        }
        
        if (projectileData.velocity) {
          projectile.velocity.set(
            projectileData.velocity.x,
            projectileData.velocity.y,
            projectileData.velocity.z
          );
        }
      });
      
      // Remove projectiles that are no longer in the update
      const projectileIds = new Set(playerData.projectiles.map(p => p.id));
      for (let i = player.projectiles.length - 1; i >= 0; i--) {
        if (!projectileIds.has(player.projectiles[i].id)) {
          this.game.scene.remove(player.projectiles[i].mesh);
          player.projectiles.splice(i, 1);
        }
      }
    }
  }
  
  interpolateOtherPlayers(delta) {
    // Get main player position for distance checks
    const mainPlayerPosition = this.game.ship.mesh.position;
    
    // Update all other players
    this.otherPlayers.forEach(player => {
      // Calculate distance to main player
      const distance = mainPlayerPosition.distanceTo(player.ship.mesh.position);
      
      // Skip updates for very distant players
      if (distance > this.visibilityRange) {
        player.ship.mesh.visible = false;
        player.character.mesh.visible = false;
        return;
      } else {
        player.ship.mesh.visible = true;
        player.character.mesh.visible = true;
      }
      
      // Adjust interpolation speed based on distance
      // Further away = faster catch-up to reduce perceived latency
      let interpolationSpeed = this.interpolationFactor;
      if (distance > this.lodDistanceThreshold) {
        interpolationSpeed = Math.min(1, this.interpolationFactor * 2);
      }
      
      // Calculate time since last update (cap at 1 second to prevent huge jumps)
      const timeSinceUpdate = Math.min(1000, Date.now() - player.interpolation.lastUpdateTime) / 1000;
      
      // Adjust interpolation based on time since last update 
      // (faster catch-up if updates are infrequent)
      interpolationSpeed = Math.min(1, interpolationSpeed + timeSinceUpdate * 0.5);
      
      // Interpolate position
      player.ship.mesh.position.lerp(player.interpolation.targetPosition, interpolationSpeed);
      
      // Interpolate rotation (needs special handling for angles)
      const currentRotation = player.ship.mesh.rotation;
      const targetRotation = player.interpolation.targetRotation;
      
      // Handle potential 2π wraparound in rotation
      ['x', 'y', 'z'].forEach(axis => {
        let diff = targetRotation[axis] - currentRotation[axis];
        
        // Ensure we rotate the shortest direction
        if (diff > Math.PI) diff -= Math.PI * 2;
        if (diff < -Math.PI) diff += Math.PI * 2;
        
        currentRotation[axis] += diff * interpolationSpeed;
      });
      
      // Update character position based on ship
      if (player.character) {
        player.character.mesh.position.copy(player.ship.getCharacterPosition());
        player.character.mesh.rotation.copy(player.ship.mesh.rotation);
      }
      
      // Update projectiles
      player.projectiles.forEach(projectile => {
        projectile.update(delta);
      });
    });
  }
  
  removeOtherPlayer(playerId) {
    const player = this.otherPlayers.get(playerId);
    if (!player) return;
    
    // Remove ship from scene
    this.game.scene.remove(player.ship.mesh);
    
    // Remove character from scene
    if (player.character) {
      this.game.scene.remove(player.character.mesh);
    }
    
    // Remove all projectiles
    player.projectiles.forEach(projectile => {
      this.game.scene.remove(projectile.mesh);
    });
    
    // Remove from map
    this.otherPlayers.delete(playerId);
  }
} 