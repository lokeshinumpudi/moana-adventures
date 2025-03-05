import { io } from 'socket.io-client';
import * as THREE from 'three';
import { Ship } from './components/Ship.js';
import { Character } from './components/Character.js';

export class SocketManager {
  constructor(game) {
    if (SocketManager.instance) {
      return SocketManager.instance;
    }
    
    this.game = game;
    this.otherPlayers = new Map();
    this.lastUpdateTime = 0;
    this.updateInterval = 50; // 20 times per second
    
    // Performance optimization settings
    this.interpolationFactor = 0.1; // Lower = smoother but more latency
    this.positionThreshold = 0.1; // Increased threshold to reduce network traffic
    this.rotationThreshold = 0.05; // Increased threshold to reduce network traffic
    this.lastSentState = null; // Store last sent state to check for significant changes
    
    // Level of detail settings for distant players
    this.lodDistanceThreshold = 50; // Distance at which to reduce detail
    this.visibilityRange = 150; // Maximum range to show other players
    
    // Projectile optimization
    this.projectileUpdateInterval = 80; // Separate interval for when projectiles are active
    this.projectilePositionThreshold = 2.0; // Higher threshold for projectile position changes
    
    // Initialize socket connection
    this.socket = null;
    this.init();
    
    SocketManager.instance = this;
  }
  
  init() {
    if (this.socket) {
      console.warn('Socket connection already exists');
      return;
    }
    
    this.socket = io('http://localhost:3000', {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });
    
    this.setupSocketListeners();
  }
  
  setupSocketListeners() {
    // Remove any existing listeners
    this.socket.removeAllListeners();
    
    this.socket.on('connect', () => {
      console.log('Connected to server');
      // Send initial state immediately on connect
      if (this.game.ship) {
        this.socket.emit('player:join', {
          id: this.socket.id,
          name: `Player ${this.socket.id.substring(0, 4)}`,
          ship: this.game.getGameState().ship
        });
      }
    });
    
    // Handle player list updates
    this.socket.on('players:list', (players) => {
      console.log('Received players list:', players);
      
      // Remove players that aren't in the new list
      for (const [id, player] of this.otherPlayers) {
        if (!players.find(p => p.id === id)) {
          this.removePlayer(id);
        }
      }
      
      // Add or update players from the list
      players.forEach(playerData => {
        if (playerData.id !== this.socket.id) {
          if (!this.otherPlayers.has(playerData.id)) {
            this.addOtherPlayer(playerData);
          } else {
            this.updateOtherPlayer(playerData);
          }
        }
      });
    });
    
    // Handle new player joins
    this.socket.on('player:joined', (playerData) => {
      console.log('Player joined:', playerData);
      if (playerData.id !== this.socket.id && !this.otherPlayers.has(playerData.id)) {
        this.addOtherPlayer(playerData);
      }
    });
    
    // Handle player disconnects
    this.socket.on('player:left', (playerId) => {
      console.log('Player left:', playerId);
      this.removePlayer(playerId);
    });
    
    // Handle player state updates
    this.socket.on('player:updated', (data) => {
      if (data.id === this.socket.id) return;
      
      const player = this.otherPlayers.get(data.id);
      if (!player) return;
      
      this.updateOtherPlayer(data);
    });
    
    // Handle projectile events
    this.socket.on('projectile:fire', (data) => {
      if (data.playerId === this.socket.id) return;
      
      const player = this.otherPlayers.get(data.playerId);
      if (!player) return;
      
      this.handleProjectileFire(data);
    });
    
    // Listen for projectile:added event from server
    this.socket.on('projectile:added', (data) => {
      console.log('Received projectile:added event:', data);
      this.handleProjectileFire(data);
    });
    
    this.socket.on('projectile:hit', (data) => {
      this.handleProjectileHit(data);
    });
    
    // Handle player hit events
    this.socket.on('player:hit', (data) => {
      this.handlePlayerHit(data);
    });
    
    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
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
    if (!this.socket?.connected || !this.game.ship) return;
    
    const now = Date.now();
    const hasActiveProjectiles = this.game.projectiles.length > 0;
    const updateInterval = hasActiveProjectiles ? this.projectileUpdateInterval : this.updateInterval;
    
    if (now - this.lastUpdateTime < updateInterval) return;
    
    // Send current state to server
    const currentState = this.game.getGameState();
    this.socket.emit('player:state', {
      id: this.socket.id,
      ...currentState
    });
    
    // Update other players' interpolation
    this.interpolateOtherPlayers(delta);
    
    this.lastUpdateTime = now;
  }
  
