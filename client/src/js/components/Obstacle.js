import * as THREE from 'three';

export class Obstacle {
  constructor(options = {}) {
    // Obstacle properties
    this.type = options.type || 'rock';
    this.size = options.size || 5;
    this.mesh = new THREE.Group();
    
    // Set position and rotation if provided
    if (options.position) {
      this.mesh.position.copy(options.position);
    }
    
    if (options.rotation !== undefined) {
      this.mesh.rotation.y = options.rotation;
    }
    
    // Set collision properties
    this.collisionRadius = this.size * 0.8;
    
    // Create obstacle mesh immediately
    this.createObstacleMesh();
  }
  
  createObstacleMesh() {
    switch (this.type) {
      case 'rock':
        this.createRock();
        break;
      case 'log':
        this.createLog();
        break;
      case 'buoy':
        this.createSmallBuoy();
        break;
      case 'coral':
        this.createCoral();
        break;
      case 'wreck':
        this.createShipwreck();
        break;
      default:
        this.createRock(); // Default to rock
    }
  }
  
  // Create rock obstacle
  createRock() {
    const rockGeometry = new THREE.DodecahedronGeometry(this.size, 1);
    const rockMaterial = new THREE.MeshStandardMaterial({
      color: 0x888888,
      roughness: 0.9,
      metalness: 0.2
    });
    
    const rock = new THREE.Mesh(rockGeometry, rockMaterial);
    rock.castShadow = true;
    rock.receiveShadow = true;
    
    // Add some random deformation
    const vertices = rock.geometry.attributes.position;
    for (let i = 0; i < vertices.count; i++) {
      vertices.setXYZ(
        i,
        vertices.getX(i) + (Math.random() - 0.5) * this.size * 0.2,
        vertices.getY(i) + (Math.random() - 0.5) * this.size * 0.2,
        vertices.getZ(i) + (Math.random() - 0.5) * this.size * 0.2
      );
    }
    vertices.needsUpdate = true;
    
    // Add rock to mesh group
    this.mesh.add(rock);
  }
  
  // Create log obstacle
  createLog() {
    const logGeometry = new THREE.CylinderGeometry(this.size / 3, this.size / 3, this.size * 2, 8);
    const logMaterial = new THREE.MeshStandardMaterial({
      color: 0x8B4513,
      roughness: 0.9,
      metalness: 0.1
    });
    
    const log = new THREE.Mesh(logGeometry, logMaterial);
    log.rotation.x = Math.PI / 2; // Lay the log horizontally
    log.castShadow = true;
    log.receiveShadow = true;
    
    // Add log to mesh group
    this.mesh.add(log);
  }
  
  // Create small buoy obstacle
  createSmallBuoy() {
    // Base buoy
    const baseGeometry = new THREE.CylinderGeometry(this.size / 3, this.size / 2, this.size, 10);
    const baseMaterial = new THREE.MeshStandardMaterial({
      color: 0xff3333,
      roughness: 0.7,
      metalness: 0.3
    });
    
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.castShadow = true;
    base.receiveShadow = true;
    
    // Top light
    const topGeometry = new THREE.SphereGeometry(this.size / 4, 8, 8);
    const topMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.5
    });
    
    const top = new THREE.Mesh(topGeometry, topMaterial);
    top.position.y = this.size / 1.5;
    
    // Add parts to mesh group
    this.mesh.add(base);
    this.mesh.add(top);
  }
  
  // Create coral obstacle
  createCoral() {
    const coralGroup = new THREE.Group();
    
    // Create a few coral branches
    const branchCount = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < branchCount; i++) {
      const height = this.size * (0.7 + Math.random() * 0.6);
      const geometry = new THREE.CylinderGeometry(
        this.size / 10, 
        this.size / 5, 
        height, 
        8,
        4,
        true
      );
      
      // Randomly select coral color
      const color = [0xFF8080, 0x80FF80, 0x8080FF][Math.floor(Math.random() * 3)];
      const material = new THREE.MeshStandardMaterial({ 
        color,
        roughness: 0.8,
        metalness: 0.2,
        side: THREE.DoubleSide
      });
      
      const branch = new THREE.Mesh(geometry, material);
      
      // Position randomly around center
      const angle = (i / branchCount) * Math.PI * 2;
      const radius = this.size / 3 * Math.random();
      branch.position.set(
        Math.sin(angle) * radius,
        height / 2,
        Math.cos(angle) * radius
      );
      
      // Random rotation
      branch.rotation.x = (Math.random() - 0.5) * 0.5;
      branch.rotation.z = (Math.random() - 0.5) * 0.5;
      
      branch.castShadow = true;
      coralGroup.add(branch);
    }
    
    this.mesh.add(coralGroup);
  }
  
  // Create shipwreck obstacle
  createShipwreck() {
    // Hull
    const hullGeometry = new THREE.BoxGeometry(this.size * 1.5, this.size * 0.8, this.size * 3);
    const hullMaterial = new THREE.MeshStandardMaterial({
      color: 0x8B4513,
      roughness: 0.9,
      metalness: 0.1
    });
    
    const hull = new THREE.Mesh(hullGeometry, hullMaterial);
    hull.position.y = this.size * 0.3;
    hull.rotation.y = Math.PI / 6; // Tilt to look wrecked
    hull.rotation.z = Math.PI / 12;
    
    // Create some broken masts
    const mastGeometry = new THREE.CylinderGeometry(this.size * 0.1, this.size * 0.1, this.size * 2, 8);
    const mastMaterial = new THREE.MeshStandardMaterial({
      color: 0x8B4513,
      roughness: 1.0
    });
    
    const mast1 = new THREE.Mesh(mastGeometry, mastMaterial);
    mast1.position.set(0, this.size * 1.2, -this.size * 0.5);
    mast1.rotation.x = Math.PI / 3; // Broken and leaning
    
    const mast2 = new THREE.Mesh(mastGeometry, mastMaterial);
    mast2.position.set(0, this.size * 0.6, this.size * 0.5);
    mast2.rotation.x = -Math.PI / 4;
    mast2.rotation.z = Math.PI / 6;
    
    // Add all parts to mesh group
    hull.castShadow = true;
    mast1.castShadow = true;
    mast2.castShadow = true;
    
    this.mesh.add(hull);
    this.mesh.add(mast1);
    this.mesh.add(mast2);
  }
  
  update(delta) {
    // Additional animations or physics updates can be added here
    // For example, rocks could subtly move with waves, logs could bob in water, etc.
  }
} 