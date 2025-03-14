const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? "https://moana-adventures.vercel.app/"  // Update this with your Vercel domain
      : ["http://localhost:5174", "http://localhost:5173","*"],
    methods: ["GET", "POST"]
  }
});

// Store connected players
const players = new Map();

// Store and track all active projectiles
const projectiles = new Map();

// Physics constants
const GRAVITY = 9.8;
const MAX_PROJECTILE_LIFETIME = 10000; // 10 seconds

// World configuration
const WORLD_CONFIG = {
  worldSize: 800, // Size of the world (square)
  islands: {
    count: 5,     // Number of islands to generate
    minDistance: 150, // Minimum distance between islands
    minRadius: 40,    // Minimum island radius
    maxRadius: 70,    // Maximum island radius
    minHeight: 15,    // Minimum island height
    maxHeight: 25     // Maximum island height
  },
  collectibles: {
    perIsland: { min: 5, max: 10 }, // Number of collectibles per island
    types: [
      'treasure', 
      'gem', 
      'fruit', 
      'wood',
      'powerup_health',
      'powerup_speed',
      'powerup_shield',
      'powerup_weapon'
    ] // Types of collectibles
  },
  obstacles: {
    count: 20, // Number of obstacles
    types: ['rock', 'log', 'buoy'] // Types of obstacles
  }
};

// World storage
const worldData = {
  islands: [],
  collectibles: [],
  obstacles: [],
  buoys: []
};

// Generate a random position within the world bounds
function generateRandomPosition() {
  const halfSize = WORLD_CONFIG.worldSize / 2;
  return {
    x: Math.random() * WORLD_CONFIG.worldSize - halfSize,
    y: 0, // Always at water level
    z: Math.random() * WORLD_CONFIG.worldSize - halfSize
  };
}

// Check if a position is far enough from existing objects
function isPositionValid(position, existingObjects, minDistance) {
  for (const obj of existingObjects) {
    const dx = position.x - obj.position.x;
    const dz = position.z - obj.position.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    if (distance < minDistance) {
      return false;
    }
  }
  return true;
}

// Generate islands
function generateIslands() {
  const { count, minDistance, minRadius, maxRadius, minHeight, maxHeight } = WORLD_CONFIG.islands;
  
  for (let i = 0; i < count; i++) {
    let position;
    let isValid = false;
    let attempts = 0;
    
    // Try to find a valid position
    while (!isValid && attempts < 20) {
      position = generateRandomPosition();
      isValid = isPositionValid(position, worldData.islands, minDistance);
      attempts++;
    }
    
    // Create island
    const island = {
      id: `island_${i}`,
      position: position,
      radius: minRadius + Math.random() * (maxRadius - minRadius),
      height: minHeight + Math.random() * (maxHeight - minHeight),
      hasDock: Math.random() > 0.2, // 80% chance of having a dock
      dockAngle: Math.random() * Math.PI * 2, // Random angle for dock
      vegetation: true
    };
    
    // Calculate dock position based on radius and angle
    if (island.hasDock) {
      const dockDirection = {
        x: Math.sin(island.dockAngle),
        z: Math.cos(island.dockAngle)
      };
      
      island.dockPosition = {
        x: position.x + dockDirection.x * (island.radius + 20),
        y: 0,
        z: position.z + dockDirection.z * (island.radius + 20)
      };
      
      island.dockDirection = dockDirection;
    }
    
    worldData.islands.push(island);
  }
  
  console.log(`Generated ${worldData.islands.length} islands`);
}

// Generate collectibles on islands
function generateCollectibles() {
  const { perIsland, types } = WORLD_CONFIG.collectibles;
  
  worldData.islands.forEach((island, islandIndex) => {
    // Random number of collectibles for this island
    const count = perIsland.min + Math.floor(Math.random() * (perIsland.max - perIsland.min + 1));
    
    for (let i = 0; i < count; i++) {
      // Random position on island
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * (island.radius * 0.8); // Within 80% of radius
      
      const position = {
        x: island.position.x + Math.sin(angle) * distance,
        z: island.position.z + Math.cos(angle) * distance
      };
      
      // Calculate height based on island (simplified cone formula)
      const dx = position.x - island.position.x;
      const dz = position.z - island.position.z;
      const distanceFromCenter = Math.sqrt(dx * dx + dz * dz);
      const height = Math.max(0, island.height * (1 - distanceFromCenter / island.radius));
      
      position.y = height + 0.5; // Slightly above the island surface
      
      // Create collectible
      const type = types[Math.floor(Math.random() * types.length)];
      const value = Math.floor(Math.random() * 50) + 10; // 10-60 value
      
      const collectible = {
        id: `collectible_${islandIndex}_${i}`,
        type: type,
        value: value,
        position: position,
        islandId: island.id
      };
      
      worldData.collectibles.push(collectible);
    }
  });
  
  console.log(`Generated ${worldData.collectibles.length} collectibles`);
}

