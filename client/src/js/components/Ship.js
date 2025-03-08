import * as THREE from 'three';
import { Projectile } from './Projectile.js';
import { v4 as uuidv4 } from 'uuid';

export class Ship {
  constructor(inputManager = null, game = null) {
    // Ship properties
    this.speed = 0;
    this.maxSpeed = 105;
    this.acceleration = 10;
    this.rotationSpeed = 2;
    this.collisionRadius = 3.5;
    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3(0, 0, 1);
    this.inputManager = inputManager;
    this.isDocked = false;
    this.dockedAt = null;
    this.game = game;
    
    // Create a group for the ship and its parts
    this.mesh = new THREE.Group();
    
    // Weapon settings
    this.weaponSettings = {
      cannon: {
        cooldown: 1000,
        speed: 30,
        size: 0.3,
        damage: 10
      }
    };
    
    // Cooldown tracking
    this.lastFired = {
      left: 0,
      right: 0,
      front: 0
    };
    
    // Unique ID for this ship
    this.id = uuidv4();
    
    // Health and damage
    this.maxHealth = 100;
    this.health = 100;
    this.originalColor = new THREE.Color(0x8B4513);
    
    // Create single notification element
    this.createNotificationElement();
  }
  
  async init() {
    this.createBasicShip();
    return this;
  }
  
