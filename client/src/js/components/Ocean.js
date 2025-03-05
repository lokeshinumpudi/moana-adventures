import * as THREE from 'three';

const oceanVertexShader = `
  uniform float time;
  uniform sampler2D waterNormal;
  varying vec2 vUv;
  varying vec3 vPosition;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying float vWaveHeight;
  
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
    // Stylized anime waves with higher amplitude
    waves[0] = Wave(
      3.0,                    // Much higher amplitude for dramatic waves
      0.02,                   // Lower frequency for broader waves
      0.5,                    // Slower phase for smoother movement
      normalize(vec2(1, 1))   // direction
    );
    
    waves[1] = Wave(
      2.0,
      0.04,
      0.8,
      normalize(vec2(-0.7, 0.3))
    );
    
    waves[2] = Wave(
      1.5,
      0.08,
      1.2,
      normalize(vec2(0.3, -0.7))
    );
    
    waves[3] = Wave(
      1.0,
      0.15,
      1.5,
      normalize(vec2(-0.2, -0.9))
    );
    
    waves[4] = Wave(
      0.5,
      0.25,
      2.0,
      normalize(vec2(0.5, 0.5))
    );
  }
  
  float calculateWaveHeight(vec2 position) {
    float height = 0.0;
    
    for(int i = 0; i < WAVE_COUNT; i++) {
      Wave wave = waves[i];
      float phase = dot(wave.direction, position) * wave.frequency + time * wave.phase;
      height += wave.amplitude * sin(phase);
      
      // Add secondary ripples for more detail
      float ripple = sin(phase * 2.0 + time) * 0.5;
      height += ripple * wave.amplitude * 0.2;
    }
    
    return height;
  }
  
  vec3 calculateNormal(vec2 position) {
    float eps = 0.01;
    float h = calculateWaveHeight(position);
    float hx = calculateWaveHeight(position + vec2(eps, 0.0));
    float hz = calculateWaveHeight(position + vec2(0.0, eps));
    
    vec3 normal = normalize(vec3(h - hx, eps, h - hz));
    
    // Add stylized normal detail with multiple layers
    vec2 normalUv1 = vUv * 8.0 + vec2(time * 0.05, time * 0.03);
    vec2 normalUv2 = vUv * 4.0 + vec2(-time * 0.04, time * 0.02);
    vec3 normalDetail1 = texture2D(waterNormal, normalUv1).rgb * 2.0 - 1.0;
    vec3 normalDetail2 = texture2D(waterNormal, normalUv2).rgb * 2.0 - 1.0;
    
    normal = normalize(normal + normalDetail1 * 0.3 + normalDetail2 * 0.2);
    
    return normal;
  }
  
  void main() {
    vUv = uv;
    initWaves();
    
    vec3 pos = position;
    float waveHeight = calculateWaveHeight(position.xz);
    pos.y = waveHeight;
    vPosition = pos;
    vWaveHeight = waveHeight;
    
    vNormal = calculateNormal(position.xz);
    vViewPosition = -pos;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const oceanFragmentShader = `
  uniform float time;
  uniform vec3 oceanColor;
  uniform vec3 foamColor;
  uniform vec3 deepColor;
  uniform vec3 highlightColor;
  uniform samplerCube envMap;
  uniform sampler2D waterNormal;
  
  varying vec2 vUv;
  varying vec3 vPosition;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying float vWaveHeight;
  
  const float PI = 3.14159;
  
  float fresnel(vec3 normal, vec3 viewDir) {
    return pow(1.0 - max(0.0, dot(normal, viewDir)), 4.0); // Increased power for sharper fresnel
  }
  
  void main() {
    vec3 viewDir = normalize(-vViewPosition);
    float fresnelFactor = fresnel(vNormal, viewDir);
    
    // Enhanced normal mapping with multiple layers
    vec2 normalUv1 = vUv * 8.0 + vec2(time * 0.05, time * 0.03);
    vec2 normalUv2 = vUv * 4.0 + vec2(-time * 0.04, time * 0.02);
    vec3 normalDetail1 = texture2D(waterNormal, normalUv1).rgb * 2.0 - 1.0;
    vec3 normalDetail2 = texture2D(waterNormal, normalUv2).rgb * 2.0 - 1.0;
    vec3 normal = normalize(vNormal + normalDetail1 * 0.3 + normalDetail2 * 0.2);
    
    // Enhanced cel-shading effect with multiple bands
    float celFactor = floor(dot(normal, vec3(0.0, 1.0, 0.0)) * 5.0) / 5.0;
    
    // Base color with enhanced depth
    vec3 color = mix(deepColor, oceanColor, celFactor);
    
    // Add multiple highlight bands for anime style
    float highlightBand1 = smoothstep(0.3, 0.32, sin(vWaveHeight * 2.0 - time));
    float highlightBand2 = smoothstep(0.4, 0.42, sin(vWaveHeight * 3.0 - time * 1.2));
    color = mix(color, highlightColor, highlightBand1 * 0.6);
    color = mix(color, highlightColor, highlightBand2 * 0.4);
    
    // Enhanced stylized foam
    float foamFactor = smoothstep(0.6, 0.8, normal.y);
    foamFactor += smoothstep(0.3, 0.32, sin(vPosition.x * 0.5 + vPosition.z * 0.3 + time * 2.0)) * 0.4;
    foamFactor += smoothstep(0.4, 0.42, sin(vPosition.x * 0.7 - vPosition.z * 0.4 + time * 1.8)) * 0.3;
    color = mix(color, foamColor, foamFactor);
    
    // Enhanced fresnel rim light
    color = mix(color, highlightColor, fresnelFactor * 0.8);
    
    // Add enhanced sparkles
    float sparkle = pow(max(0.0, dot(normal, vec3(0.0, 1.0, 0.0))), 25.0);
    sparkle *= smoothstep(0.95, 1.0, sin(vPosition.x * 12.0 + time * 2.0) * sin(vPosition.z * 10.0 + time * 1.5));
    sparkle += smoothstep(0.90, 0.95, sin(vPosition.x * 15.0 - time * 1.8) * sin(vPosition.z * 13.0 - time * 1.3)) * 0.5;
    color += highlightColor * sparkle * 1.5;
    
    gl_FragColor = vec4(color, 0.9);
  }
