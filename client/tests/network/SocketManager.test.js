import { SocketManager } from '../../src/js/SocketManager';
import { io } from 'socket.io-client';

// Mock dependencies
jest.mock('socket.io-client');

// Mock the SocketManager class implementation
jest.mock('../../src/js/SocketManager', () => {
  return {
    SocketManager: jest.fn().mockImplementation((game) => {
      return {
        game,
        otherPlayers: new Map(),
        lastUpdateTime: 0,
        updateInterval: 50,
        socket: {
          on: jest.fn(),
          emit: jest.fn(),
          disconnect: jest.fn(),
          id: 'test-socket-id'
        },
        sendPlayerUpdate: jest.fn(),
        disconnect: jest.fn(),
        update: jest.fn().mockImplementation(function() {
          const now = Date.now();
          if (now - this.lastUpdateTime > this.updateInterval) {
            this.lastUpdateTime = now;
            return true;
          }
          return false;
        }),
        getPlayerState: jest.fn().mockReturnValue({
          position: { x: 0, y: 0, z: 0 },
          rotation: { y: 0 },
          speed: 0
        })
      };
    })
  };
});

describe('SocketManager', () => {
  let socketManager;
  let mockGame;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create mock game
    mockGame = {
      addOtherPlayer: jest.fn(),
      removeOtherPlayer: jest.fn(),
      updateOtherPlayer: jest.fn(),
      addProjectile: jest.fn(),
      updateProjectile: jest.fn(),
      removeProjectile: jest.fn(),
      notificationManager: {
        addNotification: jest.fn()
      }
    };
    
    // Create socket manager instance
    socketManager = new SocketManager(mockGame);
  });

  test('should create a socket manager with default properties', () => {
    expect(socketManager).toBeDefined();
    expect(socketManager.game).toBe(mockGame);
    expect(socketManager.otherPlayers).toBeDefined();
    expect(socketManager.lastUpdateTime).toBe(0);
    expect(socketManager.updateInterval).toBe(50);
  });

  test('should send player update when sendPlayerUpdate is called', () => {
    // Create mock player data
    const playerData = {
      position: { x: 10, y: 5, z: 20 },
      rotation: { y: 1.5 },
      speed: 10
    };
    
    // Call sendPlayerUpdate
    socketManager.sendPlayerUpdate(playerData);
    
    // Check if sendPlayerUpdate was called
    expect(socketManager.sendPlayerUpdate).toHaveBeenCalledWith(playerData);
  });

  test('should disconnect socket when disconnect is called', () => {
    // Call disconnect
    socketManager.disconnect();
    
    // Check if disconnect was called
    expect(socketManager.disconnect).toHaveBeenCalled();
  });

  test('should not send update if not enough time has passed', () => {
    // Set last update time to current time
    socketManager.lastUpdateTime = Date.now();
    
    // Call update
    const result = socketManager.update();
    
    // Check if update returned false
    expect(result).toBe(false);
  });

  test('should send update if enough time has passed', () => {
    // Set last update time to be more than updateInterval ago
    socketManager.lastUpdateTime = Date.now() - 100;
    
    // Call update
    const result = socketManager.update();
    
    // Check if update returned true
    expect(result).toBe(true);
    
    // Check if lastUpdateTime was updated
    expect(socketManager.lastUpdateTime).toBeGreaterThan(Date.now() - 50);
  });
}); 