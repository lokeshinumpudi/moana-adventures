import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class Island {
  constructor(options = {}) {
    // Island properties
    this._position = options.position || new THREE.Vector3(0, 0, 0);
    this._radius = options.radius || 40 + Math.random() * 30;
    this.height = options.height || 25 + Math.random() * 10;
    this.detail = options.detail || 2;
    this.color = options.color || new THREE.Color(0x8BC34A);
    this.beachColor = options.beachColor || new THREE.Color(0xD2B48C);
    this.vegetation = options.vegetation !== false;
    this.dock = options.dock !== false;
    this.collisionMargin = 5; // Extra margin for collision detection
    this.dockPosition = null; // Will store dock position for ship parking
    this.dockDirection = null; // Direction the dock is facing
    this.id = options.id || `island_${Math.floor(Math.random() * 10000)}`;
    this.name = options.name || ''; // Custom island name
    this.advertiser = options.advertiser || null; // Advertiser information
    this.customModel = options.customModel || null; // Custom 3D model for advertising
    this.physicsBody = null;

    // Create mesh
    this.mesh = new THREE.Group();
    this.mesh.position.copy(this._position);
    this.mesh.userData.type = 'island';
    this.mesh.userData.id = this.id;
    this.mesh.userData.name = this.name;

    // Create island
    this.createIsland();

    // Add vegetation if enabled
    if (this.vegetation) {
      this.addVegetation();
    }

    // Add dock if enabled
    if (this.dock) {
      this.addDock();
    }

    // Add custom advertising model if provided
    if (this.customModel) {
      this.addCustomModel();
    } else if (this.advertiser) {
      // Create default advertising model if no custom model provided
      this.createDefaultAdvertising();
    }
  }

  createIsland() {
    // Create a more realistic island using noise-based displacement
    const segments = 64;

    // Use a cylinder with a flat top for the main island body
    const islandGeometry = new THREE.CylinderGeometry(this._radius, this._radius * 1.2, this.height, segments);

    // Apply noise to vertices to create a more natural shape
    const vertices = islandGeometry.attributes.position.array;

    // First pass: apply gentle displacement to sides only
    for (let i = 0; i < vertices.length; i += 3) {
      // Only modify vertices on the sides, not the top face
      if (vertices[i + 1] > -this.height / 2 && vertices[i + 1] < this.height / 2 - 0.1) {
        // Calculate distance from center
        const x = vertices[i];
        const z = vertices[i + 2];
        const distanceFromCenter = Math.sqrt(x * x + z * z);

        // Apply more displacement to edges
        const edgeFactor = Math.min(1, distanceFromCenter / this._radius);

        // Apply random displacement (only to x and z, not y)
        const noiseScale = 0.1 * this._radius * edgeFactor;
        vertices[i] += (Math.random() - 0.5) * noiseScale;
        vertices[i + 2] += (Math.random() - 0.5) * noiseScale;
      }
    }

    // Update geometry
    islandGeometry.computeVertexNormals();

    // Create materials for the island
    const islandMaterial = new THREE.MeshStandardMaterial({
      color: this.color,
      roughness: 0.8,
      metalness: 0.1,
    });

    const beachMaterial = new THREE.MeshStandardMaterial({
      color: this.beachColor,
      roughness: 0.9,
      metalness: 0.0,
    });

    // Create mesh for the island base
    const islandMesh = new THREE.Mesh(islandGeometry, [islandMaterial, beachMaterial]);
    islandMesh.position.y = -this.height / 2;
    islandMesh.castShadow = true;
    islandMesh.receiveShadow = true;

    // Add to group
    this.mesh.add(islandMesh);
    this.islandMesh = islandMesh;

    // Create a flat terrain for the top of the island
    const terrainGeometry = new THREE.CircleGeometry(this._radius * 0.95, segments);
    terrainGeometry.rotateX(-Math.PI / 2);

    // Apply very subtle height variation to terrain
    const terrainVertices = terrainGeometry.attributes.position.array;
    for (let i = 0; i < terrainVertices.length; i += 3) {
      // Add very slight height variation (max 0.3 units)
      terrainVertices[i + 1] = Math.random() * 0.3;
    }

    terrainGeometry.computeVertexNormals();

    // Create terrain material with a grid pattern to make height differences visible
    const terrainMaterial = new THREE.MeshStandardMaterial({
      color: this.color,
      roughness: 0.7,
      metalness: 0.1,
      flatShading: false,
    });

    // Create mesh for the terrain top
    const terrainMesh = new THREE.Mesh(terrainGeometry, terrainMaterial);
    terrainMesh.position.y = 0.1; // Slightly above water level
    terrainMesh.receiveShadow = true;

    // Add to group
    this.mesh.add(terrainMesh);
    this.terrainMesh = terrainMesh;

    // Add a visible beach ring around the island
    const beachRingGeometry = new THREE.RingGeometry(this._radius * 0.95, this._radius * 1.15, segments);
    beachRingGeometry.rotateX(-Math.PI / 2);

    // Keep beach flat
    const beachVertices = beachRingGeometry.attributes.position.array;
    for (let i = 0; i < beachVertices.length; i += 3) {
      // Set all beach vertices to same height
      beachVertices[i + 1] = 0.05;
    }

    beachRingGeometry.computeVertexNormals();

    const beachRingMaterial = new THREE.MeshStandardMaterial({
      color: this.beachColor,
      roughness: 0.9,
      metalness: 0.0,
    });

    const beachRing = new THREE.Mesh(beachRingGeometry, beachRingMaterial);
    beachRing.position.y = 0.05; // Just above water
    beachRing.receiveShadow = true;

    this.mesh.add(beachRing);

    // Add a path from the dock to the center of the island
    if (this.dock) {
      this.addPathToCenterFromDock();
    }
  }

  addVegetation() {
    // Add trees and vegetation to the island
    const treeCount = Math.floor(this._radius / 5);

    // Create tree geometries
    const trunkGeometry = new THREE.CylinderGeometry(0.5, 0.7, 5, 8);
    const leavesGeometry = new THREE.ConeGeometry(3, 6, 8);

    // Create tree materials
    const trunkMaterial = new THREE.MeshStandardMaterial({
      color: 0x8B4513,
      roughness: 0.9,
      metalness: 0.0,
    });

    const leavesMaterial = new THREE.MeshStandardMaterial({
      color: 0x2E7D32,
      roughness: 0.8,
      metalness: 0.0,
    });

    // Add trees
    for (let i = 0; i < treeCount; i++) {
      // Random position within island radius
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * (this._radius * 0.7);
      const x = Math.sin(angle) * distance;
      const z = Math.cos(angle) * distance;

      // Create tree
      const tree = new THREE.Group();

      // Create trunk
      const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
      trunk.position.y = 2.5;
      trunk.castShadow = true;
      tree.add(trunk);

      // Create leaves
      const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
      leaves.position.y = 8;
      leaves.castShadow = true;
      tree.add(leaves);

      // Position tree
      tree.position.set(x, 0, z);

      // Add to island
      this.mesh.add(tree);
    }

    // Add some rocks
    const rockCount = Math.floor(this._radius / 8);
    const rockGeometry = new THREE.DodecahedronGeometry(1, 0);
    const rockMaterial = new THREE.MeshStandardMaterial({
      color: 0x808080,
      roughness: 0.9,
      metalness: 0.2,
    });

    for (let i = 0; i < rockCount; i++) {
      // Random position within island radius
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * (this._radius * 0.8);
      const x = Math.sin(angle) * distance;
      const z = Math.cos(angle) * distance;

      // Create rock
      const rock = new THREE.Mesh(rockGeometry, rockMaterial);
      rock.position.set(x, 0, z);
      rock.scale.set(
        0.5 + Math.random() * 1.5,
        0.5 + Math.random() * 1.5,
        0.5 + Math.random() * 1.5,
      );
      rock.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI,
      );
      rock.castShadow = true;

      // Add to island
      this.mesh.add(rock);
    }
  }

  addDock() {
    // Create a wooden dock extending from the island
    const dockAngle = Math.random() * Math.PI * 2;
    const dockLength = 20;
    const dockWidth = 6;

    // Create dock geometry
    const dockGeometry = new THREE.BoxGeometry(dockWidth, 1, dockLength);
    const dockMaterial = new THREE.MeshStandardMaterial({
      color: 0x8B4513,
      roughness: 0.9,
      metalness: 0.0,
    });

    // Create dock mesh
    const dock = new THREE.Mesh(dockGeometry, dockMaterial);
    dock.castShadow = true;
    dock.receiveShadow = true;

    // Position dock
    const dockDirection = new THREE.Vector3(Math.sin(dockAngle), 0, Math.cos(dockAngle));
    const dockPosition = dockDirection.clone().multiplyScalar(this._radius);
    dock.position.copy(dockPosition);
    dock.position.y = 0.5;

    // Rotate dock to face outward
    dock.rotation.y = dockAngle;

    // Add to island
    this.mesh.add(dock);

    // Store dock position and direction for ship docking
    this.dockPosition = new THREE.Vector3(
      this._position.x + dockPosition.x + dockDirection.x * (dockLength / 2),
      0,
      this._position.z + dockPosition.z + dockDirection.z * (dockLength / 2),
    );

    this.dockDirection = dockDirection;

    // Add some posts to the dock
    const postGeometry = new THREE.CylinderGeometry(0.4, 0.4, 3, 8);
    const postMaterial = new THREE.MeshStandardMaterial({
      color: 0x6D4C41,
      roughness: 0.9,
      metalness: 0.0,
    });

    // Add posts at corners
    for (let i = 0; i < 4; i++) {
      const post = new THREE.Mesh(postGeometry, postMaterial);

      // Position posts at corners
      const xOffset = (i % 2 === 0) ? dockWidth / 2 - 0.5 : -dockWidth / 2 + 0.5;
      const zOffset = (i < 2) ? dockLength / 2 - 0.5 : -dockLength / 2 + 0.5;

      post.position.set(
        dockPosition.x + Math.sin(dockAngle) * zOffset + Math.cos(dockAngle) * xOffset,
        1.5,
        dockPosition.z + Math.cos(dockAngle) * zOffset - Math.sin(dockAngle) * xOffset,
      );

      post.castShadow = true;
      this.mesh.add(post);
    }
  }

  addPathToCenterFromDock() {
    if (!this.dockPosition) return;

    // Calculate direction from dock to center
    const center = new THREE.Vector3(0, 0, 0);
    const direction = new THREE.Vector3()
      .subVectors(center, this.dockPosition.clone().sub(this._position))
      .normalize();

    // Create path geometry
    const pathLength = this._radius * 0.8;
    const pathWidth = 3;
    const pathGeometry = new THREE.PlaneGeometry(pathWidth, pathLength);

    // Rotate and position path
    pathGeometry.rotateX(-Math.PI / 2);

    // Create path material
    const pathMaterial = new THREE.MeshStandardMaterial({
      color: 0x8B4513, // Brown color for path
      roughness: 0.9,
      metalness: 0.0,
    });

    // Create path mesh
    const pathMesh = new THREE.Mesh(pathGeometry, pathMaterial);

    // Position path from dock to center
    const angle = Math.atan2(direction.x, direction.z);
    pathMesh.rotation.y = angle;

    // Position at midpoint between dock and center
    const midpoint = this.dockPosition.clone().sub(this._position)
      .add(direction.clone().multiplyScalar(pathLength / 2));
    pathMesh.position.set(midpoint.x, 0.2, midpoint.z);

    // Add to island
    this.mesh.add(pathMesh);
  }

  createDefaultAdvertising() {
    if (this.advertiser === 'lokeshinumpudi.com') {
      this.createLokiIslandSign();
      return;
    }

    // Create a billboard-style sign
    const signHeight = this.height * 1.5;
    const signWidth = this._radius * 0.8;
    const signDepth = 0.5;

    // Create the sign geometry
    const signGeometry = new THREE.BoxGeometry(signWidth, signHeight, signDepth);
    const signMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.5,
      metalness: 0.2
    });

    const sign = new THREE.Mesh(signGeometry, signMaterial);
    sign.position.y = signHeight / 2;
    sign.castShadow = true;
    sign.receiveShadow = true;

    // Create text geometry for the advertiser name
    const loader = new THREE.FontLoader();
    loader.load('/fonts/helvetiker_regular.typeface.json', (font) => {
      const textGeometry = new THREE.TextGeometry(this.name, {
        font: font,
        size: signWidth * 0.1,
        height: 0.2,
        curveSegments: 12,
        bevelEnabled: true,
        bevelThickness: 0.03,
        bevelSize: 0.02,
        bevelOffset: 0,
        bevelSegments: 5
      });

      // Center the text
      textGeometry.computeBoundingBox();
      const textWidth = textGeometry.boundingBox.max.x - textGeometry.boundingBox.min.x;
      const textHeight = textGeometry.boundingBox.max.y - textGeometry.boundingBox.min.y;

      const textMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x2196F3,
        roughness: 0.3,
        metalness: 0.7
      });

      const textMesh = new THREE.Mesh(textGeometry, textMaterial);
      textMesh.position.set(-textWidth/2, signHeight/2, signDepth/2 + 0.1);
      textMesh.castShadow = true;

      sign.add(textMesh);
    });

    // Add support poles
    const poleGeometry = new THREE.CylinderGeometry(0.3, 0.3, signHeight * 1.5, 8);
    const poleMaterial = new THREE.MeshStandardMaterial({
      color: 0x666666,
      roughness: 0.7,
      metalness: 0.3
    });

    // Add two poles
    const pole1 = new THREE.Mesh(poleGeometry, poleMaterial);
    pole1.position.set(-signWidth/3, -signHeight/4, 0);
    pole1.castShadow = true;
    sign.add(pole1);

    const pole2 = new THREE.Mesh(poleGeometry, poleMaterial);
    pole2.position.set(signWidth/3, -signHeight/4, 0);
    pole2.castShadow = true;
    sign.add(pole2);

    // Add to island at a good position
    sign.position.z = this._radius * 0.3;
    this.mesh.add(sign);
  }

  createLokiIslandSign() {
    // Create a more elaborate sign for Loki's Island
    const signHeight = this.height * 2;
    const signWidth = this._radius * 1.2;
    
    // Create a fancy base platform
    const baseGeometry = new THREE.CylinderGeometry(signWidth/2, signWidth/2 * 1.2, signHeight/10, 8);
    const baseMaterial = new THREE.MeshStandardMaterial({
      color: 0x1976D2,
      roughness: 0.3,
      metalness: 0.8
    });
    
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = this.height + signHeight/20;
    base.castShadow = true;
    base.receiveShadow = true;
    
    // Add glowing effect using emissive material
    const glowGeometry = new THREE.CylinderGeometry(signWidth/2 * 1.05, signWidth/2 * 1.25, signHeight/10, 8);
    const glowMaterial = new THREE.MeshStandardMaterial({
      color: 0x2196F3,
      emissive: 0x2196F3,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.3
    });
    
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.copy(base.position);
    
    // Create text for "LOKI'S ISLAND"
    const loader = new THREE.FontLoader();
    loader.load('/fonts/helvetiker_bold.typeface.json', (font) => {
      const textGeometry = new THREE.TextGeometry("LOKI'S\nISLAND", {
        font: font,
        size: signWidth * 0.15,
        height: signWidth * 0.05,
        curveSegments: 12,
        bevelEnabled: true,
        bevelThickness: signWidth * 0.01,
        bevelSize: signWidth * 0.005,
        bevelOffset: 0,
        bevelSegments: 5
      });
      
      // Center the text
      textGeometry.computeBoundingBox();
      const textWidth = textGeometry.boundingBox.max.x - textGeometry.boundingBox.min.x;
      const textHeight = textGeometry.boundingBox.max.y - textGeometry.boundingBox.min.y;
      
      const textMaterial = new THREE.MeshStandardMaterial({
        color: 0xFFFFFF,
        roughness: 0.1,
        metalness: 0.9,
        emissive: 0x4FC3F7,
        emissiveIntensity: 0.2
      });
      
      const textMesh = new THREE.Mesh(textGeometry, textMaterial);
      textMesh.position.set(-textWidth/2, signHeight/10, -textWidth/4);
      textMesh.castShadow = true;
      base.add(textMesh);
      
      // Add URL text below
      const urlGeometry = new THREE.TextGeometry("lokeshinumpudi.com", {
        font: font,
        size: signWidth * 0.08,
        height: signWidth * 0.02,
        curveSegments: 12,
        bevelEnabled: true,
        bevelThickness: signWidth * 0.005,
        bevelSize: signWidth * 0.002,
        bevelOffset: 0,
        bevelSegments: 5
      });
      
      urlGeometry.computeBoundingBox();
      const urlWidth = urlGeometry.boundingBox.max.x - urlGeometry.boundingBox.min.x;
      
      const urlMaterial = new THREE.MeshStandardMaterial({
        color: 0x81D4FA,
        roughness: 0.2,
        metalness: 0.8,
        emissive: 0x81D4FA,
        emissiveIntensity: 0.3
      });
      
      const urlMesh = new THREE.Mesh(urlGeometry, urlMaterial);
      urlMesh.position.set(-urlWidth/2, -textHeight/2, -textWidth/4);
      urlMesh.castShadow = true;
      base.add(urlMesh);
    });
    
    // Add floating particles effect
    const particleCount = 50;
    const particleGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const particleMaterial = new THREE.MeshBasicMaterial({
      color: 0x81D4FA,
      transparent: true,
      opacity: 0.6
    });
    
    for (let i = 0; i < particleCount; i++) {
      const particle = new THREE.Mesh(particleGeometry, particleMaterial);
      const angle = (i / particleCount) * Math.PI * 2;
      const radius = signWidth/2 * (0.8 + Math.random() * 0.4);
      particle.position.set(
        Math.cos(angle) * radius,
        Math.random() * signHeight/2,
        Math.sin(angle) * radius
      );
      base.add(particle);
      
      // Animate particles
      const speed = 0.2 + Math.random() * 0.3;
      const startY = particle.position.y;
      const amplitude = 0.5 + Math.random() * 0.5;
      
      function animateParticle() {
        particle.position.y = startY + Math.sin(Date.now() * 0.001 * speed) * amplitude;
        requestAnimationFrame(animateParticle);
      }
      animateParticle();
    }
    
    // Add everything to the island
    this.mesh.add(base);
    this.mesh.add(glow);
  }

  addCustomModel() {
    // Load and add custom 3D model
    const loader = new THREE.GLTFLoader();
    loader.load(this.customModel, (gltf) => {
      const model = gltf.scene;
      
      // Scale and position the model appropriately
      const scale = this._radius * 0.02; // Adjust scale based on island size
      model.scale.set(scale, scale, scale);
      
      // Position above the island
      model.position.y = this.height;
      
      // Add to island mesh
      this.mesh.add(model);
    }, undefined, (error) => {
      console.error('Error loading custom model:', error);
      // Fallback to default advertising if custom model fails
      this.createDefaultAdvertising();
    });
  }

  setupPhysics(physicsManager) {
    if (!physicsManager) return;

    // Create a physics body for the island
    this.physicsBody = physicsManager.addBody(this.islandMesh, {
      shape: 'cone',
      mass: 0, // Static body
    });

    return this.physicsBody;
  }

  getHeightAt(x, z) {
    // Calculate distance from island center
    const dx = x - this._position.x;
    const dz = z - this._position.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    // If outside island radius, return 0
    if (distance > this._radius) {
      return 0;
    }

    // Return a constant height with very minimal variation
    return 0.2 + Math.random() * 0.1;
  }

  update(delta, time) {
    // Any animation or updates can go here
  }

  get position() {
    return this._position;
  }

  set position(value) {
    this._position.copy(value);
    this.mesh.position.copy(value);

    if (this.physicsBody) {
      this.physicsBody.position.copy(value);
    }
  }

  get radius() {
    return this._radius;
  }

  set radius(value) {
    this._radius = value;
  }

  checkCollision(position, radius = 0) {
    // Calculate distance from island center
    const dx = position.x - this._position.x;
    const dz = position.z - this._position.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    // Check if within island radius plus collision margin
    return distance < (this._radius + radius + this.collisionMargin);
  }

  isNearDock(position, maxDistance = 15) {
    if (!this.dockPosition) return false;

    // Calculate distance from dock
    const dx = position.x - this.dockPosition.x;
    const dz = position.z - this.dockPosition.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    return distance < maxDistance;
  }

  getDockingInfo() {
    return {
      position: this.dockPosition.clone(),
      direction: this.dockDirection.clone(),
    };
  }
}