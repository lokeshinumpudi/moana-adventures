import * as THREE from 'three';
import { Projectile } from './Projectile.js';
import { buildShipModel } from './ShipModel.js';
import { sailEffectiveness } from './WindIndicator.js';
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

    // Visual feel — banking on hard turns + recoil offset that decays
    this.turnInput = 0; // -1..1 smoothed
    this.bankAngle = 0; // smoothed roll target
    this.recoilOffset = 0; // local-Z (back) push that decays each tick
    this._wakeAccumulator = 0;
    this._tmpForward = new THREE.Vector3();
    this._tmpRight = new THREE.Vector3();
  }

  async init() {
    this.createBasicShip();
    return this;
  }

  createBasicShip() {
    // Stylised low-poly model — see components/ShipModel.js
    const model = buildShipModel({ hullColor: this.originalColor });
    this.mesh.add(model);

    // Wire references the rest of Ship expects
    this.hull = model.userData.hull;
    this.leftCannon = model.userData.leftCannon;
    this.rightCannon = model.userData.rightCannon;
    this.frontCannon = model.userData.frontCannon;
    this.flagPivot = model.userData.flagPivot;
    this.sailMesh = model.userData.sail;
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

        // Smoothed turn input → drives both yaw and banking visual
        let rawTurn = 0;
        if (inputManager.keys['a'] || inputManager.keys['ArrowLeft']) rawTurn += 1;
        if (inputManager.keys['d'] || inputManager.keys['ArrowRight']) rawTurn -= 1;
        // Lerp toward the target so quick taps don't snap-bank
        this.turnInput += (rawTurn - this.turnInput) * Math.min(1, delta * 6);

        if (this.turnInput !== 0) {
          // Heavier ship → harder to turn at high speed
          const speedFactor = 1 - Math.min(0.4, Math.abs(this.speed) / this.maxSpeed * 0.4);
          this.mesh.rotation.y += this.turnInput * this.rotationSpeed * speedFactor * delta;
        }
      }
    }

    // Update position based on speed and direction
    if (Math.abs(this.speed) > 0.1 && !this.isDocked) {
      // Reuse vectors — see CLAUDE.md: don't allocate per frame
      this._tmpForward.set(0, 0, 1).applyAxisAngle(this._upAxis(), this.mesh.rotation.y);
      // Sail-into-the-wind = drag, downwind = boost (server-authoritative wind)
      const windEff = sailEffectiveness(this.mesh.rotation.y, this.game && this.game.wind);
      this.velocity.copy(this._tmpForward).multiplyScalar(this.speed * delta * windEff);

      // Apply recoil along the forward axis. recoilOffset is negative so
      // this nudges the ship backward; the magnitude decays each tick.
      if (Math.abs(this.recoilOffset) > 0.001) {
        this.mesh.position.addScaledVector(this._tmpForward, this.recoilOffset * delta * 8);
        this.recoilOffset *= Math.max(0, 1 - delta * 6);
      }

      this.mesh.position.add(this.velocity);
    } else if (Math.abs(this.recoilOffset) > 0.001) {
      // Allow recoil to settle even when stationary
      this._tmpForward.set(0, 0, 1).applyAxisAngle(this._upAxis(), this.mesh.rotation.y);
      this.mesh.position.addScaledVector(this._tmpForward, this.recoilOffset * delta * 8);
      this.recoilOffset *= Math.max(0, 1 - delta * 6);
    }

    // Wake spray when moving fast
    this._spawnWake(delta);

    // Update wave effect (also applies banking)
    this.updateWaveEffect(delta);
  }

  _upAxis() {
    if (!this.__upAxis) this.__upAxis = new THREE.Vector3(0, 1, 0);
    return this.__upAxis;
  }

  /**
   * Pump a small backwards-along-forward offset that decays in update().
   * Negative because we add it along the *forward* unit vector — negative
   * along forward = backward, which is what recoil should do.
   */
  applyRecoil() {
    // Choose the more-negative of (existing, -0.35) so repeated shots stack
    if (this.recoilOffset > -0.35) this.recoilOffset = -0.35;
  }

  _spawnWake(delta) {
    if (!this.game || !this.game.particleSystem || this.isDocked) return;
    const speedAbs = Math.abs(this.speed);
    if (speedAbs < this.maxSpeed * 0.25) return;

    // Throttle so we don't drown the particle pool
    this._wakeAccumulator += delta;
    const interval = 0.08; // ~12 Hz wake puffs
    if (this._wakeAccumulator < interval) return;
    this._wakeAccumulator = 0;

    // Spawn behind the ship using cached temps
    this._tmpForward.set(0, 0, 1).applyAxisAngle(this._upAxis(), this.mesh.rotation.y);
    const sternOffset = -3.5;
    const wakePos = this.mesh.position.clone()
      .addScaledVector(this._tmpForward, sternOffset);
    wakePos.y = 0.05;
    this.game.particleSystem.createWaterSplash(wakePos);
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
      direction = new THREE.Vector3(1, 0, 0);
      direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.mesh.rotation.y);
      direction.multiplyScalar(this.weaponSettings.cannon.speed);
    } else if (side === 'right') {
      position = this.getRightCannonPosition();
      direction = new THREE.Vector3(-1, 0, 0);
      direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.mesh.rotation.y);
      direction.multiplyScalar(this.weaponSettings.cannon.speed);
    } else if (side === 'front') {
      position = this.getFrontCannonPosition();
      direction = new THREE.Vector3(0, 0, 1);
      direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.mesh.rotation.y);
      direction.multiplyScalar(this.weaponSettings.cannon.speed);
      
      // Add ship's forward momentum to front projectiles
      if (this.speed !== 0) {
        const shipVelocity = new THREE.Vector3(0, 0, this.speed);
        shipVelocity.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.mesh.rotation.y);
        direction.add(shipVelocity);
      }
    }

    // Return position and direction data for Game to use
    return {
      position,
      direction,
      hasShipMomentum: side === 'front' && this.speed !== 0
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
      direction = new THREE.Vector3(1, 0, 0);
      direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.mesh.rotation.y);
    } else if (side === 'right') {
      position = this.getRightCannonPosition();
      direction = new THREE.Vector3(-1, 0, 0);
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
    const time = Date.now() * 0.001;
    const waveHeight = this.calculateWaveHeight(this.mesh.position.x, this.mesh.position.z, time);
    this.mesh.position.y = waveHeight;

    // Wave-driven pitch/roll
    const pitchAmount = Math.sin(time * 0.5 + this.mesh.position.x * 0.02) * 0.05;
    const wavePitch = Math.sin(time * 0.7 + this.mesh.position.z * 0.02) * 0.05;

    // Banking: lean into turns proportional to turn input + speed
    const targetBank = -this.turnInput * Math.min(1, Math.abs(this.speed) / this.maxSpeed) * 0.45;
    this.bankAngle += (targetBank - this.bankAngle) * Math.min(1, delta * 4);

    const yawRotation = this.mesh.rotation.y;
    this.mesh.rotation.x = pitchAmount;
    this.mesh.rotation.z = wavePitch + this.bankAngle;
    this.mesh.rotation.y = yawRotation;

    // Point the masthead flag downwind (in ship-local frame so the staff
    // stays attached to the mast). flagPivot may be undefined briefly if
    // model loading races the first frame.
    if (this.flagPivot && this.game && this.game.wind) {
      this.flagPivot.rotation.y = this.game.wind.direction - yawRotation;
    }
  }
}