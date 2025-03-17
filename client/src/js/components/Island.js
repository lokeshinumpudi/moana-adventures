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
    this.physicsBody = null;
    
    // Custom naming and sponsorship properties
    this.customName = options.customName || null;
    this.isSponsored = options.isSponsored || false;
    this.sponsorData = options.sponsorData || null;
    this.hasSignage = options.hasSignage !== false && (this.customName || this.isSponsored);

    // Create mesh
    this.mesh = new THREE.Group();
    this.mesh.position.copy(this._position);
    this.mesh.userData.type = 'island';
    this.mesh.userData.id = this.id;
    
    // Store custom name in userData for easy access
    if (this.customName) {
      this.mesh.userData.customName = this.customName;
    }
    
    if (this.isSponsored) {
      this.mesh.userData.isSponsored = true;
    }

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
    
    // Add sponsor signage if this is a sponsored island
    if (this.hasSignage) {
      this.addSignage();
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
    // Animate the logo if it exists
    if (this.logoContainer) {
      this.animateLogo(delta, time);
    }
  }

  animateLogo(delta, time) {
    const container = this.logoContainer;
    const data = container.userData.animationData;
    
    if (!data) return;
    
    // Rotate the logo
    container.rotation.y += delta * data.rotationSpeed;
    
    // Make the logo bounce
    const bounceOffset = Math.sin(time * data.bounceSpeed) * data.bounceHeight;
    container.position.y = data.originalY || (container.position.y - bounceOffset);
    
    // Store the original Y position if not already stored
    if (!data.originalY) {
      data.originalY = container.position.y;
    }
    
    // Pulse the glow effect
    const glow = container.children.find(child => child.material && child.material.opacity !== undefined);
    if (glow) {
      glow.material.opacity = 0.1 + 0.1 * Math.sin(time * data.glowPulseSpeed);
    }
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

  addSignage() {
    // Create a 3D sign for the island
    const signHeight = this.height + 15; // Position above the island
    const signScale = this._radius * 0.1; // Scale relative to island size
    
    // Create a sign post
    const postGeometry = new THREE.CylinderGeometry(0.5, 0.5, signHeight, 8);
    const postMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 }); // Brown wood color
    const post = new THREE.Mesh(postGeometry, postMaterial);
    post.position.set(0, signHeight / 2, 0);
    
    // Create the sign board
    const signWidth = 8 * signScale;
    const signBoardGeometry = new THREE.BoxGeometry(signWidth, 4 * signScale, 0.5);
    const signBoardMaterial = new THREE.MeshStandardMaterial({ color: 0xEEEEEE });
    const signBoard = new THREE.Mesh(signBoardGeometry, signBoardMaterial);
    signBoard.position.set(0, signHeight, 0);
    
    // Create text for the sign using a canvas texture
    if (this.customName) {
      const textTexture = this.createTextTexture(this.customName);
      const textMaterial = new THREE.MeshBasicMaterial({ 
        map: textTexture, 
        transparent: true,
        side: THREE.DoubleSide
      });
      
      // Create a plane slightly in front of the sign board to show the text
      const textGeometry = new THREE.PlaneGeometry(signWidth * 0.95, 3.8 * signScale);
      const textMesh = new THREE.Mesh(textGeometry, textMaterial);
      textMesh.position.z = 0.3;
      signBoard.add(textMesh);
      
      // Add a second text plane on the back side
      const textMeshBack = new THREE.Mesh(textGeometry, textMaterial.clone());
      textMeshBack.position.z = -0.3;
      textMeshBack.rotation.y = Math.PI; // Rotate to face the opposite way
      signBoard.add(textMeshBack);
    }
    
    // If this is a sponsored island, add some special effects
    if (this.isSponsored) {
      // Add decorative details to the sign
      const border = new THREE.BoxGeometry(signWidth + 0.5, 4.5 * signScale, 0.2);
      const borderMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xFFD700, // Gold color for sponsored islands
        metalness: 0.8,
        roughness: 0.2
      });
      const borderMesh = new THREE.Mesh(border, borderMaterial);
      borderMesh.position.z = -0.1; // Slightly behind the main sign
      signBoard.add(borderMesh);
      
      // Add small spotlights to illuminate the sign
      const spotLight1 = new THREE.PointLight(0xFFFF99, 1, 20);
      spotLight1.position.set(signWidth/2, 2, 3);
      const spotLight2 = new THREE.PointLight(0xFFFF99, 1, 20);
      spotLight2.position.set(-signWidth/2, 2, 3);
      
      signBoard.add(spotLight1);
      signBoard.add(spotLight2);
      
      // Add website URL to the sign if provided in sponsorData
      if (this.sponsorData && this.sponsorData.url) {
        const urlTexture = this.createTextTexture(this.sponsorData.url, 24, "#3366CC");
        const urlMaterial = new THREE.MeshBasicMaterial({ 
          map: urlTexture, 
          transparent: true,
          side: THREE.DoubleSide
        });
        
        // Create a plane slightly below the name text
        const urlGeometry = new THREE.PlaneGeometry(signWidth * 0.8, signScale);
        const urlMesh = new THREE.Mesh(urlGeometry, urlMaterial);
        urlMesh.position.y = -1.5 * signScale;
        urlMesh.position.z = 0.31;
        signBoard.add(urlMesh);
        
        // Add the URL to the back side as well
        const urlMeshBack = new THREE.Mesh(urlGeometry, urlMaterial.clone());
        urlMeshBack.position.y = -1.5 * signScale;
        urlMeshBack.position.z = -0.31;
        urlMeshBack.rotation.y = Math.PI; // Rotate to face the opposite way
        signBoard.add(urlMeshBack);
      }
      
      // Add custom 3D logo for Loki's Island
      if (this.customName === "Loki's Island") {
        this.addLokiLogo(signBoard, signWidth, signScale);
      }
    }
    
    // Add support beams for the sign
    const beam1 = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, signHeight * 0.3, 0.8),
      postMaterial
    );
    beam1.position.set(signWidth * 0.3, signHeight * 0.85, 0);
    beam1.rotation.z = -Math.PI * 0.1;
    
    const beam2 = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, signHeight * 0.3, 0.8),
      postMaterial
    );
    beam2.position.set(-signWidth * 0.3, signHeight * 0.85, 0);
    beam2.rotation.z = Math.PI * 0.1;
    
    // Add components to the main mesh
    this.mesh.add(post);
    this.mesh.add(signBoard);
    this.mesh.add(beam1);
    this.mesh.add(beam2);
    
    // Position the sign near the highest point of the island but not at the center
    const signX = this._radius * 0.3;
    const signZ = -this._radius * 0.3;
    post.position.x = signX;
    post.position.z = signZ;
    signBoard.position.x = signX;
    signBoard.position.z = signZ;
    beam1.position.x = signX;
    beam1.position.z = signZ;
    beam2.position.x = signX;
    beam2.position.z = signZ;
    
    // Rotate the sign to face outward from the center of the island
    const angle = Math.atan2(signZ, signX) + Math.PI;
    signBoard.rotation.y = angle;
  }
  
  createTextTexture(text, fontSize = 36, color = "#000000", backgroundColor = "rgba(255,255,255,0)") {
    // Create canvas to draw text
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas size
    canvas.width = 512;
    canvas.height = 128;
    
    // Clear canvas
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw text
    ctx.font = `bold ${fontSize}px Arial, sans-serif`;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    return texture;
  }
  
  // Static method to create a sponsored island for a specific advertiser
  static createSponsoredIsland(options) {
    // Ensure options has the required properties
    options = options || {};
    options.isSponsored = true;
    
    // Create more interesting sponsored islands
    const sponsoredColor = options.color || new THREE.Color(0x7CB342); // Slightly different green
    options.color = sponsoredColor;
    
    // Mark terrain as smoother and more pleasant
    options.detail = options.detail || 1.5; // Less noisy terrain
    
    // Create larger vegetation for sponsored islands to make them stand out
    const originalVegetation = options.vegetation;
    options.vegetation = false; // We'll add custom vegetation later
    
    // Create the island instance
    const island = new Island(options);
    
    // Add custom vegetation if original options had vegetation enabled
    if (originalVegetation !== false) {
      island.addEnhancedVegetation();
    }
    
    return island;
  }
  
  addEnhancedVegetation() {
    // Add more interesting, lusher vegetation for sponsored islands
    
    // Use the existing vegetation method first
    this.addVegetation();
    
    // Add additional special trees or vegetation specific to sponsored islands
    
    // Add some palm trees (larger than normal)
    const numSpecialTrees = Math.floor(this._radius / 10);
    
    for (let i = 0; i < numSpecialTrees; i++) {
      // Position trees in a circle
      const angle = (i / numSpecialTrees) * Math.PI * 2;
      const distance = this._radius * 0.7;
      const x = Math.cos(angle) * distance;
      const z = Math.sin(angle) * distance;
      
      // Create a special palm tree
      const trunkHeight = 8 + Math.random() * 4;
      const trunkRadius = 0.4 + Math.random() * 0.2;
      
      const trunkGeometry = new THREE.CylinderGeometry(
        trunkRadius, trunkRadius * 1.2, trunkHeight, 8
      );
      const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
      const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
      
      // Position trunk
      trunk.position.set(x, this.getHeightAt(x, z) + trunkHeight / 2, z);
      
      // Create leaves as a cone
      const leavesRadius = 3 + Math.random() * 2;
      const leavesGeometry = new THREE.ConeGeometry(leavesRadius, 4, 8);
      const leavesMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x2E7D32, 
        flatShading: true 
      });
      const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
      
      // Position leaves at the top of the trunk
      leaves.position.y = trunkHeight / 2 + 1;
      trunk.add(leaves);
      
      // Add some randomness to the trunk angle
      trunk.rotation.x = (Math.random() - 0.5) * 0.2;
      trunk.rotation.z = (Math.random() - 0.5) * 0.2;
      
      // Add to island mesh
      this.mesh.add(trunk);
    }
  }

  // Special method to add Loki's logo to the island
  addLokiLogo(parent, width, scale) {
    // Create a container for the 3D logo that floats above the sign
    const logoContainer = new THREE.Group();
    logoContainer.position.set(0, 8 * scale, 0);
    
    // Create a stylized "L" shape using custom geometry
    const createLShape = () => {
      const shape = new THREE.Shape();
      shape.moveTo(0, 0);
      shape.lineTo(0, 3);
      shape.lineTo(0.5, 3);
      shape.lineTo(0.5, 0.5);
      shape.lineTo(2, 0.5);
      shape.lineTo(2, 0);
      shape.lineTo(0, 0);
      
      const extrudeSettings = {
        steps: 1,
        depth: 0.3,
        bevelEnabled: true,
        bevelThickness: 0.1,
        bevelSize: 0.1,
        bevelSegments: 3
      };
      
      return new THREE.ExtrudeGeometry(shape, extrudeSettings);
    };
    
    // Create a rotating logo with "L" for Loki
    const logoGeometry = createLShape();
    const logoMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x00A8FF,
      metalness: 0.8,
      roughness: 0.2,
      emissive: 0x004080,
      emissiveIntensity: 0.5
    });
    
    const logo = new THREE.Mesh(logoGeometry, logoMaterial);
    logo.scale.set(2 * scale, 2 * scale, 2 * scale);
    logo.position.set(-width/4, 0, 0);
    
    // Add a glowing effect around the logo
    const glowGeometry = new THREE.SphereGeometry(3 * scale, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x00A8FF,
      transparent: true,
      opacity: 0.2
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    
    // Create a decorative circle platform
    const platformGeometry = new THREE.CylinderGeometry(5 * scale, 5 * scale, 0.5, 32);
    const platformMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      metalness: 0.9,
      roughness: 0.1
    });
    const platform = new THREE.Mesh(platformGeometry, platformMaterial);
    platform.position.y = -1.5 * scale;
    
    // Add a small point light to illuminate the logo
    const logoLight = new THREE.PointLight(0x00A8FF, 2, 20);
    logoLight.position.set(0, 2 * scale, 5 * scale);
    
    // Add elements to the logo container
    logoContainer.add(logo);
    logoContainer.add(glow);
    logoContainer.add(platform);
    logoContainer.add(logoLight);
    
    // Add animation data to the logo container
    logoContainer.userData.animationData = {
      rotationSpeed: 0.5,
      bounceHeight: 0.5 * scale,
      bounceSpeed: 1.5,
      glowPulseSpeed: 2.0,
      startTime: Date.now() / 1000
    };
    
    // Add update method for animations
    this.logoContainer = logoContainer;
    
    // Add the logo container to the parent
    parent.add(logoContainer);
    
    return logoContainer;
  }
}