// Generate obstacles
function generateObstacles() {
  const { count, types } = WORLD_CONFIG.obstacles;
  
  for (let i = 0; i < count; i++) {
    let position;
    let isValid = false;
    let attempts = 0;
    
    // Try to find a valid position
    while (!isValid && attempts < 10) {
      position = generateRandomPosition();
      
      // Make sure it's not too close to islands
      isValid = isPositionValid(position, worldData.islands, 80);
      
      // Also check other obstacles
      if (isValid) {
        isValid = isPositionValid(position, worldData.obstacles, 30);
      }
      
      attempts++;
    }
    
    if (!isValid) continue; // Skip if we can't find a valid position
    
    // Create obstacle
    const type = types[Math.floor(Math.random() * types.length)];
    
    const obstacle = {
      id: `obstacle_${i}`,
      type: type,
      position: position,
      rotation: Math.random() * Math.PI * 2, // Random rotation
      scale: 0.8 + Math.random() * 0.4 // Random scale 0.8-1.2
    };
    
    worldData.obstacles.push(obstacle);
  }
  
  console.log(`Generated ${worldData.obstacles.length} obstacles`);
}

// Generate buoys (race track markers)
function generateBuoys() {
  // Create a race track with buoys
  const trackRadius = 300; // Radius of the track
  const buoyCount = 20;    // Number of buoys
  
  for (let i = 0; i < buoyCount; i++) {
    const angle = (i / buoyCount) * Math.PI * 2;
    
    // Add some variation to the track
    const radiusVariation = Math.sin(angle * 3) * 50;
    const currentRadius = trackRadius + radiusVariation;
    
    const position = {
      x: Math.sin(angle) * currentRadius,
      y: 0,
      z: Math.cos(angle) * currentRadius
    };
    
    const buoy = {
      id: `buoy_${i}`,
      position: position,
      order: i
    };
    
    worldData.buoys.push(buoy);
  }
  
  console.log(`Generated ${worldData.buoys.length} buoys`);
}

// Initialize world
function initializeWorld() {
  // Clear any existing data
  worldData.islands = [];
  worldData.collectibles = [];
  worldData.obstacles = [];
  worldData.buoys = [];
  
  // Generate all world elements
  generateIslands();
  generateCollectibles();
  generateObstacles();
  generateBuoys();
  
  console.log("World generation complete!");
}

// Generate the world at server startup
initializeWorld();

// Debug route to check server status
app.get('/status', (req, res) => {
  res.json({
    status: 'ok',
    players: Array.from(players.keys()),
    connections: io.engine.clientsCount
  });
});

// Set up physics simulation loop
const simulationInterval = 50; // 20 updates per second
let lastSimulationTime = Date.now();

