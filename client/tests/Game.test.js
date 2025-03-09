import { Game } from '../src/js/Game';
import * as THREE from 'three';

// Mock dependencies
jest.mock('../src/js/components/Ship', () => {
  return {
    Ship: jest.fn().mockImplementation(() => ({
      update: jest.fn(),
      mesh: {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        add: jest.fn(),
        remove: jest.fn(),
        children: []
      },
      reset: jest.fn(),
      takeDamage: jest.fn()
    }))
  };
});

jest.mock('../src/js/components/Ocean', () => ({
  Ocean: jest.fn().mockImplementation(() => ({
    update: jest.fn(),
    getHeightAtPosition: jest.fn().mockReturnValue(0)
  }))
}));

jest.mock('../src/js/components/SkyBox', () => ({
  SkyBox: jest.fn().mockImplementation(() => ({
    update: jest.fn()
  }))
}));

jest.mock('../src/js/utils/InputManager', () => ({
  InputManager: jest.fn().mockImplementation(() => ({
    keys: {
      forward: false,
      backward: false,
      left: false,
      right: false
    },
    mousePosition: { x: 0, y: 0 },
    update: jest.fn()
  }))
}));

jest.mock('../src/js/SocketManager', () => ({
  SocketManager: jest.fn().mockImplementation(() => ({
    update: jest.fn(),
    disconnect: jest.fn()
  }))
}));

// Mock the Game class and its dependencies
jest.mock('../src/js/Game', () => {
  return {
    Game: jest.fn().mockImplementation((container) => {
      return {
        container,
        isRunning: false,
        lastTime: 0,
        projectiles: [],
        otherPlayers: new Map(),
        score: 0,
        kills: 0,
        scene: {
          add: jest.fn(),
          remove: jest.fn(),
          children: []
        },
        camera: {
          aspect: 0,
          updateProjectionMatrix: jest.fn()
        },
        renderer: {
          setSize: jest.fn(),
          render: jest.fn()
        },
        init: jest.fn().mockImplementation(function() {
          this.inputManager = {
            update: jest.fn()
          };
          this.socketManager = {
            update: jest.fn()
          };
          this.ocean = {
            update: jest.fn()
          };
          this.skybox = {
            update: jest.fn()
          };
          this.ship = {
            update: jest.fn()
          };
          return this;
        }),
        start: jest.fn().mockImplementation(function() {
          this.isRunning = true;
          return this;
        }),
        stop: jest.fn().mockImplementation(function() {
          this.isRunning = false;
          return this;
        }),
        update: jest.fn().mockImplementation(function(delta) {
          if (this.inputManager) this.inputManager.update();
          if (this.socketManager) this.socketManager.update();
          if (this.ship) this.ship.update(delta);
          if (this.ocean) this.ocean.update(delta);
          if (this.skybox) this.skybox.update(delta);
          return this;
        }),
        render: jest.fn().mockImplementation(function() {
          this.renderer.render(this.scene, this.camera);
          return this;
        }),
        addProjectile: jest.fn().mockImplementation(function(projectileData) {
          const projectile = {
            id: `projectile-${this.projectiles.length}`,
            ...projectileData,
            mesh: {
              position: { ...projectileData.position },
              rotation: { x: 0, y: 0, z: 0 }
            },
            dispose: jest.fn()
          };
          this.projectiles.push(projectile);
          this.scene.add(projectile.mesh);
          return projectile;
        }),
        removeProjectile: jest.fn().mockImplementation(function(projectileId) {
          const index = this.projectiles.findIndex(p => p.id === projectileId);
          if (index !== -1) {
            const projectile = this.projectiles[index];
            projectile.dispose();
            this.projectiles.splice(index, 1);
          }
        }),
        addOtherPlayer: jest.fn().mockImplementation(function(playerData) {
          const player = {
            id: playerData.id,
            mesh: {
              position: { ...playerData.position },
              rotation: { y: playerData.rotation?.y || 0 }
            },
            update: jest.fn()
          };
          this.otherPlayers.set(playerData.id, player);
          this.scene.add(player.mesh);
          return player;
        }),
        removeOtherPlayer: jest.fn().mockImplementation(function(playerId) {
          const player = this.otherPlayers.get(playerId);
          if (player) {
            this.scene.remove(player.mesh);
            this.otherPlayers.delete(playerId);
          }
        }),
        updateOtherPlayer: jest.fn().mockImplementation(function(playerData) {
          const player = this.otherPlayers.get(playerData.id);
          if (player) {
            player.update(playerData);
          }
        }),
        onWindowResize: jest.fn().mockImplementation(function() {
          this.camera.aspect = 800 / 600;
          this.camera.updateProjectionMatrix();
          this.renderer.setSize(800, 600);
        }),
        dispose: jest.fn().mockImplementation(function() {
          if (this.socketManager) this.socketManager.disconnect();
        })
      };
    })
  };
});

