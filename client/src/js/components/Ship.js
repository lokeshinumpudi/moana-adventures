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
        damage: 10,
      },
      machineGun: {
        cooldown: 500,
        speed: 50,
        size: 0.2,
        damage: 5,
      },
    };

    // Cooldown tracking
    this.lastFired = {
      left: 0,
      right: 0,
      front: 0,
    };

    this.lastMachineGunFired = {
      left: 0,
      right: 0,
      front: 0,
    };

    // Unique ID for this ship
    this.id = uuidv4();

    // Health and damage
    this.maxHealth = 100;
    this.health = 100;
    this.originalColor = new THREE.Color(0x8B4513);
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
      metalness: 0.2,
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
      roughness: 0.8,
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
      roughness: 0.5,
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

    console.log('Basic ship created', this.mesh);
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
      // If explorer is active or ship is docked, don't process ship controls
      if ((this.game && this.game.explorer && this.game.explorer.isActive) || this.isDocked) {
        // Don't process controls when explorer is active or ship is docked
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
            this.speed *= 0.95; // Slow down gradually
          } else {
            this.speed = 0; // Stop completely when slow enough
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

    // Update position based on speed and direction
    if (Math.abs(this.speed) > 0.1 && !this.isDocked) {
      // Calculate movement direction based on ship rotation
      this.direction.set(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.mesh.rotation.y);

      // Calculate velocity
      this.velocity.copy(this.direction).multiplyScalar(this.speed * delta);

      // Update position
      this.mesh.position.add(this.velocity);
    }

    // Update wave effect
    this.updateWaveEffect(delta);
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
    if (this.game) {
      this.game.showNotification(`Damage taken: ${damage}`, 'hit');
    }

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

  // Add a method to check if firing is allowed
  canFire() {
    // Cannot fire if docked or explorer is active
    return !this.isDocked && !(this.game && this.game.explorer && this.game.explorer.isActive);
  }

  fireProjectile(side) {
    // Check if firing is allowed
    if (!this.canFire()) return null;

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

    // Return position and direction data for Game to use
    return {
      position,
      direction,
    };
  }

  fireMachineGun(side) {
    // Check if firing is allowed
    if (!this.canFire()) return null;

    const now = Date.now();

    // Check if the machine gun is ready to fire
    if (side === 'left' && now - this.lastMachineGunFired.left < this.weaponSettings.machineGun.cooldown) {
      return null;
    }

    if (side === 'right' && now - this.lastMachineGunFired.right < this.weaponSettings.machineGun.cooldown) {
      return null;
    }

    if (side === 'front' && now - this.lastMachineGunFired.front < this.weaponSettings.machineGun.cooldown) {
      return null;
    }

    // Update last fired time
    this.lastMachineGunFired[side] = now;

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

    // Return position and direction data for Game to use
    return {
      position,
      direction,
    };
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

    // Get docking info
    const dockInfo = island.getDockingInfo();

    // Store original position
    this.originalPosition = this.mesh.position.clone();

    // Move to dock position
    this.mesh.position.copy(dockInfo.position);

    // Rotate to face away from dock
    const lookAtPos = new THREE.Vector3().copy(dockInfo.position).add(dockInfo.direction);
    this.mesh.lookAt(lookAtPos);

    // Set docked state
    this.isDocked = true;
    this.dockedAt = island;

    // Stop movement
    this.speed = 0;

    // Notify game if available
    if (this.game) {
      this.game.showNotification('Ship docked at island', 'info');
    }

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

  // Add wave effect to the ship
  updateWaveEffect(delta) {
    // Skip wave effect if docked
    if (this.isDocked) return;

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
}