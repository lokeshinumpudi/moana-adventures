import * as THREE from 'three';
import { Projectile } from './Projectile.js';
import { v4 as uuidv4 } from 'uuid';

export class Ship {
  constructor(inputManager = null) {
    // Ship properties
    this.speed = 0;
    this.maxSpeed = 75;
    this.acceleration = 6;
    this.rotationSpeed = 2;
    this.collisionRadius = 3.5;
    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3(0, 0, 1);
    this.inputManager = inputManager;
    
    // Create a group for the ship and its parts
    this.mesh = new THREE.Group();
    
    // Weapon settings - single source of truth
    this.weaponSettings = {
      cannon: {
        cooldown: 10,
        speed: 30,
        size: 0.3,
        damage: 10
      },
      machineGun: {
        cooldown: 10,
        speed: 50,
        size: 0.1,
        damage: 1,
        spread: 0.05
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
    
    // Extras for detailed ship
    this.detailParts = [];
    this.machineGuns = {
      front: null,
      left: null,
      right: null
    };

    // Initialize notification system
    this.notifications = [];
    this.notificationContainer = document.createElement('div');
    this.notificationContainer.id = 'notification-container';
    document.body.appendChild(this.notificationContainer);
  }
  
  async init() {
    // Create a detailed outrigger canoe
    await this.createShipMesh();
    
    return this;
  }
  
  async createShipMesh() {
    // Create a simplified ship model

    // Main hull - simple rectangular shape
    const hullGeometry = new THREE.BoxGeometry(7, 1.5, 12);
    const hullMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x8B4513, // Brown
      roughness: 0.7,
      metalness: 0.1
    });
    const hull = new THREE.Mesh(hullGeometry, hullMaterial);
    hull.position.y = 0.5;
    this.mesh.add(hull);
    
    // Add a mast
    const mastGeometry = new THREE.CylinderGeometry(0.2, 0.3, 8, 8);
    const mastMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x8B4513, // Brown
      roughness: 0.8 
    });
    const mast = new THREE.Mesh(mastGeometry, mastMaterial);
    mast.position.set(0, 4.5, 0);
    this.mesh.add(mast);
    
    // Add a sail
    const sailGeometry = new THREE.PlaneGeometry(6, 7);
    const sailMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xF5F5DC, // Beige
      side: THREE.DoubleSide,
      roughness: 0.5
    });
    const sail = new THREE.Mesh(sailGeometry, sailMaterial);
    sail.position.set(0, 4, 2);
    sail.rotation.y = Math.PI / 2;
    this.mesh.add(sail);
    
    // Add cannons
    this.createSimpleCannons();
    
    // Add a cute character
    this.addCuteCharacter();
    
    // Set up character position
    this.characterPosition = new THREE.Vector3(0, 1.7, 0);
    
    // Collision body
    this.collisionRadius = 6;
    
    // Set up health
    this.health = 100;
    
    return this.mesh;
  }
  
  addCuteCharacter() {
    // Create a cute character group
    this.character = new THREE.Group();
    
    // Body - a simple sphere with bright color
    const bodyGeometry = new THREE.SphereGeometry(0.4, 12, 12);
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x4CAF50, // Bright green
      roughness: 0.5,
      metalness: 0.2
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    this.character.add(body);
    
    // Head - slightly smaller sphere
    const headGeometry = new THREE.SphereGeometry(0.3, 12, 12);
    const headMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xFFF59D, // Light yellow
      roughness: 0.5
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 0.5;
    this.character.add(head);
    
    // Eyes
    const eyeGeometry = new THREE.SphereGeometry(0.05, 8, 8);
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.1, 0.55, 0.25);
    this.character.add(leftEye);
    
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.1, 0.55, 0.25);
    this.character.add(rightEye);
    
    // Smile
    const smileGeometry = new THREE.TorusGeometry(0.1, 0.02, 8, 10, Math.PI);
    const smileMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const smile = new THREE.Mesh(smileGeometry, smileMaterial);
    smile.position.set(0, 0.45, 0.25);
    smile.rotation.x = Math.PI / 2;
    smile.rotation.z = Math.PI;
    this.character.add(smile);
    
    // Arms
    const armGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.5, 8);
    const armMaterial = new THREE.MeshStandardMaterial({ color: 0x4CAF50 });
    
    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-0.4, 0.1, 0);
    leftArm.rotation.z = Math.PI / 3;
    this.character.add(leftArm);
    
    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(0.4, 0.1, 0);
    rightArm.rotation.z = -Math.PI / 3;
    this.character.add(rightArm);
    
    // Position the character on the ship
    this.character.position.set(0, 1.7, -2);
    this.character.rotation.y = Math.PI; // Face back of the ship
    
    this.mesh.add(this.character);
  }
  
  createSimpleCannons() {
    // Left cannon
    const leftCannonGeometry = new THREE.CylinderGeometry(0.3, 0.3, 2, 8);
    leftCannonGeometry.rotateZ(Math.PI / 2);
    const cannonMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    
    this.leftCannon = new THREE.Mesh(leftCannonGeometry, cannonMaterial);
    this.leftCannon.position.set(-3.5, 1, 0);
    this.leftCannon.rotation.y = -Math.PI / 2; // Rotate to point left
    this.mesh.add(this.leftCannon);
    
    // Right cannon
    this.rightCannon = new THREE.Mesh(leftCannonGeometry.clone(), cannonMaterial);
    this.rightCannon.position.set(3.5, 1, 0);
    this.rightCannon.rotation.y = Math.PI / 2; // Rotate to point right
    this.mesh.add(this.rightCannon);
    
    // Front cannon
    const frontCannonGeometry = new THREE.CylinderGeometry(0.2, 0.2, 1.5, 8);
    frontCannonGeometry.rotateX(Math.PI / 2);
    this.frontCannon = new THREE.Mesh(frontCannonGeometry, cannonMaterial);
    this.frontCannon.position.set(0, 1, 6);
    this.frontCannon.rotation.y = 0; // Explicitly set to face forward
    this.mesh.add(this.frontCannon);
    
    // Initialize empty machineGuns object for compatibility
    this.machineGuns = {
      left: this.leftCannon,
      right: this.rightCannon,
      front: this.frontCannon
    };
  }
  
  update(delta, inputManager = null) {
    // Use provided inputManager or the stored one
    const input = inputManager || this.inputManager;
    
    if (!input) return;
    
    // Animate the character if it exists
    if (this.character) {
      // Gentle bobbing motion
      this.character.position.y = 1.7 + Math.sin(Date.now() * 0.002) * 0.05;
      
      // Animate arms when moving
      if (input.isMovingForward() || input.isMovingBackward()) {
        const armSpeed = 2;
        this.character.children.forEach(child => {
          // Find arm meshes
          if (child.position.x === -0.4 || child.position.x === 0.4) {
            // Swing arms back and forth
            child.rotation.z = (child.position.x < 0 ? 1 : -1) * 
              (Math.PI / 3 + Math.sin(Date.now() * 0.005 * armSpeed) * 0.3);
          }
        });
      }
    }
    
    // Handle rotation
    if (input.isTurningLeft()) {
      this.mesh.rotation.y += this.rotationSpeed * delta;
    }
    if (input.isTurningRight()) {
      this.mesh.rotation.y -= this.rotationSpeed * delta;
    }
    
    // Handle forward/backward movement
    let targetSpeed = 0;
    
    if (input.isMovingForward()) {
      targetSpeed = this.maxSpeed;
    } else if (input.isMovingBackward()) {
      targetSpeed = -this.maxSpeed * 0.5; // Half speed when moving backward
    }
    
    // Smoothly interpolate current speed to target speed
    this.speed = THREE.MathUtils.lerp(this.speed, targetSpeed, this.acceleration * delta);
    
    // Apply movement
    if (Math.abs(this.speed) > 0.01) {
      // Get forward direction from ship's rotation
      const forward = new THREE.Vector3(0, 0, 1);
      forward.applyQuaternion(this.mesh.quaternion);
      
      // Update position
      this.mesh.position.x += forward.x * this.speed * delta;
      this.mesh.position.z += forward.z * this.speed * delta;
    }
    
    // Apply physics - add a little drag
    this.speed *= 0.99;
    
    // Apply rocking motion based on speed and wave height
    const pitchAmount = this.speed * 0.003; // More speed = more pitch
    const rollAmount = 0.02; // Constant roll amount
    
    // Calculate pitch and roll angles
    const time = Date.now() * 0.001;
    const pitchAngle = Math.sin(time * 0.5) * pitchAmount;
    const rollAngle = Math.sin(time * 0.7) * rollAmount;
    
    // Apply pitch and roll
    this.mesh.rotation.x = pitchAngle;
  }
  
  takeDamage(damage) {
    this.health = Math.max(0, this.health - damage);
    
    // Store original color if not already stored
    if (!this.originalColor) {
      this.originalColor = this.hull.material.color.clone();
    }
    
    // Flash red
    this.hull.material.color.setHex(0xff0000);
    
    // Revert back to original color after 200ms
    setTimeout(() => {
      this.hull.material.color.copy(this.originalColor);
    }, 200);
    
    return this.health <= 0;
  }
  
  fireProjectile(side) {
    const now = Date.now();
    
    // Handle different weapon types
    let cannon, isMachineGun = false;
    let cooldown;
    
    if (side === 'left') {
      cannon = this.leftCannon;
      cooldown = now - this.lastFired.left < this.weaponSettings.cannon.cooldown;
    } else if (side === 'right') {
      cannon = this.rightCannon;
      cooldown = now - this.lastFired.right < this.weaponSettings.cannon.cooldown;
    } else if (side === 'left-machine') {
      cannon = this.machineGuns.left;
      cooldown = now - this.lastFired.left < this.weaponSettings.machineGun.cooldown;
      isMachineGun = true;
    } else if (side === 'right-machine') {
      cannon = this.machineGuns.right;
      cooldown = now - this.lastFired.right < this.weaponSettings.machineGun.cooldown;
      isMachineGun = true;
    } else if (side === 'front') {
      cannon = this.machineGuns.front;
      cooldown = now - this.lastFired.front < this.weaponSettings.machineGun.cooldown;
      isMachineGun = true;
    }
    
    // Check cooldown
    if (cooldown) {
      return null;
    }
    
    // Get cannon position and direction
    const cannonWorldPos = new THREE.Vector3();
    cannon.getWorldPosition(cannonWorldPos);
    
    // Create direction based on cannon orientation
    let direction = new THREE.Vector3();
    
    if (side === 'left' || side === 'left-machine') {
      direction.set(-1, 0, 0);
    } else if (side === 'right' || side === 'right-machine') {
      direction.set(1, 0, 0);
    } else if (side === 'front') {
      direction.set(0, 0, -1);
    }
    
    direction.applyQuaternion(this.mesh.quaternion);
    
    // Create projectile - smaller for machine guns
    const projectile = new Projectile(
      cannonWorldPos, 
      direction, 
      isMachineGun ? this.weaponSettings.machineGun.size : this.weaponSettings.cannon.size, // Size
      isMachineGun ? this.weaponSettings.machineGun.speed : this.weaponSettings.cannon.speed     // Speed
    );
    
    // Add random spread for machine guns
    if (isMachineGun) {
      const spread = this.weaponSettings.machineGun.spread;
      projectile.velocity.x += (Math.random() - 0.5) * spread;
      projectile.velocity.y += (Math.random() - 0.5) * spread;
      projectile.velocity.z += (Math.random() - 0.5) * spread;
    }
    
    // Flash effect for machine guns
    if (isMachineGun && cannon.muzzleFlash) {
      cannon.muzzleFlash.visible = true;
      setTimeout(() => {
        cannon.muzzleFlash.visible = false;
      }, 50);
    }
    
    // Update cooldown timer
    if (side === 'left' || side === 'left-machine') {
      this.lastFired.left = now;
    } else if (side === 'right' || side === 'right-machine') {
      this.lastFired.right = now;
    } else if (side === 'front') {
      this.lastFired.front = now;
    }
    
    return projectile;
  }
  
  createProjectile() {
    // Helper method for multiplayer to create projectile without firing logic
    const position = new THREE.Vector3();
    const direction = new THREE.Vector3(1, 0, 0);
    return new Projectile(position, direction);
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
    this.machineGuns.front.getWorldPosition(position);
    return position;
  }
  
  getCharacterPosition() {
    // Return position for character to stand (near the ship's center)
    const position = new THREE.Vector3(0, 2.3, -0.5);
    position.applyMatrix4(this.mesh.matrixWorld);
    return position;
  }

  createShipModel() {
    const group = new THREE.Group();
    
    // Hull - curved outrigger canoe style
    const hullGeometry = new THREE.CylinderGeometry(1, 1.5, 8, 12);
    hullGeometry.rotateZ(Math.PI / 2);
    const hullMaterial = new THREE.MeshPhongMaterial({
      color: 0x8B4513,  // Saddle brown
      map: this.woodTexture,
      bumpMap: this.woodTexture,
      bumpScale: 0.1
    });
    const hull = new THREE.Mesh(hullGeometry, hullMaterial);
    hull.scale.set(1, 0.6, 1);
    group.add(hull);

    // Outrigger float
    const floatGeometry = new THREE.CylinderGeometry(0.3, 0.4, 6, 8);
    floatGeometry.rotateZ(Math.PI / 2);
    const float = new THREE.Mesh(floatGeometry, hullMaterial);
    float.position.set(3, 0, 0);
    float.scale.set(1, 0.4, 1);
    group.add(float);

    // Outrigger supports (curved booms)
    const boomMaterial = new THREE.MeshPhongMaterial({
      color: 0xA0522D,  // Sienna
      map: this.woodTexture
    });
    
    const createCurvedBoom = (startPos, endPos) => {
      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(startPos.x, startPos.y, startPos.z),
        new THREE.Vector3((startPos.x + endPos.x) / 2, 1, (startPos.z + endPos.z) / 2),
        new THREE.Vector3(endPos.x, endPos.y, endPos.z)
      );
      
      const points = curve.getPoints(10);
      const boomGeometry = new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(points),
        10,
        0.1,
        8,
        false
      );
      
      return new THREE.Mesh(boomGeometry, boomMaterial);
    };
    
    const frontBoom = createCurvedBoom(
      new THREE.Vector3(0, 0, 2),
      new THREE.Vector3(3, 0, 2)
    );
    const backBoom = createCurvedBoom(
      new THREE.Vector3(0, 0, -2),
      new THREE.Vector3(3, 0, -2)
    );
    
    group.add(frontBoom);
    group.add(backBoom);

    // Sail (crab claw style)
    const sailShape = new THREE.Shape();
    sailShape.moveTo(0, 0);
    sailShape.quadraticCurveTo(2, 2, 0, 4);    // Front curve
    sailShape.quadraticCurveTo(3, 2, 0, 0);    // Back curve
    
    const sailGeometry = new THREE.ShapeGeometry(sailShape);
    const sailMaterial = new THREE.MeshPhongMaterial({
      color: 0xF5DEB3,  // Wheat
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
      map: this.sailTexture
    });
    
    const sail = new THREE.Mesh(sailGeometry, sailMaterial);
    sail.position.set(-0.5, 2, 0);
    sail.rotation.y = Math.PI / 2;
    group.add(sail);

    // Decorative carvings
    const addCarving = (position, rotation) => {
      const carvingGeometry = new THREE.TorusKnotGeometry(0.2, 0.05, 64, 8);
      const carvingMaterial = new THREE.MeshPhongMaterial({
        color: 0xDEB887,  // Burlywood
        map: this.carvingTexture
      });
      const carving = new THREE.Mesh(carvingGeometry, carvingMaterial);
      carving.position.copy(position);
      carving.rotation.copy(rotation);
      return carving;
    };
    
    group.add(addCarving(
      new THREE.Vector3(0, 0.6, 3.5),
      new THREE.Euler(0, Math.PI / 2, 0)
    ));
    
    group.add(addCarving(
      new THREE.Vector3(0, 0.6, -3.5),
      new THREE.Euler(0, Math.PI / 2, 0)
    ));

    // Add weapon mounts
    this.leftGunPosition = new THREE.Vector3(-1, 0.5, 2);
    this.rightGunPosition = new THREE.Vector3(-1, 0.5, -2);
    this.frontGunPosition = new THREE.Vector3(0, 0.5, 3.5);
    
    const gunMaterial = new THREE.MeshPhongMaterial({ color: 0x808080 });
    
    const addGunMount = (position) => {
      const mount = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.2, 0.4, 8),
        gunMaterial
      );
      mount.position.copy(position);
      mount.rotation.x = Math.PI / 2;
      return mount;
    };
    
    group.add(addGunMount(this.leftGunPosition));
    group.add(addGunMount(this.rightGunPosition));
    group.add(addGunMount(this.frontGunPosition));

    return group;
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `game-notification type-${type}`;

    // Add icon
    const icon = document.createElement('span');
    icon.className = 'notification-icon';
    
    switch(type) {
      case 'join':
        icon.textContent = '👋';
        break;
      case 'death':
        icon.textContent = '💀';
        break;
      case 'hit':
        icon.textContent = '🎯';
        break;
      case 'respawn':
        icon.textContent = '✨';
        break;
      default:
        icon.textContent = 'ℹ️';
    }

    // Add message
    const text = document.createElement('span');
    text.className = 'notification-text';
    text.textContent = message;

    // Assemble notification
    notification.appendChild(icon);
    notification.appendChild(text);
    this.notificationContainer.appendChild(notification);
    this.notifications.push(notification);

    // Remove after delay
    setTimeout(() => {
      notification.classList.add('removing');
      setTimeout(() => {
        if (notification.parentNode === this.notificationContainer) {
          this.notificationContainer.removeChild(notification);
        }
        const index = this.notifications.indexOf(notification);
        if (index > -1) {
          this.notifications.splice(index, 1);
        }
      }, 300);
    }, type === 'join' || type === 'death' ? 5000 : 3000);
  }
} 