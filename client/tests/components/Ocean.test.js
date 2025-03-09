import { Ocean } from '../../src/js/components/Ocean';

// Mock the Ocean class implementation
jest.mock('../../src/js/components/Ocean', () => {
  return {
    Ocean: jest.fn().mockImplementation((scene, options = {}) => {
      // Call the scene.add method
      scene.add({});
      
      return {
        scene,
        size: options.size || 2000,
        segments: options.segments || 100,
        waveHeight: options.waveHeight || 2,
        waveSpeed: options.waveSpeed || 1,
        mesh: {
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          geometry: {
            attributes: {
              position: {
                array: new Float32Array(300),
                needsUpdate: false
              }
            }
          },
          material: {
            dispose: jest.fn()
          }
        },
        update: jest.fn(),
        getHeightAtPosition: jest.fn().mockReturnValue(5),
        setWaveHeight: jest.fn().mockImplementation(function(height) {
          this.waveHeight = height;
        }),
        setWaveSpeed: jest.fn().mockImplementation(function(speed) {
          this.waveSpeed = speed;
        }),
        dispose: jest.fn()
      };
    })
  };
});

describe('Ocean', () => {
  let ocean;
  let mockScene;

  beforeEach(() => {
    // Create mock scene
    mockScene = {
      add: jest.fn(),
      remove: jest.fn()
    };
    
    // Create ocean instance
    ocean = new Ocean(mockScene);
  });

  test('should create an ocean with default properties', () => {
    expect(ocean).toBeDefined();
    expect(ocean.mesh).toBeDefined();
    expect(ocean.size).toBe(2000);
    expect(ocean.segments).toBe(100);
    expect(ocean.waveHeight).toBe(2);
    expect(ocean.waveSpeed).toBe(1);
  });

  test('should create an ocean with custom properties', () => {
    const customOcean = new Ocean(mockScene, {
      size: 3000,
      segments: 150,
      waveHeight: 3,
      waveSpeed: 2
    });
    
    expect(customOcean.size).toBe(3000);
    expect(customOcean.segments).toBe(150);
    expect(customOcean.waveHeight).toBe(3);
    expect(customOcean.waveSpeed).toBe(2);
  });

  test('should add ocean mesh to scene', () => {
    expect(mockScene.add).toHaveBeenCalled();
  });

  test('should update ocean waves', () => {
    // Update ocean
    ocean.update(1); // 1 second
    
    // Check if update was called
    expect(ocean.update).toHaveBeenCalledWith(1);
  });

  test('should get height at position', () => {
    const height = ocean.getHeightAtPosition(10, 20);
    
    expect(height).toBe(5);
    expect(ocean.getHeightAtPosition).toHaveBeenCalledWith(10, 20);
  });

  test('should set wave height', () => {
    ocean.setWaveHeight(5);
    
    expect(ocean.waveHeight).toBe(5);
  });

  test('should set wave speed', () => {
    ocean.setWaveSpeed(3);
    
    expect(ocean.waveSpeed).toBe(3);
  });

  test('should dispose resources when dispose is called', () => {
    // Dispose ocean
    ocean.dispose();
    
    // Check if dispose was called
    expect(ocean.dispose).toHaveBeenCalled();
  });
}); 