import * as THREE from 'three';

export class Explorer {
  constructor(game) {
    this.game = game;
    this.scene = game.scene;
    
    // Create mesh container
    this.mesh = new THREE.Group();
    this.mesh.position.set(0, 0, 0);
    this.scene.add(this.mesh);
    
    // Movement properties
    this.moveSpeed = 8;
    this.rotationSpeed = 4;
    this.isActive = false;
    this.currentIsland = null;
    this.lastNotificationTime = 0;
    
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
    // Position body so its bottom is at y=0 (ground level)
    body.position.y = 1.0;
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
    // Position head on top of body
    head.position.y = 2.0;
    head.castShadow = true;
    this.mesh.add(head);
    
    // Add a direction indicator
    const arrowGeometry = new THREE.ConeGeometry(0.2, 0.5, 8);
    const arrowMaterial = new THREE.MeshStandardMaterial({
      color: 0xFF5722, // Orange color for the arrow
      roughness: 0.5,
      metalness: 0.3
    });
    
    const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
    // Position arrow in front of the head
    arrow.position.set(0, 1.8, 0.5);
    arrow.castShadow = true;
    this.mesh.add(arrow);
    
    // Add a small backpack
    const backpackGeometry = new THREE.BoxGeometry(0.6, 0.6, 0.3);
    const backpackMaterial = new THREE.MeshStandardMaterial({
      color: 0x795548, // Brown color for the backpack
      roughness: 0.8,
      metalness: 0.2
    });
    
    const backpack = new THREE.Mesh(backpackGeometry, backpackMaterial);
    // Position backpack on the back
    backpack.position.set(0, 1.5, -0.4);
    backpack.castShadow = true;
    this.mesh.add(backpack);
  }
  
  spawn(shipPosition, shipRotation, island) {
    if (!island) {
      console.error('Cannot spawn explorer: No island provided');
      return false;
    }
    
    // Check if we can spawn at this island
    if (!this.canSpawnAtIsland(island, shipPosition)) {
      console.warn('Cannot spawn explorer: Ship is too far from island');
      return false;
    }
    
    // Get the dock landing position from the island
    const dockingInfo = island.getDockingInfo();
    if (!dockingInfo || !dockingInfo.landingPosition) {
      console.error('Cannot spawn explorer: Island has no landing position');
      return false;
    }
    
    // Set explorer position to the landing position
    this.mesh.position.copy(dockingInfo.landingPosition);
    
    // Set explorer rotation to face toward the island center
    const direction = new THREE.Vector3();
    direction.subVectors(island.position, this.mesh.position).normalize();
    
    // Calculate the angle to the island center
    const angle = Math.atan2(direction.x, direction.z);
    this.mesh.rotation.y = angle;
    
    // Set the current island
    this.currentIsland = island;
    
    // Activate the explorer
    this.isActive = true;
    
    // Make sure the mesh is visible
    this.mesh.visible = true;
    
    // Ensure the explorer is at the correct height on the terrain
    this.updateTerrainHeight();
    
    // Notify the game that the explorer has spawned
    this.game.showNotification('Explorer has landed on the island!', 'success');
    
    // Send explorer state to server
    this.sendExplorerState();
    
    return true;
  }
  
  returnToShip() {
    // This method is now handled by Game.js
    console.warn('Explorer.returnToShip is deprecated. Use Game.returnToShip instead.');
    return this.game.returnToShip();
  }
  
  update(delta, inputManager) {
    if (!this.isActive || !this.currentIsland) {
      return;
    }
    
    // Store original position for collision detection
    const originalPosition = this.mesh.position.clone();
    
    // Handle movement
    let moved = false;
    const moveDistance = this.moveSpeed * delta;
    const rotateAmount = this.rotationSpeed * delta;
    
    // Forward/backward movement (W/S keys)
    if (inputManager.isKeyDown('w') || inputManager.isKeyDown('KeyW') || inputManager.isKeyDown('ArrowUp')) {
      // Move forward
      this.mesh.position.x += Math.sin(this.mesh.rotation.y) * moveDistance;
      this.mesh.position.z += Math.cos(this.mesh.rotation.y) * moveDistance;
      moved = true;
    } else if (inputManager.isKeyDown('s') || inputManager.isKeyDown('KeyS') || inputManager.isKeyDown('ArrowDown')) {
      // Move backward
      this.mesh.position.x -= Math.sin(this.mesh.rotation.y) * moveDistance;
      this.mesh.position.z -= Math.cos(this.mesh.rotation.y) * moveDistance;
      moved = true;
    }
    
    // Left/right rotation (A/D keys)
    if (inputManager.isKeyDown('a') || inputManager.isKeyDown('KeyA') || inputManager.isKeyDown('ArrowLeft')) {
      // Rotate left
      this.mesh.rotation.y += rotateAmount;
      moved = true;
    } else if (inputManager.isKeyDown('d') || inputManager.isKeyDown('KeyD') || inputManager.isKeyDown('ArrowRight')) {
      // Rotate right
      this.mesh.rotation.y -= rotateAmount;
      moved = true;
    }
    
    // Check if we're still on the island
    if (moved) {
      // Calculate distance from island center
      const dx = this.mesh.position.x - this.currentIsland.position.x;
      const dz = this.mesh.position.z - this.currentIsland.position.z;
      const distanceToCenter = Math.sqrt(dx * dx + dz * dz);
      
      // If we're too far from the island center, move back
      if (distanceToCenter > this.currentIsland.radius * 0.95) {
        // Calculate direction to island center
        const directionToCenter = new THREE.Vector3(
          this.currentIsland.position.x - this.mesh.position.x,
          0,
          this.currentIsland.position.z - this.mesh.position.z
        ).normalize();
        
        // Move back toward island
        this.mesh.position.x += directionToCenter.x * moveDistance * 2;
        this.mesh.position.z += directionToCenter.z * moveDistance * 2;
        
        // Show notification (but not too often)
        const now = Date.now();
        if (now - this.lastNotificationTime > 3000) { // Only show every 3 seconds
          this.game.showNotification("You can't leave the island!", 'warning');
          this.lastNotificationTime = now;
        }
      }
      
      // Update height based on terrain
      this.updateTerrainHeight();
      
      // Send explorer state to server if we moved
      this.sendExplorerState();
    }
    
    // Check for collectibles
    this.checkCollectibles();
    
    // Check if we can return to ship
    this.checkReturnToShip();
  }
  