  createBasicShip() {
    // Create the hull (main body of the ship)
    const hullGeometry = new THREE.BoxGeometry(3, 1, 7);
    const hullMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x8B4513,
      roughness: 0.7,
      metalness: 0.2
    });
    const hull = new THREE.Mesh(hullGeometry, hullMaterial);
    hull.castShadow = true;
    hull.receiveShadow = true;
    this.hull = hull;
    this.mesh.add(hull);
    
    // Create a mast
    const mastGeometry = new THREE.CylinderGeometry(0.1, 0.1, 4, 8);
    const mastMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x8B4513,
      roughness: 0.8 
    });
    const mast = new THREE.Mesh(mastGeometry, mastMaterial);
    mast.position.set(0, 2.5, 0);
    mast.castShadow = true;
    this.mesh.add(mast);
    
    // Create a sail
    const sailGeometry = new THREE.PlaneGeometry(3, 3);
    const sailMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xF5F5DC,
      side: THREE.DoubleSide,
      roughness: 0.5
    });
    const sail = new THREE.Mesh(sailGeometry, sailMaterial);
    sail.position.set(0, 2.5, 0);
    sail.rotation.y = Math.PI / 2;
    sail.castShadow = true;
    this.mesh.add(sail);
    
    // Create simple cannons
    this.createCannons();
    
    // Store original color for damage effect
    this.originalColor = hullMaterial.color.clone();
    
    console.log("Basic ship created", this.mesh);
  }
  
  createCannons() {
    // Create cannon geometry
    const cannonGeometry = new THREE.CylinderGeometry(0.2, 0.2, 1, 8);
    cannonGeometry.rotateZ(Math.PI / 2);
    const cannonMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    
    // Left cannon
    this.leftCannon = new THREE.Mesh(cannonGeometry, cannonMaterial);
    this.leftCannon.position.set(-1.7, 0.5, 0);
    this.leftCannon.castShadow = true;
    this.mesh.add(this.leftCannon);
    
    // Right cannon
    this.rightCannon = new THREE.Mesh(cannonGeometry, cannonMaterial);
    this.rightCannon.position.set(1.7, 0.5, 0);
    this.rightCannon.castShadow = true;
    this.mesh.add(this.rightCannon);
    
    // Front cannon
    const frontCannonGeometry = new THREE.CylinderGeometry(0.2, 0.2, 1, 8);
    frontCannonGeometry.rotateX(Math.PI / 2);
    this.frontCannon = new THREE.Mesh(frontCannonGeometry, cannonMaterial);
    this.frontCannon.position.set(0, 0.5, -3.5);
    this.frontCannon.castShadow = true;
    this.mesh.add(this.frontCannon);
  }
  
  update(delta, inputManager = null) {
    // If we have an input manager, update based on input
    if (inputManager) {
      // If explorer is active, don't process ship controls
      if (this.game && this.game.explorer && this.game.explorer.isActive) {
        // Don't process controls when explorer is active
        // Apply deceleration to slow down gradually
        if (Math.abs(this.speed) > 0.1) {
          this.speed *= 0.95; // Slow down gradually
        } else {
          this.speed = 0; // Stop completely when slow enough
        }
      } else {
        // Normal ship control processing
        // Handle forward/backward movement
        if (inputManager.keys['w'] || inputManager.keys['ArrowUp']) {
          this.speed = Math.min(this.speed + this.acceleration * delta, this.maxSpeed);
        } else if (inputManager.keys['s'] || inputManager.keys['ArrowDown']) {
          this.speed = Math.max(this.speed - this.acceleration * delta, -this.maxSpeed / 2);
        } else {
          // Apply deceleration when no movement keys are pressed
          if (Math.abs(this.speed) > 0.1) {
            this.speed *= 0.98;
          } else {
            this.speed = 0;
      }
    }
    
    // Handle rotation
        if (inputManager.keys['a'] || inputManager.keys['ArrowLeft']) {
      this.mesh.rotation.y += this.rotationSpeed * delta;
    }
        if (inputManager.keys['d'] || inputManager.keys['ArrowRight']) {
      this.mesh.rotation.y -= this.rotationSpeed * delta;
        }
      }
    }
    
    // Update the direction based on rotation
    this.direction.set(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.mesh.rotation.y);
    
    // Calculate velocity
    this.velocity.copy(this.direction).multiplyScalar(this.speed * delta);
    
    // Update position
    this.mesh.position.add(this.velocity);
    
    // Make the ship float on water
    // Calculate wave height based on position and time
    const time = Date.now() * 0.001;
    const waveHeight = this.calculateWaveHeight(this.mesh.position.x, this.mesh.position.z, time);
    
    // Set the ship's y position to float on the water
    this.mesh.position.y = waveHeight;
    
    // Apply gentle rocking based on waves
    const pitchAmount = Math.sin(time * 0.5 + this.mesh.position.x * 0.02) * 0.05;
    const rollAmount = Math.sin(time * 0.7 + this.mesh.position.z * 0.02) * 0.05;
    
    // Apply pitch and roll while preserving yaw (y-axis rotation)
    const yawRotation = this.mesh.rotation.y;
    this.mesh.rotation.x = pitchAmount;
    this.mesh.rotation.z = rollAmount;
    this.mesh.rotation.y = yawRotation;
  }
  
  calculateWaveHeight(x, z, time) {
    // Simple wave function
    const waveHeight = 0.5;
    const waveFreq = 0.1;
    const waveSpeed = 0.5;
    
    return waveHeight * Math.sin(x * waveFreq + time * waveSpeed) * 
           Math.cos(z * waveFreq + time * waveSpeed);
  }
  
  takeDamage(damage) {
    this.health = Math.max(0, this.health - damage);
    
    // Show damage notification
    this.showNotification(`Damage taken: ${damage}`, 'warning');
    
    // Flash red
    if (this.hull && this.hull.material) {
    this.hull.material.color.setHex(0xff0000);
    
    // Revert back to original color after 200ms
    setTimeout(() => {
      this.hull.material.color.copy(this.originalColor);
    }, 200);
    }
    
    return this.health <= 0;
  }
  
  fireProjectile(side) {
    const now = Date.now();
    
    // Check if the cannon is ready to fire
    if (side === 'left' && now - this.lastFired.left < this.weaponSettings.cannon.cooldown) {
      return null;
    }
    
    if (side === 'right' && now - this.lastFired.right < this.weaponSettings.cannon.cooldown) {
      return null;
    }
    
    if (side === 'front' && now - this.lastFired.front < this.weaponSettings.cannon.cooldown) {
      return null;
    }
    
    // Update last fired time
    this.lastFired[side] = now;
    
    // Get cannon position and direction
    let position, direction;
    
    if (side === 'left') {
      position = this.getLeftCannonPosition();
      direction = new THREE.Vector3(-1, 0, 0);
      direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.mesh.rotation.y);
    } else if (side === 'right') {
      position = this.getRightCannonPosition();
      direction = new THREE.Vector3(1, 0, 0);
      direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.mesh.rotation.y);
    } else if (side === 'front') {
      position = this.getFrontCannonPosition();
      direction = new THREE.Vector3(0, 0, -1);
      direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.mesh.rotation.y);
    }
    
    // Create and return projectile
    return this.createProjectile(position, direction, false);
  }
  
  createProjectile(position, direction, isMachineGun = false) {
    return new Projectile(position, direction, this.weaponSettings.cannon.speed, this.weaponSettings.cannon.damage, false);
  }
  
  getLeftCannonPosition() {
    const position = new THREE.Vector3();
    this.leftCannon.getWorldPosition(position);
    return position;
  }
  
  getRightCannonPosition() {
    const position = new THREE.Vector3();
    this.rightCannon.getWorldPosition(position);
    return position;
  }
  
  getFrontCannonPosition() {
    const position = new THREE.Vector3();
    this.frontCannon.getWorldPosition(position);
    return position;
  }
  
  createNotificationElement() {
    this.notificationContainer = document.createElement('div');
    this.notificationContainer.id = 'notification-container';
    this.notificationContainer.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 20px;
      z-index: 9999;
      pointer-events: none;
      width: 350px;
    `;
    document.body.appendChild(this.notificationContainer);
  }
  
  showNotification(message, type = 'info') {
    // Check if we already have an active notification
    let notification = this.notificationContainer.querySelector('.game-notification');
    
    if (!notification) {
      // Create a new notification if one doesn't exist
      notification = document.createElement('div');
      notification.className = 'game-notification';
      notification.style.cssText = `
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 15px 20px;
        border-radius: 12px;
        margin-bottom: 8px;
        font-family: 'Arial', sans-serif;
        font-size: 16px;
        display: flex;
        align-items: center;
        backdrop-filter: blur(10px);
        border-left: 6px solid #9E9E9E;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
        max-width: 350px;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      `;
      this.notificationContainer.appendChild(notification);
    }

    // Update notification style based on type
    switch(type) {
      case 'warning':
        notification.style.borderLeft = '6px solid #FFC107';
        notification.style.backgroundColor = 'rgba(255, 193, 7, 0.25)';
        break;
      case 'danger':
        notification.style.borderLeft = '6px solid #f44336';
        notification.style.backgroundColor = 'rgba(244, 67, 54, 0.25)';
        break;
      case 'success':
        notification.style.borderLeft = '6px solid #4CAF50';
        notification.style.backgroundColor = 'rgba(76, 175, 80, 0.25)';
        break;
      default:
        notification.style.borderLeft = '6px solid #9E9E9E';
        notification.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
    }

    // Set the notification text
    notification.textContent = message;

    // Make sure notification is visible
    notification.style.opacity = '1';
    
    // Clear any existing timeout
    if (this.notificationTimeout) {
      clearTimeout(this.notificationTimeout);
    }

    // Set timeout to hide notification
    this.notificationTimeout = setTimeout(() => {
      notification.style.opacity = '0.3';
    }, 3000);
  }

  // Add collision detection
  handleCollision(obstacle) {
    // Slow down or stop the ship based on collision type
    if (obstacle.type === 'island') {
      // Hard collision with island - stop and push back
      this.speed = -this.speed * 0.5; // Bounce back at half speed
      
      // Apply a small push back from the obstacle
      const pushDirection = new THREE.Vector3()
        .subVectors(this.mesh.position, obstacle.position)
        .normalize();
        
      this.mesh.position.add(pushDirection.multiplyScalar(2)); // Push back by 2 units
      
      return true;
    } else if (obstacle.type === 'rock' || obstacle.type === 'buoy') {
      // Softer collision - reduce speed
      this.speed = this.speed * 0.7;
      return true;
    }
    
    return false;
  }

  // Check if ship can dock at an island
  canDockAt(island) {
    if (!island || !island.dockPosition) return false;
    
    // Check if near enough to the island's dock
    const distanceToDock = this.mesh.position.distanceTo(island.dockPosition);
    
    // Check if facing roughly toward the dock
    const dockDirection = new THREE.Vector3()
      .subVectors(island.dockPosition, this.mesh.position)
      .normalize();
      
    const shipDirection = new THREE.Vector3(0, 0, 1)
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), this.mesh.rotation.y);
      
    const dotProduct = dockDirection.dot(shipDirection);
    const isAligned = dotProduct > 0.7; // Roughly within 45 degrees
    
    return distanceToDock < 20 && isAligned;
  }

  // Dock the ship at an island
  dockAt(island) {
    if (!this.canDockAt(island)) return false;
    
    // Move ship to docking position and align with dock
    const dockingPosition = island.dockPosition.clone();
    dockingPosition.y = this.mesh.position.y; // Maintain current height
    
    // Store original position and rotation for undocking
    this.originalPosition = this.mesh.position.clone();
    this.originalRotation = this.mesh.rotation.clone();
    
    // Align with dock
    this.mesh.position.copy(dockingPosition);
    
    // Stop the ship
    this.speed = 0;
    this.isDocked = true;
    this.dockedAt = island;
    
    return true;
  }

  // Undock the ship
  undock() {
    if (!this.isDocked) return false;
    
    this.isDocked = false;
    this.dockedAt = null;
    
    // Return to original position if needed
    if (this.originalPosition) {
      // Just move slightly away from dock
      const moveDirection = new THREE.Vector3(0, 0, -5)
        .applyAxisAngle(new THREE.Vector3(0, 1, 0), this.mesh.rotation.y);
      this.mesh.position.add(moveDirection);
    }
    
    return true;
  }

  // Check if the ship is near an island
  isNearIsland(island, maxDistance = 20) {
    if (!island) return false;
    
    const distance = this.mesh.position.distanceTo(island.position);
    return distance < (island.radius + maxDistance);
  }

  // Check if ship can allow explorer to disembark
  canDisembark(island) {
    return this.isNearIsland(island) || this.isDocked;
  }
} 