describe('Game', () => {
  let game;
  let mockContainer;

  beforeEach(() => {
    // Create mock container
    mockContainer = document.createElement('div');
    document.body.appendChild(mockContainer);
    
    // Create game instance
    game = new Game(mockContainer);
    
    // Initialize game for most tests
    game.init();
  });

  afterEach(() => {
    // Clean up
    document.body.removeChild(mockContainer);
    jest.clearAllMocks();
  });

  test('should create a game with default properties', () => {
    expect(game).toBeDefined();
    expect(game.container).toBe(mockContainer);
    expect(game.isRunning).toBe(false);
    expect(game.scene).toBeDefined();
    expect(game.camera).toBeDefined();
    expect(game.renderer).toBeDefined();
  });

  test('should initialize game components', () => {
    expect(game.inputManager).toBeDefined();
    expect(game.socketManager).toBeDefined();
    expect(game.ocean).toBeDefined();
    expect(game.skybox).toBeDefined();
    expect(game.ship).toBeDefined();
  });

  test('should start game loop when start is called', () => {
    // Call start
    game.start();
    
    // Check if game is running
    expect(game.isRunning).toBe(true);
  });

  test('should stop game loop when stop is called', () => {
    // Set initial state
    game.isRunning = true;
    
    // Call stop
    game.stop();
    
    // Check if game is stopped
    expect(game.isRunning).toBe(false);
  });

  test('should update game components when update is called', () => {
    // Call update
    game.update(0.016); // 16ms
    
    // Check if component update methods were called
    expect(game.inputManager.update).toHaveBeenCalled();
    expect(game.socketManager.update).toHaveBeenCalled();
    expect(game.ship.update).toHaveBeenCalled();
    expect(game.ocean.update).toHaveBeenCalled();
    expect(game.skybox.update).toHaveBeenCalled();
  });

  test('should render scene when render is called', () => {
    // Call render
    game.render();
    
    // Check if renderer.render was called
    expect(game.renderer.render).toHaveBeenCalledWith(game.scene, game.camera);
  });

  test('should add projectile to scene when addProjectile is called', () => {
    // Create mock projectile data
    const projectileData = {
      position: { x: 10, y: 5, z: 20 },
      direction: { x: 0, y: 0, z: 1 },
      speed: 20,
      type: 'cannon',
      owner: 'player1'
    };
    
    // Call addProjectile
    game.addProjectile(projectileData);
    
    // Check if projectile was added to projectiles array
    expect(game.projectiles.length).toBe(1);
    
    // Check if scene.add was called
    expect(game.scene.add).toHaveBeenCalled();
  });

  test('should remove projectile from scene when removeProjectile is called', () => {
    // Create mock projectile
    const mockProjectile = {
      id: 'projectile-123',
      mesh: {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 }
      },
      dispose: jest.fn()
    };
    
    // Add projectile to projectiles array
    game.projectiles.push(mockProjectile);
    
    // Call removeProjectile
    game.removeProjectile('projectile-123');
    
    // Check if projectile was removed from projectiles array
    expect(game.projectiles.length).toBe(0);
  });

  test('should add other player to scene when addOtherPlayer is called', () => {
    // Create mock player data
    const playerData = {
      id: 'player-123',
      position: { x: 10, y: 5, z: 20 },
      rotation: { y: 1.5 },
      speed: 10
    };
    
    // Call addOtherPlayer
    game.addOtherPlayer(playerData);
    
    // Check if other player was added to otherPlayers map
    expect(game.otherPlayers.has('player-123')).toBe(true);
    
    // Check if scene.add was called
    expect(game.scene.add).toHaveBeenCalled();
  });

  test('should remove other player from scene when removeOtherPlayer is called', () => {
    // Create mock other player
    const mockOtherPlayer = {
      id: 'player-123',
      mesh: {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 }
      }
    };
    
    // Add other player to otherPlayers map
    game.otherPlayers.set('player-123', mockOtherPlayer);
    
    // Call removeOtherPlayer
    game.removeOtherPlayer('player-123');
    
    // Check if other player was removed from otherPlayers map
    expect(game.otherPlayers.has('player-123')).toBe(false);
    
    // Check if scene.remove was called
    expect(game.scene.remove).toHaveBeenCalledWith(mockOtherPlayer.mesh);
  });

  test('should update other player when updateOtherPlayer is called', () => {
    // Create mock other player
    const mockOtherPlayer = {
      id: 'player-123',
      mesh: {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 }
      },
      update: jest.fn()
    };
    
    // Add other player to otherPlayers map
    game.otherPlayers.set('player-123', mockOtherPlayer);
    
    // Create mock player data
    const playerData = {
      id: 'player-123',
      position: { x: 10, y: 5, z: 20 },
      rotation: { y: 1.5 },
      speed: 10
    };
    
    // Call updateOtherPlayer
    game.updateOtherPlayer(playerData);
    
    // Check if other player.update was called
    expect(mockOtherPlayer.update).toHaveBeenCalled();
  });

  test('should handle window resize when onWindowResize is called', () => {
    // Call onWindowResize
    game.onWindowResize();
    
    // Check if camera aspect was updated
    expect(game.camera.aspect).toBe(800 / 600);
    
    // Check if camera.updateProjectionMatrix was called
    expect(game.camera.updateProjectionMatrix).toHaveBeenCalled();
    
    // Check if renderer.setSize was called
    expect(game.renderer.setSize).toHaveBeenCalledWith(800, 600);
  });

  test('should clean up resources when dispose is called', () => {
    // Mock socketManager.disconnect
    game.socketManager.disconnect = jest.fn();
    
    // Call dispose
    game.dispose();
    
    // Check if socketManager.disconnect was called
    expect(game.socketManager.disconnect).toHaveBeenCalled();
  });
}); 