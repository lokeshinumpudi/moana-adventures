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
        }
      },
      ammo: {
        color: 0xffaa00,
        scale: 0.7,
        effect: (player) => {
          // Reset weapon cooldowns
          player.lastFired = {
            left: 0,
            right: 0,
            front: 0
          };
          this.showNotification('Weapons recharged!', 'powerup');
        }
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
        }
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
              opacity: 0.3
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
        }
      },
      score: {
        color: 0xffff00,
        scale: 0.5,
        effect: (player) => {
          this.score += 100;
          this.showNotification('+100 points!', 'powerup');
        }
      }
    };

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
    
    // Debug settings
    this.debugMode = false;
    this.fpsCounter = {
      element: null,
      frames: 0,
      lastTime: 0,
      value: 0
    };
    
    // Create debug overlay
    this.createDebugOverlay();

    this.explorer = null;
    this.collectibles = [];
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
          
          // Set up event listeners
          this.setupEventListeners();
          
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
        })
      ]).then(() => {
        // Set player ship reference
        this.playerShip = this.ship;
        
        // Create explorer UI
        this.createExplorerUI();
        
        // Initialize ship controls as enabled
        this.shipControlsDisabled = false;
        
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
    if (!this.worldData || !this.worldData.islands) {
      console.warn('No island data available');
      return;
    }
    
    this.islands = [];
    
    this.worldData.islands.forEach(islandData => {
      try {
        // Convert position from server format to THREE.Vector3
        const position = new THREE.Vector3(
          islandData.position.x,
          islandData.position.y,
          islandData.position.z
        );
        
        // For now, force cone type for reliability
        const islandType = 'cone';
        
        // Create island using enhanced data from server
        const island = new Island({
          position: position,
          radius: islandData.radius,
          height: islandData.height,
          type: islandType, // Force cone type for now
          baseHeight: islandData.baseHeight || 1.0,
          terrainFactor: islandData.terrainFactor || 1.2,
          beachWidth: islandData.beachWidth || 8,
          treeDensity: islandData.treeDensity || 1.0,
          maxTreeHeight: islandData.maxTreeHeight || 4.5,
          colorVariation: islandData.colorVariation || 0,
          vegetation: islandData.vegetation !== false,
          hasDock: islandData.hasDock !== false,
          dockAngle: islandData.dockAngle || 0,
          dockDirection: islandData.dockDirection || { x: 0, z: 1 },
          dockLength: islandData.dockLength || 15,
          dockWidth: islandData.dockWidth || 5
        });
        
        // Store the server ID for reference
        island.serverId = islandData.id;
        
        this.scene.add(island.mesh);
        this.islands.push(island);
      } catch (error) {
        console.error("Error creating island from server data:", error);
      }
    });
    
    console.log(`Created ${this.islands.length} islands from server data`);
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
          collectibleData.position.z
        );
        
        // Create collectible
        const collectible = new Collectible({
          id: collectibleData.id,
          type: collectibleData.type,
          value: collectibleData.value,
          position: position,
          islandId: island.mesh.uuid // Use the local mesh UUID, not the server ID
        });
        
        this.scene.add(collectible.mesh);
        this.collectibles.push(collectible);
      } catch (error) {
        console.error("Error creating collectible from server data:", error);
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
          obstacleData.position.z
        );
        
        // Create obstacle based on type
        let obstacle;
        
        switch (obstacleData.type) {
          case 'rock':
            obstacle = new Obstacle({
              type: 'rock',
              position: position,
              size: obstacleData.scale * 5, // Scale * base size
              rotation: obstacleData.rotation
            });
            break;
          case 'log':
            obstacle = new Obstacle({
              type: 'log',
              position: position,
              size: obstacleData.scale * 8, // Scale * base size
              rotation: obstacleData.rotation
            });
            break;
          case 'buoy':
            obstacle = new Obstacle({
              type: 'buoy',
              position: position,
              size: obstacleData.scale * 3, // Scale * base size
              rotation: obstacleData.rotation
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
        console.error("Error creating obstacle from server data:", error);
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
          buoyData.position.z
        );
        
        // Create buoy
        const buoy = new Buoy({
          position: position,
          order: buoyData.order
        });
        
        // Store server ID for reference
        buoy.serverId = buoyData.id;
        
        this.scene.add(buoy.mesh);
        this.buoys.push(buoy);
      } catch (error) {
        console.error("Error creating buoy from server data:", error);
      }
    });
    
    console.log(`Created ${this.buoys.length} buoys from server data`);
  }
  
  createPlaceholderWorld() {
    console.log('Creating placeholder world while waiting for server data');
    
    // Create islands with different types for variety
    const islandTypes = ['cone', 'dome', 'plateau'];
    
    // Create a main island in the middle
    const mainIsland = new Island({
      position: new THREE.Vector3(0, 0, 0),
      radius: 50,
      height: 20,
      type: 'cone', // Use cone type for now as it's most reliable
      baseHeight: 1.0,
      terrainFactor: 1.2,
      beachWidth: 10,
      treeDensity: 1.2,
      maxTreeHeight: 5,
      vegetation: true,
      hasDock: true,
      dockLength: 18,
      dockWidth: 6
    });
    
    this.scene.add(mainIsland.mesh);
    
    // Create a few smaller islands around
    const smallIslands = [];
    const islandCount = 2; // Reduced count for testing
    
    for (let i = 0; i < islandCount; i++) {
      const angle = (i / islandCount) * Math.PI * 2;
      const distance = 150 + Math.random() * 50;
      
      const position = new THREE.Vector3(
        Math.sin(angle) * distance,
        0,
        Math.cos(angle) * distance
      );
      
      // Use only cone type for now until we fix the other types
      const island = new Island({
        position: position,
        radius: 30 + Math.random() * 20,
        height: 15 + Math.random() * 10,
        type: 'cone', // Use cone type for reliability
        baseHeight: 1.0,
        terrainFactor: 1.2 + Math.random() * 0.3,
        beachWidth: 5 + Math.random() * 5,
        treeDensity: 0.8 + Math.random() * 0.4,
        maxTreeHeight: 3.5 + Math.random() * 1.5,
        vegetation: true,
        hasDock: Math.random() > 0.3,
        colorVariation: 0.1
      });
      
      this.scene.add(island.mesh);
      smallIslands.push(island);
    }
    
    this.islands = [mainIsland, ...smallIslands];
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
    // Don't fire if ship controls are disabled (explorer mode)
    if (this.shipControlsDisabled) return;
    
    // Check cooldown
    const now = Date.now();
    if (now - this.lastCannonFireTime < this.cannonCooldown) {
        return;
    }

    this.lastCannonFireTime = now;
    
    // Get cannon position based on side
    let position;
    if (side === 'left') {
      position = this.ship.getLeftCannonPosition();
    } else if (side === 'right') {
      position = this.ship.getRightCannonPosition();
    } else {
      position = this.ship.getFrontCannonPosition();
    }
    
    // Calculate direction based on ship rotation and side
    let direction = new THREE.Vector3(0, 0, 1);
    if (side === 'left') {
      direction.set(-1, 0, 0);
    } else if (side === 'right') {
      direction.set(1, 0, 0);
    }
    
    // Rotate direction based on ship rotation
    direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.ship.mesh.rotation.y);
    
    // Create and add projectile
    const projectile = this.createProjectile(position, direction, false);
    this.projectiles.push(projectile);

    // Add to scene
    this.scene.add(projectile.mesh);
    
    // Add visual effect
    if (this.particleSystem) {
      this.particleSystem.createCannonFire(position);
    }
    
    // Add sound effect
    if (this.audioManager) {
      this.audioManager.playSound('cannon', 0.7);
    }
    
    // Notify SocketManager about the projectile
    if (this.socketManager) {
      const projectileData = {
        id: projectile.id,
        position: projectile.mesh.position.clone(),
        velocity: projectile.velocity.clone(),
        type: 'cannon'
      };
      this.socketManager.sendProjectileFired(projectileData);
    }

    return projectile;
  }
  
  fireMachineGun(side) {
    // Don't fire if ship controls are disabled (explorer mode)
    if (this.shipControlsDisabled) return;
    
    // Check cooldown
    const now = Date.now();
    if (now - this.lastMachineGunFireTime < this.machineGunCooldown) {
      return;
    }
    
    this.lastMachineGunFireTime = now;
    
    // Get cannon position based on side
    let position;
    if (side === 'left') {
      position = this.ship.getLeftCannonPosition();
    } else if (side === 'right') {
      position = this.ship.getRightCannonPosition();
    } else {
      position = this.ship.getFrontCannonPosition();
    }
    
    // Calculate direction based on ship rotation and side
    let direction = new THREE.Vector3(0, 0, 1);
    if (side === 'left') {
      direction.set(-1, 0, 0);
    } else if (side === 'right') {
      direction.set(1, 0, 0);
    }
    
    // Rotate direction based on ship rotation
    direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.ship.mesh.rotation.y);
    
    // Create and add projectile
    const projectile = this.createProjectile(position, direction, true); // true for machine gun
    this.projectiles.push(projectile);
    
    // Add to scene
    this.scene.add(projectile.mesh);
    
    // Add visual effect
    if (this.particleSystem) {
      this.particleSystem.createMuzzleFlash(position);
    }
    
    // Add sound effect
    if (this.audioManager) {
      this.audioManager.playSound('machineGun', 0.3);
    }
    
    // Notify SocketManager about the projectile
    if (this.socketManager) {
      const projectileData = {
        id: projectile.id,
        position: projectile.mesh.position.clone(),
        velocity: projectile.velocity.clone(),
        type: 'machineGun'
      };
      this.socketManager.sendProjectileFired(projectileData);
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
    return {
      ship: this.ship ? {
        position: this.ship.mesh.position.clone(),
        rotation: this.ship.mesh.rotation.clone(),
        speed: this.ship.speed,
        direction: this.ship.direction.clone(),
        health: this.ship.health,
        maxHealth: this.ship.maxHealth
      } : null,
      score: this.score,
      kills: this.kills,
      projectiles: this.projectiles.map(p => ({
        id: p.id,
        position: p.mesh.position.clone(),
        velocity: p.velocity.clone(),
        type: p.isMachineGun ? 'machineGun' : 'cannon'
      }))
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
      console.log("Ship starting position:", this.ship.mesh.position);
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
              position: island.position
            });
            
            // Show notification first time the player hits an island
            if (!this.shownIslandCollisionHint) {
              this.showNotification("You've hit an island! Navigate around or dock at the pier.", 'info');
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
                this.showNotification("Press 'F' to disembark and explore the island", 'info');
                this.shownDisembarkHint = true;
                setTimeout(() => this.shownDisembarkHint = false, 5000);
              }
              
              try {
                // Dock the ship if not already docked
                if (!this.ship.isDocked) {
                  this.ship.dockAt(island);
                }
                
                // Disembark to island
                this.explorer.spawn(
                  this.ship.mesh.position.clone(),
                  this.ship.mesh.rotation.clone(),
                  island
                );
                
                // Switch camera to follow explorer
                if (this.cameraManager) {
                  console.log('Switching camera to follow explorer');
                  this.cameraManager.target = this.explorer;
                  
                  // Force camera update immediately to prevent jarring transition
                  this.cameraManager.update();
                }
              } catch (error) {
                console.error('Error spawning explorer:', error);
                this.showNotification("Couldn't disembark. Try again.", 'warning');
              }
              
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
          time
        );
        this.ship.mesh.position.y = waveHeight;
      }
    }
    
    // Update explorer if active
    if (this.explorer && this.explorer.isActive) {
      try {
        this.explorer.update(delta, this.inputManager);
        
        // Ensure camera is following explorer
        if (this.cameraManager && this.cameraManager.target !== this.explorer) {
          console.log('Correcting camera target to explorer');
          this.cameraManager.setTarget(this.explorer);
        }
      } catch (error) {
        console.error('Error updating explorer:', error);
        // Don't deactivate explorer on error - let the player continue exploring
      }
    }
    
    // Update camera
    if (this.cameraManager) {
      this.cameraManager.update(delta);
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
    
    // Update multiplayer state more frequently
    if (this.socketManager) {
      try {
        // Ensure all required objects exist before sending state
        if ((this.playerShip && this.playerShip.mesh) || 
            (this.explorer && this.explorer.isActive && this.explorer.mesh)) {
          this.socketManager.sendPlayerState();
        }
      } catch (error) {
        console.error('Error updating multiplayer state:', error);
      }
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
          frontCannon: Date.now() - this.ship.lastFired.front
        } : null
      });
    }
    
    // Handle input for explorer spawning/returning
    if (this.inputManager.isKeyPressed('e') || this.inputManager.isKeyPressed('KeyE')) {
      if (this.explorer && this.explorer.isActive) {
        // Check if explorer is near dock to return to ship
        if (this.explorer.currentIsland && 
            this.explorer.currentIsland.isNearDock(this.explorer.mesh.position)) {
          this.handleExplorerReturn();
        }
      } else if (this.playerShip) {
        // Try to spawn explorer at nearest island
        const closestIsland = this.findClosestIslandWithDock(this.playerShip.mesh.position);
        if (closestIsland) {
          this.handleExplorerSpawn();
        }
      }
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
    if (!this.ship || !this.pickups) return;
    
    const shipPosition = this.ship.mesh.position.clone();
    const pickupRadius = 3; // Range to collect pickups
    
    this.pickups.forEach((pickup, index) => {
      if (!pickup.collected) {
        const distance = shipPosition.distanceTo(pickup.mesh.position);
        
        if (distance < pickupRadius) {
          // Mark as collected
          pickup.collected = true;
          
          // Remove from scene
          this.scene.remove(pickup.mesh);
          
          // Create pickup effect
          if (this.particleSystem) {
            this.particleSystem.createPickupEffect(pickup.mesh.position.clone());
          }
          
          // Apply pickup effect based on type
          switch (pickup.type) {
            case 'health':
              this.ship.health = Math.min(this.ship.maxHealth, this.ship.health + 25);
              this.showNotification('Health restored +25', 'powerup');
              break;
              
            case 'ammo':
              // Reset weapon cooldowns
              this.ship.lastFired = {
                left: 0,
                right: 0,
                front: 0
              };
              this.showNotification('Weapons recharged!', 'powerup');
              break;
              
            case 'speed':
              // Temporary speed boost
              const originalMaxSpeed = this.ship.maxSpeed;
              this.ship.maxSpeed *= 1.5;
              this.hud.addPowerup('speed', 10000); // 10 seconds
              
              setTimeout(() => {
                this.ship.maxSpeed = originalMaxSpeed;
              }, 10000);
              
              this.showNotification('Speed boost activated!', 'powerup');
              break;
              
            case 'shield':
              // Add temporary invulnerability
              this.ship.invulnerable = true;
              this.hud.addPowerup('shield', 15000); // 15 seconds
              
              // Create shield visual effect
              if (!this.ship.shieldEffect) {
                const shieldGeometry = new THREE.SphereGeometry(5, 16, 16);
                const shieldMaterial = new THREE.MeshBasicMaterial({
                  color: 0x0088ff,
                  transparent: true,
                  opacity: 0.3
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
              
            case 'score':
              this.score += 100;
              this.showNotification('+100 points!', 'powerup');
              break;
              
            default:
              this.score += 10;
              this.showNotification('+10 points!', 'powerup');
          }
          
          // Remove from pickups array
          this.pickups.splice(index, 1);
        }
      }
    });
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
            damage: projectile.isMachineGun ? 5 : 20
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
          this.particleSystem.createExplosion(projectile.mesh.position.clone(), 1.0);
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
    // Check if we already have a notification container
    if (!this.notificationContainer) {
      this.notificationContainer = document.createElement('div');
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
      font-size: ${type === 'join' || type === 'death' ? '18px' : '16px'};
      display: flex;
      align-items: center;
      backdrop-filter: blur(10px);
      border: 2px solid rgba(255, 255, 255, 0.2);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
      max-width: 350px;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      ${type === 'join' || type === 'death' ? 'font-weight: bold;' : ''}
    `;
      this.notificationContainer.appendChild(notification);
    }

    // Update notification based on message type
    let iconText = '';
    switch(type) {
      case 'join':
        iconText = '🎮';
        notification.style.borderLeft = '6px solid #4CAF50';
        notification.style.backgroundColor = 'rgba(76, 175, 80, 0.25)';
        break;
      case 'death':
        iconText = '💀';
        notification.style.borderLeft = '6px solid #f44336';
        notification.style.backgroundColor = 'rgba(244, 67, 54, 0.25)';
        break;
      case 'respawn':
        iconText = '✨';
        notification.style.borderLeft = '6px solid #2196F3';
        notification.style.backgroundColor = 'rgba(33, 150, 243, 0.25)';
        break;
      case 'hit':
        iconText = '💥';
        notification.style.borderLeft = '6px solid #FFC107';
        notification.style.backgroundColor = 'rgba(255, 193, 7, 0.25)';
        break;
      default:
        iconText = 'ℹ️';
        notification.style.borderLeft = '6px solid #9E9E9E';
    }

    // Clear previous content
    notification.innerHTML = '';

    // Add icon
    const icon = document.createElement('span');
    icon.style.cssText = `
      margin-right: 12px;
      font-size: ${type === 'join' || type === 'death' ? '28px' : '20px'};
      animation: bounce 1s ease infinite;
      line-height: 1;
    `;
    icon.textContent = iconText;
    notification.appendChild(icon);

    // Add text
    const text = document.createElement('span');
    text.textContent = message;
    text.style.wordBreak = 'break-word';
    notification.appendChild(text);

    // Make sure notification is visible
    notification.style.opacity = '1';
    
    // Clear any existing timeout
    if (this.notificationTimeout) {
      clearTimeout(this.notificationTimeout);
    }

    // Set timeout to hide notification
    this.notificationTimeout = setTimeout(() => {
      notification.style.opacity = '0.5';
    }, type === 'join' || type === 'death' ? 5000 : 3000);
  }

  // Add new method for debug overlay
  createDebugOverlay() {
    // Create debug container
    this.debugContainer = document.createElement('div');
    this.debugContainer.id = 'debug-overlay';
    this.debugContainer.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background-color: rgba(0, 0, 0, 0.7);
      color: #00ff00;
      font-family: monospace;
      font-size: 14px;
      padding: 10px;
      border-radius: 5px;
      z-index: 1000;
      pointer-events: none;
      display: none;
    `;
    document.body.appendChild(this.debugContainer);
    
    // Create FPS counter
    this.fpsCounter.element = document.createElement('div');
    this.fpsCounter.element.id = 'fps-counter';
    this.fpsCounter.element.textContent = 'FPS: 0';
    this.debugContainer.appendChild(this.fpsCounter.element);
    
    // Create memory usage display
    this.memoryDisplay = document.createElement('div');
    this.memoryDisplay.id = 'memory-usage';
    this.memoryDisplay.textContent = 'Memory: 0 MB';
    this.debugContainer.appendChild(this.memoryDisplay);
    
    // Create entity counter
    this.entityCounter = document.createElement('div');
    this.entityCounter.id = 'entity-counter';
    this.entityCounter.textContent = 'Entities: 0';
    this.debugContainer.appendChild(this.entityCounter);
    
    // Create position display
    this.positionDisplay = document.createElement('div');
    this.positionDisplay.id = 'position-display';
    this.positionDisplay.textContent = 'Position: (0, 0, 0)';
    this.debugContainer.appendChild(this.positionDisplay);
    
    // Create ping display
    this.pingDisplay = document.createElement('div');
    this.pingDisplay.id = 'ping-display';
    this.pingDisplay.textContent = 'Ping: 0ms';
    this.debugContainer.appendChild(this.pingDisplay);
    
    // Add toggle button
    const toggleButton = document.createElement('button');
    toggleButton.textContent = 'Debug';
    toggleButton.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background-color: rgba(0, 0, 0, 0.7);
      color: #00ff00;
      border: 1px solid #00ff00;
      border-radius: 5px;
      padding: 5px 10px;
      font-family: monospace;
      cursor: pointer;
      z-index: 1001;
    `;
    document.body.appendChild(toggleButton);
    
    // Add event listener
    toggleButton.addEventListener('click', () => {
      this.debugMode = !this.debugMode;
      this.debugContainer.style.display = this.debugMode ? 'block' : 'none';
    });
  }

  // Add new method to update debug info
  updateDebugInfo(time, delta) {
    // Update FPS counter
    this.fpsCounter.frames++;
    
    if (time - this.fpsCounter.lastTime >= 1000) {
      this.fpsCounter.value = Math.round(this.fpsCounter.frames * 1000 / (time - this.fpsCounter.lastTime));
      this.fpsCounter.frames = 0;
      this.fpsCounter.lastTime = time;
      
      // Update FPS display
      this.fpsCounter.element.textContent = `FPS: ${this.fpsCounter.value}`;
      
      // Update memory usage if available
      if (window.performance && window.performance.memory) {
        const memoryUsage = Math.round(window.performance.memory.usedJSHeapSize / 1048576);
        this.memoryDisplay.textContent = `Memory: ${memoryUsage} MB`;
      }
      
      // Update entity counter
      const entityCount = (
        this.projectiles.length + 
        this.obstacles.length + 
        this.buoys.length + 
        this.pickups.length + 
        (this.socketManager?.otherPlayers.size || 0) + 
        1 // Player ship
      );
      this.entityCounter.textContent = `Entities: ${entityCount}`;
      
      // Update position display
      if (this.ship) {
        const pos = this.ship.mesh.position;
        this.positionDisplay.textContent = `Position: (${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)})`;
      }
      
      // Update ping display
      if (this.socketManager && this.socketManager.lastPing) {
        this.pingDisplay.textContent = `Ping: ${this.socketManager.lastPing}ms`;
      }
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
      side: THREE.DoubleSide
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
          time
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
        time
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
    let existingProjectile = player.projectiles.find(p => p.id === data.id);
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
      data.position.z || 0
    );
    
    const velocity = new THREE.Vector3(
      data.velocity.x || 0,
      data.velocity.y || 0,
      data.velocity.z || 0
    );
    
    // Determine direction from velocity
    const direction = velocity.clone().normalize();
    
    // Determine if it's a machine gun or cannonball
    const isMachineGun = data.type === 'machineGun';
    
    // Create the projectile
    const projectile = this.createProjectile(position, direction, isMachineGun);
    
    // Set properties
    projectile.id = data.id;
    projectile.playerId = data.playerId;
    projectile.velocity = velocity.clone();
    
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
          projectileData.position.z || 0
        );
        
        existingProjectile.velocity.set(
          projectileData.velocity.x || 0,
          projectileData.velocity.y || 0,
          projectileData.velocity.z || 0
        );
      } else {
        // Add new projectile
        this.handleOtherPlayerProjectileFire({
          id: projectileData.id,
          playerId: playerId,
          position: projectileData.position,
          velocity: projectileData.velocity,
          type: projectileData.type || 'cannon'
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
        data.targetId === this.socketManager.socket.id ? 0xff0000 : 0xffaa00
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
        0xff0000
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
    if (!this.explorer || !this.explorer.isActive) {
      return false;
    }
    
    if (!this.playerShip) {
      console.error('Cannot return to ship: No player ship found');
      return false;
    }
    
    // Check if explorer is near dock
    if (!this.explorer.currentIsland || !this.explorer.currentIsland.isNearDock(this.explorer.mesh.position, 15)) {
      this.showNotification('You need to be near the dock to return to your ship', 'warning');
      return false;
    }
    
    // Deactivate explorer
    this.explorer.isActive = false;
    
    // Hide explorer mesh
    this.explorer.mesh.visible = false;
    
    // Reset position to be at the ship
    this.explorer.mesh.position.copy(this.playerShip.mesh.position);
    
    // Update camera to focus on ship again
    if (this.cameraManager) {
      console.log('Switching camera back to ship');
      this.cameraManager.setTarget(this.playerShip);
    }
    
    // Undock the ship if it was docked
    if (this.playerShip.isDocked) {
      this.playerShip.undock();
    }
    
    // Hide explorer controls
    this.hideExplorerControls();
    
    // Enable ship controls
    this.enableShipControls();
    
    // Show notification
    this.showNotification('Returned to ship!', 'success');
    
    // Send explorer state to server
    if (this.socketManager) {
      this.socketManager.sendExplorerState({
        position: this.explorer.mesh.position,
        rotation: { y: this.explorer.mesh.rotation.y },
        isActive: false,
        islandId: null
      });
    }
    
    return true;
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
    
    // Handle different explorer actions
    switch (data.action) {
      case 'spawn':
        // Set up the explorer
        player.explorer.mesh.position.copy(data.position);
        player.explorer.mesh.rotation.copy(data.rotation);
        player.explorer.mesh.visible = true;
        player.explorer.isActive = true;
        
        // Find the island
        const island = this.islands.find(island => island.mesh.uuid === data.islandId);
        if (island) {
          player.explorer.currentIsland = island;
        }
        break;
        
      case 'move':
        // Update position and rotation
        player.explorer.mesh.position.copy(data.position);
        player.explorer.mesh.rotation.copy(data.rotation);
        break;
        
      case 'return':
        // Hide explorer
        player.explorer.mesh.visible = false;
        player.explorer.isActive = false;
        player.explorer.currentIsland = null;
        break;
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

  // Handle explorer spawning at island
  handleExplorerSpawn() {
    if (!this.playerShip || !this.explorer) {
      console.error('Cannot spawn explorer: No player ship or explorer found');
      return false;
    }
    
    // Find the closest island with a dock
    const closestIsland = this.findClosestIslandWithDock(this.playerShip.mesh.position);
    
    if (!closestIsland) {
      this.showNotification('No suitable island found nearby', 'warning');
      return false;
    }
    
    // Try to spawn explorer at the island
    const success = this.explorer.spawn(
      this.playerShip.mesh.position.clone(),
      this.playerShip.mesh.rotation.clone(),
      closestIsland
    );
    
    if (success) {
      // Switch camera to follow explorer with smooth transition
      if (this.cameraManager) {
        this.cameraManager.setTarget(this.explorer);
      }
      
      // Show controls UI
      this.showExplorerControls();
    }
    
    return success;
  }
  
  // Handle explorer returning to ship
  handleExplorerReturn() {
    return this.returnToShip();
  }
  
  // Find the closest island with a dock
  findClosestIslandWithDock(position) {
    if (!this.islands || this.islands.length === 0) {
      return null;
    }
    
    let closestIsland = null;
    let closestDistance = Infinity;
    
    for (const island of this.islands) {
      // Skip islands without docks
      if (!island.dock) continue;
      
      // Check if ship is near the dock
      if (island.isNearDock(position)) {
        const distance = position.distanceTo(island.position);
        
        if (distance < closestDistance) {
          closestDistance = distance;
          closestIsland = island;
        }
      }
    }
    
    return closestIsland;
  }
  
  // Show explorer controls UI
  showExplorerControls() {
    const controls = document.getElementById('explorer-controls');
    if (controls) {
      controls.classList.remove('hidden');
    }
    
    // Disable ship firing
    this.disableShipControls();
  }
  
  // Hide explorer controls UI
  hideExplorerControls() {
    const controls = document.getElementById('explorer-controls');
    if (controls) {
      controls.classList.add('hidden');
    }
    
    // Re-enable ship firing
    this.enableShipControls();
  }
  
  // Handle collectible pickup
  handleCollectiblePickup(collectible) {
    if (!collectible) return;
    
    // Add to explorer's inventory
    if (this.explorer && this.explorer.inventory) {
      this.explorer.inventory.push({
        type: collectible.type,
        value: collectible.value
      });
    }
    
    // Remove collectible from scene
    this.scene.remove(collectible.mesh);
    
    // Remove from collectibles array
    const index = this.collectibles.indexOf(collectible);
    if (index !== -1) {
      this.collectibles.splice(index, 1);
    }
    
    // Notify server if multiplayer
    if (this.socketManager) {
      this.socketManager.sendCollectiblePickup({
        collectibleId: collectible.id,
        islandId: collectible.islandId
      });
    }
  }

  // Add this method to create the explorer UI
  createExplorerUI() {
    // Create explorer controls container
    const explorerControls = document.createElement('div');
    explorerControls.id = 'explorer-controls';
    explorerControls.className = 'explorer-controls hidden';
    explorerControls.style.position = 'absolute';
    explorerControls.style.bottom = '20px';
    explorerControls.style.left = '50%';
    explorerControls.style.transform = 'translateX(-50%)';
    explorerControls.style.display = 'flex';
    explorerControls.style.flexDirection = 'column';
    explorerControls.style.alignItems = 'center';
    explorerControls.style.gap = '10px';
    
    // Create return to ship button
    const returnButton = document.createElement('button');
    returnButton.id = 'return-to-ship-button';
    returnButton.textContent = 'Return to Ship';
    returnButton.className = 'game-button';
    returnButton.style.padding = '10px 20px';
    returnButton.style.backgroundColor = '#2196F3';
    returnButton.style.color = 'white';
    returnButton.style.border = 'none';
    returnButton.style.borderRadius = '5px';
    returnButton.style.cursor = 'pointer';
    returnButton.style.fontWeight = 'bold';
    returnButton.style.fontSize = '16px';
    returnButton.style.boxShadow = '0 2px 5px rgba(0,0,0,0.3)';
    
    // Add hover effect
    returnButton.addEventListener('mouseover', () => {
      returnButton.style.backgroundColor = '#0b7dda';
    });
    
    returnButton.addEventListener('mouseout', () => {
      returnButton.style.backgroundColor = '#2196F3';
    });
    
    // Add click event
    returnButton.addEventListener('click', () => {
      this.handleExplorerReturn();
    });
    
    // Add button to controls
    explorerControls.appendChild(returnButton);
    
    // Add controls to container
    this.container.appendChild(explorerControls);
  }

  // Add methods to disable/enable ship controls
  disableShipControls() {
    this.shipControlsDisabled = true;
  }

  enableShipControls() {
    this.shipControlsDisabled = false;
  }

  setupEventListeners() {
    // Add event listener for return to ship button
    const returnToShipBtn = document.getElementById('return-to-ship-btn');
    if (returnToShipBtn) {
      returnToShipBtn.addEventListener('click', () => {
        this.handleExplorerReturn();
      });
    }
    
    // Add event listener for window resize
    window.addEventListener('resize', this.onWindowResize.bind(this));
  }
} 