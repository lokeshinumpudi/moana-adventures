import * as THREE from 'three';

export class Island {
  constructor(options = {}) {
    // Island properties
    this._position = options.position || new THREE.Vector3(0, 0, 0);
    this._radius = options.radius || 40 + Math.random() * 30;
    this.height = options.height || 15 + Math.random() * 10;
    this.detail = options.detail || 2;
    this.color = options.color || new THREE.Color(0x8BC34A);
    this.beachColor = options.beachColor || new THREE.Color(0xD2B48C);
    this.vegetation = options.vegetation !== false;
    this.dock = options.dock !== false;
    this.collisionMargin = 5; // Extra margin for collision detection
    this.dockPosition = null; // Will store dock position for ship parking
    this.dockDirection = null; // Direction the dock is facing
    
    // Create mesh
    this.mesh = new THREE.Group();
    this.mesh.position.copy(this._position);
    
    // Create island
    this.createIsland();
    
    // Add vegetation if enabled
    if (this.vegetation) {
      this.addVegetation();
    }
    
    // Add dock if enabled
    if (this.dock) {
      this.addDock();
    }
  }
  
  createIsland() {
    // Create geometry for the island
    const islandGeometry = new THREE.ConeGeometry(this._radius, this.height, 32);
    islandGeometry.rotateX(Math.PI);
    
    // Create material for the island
    const islandMaterial = new THREE.MeshStandardMaterial({
      color: this.color,
      flatShading: true
    });
    
    // Create mesh for the island
    const islandMesh = new THREE.Mesh(islandGeometry, islandMaterial);
    islandMesh.position.y = -this.height / 2;
    islandMesh.castShadow = true;
    islandMesh.receiveShadow = true;
    
    // Add island to group
    this.mesh.add(islandMesh);
    this.islandMesh = islandMesh;
    
    // Add beach ring
    const beachGeometry = new THREE.RingGeometry(this._radius, this._radius + 10, 32);
    const beachMaterial = new THREE.MeshStandardMaterial({
      color: this.beachColor,
      side: THREE.DoubleSide
    });
    
    const beach = new THREE.Mesh(beachGeometry, beachMaterial);
    beach.rotation.x = -Math.PI / 2;
    beach.position.y = 0.1;
    beach.receiveShadow = true;
    this.mesh.add(beach);
  }
  
  addVegetation() {
    const treeCount = Math.floor(this._radius / 5);
    const treeGeometry = new THREE.CylinderGeometry(0, 2, 10, 6);
    const treeMaterial = new THREE.MeshStandardMaterial({
      color: 0x33691E,
      flatShading: true
    });
    
    const trunkGeometry = new THREE.CylinderGeometry(0.5, 0.5, 3, 6);
    const trunkMaterial = new THREE.MeshStandardMaterial({
      color: 0x795548,
      flatShading: true
    });
    
    // Add trees
    for (let i = 0; i < treeCount; i++) {
      // Create tree group
      const treeGroup = new THREE.Group();
      
      // Create trunk
      const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
      trunk.position.y = 1.5;
      trunk.castShadow = true;
      treeGroup.add(trunk);
      
      // Create foliage
      const foliage = new THREE.Mesh(treeGeometry, treeMaterial);
      foliage.position.y = 8;
      foliage.castShadow = true;
      treeGroup.add(foliage);
      
      // Position tree on island
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * (this._radius * 0.7);
      
      treeGroup.position.x = Math.sin(angle) * distance;
      treeGroup.position.z = Math.cos(angle) * distance;
      
      // Adjust y position based on island height at this point
      const yPos = this.getHeightAt(treeGroup.position.x, treeGroup.position.z);
      treeGroup.position.y = yPos;
      
      // Rotate trees slightly to appear more natural
      treeGroup.rotation.y = Math.random() * Math.PI * 2;
      treeGroup.rotation.x = Math.random() * 0.2 - 0.1;
      treeGroup.rotation.z = Math.random() * 0.2 - 0.1;
      
      // Add tree to island
      this.mesh.add(treeGroup);
    }
  }
  
  addDock() {
    // Create dock group
    const dockGroup = new THREE.Group();
    
    // Random angle for dock placement
    const dockAngle = Math.random() * Math.PI * 2;
    const dockDirection = new THREE.Vector3(Math.sin(dockAngle), 0, Math.cos(dockAngle));
    
    // Create dock platform
    const dockGeometry = new THREE.BoxGeometry(5, 0.5, 15);
    const dockMaterial = new THREE.MeshStandardMaterial({
      color: 0x8D6E63,
      flatShading: true
    });
    
    const dock = new THREE.Mesh(dockGeometry, dockMaterial);
    dock.position.y = 0.25;
    dock.castShadow = true;
    dock.receiveShadow = true;
    dockGroup.add(dock);
    
    // Create dock posts
    const postGeometry = new THREE.CylinderGeometry(0.4, 0.4, 2.5, 6);
    const postMaterial = new THREE.MeshStandardMaterial({
      color: 0x5D4037,
      flatShading: true
    });
    
    // Add posts at each corner
    for (let x = -2; x <= 2; x += 4) {
      for (let z = -7; z <= 7; z += 7) {
        const post = new THREE.Mesh(postGeometry, postMaterial);
        post.position.set(x, -1, z);
        post.castShadow = true;
        dockGroup.add(post);
      }
    }
    
    // Position dock at edge of island
    dockGroup.position.set(
      dockDirection.x * (this._radius + 5),
      0,
      dockDirection.z * (this._radius + 5)
    );
    
    // Rotate dock to face away from island
    dockGroup.lookAt(
      dockGroup.position.x + dockDirection.x * 10,
      0,
      dockGroup.position.z + dockDirection.z * 10
    );
    
    // Add dock to island
    this.mesh.add(dockGroup);
    
    // Store dock position and orientation for ship parking
    this.dockPosition = new THREE.Vector3(
      this.position.x + dockDirection.x * (this._radius + 20),
      0,
      this.position.z + dockDirection.z * (this._radius + 20)
    );
    this.dockDirection = dockDirection;
  }
  
  getHeightAt(x, z) {
    // Calculate distance from center
    const distance = Math.sqrt(x * x + z * z);
    
    // Calculate height based on distance (basic cone formula)
    const height = Math.max(0, this.height * (1 - distance / this._radius));
    
    return height;
  }
  
  update(delta, time) {
    // Additional island animations or updates can be added here
    // For example, waves at shore, swaying trees, etc.
  }
  
  get position() {
    return this.mesh.position;
  }
  
  set position(value) {
    if (this.mesh) {
      this.mesh.position.copy(value);
    }
    this._position = value;
  }
  
  get radius() {
    return this._radius;
  }
  
  set radius(value) {
    this._radius = value;
  }
  
  // Check if a position is colliding with this island
  checkCollision(position, radius = 0) {
    const dx = position.x - this.position.x;
    const dz = position.z - this.position.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    
    // Check if the distance is less than the island radius plus the object radius plus margin
    return distance < (this._radius + radius + this.collisionMargin);
  }
  
  // Check if a position is near the dock
  isNearDock(position, maxDistance = 15) {
    if (!this.dockPosition) return false;
    
    const dx = position.x - this.dockPosition.x;
    const dz = position.z - this.dockPosition.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    
    return distance < maxDistance;
  }
  
  // Get dock information for ship parking
  getDockingInfo() {
    return {
      position: this.dockPosition.clone(),
      direction: this.dockDirection.clone(),
      islandId: this.mesh.uuid
    };
  }
} 