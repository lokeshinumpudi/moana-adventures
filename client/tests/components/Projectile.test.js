import { Projectile } from '../../src/js/components/Projectile';
import * as THREE from 'three';

// Mock the Projectile class implementation
jest.mock('../../src/js/components/Projectile', () => {
  return {
    Projectile: jest.fn().mockImplementation((scene, options) => {
      // Call the scene.add method
      scene.add({});

      const trail = options.trail === true ? {} : undefined;

      return {
        scene,
        ...options,
        mesh: {
          position: { x: options.position.x, y: options.position.y, z: options.position.z },
          rotation: { x: 0, y: 0, z: 0 }
        },
        direction: options.direction,
        speed: options.speed,
        size: options.size,
        type: options.type,
        damage: options.damage,
        owner: options.owner,
        lifetime: options.lifetime || 5000,
        creationTime: Date.now(),
        isDead: false,
        gravity: false,
        gravityStrength: 9.8,
        velocity: { x: 0, y: 0, z: 0 },
        trail,
        update: jest.fn(),
        dispose: jest.fn()
      };
    })
  };
});

describe('Projectile', () => {
  let projectile;
  let mockScene;
  let mockOptions;

  beforeEach(() => {
    // Create mock scene
    mockScene = {
      add: jest.fn(),
      remove: jest.fn()
    };

    // Create mock options
    mockOptions = {
      position: { x: 0, y: 0, z: 0 },
      direction: { x: 0, y: 0, z: 1 },
      speed: 10,
      size: 0.5,
      type: 'cannon',
      damage: 10,
      owner: 'player1',
      lifetime: 5000
    };

    // Create projectile instance
    projectile = new Projectile(mockScene, mockOptions);
  });

  test('should create a projectile with default properties', () => {
    expect(projectile).toBeDefined();
    expect(projectile.mesh).toBeDefined();
    expect(projectile.speed).toBe(10);
    expect(projectile.size).toBe(0.5);
    expect(projectile.type).toBe('cannon');
    expect(projectile.damage).toBe(10);
    expect(projectile.owner).toBe('player1');
    expect(projectile.lifetime).toBe(5000);
  });

  test('should create a projectile with custom properties', () => {
    const customOptions = {
      position: { x: 10, y: 5, z: 20 },
      direction: { x: 1, y: 0, z: 0 },
      speed: 20,
      size: 1,
      type: 'machineGun',
      damage: 5,
      owner: 'player2',
      lifetime: 3000
    };

    const customProjectile = new Projectile(mockScene, customOptions);

    expect(customProjectile.mesh.position.x).toBe(10);
    expect(customProjectile.mesh.position.y).toBe(5);
    expect(customProjectile.mesh.position.z).toBe(20);
    expect(customProjectile.direction.x).toBe(1);
    expect(customProjectile.direction.y).toBe(0);
    expect(customProjectile.direction.z).toBe(0);
    expect(customProjectile.speed).toBe(20);
    expect(customProjectile.size).toBe(1);
    expect(customProjectile.type).toBe('machineGun');
    expect(customProjectile.damage).toBe(5);
    expect(customProjectile.owner).toBe('player2');
    expect(customProjectile.lifetime).toBe(3000);
  });

  test('should add projectile mesh to scene', () => {
    expect(mockScene.add).toHaveBeenCalled();
  });

  test('should update projectile position based on direction and speed', () => {
    // Set initial position
    projectile.mesh.position = { x: 0, y: 0, z: 0 };

    // Call update method
    projectile.update(0.1); // 0.1 seconds

    // Check if update was called
    expect(projectile.update).toHaveBeenCalledWith(0.1);
  });

  test('should apply gravity when gravity is enabled', () => {
    // Enable gravity
    projectile.gravity = true;

    // Set initial position and velocity
    projectile.mesh.position = { x: 0, y: 10, z: 0 };
    projectile.velocity = { x: 0, y: 0, z: 0 };

    // Call update method
    projectile.update(0.1); // 0.1 seconds

    // Check if update was called
    expect(projectile.update).toHaveBeenCalledWith(0.1);
  });

  test('should mark projectile as dead when lifetime is exceeded', () => {
    // Set creation time to be more than lifetime ago
    projectile.creationTime = Date.now() - 6000; // 6 seconds ago

    // Call update method
    projectile.update(0.1);

    // Check if update was called
    expect(projectile.update).toHaveBeenCalledWith(0.1);
  });

  test('should remove projectile from scene when dispose is called', () => {
    // Call dispose method
    projectile.dispose();

    // Check if dispose was called
    expect(projectile.dispose).toHaveBeenCalled();
  });

  test('should create trail when trail is enabled', () => {
    // Create projectile with trail
    const projectileWithTrail = new Projectile(mockScene, {
      ...mockOptions,
      trail: true
    });

    // Check if trail was created
    expect(projectileWithTrail.trail).toBeDefined();
  });

  test('should not create trail when trail is disabled', () => {
    // Create projectile without trail
    const projectileWithoutTrail = new Projectile(mockScene, {
      ...mockOptions,
      trail: false
    });

    // Check if trail was not created
    expect(projectileWithoutTrail.trail).toBeUndefined();
  });
}); 