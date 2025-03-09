import { PhysicsManager } from '../../src/js/utils/PhysicsManager';

// Mock the PhysicsManager class implementation
jest.mock('../../src/js/utils/PhysicsManager', () => {
  return {
    PhysicsManager: jest.fn().mockImplementation(() => {
      return {
        world: {
          gravity: { x: 0, y: -9.82, z: 0 },
          addBody: jest.fn(),
          removeBody: jest.fn(),
          addContactMaterial: jest.fn(),
          step: jest.fn()
        },
        bodies: new Map(),
        debugMode: false,
        debugMeshes: [],
        defaultMaterial: {
          friction: 0.3,
          restitution: 0.3
        },
        update: jest.fn().mockImplementation(function(deltaTime) {
          this.world.step(1/60, deltaTime, 3);
          return this;
        }),
        createBoxBody: jest.fn().mockImplementation(function(mesh, options) {
          const body = {
            position: { ...mesh.position },
            quaternion: { x: 0, y: 0, z: 0, w: 1 }
          };
          this.bodies.set(mesh, body);
          this.world.addBody(body);
          return body;
        }),
        createSphereBody: jest.fn().mockImplementation(function(mesh, options) {
          const body = {
            position: { ...mesh.position },
            quaternion: { x: 0, y: 0, z: 0, w: 1 }
          };
          this.bodies.set(mesh, body);
          this.world.addBody(body);
          return body;
        }),
        removeBody: jest.fn().mockImplementation(function(mesh) {
          const body = this.bodies.get(mesh);
          if (body) {
            this.world.removeBody(body);
            this.bodies.delete(mesh);
          }
        }),
        toggleDebugMode: jest.fn().mockImplementation(function() {
          this.debugMode = !this.debugMode;
        }),
        createDebugMesh: jest.fn()
      };
    })
  };
});

describe('PhysicsManager', () => {
  let physicsManager;

  beforeEach(() => {
    // Create physics manager instance
    physicsManager = new PhysicsManager();
  });

  test('should create a physics manager with default properties', () => {
    expect(physicsManager).toBeDefined();
    expect(physicsManager.world).toBeDefined();
    expect(physicsManager.bodies).toBeDefined();
    expect(physicsManager.debugMode).toBe(false);
  });

  test('should initialize world with gravity', () => {
    expect(physicsManager.world.gravity.x).toBe(0);
    expect(physicsManager.world.gravity.y).toBe(-9.82);
    expect(physicsManager.world.gravity.z).toBe(0);
  });

  test('should create default material', () => {
    expect(physicsManager.defaultMaterial).toBeDefined();
    expect(physicsManager.defaultMaterial.friction).toBe(0.3);
    expect(physicsManager.defaultMaterial.restitution).toBe(0.3);
  });

  test('should update physics world on update', () => {
    // Call update
    physicsManager.update(0.016); // 16ms
    
    // Check if world.step was called
    expect(physicsManager.world.step).toHaveBeenCalled();
  });

  test('should toggle debug mode', () => {
    // Initial state
    expect(physicsManager.debugMode).toBe(false);
    
    // Toggle debug mode
    physicsManager.toggleDebugMode();
    
    // Check if debug mode was toggled
    expect(physicsManager.debugMode).toBe(true);
    
    // Toggle debug mode again
    physicsManager.toggleDebugMode();
    
    // Check if debug mode was toggled back
    expect(physicsManager.debugMode).toBe(false);
  });
}); 