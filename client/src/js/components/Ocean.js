import * as THREE from 'three';

const oceanVertexShader = `
  uniform float time;
  varying vec2 vUv;
  varying vec3 vPosition;
  varying vec3 vNormal;
  
  // Wave parameters
  const float PI = 3.14159;
  const int WAVE_COUNT = 5;
  
  struct Wave {
    float amplitude;
    float frequency;
    float phase;
    vec2 direction;
  };
  
  Wave waves[WAVE_COUNT];
  
  void initWaves() {
    // Large rolling waves
    waves[0] = Wave(
      1.2,                    // amplitude
      0.02,                   // frequency
      0.5,                    // phase
      normalize(vec2(1, 1))   // direction
    );
    
    // Medium choppy waves
    waves[1] = Wave(
      0.5,
      0.06,
      1.2,
      normalize(vec2(-0.7, 0.3))
    );
    
    // Small ripples
    waves[2] = Wave(
      0.2,
      0.15,
      0.8,
      normalize(vec2(0.3, -0.7))
    );
    
    // Tiny surface detail
    waves[3] = Wave(
      0.1,
      0.3,
      1.5,
      normalize(vec2(-0.2, -0.9))
    );
    
    // Additional surface detail
    waves[4] = Wave(
      0.05,
      0.4,
      1.8,
      normalize(vec2(0.5, 0.5))
    );
  }
  
  float calculateWaveHeight(vec2 position) {
    float height = 0.0;
    
    for(int i = 0; i < WAVE_COUNT; i++) {
      Wave wave = waves[i];
      float phase = dot(wave.direction, position) * wave.frequency + time * wave.phase;
      height += wave.amplitude * sin(phase);
    }
    
    return height;
  }
  
  vec3 calculateNormal(vec2 position) {
    float eps = 0.01;
    float h = calculateWaveHeight(position);
    float hx = calculateWaveHeight(position + vec2(eps, 0.0));
    float hz = calculateWaveHeight(position + vec2(0.0, eps));
    
    return normalize(vec3(h - hx, eps, h - hz));
  }
  
  void main() {
    vUv = uv;
    initWaves();
    
    vec3 pos = position;
    pos.y = calculateWaveHeight(position.xz);
    vPosition = pos;
    
    vNormal = calculateNormal(position.xz);
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const oceanFragmentShader = `
  uniform float time;
  uniform vec3 oceanColor;
  uniform vec3 foamColor;
  uniform vec3 deepColor;
  
  varying vec2 vUv;
  varying vec3 vPosition;
  varying vec3 vNormal;
  
  const float PI = 3.14159;
  
  float fresnel(vec3 normal, vec3 viewDir) {
    return pow(1.0 - max(0.0, dot(normal, viewDir)), 5.0);
  }
  
  void main() {
    vec3 viewDir = normalize(cameraPosition - vPosition);
    float fresnelFactor = fresnel(vNormal, viewDir);
    
    // More intense base ocean color with stronger blending
    vec3 color = mix(deepColor, oceanColor, vNormal.y * 0.7 + 0.3);
    
    // Add foam based on wave height and slope with higher intensity
    float foamFactor = pow(max(0.0, vNormal.y), 2.0); // Less power means more foam
    color = mix(color, foamColor, foamFactor * 0.4); // Increased foam intensity
    
    // Add fresnel reflection with higher intensity
    color = mix(color, foamColor, fresnelFactor * 0.7); // Increased fresnel factor
    
    // Add more visible sparkles
    float sparkle = pow(max(0.0, dot(vNormal, vec3(0.0, 1.0, 0.0))), 15.0);
    sparkle *= sin(vPosition.x * 12.0 + time * 1.2) * 0.5 + 0.5;
    sparkle *= sin(vPosition.z * 15.0 + time * 1.3) * 0.5 + 0.5;
    color += foamColor * sparkle * 0.4; // Double sparkle intensity
    
    gl_FragColor = vec4(color, 1.0);
  }
`;

export class Ocean {
  constructor() {
    // Ocean properties
    this.size = 20000; // Much larger ocean
    this.segments = 200; // More segments for better detail
    this.waveHeight = 2.5; // Bigger waves
    this.waveSpeed = 0.8; // Faster waves
    this.waveFrequency = 0.04; // Slightly higher frequency
    
    // Animation properties
    this.time = 0;

    this.uniforms = {
      time: { value: 0 },
      oceanColor: { value: new THREE.Color(0x1E90FF) }, // Brighter blue
      foamColor: { value: new THREE.Color(0xFFFFFF) },  // Pure white foam
      deepColor: { value: new THREE.Color(0x0D47A1) }   // Deeper blue for contrast
    };
  }
  
  async init() {
    // Create ocean mesh with custom shader
    await this.createOceanMesh();
    
    return this;
  }
  
  async createOceanMesh() {
    // Create a large plane for the ocean
    const geometry = new THREE.PlaneGeometry(
      this.size, 
      this.size, 
      this.segments, 
      this.segments
    );
    
    // Rotate to be horizontal
    geometry.rotateX(-Math.PI / 2);
    
    // Create custom shader material for animated waves
    const material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: oceanVertexShader,
      fragmentShader: oceanFragmentShader,
      transparent: false, // Better performance
      side: THREE.DoubleSide
    });
    
    // Create mesh
    this.mesh = new THREE.Mesh(geometry, material);
    
    // Position the ocean at sea level
    this.mesh.position.y = -20;
    
    // Enable shadows
    this.mesh.receiveShadow = true;
    
    // Set render order to ensure it's drawn correctly
    this.mesh.renderOrder = -1;
    
    return true;
  }
  
  update(delta) {
    // Update time for wave animation
    this.time += delta * this.waveSpeed;
    
    // Update shader uniform
    if (this.mesh && this.mesh.material.uniforms) {
      this.mesh.material.uniforms.time.value = this.time;
    }
  }
} 