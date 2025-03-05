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
      ? "https://moana-city.vercel.app"  // Update this with your Vercel domain
      : ["http://localhost:5500", "http://127.0.0.1:5500"],
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
        // Store the updated player state
        players.set(socket.id, {
          ...players.get(socket.id),
          ...gameState
        });
        
        // Process any new projectiles
        if (gameState.projectiles && gameState.projectiles.length > 0) {
          // Get existing projectile IDs for this player
          const existingIds = new Set(
            Array.from(projectiles.entries())
              .filter(([_, p]) => p.ownerId === socket.id)
              .map(([id, _]) => id)
          );
          
          // Find new projectiles
          gameState.projectiles.forEach(projectileData => {
            // Only add if we don't already have this projectile
            if (!existingIds.has(projectileData.id)) {
              // Add to projectiles map
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
        }
        
        // Stripped-down game state to broadcast
        // We don't need to send projectile data now since we're handling it separately
        const broadcastState = {
          id: socket.id,
          ship: gameState.ship
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
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`[${new Date().toISOString()}] Server running on port ${PORT}`);
  console.log('Server configuration:', {
    environment: process.env.NODE_ENV || 'development',
    cors: io._corsOrigin
  });
});
