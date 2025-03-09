// Mock for cannon-es
const CANNON = {
  World: jest.fn().mockImplementation(() => ({
    gravity: { x: 0, y: -9.82, z: 0 },
    addBody: jest.fn(),
    removeBody: jest.fn(),
    addContactMaterial: jest.fn(),
    step: jest.fn()
  })),
  Body: jest.fn().mockImplementation(() => ({
    position: { x: 0, y: 0, z: 0 },
    quaternion: { x: 0, y: 0, z: 0, w: 1 },
    velocity: { x: 0, y: 0, z: 0 },
    angularVelocity: { x: 0, y: 0, z: 0 },
    applyForce: jest.fn(),
    applyImpulse: jest.fn(),
    applyLocalForce: jest.fn(),
    applyLocalImpulse: jest.fn()
  })),
  Vec3: jest.fn().mockImplementation((x = 0, y = 0, z = 0) => ({
    x, y, z,
    set: jest.fn().mockImplementation(function(newX, newY, newZ) {
      this.x = newX;
      this.y = newY;
      this.z = newZ;
      return this;
    }),
    copy: jest.fn().mockImplementation(function(v) {
      this.x = v.x;
      this.y = v.y;
      this.z = v.z;
      return this;
    }),
    normalize: jest.fn().mockReturnThis(),
    length: jest.fn().mockReturnValue(1)
  })),
  Quaternion: jest.fn().mockImplementation(() => ({
    x: 0, y: 0, z: 0, w: 1,
    setFromAxisAngle: jest.fn()
  })),
  Material: jest.fn(),
  ContactMaterial: jest.fn(),
  Box: jest.fn(),
  Sphere: jest.fn(),
  Cylinder: jest.fn(),
  Plane: jest.fn()
};

export default CANNON; 