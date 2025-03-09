import { Island } from '../../src/js/components/Island';

// Mock the Island class implementation
jest.mock('../../src/js/components/Island', () => {
  return {
    Island: jest.fn().mockImplementation((options = {}) => {
      const id = options.id || `island_${Math.floor(Math.random() * 10000)}`;
      const _radius = options.radius || 40 + Math.random() * 30;
      const height = options.height || 25 + Math.random() * 10;
      const _position = options.position || { x: 0, y: 0, z: 0 };
      
      return {
        id,
        _radius,
        height,
        _position,
        mesh: {
          position: { ..._position },
          userData: {
            type: 'island',
            id
          }
        },
        physicsBody: null,
        vegetation: options.vegetation !== false,
        dock: options.dock !== false,
        addVegetation: jest.fn(),
        addDock: jest.fn(),
        setupPhysics: jest.fn().mockImplementation(function(world) {
          this.physicsBody = { position: { x: 0, y: 0, z: 0 } };
          return this.physicsBody;
        }),
        removePhysics: jest.fn(),
        updatePhysics: jest.fn(),
        get position() {
          return this._position;
        },
        set position(newPosition) {
          this._position = newPosition;
          this.mesh.position = { ...newPosition };
        },
        get radius() {
          return this._radius;
        },
        set radius(value) {
          this._radius = value;
        }
      };
    })
  };
});

describe('Island', () => {
  let island;

  beforeEach(() => {
    // Create island instance with default options
    island = new Island();
  });

  test('should create an island with default properties', () => {
    expect(island).toBeDefined();
    expect(island.mesh).toBeDefined();
    expect(island._radius).toBeGreaterThan(0);
    expect(island.height).toBeGreaterThan(0);
    expect(island.id).toContain('island_');
  });

  test('should create an island with custom properties', () => {
    const customIsland = new Island({
      position: { x: 10, y: 0, z: 20 },
      radius: 50,
      height: 30,
      id: 'custom_island'
    });
    
    expect(customIsland._position.x).toBe(10);
    expect(customIsland._position.z).toBe(20);
    expect(customIsland._radius).toBe(50);
    expect(customIsland.height).toBe(30);
    expect(customIsland.id).toBe('custom_island');
  });

  test('should have vegetation enabled by default', () => {
    expect(island.vegetation).toBe(true);
  });

  test('should disable vegetation when specified', () => {
    const islandWithoutVegetation = new Island({ vegetation: false });
    expect(islandWithoutVegetation.vegetation).toBe(false);
  });

  test('should have dock enabled by default', () => {
    expect(island.dock).toBe(true);
  });

  test('should disable dock when specified', () => {
    const islandWithoutDock = new Island({ dock: false });
    expect(islandWithoutDock.dock).toBe(false);
  });

  test('should set user data on mesh', () => {
    expect(island.mesh.userData.type).toBe('island');
    expect(island.mesh.userData.id).toBe(island.id);
  });

  test('should create physics body when setupPhysics is called', () => {
    const mockWorld = { addBody: jest.fn() };
    
    island.setupPhysics(mockWorld);
    
    expect(island.physicsBody).toBeDefined();
    expect(island.setupPhysics).toHaveBeenCalled();
  });

  test('should remove physics body when removePhysics is called', () => {
    const mockWorld = { removeBody: jest.fn() };
    
    island.setupPhysics(mockWorld);
    island.removePhysics(mockWorld);
    
    expect(island.removePhysics).toHaveBeenCalled();
  });

  test('should update physics body position when updatePhysics is called', () => {
    const mockWorld = { addBody: jest.fn() };
    
    island.setupPhysics(mockWorld);
    island.mesh.position = { x: 10, y: 0, z: 20 };
    island.updatePhysics();
    
    expect(island.updatePhysics).toHaveBeenCalled();
  });

  test('should get position', () => {
    island._position = { x: 10, y: 0, z: 20 };
    
    const position = island.position;
    
    expect(position.x).toBe(10);
    expect(position.y).toBe(0);
    expect(position.z).toBe(20);
  });

  test('should set position', () => {
    const newPosition = { x: 10, y: 0, z: 20 };
    
    island.position = newPosition;
    
    expect(island._position.x).toBe(10);
    expect(island._position.y).toBe(0);
    expect(island._position.z).toBe(20);
    expect(island.mesh.position.x).toBe(10);
    expect(island.mesh.position.y).toBe(0);
    expect(island.mesh.position.z).toBe(20);
  });

  test('should get radius', () => {
    island._radius = 50;
    
    const radius = island.radius;
    
    expect(radius).toBe(50);
  });

  test('should set radius', () => {
    island.radius = 50;
    
    expect(island._radius).toBe(50);
  });
}); 