  updateTerrainHeight() {
    if (!this.currentIsland) return;
    
    // Get local position relative to island
    const localX = this.mesh.position.x - this.currentIsland.position.x;
    const localZ = this.mesh.position.z - this.currentIsland.position.z;
    
    // Get height at current position
    const terrainHeight = this.currentIsland.getHeightAt(localX, localZ);
    
    // Set explorer Y position to terrain height
    this.mesh.position.y = terrainHeight;
    
    // If we're below the base height (in water), move toward island center
    if (terrainHeight <= this.currentIsland.baseHeight + 0.1) {
      // Calculate direction to island center
      const directionToCenter = new THREE.Vector3(
        this.currentIsland.position.x - this.mesh.position.x,
        0,
        this.currentIsland.position.z - this.mesh.position.z
      ).normalize();
      
      // Move toward island center
      this.mesh.position.x += directionToCenter.x * 2;
      this.mesh.position.z += directionToCenter.z * 2;
      
      // Recalculate height
      const newLocalX = this.mesh.position.x - this.currentIsland.position.x;
      const newLocalZ = this.mesh.position.z - this.currentIsland.position.z;
      const newHeight = this.currentIsland.getHeightAt(newLocalX, newLocalZ);
      
      // Set new height
      this.mesh.position.y = Math.max(this.currentIsland.baseHeight + 0.5, newHeight);
    }
  }
  
  checkCollectibles() {
    // Skip if not active
    if (!this.isActive) return;
    
    // Get all collectibles
    const collectibles = this.game.collectibles;
    if (!collectibles || collectibles.length === 0) return;
    
    // Check distance to each collectible
    for (let i = 0; i < collectibles.length; i++) {
      const collectible = collectibles[i];
      
      // Skip if collectible is not on the same island
      if (collectible.islandId !== this.currentIsland.mesh.uuid) continue;
      
      // Calculate distance
      const dx = this.mesh.position.x - collectible.mesh.position.x;
      const dy = this.mesh.position.y - collectible.mesh.position.y;
      const dz = this.mesh.position.z - collectible.mesh.position.z;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
      
      // If close enough, collect it
      if (distance < 2) {
        // Notify game to handle collectible pickup
        this.game.handleCollectiblePickup(collectible);
        
        // Show notification
        this.game.showNotification(`Collected ${collectible.type}!`, 'success');
        
        // No need to continue checking this collectible
        break;
      }
    }
  }
  
  checkReturnToShip() {
    // Skip if not active
    if (!this.isActive) return;
    
    // Check if we're near the dock
    if (this.currentIsland && this.currentIsland.isNearDock(this.mesh.position)) {
      // Show return to ship prompt if not already showing
      if (!this.returnPromptShown) {
        this.game.showNotification('Press E to return to your ship', 'info');
        this.returnPromptShown = true;
      }
    } else {
      // Hide return prompt
      this.returnPromptShown = false;
    }
  }
  
  canSpawnAtIsland(island, shipPosition) {
    if (!island || !island.isNearDock) return false;
    
    // Check if ship is near the island's dock
    return island.isNearDock(shipPosition);
  }
  
  sendExplorerState() {
    // Skip if not active
    if (!this.isActive) return;
    
    // Create explorer state data
    const data = {
      position: {
        x: this.mesh.position.x,
        y: this.mesh.position.y,
        z: this.mesh.position.z
      },
      rotation: {
        y: this.mesh.rotation.y
      },
      isActive: this.isActive,
      islandId: this.currentIsland ? this.currentIsland.mesh.uuid : null
    };
    
    // Send to server via socket manager
    if (this.game.socketManager) {
      this.game.socketManager.sendExplorerState(data);
    }
  }
} 