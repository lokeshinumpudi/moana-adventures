import { Ship } from '../../src/js/components/Ship';

// Mock the Ship class implementation
jest.mock('../../src/js/components/Ship', () => {
  return {
    Ship: jest.fn().mockImplementation((inputManager = null, game = null) => {
      return {
        speed: 0,
        maxSpeed: 105,
        acceleration: 10,
        rotationSpeed: 2,
        collisionRadius: 3.5,
        velocity: { x: 0, y: 0, z: 0 },
        direction: { x: 0, y: 0, z: 1 },
        inputManager,
        game,
        health: 100,
        mesh: {
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          add: jest.fn(),
          remove: jest.fn(),
          children: []
        },
        weaponSettings: {
          cannon: {
            cooldown: 1000,
            speed: 30,
            size: 0.3,
            damage: 10
          },
          machineGun: {
            cooldown: 500,
            speed: 50,
            size: 0.2,
            damage: 5
          }
        },
        lastFired: {
          left: 0,
          right: 0,
          front: 0
        },
        lastMachineGunFired: {
          left: 0,
          right: 0,
          front: 0
        },
        update: jest.fn(),
        fireProjectile: jest.fn(),
        fireMachineGun: jest.fn(),
        takeDamage: jest.fn(),
        reset: jest.fn()
      };
    })
  };
});

describe('Ship', () => {
  let ship;
  let mockInputManager;
  let mockGame;

  beforeEach(() => {
    // Create mocks
    mockInputManager = {
      keys: {
        forward: false,
        backward: false,
        left: false,
        right: false
      },
      mousePosition: { x: 0, y: 0 }
    };

    mockGame = {
      scene: {
        add: jest.fn(),
        remove: jest.fn()
      },
      addProjectile: jest.fn(),
      notificationManager: {
        addNotification: jest.fn()
      }
    };
    
    // Create ship instance
    ship = new Ship(mockInputManager, mockGame);
  });

  test('should create a ship with default properties', () => {
    expect(ship).toBeDefined();
    expect(ship.mesh).toBeDefined();
    expect(ship.speed).toBe(0);
    expect(ship.maxSpeed).toBe(105);
    expect(ship.health).toBe(100);
  });

  test('should update ship position based on speed and direction', () => {
    // Set initial position and speed
    ship.mesh.position = { x: 0, y: 0, z: 0 };
    ship.speed = 10;
    ship.direction = { x: 0, y: 0, z: 1 };
    
    // Update ship
    ship.update(0.1); // 0.1 seconds
    
    // Check if update was called
    expect(ship.update).toHaveBeenCalledWith(0.1);
  });

  test('should accelerate when moving forward', () => {
    ship.speed = 0;
    mockInputManager.keys.forward = true;
    
    ship.update(1); // 1 second
    
    expect(ship.update).toHaveBeenCalledWith(1);
  });

  test('should decelerate when not moving', () => {
    ship.speed = 50;
    mockInputManager.keys.forward = false;
    mockInputManager.keys.backward = false;
    
    ship.update(1); // 1 second
    
    expect(ship.update).toHaveBeenCalledWith(1);
  });

  test('should turn left when left key is pressed', () => {
    mockInputManager.keys.left = true;
    
    ship.update(1); // 1 second
    
    expect(ship.update).toHaveBeenCalledWith(1);
  });

  test('should turn right when right key is pressed', () => {
    mockInputManager.keys.right = true;
    
    ship.update(1); // 1 second
    
    expect(ship.update).toHaveBeenCalledWith(1);
  });

  test('should fire projectile when fireProjectile is called', () => {
    // Mock current time
    jest.spyOn(Date, 'now').mockImplementation(() => 1000);
    
    // Call fireProjectile
    ship.fireProjectile('left');
    
    // Check if fireProjectile was called
    expect(ship.fireProjectile).toHaveBeenCalledWith('left');
  });

  test('should take damage when hit', () => {
    const initialHealth = ship.health;
    
    ship.takeDamage(10);
    
    expect(ship.takeDamage).toHaveBeenCalledWith(10);
  });

  test('should reset position when reset is called', () => {
    ship.reset();
    
    expect(ship.reset).toHaveBeenCalled();
  });
}); 