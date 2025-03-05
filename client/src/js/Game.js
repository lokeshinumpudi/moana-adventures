import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Ship } from './components/Ship.js';
import { Ocean } from './components/Ocean.js';
import { Character } from './components/Character.js';
import { InputManager } from './utils/InputManager.js';
import { SocketManager } from './SocketManager.js';
import { ParticleSystem } from './components/ParticleSystem.js';
import { Buoy } from './components/Buoy.js';
import { SkyBox } from './components/SkyBox.js';
import { Obstacle } from './components/Obstacle.js';
import { HUD } from './components/HUD.js';
import { Projectile } from './components/Projectile.js';

export class Game {
  constructor(container) {
    // Store container reference
    this.container = container;
    
    // Set up game state
    this.isRunning = false;
    this.lastTime = 0;
    this.projectiles = [];
    this.obstacles = [];
    this.buoys = [];
    
    // Player stats
    this.score = 0;
    this.kills = 0;
    
    // Set up cooldowns for firing
    this.lastCannonFireTime = 0;
    this.cannonCooldown = 10;
    this.lastMachineGunFireTime = 0;
    this.machineGunCooldown = 10;
    
    // Set up performance optimization properties
    this.lastProjectileUpdateTime = 0;
    this.collisionCheckInterval = 100;
    this.lastCollisionCheckTime = 0;

    // Initialize notification system
    this.notifications = [];
    this.notificationContainer = document.createElement('div');
    this.notificationContainer.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 20px;
      z-index: 9999;
      pointer-events: none;
      display: flex;
      flex-direction: column-reverse;
      gap: 10px;
      width: 350px;
    `;
    document.body.appendChild(this.notificationContainer);
    
    // Add bounce animation style
    const style = document.createElement('style');
    style.textContent = `
      @keyframes bounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-5px); }
      }
    `;
    document.head.appendChild(style);
    
    // Handle window resize
    window.addEventListener('resize', this.onWindowResize.bind(this));
    
  }
  
  init() {
    return new Promise((resolve, reject) => {
      try {
        // Set up Three.js scene
        this.setupScene();
        
        // Set up input manager first
        this.inputManager = new InputManager(this);
        
        // Set up socket manager for multiplayer
        this.socketManager = new SocketManager(this);
        
        // Add socket event listeners for notifications
        this.socketManager.socket.on('player:join', (data) => {
          this.showNotification(`${data.username || 'A new player'} joined the game! 🎮`, 'join');
        });

        this.socketManager.socket.on('player:death', (data) => {
          if (data.id !== this.socketManager.socket.id) {
            this.showNotification(`${data.username || 'A player'} was defeated! ⚔️`, 'death');
          }
        });

        this.socketManager.socket.on('player:respawn', (data) => {
          if (data.id !== this.socketManager.socket.id) {
            this.showNotification(`${data.username || 'A player'} respawned! 🌟`, 'respawn');
          }
        });

        // Create game components
        this.createComponents().then(() => {
          // Initialize particle system
          this.particleSystem = new ParticleSystem(this.scene);
          
          // Initialize HUD
          this.hud = new HUD(this);
          
          // Start the game loop
          this.isRunning = true;
          this.lastTime = Date.now();
          this.animate();
          
          resolve();
        });
      } catch (error) {
        reject(error);
      }
    });
  }
  
  setupScene() {
    // Create scene
    this.scene = new THREE.Scene();
    
    // Add fog for performance and aesthetic reasons
    this.scene.fog = new THREE.Fog(0x87ceeb, 70, 300);
    
    // Create camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 20, 20);
    
    // Create renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x87ceeb);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Add renderer to container
    this.container.appendChild(this.renderer.domElement);
    
    // Add lights
    this.addLights();
    
    // Add camera controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.1;
    this.controls.minDistance = 10;
    this.controls.maxDistance = 100;
  }
  
  addLights() {
    // Main directional light (sun)
    this.sunLight = new THREE.DirectionalLight(0xffffff, 1);
    this.sunLight.position.set(100, 100, 100);
    this.sunLight.castShadow = true;
    
    // Set up shadow properties
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 500;
    this.sunLight.shadow.camera.left = -100;
    this.sunLight.shadow.camera.right = 100;
    this.sunLight.shadow.camera.top = 100;
    this.sunLight.shadow.camera.bottom = -100;
    
    // Add hemisphere light for ambient lighting
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x87ceeb, 0.6);
    
    // Add lights to scene
    this.scene.add(this.sunLight);
    this.scene.add(hemiLight);
  }
  
  createComponents() {
    return new Promise((resolve, reject) => {
      Promise.all([
        // Create skybox
        new Promise(resolve => {
          this.skybox = new SkyBox();
          this.skybox.init().then(() => {
            this.scene.add(this.skybox.mesh);
            resolve();
          });
        }),
        
        // Create ocean
        new Promise(resolve => {
          this.ocean = new Ocean();
          this.ocean.init().then(() => {
            this.scene.add(this.ocean.mesh);
            resolve();
          });
        }),
        
        // Create ship and character
        new Promise(resolve => {
          this.ship = new Ship(this.inputManager);
          this.ship.init().then(() => {
            this.scene.add(this.ship.mesh);
            
            this.character = new Character();
            this.character.init().then(() => {
              this.scene.add(this.character.mesh);
              resolve();
            });
          });
        }),
        
        // Create buoys
        new Promise(resolve => {
          this.createBuoys();
          resolve();
        }),
        
        // Create obstacles
        new Promise(resolve => {
          this.createObstacles();
          resolve();
        })
      ]).then(() => {
        // All components loaded
        this.isRunning = true;
        resolve();
      }).catch(reject);
    });
  }
  
  createBuoys() {
    // Create several buoys at different positions
    const buoyPositions = [
      { x: 20, z: 20 },
      { x: -30, z: 40 },
      { x: 50, z: -20 },
      { x: -50, z: -50 },
      { x: 100, z: 0 },
      { x: 0, z: 100 },
      { x: -100, z: -100 }
    ];
    
    buoyPositions.forEach(pos => {
      const buoy = new Buoy();
      buoy.init().then(() => {
        buoy.mesh.position.set(pos.x, 0, pos.z);
        this.scene.add(buoy.mesh);
        this.buoys.push(buoy);
      });
    });
  }
  
  createObstacles() {
    // Create many more obstacles at different positions
    const obstaclePositions = [
      { x: 40, z: 40, type: 'rock' },
      { x: -60, z: 20, type: 'coral' },
      { x: 70, z: -40, type: 'island' },
      { x: -80, z: -70, type: 'wreck' },
      { x: 30, z: -90, type: 'rock' },
      { x: -40, z: 60, type: 'coral' },
      { x: 90, z: 80, type: 'wreck' },
      { x: -120, z: -20, type: 'island' },
      { x: 150, z: 30, type: 'rock' },
      { x: -30, z: -120, type: 'coral' },
      { x: 110, z: -70, type: 'rock' },
      { x: -90, z: 110, type: 'wreck' },
      // Add random obstacles in a wider area
      ...Array(15).fill().map(() => ({
        x: (Math.random() - 0.5) * 500,
        z: (Math.random() - 0.5) * 500,
        type: ['rock', 'coral', 'wreck', 'island'][Math.floor(Math.random() * 4)]
      }))
    ];
    
    obstaclePositions.forEach(pos => {
      const obstacle = new Obstacle(pos.type);
      obstacle.init().then(() => {
        obstacle.mesh.position.set(pos.x, 0, pos.z);
        // Add random rotation
        obstacle.mesh.rotation.y = Math.random() * Math.PI * 2;
        // Randomize scale slightly
        const scale = 0.8 + Math.random() * 0.4;
        obstacle.mesh.scale.set(scale, scale, scale);
        this.scene.add(obstacle.mesh);
        this.obstacles.push(obstacle);
      });
    });
    
    // Create pickups
    this.createPickups();
  }
  
  createPickupMesh(pickupData) {
    // Create anime-style pickup mesh
    const group = new THREE.Group();
    
    // Main gem shape
    const gemGeometry = new THREE.OctahedronGeometry(1, 0);
    const gemMaterial = new THREE.MeshPhongMaterial({
      color: pickupData.color,
      emissive: pickupData.emissive,
      emissiveIntensity: 0.5,
      shininess: 100,
      transparent: true,
      opacity: 0.9
    });
    
    const gem = new THREE.Mesh(gemGeometry, gemMaterial);
    gem.scale.multiplyScalar(pickupData.scale || 1.0);
    group.add(gem);

    // Add glow effect
    const glowGeometry = new THREE.OctahedronGeometry(1.2, 0);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: pickupData.emissive,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending
    });
    
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.scale.multiplyScalar(pickupData.scale || 1.0);
    group.add(glow);

    // Store pickup data
    group.userData = {
      type: pickupData.type,
      effect: pickupData.effect,
      collisionRadius: 2.0
    };

    return {
      mesh: group,
      type: pickupData.type,
      effect: pickupData.effect,
      collisionRadius: 2.0
    };
  }
  
  createPickups() {
    // Initialize pickups array
    this.pickups = [];
    
    // Enhanced pickup types with better effects
    const pickupTypes = [
      {
        type: 'health',
        color: 0xff4444,
        emissive: 0xff0000,
        scale: 1.2,
        effect: (ship) => {
          ship.health = Math.min(100, ship.health + 40);
          this.particleSystem.createHealEffect(ship.mesh.position);
        }
      },
      {
        type: 'speed',
        color: 0x44ff44,
        emissive: 0x00ff00,
        scale: 1.0,
        effect: (ship) => {
          ship.speedBoost = 2.0;
          ship.speedBoostTime = Date.now() + 15000;
          this.particleSystem.createSpeedEffect(ship.mesh.position);
        }
      },
      {
        type: 'shield',
        color: 0x4444ff,
        emissive: 0x0000ff,
        scale: 1.3,
        effect: (ship) => {
          ship.shield = 100;
          ship.shieldTime = Date.now() + 20000;
          this.particleSystem.createShieldEffect(ship.mesh.position);
        }
      },
      {
        type: 'power',
        color: 0xffff44,
        emissive: 0xffff00,
        scale: 1.1,
        effect: (ship) => {
          ship.powerBoost = 2.0;
          ship.powerBoostTime = Date.now() + 10000;
          this.particleSystem.createPowerEffect(ship.mesh.position);
        }
      }
    ];

    // Create pickups at random positions
    for (let i = 0; i < 20; i++) {
      const pickupType = pickupTypes[Math.floor(Math.random() * pickupTypes.length)];
      const position = {
        x: (Math.random() - 0.5) * 400,
        z: (Math.random() - 0.5) * 400
      };

      const pickup = this.createPickupMesh(pickupType);
      pickup.mesh.position.set(position.x, 2, position.z); // Raised higher for better visibility
      this.scene.add(pickup.mesh);
      this.pickups.push(pickup);
    }
  }
  
  createProjectile(position, direction, isMachineGun) {
    const projectileSettings = isMachineGun ? 
      this.ship.weaponSettings.machineGun : 
      this.ship.weaponSettings.cannon;

    const geometry = new THREE.SphereGeometry(projectileSettings.size, 8, 8);
    const material = new THREE.MeshBasicMaterial({ 
      color: isMachineGun ? 0xFFC107 : 0x333333
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    
    return {
      mesh,
      velocity: direction.clone().multiplyScalar(projectileSettings.speed),
      creationTime: Date.now(),
      damage: projectileSettings.damage,
      isMachineGun,
      update(delta) {
        this.velocity.y -= 9.8 * delta;
        this.mesh.position.add(this.velocity.clone().multiplyScalar(delta));
      }
    };
  }
  
  fireProjectile(side) {
    if (!this.ship) return;
    
    const now = Date.now();
    let isMachineGun = side.includes('machine');
    let cannon;
    let cooldown;
    let direction = new THREE.Vector3();
    
    switch(side) {
      case 'left':
        cannon = this.ship.leftCannon;
        cooldown = now - this.lastCannonFireTime < this.cannonCooldown;
        direction.set(-1, 0, 0); // Left direction
        break;
      case 'right':
        cannon = this.ship.rightCannon;
        cooldown = now - this.lastCannonFireTime < this.cannonCooldown;
        direction.set(1, 0, 0); // Right direction
        break;
      case 'left-machine':
        cannon = this.ship.machineGuns.left;
        cooldown = now - this.lastMachineGunFireTime < this.machineGunCooldown;
        direction.set(-1, 0, 0); // Left direction
        break;
      case 'right-machine':
        cannon = this.ship.machineGuns.right;
        cooldown = now - this.lastMachineGunFireTime < this.machineGunCooldown;
        direction.set(1, 0, 0); // Right direction
        break;
      case 'front':
        cannon = this.ship.frontCannon;
        cooldown = now - this.lastCannonFireTime < this.cannonCooldown;
        direction.set(0, 0, 1); // Forward direction
        break;
      default:
        return;
    }

    if (cooldown || !cannon) return;

    // Get cannon world position
    const startPosition = new THREE.Vector3();
    cannon.getWorldPosition(startPosition);

    // Apply ship's rotation to the direction vector
    direction.applyQuaternion(this.ship.mesh.quaternion);
    
    console.log(`Firing ${side} cannon, direction:`, direction);

    const projectile = this.createProjectile(startPosition, direction, isMachineGun);
    this.scene.add(projectile.mesh);
    this.projectiles.push(projectile);

    if (isMachineGun) {
      this.lastMachineGunFireTime = now;
    } else {
      this.lastCannonFireTime = now;
    }

    // Register with socket manager
    if (this.socketManager) {
      console.log('Firing projectile:', {
        position: startPosition,
        direction: direction,
        isMachineGun: isMachineGun
      });
      this.socketManager.fireProjectile(projectile);
    }

    return projectile;
  }
  
  fireMachineGun(side) {
    return this.fireProjectile(side + '-machine');
  }
  
  removeOldestProjectile() {
    if (this.projectiles.length > 0) {
      // Remove oldest projectile from scene and array
      const oldestProjectile = this.projectiles.shift();
      this.scene.remove(oldestProjectile.mesh);
    }
  }
  
  cleanupProjectiles() {
    const now = Date.now();
    
    // Only clean up every projectileCleanupInterval
    if (now - this.lastCleanupTime < this.projectileCleanupInterval) {
      return;
    }
    
    this.lastCleanupTime = now;
    
    // Remove projectiles that are far away or too old
    const maxDistance = 200;
    const maxAge = 10000; // 10 seconds
    
    // Check own projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i];
      
      // Remove if too far or too old
      const distance = projectile.mesh.position.distanceTo(this.ship.mesh.position);
      const age = now - projectile.createdAt;
      
      if (distance > maxDistance || age > maxAge) {
        this.scene.remove(projectile.mesh);
        this.projectiles.splice(i, 1);
      }
    }
  }
  
  checkCollisions() {
    const now = Date.now();
    
    // Increase collision check interval to reduce CPU usage
    if (now - this.lastCollisionCheck < this.collisionCheckInterval) {
      return;
    }
    
    this.lastCollisionCheck = now;
    
    // Skip collision checks if no projectiles
    if (!this.projectiles.length && !this.ship) return;
    
    // Get ship position once
    const shipPosition = this.ship.mesh.position;
    
    // Check projectile collisions with other ships
    if (this.socketManager && this.socketManager.otherPlayers.size > 0) {
      this.socketManager.otherPlayers.forEach(player => {
        if (!player.ship || !player.ship.mesh) return;
        
        // Skip collision checks for distant players
        const playerDistance = shipPosition.distanceTo(player.ship.mesh.position);
        if (playerDistance > 100) return; // Skip if too far
        
        // Check only a subset of projectiles per frame to reduce CPU load
        const maxCheckCount = Math.min(10, this.projectiles.length);
        
        // Start from a different index each time to eventually check all projectiles
        const startIndex = Math.floor(Math.random() * this.projectiles.length);
        
        for (let i = 0; i < maxCheckCount; i++) {
          const index = (startIndex + i) % this.projectiles.length;
          const projectile = this.projectiles[index];
          
          // Skip recently checked projectiles
          if (now - projectile.lastCollisionCheck < this.collisionCheckInterval * 2) {
            continue;
          }
          
          projectile.lastCollisionCheck = now;
          
          // Calculate distance between projectile and other player's ship
          const distance = projectile.mesh.position.distanceTo(player.ship.mesh.position);
          
          // If distance is less than the sum of their radii, we have a collision
          if (distance < (projectile.collisionRadius + player.ship.collisionRadius)) {
            // Create hit effect
            this.particleSystem.createHitEffect(projectile.mesh.position);
            
            // Remove projectile
            this.scene.remove(projectile.mesh);
            const projectileIndex = this.projectiles.indexOf(projectile);
            if (projectileIndex > -1) {
              this.projectiles.splice(projectileIndex, 1);
            }
            
            // Emit hit event to server
            this.socketManager.socket.emit('player:hit', {
              targetId: player.id,
              damage: projectile.damage || 10
            });
            
            // Increment score
            this.score += 10;
          }
        }
      });
    }
    
    // Check ship collisions with obstacles
    if (this.obstacles && this.obstacles.length > 0) {
      // Check only nearby obstacles to improve performance
      const maxCheckCount = Math.min(5, this.obstacles.length);
      const startIndex = Math.floor(Math.random() * this.obstacles.length);
      
      for (let i = 0; i < maxCheckCount; i++) {
        const index = (startIndex + i) % this.obstacles.length;
        const obstacle = this.obstacles[index];
        
        if (!obstacle.mesh) continue;
        
        // Skip distant obstacles
        const obstacleDistance = shipPosition.distanceTo(obstacle.mesh.position);
        if (obstacleDistance > 20) continue; // Only check obstacles within 20 units
        
        // Only check collision if we're close enough
        if (obstacleDistance < (this.ship.collisionRadius + obstacle.collisionRadius) * 1.5) {
          const distance = this.ship.mesh.position.distanceTo(obstacle.mesh.position);
          
          if (distance < (this.ship.collisionRadius + obstacle.collisionRadius)) {
            // Apply collision physics
            this.handleShipObstacleCollision(obstacle);
          }
        }
      }
    }
  }
  
  handleShipObstacleCollision(obstacle) {
    // Calculate push direction away from obstacle
    const pushDirection = new THREE.Vector3()
      .subVectors(this.ship.mesh.position, obstacle.mesh.position)
      .normalize();
      
    // Apply push force to ship
    this.ship.velocity.add(pushDirection.multiplyScalar(0.5));
    
    // Reduce ship health
    this.ship.takeDamage(5);
    
    // Create collision effect
    this.particleSystem.createCollisionEffect(this.ship.mesh.position);
  }
  
  getGameState() {
    const state = {
      ship: this.ship ? {
        position: {
          x: this.ship.mesh.position.x,
          y: this.ship.mesh.position.y,
          z: this.ship.mesh.position.z
        },
        rotation: {
          x: this.ship.mesh.rotation.x,
          y: this.ship.mesh.rotation.y,
          z: this.ship.mesh.rotation.z
        },
        velocity: this.ship.velocity,
        health: this.ship.health
      } : null
    };
    
    return state;
  }
  
  start() {
    this.isRunning = true;
    this.animate();
  }
  
  stop() {
    this.isRunning = false;
  }
  
  pause() {
    this.isPaused = true;
  }
  
  resume() {
    this.isPaused = false;
    this.lastTime = Date.now();
    this.animate();
  }
  
  onWindowResize() {
    // Update camera aspect ratio
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    
    // Update renderer size
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
  
  animate() {
    if (!this.isRunning) return;
    
    // Request next animation frame
    requestAnimationFrame(() => this.animate());
    
    // Skip if paused
    if (this.isPaused) return;
    
    // Calculate delta time
    const now = Date.now();
    const delta = (now - this.lastTime) / 1000;
    this.lastTime = now;
    
    // Update controls
    if (this.controls) {
      this.controls.update();
    }
    
    // Update game state
    this.update(delta);
    
    // Render scene
    this.render();
  }
  
  updateFpsCounter() {
    this.frames++;
    
    const now = Date.now();
    if (now - this.lastFpsUpdate > 1000) {
      const fps = Math.round((this.frames * 1000) / (now - this.lastFpsUpdate));
      this.fpsCounter.textContent = `FPS: ${fps}`;
      this.frames = 0;
      this.lastFpsUpdate = now;
    }
  }
  
  update(delta) {
    // Update player ship if available
    if (this.ship) {
      // Check if player died
      if (this.ship.health <= 0) {
        this.resetPlayer();
        return;
      }

      this.ship.update(delta, this.inputManager);
      
      // Update camera to follow ship
      this.updateCamera(delta);
    }
    
    // Update all projectiles
    this.updateProjectiles(delta);
    
    // Update particle effects
    if (this.particleSystem) {
      this.particleSystem.update(delta);
    }
    
    // Update ocean waves
    if (this.ocean) {
      this.ocean.update(delta);
    }
    
    // Update other players through socket manager
    if (this.socketManager) {
      this.socketManager.update(delta);
    }
    
    // Update HUD
    if (this.hud) {
      this.hud.update();
    }
    
    // Check for collisions at a reduced rate
    this.checkCollisions();
  }
  
  updateCamera(delta) {
    if (!this.ship || !this.controls) return;
    
    // Get ship position
    const shipPosition = this.ship.mesh.position.clone();
    
    // Calculate camera target position (behind and slightly above ship)
    const cameraTargetPosition = shipPosition.clone();
    cameraTargetPosition.y += 8; // Height above ship
    cameraTargetPosition.z -= 20; // Distance behind ship
    
    // Smoothly interpolate camera position
    this.camera.position.lerp(cameraTargetPosition, delta * 1.5);
    
    // Look at the ship
    this.controls.target.copy(shipPosition);
    this.controls.update();
  }
  
  updateProjectiles(delta) {
    const gravity = 9.8;
    const playerPosition = this.ship ? this.ship.mesh.position.clone() : new THREE.Vector3();
    const maxVisibleDistance = 150;
    
    // Update player projectiles with local physics simulation
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i];
      const age = (Date.now() - projectile.creationTime) / 1000;
      
      // Apply physics update
      projectile.update(delta);
      
      // Check if projectile is too old or out of bounds
      if (age > 10 || 
          projectile.mesh.position.y < -50 ||
          Math.abs(projectile.mesh.position.x) > 500 ||
          Math.abs(projectile.mesh.position.z) > 500) {
        
        // Remove from scene and array
        this.scene.remove(projectile.mesh);
        this.projectiles.splice(i, 1);
        continue;
      }
      
      // Check if this projectile hits anything
      this.checkProjectileCollisions(projectile);
    }
    
    // Update other players' projectiles with same physics
    this.socketManager?.otherPlayers.forEach(player => {
      for (let i = player.projectiles.length - 1; i >= 0; i--) {
        const projectile = player.projectiles[i];
        const age = (Date.now() - projectile.creationTime) / 1000;
        
        // Skip update for projectiles that are too far away
        const distanceToPlayer = projectile.mesh.position.distanceTo(playerPosition);
        if (distanceToPlayer > maxVisibleDistance) {
          continue;
        }
        
        // Apply physics update
        projectile.velocity.y -= gravity * delta;
        projectile.mesh.position.x += projectile.velocity.x * delta;
        projectile.mesh.position.y += projectile.velocity.y * delta;
        projectile.mesh.position.z += projectile.velocity.z * delta;
        
        // Check if projectile is too old
        if (age > 10 || projectile.mesh.position.y < -50) {
          this.scene.remove(projectile.mesh);
          player.projectiles.splice(i, 1);
        }
      }
    });
  }
  
  render() {
    // Render the scene
    this.renderer.render(this.scene, this.camera);
  }
  
  checkPickupCollisions() {
    if (!this.ship || !this.pickups || this.pickups.length === 0) return;
    
    const now = Date.now();
    
    // Only check every 100ms to optimize performance
    if (now - this.lastPickupCheck < 100) return;
    this.lastPickupCheck = now;
    
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const pickup = this.pickups[i];
      
      // Calculate distance between ship and pickup
      const distance = this.ship.mesh.position.distanceTo(pickup.mesh.position);
      
      // Check if ship is close enough to pickup
      if (distance < (this.ship.collisionRadius + pickup.collisionRadius)) {
        // Apply the pickup effect
        if (pickup.applyEffect) {
          pickup.applyEffect(this.ship);
        } else {
          // Fallback for basic pickups
          switch(pickup.type) {
            case 'health':
              this.ship.health = Math.min(100, this.ship.health + 25);
              break;
            case 'ammo':
              // Add ammo logic if needed
              break;
            case 'speed':
              this.ship.speedBoost = 5;
              this.ship.speedBoostTime = now + 10000;
              break;
            case 'shield':
              this.ship.shield = 100;
              this.ship.shieldTime = now + 30000;
              break;
          }
        }
        
        // Create pickup effect
        this.particleSystem.createPickupEffect(pickup.mesh.position, pickup.type);
        
        // Remove pickup from scene and array
        this.scene.remove(pickup.mesh);
        this.pickups.splice(i, 1);
        
        // Play pickup sound
        // (Add sound logic here if you have a sound system)
      }
    }
  }
  
  checkProjectileCollisions(projectile) {
    // Skip if no ship or projectile
    if (!this.ship || !projectile || !projectile.mesh) return;
    
    // Get positions
    const projectilePos = projectile.mesh.position;
    
    // Check collision with obstacles
    const obstacleHitRadius = projectile.isMachineGun ? 0.5 : 1.0;
    
    for (const obstacle of this.obstacles) {
      if (!obstacle.mesh) continue;
      
      const distance = projectilePos.distanceTo(obstacle.mesh.position);
      
      if (distance < obstacleHitRadius + obstacle.radius) {
        // Create hit effect at collision point
        if (this.particleSystem) {
          this.particleSystem.createHitEffect(projectilePos.clone());
        }
        
      
        
        // Remove the projectile
        const index = this.projectiles.indexOf(projectile);
        if (index !== -1) {
          this.scene.remove(projectile.mesh);
          this.projectiles.splice(index, 1);
        }
        
        return true;
      }
    }
    
    // We don't need to check collisions with other players here
    // The server will be authoritative about that and notify us
    
    return false;
  }
  
  resetPlayer() {
    // Reset ship position to start
    this.ship.mesh.position.set(0, 0, 0);
    this.ship.mesh.rotation.set(0, 0, 0);
    this.ship.speed = 0;
    this.ship.health = 100;
    
    // Reset score
    this.score = 0;
    
    // Create respawn effect
    if (this.particleSystem) {
      this.particleSystem.createExplosion(this.ship.mesh.position, {
        count: 30,
        color: 0x00ff00,
        size: 0.5,
        duration: 1000
      });
    }
    
    // Show local notification
    this.showNotification('You respawned! Ready for action! 🚀', 'respawn');
    
    // Notify other players through socket
    if (this.socketManager) {
      this.socketManager.socket.emit('player_respawn', {
        id: this.socketManager.socket.id
      });
    }
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 15px 20px;
      border-radius: 12px;
      margin-bottom: 8px;
      font-family: 'Arial', sans-serif;
      font-size: ${type === 'join' || type === 'death' ? '18px' : '16px'};
      transform: translateY(100%);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      align-items: center;
      backdrop-filter: blur(10px);
      border: 2px solid rgba(255, 255, 255, 0.2);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
      opacity: 0;
      max-width: 350px;
      ${type === 'join' || type === 'death' ? 'font-weight: bold;' : ''}
    `;

    // Add icon based on type
    const icon = document.createElement('span');
    icon.style.cssText = `
      margin-right: 12px;
      font-size: ${type === 'join' || type === 'death' ? '28px' : '20px'};
      animation: bounce 1s ease infinite;
      line-height: 1;
    `;
    
    switch(type) {
      case 'join':
        icon.textContent = '🎮';
        notification.style.borderLeft = '6px solid #4CAF50';
        notification.style.backgroundColor = 'rgba(76, 175, 80, 0.25)';
        break;
      case 'death':
        icon.textContent = '💀';
        notification.style.borderLeft = '6px solid #f44336';
        notification.style.backgroundColor = 'rgba(244, 67, 54, 0.25)';
        break;
      case 'respawn':
        icon.textContent = '✨';
        notification.style.borderLeft = '6px solid #2196F3';
        notification.style.backgroundColor = 'rgba(33, 150, 243, 0.25)';
        break;
      default:
        icon.textContent = 'ℹ️';
        notification.style.borderLeft = '6px solid #9E9E9E';
    }
    notification.appendChild(icon);

    const text = document.createElement('span');
    text.textContent = message;
    text.style.wordBreak = 'break-word';
    notification.appendChild(text);

    this.notificationContainer.appendChild(notification);
    this.notifications.push(notification);

    // Force a reflow to ensure the animation works
    notification.offsetHeight;

    // Trigger animation
    requestAnimationFrame(() => {
      notification.style.transform = 'translateY(0)';
      notification.style.opacity = '1';
    });

    // Remove after delay
    setTimeout(() => {
      notification.style.transform = 'translateY(100%)';
      notification.style.opacity = '0';
      setTimeout(() => {
        notification.remove();
        const index = this.notifications.indexOf(notification);
        if (index > -1) {
          this.notifications.splice(index, 1);
        }
      }, 300);
    }, type === 'join' || type === 'death' ? 5000 : 3000);
  }
} 