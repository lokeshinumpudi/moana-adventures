import { io } from 'socket.io-client';
import * as THREE from 'three';

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
    
    // Client-side prediction
    this.pendingInputs = []; // Store inputs that haven't been acknowledged by server
    this.lastProcessedInputTime = 0; // Last input time processed by server
    this.serverReconciliationEnabled = true; // Toggle for server reconciliation
    this.clientPredictionEnabled = true; // Toggle for client prediction
    this.entityInterpolationEnabled = true; // Toggle for entity interpolation
    
    // Projectile tracking
    this.localProjectiles = new Map(); // Track local projectiles by ID
    this.serverProjectiles = new Map(); // Track server projectiles by ID
    
    // Ping tracking
    this.lastPing = 0;
    this.pingInterval = null;
    this.pingStartTime = 0;
    
    // Initialize socket connection
    this.socket = null;
    this.init();
    
    SocketManager.instance = this;
  }
  
  init() {
    // Connect to the server
    this.socket = io('http://localhost:3000');
    
    // Set up socket event listeners
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
      
      // Start ping tracking
      this.pingStartTime = Date.now();
      this.socket.emit('ping');
    });
    
    // Add ping handler
    this.socket.on('pong', () => {
      this.lastPing = Date.now() - this.pingStartTime;
      
      // Schedule next ping
      setTimeout(() => {
        if (this.socket.connected) {
          this.pingStartTime = Date.now();
          this.socket.emit('ping');
        }
      }, 5000);
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
    
    // Handle player state updates - this is used for direct player-to-player updates
    this.socket.on('player:state', (playerData) => {
      if (playerData.id !== this.socket.id) {
        const existingPlayer = this.otherPlayers.get(playerData.id);
        if (existingPlayer) {
          this.updateOtherPlayer(playerData);
        } else {
          this.addOtherPlayer(playerData);
        }
      }
    });
    
    // Handle player updates from server
    this.socket.on('player:updated', (playerData) => {
      console.log('Received player update from server:', playerData);
      if (playerData.id !== this.socket.id) {
        const existingPlayer = this.otherPlayers.get(playerData.id);
        if (existingPlayer) {
          this.updateOtherPlayer(playerData);
        } else {
          this.addOtherPlayer(playerData);
        }
      }
    });
    
    // Handle player disconnects
    this.socket.on('player:left', (playerId) => {
      console.log('Player left:', playerId);
      this.removePlayer(playerId);
    });
    
    // Handle projectile fire events
    this.socket.on('projectile:added', (data) => {
      this.handleProjectileFire(data);
    });
    
    // Handle projectile hit events
    this.socket.on('projectile:hit', (data) => {
      this.handleProjectileHit(data);
    });
    
    // Handle projectile removed events
    this.socket.on('projectile:removed', (data) => {
      this.handleProjectileRemoved(data);
    });
    
    // Handle being hit by a projectile
    this.socket.on('player:hit', (data) => {
      this.handlePlayerHit(data);
    });
    
    // Handle server acknowledgement of inputs
    this.socket.on('input:ack', (data) => {
      this.lastProcessedInputTime = data.sequence;
      
      // Remove acknowledged inputs from pending inputs
      this.pendingInputs = this.pendingInputs.filter(input => 
        input.sequence > this.lastProcessedInputTime
      );
    });
    
    // Handle server reconciliation
    this.socket.on('reconcile', (data) => {
      if (this.serverReconciliationEnabled) {
        this.reconcileWithServer(data);
      }
    });
    
    // Handle batch player updates
    this.socket.on('players:batch', (players) => {
      this.processBatchedPlayers(players);
    });
    
    // Handle explorer state updates from other players
    this.socket.on('explorer:state', (data) => {
      if (data.playerId === this.socket.id) return; // Skip our own explorer
      
      // Get the player
      const player = this.otherPlayers.get(data.playerId);
      if (!player) return;
      
      // Tell the game to handle the explorer state
      this.game.handleOtherPlayerExplorer(data);
    });
    
    // Handle collectible pickup by other players
    this.socket.on('collectible:pickup', (data) => {
      if (data.playerId === this.socket.id) return; // Skip our own pickups
      
      // Tell the game to remove the collectible
      this.game.removeCollectible(data.collectibleId);
    });
    
    // Receive world data from server
    this.socket.on('world:data', (data) => {
      console.log('Received world data from server:', data);
      this.game.setWorldData(data);
    });
  }
  
  processBatchedPlayers(players) {
    // Split processing into chunks to avoid frame drops
    const CHUNK_SIZE = 5;
    let index = 0;
    
    const processBatch = () => {
      const end = Math.min(index + CHUNK_SIZE, players.length);
      
      for (let i = index; i < end; i++) {
        const playerData = players[i];
        if (playerData.id !== this.socket.id) {
          if (!this.otherPlayers.has(playerData.id)) {
            this.addOtherPlayer(playerData);
          } else {
            this.updateOtherPlayer(playerData);
          }
        }
      }
      
      index = end;
      
      if (index < players.length) {
        // Process next batch in next frame
        requestAnimationFrame(processBatch);
      }
    };
    
    processBatch();
  }
  
  update(delta) {
    if (!this.socket?.connected || !this.game.ship) return;
    
    const now = Date.now();
    const hasActiveProjectiles = this.game.projectiles.length > 0;
    const updateInterval = hasActiveProjectiles ? this.projectileUpdateInterval : this.updateInterval;
    
    // Only send updates at the specified interval
    if (now - this.lastUpdateTime < updateInterval) return;
    
    // Create input snapshot
    const input = this.createInputSnapshot();
    
    // Send current state to server
    const currentState = this.game.getGameState();
    
    // Add input sequence number
    currentState.inputSequence = input.sequence;
    
    // Add additional ship rotation data to ensure proper syncing
    if (currentState.ship) {
      currentState.ship.rotation = {
        x: this.game.ship.mesh.rotation.x,
        y: this.game.ship.mesh.rotation.y,
        z: this.game.ship.mesh.rotation.z
      };
      
      currentState.ship.direction = {
        x: this.game.ship.direction.x,
        y: this.game.ship.direction.y,
        z: this.game.ship.direction.z
      };
    }
    
    // Send the complete state including projectiles
    this.socket.emit('player:state', currentState);
    
    // Update other players' interpolation
    if (this.entityInterpolationEnabled) {
      this.updateOtherPlayersInterpolation(delta);
    }
    
    this.lastUpdateTime = now;
  }
  
  createInputSnapshot() {
    // Create a snapshot of current input state
    const input = {
      sequence: Date.now(), // Use timestamp as sequence number
      deltaTime: (Date.now() - this.lastUpdateTime) / 1000,
      position: this.game.ship.mesh.position.clone(),
      rotation: this.game.ship.mesh.rotation.clone(),
      speed: this.game.ship.speed,
      controls: {
        forward: this.game.inputManager.isMovingForward ? this.game.inputManager.isMovingForward() : 
                 (this.game.inputManager.keys && (this.game.inputManager.keys['w'] || this.game.inputManager.keys['ArrowUp'])),
        backward: this.game.inputManager.isMovingBackward ? this.game.inputManager.isMovingBackward() : 
                  (this.game.inputManager.keys && (this.game.inputManager.keys['s'] || this.game.inputManager.keys['ArrowDown'])),
        left: this.game.inputManager.isTurningLeft ? this.game.inputManager.isTurningLeft() : 
              (this.game.inputManager.keys && (this.game.inputManager.keys['a'] || this.game.inputManager.keys['ArrowLeft'])),
        right: this.game.inputManager.isTurningRight ? this.game.inputManager.isTurningRight() : 
               (this.game.inputManager.keys && (this.game.inputManager.keys['d'] || this.game.inputManager.keys['ArrowRight']))
      }
    };
    
    return input;
  }
  
  reconcileWithServer(serverState) {
    // Skip reconciliation if client prediction is disabled
    if (!this.clientPredictionEnabled) return;
    
    // Extract the server state for our ship
    const serverShipState = serverState.ship;
    if (!serverShipState) return;
    
    // Find the last input that the server has processed
    const lastProcessedInput = this.pendingInputs.find(
      input => input.sequence === serverState.inputSequence
    );
    
    if (!lastProcessedInput) return;
    
    // Calculate position error
    const positionError = new THREE.Vector3(
      serverShipState.position.x - lastProcessedInput.position.x,
      serverShipState.position.y - lastProcessedInput.position.y,
      serverShipState.position.z - lastProcessedInput.position.z
    );
    
    // If error is significant, correct the position
    if (positionError.length() > 0.1) {
      console.log(`Reconciling position error of ${positionError.length()}`);
      
      // Correct the position
      this.game.ship.mesh.position.set(
        serverShipState.position.x,
        serverShipState.position.y,
        serverShipState.position.z
      );
      
      // Re-apply all pending inputs
      for (const input of this.pendingInputs) {
        if (input.sequence > serverState.inputSequence) {
          this.game.ship.update(input.deltaTime, this.game.inputManager);
        }
      }
    }
  }
  
  addOtherPlayer(playerData) {
    console.log('Adding other player:', playerData);
    
    // Create a reference for the other player
    const otherPlayer = {
      id: playerData.id,
      name: playerData.name || `Player ${playerData.id.substring(0, 4)}`,
      state: {
        position: new THREE.Vector3(),
        rotation: new THREE.Euler(),
        targetPosition: new THREE.Vector3(),
        targetRotation: new THREE.Euler(),
        speed: 0,
        direction: new THREE.Vector3(0, 0, 1),
        health: playerData.ship?.health || 100,
        maxHealth: playerData.ship?.maxHealth || 100
      },
      lastUpdate: Date.now(),
      projectiles: []
    };
    
    // If we have ship data, use it
    if (playerData.ship && playerData.ship.position) {
      otherPlayer.state.position.set(
        playerData.ship.position.x || 0,
        playerData.ship.position.y || 0,
        playerData.ship.position.z || 0
      );
      otherPlayer.state.targetPosition.copy(otherPlayer.state.position);
    }
    
    if (playerData.ship && playerData.ship.rotation) {
      otherPlayer.state.rotation.set(
        playerData.ship.rotation.x || 0,
        playerData.ship.rotation.y || 0,
        playerData.ship.rotation.z || 0
      );
      otherPlayer.state.targetRotation.copy(otherPlayer.state.rotation);
    }
    
    if (playerData.ship && playerData.ship.speed !== undefined) {
      otherPlayer.state.speed = playerData.ship.speed;
    }
    
    if (playerData.ship && playerData.ship.direction) {
      otherPlayer.state.direction.set(
        playerData.ship.direction.x || 0,
        playerData.ship.direction.y || 0,
        playerData.ship.direction.z || 1
      );
    }
    
    // Ask the game to create a ship for this player
    this.game.createOtherPlayerShip(otherPlayer);
    
    // Store the player data
    this.otherPlayers.set(playerData.id, otherPlayer);
    
    return otherPlayer;
  }
  
  updateOtherPlayer(playerData) {
    const player = this.otherPlayers.get(playerData.id);
    if (!player) return;
    
    // Update player data
    player.score = playerData.score || player.score || 0;
    player.kills = playerData.kills || player.kills || 0;
    player.lastUpdate = Date.now();
    
    // Update ship data if available
    if (playerData.ship) {
      // Update health
      if (playerData.ship.health !== undefined) {
        player.state.health = playerData.ship.health;
      }
      
      if (playerData.ship.maxHealth !== undefined) {
        player.state.maxHealth = playerData.ship.maxHealth;
      }
      
      // Store last position and rotation
      const lastPosition = player.state.position.clone();
      const lastRotation = player.state.rotation.clone();
      
      // Update target position and rotation for interpolation
      if (playerData.ship.position) {
        player.state.targetPosition.set(
          playerData.ship.position.x || 0,
          playerData.ship.position.y || 0,
          playerData.ship.position.z || 0
        );
      }
      
      if (playerData.ship.rotation) {
        player.state.targetRotation.set(
          playerData.ship.rotation.x || 0,
          playerData.ship.rotation.y || 0,
          playerData.ship.rotation.z || 0
        );
      }
      
      // If the ship is very far away, teleport it instead of interpolating
      const distanceThreshold = 50;
      const currentDistance = player.state.position.distanceTo(player.state.targetPosition);
      
      if (currentDistance > distanceThreshold) {
        console.log(`Teleporting ship ${playerData.id} due to large distance: ${currentDistance}`);
        player.state.position.copy(player.state.targetPosition);
      }
      
      // Update speed if available
      if (playerData.ship.speed !== undefined) {
        player.state.speed = playerData.ship.speed;
      }
      
      // Update direction if available
      if (playerData.ship.direction) {
        player.state.direction.set(
          playerData.ship.direction.x || 0,
          playerData.ship.direction.y || 0,
          playerData.ship.direction.z || 1
        );
      }
    }
    
    // Handle any projectile updates
    if (playerData.projectiles && playerData.projectiles.length > 0) {
      this.handleProjectileUpdates(playerData.projectiles, player);
    }
    
    return player;
  }
  
  handleProjectileUpdates(projectiles, player) {
    // Forward to game logic
    this.game.updateOtherPlayerProjectiles(player.id, projectiles);
  }
  
  updateOtherPlayersInterpolation(delta) {
    this.otherPlayers.forEach((player) => {
      const state = player.state;
      
      // Interpolate position with dynamic interpolation factor
      // Use a faster interpolation for ships that are further away
      const distance = state.position.distanceTo(state.targetPosition);
      const dynamicFactor = Math.min(1, this.interpolationFactor * (1 + distance * 0.1));
      
      // Apply interpolation to position
      state.position.lerp(state.targetPosition, dynamicFactor);
      
      // Calculate rotation delta for smoother rotation
      const rotationDelta = this.shortestAngle(
        state.rotation.y,
        state.targetRotation.y
      );
      
      // Apply rotation more directly for smoother turning
      state.rotation.y += rotationDelta * dynamicFactor * 1.5;
      
      // Make sure rotation stays in proper range
      state.rotation.y = (state.rotation.y + Math.PI * 2) % (Math.PI * 2);
      
      // Notify game to update the visual representation
      this.game.updateOtherPlayerShip(player.id, state);
      
      // Remove players that haven't been updated in a while
      const now = Date.now();
      if (now - player.lastUpdate > 10000) {
        console.log('Removing inactive player:', player.id);
        this.removePlayer(player.id);
      }
    });
  }
  
  shortestAngle(current, target) {
    const diff = (target - current + Math.PI) % (Math.PI * 2) - Math.PI;
    return diff < -Math.PI ? diff + Math.PI * 2 : diff;
  }
  
  removePlayer(playerId) {
    console.log('Removing player:', playerId);
    
    // Tell game to remove the player's ship
    this.game.removeOtherPlayerShip(playerId);
    
    // Remove from map
    this.otherPlayers.delete(playerId);
  }
  
  handleProjectileFire(data) {
    // Forward to game logic
    this.game.handleOtherPlayerProjectileFire(data);
  }
  
  handleProjectileHit(data) {
    // Forward to game logic
    this.game.handleProjectileHit(data);
  }
  
  handleProjectileRemoved(data) {
    // Forward to game logic
    this.game.handleProjectileRemoved(data);
  }
  
  handlePlayerHit(data) {
    // Forward to game logic
    this.game.handlePlayerHit(data);
  }
  
  // Method for Game to call when local player fires
  sendProjectileFired(projectileData) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('projectile:fire', projectileData);
    }
  }
  
  // Method for Game to call when a local projectile hits something
  sendProjectileHit(hitData) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('projectile:hit', hitData);
    }
  }
  
  // Method for Game to call when a local projectile needs to be removed
  sendProjectileRemoved(projectileId) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('projectile:remove', { id: projectileId });
    }
  }
  
  sendExplorerState(data) {
    if (!this.socket?.connected) return;
    
    // Add player ID and timestamp
    data.playerId = this.socket.id;
    data.timestamp = Date.now();
    
    // Send to the server
    this.socket.emit('explorer:state', data);
  }
  
  sendCollectiblePickup(data) {
    if (!this.socket?.connected) return;
    
    // Add player ID
    data.playerId = this.socket.id;
    
    // Send to the server
    this.socket.emit('collectible:pickup', data);
  }
} 