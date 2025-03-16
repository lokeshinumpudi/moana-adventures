/**
 * Time Manager for the server
 * Handles time synchronization between clients
 */
class TimeManager {
  constructor(io) {
    this.io = io;
    this.startTime = Date.now();
    
    // Set up socket event handlers
    this.setupSocketHandlers();
    
    console.log('TimeManager initialized');
  }
  
  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      // Handle time request from client
      socket.on('time:request', () => {
        // Send current server time
        socket.emit('time:response', {
          serverTime: Date.now(),
          startTime: this.startTime
        });
      });
    });
  }
  
  // Get current server time
  getCurrentTime() {
    return Date.now();
  }
  
  // Get elapsed time since server start
  getElapsedTime() {
    return Date.now() - this.startTime;
  }
}

module.exports = TimeManager; 