import * as THREE from 'three';

export class Buoy {
  constructor(options = {}) {
    // Buoy properties
    this.type = options.type || 'normal';
    this.order = options.order || 0;
    this.collisionRadius = 2;
    this.mesh = new THREE.Group();
    
    // Set position if provided
    if (options.position) {
      this.mesh.position.copy(options.position);
    }
    
    // Animation properties
    this.bobHeight = 0.3;
    this.bobSpeed = 0.8;
    this.rotationSpeed = 0.2;
    this.initialY = this.mesh.position.y;
    this.glowIntensity = 0;
    
    // Create the buoy mesh immediately
    this.createBuoyMesh();
  }
  
  createBuoyMesh() {
    // Determine color based on type or order
    let color;
    if (this.type === 'start') {
      color = 0x2ecc71; // Green
    } else if (this.type === 'finish') {
      color = 0xe8902e; // Orange
    } else {
      // Use a color based on the buoy's order in the sequence
      color = new THREE.Color().setHSL(this.order % 10 / 10, 0.8, 0.6).getHex();
    }
    
    // Create buoy body
    const bodyGeometry = new THREE.CylinderGeometry(1, 1.5, 3, 16);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 1.5;
    this.mesh.add(body);
    
    // Create top cone
    const coneGeometry = new THREE.ConeGeometry(0.8, 1, 16);
    const coneMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const cone = new THREE.Mesh(coneGeometry, coneMaterial);
    cone.position.y = 3.5;
    this.mesh.add(cone);
    
    // Create anchor chain
    const chainGeometry = new THREE.CylinderGeometry(0.1, 0.1, 5, 8);
    const chainMaterial = new THREE.MeshStandardMaterial({ color: 0x888888 });
    const chain = new THREE.Mesh(chainGeometry, chainMaterial);
    chain.position.y = -2.5;
    this.mesh.add(chain);
    
    // Create glow effect
    const glowGeometry = new THREE.SphereGeometry(2, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.3,
      side: THREE.BackSide
    });
    this.glow = new THREE.Mesh(glowGeometry, glowMaterial);
    this.glow.position.y = 1.5;
    this.mesh.add(this.glow);
    
    // Add a point light
    const light = new THREE.PointLight(color, 1, 10);
    light.position.y = 3;
    this.mesh.add(light);
    this.light = light;
  }
  
  update(delta) {
    // Bobbing animation
    if (this.initialY !== undefined) {
      this.mesh.position.y = this.initialY + Math.sin(Date.now() * 0.001 * this.bobSpeed) * this.bobHeight;
    }
    
    // Gentle rotation
    this.mesh.rotation.y += this.rotationSpeed * delta;
    
    // Pulsing glow effect
    if (this.glow) {
      this.glowIntensity = 0.5 + Math.sin(Date.now() * 0.002) * 0.3;
      this.glow.material.opacity = this.glowIntensity * 0.3;
      this.glow.scale.set(
        1 + this.glowIntensity * 0.1,
        1 + this.glowIntensity * 0.1,
        1 + this.glowIntensity * 0.1
      );
    }
    
    // Update light intensity
    if (this.light) {
      this.light.intensity = 0.5 + this.glowIntensity;
    }
  }
} 