function updateProjectilePhysics() {
  const now = Date.now();
  const deltaTime = (now - lastSimulationTime) / 1000; // Convert to seconds
  lastSimulationTime = now;
  
  // Update each projectile
  projectiles.forEach((projectile, id) => {
    // Skip if too old
    if (now - projectile.createdAt > MAX_PROJECTILE_LIFETIME) {
      projectiles.delete(id);
      return;
    }
    
    // Update velocity (apply gravity)
    projectile.velocity.y -= GRAVITY * deltaTime;
    
    // Update position
    projectile.position.x += projectile.velocity.x * deltaTime;
    projectile.position.y += projectile.velocity.y * deltaTime;
    projectile.position.z += projectile.velocity.z * deltaTime;
    
    // Check for collisions with players
    players.forEach((player, playerId) => {
      // Skip if it's the player who fired the projectile
      if (playerId === projectile.ownerId) return;
      
      // Skip if the player has no ship position
      if (!player.ship || !player.ship.position) return;
      
      // Calculate distance between projectile and player ship
      const dx = projectile.position.x - player.ship.position.x;
      const dy = projectile.position.y - player.ship.position.y;
      const dz = projectile.position.z - player.ship.position.z;
      const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
      
      // Check for collision
      const collisionRadius = projectile.type === 'machineGun' ? 1.5 : 3.0;
      
      if (distance < collisionRadius) {
        // Record the hit position
        const hitPosition = {
          x: projectile.position.x,
          y: projectile.position.y,
          z: projectile.position.z
        };
        
        // Emit hit event to the player who was hit
        io.to(playerId).emit('player:hit', {
          damage: projectile.type === 'machineGun' ? 1 : 10,
          position: hitPosition,
          fromPlayerId: projectile.ownerId
        });
        
        // Check if this hit would kill the player
        const targetPlayer = players.get(playerId);
        if (targetPlayer && targetPlayer.ship && targetPlayer.ship.health) {
          // Calculate new health
          const newHealth = targetPlayer.ship.health - (projectile.type === 'machineGun' ? 1 : 10);
          
          // If player would die from this hit
          if (newHealth <= 0) {
            // Increment killer's kill count
            const killer = players.get(projectile.ownerId);
            if (killer) {
              killer.kills = (killer.kills || 0) + 1;
              
              // Notify killer about their new kill count
              io.to(projectile.ownerId).emit('player:kill', {
                targetId: playerId,
                kills: killer.kills
              });
              
              // Broadcast updated killer stats to all players
              io.emit('player:updated', {
                id: projectile.ownerId,
                kills: killer.kills
              });
            }
          }
          
          // Update target player's health
          targetPlayer.ship.health = Math.max(0, newHealth);
        }
        
        // Emit hit event to the player who fired
        io.to(projectile.ownerId).emit('projectile:hit', {
          id: id,
          targetId: playerId,
          position: hitPosition
        });
        
        // Broadcast the hit to all players for visual effects
        io.emit('projectile:removed', {
          id: id,
          playerId: projectile.ownerId,
          reason: 'hit',
          hitPosition: hitPosition,
          targetId: playerId
        });
        
        // Remove the projectile
        projectiles.delete(id);
      }
    });
  });
}

// Start physics simulation
setInterval(updateProjectilePhysics, simulationInterval);

