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
      if (this.game.playerShip) {
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
      
      // Process players in batches to avoid UI freezing
      this.processBatchedPlayers(players);
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
    
    // Handle projectile fire from other players
    this.socket.on('projectile:fire', (data) => {
      if (data.playerId !== this.socket.id) {
        this.handleProjectileFire(data);
      }
    });
    
    // Handle projectile hits
    this.socket.on('projectile:hit', (data) => {
      this.handleProjectileHit(data);
    });
    
    // Handle projectile removal
    this.socket.on('projectile:remove', (data) => {
      this.handleProjectileRemoved(data);
    });
    
    // Handle player hit
    this.socket.on('player:hit', (data) => {
      this.handlePlayerHit(data);
    });
    
    // Handle explorer state updates
    this.socket.on('explorer:state', (data) => {
      if (data.playerId !== this.socket.id) {
        this.game.handleOtherPlayerExplorer(data);
      }
    });
    
    // Handle server reconciliation
    this.socket.on('server:reconcile', (serverState) => {
      this.reconcileWithServer(serverState);
    });
    
    // Handle world data from server
    this.socket.on('world:data', (worldData) => {
      console.log('Received world data from server');
      this.game.setWorldData(worldData);
    });
    
    // Handle collectible pickup
    this.socket.on('collectible:pickup', (data) => {
      if (data.playerId !== this.socket.id) {
        this.game.removeCollectible(data.collectibleId);
      }
    });
    
    // Handle connection errors
    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });
    
    this.socket.on('connect_timeout', () => {
      console.error('Socket connection timeout');
    });
    
    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
    
    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from server:', reason);
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
    if (!this.socket?.connected) return;
    
    // Update other players' interpolation
    this.updateOtherPlayersInterpolation(delta);
    
    // Handle automatic machine gun fire
    if (this.game.inputManager) {
      if (this.game.inputManager.autoFiringLeft) {
        this.game.fireMachineGun('left');
      }
      if (this.game.inputManager.autoFiringRight) {
        this.game.fireMachineGun('right');
      }
    }
    
    // Send player state (now handled by sendPlayerState method)
    this.sendPlayerState();
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
      projectiles: [],
      isExploring: false
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
    this.otherPlayers.forEach((player, playerId) => {
      if (!player.state) return;
      
      const state = player.state;
      
      // Calculate interpolation factor based on delta time
      const dynamicFactor = Math.min(1, delta * 10);
      
      // Interpolate position
      const positionDelta = new THREE.Vector3(
        state.targetPosition.x - state.position.x,
        state.targetPosition.y - state.position.y,
        state.targetPosition.z - state.position.z
      );
      
      // Only interpolate if the distance is significant
      if (positionDelta.length() > 0.01) {
        state.position.add(positionDelta.multiplyScalar(dynamicFactor));
      }
      
      // Interpolate rotation (handle wrapping around 2π)
      const rotationDelta = this.shortestAngle(state.rotation.y, state.targetRotation.y);
      
      // Apply rotation more directly for smoother turning
      state.rotation.y += rotationDelta * dynamicFactor * 1.5;
      
      // Make sure rotation stays in proper range
      state.rotation.y = (state.rotation.y + Math.PI * 2) % (Math.PI * 2);
      
      // Notify game to update the visual representation
      this.game.updateOtherPlayerShip(player.id, state);
      
      // Remove players that haven't been updated in a while
      // But don't remove players that are exploring islands
      const now = Date.now();
      if (now - player.lastUpdate > 10000 && !player.isExploring) {
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
    if (!this.socket || !this.socket.connected) {
      console.warn('Cannot send explorer state: Socket not connected');
      return;
    }
    
    try {
      // Validate data
      if (!data || !data.position) {
        console.warn('Invalid explorer data provided');
        return;
      }
      
      // Ensure we have all required data
      const explorerData = {
        position: {
          x: (data.position.x !== undefined) ? data.position.x : 0,
          y: (data.position.y !== undefined) ? data.position.y : 0,
          z: (data.position.z !== undefined) ? data.position.z : 0
        },
        rotation: {
          y: (data.rotation && data.rotation.y !== undefined) ? data.rotation.y : 0
        },
        isActive: data.isActive !== undefined ? data.isActive : false,
        islandId: data.islandId || null,
        timestamp: Date.now()
      };
      
      // Send explorer state to server
      this.socket.emit('explorer_state', explorerData);
    } catch (error) {
      console.error('Error sending explorer state:', error);
    }
  }
  
  // Send player state (ship or explorer) based on current state
  sendPlayerState() {
    if (!this.socket || !this.socket.connected || !this.game) {
      return;
    }
    
    try {
      // Check if explorer is active
      if (this.game.explorer && this.game.explorer.isActive && this.game.explorer.mesh) {
        // Send explorer state
        const explorerData = {
          position: {
            x: this.game.explorer.mesh.position.x,
            y: this.game.explorer.mesh.position.y,
            z: this.game.explorer.mesh.position.z
          },
          rotation: {
            y: this.game.explorer.mesh.rotation.y
          },
          isActive: true,
          islandId: this.game.explorer.currentIsland ? this.game.explorer.currentIsland.mesh.uuid : null,
          playerId: this.socket.id,
          timestamp: Date.now()
        };
        
        // Send to server
        this.socket.emit('explorer:state', explorerData);
      } else if (this.game.playerShip && this.game.playerShip.mesh) {
        // Send ship state
        const ship = this.game.playerShip;
        
        // Verify ship has all required properties
        if (!ship.mesh || !ship.mesh.position || !ship.mesh.rotation) {
          console.warn('Ship missing required properties for state update');
          return;
        }
        
        // Ensure velocity and angularVelocity exist
        const velocity = ship.velocity || { x: 0, y: 0, z: 0 };
        const angularVelocity = ship.angularVelocity || { x: 0, y: 0, z: 0 };
        
        // Create input snapshot
        const inputSnapshot = this.createInputSnapshot();
        
        // Create ship state data
        const shipData = {
          id: this.socket.id,
          position: {
            x: ship.mesh.position.x || 0,
            y: ship.mesh.position.y || 0,
            z: ship.mesh.position.z || 0
          },
          rotation: {
            x: ship.mesh.rotation.x || 0,
            y: ship.mesh.rotation.y || 0,
            z: ship.mesh.rotation.z || 0
          },
          velocity: {
            x: velocity.x || 0,
            y: velocity.y || 0,
            z: velocity.z || 0
          },
          angularVelocity: {
            x: angularVelocity.x || 0,
            y: angularVelocity.y || 0,
            z: angularVelocity.z || 0
          },
          inputs: inputSnapshot,
          timestamp: Date.now()
        };
        
        // Send ship state to server
        this.socket.emit('player:state', shipData);
      }
    } catch (error) {
      console.error('Error sending player state:', error);
    }
  }
  
  sendCollectiblePickup(data) {
    if (!this.socket?.connected) return;
    
    // Add player ID
    data.playerId = this.socket.id;
    
    // Send to the server
    this.socket.emit('collectible:pickup', data);
  }
} 