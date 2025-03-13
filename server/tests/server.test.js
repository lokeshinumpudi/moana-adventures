const request = require('supertest');
const { createServer } = require('http');
const { Server } = require('socket.io');
const Client = require('socket.io-client');
const express = require('express');

describe('Socket.IO Server', () => {
  let io, serverSocket, clientSocket, httpServer;
  
  beforeAll((done) => {
    // Create express app
    const app = express();
    
    // Create HTTP server
    httpServer = createServer(app);
    
    // Create Socket.IO server
    io = new Server(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });
    
    // Start server
    httpServer.listen(() => {
      const port = httpServer.address().port;
      
      // Setup client socket
      clientSocket = Client(`http://localhost:${port}`);
      
      // Setup server socket events
      io.on('connection', (socket) => {
        serverSocket = socket;
        done();
      });
    });
  });
  
  afterAll(() => {
    // Clean up
    io.close();
    clientSocket.close();
    httpServer.close();
  });
  
  test('should connect to server', (done) => {
    clientSocket.on('connect', () => {
      expect(clientSocket.connected).toBe(true);
      done();
    });
  });
  
  test('should receive playerJoined event when a player joins', (done) => {
    // Setup event listener
    clientSocket.on('playerJoined', (data) => {
      expect(data).toBeDefined();
      expect(data.id).toBe(serverSocket.id);
      done();
    });
    
    // Emit playerJoined event from server
    io.emit('playerJoined', { id: serverSocket.id, position: { x: 0, y: 0, z: 0 } });
  });
  
  test('should receive playerLeft event when a player leaves', (done) => {
    // Setup event listener
    clientSocket.on('playerLeft', (playerId) => {
      expect(playerId).toBe(serverSocket.id);
      done();
    });
    
    // Emit playerLeft event from server
    io.emit('playerLeft', serverSocket.id);
  });
  
  test('should receive playerUpdate event when a player updates', (done) => {
    // Setup event listener
    clientSocket.on('playerUpdate', (data) => {
      expect(data).toBeDefined();
      expect(data.id).toBe(serverSocket.id);
      expect(data.position).toBeDefined();
      done();
    });
    
    // Emit playerUpdate event from server
    io.emit('playerUpdate', {
      id: serverSocket.id,
      position: { x: 10, y: 5, z: 20 },
      rotation: { y: 1.5 },
      speed: 10
    });
  });
  
  test('should send playerUpdate event to server', (done) => {
    // Setup event listener on server
    serverSocket.on('playerUpdate', (data) => {
      expect(data).toBeDefined();
      expect(data.position).toBeDefined();
      done();
    });
    
    // Emit playerUpdate event from client
    clientSocket.emit('playerUpdate', {
      position: { x: 10, y: 5, z: 20 },
      rotation: { y: 1.5 },
      speed: 10
    });
  });
  
  test('should receive projectileCreated event when a projectile is created', (done) => {
    // Setup event listener
    clientSocket.on('projectileCreated', (data) => {
      expect(data).toBeDefined();
      expect(data.id).toBeDefined();
      expect(data.position).toBeDefined();
      expect(data.direction).toBeDefined();
      done();
    });
    
    // Emit projectileCreated event from server
    io.emit('projectileCreated', {
      id: 'projectile-123',
      position: { x: 10, y: 5, z: 20 },
      direction: { x: 0, y: 0, z: 1 },
      speed: 20,
      type: 'cannon',
      owner: serverSocket.id
    });
  });
  
  test('should send fireProjectile event to server', (done) => {
    // Setup event listener on server
    serverSocket.on('fireProjectile', (data) => {
      expect(data).toBeDefined();
      expect(data.position).toBeDefined();
      expect(data.direction).toBeDefined();
      done();
    });
    
    // Emit fireProjectile event from client
    clientSocket.emit('fireProjectile', {
      position: { x: 10, y: 5, z: 20 },
      direction: { x: 0, y: 0, z: 1 },
      speed: 20,
      type: 'cannon'
    });
  });
  
  test('should receive worldData event with initial world data', (done) => {
    // Setup event listener
    clientSocket.on('worldData', (data) => {
      expect(data).toBeDefined();
      expect(data.islands).toBeDefined();
      expect(data.collectibles).toBeDefined();
      expect(data.obstacles).toBeDefined();
      expect(data.buoys).toBeDefined();
      done();
    });
    
    // Emit worldData event from server
    io.emit('worldData', {
      islands: [],
      collectibles: [],
      obstacles: [],
      buoys: [],
      worldSize: 800
    });
  });
}); 