io.on('connection', (socket) => {
  console.log(`[${new Date().toISOString()}] Player connected:`, socket.id);
  console.log('Total players:', io.engine.clientsCount);
  
  // Log client details
  const clientInfo = {
    id: socket.id,
    transport: socket.conn.transport.name,
    address: socket.handshake.address,
    headers: socket.handshake.headers
  };
  // console.log('Client info:', clientInfo);

  // Handle ping requests
  socket.on('ping', () => {
    socket.emit('pong');
  });

  // Handle player join
  socket.on('player:join', (playerData) => {
    console.log(`[${new Date().toISOString()}] Player joined:`, socket.id);
    console.log('Player data:', playerData);
    
    try {
      players.set(socket.id, {
        id: socket.id,
        ...playerData
      });
      
      // Broadcast to all other players that a new player joined
      socket.broadcast.emit('player:joined', {
        id: socket.id,
        ...playerData
      });

      // Send existing players to the new player
      const existingPlayers = Array.from(players.values())
        .filter(player => player.id !== socket.id);
      console.log('Sending existing players:', existingPlayers);
      socket.emit('players:list', existingPlayers);
      
    } catch (error) {
      console.error('Error handling player join:', error);
    }
  });

  // Handle game state updates
  socket.on('player:state', (gameState) => {
    try {
      if (players.has(socket.id)) {
        // Get the current player state
        const currentPlayer = players.get(socket.id);
        
        // Store the updated player state
        players.set(socket.id, {
          ...currentPlayer,
          ...gameState
        });
        
        // Process all projectiles (new and existing)
        if (gameState.projectiles && gameState.projectiles.length > 0) {
          // Get existing projectile IDs for this player
          const existingIds = new Set(
            Array.from(projectiles.entries())
              .filter(([_, p]) => p.ownerId === socket.id)
              .map(([id, _]) => id)
          );
          
          // Process all projectiles
          gameState.projectiles.forEach(projectileData => {
            if (existingIds.has(projectileData.id)) {
              // Update existing projectile
              const existingProjectile = projectiles.get(projectileData.id);
              existingProjectile.position = projectileData.position;
              existingProjectile.velocity = projectileData.velocity;
              
              // Broadcast the updated projectile to all other players
              socket.broadcast.emit('projectile:updated', {
                id: projectileData.id,
                playerId: socket.id,
                position: projectileData.position,
                velocity: projectileData.velocity
              });
            } else {
              // Add new projectile
              projectiles.set(projectileData.id, {
                id: projectileData.id,
                ownerId: socket.id,
                type: projectileData.type,
                position: projectileData.position,
                velocity: projectileData.velocity,
                createdAt: Date.now()
              });
              
              // Broadcast the new projectile to all other players
              socket.broadcast.emit('projectile:added', {
                id: projectileData.id,
                playerId: socket.id,
                type: projectileData.type,
                position: projectileData.position,
                velocity: projectileData.velocity
              });
            }
          });
          
          // Remove projectiles that are no longer in the client's state
          const currentIds = new Set(gameState.projectiles.map(p => p.id));
          for (const id of existingIds) {
            if (!currentIds.has(id)) {
              projectiles.delete(id);
              
              // Broadcast removal to all players
              io.emit('projectile:removed', {
                id: id,
                playerId: socket.id,
                reason: 'expired'
              });
            }
          }
        }
        
        // Broadcast the complete player state to all other players
        // Include all necessary information for proper synchronization
        const broadcastState = {
          id: socket.id,
          ship: gameState.ship,
          score: gameState.score,
          kills: gameState.kills,
          timestamp: Date.now() // Add timestamp for latency compensation
        };
        
        // Broadcast player state to all other players
        socket.broadcast.emit('player:updated', broadcastState);
      }
    } catch (error) {
      console.error('Error handling state update:', error);
    }
  });
  
  // Handle projectile fire events (new optimized approach)
  socket.on('projectile:fire', (projectileData) => {
    try {
      if (!players.has(socket.id)) return;
      
      // Create a new projectile with the player as owner
      const projectileId = projectileData.id || `${socket.id}-${Date.now()}`;
      
      // Store the projectile in our simulation
      projectiles.set(projectileId, {
        id: projectileId,
        ownerId: socket.id,
        type: projectileData.type,
        position: projectileData.position,
        velocity: projectileData.velocity,
        createdAt: Date.now()
      });
      
      // Broadcast the projectile to all other players
      socket.broadcast.emit('projectile:added', {
        id: projectileId,
        playerId: socket.id,
        type: projectileData.type,
        position: projectileData.position,
        velocity: projectileData.velocity
      });
    } catch (error) {
      console.error('Error handling projectile fire:', error);
    }
  });

  // Handle explorer state updates
  socket.on('explorer:state', (data) => {
    try {
      if (!players.has(socket.id)) return;
      
      // Update player's explorer state
      const player = players.get(socket.id);
      player.explorer = data;
      
      // Broadcast explorer state to all other players
      socket.broadcast.emit('explorer:state', {
        playerId: socket.id,
        isActive: data.isActive,
        position: data.position,
        rotation: data.rotation,
        islandId: data.islandId,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Error handling explorer state update:', error);
    }
  });
  
  // Handle collectible pickup
  socket.on('collectible:pickup', (data) => {
    try {
      if (!players.has(socket.id)) return;
      
      // Find the collectible in our world data
      const collectibleIndex = worldData.collectibles.findIndex(c => c.id === data.collectibleId);
      
      if (collectibleIndex !== -1) {
        // Remove the collectible from our world data
        const collectible = worldData.collectibles.splice(collectibleIndex, 1)[0];
        
        // Broadcast to all clients that this collectible is gone
        io.emit('collectible:removed', {
          id: collectible.id,
          playerId: socket.id
        });
        
        // Optionally add to player's score/inventory
        const player = players.get(socket.id);
        if (player) {
          // Add score based on collectible type
          switch (collectible.type) {
            case 'treasure':
              player.score = (player.score || 0) + (collectible.value || 10);
              break;
            case 'gem':
              player.score = (player.score || 0) + (collectible.value || 20) * 2;
              break;
            default:
              player.score = (player.score || 0) + 10;
          }
          
          // Broadcast updated player score
          io.emit('player:updated', {
            id: socket.id,
            score: player.score
          });
        }
      }
    } catch (error) {
      console.error('Error handling collectible pickup:', error);
    }
  });

  // Handle disconnection
  socket.on('disconnect', (reason) => {
    console.log(`[${new Date().toISOString()}] Player disconnected:`, socket.id);
    console.log('Reason:', reason);
    
    // Remove all projectiles owned by this player
    for (const [id, projectile] of projectiles.entries()) {
      if (projectile.ownerId === socket.id) {
        projectiles.delete(id);
      }
    }
    
    // Remove the player
    players.delete(socket.id);
    io.emit('player:left', socket.id);
    console.log('Remaining players:', players.size);
  });
  
  // Handle errors
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });

  // Send world data to the client
  socket.emit('world:data', worldData);
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`[${new Date().toISOString()}] Server running on port ${PORT}`);
  console.log('Server configuration:', {
    environment: process.env.NODE_ENV || 'development'
  });
});
