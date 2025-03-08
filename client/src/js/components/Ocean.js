import * as THREE from 'three';
import { Water } from 'three/examples/jsm/objects/Water.js';

export class Ocean {
  constructor() {
    // Ocean properties
    this.size = 20000;
    this.waveSpeed = 0.4;
    this.time = 0;
    this.mesh = null;
    this.water = null;
  }
  
  async init() {
    await this.createOceanMesh();
    return this;
  }
  
  async createOceanMesh() {
    // Try multiple paths for the water normal texture including public CDNs
    const texturePaths = [
      // Public CDN paths - try these first as they're more likely to work
      'https://threejs.org/examples/textures/waternormals.jpg',
      'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/waternormals.jpg',
      'https://cdn.jsdelivr.net/gh/mrdoob/three.js/examples/textures/waternormals.jpg',
      // Local paths - try these as fallbacks
      '/textures/waternormals.jpg',
      './textures/waternormals.jpg',
      'textures/waternormals.jpg',
      '/client/public/textures/waternormals.jpg',
      './client/public/textures/waternormals.jpg'
    ];
    
    let waterNormalTexture = null;
    
    // Try each path until one works
    for (const path of texturePaths) {
      try {
        console.log(`Attempting to load water normal texture from: ${path}`);
        waterNormalTexture = await new Promise((resolve) => {
          const texture = new THREE.TextureLoader().load(path, 
            (texture) => {
              console.log(`Successfully loaded water normal texture from: ${path}`);
              resolve(texture);
            },
            undefined,
            (error) => {
              console.warn(`Failed to load water normal texture from ${path}:`, error);
              resolve(null);
            }
          );
        });
        
        if (waterNormalTexture) {
          console.log('Water normal texture loaded successfully');
          break;
        }
      } catch (error) {
        console.warn(`Error loading water normal texture from ${path}:`, error);
      }
    }
    
    // If we couldn't load the texture, create a simple normal map
    if (!waterNormalTexture) {
      console.log('Creating fallback water normal texture');
      waterNormalTexture = this.createFallbackNormalTexture();
    }
    
    waterNormalTexture.wrapS = waterNormalTexture.wrapT = THREE.RepeatWrapping;
    
    // Create water parameters
    const waterGeometry = new THREE.PlaneGeometry(this.size, this.size);
    
    // Create water using Three.js Water object
    this.water = new Water(
      waterGeometry,
      {
        textureWidth: 512,
        textureHeight: 512,
        waterNormals: waterNormalTexture,
        sunDirection: new THREE.Vector3(0, 1, 0),
        sunColor: 0xffffff,
        waterColor: 0x4AA8FF,
        distortionScale: 3.7,
        fog: false
      }
    );
    
    // Position the water at y=0 so ships can float on it
    this.water.rotation.x = -Math.PI / 2;
    this.water.position.y = 0;
    this.water.receiveShadow = true;
    this.water.renderOrder = -1;
    
    this.mesh = this.water;
    
    return true;
  }
  
  createFallbackNormalTexture() {
    // Create a simple normal map texture
    const size = 512;
    const data = new Uint8Array(size * size * 4);
    
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        const idx = (i * size + j) * 4;
        
        // Create a simple wave pattern
        const x = j / size;
        const y = i / size;
        const frequency = 5;
        
        // Normal map values (r,g,b,a)
        data[idx] = Math.floor(127 + 127 * Math.sin(x * frequency) * Math.cos(y * frequency));
        data[idx + 1] = Math.floor(127 + 127 * Math.sin(y * frequency));
        data[idx + 2] = 255; // Full blue for normal map
        data[idx + 3] = 255; // Full alpha
      }
    }
    
    const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    texture.needsUpdate = true;
    return texture;
  }
  
  update(delta) {
    this.time += delta * this.waveSpeed;
    if (this.water && this.water.material.uniforms) {
      this.water.material.uniforms.time.value = this.time;
    }
  }
} 