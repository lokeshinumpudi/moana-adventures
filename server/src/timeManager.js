const logger = require('./logger');

class TimeManager {
  constructor(io) {
    this.io = io;
    this.startTime = Date.now();

    this.setupSocketHandlers();

    logger.info('TimeManager initialized');
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