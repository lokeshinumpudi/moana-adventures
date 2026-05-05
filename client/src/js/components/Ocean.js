import * as THREE from 'three';
import { Water } from 'three/examples/jsm/objects/Water.js';

export class Ocean {
  constructor() {
    this.size = 20000;
    this.waveSpeed = 0.6;
    this.time = 0;
    this.mesh = null;
    this.water = null;

    // Reusable temp instances
    this._sunDir = new THREE.Vector3(0.7, 0.6, 0.4).normalize();
    this._sunColor = new THREE.Color(0xffffff);
  }

  async init() {
    await this.createOceanMesh();
    return this;
  }

  async createOceanMesh() {
    // Local first (instant in dev/prod). CDN is only a last resort.
    const texturePaths = [
      '/textures/waternormals.jpg',
      './textures/waternormals.jpg',
      'https://threejs.org/examples/textures/waternormals.jpg',
    ];

    let waterNormalTexture = null;
    for (const path of texturePaths) {
      waterNormalTexture = await new Promise((resolve) => {
        new THREE.TextureLoader().load(
          path,
          (tex) => resolve(tex),
          undefined,
          () => resolve(null),
        );
      });
      if (waterNormalTexture) break;
    }

    if (!waterNormalTexture) {
      waterNormalTexture = this.createFallbackNormalTexture();
    }
    waterNormalTexture.wrapS = waterNormalTexture.wrapT = THREE.RepeatWrapping;

    const waterGeometry = new THREE.PlaneGeometry(this.size, this.size, 64, 64);

    this.water = new Water(waterGeometry, {
      textureWidth: 512,
      textureHeight: 512,
      waterNormals: waterNormalTexture,
      sunDirection: this._sunDir.clone(),
      sunColor: 0xffffff,
      waterColor: 0x1a4d6b, // deeper, more cinematic blue
      distortionScale: 5.5, // stronger reflections
      fog: true,
    });

    this.water.rotation.x = -Math.PI / 2;
    this.water.position.y = 0;
    this.water.receiveShadow = true;
    this.water.renderOrder = -1;

    this.mesh = this.water;
    return true;
  }

  /**
   * Called by Weather each tick — keeps the water's specular highlight
   * locked to the actual sun position so glints, dawn, and sunset look right.
   */
  setSunDirection(dir, color) {
    if (!this.water || !this.water.material || !this.water.material.uniforms) return;
    this._sunDir.copy(dir);
    this.water.material.uniforms.sunDirection.value.copy(this._sunDir);
    if (color) {
      this._sunColor.copy(color);
      this.water.material.uniforms.sunColor.value.copy(this._sunColor);
    }
  }

  createFallbackNormalTexture() {
    const size = 512;
    const data = new Uint8Array(size * size * 4);
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        const idx = (i * size + j) * 4;
        const x = j / size;
        const y = i / size;
        const frequency = 5;
        data[idx] = Math.floor(127 + 127 * Math.sin(x * frequency) * Math.cos(y * frequency));
        data[idx + 1] = Math.floor(127 + 127 * Math.sin(y * frequency));
        data[idx + 2] = 255;
        data[idx + 3] = 255;
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