  hasSignificantChanges(currentState) {
    if (!this.lastSentState) return true;
    
    const hasProjectiles = this.game.projectiles.length > 0;
    const posThreshold = hasProjectiles ? this.projectilePositionThreshold : this.positionThreshold;
    
    const positionChanged = Math.abs(currentState.ship.position.x - this.lastSentState.ship.position.x) > posThreshold ||
                           Math.abs(currentState.ship.position.y - this.lastSentState.ship.position.y) > posThreshold ||
                           Math.abs(currentState.ship.position.z - this.lastSentState.ship.position.z) > posThreshold;
                           
    const rotationChanged = Math.abs(currentState.ship.rotation.y - this.lastSentState.ship.rotation.y) > this.rotationThreshold;
    
    return positionChanged || rotationChanged;
  }
  
  sendGameState() {
    if (!this.socket.connected) return;
    
    const gameState = this.game.getGameState();
    
    // Check if there are significant changes before sending
    if (this.hasSignificantChanges(gameState)) {
      // Remove projectiles from state we send (we'll handle them separately)
      const stateToSend = { ...gameState };
      delete stateToSend.projectiles;
      
      this.socket.emit('player:state', stateToSend);
      this.lastSentState = { ...gameState };
    }
  }
  
  // Register a projectile fired by the local player with the server
  fireProjectile(projectile) {
    if (!this.socket.connected) return;
    
    const projectileData = {
      playerId: this.socket.id,
      id: Date.now() + '_' + Math.floor(Math.random() * 1000),
      position: projectile.mesh.position.clone(),
      velocity: projectile.velocity.clone(),
      type: projectile.isMachineGun ? 'machineGun' : 'cannon'
    };

    console.log('Sending projectile fire:', projectileData);
    this.socket.emit('projectile:fire', projectileData);
  }
  
