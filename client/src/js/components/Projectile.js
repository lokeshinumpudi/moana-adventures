import * as THREE from 'three';
import { v4 as uuidv4 } from 'uuid';

export class Projectile {
  constructor(position, direction, size = 0.3, speed = 30) {
    // Projectile properties
    this.speed = speed;
    this.size = size;
    this.collisionRadius = size * 1.5;
    this.distanceTraveled = 0;
    this.velocity = direction.clone().normalize().multiplyScalar(this.speed);
    this.isMachineGun = size < 0.2; // Determine if it's a machine gun projectile
    
    // Create mesh group
    this.mesh = new THREE.Group();
    this.mesh.position.copy(position);
    
    // Create the main projectile geometry
    const geometry = new THREE.SphereGeometry(size, 8, 8);
    const material = this.isMachineGun 
      ? new THREE.MeshStandardMaterial({ 
          color: 0xFFC107, 
          emissive: 0xFF9800,
          emissiveIntensity: 0.5
        })
      : new THREE.MeshStandardMaterial({ 
          color: 0x333333,
          roughness: 0.3,
          metalness: 0.8
        });
        
    this.projectileMesh = new THREE.Mesh(geometry, material);
    this.mesh.add(this.projectileMesh);
    
    // Enable shadows
    this.projectileMesh.castShadow = true;
    
    // Add trail effect for projectiles
    if (this.isMachineGun) {
      // Smaller, bright trail for machine gun bullets
      this.createBulletTrail();
    } else {
      // Smoke trail for cannonballs
      this.createSmokeTrail();
    }
    
    // Unique ID for this projectile
    this.id = uuidv4();
    
    // Create time of creation for effects
    this.creationTime = Date.now();
  }
  
  createBulletTrail() {
    // Create a glowing trail behind the bullet
    const trailGeometry = new THREE.CylinderGeometry(0.01, this.size / 3, 1, 8);
    trailGeometry.rotateX(Math.PI / 2);
    
    const trailMaterial = new THREE.MeshBasicMaterial({
      color: 0xFFCC80,
      transparent: true,
      opacity: 0.7
    });
    
    this.trail = new THREE.Mesh(trailGeometry, trailMaterial);
    this.trail.position.z = 0.5; // Position behind bullet
    this.mesh.add(this.trail);
    
    // Add point light for muzzle flash effect that fades
    const light = new THREE.PointLight(0xFFA000, 1, 5);
    light.position.set(0, 0, 0);
    this.mesh.add(light);
    this.light = light;
  }
  
  createSmokeTrail() {
    // For cannon balls, create smoke particles
    const smokeCount = 5;
    this.smokeParticles = [];
    
    for (let i = 0; i < smokeCount; i++) {
      const smokeGeometry = new THREE.SphereGeometry(this.size / 2, 4, 4);
      const smokeMaterial = new THREE.MeshBasicMaterial({
        color: 0x888888,
        transparent: true,
        opacity: 0.4
      });
      
      const smoke = new THREE.Mesh(smokeGeometry, smokeMaterial);
      smoke.visible = false; // Will be made visible during flight
      smoke.scale.set(0.1, 0.1, 0.1);
      smoke.userData = {
        offset: new THREE.Vector3(
          (Math.random() - 0.5) * 0.1,
          (Math.random() - 0.5) * 0.1,
          (Math.random() - 0.5) * 0.1 - 0.2 * i
        ),
        age: 0,
        maxAge: 1.0 + Math.random() * 0.5
      };
      
      this.mesh.add(smoke);
      this.smokeParticles.push(smoke);
    }
  }
  
  update(delta) {
    // Update position based on velocity
    const movement = this.velocity.clone().multiplyScalar(delta);
    this.mesh.position.add(movement);
    
    // Track distance traveled
    this.distanceTraveled += movement.length();
    
    // Add gravity effect
    this.velocity.y -= 9.8 * delta;
    
    // Add rotation for visual effect
    this.projectileMesh.rotation.x += 2 * delta;
    this.projectileMesh.rotation.z += 3 * delta;
    
    // Update special effects based on projectile type
    if (this.isMachineGun) {
      this.updateBulletTrail(delta);
    } else {
      this.updateSmokeTrail(delta);
    }
  }
  
  updateBulletTrail(delta) {
    // Update the bullet trail to fade over time
    if (this.trail) {
      // Scale trail based on velocity
      const speed = this.velocity.length();
      this.trail.scale.z = speed * delta * 2;
      
      // Align trail with velocity
      if (speed > 0.1) {
        const direction = this.velocity.clone().normalize();
        this.trail.lookAt(
          this.mesh.position.x - direction.x,
          this.mesh.position.y - direction.y,
          this.mesh.position.z - direction.z
        );
      }
    }
    
    // Fade light intensity after initial firing
    if (this.light) {
      const age = (Date.now() - this.creationTime) / 1000;
      if (age < 0.1) {
        this.light.intensity = 2;
      } else {
        this.light.intensity = Math.max(0, 2 - age * 4);
      }
    }
  }
  
  updateSmokeTrail(delta) {
    if (!this.smokeParticles) return;
    
    // Update smoke trail
    for (const smoke of this.smokeParticles) {
      // Increment age
      smoke.userData.age += delta;
      
      // Make visible when needed
      if (smoke.userData.age > 0.1 && !smoke.visible) {
        smoke.visible = true;
        
        // Position relative to cannonball but a bit behind
        smoke.position.copy(smoke.userData.offset);
      }
      
      if (smoke.visible) {
        // Grow over time
        const scale = 0.5 + smoke.userData.age;
        smoke.scale.set(scale, scale, scale);
        
        // Fade out
        const fadeAge = smoke.userData.maxAge * 0.5;
        if (smoke.userData.age > fadeAge) {
          const opacity = Math.max(0, 0.4 * (1 - (smoke.userData.age - fadeAge) / fadeAge));
          smoke.material.opacity = opacity;
        }
        
        // Drift outward and upward
        smoke.position.y += delta * 0.2;
        smoke.position.x += (Math.random() - 0.5) * delta * 0.1;
        smoke.position.z += (Math.random() - 0.5) * delta * 0.1;
      }
    }
  }
} 