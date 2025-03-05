import * as THREE from 'three';
import { Projectile } from './Projectile.js';
import { v4 as uuidv4 } from 'uuid';

export class Ship {
  constructor(inputManager = null) {
    // Ship properties
    this.speed = 0;
    this.maxSpeed = 15;
    this.acceleration = 10;
    this.rotationSpeed = 2;
    this.collisionRadius = 3.5;
    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3(0, 0, 1);
    this.inputManager = inputManager;
    
    // Create a group for the ship and its parts
    this.mesh = new THREE.Group();
    
    // Cannon cooldowns
    this.lastLeftFire = 0;
    this.lastRightFire = 0;
    this.lastFrontFire = 0;
    this.cannonCooldown = 3000; // 3 seconds for heavy cannons
    this.machineGunCooldown = 200; // 0.2 seconds for machine guns
    
    // Unique ID for this ship
    this.id = uuidv4();
    
    // Extras for detailed ship
    this.detailParts = [];
    this.machineGuns = {
      front: null,
      left: null,
      right: null
    };
  }
  
  async init() {
    // Create a detailed outrigger canoe
    await this.createShipMesh();
    
    return this;
  }
  
  async createShipMesh() {
    // Create a more detailed Polynesian outrigger canoe inspired by Moana
    
    // Main hull (more curved and detailed)
    const hullShape = new THREE.Shape();
    hullShape.moveTo(-1.5, 0);
    hullShape.bezierCurveTo(-1.5, 1, -1, 2, 0, 2);
    hullShape.bezierCurveTo(1, 2, 1.5, 1, 1.5, 0);
    
    const extrudeSettings = {
      steps: 1,
      depth: 7,
      bevelEnabled: true,
      bevelThickness: 0.2,
      bevelSize: 0.3,
      bevelSegments: 3
    };
    
    const hullGeometry = new THREE.ExtrudeGeometry(hullShape, extrudeSettings);
    hullGeometry.rotateX(Math.PI / 2);
    
    const woodTexture = new THREE.TextureLoader().load('https://cdn.jsdelivr.net/gh/mrdoob/three.js@master/examples/textures/hardwood2_diffuse.jpg');
    woodTexture.wrapS = THREE.RepeatWrapping;
    woodTexture.wrapT = THREE.RepeatWrapping;
    woodTexture.repeat.set(2, 1);
    
    const hullMaterial = new THREE.MeshStandardMaterial({ 
      map: woodTexture,
      color: 0x8B4513,
      roughness: 0.7,
      metalness: 0.1
    });
    
    this.hull = new THREE.Mesh(hullGeometry, hullMaterial);
    this.hull.position.y = 0.3;
    this.mesh.add(this.hull);
    
    // Hull decorations (carved patterns)
    const decorGeometry = new THREE.PlaneGeometry(2.8, 6);
    const decorMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x5D4037,
      roughness: 0.8,
      metalness: 0.1,
      side: THREE.DoubleSide
    });
    
    const leftDecor = new THREE.Mesh(decorGeometry, decorMaterial);
    leftDecor.position.set(-1.45, 0.7, 0);
    leftDecor.rotation.y = Math.PI / 2;
    this.mesh.add(leftDecor);
    
    const rightDecor = new THREE.Mesh(decorGeometry, decorMaterial);
    rightDecor.position.set(1.45, 0.7, 0);
    rightDecor.rotation.y = -Math.PI / 2;
    this.mesh.add(rightDecor);
    
    // Add tribal patterns to decorations using a bump map
    // (In a real implementation, you'd use a dedicated texture for this)
    
    // Outrigger (more detailed with curved connectors)
    const outriggerGeometry = new THREE.CylinderGeometry(0.4, 0.4, 5, 8);
    outriggerGeometry.rotateZ(Math.PI / 2);
    
    const outriggerMaterial = new THREE.MeshStandardMaterial({ 
      map: woodTexture,
      color: 0x8B4513
    });
    
    this.outrigger = new THREE.Mesh(outriggerGeometry, outriggerMaterial);
    this.outrigger.position.set(-3.5, 0.4, 0);
    this.mesh.add(this.outrigger);
    
    // Curved outrigger connectors
    const connectorCount = 3;
    for (let i = 0; i < connectorCount; i++) {
      const connectorGeometry = new THREE.BoxGeometry(0.2, 0.2, 3.5);
      
      // Create curved connector using multiple segments
      const connector = new THREE.Group();
      const segments = 5;
      
      for (let j = 0; j < segments; j++) {
        const segment = new THREE.Mesh(
          new THREE.BoxGeometry(0.2, 0.2, 3.5 / segments),
          outriggerMaterial
        );
        
        // Position each segment along a curve
        const angle = (j / segments) * Math.PI * 0.2; // Slight curve
        const radius = 3.5;
        segment.position.set(
          -radius * Math.sin(angle) / 2,
          0.2 * Math.sin(angle * 2),
          0
        );
        segment.rotation.z = angle;
        
        connector.add(segment);
      }
      
      // Position connector along the ship
      connector.position.set(-1.6, 0.7, -2.5 + i * 2.5);
      this.mesh.add(connector);
    }
    
    // Detailed mast
    const mastGeometry = new THREE.CylinderGeometry(0.1, 0.15, 6, 8);
    const mastMaterial = new THREE.MeshStandardMaterial({ 
      map: woodTexture,
      color: 0x8B4513, 
      roughness: 0.6
    });
    
    this.mast = new THREE.Mesh(mastGeometry, mastMaterial);
    this.mast.position.set(0, 3.5, -0.5);
    this.mast.rotation.x = Math.PI * 0.05; // Slightly tilted
    this.mesh.add(this.mast);
    
    // Add cross beam near top of mast
    const crossBeamGeometry = new THREE.CylinderGeometry(0.05, 0.05, 2, 8);
    crossBeamGeometry.rotateZ(Math.PI / 2);
    const crossBeam = new THREE.Mesh(crossBeamGeometry, mastMaterial);
    crossBeam.position.y = 5;
    this.mast.add(crossBeam);
    
    // Improved sail with cloth-like texture and ropes
    const sailGeometry = new THREE.PlaneGeometry(4, 5, 8, 8);
    
    // Modify sail vertices to make it look like it's billowing in the wind
    const positions = sailGeometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      
      // Add wave pattern to simulate cloth
      positions.setZ(i, Math.sin(y * 1.5) * 0.2 * (1 - Math.abs(x) / 2));
    }
    
    sailGeometry.computeVertexNormals();
    
    const sailMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xECEFF1,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
      roughness: 0.8
    });
    
    // Add a design to the sail
    const spiralGeometry = new THREE.RingGeometry(0.5, 1.5, 32);
    const spiralMaterial = new THREE.MeshBasicMaterial({
      color: 0xE57373,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8
    });
    
    this.sail = new THREE.Mesh(sailGeometry, sailMaterial);
    this.sail.position.set(1.5, 3, -0.5);
    this.sail.rotation.y = Math.PI / 2;
    this.mesh.add(this.sail);
    
    const sailDesign = new THREE.Mesh(spiralGeometry, spiralMaterial);
    sailDesign.position.z = 0.01;
    sailDesign.rotation.x = Math.PI / 6;
    this.sail.add(sailDesign);
    
    // Add ropes from mast to sail
    const ropeGeometry = new THREE.CylinderGeometry(0.02, 0.02, 3, 4);
    const ropeMaterial = new THREE.MeshStandardMaterial({ color: 0xD7CCC8 });
    
    const topRope = new THREE.Mesh(ropeGeometry, ropeMaterial);
    topRope.position.set(0.8, 4.8, -0.5);
    topRope.rotation.z = Math.PI / 2.5;
    this.mesh.add(topRope);
    
    const bottomRope = new THREE.Mesh(ropeGeometry, ropeMaterial);
    bottomRope.position.set(0.8, 2, -0.5);
    bottomRope.rotation.z = Math.PI / 4;
    this.mesh.add(bottomRope);
    
    // Main cannons (larger, more detailed)
    this.leftCannon = this.createCannon(true);
    this.leftCannon.position.set(-1.4, 1, -1.5);
    this.leftCannon.rotation.y = -Math.PI / 2;
    this.mesh.add(this.leftCannon);
    
    this.rightCannon = this.createCannon(true);
    this.rightCannon.position.set(1.4, 1, -1.5);
    this.rightCannon.rotation.y = Math.PI / 2;
    this.mesh.add(this.rightCannon);
    
    // Add machine guns (smaller, faster)
    this.machineGuns.left = this.createCannon(false);
    this.machineGuns.left.position.set(-1.4, 1, 0.5);
    this.machineGuns.left.rotation.y = -Math.PI / 2;
    this.mesh.add(this.machineGuns.left);
    
    this.machineGuns.right = this.createCannon(false);
    this.machineGuns.right.position.set(1.4, 1, 0.5);
    this.machineGuns.right.rotation.y = Math.PI / 2;
    this.mesh.add(this.machineGuns.right);
    
    // Front machine gun
    this.machineGuns.front = this.createCannon(false);
    this.machineGuns.front.position.set(0, 1, -3);
    this.mesh.add(this.machineGuns.front);
    
    // Add detailed deck
    const deckGeometry = new THREE.BoxGeometry(2.5, 0.2, 6);
    const deckMaterial = new THREE.MeshStandardMaterial({ 
      map: woodTexture,
      color: 0xA1887F,
      roughness: 0.6
    });
    
    const deck = new THREE.Mesh(deckGeometry, deckMaterial);
    deck.position.y = 1.2;
    this.mesh.add(deck);
    
    // Add some crates and barrels for decoration
    const crateGeometry = new THREE.BoxGeometry(0.6, 0.6, 0.6);
    const crateMaterial = new THREE.MeshStandardMaterial({ color: 0x8D6E63 });
    
    const crate1 = new THREE.Mesh(crateGeometry, crateMaterial);
    crate1.position.set(0.6, 1.5, 1.5);
    crate1.rotation.y = Math.PI * 0.2;
    this.mesh.add(crate1);
    
    const barrelGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.6, 8);
    const barrelMaterial = new THREE.MeshStandardMaterial({ color: 0x6D4C41 });
    
    const barrel1 = new THREE.Mesh(barrelGeometry, barrelMaterial);
    barrel1.position.set(-0.7, 1.5, 1.5);
    this.mesh.add(barrel1);
    
    // Add decorative flags
    const flagGeometry = new THREE.PlaneGeometry(0.6, 0.4);
    const flagMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xF44336,
      side: THREE.DoubleSide
    });
    
    const flag = new THREE.Mesh(flagGeometry, flagMaterial);
    flag.position.set(0, 6, -0.5);
    flag.rotation.y = Math.PI / 4;
    this.mast.add(flag);
    
    // Add shadow casting to all parts
    this.mesh.traverse(child => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    
    return true;
  }
  
  createCannon(isMainCannon) {
    const cannonGroup = new THREE.Group();
    
    // Canon barrel (cylindrical for main cannons, rectangular for machine guns)
    let barrelGeometry, barrelMaterial;
    
    if (isMainCannon) {
      // Main cannon (larger)
      barrelGeometry = new THREE.CylinderGeometry(0.25, 0.3, 1.5, 12);
      barrelGeometry.rotateZ(Math.PI / 2);
      barrelMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x333333,
        roughness: 0.7,
        metalness: 0.8
      });
    } else {
      // Machine gun (smaller)
      barrelGeometry = new THREE.BoxGeometry(1, 0.12, 0.12);
      barrelMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x555555,
        roughness: 0.4,
        metalness: 0.9
      });
    }
    
    const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
    barrel.position.set(0, 0, 0);
    cannonGroup.add(barrel);
    
    // Add muzzle detail
    if (isMainCannon) {
      const muzzleGeometry = new THREE.CylinderGeometry(0.32, 0.32, 0.1, 12);
      muzzleGeometry.rotateZ(Math.PI / 2);
      const muzzle = new THREE.Mesh(muzzleGeometry, barrelMaterial);
      muzzle.position.x = 0.75;
      cannonGroup.add(muzzle);
    } else {
      // Add machine gun muzzle flash (will be toggled during firing)
      const muzzleFlashGeometry = new THREE.ConeGeometry(0.1, 0.2, 8);
      muzzleFlashGeometry.rotateZ(Math.PI / 2);
      const muzzleFlashMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xFFC107,
        transparent: true,
        opacity: 0.8
      });
      
      const muzzleFlash = new THREE.Mesh(muzzleFlashGeometry, muzzleFlashMaterial);
      muzzleFlash.position.x = 0.6;
      muzzleFlash.visible = false;
      cannonGroup.add(muzzleFlash);
      
      // Store reference to toggle during firing
      cannonGroup.muzzleFlash = muzzleFlash;
    }
    
    // Cannon base 
    const baseGeometry = isMainCannon 
      ? new THREE.BoxGeometry(1, 0.5, 0.8)
      : new THREE.BoxGeometry(0.5, 0.3, 0.4);
      
    const baseMaterial = new THREE.MeshStandardMaterial({ 
      color: isMainCannon ? 0x8B4513 : 0x5D4037,
      roughness: 0.6
    });
    
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.set(isMainCannon ? 0 : 0, -0.3, 0);
    cannonGroup.add(base);
    
    // Add mounting wheels for main cannons
    if (isMainCannon) {
      for (let i = -1; i <= 1; i += 2) {
        const wheelGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.1, 12);
        const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x5D4037 });
        const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
        wheel.position.set(0, -0.3, i * 0.4);
        wheel.rotation.x = Math.PI / 2;
        cannonGroup.add(wheel);
      }
    }
    
    // Tag the cannon type for later reference
    cannonGroup.isMainCannon = isMainCannon;
    
    return cannonGroup;
  }
  
  update(delta, inputManager = null) {
    // Use provided inputManager or fallback to instance inputManager
    const input = inputManager || this.inputManager;
    if (!input) return;
    
    // Handle rotation
    if (input.isTurningLeft()) {
      this.mesh.rotation.y += this.rotationSpeed * delta;
    }
    if (input.isTurningRight()) {
      this.mesh.rotation.y -= this.rotationSpeed * delta;
    }
    
    // Update direction vector based on rotation
    this.direction.set(0, 0, 1).applyQuaternion(this.mesh.quaternion);
    
    // Handle acceleration and deceleration
    if (input.isMovingForward()) {
      this.speed = Math.min(this.speed + this.acceleration * delta, this.maxSpeed);
    } else if (input.isMovingBackward()) {
      this.speed = Math.max(this.speed - this.acceleration * delta, -this.maxSpeed / 2);
    } else {
      // Decelerate when no input
      if (this.speed > 0) {
        this.speed = Math.max(0, this.speed - this.acceleration * delta / 2);
      } else if (this.speed < 0) {
        this.speed = Math.min(0, this.speed + this.acceleration * delta / 2);
      }
    }
    
    // Update velocity based on direction and speed
    this.velocity.copy(this.direction).multiplyScalar(this.speed * delta);
    
    // Update position
    this.mesh.position.add(this.velocity);
    
    // Animate sail based on speed
    if (this.sail) {
      const sailWave = Math.sin(Date.now() / 500) * 0.1 * (this.speed / this.maxSpeed);
      this.sail.rotation.z = sailWave;
      
      // Add realistic sail billowing by modifying vertices
      if (this.sail.geometry.attributes && this.sail.geometry.attributes.position) {
        const positions = this.sail.geometry.attributes.position.array;
        const count = positions.length / 3;
        
        for (let i = 0; i < count; i++) {
          const i3 = i * 3;
          const x = positions[i3];
          const y = positions[i3 + 1];
          
          // Add dynamic billowing effect
          positions[i3 + 2] = Math.sin(y * 1.5 + Date.now() / 1000) * 0.2 * (1 - Math.abs(x) / 2) * (this.speed / this.maxSpeed);
        }
        
        this.sail.geometry.attributes.position.needsUpdate = true;
        this.sail.geometry.computeVertexNormals();
      }
    }
    
    // Add gentle bobbing on waves
    const bobHeight = Math.sin(Date.now() / 1000) * 0.15;
    this.mesh.position.y = bobHeight + 0.5;
    
    // Gentle roll based on turning
    const rollAngle = input.isTurningLeft() ? 0.15 : (input.isTurningRight() ? -0.15 : 0);
    this.mesh.rotation.z = rollAngle * (this.speed / this.maxSpeed);
    
    // Pitch based on speed
    const pitchAngle = (this.speed / this.maxSpeed) * 0.1;
    this.mesh.rotation.x = pitchAngle;
  }
  
  fireProjectile(side) {
    const now = Date.now();
    
    // Handle different weapon types
    let cannon, isMachineGun = false;
    let cooldown;
    
    if (side === 'left') {
      cannon = this.leftCannon;
      cooldown = now - this.lastLeftFire < this.cannonCooldown;
    } else if (side === 'right') {
      cannon = this.rightCannon;
      cooldown = now - this.lastRightFire < this.cannonCooldown;
    } else if (side === 'left-machine') {
      cannon = this.machineGuns.left;
      cooldown = now - this.lastLeftFire < this.machineGunCooldown;
      isMachineGun = true;
    } else if (side === 'right-machine') {
      cannon = this.machineGuns.right;
      cooldown = now - this.lastRightFire < this.machineGunCooldown;
      isMachineGun = true;
    } else if (side === 'front') {
      cannon = this.machineGuns.front;
      cooldown = now - this.lastFrontFire < this.machineGunCooldown;
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
      isMachineGun ? 0.15 : 0.3, // Size
      isMachineGun ? 40 : 30     // Speed
    );
    
    // Add random spread for machine guns
    if (isMachineGun) {
      const spread = 0.05;
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
      this.lastLeftFire = now;
    } else if (side === 'right' || side === 'right-machine') {
      this.lastRightFire = now;
    } else if (side === 'front') {
      this.lastFrontFire = now;
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
} 