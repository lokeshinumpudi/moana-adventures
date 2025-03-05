import * as THREE from 'three';

export class SkyBox {
  constructor() {
    this.mesh = null;
    this.clouds = [];
    this.cloudUpdateInterval = 0.05;
    this.timeSinceLastCloudUpdate = 0;
  }
  
  async init() {
    // Create skybox geometry
    const geometry = new THREE.SphereGeometry(400, 32, 32);
    
    // Make sure the normals point inward
    geometry.scale(-1, 1, 1);
    
    // Create gradient sky shader
    const skyShader = {
      uniforms: {
        topColor: { value: new THREE.Color(0x2E86C1) },  // Vibrant blue top
        bottomColor: { value: new THREE.Color(0xAED6F1) },  // Lighter blue at horizon
        offset: { value: 20 },
        exponent: { value: 0.6 },
        time: { value: 0 }
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        uniform float time;
        varying vec3 vWorldPosition;
        
        void main() {
          float h = normalize(vWorldPosition + offset).y;
          float blendFactor = max(pow(max(h, 0.0), exponent), 0.0);
          
          // Add subtle color variation based on position and time
          float variation = sin(vWorldPosition.x * 0.01 + time * 0.2) * 0.03 + 
                           cos(vWorldPosition.z * 0.01 + time * 0.1) * 0.03;
                           
          // Adjust color based on height and variation
          vec3 finalColor = mix(bottomColor, topColor, blendFactor + variation);
          
          // Add subtle sun glow from one direction
          vec3 sunDirection = normalize(vec3(0.5, 0.2, 0.8));
          float sunDot = max(0.0, dot(normalize(vWorldPosition), sunDirection));
          float sunGlow = pow(sunDot, 32.0) * 0.5;
          
          // Add warm sun color to the sky
          finalColor += vec3(1.0, 0.7, 0.3) * sunGlow;
          
          gl_FragColor = vec4(finalColor, 1.0);
        }
      `
    };
    
    // Create sky material
    const material = new THREE.ShaderMaterial({
      uniforms: skyShader.uniforms,
      vertexShader: skyShader.vertexShader,
      fragmentShader: skyShader.fragmentShader,
      side: THREE.BackSide
    });
    
    // Create mesh
    this.mesh = new THREE.Mesh(geometry, material);
    
    // Add clouds
    await this.createClouds();
    
    return this;
  }
  
  async createClouds() {
    // Create cloud geometry
    const cloudGeometry = new THREE.PlaneGeometry(100, 100);
    
    // Load cloud texture
    const textureLoader = new THREE.TextureLoader();
    
    // Create multiple cloud layers
    const cloudTextures = [
      '/assets/textures/cloud1.png',
      '/assets/textures/cloud2.png',
      '/assets/textures/cloud3.png'
    ];
    
    // Create promise to load all textures
    const loadAllTextures = async () => {
      // Fall back to procedural clouds if textures don't load
      try {
        for (let i = 0; i < 3; i++) {
          // Attempt to load the texture
          const texture = await new Promise((resolve, reject) => {
            textureLoader.load(
              cloudTextures[i % cloudTextures.length],
              resolve,
              undefined,
              // On error, create a procedural cloud texture
              () => {
                resolve(this.createProceduralCloudTexture());
              }
            );
          });
          
          // Create cloud material
          const cloudMaterial = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            opacity: 0.8,
            depthWrite: false,
            side: THREE.DoubleSide
          });
          
          // Create cloud meshes at different heights and rotations
          for (let j = 0; j < 5; j++) {
            // Clone geometry and material
            const cloudMesh = new THREE.Mesh(cloudGeometry, cloudMaterial.clone());
            
            // Random position
            const angle = Math.random() * Math.PI * 2;
            const radius = 200 + Math.random() * 150;
            const height = 50 + Math.random() * 100;
            
            cloudMesh.position.set(
              Math.cos(angle) * radius,
              height,
              Math.sin(angle) * radius
            );
            
            // Random rotation
            cloudMesh.rotation.x = -Math.PI / 2; // Make it horizontal
            cloudMesh.rotation.z = Math.random() * Math.PI * 2;
            
            // Random scale
            const scale = 1 + Math.random() * 3;
            cloudMesh.scale.set(scale, scale, 1);
            
            // Add to clouds array
            this.clouds.push({
              mesh: cloudMesh,
              rotationSpeed: (Math.random() - 0.5) * 0.01,
              moveSpeed: 0.2 + Math.random() * 0.3,
              initialAngle: angle,
              radius: radius
            });
            
            // Add to sky mesh
            this.mesh.add(cloudMesh);
          }
        }
      } catch (error) {
        console.error("Error creating clouds:", error);
      }
    };
    
    await loadAllTextures();
  }
  
  createProceduralCloudTexture() {
    // Create a canvas for procedural cloud texture
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext('2d');
    
    // Fill canvas with transparent background
    context.fillStyle = 'rgba(255, 255, 255, 0)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw cloud shapes
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    // Create radial gradient for cloud center
    const gradient = context.createRadialGradient(
      centerX, centerY, 0,
      centerX, centerY, canvas.width / 2
    );
    
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
    gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.5)');
    gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.2)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(centerX, centerY, canvas.width / 2, 0, Math.PI * 2);
    context.fill();
    
    // Add some variation to the cloud shape
    for (let i = 0; i < 8; i++) {
      const angle = i * Math.PI / 4;
      const x = centerX + Math.cos(angle) * canvas.width / 4;
      const y = centerY + Math.sin(angle) * canvas.width / 4;
      const radius = 30 + Math.random() * 40;
      
      const blobGradient = context.createRadialGradient(
        x, y, 0,
        x, y, radius
      );
      
      blobGradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
      blobGradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.4)');
      blobGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      
      context.fillStyle = blobGradient;
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fill();
    }
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    return texture;
  }
  
  update(delta) {
    if (!this.mesh) return;
    
    // Update sky shader time uniform
    this.mesh.material.uniforms.time.value += delta;
    
    // Only update clouds occasionally for performance
    this.timeSinceLastCloudUpdate += delta;
    if (this.timeSinceLastCloudUpdate < this.cloudUpdateInterval) {
      return;
    }
    this.timeSinceLastCloudUpdate = 0;
    
    // Update clouds
    this.clouds.forEach(cloud => {
      // Move clouds in a circular pattern
      const angle = cloud.initialAngle + this.mesh.material.uniforms.time.value * cloud.moveSpeed * 0.1;
      
      cloud.mesh.position.x = Math.cos(angle) * cloud.radius;
      cloud.mesh.position.z = Math.sin(angle) * cloud.radius;
      
      // Rotate clouds
      cloud.mesh.rotation.z += cloud.rotationSpeed * delta;
    });
  }
} 