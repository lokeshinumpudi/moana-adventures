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
import { Island } from './components/Island.js';
import { Explorer } from './components/Explorer.js';
import { Collectible } from './components/Collectible.js';
import { v4 as uuidv4 } from 'uuid';
import { NotificationManager } from './utils/NotificationManager.js';
import { DebugOverlay } from './utils/DebugOverlay.js';
import { PhysicsManager } from './utils/PhysicsManager.js';
import { SoundManager } from './utils/SoundManager.js';
import { AudioControls } from './components/AudioControls.js';
import { Weather } from './effects/Weather';

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

    // Initialize pickup types
    this.pickupTypes = {
      health: {
        color: 0x00ff00,
        scale: 0.8,
        effect: (player) => {
          player.health = Math.min(player.maxHealth, player.health + 25);
          this.showNotification('Health restored +25', 'powerup');
        },
      },
      ammo: {
        color: 0xffaa00,
        scale: 0.7,
        effect: (player) => {
          // Reset weapon cooldowns
          player.lastFired = {
            left: 0,
            right: 0,
            front: 0,
          };
          this.showNotification('Weapons recharged!', 'powerup');
        },
      },
      speed: {
        color: 0x00ffff,
        scale: 0.6,
        effect: (player) => {
          // Temporary speed boost
          const originalMaxSpeed = player.maxSpeed;
          player.maxSpeed *= 1.5;

          setTimeout(() => {
            player.maxSpeed = originalMaxSpeed;
          }, 10000); // 10 seconds

          this.showNotification('Speed boost activated!', 'powerup');
        },
      },
      shield: {
        color: 0x0000ff,
        scale: 0.9,
        effect: (player) => {
          // Add temporary invulnerability
          player.invulnerable = true;

          // Create shield visual effect
          if (!player.shieldEffect) {
            const shieldGeometry = new THREE.SphereGeometry(5, 16, 16);
            const shieldMaterial = new THREE.MeshBasicMaterial({
              color: 0x0088ff,
              transparent: true,
              opacity: 0.3,
            });
            player.shieldEffect = new THREE.Mesh(shieldGeometry, shieldMaterial);
            player.mesh.add(player.shieldEffect);
          } else {
            player.shieldEffect.visible = true;
          }

          setTimeout(() => {
            player.invulnerable = false;
            if (player.shieldEffect) {
              player.shieldEffect.visible = false;
            }
          }, 15000); // 15 seconds

          this.showNotification('Shield activated!', 'powerup');
        },
      },
      score: {
        color: 0xffff00,
        scale: 0.5,
        effect: (player) => {
          this.score += 100;
          this.showNotification('+100 points!', 'powerup');
        },
      },
    };

    // Replace notification and debug code with utility classes
    this.notificationManager = new NotificationManager();
    this.debugOverlay = new DebugOverlay(this);

    // Handle window resize
    window.addEventListener('resize', this.onWindowResize.bind(this));
    
    // Add keyboard shortcut for audio controls (M key)
    document.addEventListener('keydown', (e) => {
      if (e.key === 'm' || e.key === 'M') {
        if (this.audioControls) {
          this.audioControls.toggleVisibility();
        }
      }
    });

    // Debug settings
    this.debugMode = false;
    this.fpsCounter = {
      element: null,
      frames: 0,
      lastTime: 0,
      value: 0,
    };

    // Create debug overlay
    this.createDebugOverlay();

    this.explorer = null;
    this.collectibles = [];

    // Initialize physics
    this.physicsManager = new PhysicsManager();
    
    // Initialize sound manager
    this.soundManager = new SoundManager(this);
    
    // Initialize audio controls
    this.audioControls = null; // Will be initialized in init()

    // Weather system will be initialized after scene setup
    this.weather = null;
  }

  init() {
    return new Promise((resolve, reject) => {
      try {
        // Set up Three.js scene
        this.setupScene();

        // Initialize weather system after scene is set up
        this.weather = new Weather(this.scene);

        // Set up input manager first
        this.inputManager = new InputManager(this);

        // Initialize debug overlay
        this.debugOverlay = new DebugOverlay(this);

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
          
          // Initialize audio controls
          this.audioControls = new AudioControls(this);
          document.body.appendChild(this.audioControls.container);

          // Start ocean ambient sounds immediately at a higher volume for idle state
          this.soundManager.playSound('ocean_waves', { volume: 0.8, loop: true });
          console.log('Started ocean ambient sound at game initialization');

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
      1000,
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
      try {
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
            this.ship = new Ship(this.inputManager, this);
            this.ship.init().then(() => {
              this.scene.add(this.ship.mesh);

              this.character = new Character();
              this.character.init().then(() => {
                this.scene.add(this.character.mesh);
                resolve();
              });
            });
          }),

          // Create explorer for island exploration
          new Promise(resolve => {
            this.explorer = new Explorer(this);
            this.scene.add(this.explorer.mesh);
            resolve();
          }),

          // Create world - either from server data or placeholder
          new Promise((resolve, reject) => {
            try {
              if (this.worldData) {
                // Server has already provided world data, create from that
                this.createWorldFromData();
              } else {
                // Otherwise create placeholders until server data arrives
                this.createPlaceholderWorld();
              }
              resolve();
            } catch (error) {
              reject(error);
            }
          }),
        ]).then(() => {
        // All components loaded
          this.isRunning = true;
          resolve();
        }).catch(error => {
          console.error('Error creating components:', error);
          reject(error);
        });
      } catch (error) {
        console.error('Error in createComponents:', error);
        reject(error);
      }
    });
  }

  createWorldFromData() {
    if (!this.worldData) {
      console.warn('No world data available, cannot create world');
      return;
    }

    // Clear any existing world objects
    this.clearWorld();

    // Create islands from server data
    this.createIslandsFromData();

    // Create collectibles from server data
    this.createCollectiblesFromData();

    // Create obstacles from server data
    this.createObstaclesFromData();

    // Create buoys from server data
    this.createBuoysFromData();

    console.log('World created from server data');
  }

  clearWorld() {
    // Remove existing islands
    if (this.islands) {
      this.islands.forEach(island => {
        if (island.mesh) {
          this.scene.remove(island.mesh);
        }
      });
      this.islands = [];
    }

    // Remove existing collectibles
    if (this.collectibles) {
      this.collectibles.forEach(collectible => {
        if (collectible.mesh) {
          this.scene.remove(collectible.mesh);
        }
      });
      this.collectibles = [];
    }

    // Remove existing obstacles
    if (this.obstacles) {
      this.obstacles.forEach(obstacle => {
        if (obstacle.mesh) {
          this.scene.remove(obstacle.mesh);
        }
      });
      this.obstacles = [];
    }

    // Remove existing buoys
    if (this.buoys) {
      this.buoys.forEach(buoy => {
        if (buoy.mesh) {
          this.scene.remove(buoy.mesh);
        }
      });
      this.buoys = [];
    }
  }

  createIslandsFromData() {
    console.log('Creating islands from data:', this.worldData.islands);

    // Clear existing islands
    this.islands.forEach(island => {
      this.scene.remove(island.mesh);
    });
    this.islands = [];

    // Create islands from data
    this.worldData.islands.forEach(islandData => {
      const island = new Island({
        id: islandData.id,
        position: new THREE.Vector3(
          islandData.position.x,
          islandData.position.y || 0,
          islandData.position.z,
        ),
        radius: islandData.radius,
        height: islandData.height,
        vegetation: islandData.vegetation,
        dock: islandData.hasDock,
      });

      // Add to scene
      this.scene.add(island.mesh);

      // Set up physics
      if (this.physicsManager) {
        island.setupPhysics(this.physicsManager);
      }

      // Add to islands array
      this.islands.push(island);
    });

    console.log(`Created ${this.islands.length} islands`);
  }

  createCollectiblesFromData() {
    if (!this.worldData || !this.worldData.collectibles) {
      console.warn('No collectible data available');
      return;
    }

    this.collectibles = [];

    this.worldData.collectibles.forEach(collectibleData => {
      try {
        // Find the island this collectible belongs to
        const islandId = collectibleData.islandId;
        const island = this.islands.find(island => island.serverId === islandId);

        if (!island) {
          console.warn(`Could not find island ${islandId} for collectible`);
          return;
        }

        // Convert position from server format to THREE.Vector3
        const position = new THREE.Vector3(
          collectibleData.position.x,
          collectibleData.position.y,
          collectibleData.position.z,
        );

        // Create collectible
        const collectible = new Collectible({
          id: collectibleData.id,
          type: collectibleData.type,
          value: collectibleData.value,
          position: position,
          islandId: island.mesh.uuid, // Use the local mesh UUID, not the server ID
        });

        this.scene.add(collectible.mesh);
        this.collectibles.push(collectible);
      } catch (error) {
        console.error('Error creating collectible from server data:', error);
      }
    });

    console.log(`Created ${this.collectibles.length} collectibles from server data`);
  }

  createObstaclesFromData() {
    if (!this.worldData || !this.worldData.obstacles) {
      console.warn('No obstacle data available');
      return;
    }

    this.obstacles = [];

    this.worldData.obstacles.forEach(obstacleData => {
      try {
        // Convert position from server format to THREE.Vector3
        const position = new THREE.Vector3(
          obstacleData.position.x,
          obstacleData.position.y,
          obstacleData.position.z,
        );

        // Create obstacle based on type
        let obstacle;

        switch (obstacleData.type) {
        case 'rock':
          obstacle = new Obstacle({
            type: 'rock',
            position: position,
            size: obstacleData.scale * 5, // Scale * base size
            rotation: obstacleData.rotation,
          });
          break;
        case 'log':
          obstacle = new Obstacle({
            type: 'log',
            position: position,
            size: obstacleData.scale * 8, // Scale * base size
            rotation: obstacleData.rotation,
          });
          break;
        case 'buoy':
          obstacle = new Obstacle({
            type: 'buoy',
            position: position,
            size: obstacleData.scale * 3, // Scale * base size
            rotation: obstacleData.rotation,
          });
          break;
        default:
          console.warn(`Unknown obstacle type: ${obstacleData.type}`);
          return;
        }

        // Store server ID for reference
        obstacle.serverId = obstacleData.id;

        this.scene.add(obstacle.mesh);
        this.obstacles.push(obstacle);
      } catch (error) {
        console.error('Error creating obstacle from server data:', error);
      }
    });

    console.log(`Created ${this.obstacles.length} obstacles from server data`);
  }

  createBuoysFromData() {
    if (!this.worldData || !this.worldData.buoys) {
      console.warn('No buoy data available');
      return;
    }

    this.buoys = [];

    this.worldData.buoys.forEach(buoyData => {
      try {
        // Convert position from server format to THREE.Vector3
        const position = new THREE.Vector3(
          buoyData.position.x,
          buoyData.position.y,
          buoyData.position.z,
        );

        // Create buoy
        const buoy = new Buoy({
          position: position,
          order: buoyData.order,
        });

        // Store server ID for reference
        buoy.serverId = buoyData.id;

        this.scene.add(buoy.mesh);
        this.buoys.push(buoy);
      } catch (error) {
        console.error('Error creating buoy from server data:', error);
      }
    });

    console.log(`Created ${this.buoys.length} buoys from server data`);
  }

  createPlaceholderWorld() {
    console.log('Creating placeholder world while waiting for server data');

    // Create a single island in the middle
    const island = new Island({
      position: new THREE.Vector3(0, 0, 0),
      radius: 50,
      height: 20,
      vegetation: true,
      dock: true,
    });

    this.scene.add(island.mesh);
    this.islands = [island];
  }

  // Add compatibility method for older code that might still call this
  createBuoys() {
    console.warn('createBuoys is deprecated, use createBuoysFromData instead');
    return this.createBuoysFromData();
  }

  // Add compatibility methods for other renamed methods
  createIslands() {
    console.warn('createIslands is deprecated, use createIslandsFromData instead');
    return this.createIslandsFromData();
  }

  createCollectibles() {
    console.warn('createCollectibles is deprecated, use createCollectiblesFromData instead');
    return this.createCollectiblesFromData();
  }

  createObstacles() {
    console.warn('createObstacles is deprecated, use createObstaclesFromData instead');
    return this.createObstaclesFromData();
  }

  createProjectile(position, direction, isMachineGun) {
    const projectileSettings = isMachineGun ?
      this.ship.weaponSettings.machineGun :
      this.ship.weaponSettings.cannon;

    const geometry = new THREE.SphereGeometry(projectileSettings.size, 8, 8);
    const material = new THREE.MeshBasicMaterial({
      color: isMachineGun ? 0xFFC107 : 0x333333,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);

    // If direction is a Vector3, use it directly, otherwise multiply by speed
    const velocity = direction instanceof THREE.Vector3 ? 
      direction.clone() : 
      direction.clone().multiplyScalar(projectileSettings.speed);

    return {
      mesh,
      velocity,
      creationTime: Date.now(),
      damage: projectileSettings.damage,
      isMachineGun,
      isOpponent: false,
      update(delta) {
        this.velocity.y -= 9.8 * delta;
        this.mesh.position.add(this.velocity.clone().multiplyScalar(delta));
      },
    };
  }

  fireProjectile(side) {
    // Play loading sound when attempting to fire (even if on cooldown)
    if (this.soundManager) {
      this.soundManager.playEventSound('cannon_load', { volume: 0.6 });
    }
    
    // Delegate to ship's fireProjectile method which handles cooldowns
    const projectileData = this.ship.fireProjectile(side);

    // If cooldown hasn't elapsed, ship returns null
    if (!projectileData) return null;
    
    // Play firing sound
    if (this.soundManager) {
      this.soundManager.playEventSound('cannon_fire', { 
        volume: 0.8,
        pitch: 0.9 + Math.random() * 0.2 // Slight random pitch variation
      });
    }

    // Create and add projectile using the data from ship
    const projectile = this.createProjectile(
      projectileData.position,
      projectileData.direction,
      false,
    );

    // Add unique ID
    projectile.id = uuidv4();

    // Add to projectiles array
    this.projectiles.push(projectile);

    // Add to scene
    this.scene.add(projectile.mesh);

    // Add visual effect
    if (this.particleSystem) {
      this.particleSystem.createCannonFire(projectileData.position);
    }

    // Add sound effect
    if (this.audioManager) {
      this.audioManager.playSound('cannon', 0.7);
    }

    // Notify SocketManager about the projectile
    if (this.socketManager) {
      const projectileNetData = {
        id: projectile.id,
        position: projectile.mesh.position.clone(),
        velocity: projectile.velocity.clone(),
        type: 'cannon',
        hasShipMomentum: projectileData.hasShipMomentum
      };
      this.socketManager.sendProjectileFired(projectileNetData);
    }

    return projectile;
  }

  fireMachineGun(side) {
    // Delegate to ship's fireMachineGun method which handles cooldowns
    const projectileData = this.ship.fireMachineGun(side);

    // If cooldown hasn't elapsed, ship returns null
    if (!projectileData) return null;

    // Create and add projectile using the data from ship
    const projectile = this.createProjectile(
      projectileData.position,
      projectileData.direction,
      true, // true for machine gun
    );

    // Add unique ID
    projectile.id = uuidv4();

    // Add to projectiles array
    this.projectiles.push(projectile);

    // Add to scene
    this.scene.add(projectile.mesh);

    // Add visual effect
    if (this.particleSystem) {
      this.particleSystem.createMuzzleFlash(projectileData.position);
    }

    // Add sound effect
    if (this.audioManager) {
      this.audioManager.playSound('machineGun', 0.3);
    }

    // Notify SocketManager about the projectile
    if (this.socketManager) {
      const projectileNetData = {
        id: projectile.id,
        position: projectile.mesh.position.clone(),
        velocity: projectile.velocity.clone(),
        type: 'machineGun',
      };
      this.socketManager.sendProjectileFired(projectileNetData);
    }

    return projectile;
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

        // Remove from array
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
              damage: projectile.damage || 10,
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
    return {
      ship: this.ship ? {
        position: this.ship.mesh.position.clone(),
        rotation: this.ship.mesh.rotation.clone(),
        speed: this.ship.speed,
        direction: this.ship.direction.clone(),
        health: this.ship.health,
        maxHealth: this.ship.maxHealth,
      } : null,
      score: this.score,
      kills: this.kills,
      projectiles: this.projectiles.map(p => ({
        id: p.id,
        position: p.mesh.position.clone(),
        velocity: p.velocity.clone(),
        type: p.isMachineGun ? 'machineGun' : 'cannon',
      })),
    };
  }

  start() {
    this.isRunning = true;

    // Remove all loading screens
    const loadingScreen = document.querySelector('#loading-screen');
    if (loadingScreen) {
      loadingScreen.remove();
    }

    // Also check for manually created loading screens
    const manualLoadingScreens = document.querySelectorAll('div[id="loading-screen"]');
    manualLoadingScreens.forEach(screen => screen.remove());

    // Ensure ship is visible
    if (this.ship) {
      this.ship.mesh.visible = true;
      console.log('Ship starting position:', this.ship.mesh.position);
    }

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
    
    // Update sound system
    if (this.soundManager) {
      this.soundManager.update(1/60); // Default to 60fps if no delta time available
    }

    // Calculate delta time
    const now = Date.now();
    const delta = (now - this.lastTime) / 1000;
    this.lastTime = now;

    // Update controls
    if (this.controls) {
      this.controls.update();
    }

    // Update FPS counter
    if (this.debugMode) {
      this.updateDebugInfo(now, delta);
    }

    // Update game state
    this.update(delta);

    // Update weather system
    if (this.weather) {
      this.weather.update();
    }

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
    if (!this.isRunning) return;

    // Calculate current time for wave effects
    const time = Date.now() * 0.001;

    // Update ship and check for island collisions
    if (this.ship && !this.ship.isDocked) {
      // Original ship update
      this.ship.update(delta, this.inputManager);

      // Check for collisions with islands
      if (this.islands) {
        for (const island of this.islands) {
          if (island.checkCollision(this.ship.mesh.position, this.ship.collisionRadius)) {
            // Handle collision - slows or stops the ship
            this.ship.handleCollision({
              type: 'island',
              position: island.position,
            });

            // Show notification first time the player hits an island
            if (!this.shownIslandCollisionHint) {
              this.showNotification('You\'ve hit an island! Navigate around or dock at the pier.', 'info');
              this.shownIslandCollisionHint = true;
            }

            break; // Only handle one collision at a time
          }
        }

        // Check if near dock and show notification
        if (this.inputManager.keys['f'] && !this.explorer.isActive) {
          for (const island of this.islands) {
            if (this.ship.canDisembark(island)) {
              // Show disembark hint the first time
              if (!this.shownDisembarkHint) {
                this.showNotification('Press \'F\' to disembark and explore the island', 'info');
                this.shownDisembarkHint = true;
                setTimeout(() => this.shownDisembarkHint = false, 5000);
              }

              // Disembark to island
              this.explorer.spawn(
                this.ship.mesh.position.clone(),
                this.ship.mesh.rotation.clone(),
                island,
              );
              break;
            }
          }
        }
      }

      // Ensure ship is at the proper height on the water
      if (this.ship.mesh.position.y < 0.5) {
        const waveHeight = this.ship.calculateWaveHeight(
          this.ship.mesh.position.x,
          this.ship.mesh.position.z,
          time,
        );
        this.ship.mesh.position.y = waveHeight;
      }
    }

    // Update explorer if active
    if (this.explorer && this.explorer.isActive) {
      this.explorer.update(delta, this.inputManager);
    }

    // Update collectibles
    if (this.collectibles) {
      this.collectibles.forEach(collectible => {
        collectible.update(delta, time);
      });
    }

    // Update ocean
    if (this.ocean) {
      this.ocean.update(delta);
    }

    // Update character
    if (this.character) {
      this.character.update(delta);
    }

    // Update islands
    if (this.islands) {
      this.islands.forEach(island => {
        island.update(delta, time);
      });
    }

    // Update pickups
    this.checkPickupCollisions();

    // Update projectiles
    this.updateProjectiles(delta);

    // Update particle system
    if (this.particleSystem) {
      this.particleSystem.update(delta);
    }

    // Update buoys
    this.buoys.forEach(buoy => {
      buoy.update(delta);
    });

    // Update obstacles
    this.obstacles.forEach(obstacle => {
      obstacle.update(delta);
    });

    // Check for collisions
    const now = Date.now();
    if (now - this.lastCollisionCheckTime > this.collisionCheckInterval) {
      this.checkCollisions();
      this.checkPickupCollisions();
      this.lastCollisionCheckTime = now;
    }

    // Update camera
    this.updateCamera(delta);

    // Update multiplayer - this now only handles sending state and updating other players
    if (this.socketManager) {
      this.socketManager.update(delta);
    }

    // Update HUD
    if (this.hud) {
      this.hud.update({
        health: this.ship ? this.ship.health : 0,
        maxHealth: this.ship ? this.ship.maxHealth : 100,
        score: this.score,
        kills: this.kills,
        speed: this.ship ? Math.abs(this.ship.speed) : 0,
        maxSpeed: this.ship ? this.ship.maxSpeed : 100,
        weaponCooldowns: this.ship ? {
          leftCannon: Date.now() - this.ship.lastFired.left,
          rightCannon: Date.now() - this.ship.lastFired.right,
          frontCannon: Date.now() - this.ship.lastFired.front,
        } : null,
        playersOnline: this.socketManager ? this.socketManager.otherPlayers.size +1 : 0,
      });
    }

    // Update physics
    if (this.physicsManager) {
      this.physicsManager.update(delta);
    }

    // Update debug overlay
    if (this.debugOverlay) {
      this.debugOverlay.update(now, delta);
    }
  }

  updateCamera(delta) {
    if (!this.ship || !this.controls) return;

    // Get ship position
    const shipPosition = this.ship.mesh.position.clone();

    // Calculate camera target position (behind and slightly above ship)
    const cameraTargetPosition = shipPosition.clone();
    cameraTargetPosition.y += 8; // Height above ship

    // Calculate position behind the ship based on its rotation
    const shipRotation = this.ship.mesh.rotation.y;
    const distance = 20;
    cameraTargetPosition.x -= Math.sin(shipRotation) * distance;
    cameraTargetPosition.z -= Math.cos(shipRotation) * distance;

    // Smoothly interpolate camera position
    this.camera.position.lerp(cameraTargetPosition, delta * 1.5);

    // Look at the ship
    this.controls.target.copy(shipPosition);
    this.controls.update();
  }

  updateProjectiles(delta) {
    // Skip if no ship
    if (!this.ship) return;

    // Physics constants
    const gravity = 9.8;
    const maxVisibleDistance = 200;
    const playerPosition = this.ship.mesh.position;

    // Update all projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i];

      // Skip if projectile is invalid
      if (!projectile || !projectile.mesh) {
        this.projectiles.splice(i, 1);
        continue;
      }

      // Update projectile
      projectile.update(delta);

      // Check if projectile is too old or too far
      const age = (Date.now() - projectile.creationTime) / 1000;
      const distanceTraveled = projectile.distanceTraveled;

      if (age > 10 || distanceTraveled > 1000) {
        // Remove from scene
        this.scene.remove(projectile.mesh);

        // Remove from array
        this.projectiles.splice(i, 1);
        continue;
      }

      // Check if this projectile hits anything
      this.checkProjectileCollisions(projectile);
    }

    // Update other players' projectiles with same physics
    if (this.socketManager && this.socketManager.otherPlayers) {
      this.socketManager.otherPlayers.forEach(player => {
        // Skip if player has no projectiles array
        if (!player.projectiles || !Array.isArray(player.projectiles)) {
          player.projectiles = [];
          return;
        }

        for (let i = player.projectiles.length - 1; i >= 0; i--) {
          const projectile = player.projectiles[i];

          // Skip if projectile is invalid
          if (!projectile || !projectile.mesh) {
            player.projectiles.splice(i, 1);
            continue;
          }

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
          if (age > 10) {
            // Remove from scene
            this.scene.remove(projectile.mesh);

            // Remove from array
            player.projectiles.splice(i, 1);
          }
        }
      });
    }
  }

  render() {
    // Render the scene
    this.renderer.render(this.scene, this.camera);
  }

  checkPickupCollisions() {
    if (!this.ship || !this.collectibles) return;

    const shipPosition = this.ship.mesh.position.clone();
    const pickupRadius = 5; // Distance at which pickups can be collected

    // Check each collectible
    for (let i = this.collectibles.length - 1; i >= 0; i--) {
      const collectible = this.collectibles[i];

      // Skip if no mesh
      if (!collectible || !collectible.mesh) continue;

      // Calculate distance
      const distance = shipPosition.distanceTo(collectible.mesh.position);

      // Check if within pickup radius
      if (distance < pickupRadius) {
        // Handle pickup based on type
        switch (collectible.type) {
        case 'treasure':
          // Add score
          this.score += collectible.value;
          this.showNotification(`+${collectible.value} points!`, 'powerup');
          break;

        case 'gem':
          // Add score
          this.score += collectible.value * 2;
          this.showNotification(`+${collectible.value * 2} points!`, 'powerup');
          break;

        case 'fruit':
          // Restore health
          this.ship.health = Math.min(100, this.ship.health + 25);
          this.showNotification('Health restored +25', 'powerup');
          break;

        case 'wood':
          // Recharge weapons
          this.lastCannonFireTime = 0;
          this.lastMachineGunFireTime = 0;
          this.showNotification('Weapons recharged!', 'powerup');
          break;

        case 'powerup_health':
          // Full health restore
          this.ship.health = 100;
          this.showNotification('Health fully restored!', 'powerup');
          this.hud.addPowerup('health', 5000); // Visual indicator
          break;

        case 'powerup_speed':
          // Temporary speed boost
          const originalMaxSpeed = this.ship.maxSpeed;
          this.ship.maxSpeed *= 1.5;
          this.hud.addPowerup('speed', 10000); // 10 seconds

          setTimeout(() => {
            this.ship.maxSpeed = originalMaxSpeed;
          }, 10000);

          this.showNotification('Speed boost activated!', 'powerup');
          break;

        case 'powerup_shield':
          // Add temporary invulnerability
          this.ship.invulnerable = true;
          this.hud.addPowerup('shield', 15000); // 15 seconds

          // Create shield visual effect
          if (!this.ship.shieldEffect) {
            const shieldGeometry = new THREE.SphereGeometry(5, 16, 16);
            const shieldMaterial = new THREE.MeshBasicMaterial({
              color: 0x0088ff,
              transparent: true,
              opacity: 0.3,
            });
            this.ship.shieldEffect = new THREE.Mesh(shieldGeometry, shieldMaterial);
            this.ship.mesh.add(this.ship.shieldEffect);
          } else {
            this.ship.shieldEffect.visible = true;
          }

          setTimeout(() => {
            this.ship.invulnerable = false;
            if (this.ship.shieldEffect) {
              this.ship.shieldEffect.visible = false;
            }
          }, 15000);

          this.showNotification('Shield activated!', 'powerup');
          break;

        case 'powerup_weapon':
          // Temporary weapon upgrade
          this.ship.weaponPowered = true;
          this.hud.addPowerup('weapon', 20000); // 20 seconds

          // Store original weapon settings
          const originalCannonDamage = this.ship.weaponSettings.cannon.damage;
          const originalMachineGunDamage = this.ship.weaponSettings.machineGun.damage;

          // Double weapon damage
          this.ship.weaponSettings.cannon.damage *= 2;
          this.ship.weaponSettings.machineGun.damage *= 2;

          setTimeout(() => {
            this.ship.weaponPowered = false;
            this.ship.weaponSettings.cannon.damage = originalCannonDamage;
            this.ship.weaponSettings.machineGun.damage = originalMachineGunDamage;
          }, 20000);

          this.showNotification('Weapons powered up!', 'powerup');
          break;

        default:
          this.score += 10;
          this.showNotification('+10 points!', 'powerup');
        }

        // Remove collectible from scene
        this.scene.remove(collectible.mesh);

        // Remove from array
        this.collectibles.splice(i, 1);

        // Notify server about pickup
        if (this.socketManager) {
          this.socketManager.sendCollectiblePickup({
            collectibleId: collectible.id,
          });
        }

        // Add particle effect
        if (this.particleSystem) {
          this.particleSystem.createPickupEffect(collectible.mesh.position.clone());
        }
      }
    }
  }

  checkProjectileCollisions(projectile) {
    // Check for collisions with other player ships
    if (this.socketManager && this.socketManager.otherPlayers) {
      this.socketManager.otherPlayers.forEach(player => {
        if (!player.shipMesh) return;

        const playerPosition = player.shipMesh.position;
        const playerRadius = 3.5; // Default collision radius for ships

        const distance = projectile.mesh.position.distanceTo(playerPosition);

        if (distance < playerRadius) {
          // Register hit with server
          const hitData = {
            id: projectile.id,
            targetId: player.id,
            position: projectile.mesh.position.clone(),
            damage: projectile.isMachineGun ? 5 : 20,
          };

          if (this.socketManager) {
            this.socketManager.sendProjectileHit(hitData);
          }

          // Create hit effect
          if (this.particleSystem) {
            this.particleSystem.createHitEffect(projectile.mesh.position.clone(), 0xff0000);
          }

          // Remove projectile
          this.scene.remove(projectile.mesh);
          const index = this.projectiles.indexOf(projectile);
          if (index !== -1) {
            this.projectiles.splice(index, 1);
          }

          // Notify SocketManager to remove the projectile
          if (this.socketManager) {
            this.socketManager.sendProjectileRemoved(projectile.id);
          }

          return true; // Collision detected
        }
      });
    }

    // Check for collisions with obstacles
    for (const obstacle of this.obstacles) {
      if (!obstacle.checkCollision) continue;

      const obstaclePosition = obstacle.mesh.position;
      const obstacleRadius = obstacle.collisionRadius || 5;

      const distance = projectile.mesh.position.distanceTo(obstaclePosition);

      if (distance < obstacleRadius) {
        // Create explosion effect
        if (this.particleSystem) {
          this.particleSystem.createExplosion(projectile.mesh.position.clone(), 0.5);
        }

        // Remove projectile
        this.scene.remove(projectile.mesh);
        const index = this.projectiles.indexOf(projectile);
        if (index !== -1) {
          this.projectiles.splice(index, 1);
        }

        // Notify SocketManager to remove the projectile
        if (this.socketManager) {
          this.socketManager.sendProjectileRemoved(projectile.id);
        }

        return true; // Collision detected
      }
    }

    // Check for collisions with islands
    for (const island of this.islands) {
      const islandPosition = island.mesh.position;
      const islandRadius = island.radius;

      const distance = projectile.mesh.position.distanceTo(islandPosition);

      if (distance < islandRadius) {
        // Create hit effect
        if (this.particleSystem) {
          this.particleSystem.createHitEffect(projectile.mesh.position.clone(), 0x8B4513);
        }

        // Remove projectile
        this.scene.remove(projectile.mesh);
        const index = this.projectiles.indexOf(projectile);
        if (index !== -1) {
          this.projectiles.splice(index, 1);
        }

        // Notify SocketManager to remove the projectile
        if (this.socketManager) {
          this.socketManager.sendProjectileRemoved(projectile.id);
        }

        return true; // Collision detected
      }
    }

    return false; // No collision
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
        duration: 1000,
      });
    }

    // Show local notification
    this.showNotification('You respawned! Ready for action! 🚀', 'respawn');

    // Notify other players through socket
    if (this.socketManager) {
      this.socketManager.socket.emit('player_respawn', {
        id: this.socketManager.socket.id,
      });
    }
  }

  showNotification(message, type = 'info') {
    this.notificationManager.showNotification(message, type);
  }

  createDebugOverlay() {
    // No-op - handled by DebugOverlay utility
  }

  updateDebugInfo(time, delta) {
    if (!this.debug) return;

    const debugOverlay = document.getElementById('debug-overlay');
    if (!debugOverlay) return;

    // Update FPS
    const fpsElement = debugOverlay.querySelector('.debug-fps');
    if (fpsElement) {
      fpsElement.textContent = `FPS: ${Math.round(this.fps)}`;
    }

    // Update memory usage
    const memoryElement = debugOverlay.querySelector('.debug-memory');
    if (memoryElement && window.performance && window.performance.memory) {
      const memory = window.performance.memory;
      const usedMemory = Math.round(memory.usedJSHeapSize / (1024 * 1024));
      const totalMemory = Math.round(memory.jsHeapSizeLimit / (1024 * 1024));
      memoryElement.textContent = `Memory: ${usedMemory}MB / ${totalMemory}MB`;
    }

    // Update ping
    const pingElement = debugOverlay.querySelector('.debug-ping');
    if (pingElement && this.socketManager) {
      pingElement.textContent = `Ping: ${this.socketManager.lastPing}ms`;
    }

    // Update player count
    const playersElement = debugOverlay.querySelector('.debug-players');
    if (playersElement && this.socketManager) {
      const playerCount = this.socketManager.otherPlayers.size + 1; // +1 for local player
      playersElement.textContent = `Players: ${playerCount}`;
    }
  }

  createOtherPlayerShip(playerData) {
    console.log('Creating ship for player:', playerData.id);

    // Create a ship mesh
    const shipMesh = new THREE.Group();

    // Create a simple ship model
    const hullGeometry = new THREE.BoxGeometry(3, 1, 7);
    const hullMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const hull = new THREE.Mesh(hullGeometry, hullMaterial);
    hull.castShadow = true;
    hull.receiveShadow = true;
    shipMesh.add(hull);

    // Add a mast
    const mastGeometry = new THREE.CylinderGeometry(0.1, 0.1, 4, 8);
    const mastMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const mast = new THREE.Mesh(mastGeometry, mastMaterial);
    mast.position.set(0, 2.5, 0);
    mast.castShadow = true;
    shipMesh.add(mast);

    // Add a sail
    const sailGeometry = new THREE.PlaneGeometry(3, 3);
    const sailMaterial = new THREE.MeshStandardMaterial({
      color: 0xF5F5DC,
      side: THREE.DoubleSide,
    });
    const sail = new THREE.Mesh(sailGeometry, sailMaterial);
    sail.position.set(0, 2.5, 0);
    sail.rotation.y = Math.PI / 2;
    sail.castShadow = true;
    shipMesh.add(sail);

    // Add left cannon
    const cannonGeometry = new THREE.CylinderGeometry(0.2, 0.2, 1, 8);
    cannonGeometry.rotateZ(Math.PI / 2);
    const cannonMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });

    const leftCannon = new THREE.Mesh(cannonGeometry, cannonMaterial);
    leftCannon.position.set(-1.7, 0.5, 0);
    leftCannon.castShadow = true;
    shipMesh.add(leftCannon);

    // Add right cannon
    const rightCannon = new THREE.Mesh(cannonGeometry, cannonMaterial);
    rightCannon.position.set(1.7, 0.5, 0);
    rightCannon.castShadow = true;
    shipMesh.add(rightCannon);

    // Add a flag to identify the player (different color for each player)
    const flagGeometry = new THREE.BoxGeometry(0.1, 2, 1);
    const flagColor = new THREE.Color().setHSL(Math.random(), 0.8, 0.6);
    const flagMaterial = new THREE.MeshStandardMaterial({ color: flagColor });
    const flag = new THREE.Mesh(flagGeometry, flagMaterial);
    flag.position.set(0, 1.5, -2);
    shipMesh.add(flag);

    // Store the mesh in the player data
    playerData.shipMesh = shipMesh;

    // Set initial position and rotation from state
    if (playerData.state) {
      shipMesh.position.copy(playerData.state.position);
      shipMesh.rotation.copy(playerData.state.rotation);

      // Apply wave height to make the ship float on water
      if (this.ship) {
        const time = Date.now() * 0.001;
        const waveHeight = this.ship.calculateWaveHeight(
          playerData.state.position.x,
          playerData.state.position.z,
          time,
        );
        shipMesh.position.y = waveHeight;
      }
    }

    // Add to scene
    this.scene.add(shipMesh);

    return shipMesh;
  }

  updateOtherPlayerShip(playerId, state) {
    const player = this.socketManager.otherPlayers.get(playerId);
    if (!player || !player.shipMesh) return;

    // Update position and rotation
    player.shipMesh.position.copy(state.position);
    player.shipMesh.rotation.y = state.rotation.y;

    // Apply wave height for floating effect
    const time = Date.now() * 0.001;
    if (this.ship) {
      // Use the same wave height calculation as the local ship
      const waveHeight = this.ship.calculateWaveHeight(
        state.position.x,
        state.position.z,
        time,
      );
      player.shipMesh.position.y = waveHeight;

      // Apply gentle rocking based on waves
      const pitchAmount = Math.sin(time * 0.5 + state.position.x * 0.02) * 0.05;
      const rollAmount = Math.sin(time * 0.7 + state.position.z * 0.02) * 0.05;

      // Apply pitch and roll while preserving yaw rotation
      player.shipMesh.rotation.x = pitchAmount;
      player.shipMesh.rotation.z = rollAmount;
    }
  }

  removeOtherPlayerShip(playerId) {
    const player = this.socketManager.otherPlayers.get(playerId);
    if (!player) return;

    // Remove ship mesh from scene
    if (player.shipMesh) {
      this.scene.remove(player.shipMesh);
    }

    // Remove all projectiles
    if (player.projectiles) {
      player.projectiles.forEach(projectile => {
        if (projectile.mesh && projectile.mesh.parent) {
          projectile.mesh.parent.remove(projectile.mesh);
        }
      });
    }
  }

  handleOtherPlayerProjectileFire(data) {
    // Skip if this is our own projectile
    if (data.playerId === this.socketManager.socket.id) return;

    // Get the player who fired
    const player = this.socketManager.otherPlayers.get(data.playerId);
    if (!player) {
      console.warn('Player not found for projectile:', data.playerId);
      return;
    }

    // Initialize player's projectiles array if it doesn't exist
    if (!player.projectiles) {
      player.projectiles = [];
    }

    // Check if we already have this projectile
    const existingProjectile = player.projectiles.find(p => p.id === data.id);
    if (existingProjectile) {
      // Update existing projectile position and velocity
      existingProjectile.mesh.position.copy(data.position);
      existingProjectile.velocity.copy(data.velocity);
      return;
    }

    // Create position and velocity vectors
    const position = new THREE.Vector3(
      data.position.x || 0,
      data.position.y || 0,
      data.position.z || 0,
    );

    const velocity = new THREE.Vector3(
      data.velocity.x || 0,
      data.velocity.y || 0,
      data.velocity.z || 0,
    );

    // Determine direction from velocity
    const direction = velocity.clone().normalize();

    // Determine if it's a machine gun or cannonball
    const isMachineGun = data.type === 'machineGun';

    // Create projectile settings
    const projectileSettings = isMachineGun ?
      this.ship.weaponSettings.machineGun :
      this.ship.weaponSettings.cannon;

    // Create custom geometry and material for opponent projectiles
    const geometry = new THREE.SphereGeometry(projectileSettings.size, 8, 8);

    // Use different colors for opponent projectiles
    const material = new THREE.MeshBasicMaterial({
      color: isMachineGun ? 0xFF4500 : 0xFF0000, // Orange for machine gun, red for cannon
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);

    // Create projectile object
    const projectile = {
      id: data.id,
      playerId: data.playerId,
      mesh: mesh,
      velocity: velocity.clone(),
      creationTime: Date.now(),
      damage: projectileSettings.damage,
      isMachineGun,
      isOpponent: true,
      update(delta) {
        this.velocity.y -= 9.8 * delta;
        this.mesh.position.add(this.velocity.clone().multiplyScalar(delta));
      },
    };

    // Add to scene
    this.scene.add(projectile.mesh);

    // Add to player's projectiles array
    player.projectiles.push(projectile);

    // Add visual effect
    if (this.particleSystem) {
      if (isMachineGun) {
        this.particleSystem.createMuzzleFlash(position);
      } else {
        this.particleSystem.createCannonFire(position);
      }
    }
  }

  updateOtherPlayerProjectiles(playerId, projectiles) {
    const player = this.socketManager.otherPlayers.get(playerId);
    if (!player) return;

    if (!player.projectiles) {
      player.projectiles = [];
    }

    // Update existing projectiles or add new ones
    projectiles.forEach(projectileData => {
      const existingIndex = player.projectiles.findIndex(p => p.id === projectileData.id);

      if (existingIndex >= 0) {
        // Update existing projectile
        const existingProjectile = player.projectiles[existingIndex];

        // Update position and velocity
        existingProjectile.mesh.position.set(
          projectileData.position.x || 0,
          projectileData.position.y || 0,
          projectileData.position.z || 0,
        );

        existingProjectile.velocity.set(
          projectileData.velocity.x || 0,
          projectileData.velocity.y || 0,
          projectileData.velocity.z || 0,
        );
      } else {
        // Add new projectile
        this.handleOtherPlayerProjectileFire({
          id: projectileData.id,
          playerId: playerId,
          position: projectileData.position,
          velocity: projectileData.velocity,
          type: projectileData.type || 'cannon',
        });
      }
    });
  }

  handleProjectileHit(data) {
    console.log('Handling projectile hit:', data);

    // Find the projectile
    let projectile = null;
    let isLocal = false;

    // Check local projectiles
    const localIndex = this.projectiles.findIndex(p => p.id === data.id);
    if (localIndex >= 0) {
      projectile = this.projectiles[localIndex];
      isLocal = true;
    } else {
      // Check other players' projectiles
      this.socketManager.otherPlayers.forEach(player => {
        if (!player.projectiles) return;

        const index = player.projectiles.findIndex(p => p.id === data.id);
        if (index >= 0) {
          projectile = player.projectiles[index];
        }
      });
    }

    // Create explosion effect
    const hitPosition = data.position ?
      new THREE.Vector3(data.position.x, data.position.y, data.position.z) :
      (projectile ? projectile.mesh.position.clone() : null);

    if (hitPosition && this.particleSystem) {
      this.particleSystem.createExplosion(hitPosition, 1.0);
    }

    // Remove the projectile
    if (isLocal && projectile) {
      // Remove local projectile
      this.scene.remove(projectile.mesh);
      this.projectiles.splice(localIndex, 1);
    } else if (projectile) {
      // Remove from player's projectiles
      this.socketManager.otherPlayers.forEach(player => {
        if (!player.projectiles) return;

        const index = player.projectiles.findIndex(p => p.id === data.id);
        if (index >= 0) {
          const proj = player.projectiles[index];
          if (proj.mesh && proj.mesh.parent) {
            this.scene.remove(proj.mesh);
          }
          player.projectiles.splice(index, 1);
        }
      });
    }
  }

  handleProjectileRemoved(data) {
    // Handle projectile removal from all sources

    // Check local projectiles
    const localIndex = this.projectiles.findIndex(p => p.id === data.id);
    if (localIndex >= 0) {
      const projectile = this.projectiles[localIndex];
      // Remove from scene
      if (projectile.mesh && projectile.mesh.parent) {
        this.scene.remove(projectile.mesh);
      }

      // Remove from array
      this.projectiles.splice(localIndex, 1);
    }

    // Check other players' projectiles
    this.socketManager.otherPlayers.forEach(player => {
      if (!player.projectiles) return;

      const index = player.projectiles.findIndex(p => p.id === data.id);
      if (index >= 0) {
        const projectile = player.projectiles[index];
        // Remove from scene
        if (projectile.mesh && projectile.mesh.parent) {
          this.scene.remove(projectile.mesh);
        }
        // Remove from array
        player.projectiles.splice(index, 1);
      }
    });

    // Create hit effect if reason is 'hit'
    if (data.reason === 'hit' && data.hitPosition && this.particleSystem) {
      this.particleSystem.createHitEffect(
        new THREE.Vector3(data.hitPosition.x, data.hitPosition.y, data.hitPosition.z),
        data.targetId === this.socketManager.socket.id ? 0xff0000 : 0xffaa00,
      );
    }
  }

  handlePlayerHit(data) {
    // Handle being hit by a projectile
    console.log('Player hit:', data);

    // Apply damage to local ship
    const isDead = this.ship.takeDamage(data.damage);

    // Create hit effect
    if (data.position && this.particleSystem) {
      this.particleSystem.createHitEffect(
        new THREE.Vector3(data.position.x, data.position.y, data.position.z),
        0xff0000,
      );
    }

    // Handle death
    if (isDead) {
      this.showNotification('You were destroyed!', 'death');
      this.resetPlayer();
    }

    // Show who hit us
    const shooter = this.socketManager.otherPlayers.get(data.fromPlayerId);
    if (shooter) {
      this.showNotification(`Hit by ${shooter.name || 'another player'}!`, 'hit');
    }
  }

  // Add method for returning to ship
  returnToShip() {
    if (this.explorer && this.explorer.isActive) {
      const shipInfo = this.explorer.returnToShip();
      if (shipInfo) {
        // Update camera to focus on ship again
        if (this.cameraManager) {
          this.cameraManager.target = this.ship.mesh;
        }
      }
    }
  }

  handleOtherPlayerExplorer(data) {
    const player = this.socketManager.otherPlayers.get(data.playerId);
    if (!player) return;

    // Check if the player already has an explorer
    if (!player.explorer) {
      // Create an explorer for this player
      player.explorer = new Explorer(this);
      this.scene.add(player.explorer.mesh);
    }

    // Update explorer state based on data
    if (data.isActive) {
      // Explorer is active
      player.explorer.isActive = true;
      player.explorer.mesh.visible = true;

      // Update position if provided
      if (data.position) {
        player.explorer.mesh.position.set(
          data.position.x,
          data.position.y,
          data.position.z,
        );
      }

      // Update rotation if provided
      if (data.rotation) {
        player.explorer.mesh.rotation.y = data.rotation.y;
      }

      // Update island association if provided
      if (data.islandId) {
        const island = this.islands.find(island => island.id === data.islandId);
        if (island) {
          player.explorer.currentIsland = island;
        }
      }

      // Hide ship if explorer is active
      if (player.shipMesh) {
        player.shipMesh.visible = false;
      }
    } else {
      // Explorer is inactive
      player.explorer.isActive = false;
      player.explorer.mesh.visible = false;
      player.explorer.currentIsland = null;

      // Show ship if explorer is inactive
      if (player.shipMesh) {
        player.shipMesh.visible = true;
      }
    }
  }

  removeCollectible(collectibleId) {
    const index = this.collectibles.findIndex(c => c.id === collectibleId);

    if (index !== -1) {
      // Remove from scene
      const collectible = this.collectibles[index];
      if (collectible.mesh) {
        this.scene.remove(collectible.mesh);
      }

      // Remove from array
      this.collectibles.splice(index, 1);
    }
  }

  // Add this new method to handle server-provided world data
  setWorldData(data) {
    this.worldData = data;
    console.log('Setting world data from server:', data);

    // Create world components from server data
    this.createWorldFromData();
  }

  toggleDebug() {
    this.debug = !this.debug;
    
    if (this.debugOverlay) {
      this.debugOverlay.debugMode = this.debug;
      this.debugOverlay.debugContainer.style.display = this.debug ? 'block' : 'none';
    }
  }
}