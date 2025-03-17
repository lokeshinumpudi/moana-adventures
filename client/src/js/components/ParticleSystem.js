import * as THREE from 'three';

export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];
    this.maxParticles = 500;

    // Initialize particle geometries
    this.initGeometries();

    // Initialize particle materials
    this.initMaterials();
  }

  initGeometries() {
    // Small particles for muzzle flashes, hits
    this.smallParticleGeometry = new THREE.BufferGeometry();
    const smallPositions = new Float32Array(this.maxParticles * 3);
    this.smallParticleGeometry.setAttribute('position', new THREE.BufferAttribute(smallPositions, 3));

    // Medium particles for water splashes, collisions
    this.mediumParticleGeometry = new THREE.SphereGeometry(0.1, 8, 8);

    // Large particles for explosions, cannon fire
    this.largeParticleGeometry = new THREE.SphereGeometry(0.3, 16, 16);
  }

  initMaterials() {
    // Basic particle material
    this.basicMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });

    // Muzzle flash material
    this.muzzleFlashMaterial = new THREE.MeshBasicMaterial({
      color: 0xff9933,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });

    // Hit effect material
    this.hitMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
    });

    // Water splash material
    this.waterSplashMaterial = new THREE.MeshBasicMaterial({
      color: 0x33aaff,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
    });

    // Smoke material
    this.smokeMaterial = new THREE.MeshBasicMaterial({
      color: 0x777777,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
    });

    // Cannon fire material
    this.cannonFireMaterial = new THREE.MeshBasicMaterial({
      color: 0xff5500,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
    });
  }

  createParticle(position, options = {}) {
    // Default options
    const defaults = {
      size: 'small',
      material: this.basicMaterial,
      velocity: new THREE.Vector3(0, 1, 0),
      acceleration: new THREE.Vector3(0, -1, 0),
      lifespan: 1000,
      gravity: true,
      drag: 0.98,
      fadeRate: 0.05,
      scaleRate: 0.99,
      rotationRate: 0.1,
    };

    // Merge options with defaults
    const config = { ...defaults, ...options };

    // Select geometry based on size
    let geometry;
    switch (config.size) {
    case 'medium':
      geometry = this.mediumParticleGeometry;
      break;
    case 'large':
      geometry = this.largeParticleGeometry;
      break;
    default:
      geometry = this.smallParticleGeometry;
    }

    // Create mesh
    const mesh = new THREE.Mesh(geometry, config.material.clone());
    mesh.position.copy(position);

    // Generate random initial rotation
    mesh.rotation.set(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
    );

    // Add to scene
    this.scene.add(mesh);

    // Create particle object
    const particle = {
      mesh,
      velocity: config.velocity.clone(),
      acceleration: config.acceleration.clone(),
      createdAt: Date.now(),
      lifespan: config.lifespan,
      gravity: config.gravity,
      drag: config.drag,
      fadeRate: config.fadeRate,
      scaleRate: config.scaleRate,
      rotationRate: config.rotationRate,
      initialScale: mesh.scale.clone(),
    };

    // Add to particles array
    this.particles.push(particle);

    // Clean up particles if we've exceeded the max
    if (this.particles.length > this.maxParticles) {
      this.removeOldestParticle();
    }

    return particle;
  }

  removeOldestParticle() {
    if (this.particles.length === 0) return;

    const oldestParticle = this.particles.shift();
    this.scene.remove(oldestParticle.mesh);
  }

  removeParticle(particle) {
    const index = this.particles.indexOf(particle);
    if (index !== -1) {
      this.scene.remove(particle.mesh);
      this.particles.splice(index, 1);
    }
  }

  createMuzzleFlash(position) {
    // Create a small burst of particles for muzzle flash
    const count = Math.floor(Math.random() * 5) + 5;

    for (let i = 0; i < count; i++) {
      // Calculate random position offset
      const offset = new THREE.Vector3(
        (Math.random() - 0.5) * 0.1,
        (Math.random() - 0.5) * 0.1,
        (Math.random() - 0.5) * 0.1,
      );

      // Calculate random velocity
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.2,
        (Math.random() - 0.5) * 0.2,
        (Math.random() - 0.5) * 0.2,
      );

      // Create particle
      this.createParticle(position.clone().add(offset), {
        size: 'small',
        material: this.muzzleFlashMaterial,
        velocity: velocity,
        lifespan: 200 + Math.random() * 100,
        fadeRate: 0.15,
        scaleRate: 0.9,
        gravity: false,
      });
    }
  }

  createCannonFire(position) {
    // Create a large burst of particles for cannon fire
    const count = Math.floor(Math.random() * 10) + 15;

    // Create flame particles
    for (let i = 0; i < count; i++) {
      // Calculate random position offset
      const offset = new THREE.Vector3(
        (Math.random() - 0.5) * 0.3,
        (Math.random() - 0.5) * 0.3,
        (Math.random() - 0.5) * 0.3,
      );

      // Calculate random velocity
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5 + 0.2,
        (Math.random() - 0.5) * 0.5,
      );

      // Create particle
      this.createParticle(position.clone().add(offset), {
        size: 'medium',
        material: this.cannonFireMaterial,
        velocity: velocity,
        lifespan: 500 + Math.random() * 200,
        fadeRate: 0.08,
        scaleRate: 0.95,
        gravity: false,
      });
    }

    // Create smoke particles
    for (let i = 0; i < count / 2; i++) {
      // Calculate random position offset
      const offset = new THREE.Vector3(
        (Math.random() - 0.5) * 0.2,
        (Math.random() - 0.5) * 0.2 + 0.2,
        (Math.random() - 0.5) * 0.2,
      );

      // Calculate random velocity
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.3,
        (Math.random() - 0.5) * 0.2 + 0.4,
        (Math.random() - 0.5) * 0.3,
      );

      // Create particle
      this.createParticle(position.clone().add(offset), {
        size: 'large',
        material: this.smokeMaterial,
        velocity: velocity,
        lifespan: 1500 + Math.random() * 500,
        fadeRate: 0.03,
        scaleRate: 1.01, // Smoke expands
        gravity: false,
        drag: 0.99,
      });
    }
  }

  createHitEffect(position) {
    // Create a burst of particles for hit effect
    const count = Math.floor(Math.random() * 10) + 5;

    for (let i = 0; i < count; i++) {
      // Calculate random velocity in all directions
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 1.0,
        (Math.random() - 0.5) * 1.0,
        (Math.random() - 0.5) * 1.0,
      ).normalize().multiplyScalar(Math.random() * 0.5 + 0.2);

      // Create particle
      this.createParticle(position.clone(), {
        size: 'small',
        material: this.hitMaterial,
        velocity: velocity,
        lifespan: 300 + Math.random() * 200,
        fadeRate: 0.1,
        scaleRate: 0.97,
        gravity: false,
      });
    }
  }

  createWaterSplash(position) {
    // Create a splash of water particles
    const count = Math.floor(Math.random() * 15) + 10;

    for (let i = 0; i < count; i++) {
      // Calculate random velocity mostly upward
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.4,
        Math.random() * 0.8 + 0.2,
        (Math.random() - 0.5) * 0.4,
      );

      // Create particle
      this.createParticle(position.clone(), {
        size: 'medium',
        material: this.waterSplashMaterial,
        velocity: velocity,
        acceleration: new THREE.Vector3(0, -2, 0), // Stronger gravity for water
        lifespan: 800 + Math.random() * 400,
        fadeRate: 0.07,
        scaleRate: 0.98,
        gravity: true,
        drag: 0.95,
      });
    }
  }

  createExplosion(position, size = 1.0) {
    // Create a powerful explosion with fire, smoke, and debris
    const fireCount = Math.floor(Math.random() * 15) + 25;
    const smokeCount = Math.floor(Math.random() * 10) + 15;
    const debrisCount = Math.floor(Math.random() * 20) + 30;
    
    // Scale factor based on size parameter
    const scaleFactor = size;
    
    // Create fire particles (center of explosion)
    for (let i = 0; i < fireCount; i++) {
      // Calculate random velocity in all directions
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 2.0,
        (Math.random() - 0.5) * 2.0,
        (Math.random() - 0.5) * 2.0
      ).normalize().multiplyScalar(Math.random() * 0.8 + 0.4).multiplyScalar(scaleFactor);

      // Create fire particle
      this.createParticle(position.clone(), {
        size: Math.random() < 0.7 ? 'medium' : 'large',
        material: new THREE.MeshBasicMaterial({
          color: new THREE.Color(0xff4500).lerp(new THREE.Color(0xffcc00), Math.random()),
          transparent: true,
          opacity: 0.9,
          blending: THREE.AdditiveBlending,
        }),
        velocity: velocity,
        lifespan: (300 + Math.random() * 200) * scaleFactor,
        fadeRate: 0.1,
        scaleRate: 0.96,
        gravity: false,
        drag: 0.98,
      });
    }
    
    // Create smoke particles (follows after fire)
    for (let i = 0; i < smokeCount; i++) {
      // Calculate random velocity, mostly upward
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.6,
        Math.random() * 0.4 + 0.2,
        (Math.random() - 0.5) * 0.6
      ).multiplyScalar(scaleFactor);

      // Create smoke particle with slight delay
      setTimeout(() => {
        if (!this.scene) return; // Scene might be gone if game was destroyed
        
        this.createParticle(position.clone(), {
          size: 'large',
          material: this.smokeMaterial.clone(),
          velocity: velocity,
          lifespan: (1000 + Math.random() * 1000) * scaleFactor,
          fadeRate: 0.02,
          scaleRate: 1.01, // Smoke expands
          gravity: false,
          drag: 0.99,
        });
      }, Math.random() * 200);
    }
    
    // Create debris particles
    for (let i = 0; i < debrisCount; i++) {
      // Calculate random direction
      const direction = new THREE.Vector3(
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
        Math.random() * 2 - 1
      ).normalize();
      
      // Random speed based on distance from center
      const speed = (Math.random() * 1.0 + 0.5) * scaleFactor;
      
      // Create debris particle
      this.createParticle(position.clone(), {
        size: 'small',
        material: new THREE.MeshBasicMaterial({
          color: Math.random() > 0.5 ? 0xff3300 : 0x666666,
          transparent: true,
          opacity: 0.9,
          blending: THREE.AdditiveBlending,
        }),
        velocity: direction.clone().multiplyScalar(speed),
        acceleration: new THREE.Vector3(0, -1.0, 0),
        lifespan: (500 + Math.random() * 500) * scaleFactor,
        fadeRate: 0.05,
        scaleRate: 0.97,
        gravity: true,
        drag: 0.97,
      });
    }
    
    // Create flash at center
    this.createParticle(position.clone(), {
      size: 'large',
      material: new THREE.MeshBasicMaterial({
        color: 0xffffcc,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
      }),
      velocity: new THREE.Vector3(0, 0, 0),
      lifespan: 200 * scaleFactor,
      fadeRate: 0.2,
      scaleRate: 1.2,
      gravity: false,
      drag: 1.0,
    });
  }

  createCollisionEffect(position) {
    // Create a combination of hit and splash effects
    this.createHitEffect(position);
    this.createWaterSplash(position);

    // Add some smoke particles
    const count = Math.floor(Math.random() * 5) + 3;

    for (let i = 0; i < count; i++) {
      // Calculate random velocity mostly upward and outward
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.3,
        Math.random() * 0.4 + 0.1,
        (Math.random() - 0.5) * 0.3,
      );

      // Create particle
      this.createParticle(position.clone(), {
        size: 'large',
        material: this.smokeMaterial,
        velocity: velocity,
        lifespan: 1000 + Math.random() * 500,
        fadeRate: 0.04,
        scaleRate: 1.01,
        gravity: false,
        drag: 0.98,
      });
    }
  }

  createPickupEffect(position, type) {
    // Create a burst of particles for pickup effect
    const count = Math.floor(Math.random() * 15) + 10;

    // Determine color based on pickup type
    let color;
    switch (type) {
    case 'health':
      color = 0xff0000; // Red
      break;
    case 'ammo':
      color = 0xffff00; // Yellow
      break;
    case 'speed':
      color = 0x00ff00; // Green
      break;
    case 'shield':
      color = 0x0088ff; // Blue
      break;
    default:
      color = 0xffffff; // White
    }

    // Create custom material for this effect
    const material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
    });

    // Create particles in a spherical burst
    for (let i = 0; i < count; i++) {
      // Calculate random direction
      const direction = new THREE.Vector3(
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
      ).normalize();

      // Calculate random speed
      const speed = Math.random() * 0.3 + 0.2;

      // Create particle with velocity in random direction
      this.createParticle(position.clone(), {
        size: 'medium',
        material: material.clone(),
        velocity: direction.multiplyScalar(speed),
        lifespan: 800 + Math.random() * 400,
        fadeRate: 0.05,
        scaleRate: 0.97,
        gravity: false,
        drag: 0.98,
      });
    }

    // Create a flash effect at the center
    const flashMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
    });

    // Create a single large expanding particle for the flash
    this.createParticle(position.clone(), {
      size: 'large',
      material: flashMaterial,
      velocity: new THREE.Vector3(0, 0, 0),
      lifespan: 300,
      fadeRate: 0.1,
      scaleRate: 1.1, // Expand rapidly
      gravity: false,
      drag: 1.0, // No drag
    });
  }

  createHealEffect(position) {
    // Create healing circles effect
    const count = 20;
    const radius = 3;

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      const particle = this.createParticle(
        new THREE.Vector3(position.x + x, position.y, position.z + z),
        {
          size: 'medium',
          material: new THREE.MeshBasicMaterial({
            color: 0xff4444,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
          }),
          velocity: new THREE.Vector3(0, 0.5, 0),
          lifespan: 1000,
          fadeRate: 0.02,
          scaleRate: 1.02,
        },
      );
    }
  }

  createSpeedEffect(position) {
    // Create speed lines effect
    const count = 15;

    for (let i = 0; i < count; i++) {
      const angle = (Math.random() * Math.PI * 2);
      const radius = 2 + Math.random() * 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      const particle = this.createParticle(
        new THREE.Vector3(position.x + x, position.y, position.z + z),
        {
          size: 'small',
          material: new THREE.MeshBasicMaterial({
            color: 0x44ff44,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending,
          }),
          velocity: new THREE.Vector3(x * 0.5, 0.2, z * 0.5),
          lifespan: 800,
          fadeRate: 0.03,
          scaleRate: 0.97,
        },
      );
    }
  }

  createShieldEffect(position) {
    // Create shield bubble effect
    const count = 30;
    const radius = 4;

    for (let i = 0; i < count; i++) {
      const phi = Math.acos(-1 + (2 * i) / count);
      const theta = Math.sqrt(count * Math.PI) * phi;

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);

      const particle = this.createParticle(
        new THREE.Vector3(position.x + x, position.y + y, position.z + z),
        {
          size: 'small',
          material: new THREE.MeshBasicMaterial({
            color: 0x4444ff,
            transparent: true,
            opacity: 0.7,
            blending: THREE.AdditiveBlending,
          }),
          velocity: new THREE.Vector3(x * 0.1, y * 0.1, z * 0.1),
          lifespan: 1200,
          fadeRate: 0.01,
          scaleRate: 1.01,
        },
      );
    }
  }

  createPowerEffect(position) {
    // Create power surge effect
    const count = 25;

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const height = Math.random() * 4;

      const particle = this.createParticle(
        new THREE.Vector3(position.x, position.y + height, position.z),
        {
          size: 'medium',
          material: new THREE.MeshBasicMaterial({
            color: 0xffff44,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
          }),
          velocity: new THREE.Vector3(
            Math.cos(angle) * 2,
            1 + Math.random(),
            Math.sin(angle) * 2,
          ),
          lifespan: 1000,
          fadeRate: 0.02,
          scaleRate: 0.98,
        },
      );
    }
  }

  update(delta) {
    // Calculate elapsed time since last frame
    const now = Date.now();

    // Update each particle
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];

      // Check if particle has exceeded its lifespan
      if (now - particle.createdAt > particle.lifespan) {
        this.scene.remove(particle.mesh);
        this.particles.splice(i, 1);
        continue;
      }

      // Apply acceleration
      particle.velocity.add(particle.acceleration.clone().multiplyScalar(delta));

      // Apply drag
      particle.velocity.multiplyScalar(particle.drag);

      // Update position
      particle.mesh.position.add(particle.velocity.clone().multiplyScalar(delta));

      // Update rotation
      particle.mesh.rotation.x += particle.rotationRate * delta;
      particle.mesh.rotation.y += particle.rotationRate * delta;
      particle.mesh.rotation.z += particle.rotationRate * delta;

      // Update scale
      particle.mesh.scale.multiplyScalar(particle.scaleRate);

      // Update opacity
      particle.mesh.material.opacity *= (1 - particle.fadeRate);

      // Ensure opacity doesn't go below 0
      if (particle.mesh.material.opacity < 0) {
        particle.mesh.material.opacity = 0;
      }
    }
  }
}