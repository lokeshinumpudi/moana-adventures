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
  constructor() {
    // Game state
    this.isRunning = false;
    this.isPaused = false;
    this.score = 0;
    this.projectiles = [];
    this.otherProjectiles = [];
    this.obstacles = [];
    this.buoys = [];
    this.lastTime = 0;
    
    // Performance monitoring
    this.fpsCounter = document.createElement('div');
    this.fpsCounter.id = 'fps-counter';
    document.body.appendChild(this.fpsCounter);
    this.frames = 0;
    this.lastFpsUpdate = 0;
    
    // Projectile settings
    this.maxProjectiles = 50; // Maximum active projectiles
    this.projectileCleanupInterval = 5000; // Clean up projectiles every 5 seconds
    this.lastCleanupTime = 0;
    
    // Machine gun settings
    this.machineGunCooldown = 150; // milliseconds between shots
    this.leftMachineGunTime = 0;
    this.rightMachineGunTime = 0;
    
    // Collision optimization
    this.collisionCheckInterval = 100; // Check collisions every 100ms
    this.lastCollisionCheck = 0;
    
    // Initialize HUD
    this.hud = new HUD(this);
  }
  
  init() {
    return new Promise((resolve, reject) => {
      try {
        // Set up Three.js scene
        this.setupScene();
        
        // Create game components
        this.createComponents().then(() => {
          // Set up input manager
          this.inputManager = new InputManager(this);
          
          // Set up socket manager for multiplayer
          this.socketManager = new SocketManager(this);
          
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
    document.body.appendChild(this.renderer.domElement);
    
    // Add lights
    this.addLights();
    
    // Add camera controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.1;
    this.controls.minDistance = 10;
    this.controls.maxDistance = 100;
    
    // Handle window resize
    window.addEventListener('resize', () => this.onWindowResize());
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
          this.ship = new Ship();
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
        // Create particle system
        this.particleSystem = new ParticleSystem(this.scene);
        
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
    // Create several obstacles at different positions
    const obstaclePositions = [
      { x: 40, z: 40, type: 'rock' },
      { x: -60, z: 20, type: 'coral' },
      { x: 70, z: -40, type: 'island' },
      { x: -80, z: -70, type: 'wreck' }
    ];
    
    obstaclePositions.forEach(pos => {
      const obstacle = new Obstacle(pos.type);
      obstacle.init().then(() => {
        obstacle.mesh.position.set(pos.x, 0, pos.z);
        this.scene.add(obstacle.mesh);
        this.obstacles.push(obstacle);
      });
    });
  }
  
  fireMachineGun(side) {
    if (!this.ship || !this.ship.mesh) return;
    
    const position = new THREE.Vector3();
    const direction = new THREE.Vector3();
    
    // Get position from ship's matrix world
    switch(side) {
      case 'left':
        position.copy(this.ship.leftGunPosition || new THREE.Vector3(-1, 0.5, 2));
        direction.set(-1, 0, 0);
        break;
      case 'right':
        position.copy(this.ship.rightGunPosition || new THREE.Vector3(1, 0.5, 2));
        direction.set(1, 0, 0);
        break;
      case 'front':
        position.copy(this.ship.frontGunPosition || new THREE.Vector3(0, 0.5, 3.5));
        direction.set(0, 0, 1);
        break;
      default:
        return;
    }

    // Transform position and direction to world space
    position.applyMatrix4(this.ship.mesh.matrixWorld);
    direction.applyQuaternion(this.ship.mesh.quaternion).normalize();

    // Create projectile
    const projectile = new Projectile(position, direction, 0.1, 50);

    this.projectiles.push(projectile);
    this.scene.add(projectile.mesh);

    // Add muzzle flash particle effect
    this.particleSystem.createMuzzleFlash(position);
  }
  
  fireCannonball(side) {
    if (!this.ship || !this.ship.mesh) return;
    
    const position = new THREE.Vector3();
    const direction = new THREE.Vector3();
    
    // Get position from ship's matrix world
    switch(side) {
      case 'left':
        position.copy(this.ship.leftCannonPosition || new THREE.Vector3(-1.4, 1, -1.5));
        direction.set(-1, 0, 0);
        break;
      case 'right':
        position.copy(this.ship.rightCannonPosition || new THREE.Vector3(1.4, 1, -1.5));
        direction.set(1, 0, 0);
        break;
      default:
        return;
    }

    // Transform position and direction to world space
    position.applyMatrix4(this.ship.mesh.matrixWorld);
    direction.applyQuaternion(this.ship.mesh.quaternion).normalize();

    // Add some spread and arc to cannonballs
    direction.y += 0.1; // Slight upward arc
    direction.x += (Math.random() - 0.5) * 0.1; // Random spread
    direction.z += (Math.random() - 0.5) * 0.1;
    direction.normalize();

    // Create projectile
    const projectile = new Projectile(position, direction, 0.5, 30);

    this.projectiles.push(projectile);
    this.scene.add(projectile.mesh);

    // Add smoke particle effect
    this.particleSystem.createCannonSmoke(position);
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
    
    // Only check collisions every collisionCheckInterval
    if (now - this.lastCollisionCheck < this.collisionCheckInterval) {
      return;
    }
    
    this.lastCollisionCheck = now;
    
    // Check projectile collisions with other ships
    this.socketManager.otherPlayers.forEach(player => {
      this.projectiles.forEach(projectile => {
        // Skip recently checked projectiles
        if (now - projectile.lastCollisionCheck < this.collisionCheckInterval) {
          return;
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
          const index = this.projectiles.indexOf(projectile);
          if (index > -1) {
            this.projectiles.splice(index, 1);
          }
          
          // Emit hit event to server
          this.socketManager.socket.emit('player:hit', {
            targetId: player.id,
            damage: projectile.damage
          });
          
          // Increment score
          this.score += 10;
        }
      });
    });
    
    // Check ship collisions with obstacles
    this.obstacles.forEach(obstacle => {
      const distance = this.ship.mesh.position.distanceTo(obstacle.mesh.position);
      
      if (distance < (this.ship.collisionRadius + obstacle.collisionRadius)) {
        // Apply collision physics
        this.handleShipObstacleCollision(obstacle);
      }
    });
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
    // Return the game state for network transmission
    return {
      ship: {
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
        health: this.ship.health
      },
      projectiles: this.projectiles.map(projectile => ({
        id: projectile.id,
        type: projectile.type,
        position: {
          x: projectile.mesh.position.x,
          y: projectile.mesh.position.y,
          z: projectile.mesh.position.z
        },
        velocity: {
          x: projectile.velocity.x,
          y: projectile.velocity.y,
          z: projectile.velocity.z
        }
      })),
      score: this.score
    };
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
    
    // Update FPS counter
    this.updateFpsCounter();
    
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
    // Update controls
    this.controls.update();
    
    // Process input
    this.inputManager.update(delta);
    
    // Update socket manager for multiplayer
    this.socketManager.update(delta);
    
    // Handle machine gun auto fire
    if (this.inputManager.autoFiringLeft) {
      this.fireMachineGun('left');
    }
    
    if (this.inputManager.autoFiringRight) {
      this.fireMachineGun('right');
    }
    
    // Update ship
    if (this.ship) {
      this.ship.update(delta, this.inputManager);
      
      // Update character position based on ship
      if (this.character) {
        this.character.mesh.position.copy(this.ship.getCharacterPosition());
        this.character.mesh.rotation.copy(this.ship.mesh.rotation);
        this.character.update(delta);
      }
      
      // Update camera position to follow ship
      this.updateCameraPosition();
    }
    
    // Update ocean
    if (this.ocean) {
      this.ocean.update(delta);
    }
    
    // Update projectiles
    this.updateProjectiles(delta);
    
    // Update buoys
    this.buoys.forEach(buoy => {
      buoy.update(delta);
    });
    
    // Update particle system
    this.particleSystem.update(delta);
    
    // Cleanup projectiles
    this.cleanupProjectiles();
    
    // Check collisions
    this.checkCollisions();
    
    // Update HUD
    this.hud.update();
  }
  
  updateCameraPosition() {
    // Check if the camera needs to be updated
    if (!this.ship || !this.camera) return;
    
    // Set the target for the orbit controls to be the ship
    this.controls.target.copy(this.ship.mesh.position);
  }
  
  updateProjectiles(delta) {
    // Update own projectiles
    this.projectiles.forEach(projectile => {
      projectile.update(delta);
    });
  }
  
  render() {
    // Render the scene
    this.renderer.render(this.scene, this.camera);
  }
} 