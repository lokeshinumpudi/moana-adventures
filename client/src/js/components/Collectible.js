import * as THREE from 'three';

export class Collectible {
  constructor(options = {}) {
    this.id = options.id || `collectible_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    this.type = options.type || 'treasure';
    this.value = options.value || 10;
    this.position = options.position || new THREE.Vector3();
    this.islandId = options.islandId || null;
    this.mesh = null;

    this.createMesh();
  }

  createMesh() {
    // Create different meshes based on collectible type
    switch (this.type) {
    case 'treasure':
      this.createTreasure();
      break;
    case 'gem':
      this.createGem();
      break;
    case 'fruit':
      this.createFruit();
      break;
    case 'wood':
      this.createWood();
      break;
    case 'powerup_health':
      this.createPowerup(0xff0000); // Red for health
      break;
    case 'powerup_speed':
      this.createPowerup(0x00ffff); // Cyan for speed
      break;
    case 'powerup_shield':
      this.createPowerup(0x0000ff); // Blue for shield
      break;
    case 'powerup_weapon':
      this.createPowerup(0xffff00); // Yellow for weapon
      break;
    default:
      this.createGenericCollectible();
    }

    // Set position
    this.mesh.position.copy(this.position);

    // Add animation
    this.animationOffset = Math.random() * Math.PI * 2;
  }

  createTreasure() {
    // Create a treasure chest
    const boxGeometry = new THREE.BoxGeometry(1, 0.7, 0.7);
    const boxMaterial = new THREE.MeshStandardMaterial({
      color: 0x8B4513, // Brown
      roughness: 0.8,
      metalness: 0.2,
    });

    this.mesh = new THREE.Mesh(boxGeometry, boxMaterial);

    // Add lid
    const lidGeometry = new THREE.BoxGeometry(1, 0.2, 0.7);
    const lidMaterial = new THREE.MeshStandardMaterial({
      color: 0x8B4513, // Brown
      roughness: 0.8,
      metalness: 0.2,
    });

    const lid = new THREE.Mesh(lidGeometry, lidMaterial);
    lid.position.y = 0.45;
    this.mesh.add(lid);

    // Add gold inside
    const goldGeometry = new THREE.SphereGeometry(0.2, 8, 8);
    const goldMaterial = new THREE.MeshStandardMaterial({
      color: 0xFFD700, // Gold
      roughness: 0.3,
      metalness: 0.8,
    });

    const gold = new THREE.Mesh(goldGeometry, goldMaterial);
    gold.position.y = 0.2;
    this.mesh.add(gold);

    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
  }

  createGem() {
    // Create a gemstone
    const gemGeometry = new THREE.OctahedronGeometry(0.5);
    const gemMaterial = new THREE.MeshStandardMaterial({
      color: 0x9C27B0, // Purple
      roughness: 0.1,
      metalness: 0.9,
      transparent: true,
      opacity: 0.8,
    });

    this.mesh = new THREE.Mesh(gemGeometry, gemMaterial);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
  }

  createFruit() {
    // Create a fruit (apple)
    const fruitGeometry = new THREE.SphereGeometry(0.4, 16, 16);
    const fruitMaterial = new THREE.MeshStandardMaterial({
      color: 0xE91E63, // Pink/red
      roughness: 0.8,
      metalness: 0.1,
    });

    this.mesh = new THREE.Mesh(fruitGeometry, fruitMaterial);

    // Add stem
    const stemGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.2, 8);
    const stemMaterial = new THREE.MeshStandardMaterial({
      color: 0x795548, // Brown
      roughness: 0.9,
      metalness: 0.1,
    });

    const stem = new THREE.Mesh(stemGeometry, stemMaterial);
    stem.position.y = 0.4;
    this.mesh.add(stem);

    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
  }

  createWood() {
    // Create a log
    const logGeometry = new THREE.CylinderGeometry(0.3, 0.3, 1.5, 8);
    const logMaterial = new THREE.MeshStandardMaterial({
      color: 0x8D6E63, // Wood brown
      roughness: 0.9,
      metalness: 0.1,
    });

    this.mesh = new THREE.Mesh(logGeometry, logMaterial);
    this.mesh.rotation.x = Math.PI / 2; // Lay it flat
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
  }

  createGenericCollectible() {
    // Create a generic collectible (glowing orb)
    const geometry = new THREE.SphereGeometry(0.4, 16, 16);
    const material = new THREE.MeshStandardMaterial({
      color: 0x4CAF50, // Green
      emissive: 0x4CAF50,
      emissiveIntensity: 0.5,
      roughness: 0.3,
      metalness: 0.7,
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
  }

  createPowerup(color) {
    // Create a glowing powerup orb
    const geometry = new THREE.SphereGeometry(0.5, 16, 16);
    const material = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.5,
      roughness: 0.2,
      metalness: 0.8,
    });

    this.mesh = new THREE.Mesh(geometry, material);

    // Add glow effect
    const glowGeometry = new THREE.SphereGeometry(0.7, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.3,
    });

    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    this.mesh.add(glowMesh);

    // Add user data for identification
    this.mesh.userData.type = this.type;
    this.mesh.userData.id = this.id;

    // Make it float higher
    this.mesh.position.y += 1.5;
  }

  update(delta, time) {
    if (!this.mesh) return;

    // Hover animation
    this.mesh.position.y = this.position.y + Math.sin(time * 2 + this.animationOffset) * 0.2;

    // Slow rotation
    this.mesh.rotation.y += delta * 0.5;
  }
}