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

// Debug route to check server status
app.get('/status', (req, res) => {
  res.json({
    status: 'ok',
    players: Array.from(players.keys()),
    connections: io.engine.clientsCount
  });
});

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
        players.set(socket.id, {
          ...players.get(socket.id),
          ...gameState
        });
        
        // Broadcast player state to all other players
        socket.broadcast.emit('player:updated', {
          id: socket.id,
          ...gameState
        });
      }
    } catch (error) {
      console.error('Error handling state update:', error);
    }
  });

  // Handle disconnection
  socket.on('disconnect', (reason) => {
    console.log(`[${new Date().toISOString()}] Player disconnected:`, socket.id);
    console.log('Reason:', reason);
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
