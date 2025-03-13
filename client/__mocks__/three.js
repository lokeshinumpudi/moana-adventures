// Mock for Three.js
const THREE = {
  Scene: jest.fn().mockImplementation(() => ({
    add: jest.fn(),
    remove: jest.fn(),
    children: [],
    background: null,
  })),
  PerspectiveCamera: jest.fn().mockImplementation(() => ({
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    lookAt: jest.fn(),
  })),
  WebGLRenderer: jest.fn().mockImplementation(() => ({
    setSize: jest.fn(),
    setClearColor: jest.fn(),
    setPixelRatio: jest.fn(),
    render: jest.fn(),
    domElement: document.createElement('canvas'),
  })),
  Vector3: jest.fn().mockImplementation((x = 0, y = 0, z = 0) => ({
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
    add: jest.fn().mockReturnThis(),
    sub: jest.fn().mockReturnThis(),
    multiplyScalar: jest.fn().mockReturnThis(),
    normalize: jest.fn().mockReturnThis(),
    length: jest.fn().mockReturnValue(1),
    distanceTo: jest.fn().mockReturnValue(1),
    clone: jest.fn().mockImplementation(function() {
      return new THREE.Vector3(this.x, this.y, this.z);
    }),
  })),
  Quaternion: jest.fn().mockImplementation(() => ({
    set: jest.fn(),
    copy: jest.fn(),
    setFromAxisAngle: jest.fn(),
  })),
  Euler: jest.fn().mockImplementation(() => ({
    set: jest.fn(),
  })),
  Box3: jest.fn().mockImplementation(() => ({
    setFromObject: jest.fn(),
    intersectsBox: jest.fn().mockReturnValue(false),
  })),
  Mesh: jest.fn().mockImplementation(() => ({
    position: new THREE.Vector3(),
    rotation: { x: 0, y: 0, z: 0 },
    scale: new THREE.Vector3(1, 1, 1),
    material: null,
    geometry: null,
    visible: true,
    add: jest.fn(),
    remove: jest.fn(),
    children: [],
  })),
  Group: jest.fn().mockImplementation(() => ({
    position: new THREE.Vector3(),
    rotation: { x: 0, y: 0, z: 0 },
    scale: new THREE.Vector3(1, 1, 1),
    add: jest.fn(),
    remove: jest.fn(),
    children: [],
    userData: {},
  })),
  BoxGeometry: jest.fn(),
  SphereGeometry: jest.fn(),
  CylinderGeometry: jest.fn(),
  PlaneGeometry: jest.fn(),
  MeshBasicMaterial: jest.fn(),
  MeshStandardMaterial: jest.fn(),
  MeshPhongMaterial: jest.fn(),
  Color: jest.fn().mockImplementation(() => ({
    set: jest.fn(),
  })),
  DirectionalLight: jest.fn().mockImplementation(() => ({
    position: new THREE.Vector3(),
    intensity: 1,
  })),
  AmbientLight: jest.fn(),
  PointLight: jest.fn(),
  Clock: jest.fn().mockImplementation(() => ({
    getDelta: jest.fn().mockReturnValue(0.016),
    getElapsedTime: jest.fn().mockReturnValue(0),
  })),
  Raycaster: jest.fn().mockImplementation(() => ({
    set: jest.fn(),
    intersectObjects: jest.fn().mockReturnValue([]),
  })),
  TextureLoader: jest.fn().mockImplementation(() => ({
    load: jest.fn().mockReturnValue({}),
  })),
  Frustum: jest.fn().mockImplementation(() => ({
    setFromProjectionMatrix: jest.fn(),
    intersectsObject: jest.fn().mockReturnValue(true),
  })),
  Matrix4: jest.fn().mockImplementation(() => ({
    multiplyMatrices: jest.fn().mockReturnThis(),
  })),
};

// Add OrbitControls to THREE.examples.jsm.controls
THREE.examples = {
  jsm: {
    controls: {
      OrbitControls: jest.fn().mockImplementation(() => ({
        update: jest.fn(),
        enabled: true,
      })),
    },
  },
};

export default THREE;