  // Create a lightweight projectile representation for other players
  createSimplifiedProjectile(position, direction, size, isMachineGun) {
    const geometry = new THREE.SphereGeometry(size, 8, 8);
    
    // Use a simpler material for performance
    const material = new THREE.MeshBasicMaterial({
      color: isMachineGun ? 0xFFFF00 : 0xFF0000
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    
    // Create a simplified projectile object
    const projectile = {
      mesh: mesh,
      velocity: direction.clone().multiplyScalar(isMachineGun ? 3 : 2),
      damage: isMachineGun ? 1 : 10,
      isMachineGun: isMachineGun,
      lifetime: 0,
      maxLifetime: 10 // in seconds
    };
    
    return projectile;
  }
  
  addOtherPlayer(playerData) {
    if (playerData.id === this.socket.id || this.otherPlayers.has(playerData.id)) {
      return;
    }
    
    const ship = new Ship();
    ship.init().then(() => {
      // Set initial position and rotation if available
      if (playerData.ship) {
        if (playerData.ship.position) {
          ship.mesh.position.set(
            playerData.ship.position.x,
            playerData.ship.position.y,
            playerData.ship.position.z
          );
        }
        if (playerData.ship.rotation) {
          ship.mesh.rotation.set(
            playerData.ship.rotation.x,
            playerData.ship.rotation.y,
            playerData.ship.rotation.z
          );
        }
      }
      
      // Add to scene
      this.game.scene.add(ship.mesh);
      
      // Store player data
      this.otherPlayers.set(playerData.id, {
        id: playerData.id,
        name: playerData.name,
        ship: ship,
        projectiles: [],
        interpolation: {
          position: ship.mesh.position.clone(),
          rotation: ship.mesh.rotation.clone(),
          targetPosition: ship.mesh.position.clone(),
          targetRotation: ship.mesh.rotation.clone(),
          lastUpdateTime: Date.now()
        }
      });
    });
  }
  
  updateOtherPlayer(playerData) {
    const player = this.otherPlayers.get(playerData.id);
    if (!player || !player.ship) return;
    
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
    
    // Handle projectile events - client-side prediction model
    if (playerData.projectiles && playerData.projectiles.length > 0) {
      playerData.projectiles.forEach(projectileData => {
        // Only process new projectiles we haven't seen before
        // This is the key change - we only add new projectiles, then predict locally
        if (!player.projectiles.some(p => p.id === projectileData.id)) {
          // Get the initial position and direction
          const position = new THREE.Vector3(
            projectileData.position.x,
            projectileData.position.y,
            projectileData.position.z
          );
          
          const velocity = new THREE.Vector3(
            projectileData.velocity.x,
            projectileData.velocity.y,
            projectileData.velocity.z
          );
          
          // Determine direction from velocity
          const direction = velocity.clone().normalize();
          
          // Determine if it's a machine gun or cannonball
          const isMachineGun = projectileData.type === 'machineGun';
          const size = isMachineGun ? 0.1 : 0.5;
          
          // Create a simplified projectile for other players
          const projectile = this.createSimplifiedProjectile(position, direction, size, isMachineGun);
          
          // Copy ID from network data
          projectile.id = projectileData.id;
          
          // Set velocity directly from data
          projectile.velocity = velocity.clone();
          
          // Set creation time
          projectile.creationTime = Date.now();
          
          // Set the initial position explicitly
          projectile.initialPosition = position.clone();
          
          // Add to scene and player's projectiles array
          this.game.scene.add(projectile.mesh);
          player.projectiles.push(projectile);
          
          // Add appropriate visual effect
          if (this.game.particleSystem) {
            if (isMachineGun) {
              this.game.particleSystem.createMuzzleFlash(position);
            } else {
              this.game.particleSystem.createCannonFire(position);
            }
          }
          
          // Create sound for projectile firing - not implemented in this version
          // if (this.game.soundManager) {
          //   this.game.soundManager.playSound(isMachineGun ? 'machineGun' : 'cannon', position);
          // }
        }
        
        // We no longer update existing projectiles based on network data
        // Instead, we'll let the client-side physics handle all trajectory updates
      });
      
      // We still track the projectile IDs the server knows about to handle server reconciliation
      this.knownProjectileIds = new Set(playerData.projectiles.map(p => p.id));
    }
    
    // Handle projectile removal events (server-side hits or timeout)
    if (playerData.removeProjectileIds && playerData.removeProjectileIds.length > 0) {
      playerData.removeProjectileIds.forEach(projectileId => {
        const projectileIndex = player.projectiles.findIndex(p => p.id === projectileId);
        if (projectileIndex !== -1) {
          // Remove from scene
          this.game.scene.remove(player.projectiles[projectileIndex].mesh);
          
          // Remove from array
          player.projectiles.splice(projectileIndex, 1);
          
          // If there's hit position data, create a hit effect
          if (playerData.hitPositions && playerData.hitPositions[projectileId]) {
            const hitPos = playerData.hitPositions[projectileId];
            const hitPosition = new THREE.Vector3(hitPos.x, hitPos.y, hitPos.z);
            
            // Create hit effect
            if (this.game.particleSystem) {
              this.game.particleSystem.createHitEffect(hitPosition);
            }
          }
        }
      });
    }
    
    // Safety cleanup - remove any projectiles that are too old (10 seconds)
    const now = Date.now();
    const maxAge = 10000; // 10 seconds
    
    for (let i = player.projectiles.length - 1; i >= 0; i--) {
      const projectile = player.projectiles[i];
      if (now - projectile.creationTime > maxAge) {
        // Remove from scene
        this.game.scene.remove(projectile.mesh);
        
        // Remove from array
        player.projectiles.splice(i, 1);
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
        if (player.character?.mesh) {
          player.character.mesh.visible = false;
        }
        return;
      } else {
        player.ship.mesh.visible = true;
        if (player.character?.mesh) {
          player.character.mesh.visible = true;
        }
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
      if (player.character?.mesh) {
        player.character.mesh.position.copy(player.ship.getCharacterPosition());
        player.character.mesh.rotation.copy(player.ship.mesh.rotation);
      }
      
      // Update projectiles
      player.projectiles.forEach(projectile => {
        projectile.update(delta);
      });
    });
  }
  
  removePlayer(playerId) {
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
  
  handleProjectileFire(data) {
    console.log('Received projectile event:', data);
    
    // Skip if this is our own projectile
    if (data.playerId === this.socket.id) {
      console.log('Skipping own projectile');
      return;
    }
    
    // Get the player who fired
    const player = this.otherPlayers.get(data.playerId);
    if (!player) {
      console.log('Player not found for projectile:', data.playerId);
      return;
    }
    
    // Initialize player's projectiles array if it doesn't exist
    if (!player.projectiles) {
      player.projectiles = [];
    }

    // Create projectile
    const position = new THREE.Vector3(
      data.position.x, 
      data.position.y, 
      data.position.z
    );
    
    const velocity = new THREE.Vector3(
      data.velocity.x, 
      data.velocity.y, 
      data.velocity.z
    );
    
    // Determine if this is a machine gun projectile
    const isMachineGun = data.type === 'machineGun';
    
    const projectile = this.game.createProjectile(
      position, 
      velocity.clone().normalize(), 
      isMachineGun
    );
    
    projectile.velocity.copy(velocity);
    projectile.id = data.id;
    projectile.creationTime = Date.now();

    // Add to scene and player's projectiles
    this.game.scene.add(projectile.mesh);
    player.projectiles.push(projectile);

    console.log('Created projectile for player:', {
      playerId: data.playerId,
      id: projectile.id,
      position: projectile.mesh.position.toArray(),
      velocity: projectile.velocity.toArray(),
      type: data.type
    });
  }
  
  handleProjectileHit(data) {
    console.log('Received projectile hit:', data);
    
    // Find the projectile in projectiles array
    if (this.game.projectiles) {
      const projectileIndex = this.game.projectiles.findIndex(p => p.id === data.id);
      
      if (projectileIndex >= 0) {
        const projectile = this.game.projectiles[projectileIndex];
        
        // Create explosion effect at hit position
        if (data.position) {
          const hitPosition = new THREE.Vector3(
            data.position.x,
            data.position.y,
            data.position.z
          );
          
          // Create explosion effect
          this.game.particleSystem.createExplosion(hitPosition, 1.0);
        } else if (projectile && projectile.mesh) {
          // If hit position not provided, use projectile position
          this.game.particleSystem.createExplosion(projectile.mesh.position, 1.0);
        }
        
        // Remove projectile from scene and array
        if (projectile && projectile.mesh) {
          this.game.scene.remove(projectile.mesh);
        }
        
        // Remove from array
        this.game.projectiles.splice(projectileIndex, 1);
      }
    }
    
    // Also check in other players' projectiles
    this.otherPlayers.forEach(player => {
      if (player.projectiles) {
        const projectileIndex = player.projectiles.findIndex(p => p.id === data.id);
        
        if (projectileIndex >= 0) {
          const projectile = player.projectiles[projectileIndex];
          
          // Create explosion effect
          if (projectile && projectile.mesh) {
            this.game.particleSystem.createExplosion(projectile.mesh.position, 1.0);
            this.game.scene.remove(projectile.mesh);
          }
          
          // Remove from array
          player.projectiles.splice(projectileIndex, 1);
        }
      }
    });
  }
  
  handlePlayerHit(data) {
    console.log('Player hit:', data);
    
    // Flash the ship to indicate damage
    if (this.game.ship) {
      // Make the ship flash red briefly
      const originalMaterials = [];
      const shipParts = this.game.ship.getMeshes();
      
      // Store original materials and set to red
      shipParts.forEach(part => {
        if (part.material) {
          originalMaterials.push({
            mesh: part,
            material: part.material.clone()
          });
          
          // Create a red material
          const flashMaterial = new THREE.MeshStandardMaterial({
            color: 0xff0000,
            emissive: 0xff0000,
            emissiveIntensity: 0.5
          });
          
          part.material = flashMaterial;
        }
      });
      
      // Create hit effect particles at the hit position
      if (data.position) {
        const hitPosition = new THREE.Vector3(
          data.position.x,
          data.position.y,
          data.position.z
        );
        
        this.game.particleSystem.createExplosion(hitPosition, 0.5);
      }
      
      // Restore original materials after a short delay
      setTimeout(() => {
        originalMaterials.forEach(item => {
          item.mesh.material = item.material;
        });
      }, 100);
      
      // Show damage in the HUD
      if (this.game.hud) {
        this.game.hud.updateHealth(data.damage);
      }
    }
  }
} 