`;

export class Ocean {
  constructor() {
    // Ocean properties
    this.size = 20000;
    this.segments = 250; // Increased segments for better wave detail
    this.waveHeight = 3.5; // Increased wave height
    this.waveSpeed = 0.4;  // Adjusted for smoother movement
    this.waveFrequency = 0.03;
    
    // Animation properties
    this.time = 0;

    // Create textures
    this.waterNormalTexture = new THREE.TextureLoader().load('/textures/waternormals.jpg', (texture) => {
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    });

    // Create cubemap for reflections
    const cubeTextureLoader = new THREE.CubeTextureLoader();
    this.envMap = cubeTextureLoader.load([
      '/textures/skybox/px.jpg',
      '/textures/skybox/nx.jpg',
      '/textures/skybox/py.jpg',
      '/textures/skybox/ny.jpg',
      '/textures/skybox/pz.jpg',
      '/textures/skybox/nz.jpg'
    ]);

    this.uniforms = {
      time: { value: 0 },
      oceanColor: { value: new THREE.Color(0x4AA8FF) },  // Bright blue
      foamColor: { value: new THREE.Color(0xFFFFFF) },   // Pure white foam
      deepColor: { value: new THREE.Color(0x0044AA) },   // Darker deep blue
      highlightColor: { value: new THREE.Color(0xAADDFF) }, // Light blue highlights
      waterNormal: { value: this.waterNormalTexture },
      envMap: { value: this.envMap }
    };
  }
  
  async init() {
    await this.createOceanMesh();
    return this;
  }
  
  async createOceanMesh() {
    const geometry = new THREE.PlaneGeometry(
      this.size, 
      this.size, 
      this.segments, 
      this.segments
    );
    
    geometry.rotateX(-Math.PI / 2);
    
    const material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: oceanVertexShader,
      fragmentShader: oceanFragmentShader,
      transparent: true,
      side: THREE.DoubleSide
    });
    
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.y = -20;
    this.mesh.receiveShadow = true;
    this.mesh.renderOrder = -1;
    
    return true;
  }
  
  update(delta) {
    this.time += delta * this.waveSpeed;
    if (this.mesh && this.mesh.material.uniforms) {
      this.mesh.material.uniforms.time.value = this.time;
    }
  }
} 