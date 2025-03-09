import * as THREE from 'three';

export class Explorer {
  constructor(game) {
    this.game = game;
    this.speed = 15; // Units per second
    this.turnSpeed = 3; // Radians per second
    this.isActive = false;
    this.collectibleRange = 3; // Range to pick up collectibles
    this.mesh = new THREE.Group();
    this.collisionRadius = 1;
    this.parentShip = null;
    this.currentIsland = null;
    this.collectibles = [];
    
    // Character properties
    this.health = 100;
    this.inventory = [];
    
    // Create the character
    this.createCharacter();
  }
  
  createCharacter() {
    // Create a simple character model
    // Body
    const bodyGeometry = new THREE.CapsuleGeometry(0.5, 1, 4, 8);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x2196F3, // Blue color for the character
      roughness: 0.7,
      metalness: 0.3
    });
    
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 1;
    body.castShadow = true;
    this.mesh.add(body);
    
    // Head
    const headGeometry = new THREE.SphereGeometry(0.3, 16, 16);
    const headMaterial = new THREE.MeshStandardMaterial({
      color: 0xFFD700, // Gold color for the head
      roughness: 0.5,
      metalness: 0.3
    });
    
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 2;
    head.castShadow = true;
    this.mesh.add(head);
    
    // Add a direction indicator
    const arrowGeometry = new THREE.ConeGeometry(0.2, 0.5, 8);
    const arrowMaterial = new THREE.MeshStandardMaterial({
      color: 0xFF0000, // Red color for the direction arrow
      roughness: 0.5,
      metalness: 0.3
    });
    
    const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
    arrow.rotation.x = -Math.PI / 2;
    arrow.position.set(0, 1.5, 0.7);
    this.mesh.add(arrow);
    
    // Set mesh invisible initially
    this.mesh.visible = false;
  }
  
  // Spawn the explorer on an island
  spawn(shipPosition, shipRotation, island) {
    this.parentShip = {
      position: shipPosition.clone(),
      rotation: shipRotation.clone()
    };
    
    this.currentIsland = island;
    
    // Position the explorer based on ship position
    // This places them on the island side of the ship
    const spawnOffset = new THREE.Vector3(0, 0, -3);
    spawnOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), shipRotation.y);
    
    this.mesh.position.copy(shipPosition).add(spawnOffset);
    this.mesh.rotation.y = shipRotation.y;
    this.mesh.visible = true;
    this.isActive = true;
    
    // Show character controls
    const controls = document.getElementById('character-controls');
    if (controls) {
      controls.classList.remove('hidden');
    }
    
    console.log('Explorer spawned at', this.mesh.position);
    this.game.showNotification('You have disembarked your ship. Explore the island!', 'info');
    
    // Notify server if multiplayer
    if (this.game.socketManager) {
      this.sendPositionUpdate();
    }
  }
  
  // Return to ship and disable explorer
  returnToShip() {
    if (!this.isActive || !this.parentShip) return;
    
    // Hide explorer
    this.mesh.visible = false;
    this.isActive = false;
    
    // Hide character controls
    const controls = document.getElementById('character-controls');
    if (controls) {
      controls.classList.add('hidden');
    }
    
    // Return any collected items to the ship
    if (this.inventory.length > 0) {
      this.game.showNotification(`You brought back ${this.inventory.length} items to your ship!`, 'powerup');
      this.inventory = [];
    }
    
    // Notify server if multiplayer
    if (this.game.socketManager) {
      this.game.socketManager.sendExplorerState({
        isActive: false
      });
    }
    
    // Return ship info for camera repositioning
    return this.parentShip;
  }
  
  update(delta, inputManager) {
    if (!this.isActive) return;
    
    // Movement
    let didMove = false;
    const moveSpeed = this.speed * delta;
    const turnSpeed = this.turnSpeed * delta;
    
    // Calculate forward direction based on rotation
    const forward = new THREE.Vector3(0, 0, 1);
    forward.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.mesh.rotation.y);
    
    // Calculate right direction (perpendicular to forward)
    const right = new THREE.Vector3(1, 0, 0);
    right.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.mesh.rotation.y);
    
    // Move forward/backward
    if (inputManager.keys['w'] || inputManager.keys['ArrowUp']) {
      this.mesh.position.add(forward.clone().multiplyScalar(moveSpeed));
      didMove = true;
    } else if (inputManager.keys['s'] || inputManager.keys['ArrowDown']) {
      this.mesh.position.add(forward.clone().multiplyScalar(-moveSpeed));
      didMove = true;
    }
    
    // Strafe left/right
    if (inputManager.keys['q']) {
      this.mesh.position.add(right.clone().multiplyScalar(-moveSpeed));
      didMove = true;
    } else if (inputManager.keys['e']) {
      this.mesh.position.add(right.clone().multiplyScalar(moveSpeed));
      didMove = true;
    }
    
    // Rotate left/right
    if (inputManager.keys['a'] || inputManager.keys['ArrowLeft']) {
      this.mesh.rotation.y += turnSpeed;
      didMove = true;
    } else if (inputManager.keys['d'] || inputManager.keys['ArrowRight']) {
      this.mesh.rotation.y -= turnSpeed;
      didMove = true;
    }
    
    // Check for collectibles
    this.checkCollectibles();
    
    // Check if player is near ship to return
    this.checkReturnToShip();
    
    // Keep player on the island
    this.constrainToIsland();
    
    // Send position update to server if moved
    if (didMove && this.game.socketManager) {
      this.sendPositionUpdate();
    }
  }
  
  checkCollectibles() {
    if (!this.game.collectibles) return;
    
    for (let i = this.game.collectibles.length - 1; i >= 0; i--) {
      const collectible = this.game.collectibles[i];
      
      // Skip if collectible is not on the same island
      if (collectible.islandId !== this.currentIsland.mesh.uuid) continue;
      
      const distance = this.mesh.position.distanceTo(collectible.mesh.position);
      
      if (distance < this.collectibleRange) {
        // Collect the item
        this.inventory.push({
          type: collectible.type,
          value: collectible.value
        });
        
        // Remove collectible from game
        this.game.scene.remove(collectible.mesh);
        this.game.collectibles.splice(i, 1);
        
        // Show notification
        this.game.showNotification(`You found a ${collectible.type}!`, 'powerup');
        
        // Notify server if multiplayer
        if (this.game.socketManager) {
          this.game.socketManager.sendCollectiblePickup({
            collectibleId: collectible.id,
            islandId: this.currentIsland.mesh.uuid
          });
        }
      }
    }
  }
  
  checkReturnToShip() {
    if (!this.parentShip) return;
    
    const distance = this.mesh.position.distanceTo(this.parentShip.position);
    
    // If explorer is near the ship, show a hint to return
    if (distance < 5 && !this.returnHintShown) {
      this.game.showNotification('Press the Return button to board your ship', 'info');
      this.returnHintShown = true;
    } else if (distance >= 5) {
      this.returnHintShown = false;
    }
  }
  
  // Public method to check if explorer can be spawned
  canSpawnAtIsland(island, shipPosition) {
    if (!island) return false;
    
    // Check if ship is near enough to the island's dock
    if (island.dockPosition) {
      const distanceToDock = shipPosition.distanceTo(island.dockPosition);
      return distanceToDock < 20; // Within 20 units of dock
    }
    
    // Fallback to distance from island edge
    const distanceToIsland = shipPosition.distanceTo(island.position);
    return distanceToIsland < (island.radius + 10) && distanceToIsland > (island.radius - 5);
  }
  
  // Send explorer position to server
  sendPositionUpdate() {
    if (!this.game.socketManager) return;
    
    this.game.socketManager.sendExplorerState({
      isActive: this.isActive,
      position: {
        x: this.mesh.position.x,
        y: this.mesh.position.y,
        z: this.mesh.position.z
      },
      rotation: {
        y: this.mesh.rotation.y
      },
      islandId: this.currentIsland ? this.currentIsland.id : null
    });
  }
  
  // Constrain player to the island
  constrainToIsland() {
    if (!this.currentIsland) return;
    
    // Get distance from island center
    const islandPosition = this.currentIsland.position;
    const dx = this.mesh.position.x - islandPosition.x;
    const dz = this.mesh.position.z - islandPosition.z;
    const distanceFromCenter = Math.sqrt(dx * dx + dz * dz);
    
    // If player is beyond island radius, move them back
    const maxRadius = this.currentIsland.radius * 0.9; // 90% of island radius
    if (distanceFromCenter > maxRadius) {
      // Calculate direction from center to player
      const direction = new THREE.Vector3(dx, 0, dz).normalize();
      
      // Set player position to edge of allowed area
      this.mesh.position.x = islandPosition.x + direction.x * maxRadius;
      this.mesh.position.z = islandPosition.z + direction.z * maxRadius;
    }
    
    // Adjust player height based on island terrain
    if (this.currentIsland.getHeightAt) {
      const height = this.currentIsland.getHeightAt(this.mesh.position.x, this.mesh.position.z);
      this.mesh.position.y = height + 1; // Position player 1 unit above terrain
    }
  }
} 