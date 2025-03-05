import * as THREE from 'three';

export class Obstacle {
  constructor(type = 'barrel') {
    // Obstacle properties
    this.type = type;
    this.health = 100;
    this.collisionRadius = 1.5;
    this.mesh = new THREE.Group();
    
    // Animation properties
    this.bobHeight = 0.2;
    this.bobSpeed = 1;
    this.rotationSpeed = 0.1;
    this.initialY = 0;
  }
  
  async init() {
    // Create obstacle based on type
    switch (this.type) {
      case 'barrel':
        this.createBarrel();
        break;
      case 'log':
        this.createLog();
        break;
      case 'rock':
        this.createRock();
        break;
      default:
        this.createBarrel();
    }
    
    // Store initial Y position for bobbing animation
    this.initialY = this.mesh.position.y;
    
    return this;
  }
  
  createBarrel() {
    // Create a barrel obstacle
    const bodyGeometry = new THREE.CylinderGeometry(1, 1, 2, 16);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    this.mesh.add(body);
    
    // Add metal rings
    const ringGeometry = new THREE.TorusGeometry(1.05, 0.1, 8, 16);
    const ringMaterial = new THREE.MeshStandardMaterial({ color: 0x555555 });
    
    const topRing = new THREE.Mesh(ringGeometry, ringMaterial);
    topRing.position.y = 0.8;
    topRing.rotation.x = Math.PI / 2;
    this.mesh.add(topRing);
    
    const middleRing = new THREE.Mesh(ringGeometry, ringMaterial);
    middleRing.rotation.x = Math.PI / 2;
    this.mesh.add(middleRing);
    
    const bottomRing = new THREE.Mesh(ringGeometry, ringMaterial);
    bottomRing.position.y = -0.8;
    bottomRing.rotation.x = Math.PI / 2;
    this.mesh.add(bottomRing);
    
    // Set collision radius
    this.collisionRadius = 1.2;
    
    // Set floating height
    this.mesh.position.y = 1;
  }
  
  createLog() {
    // Create a log obstacle
    const bodyGeometry = new THREE.CylinderGeometry(0.8, 0.8, 4, 8);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.rotation.z = Math.PI / 2;
    this.mesh.add(body);
    
    // Add some details to make it look like a log
    const detailMaterial = new THREE.MeshStandardMaterial({ color: 0x654321 });
    
    // End circles
    for (let i = -1; i <= 1; i += 2) {
      const endGeometry = new THREE.CircleGeometry(0.8, 16);
      const end = new THREE.Mesh(endGeometry, detailMaterial);
      end.position.set(i * 2, 0, 0);
      end.rotation.y = i === 1 ? Math.PI / 2 : -Math.PI / 2;
      this.mesh.add(end);
      
      // Add rings
      for (let j = 0; j < 3; j++) {
        const ringGeometry = new THREE.TorusGeometry(0.3 + j * 0.2, 0.05, 8, 16);
        const ring = new THREE.Mesh(ringGeometry, detailMaterial);
        ring.position.set(i * 2, 0, 0);
        ring.rotation.y = i === 1 ? Math.PI / 2 : -Math.PI / 2;
        this.mesh.add(ring);
      }
    }
    
    // Set collision radius
    this.collisionRadius = 2;
    
    // Set floating height
    this.mesh.position.y = 0.8;
  }
  
  createRock() {
    // Create a rock obstacle using an icosahedron
    const geometry = new THREE.IcosahedronGeometry(1.5, 1);
    
    // Distort vertices to make it look more like a rock
    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      
      const distortion = 0.3;
      positions.setX(i, x + (Math.random() - 0.5) * distortion);
      positions.setY(i, y + (Math.random() - 0.5) * distortion);
      positions.setZ(i, z + (Math.random() - 0.5) * distortion);
    }
    
    const material = new THREE.MeshStandardMaterial({ 
      color: 0x888888,
      roughness: 0.9,
      metalness: 0.1
    });
    
    const rock = new THREE.Mesh(geometry, material);
    this.mesh.add(rock);
    
    // Set collision radius
    this.collisionRadius = 1.8;
    
    // Set floating height (rocks are partially submerged)
    this.mesh.position.y = 0.5;
  }
  
  update(delta) {
    // Bobbing animation
    if (this.initialY !== undefined) {
      this.mesh.position.y = this.initialY + Math.sin(Date.now() * 0.001 * this.bobSpeed) * this.bobHeight;
    }
    
    // Gentle rotation
    if (this.type === 'barrel' || this.type === 'log') {
      this.mesh.rotation.y += this.rotationSpeed * delta;
    }
  }
} 