import * as THREE from 'three';
import { SimplexNoise } from 'three/examples/jsm/math/SimplexNoise.js';

export class Island {
  constructor(options = {}) {
    // Island properties from server or defaults
    this._position = options.position || new THREE.Vector3(0, 0, 0);
    this._radius = options.radius || 40 + Math.random() * 30;
    this.height = options.height || 15 + Math.random() * 10;
    this.type = options.type || 'cone'; // cone, dome, or plateau
    this.baseHeight = options.baseHeight || 1.0;
    this.terrainFactor = options.terrainFactor || 1.2;
    this.beachWidth = options.beachWidth || 8;
    this.treeDensity = options.treeDensity || 1.0;
    this.maxTreeHeight = options.maxTreeHeight || 4.5;
    this.colorVariation = options.colorVariation || 0;
    
    // Visual properties
    this.detail = options.detail || 2;
    this.color = options.color || new THREE.Color(0x8BC34A);
    if (this.colorVariation > 0) {
      // Add slight color variation
      this.color.r += (Math.random() * 2 - 1) * this.colorVariation;
      this.color.g += (Math.random() * 2 - 1) * this.colorVariation;
      this.color.b += (Math.random() * 2 - 1) * this.colorVariation;
    }
    this.beachColor = options.beachColor || new THREE.Color(0xD2B48C);
    
    // Feature flags
    this.vegetation = options.vegetation !== false;
    this.dock = options.hasDock !== false;
    this.dockAngle = options.dockAngle || (Math.random() * Math.PI * 2);
    this.dockDirection = options.dockDirection || { 
      x: Math.sin(this.dockAngle), 
      z: Math.cos(this.dockAngle) 
    };
    this.dockLength = options.dockLength || 15;
    this.dockWidth = options.dockWidth || 5;
    
    // Collision properties
    this.collisionMargin = 5; // Extra margin for collision detection
    
    // Dock position for ship parking
    this.dockPosition = null;
    
    // Landing area for explorer
    this.landingPosition = null;
    
    // Terrain data
    this.terrainData = null;
    this.terrainResolution = 64; // Higher = more detailed terrain
    this.noise = new SimplexNoise();
    
    // Create mesh container
    this.mesh = new THREE.Group();
    this.mesh.position.copy(this._position);
    
    // Generate terrain data
    this.generateTerrainData();
    
    // Create island geometry
    this.createIsland();
    
    // Add vegetation if enabled
    if (this.vegetation) {
      this.addVegetation();
    }
    
    // Add dock if enabled
    if (this.dock) {
      this.addDock();
    }
    
    // Add path from dock to island
    this.addPath();
  }
  
  generateTerrainData() {
    // Create a height map for the island
    this.terrainData = new Array(this.terrainResolution);
    for (let x = 0; x < this.terrainResolution; x++) {
      this.terrainData[x] = new Array(this.terrainResolution);
      for (let z = 0; z < this.terrainResolution; z++) {
        // Convert grid coordinates to -1 to 1 range
        const nx = (x / (this.terrainResolution - 1)) * 2 - 1;
        const nz = (z / (this.terrainResolution - 1)) * 2 - 1;
        
        // Calculate distance from center (0,0)
        const distance = Math.sqrt(nx * nx + nz * nz);
        
        // Base height based on island type and distance from center
        let height;
        
        if (distance > 1) {
          // Outside the island radius
          height = 0;
        } else {
          switch (this.type) {
            case 'dome':
              // Dome uses a hemisphere formula but flatter
              height = Math.sqrt(1 - Math.pow(distance, 2)) * 0.7;
              // Add flat areas
              if (distance < 0.6) {
                height = Math.max(height, 0.7);
              }
              break;
              
            case 'plateau':
              // Plateau has a flat top and gentle sloped sides
              if (distance < 0.7) {
                // Flat top with very slight noise
                height = 1.0 + (this.noise.noise(nx * 1.5, nz * 1.5) * 0.05);
              } else {
                // Gentle sloped sides
                const slopePosition = (distance - 0.7) / 0.3;
                height = 1.0 - slopePosition * 0.7 + (this.noise.noise(nx * 2, nz * 2) * 0.05);
              }
              break;
              
            case 'cone':
            default:
              // Cone with flatter top and gentle slopes
              if (distance < 0.5) {
                // Flatter top area
                height = 0.9 + (this.noise.noise(nx * 2, nz * 2) * 0.1);
              } else {
                // Gentle slopes
                const slopePosition = (distance - 0.5) / 0.5;
                height = 0.9 - slopePosition * 0.8 + (this.noise.noise(nx * 2, nz * 2) * 0.1);
              }
              break;
          }
          
          // Scale height to island height
          height = Math.max(0, height * this.height);
        }
        
        this.terrainData[x][z] = height;
      }
    }
    
    // Create a flat area for the dock and path
    this.createDockLandingArea();
    
    // Create additional flat areas for exploration
    this.createExplorationAreas();
  }
  
  createDockLandingArea() {
    // Determine dock angle and position
    const dockAngle = this.dockAngle;
    const dockX = Math.sin(dockAngle);
    const dockZ = Math.cos(dockAngle);
    
    // Store dock direction
    this.dockDirection = new THREE.Vector3(dockX, 0, dockZ);
    
    // Calculate dock position at island edge
    const dockDistance = this._radius + 5;
    const dockPosX = dockX * dockDistance;
    const dockPosZ = dockZ * dockDistance;
    
    // Store dock position for ship parking (further out)
    this.dockPosition = new THREE.Vector3(
      this.position.x + dockX * (this._radius + 20),
      this.baseHeight,
      this.position.z + dockZ * (this._radius + 20)
    );
    
    // Store landing position (where dock meets island)
    this.landingPosition = new THREE.Vector3(
      this.position.x + dockX * this._radius,
      this.baseHeight,
      this.position.z + dockZ * this._radius
    );
    
    // Create a path from dock to island center
    const pathWidth = this.dockWidth;
    const pathLength = this._radius * 0.7; // Path goes 70% into island
    
    // Flatten terrain along the path
    for (let x = 0; x < this.terrainResolution; x++) {
      for (let z = 0; z < this.terrainResolution; z++) {
        // Convert grid coordinates to world space
        const wx = (x / (this.terrainResolution - 1)) * 2 - 1;
        const wz = (z / (this.terrainResolution - 1)) * 2 - 1;
        
        // Convert to island space
        const ix = wx * this._radius;
        const iz = wz * this._radius;
        
        // Calculate distance from dock center line
        const dotProduct = ix * dockX + iz * dockZ; // Project point onto dock direction
        const projectedX = dotProduct * dockX;
        const projectedZ = dotProduct * dockZ;
        
        // Calculate perpendicular distance from dock line
        const perpX = ix - projectedX;
        const perpZ = iz - projectedZ;
        const perpDistance = Math.sqrt(perpX * perpX + perpZ * perpZ);
        
        // Check if point is within path width and length
        if (perpDistance < pathWidth / 2 && dotProduct >= 0 && dotProduct <= pathLength) {
          // Calculate blend factor (0 at dock, 1 at end of path)
          const blendFactor = dotProduct / pathLength;
          
          // Get height at this point
          const currentHeight = this.terrainData[x][z];
          
          // Calculate target height (path height at dock, blending to terrain height)
          const targetHeight = this.baseHeight + blendFactor * currentHeight;
          
          // Smooth transition around path edges
          const edgeFactor = Math.max(0, 1 - (perpDistance / (pathWidth / 2)));
          
          // Blend current height with target height based on edge factor
          this.terrainData[x][z] = currentHeight * (1 - edgeFactor) + targetHeight * edgeFactor;
        }
      }
    }
  }
  
  createExplorationAreas() {
    // Create 2-3 flat areas on the island for exploration
    const numAreas = 2 + Math.floor(Math.random());
    
    for (let i = 0; i < numAreas; i++) {
      // Random position within the island (not too close to edge)
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * this._radius * 0.6;
      
      const centerX = Math.sin(angle) * distance;
      const centerZ = Math.cos(angle) * distance;
      
      // Size of flat area
      const areaSize = 5 + Math.random() * 10;
      
      // Flatten the area
      for (let x = 0; x < this.terrainResolution; x++) {
        for (let z = 0; z < this.terrainResolution; z++) {
          // Convert grid coordinates to world space
          const wx = (x / (this.terrainResolution - 1)) * 2 - 1;
          const wz = (z / (this.terrainResolution - 1)) * 2 - 1;
          
          // Convert to island space
          const ix = wx * this._radius;
          const iz = wz * this._radius;
          
          // Distance from area center
          const dx = ix - centerX;
          const dz = iz - centerZ;
          const distanceFromCenter = Math.sqrt(dx * dx + dz * dz);
          
          // If within area, flatten
          if (distanceFromCenter < areaSize) {
            // Get current height
            const currentHeight = this.terrainData[x][z];
            
            // Calculate target height (slightly above current for a flat area)
            // Use the height at the center as reference
            const centerGridX = Math.floor(((centerX / this._radius + 1) / 2) * (this.terrainResolution - 1));
            const centerGridZ = Math.floor(((centerZ / this._radius + 1) / 2) * (this.terrainResolution - 1));
            
            // Clamp to valid indices
            const validCenterX = Math.max(0, Math.min(this.terrainResolution - 1, centerGridX));
            const validCenterZ = Math.max(0, Math.min(this.terrainResolution - 1, centerGridZ));
            
            const targetHeight = this.terrainData[validCenterX][validCenterZ];
            
            // Smooth transition based on distance from center
            const blendFactor = 1 - (distanceFromCenter / areaSize);
            const smoothFactor = Math.pow(blendFactor, 2); // Squared for smoother transition
            
            // Blend current height with target height
            this.terrainData[x][z] = currentHeight * (1 - smoothFactor) + targetHeight * smoothFactor;
          }
        }
      }
    }
  }
  
  createIsland() {
    // Create island base - always a cylinder to ensure flat water boundary
    const baseGeometry = new THREE.CylinderGeometry(
      this._radius + this.beachWidth, 
      this._radius + this.beachWidth, 
      this.baseHeight, 
      32
    );
    const baseMaterial = new THREE.MeshStandardMaterial({
      color: this.beachColor.clone().multiplyScalar(0.8),
      flatShading: true
    });
    
    const baseMesh = new THREE.Mesh(baseGeometry, baseMaterial);
    baseMesh.position.y = this.baseHeight / 2;
    baseMesh.receiveShadow = true;
    this.mesh.add(baseMesh);
    
    // Create detailed terrain mesh using the height map
    const terrainGeometry = new THREE.PlaneGeometry(
      this._radius * 2, 
      this._radius * 2, 
      this.terrainResolution - 1, 
      this.terrainResolution - 1
    );
    
    // Rotate to be horizontal
    terrainGeometry.rotateX(-Math.PI / 2);
    
    // Apply height map to vertices
    const vertices = terrainGeometry.attributes.position.array;
    for (let i = 0; i < vertices.length; i += 3) {
      // Convert vertex position to terrain grid coordinates
      const x = Math.floor(((vertices[i] / this._radius) + 1) / 2 * (this.terrainResolution - 1));
      const z = Math.floor(((vertices[i + 2] / this._radius) + 1) / 2 * (this.terrainResolution - 1));
      
      // Clamp to valid indices
      const gridX = Math.max(0, Math.min(this.terrainResolution - 1, x));
      const gridZ = Math.max(0, Math.min(this.terrainResolution - 1, z));
      
      // Set vertex height from terrain data
      vertices[i + 1] = this.baseHeight + this.terrainData[gridX][gridZ];
    }
    
    // Update geometry
    terrainGeometry.computeVertexNormals();
    
    // Create terrain material
    const terrainMaterial = new THREE.MeshStandardMaterial({
      color: this.color,
      flatShading: false,
      wireframe: false
    });
    
    // Create terrain mesh
    const terrainMesh = new THREE.Mesh(terrainGeometry, terrainMaterial);
    terrainMesh.castShadow = true;
    terrainMesh.receiveShadow = true;
    this.mesh.add(terrainMesh);
    this.terrainMesh = terrainMesh;
    
    // Add beach ring
    const beachGeometry = new THREE.RingGeometry(
      this._radius, 
      this._radius + this.beachWidth, 
      32
    );
    const beachMaterial = new THREE.MeshStandardMaterial({
      color: this.beachColor,
      side: THREE.DoubleSide
    });
    
    const beach = new THREE.Mesh(beachGeometry, beachMaterial);
    beach.rotation.x = -Math.PI / 2;
    beach.position.y = this.baseHeight + 0.1; // Slightly above base
    beach.receiveShadow = true;
    this.mesh.add(beach);
  }
  
  addVegetation() {
    // Calculate tree count based on radius and density
    // Reduce density to avoid overcrowding
    const treeCount = Math.floor(this._radius * this.treeDensity / 4);
    
    // Create tree materials
    const treeMaterial = new THREE.MeshStandardMaterial({
      color: 0x33691E,
      flatShading: true
    });
    
    const trunkMaterial = new THREE.MeshStandardMaterial({
      color: 0x795548,
      flatShading: true
    });
    
    // Add trees
    for (let i = 0; i < treeCount; i++) {
      // Position tree on island
      const angle = Math.random() * Math.PI * 2;
      // Keep trees away from the very edge and center
      const distance = (this._radius * 0.3) + Math.random() * (this._radius * 0.5);
      
      const posX = Math.sin(angle) * distance;
      const posZ = Math.cos(angle) * distance;
      
      // Calculate height at this position
      const yPos = this.getHeightAt(posX, posZ);
      
      // Skip if position is below water or too close to edge
      if (yPos <= this.baseHeight) continue;
      
      // Skip if position is on the path
      const dotProduct = posX * this.dockDirection.x + posZ * this.dockDirection.z;
      const projectedX = dotProduct * this.dockDirection.x;
      const projectedZ = dotProduct * this.dockDirection.z;
      const perpX = posX - projectedX;
      const perpZ = posZ - projectedZ;
      const perpDistance = Math.sqrt(perpX * perpX + perpZ * perpZ);
      
      // Skip if on path or too close to it (wider clearance)
      if (perpDistance < this.dockWidth * 1.5 && dotProduct >= 0 && dotProduct <= this._radius * 0.7) {
        continue;
      }
      
      // Skip if on steep slope (calculate approximate slope)
      const sampleDistance = 1.0;
      const height1 = this.getHeightAt(posX + sampleDistance, posZ);
      const height2 = this.getHeightAt(posX - sampleDistance, posZ);
      const height3 = this.getHeightAt(posX, posZ + sampleDistance);
      const height4 = this.getHeightAt(posX, posZ - sampleDistance);
      
      const maxSlope = Math.max(
        Math.abs(height1 - height2) / (sampleDistance * 2),
        Math.abs(height3 - height4) / (sampleDistance * 2)
      );
      
      // Skip if slope is too steep
      if (maxSlope > 0.4) continue;
      
      // Create tree group
      const treeGroup = new THREE.Group();
      
      // Create trunk - make it shorter to ensure it doesn't float
      const trunkHeight = 1.5 + Math.random() * 1.5;
      const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.4, trunkHeight, 6);
      const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
      
      // Position trunk with base exactly at ground level
      trunk.position.y = trunkHeight / 2;
      trunk.castShadow = true;
      treeGroup.add(trunk);
      
      // Create foliage - adjust size based on trunk height
      const foliageHeight = Math.min(this.maxTreeHeight, 2 + Math.random() * 2);
      const foliageRadius = 1 + Math.random() * 1;
      const treeGeometry = new THREE.ConeGeometry(foliageRadius, foliageHeight, 6);
      const foliage = new THREE.Mesh(treeGeometry, treeMaterial);
      
      // Position foliage directly on top of trunk
      foliage.position.y = trunk.position.y + trunkHeight / 2 + foliageHeight / 2 - 0.2;
      foliage.castShadow = true;
      treeGroup.add(foliage);
      
      // Set tree position - ensure it's exactly on the terrain
      treeGroup.position.set(posX, yPos, posZ);
      
      // Random rotation around Y axis
      treeGroup.rotation.y = Math.random() * Math.PI * 2;
      
      // Add tree to island
      this.mesh.add(treeGroup);
    }
    
    // Add some small vegetation (bushes, rocks) for detail
    this.addSmallVegetation();
  }
  
  addSmallVegetation() {
    // Add bushes and rocks for detail
    const smallItemCount = Math.floor(this._radius * 0.8);
    
    // Bush material
    const bushMaterial = new THREE.MeshStandardMaterial({
      color: 0x558B2F,
      flatShading: true
    });
    
    // Rock material
    const rockMaterial = new THREE.MeshStandardMaterial({
      color: 0x9E9E9E,
      roughness: 0.8,
      metalness: 0.2,
      flatShading: true
    });
    
    for (let i = 0; i < smallItemCount; i++) {
      // Random position
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * this._radius * 0.9;
      
      const posX = Math.sin(angle) * distance;
      const posZ = Math.cos(angle) * distance;
      
      // Get height at position
      const yPos = this.getHeightAt(posX, posZ);
      
      // Skip if underwater
      if (yPos <= this.baseHeight) continue;
      
      // Skip if on path
      const dotProduct = posX * this.dockDirection.x + posZ * this.dockDirection.z;
      const projectedX = dotProduct * this.dockDirection.x;
      const projectedZ = dotProduct * this.dockDirection.z;
      const perpX = posX - projectedX;
      const perpZ = posZ - projectedZ;
      const perpDistance = Math.sqrt(perpX * perpX + perpZ * perpZ);
      
      if (perpDistance < this.dockWidth && dotProduct >= 0 && dotProduct <= this._radius * 0.7) {
        continue;
      }
      
      // Create either a bush or rock
      let smallItem;
      if (Math.random() < 0.7) {
        // Bush (small sphere)
        const bushSize = 0.3 + Math.random() * 0.4;
        const bushGeometry = new THREE.SphereGeometry(bushSize, 6, 6);
        smallItem = new THREE.Mesh(bushGeometry, bushMaterial);
      } else {
        // Rock (small polyhedron)
        const rockSize = 0.2 + Math.random() * 0.3;
        const rockGeometry = new THREE.DodecahedronGeometry(rockSize, 0);
        smallItem = new THREE.Mesh(rockGeometry, rockMaterial);
      }
      
      // Position at ground level
      smallItem.position.set(posX, yPos + smallItem.geometry.parameters.radius * 0.8, posZ);
      
      // Random rotation
      smallItem.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      
      smallItem.castShadow = true;
      smallItem.receiveShadow = true;
      
      // Add to island
      this.mesh.add(smallItem);
    }
  }
  
  addDock() {
    // Create dock group
    const dockGroup = new THREE.Group();
    
    // Get dock direction
    const dockDirection = this.dockDirection;
    
    // Calculate dock position at island edge
    const dockDistance = this._radius + 5;
    const dockPosX = dockDirection.x * dockDistance;
    const dockPosZ = dockDirection.z * dockDistance;
    
    // Create dock platform
    const dockGeometry = new THREE.BoxGeometry(
      this.dockWidth, 
      0.8, 
      this.dockLength
    );
    const dockMaterial = new THREE.MeshStandardMaterial({
      color: 0x8D6E63,
      flatShading: true
    });
    
    const dock = new THREE.Mesh(dockGeometry, dockMaterial);
    dock.position.y = 0.7; // Significantly higher to avoid z-fighting
    dock.castShadow = true;
    dock.receiveShadow = true;
    dockGroup.add(dock);
    
    // Add dock edging for better visibility
    const edgeGeometry = new THREE.BoxGeometry(
      this.dockWidth + 0.4, 
      0.2, 
      this.dockLength + 0.4
    );
    const edgeMaterial = new THREE.MeshStandardMaterial({
      color: 0x5D4037, // Darker wood color
      flatShading: true
    });
    
    const edge = new THREE.Mesh(edgeGeometry, edgeMaterial);
    edge.position.y = 0.9; // Just above the main dock
    edge.castShadow = true;
    dockGroup.add(edge);
    
    // Create dock posts (taller and more visible)
    const postGeometry = new THREE.CylinderGeometry(0.4, 0.4, 4.0, 6);
    const postMaterial = new THREE.MeshStandardMaterial({
      color: 0x5D4037,
      flatShading: true
    });
    
    // Add posts at each corner
    const halfWidth = this.dockWidth / 2;
    const halfLength = this.dockLength / 2;
    
    for (let x = -halfWidth + 0.5; x <= halfWidth - 0.5; x += this.dockWidth - 1) {
      for (let z = -halfLength + 0.5; z <= halfLength - 0.5; z += this.dockLength - 1) {
        const post = new THREE.Mesh(postGeometry, postMaterial);
        post.position.set(x, -1.2, z);
        post.castShadow = true;
        dockGroup.add(post);
      }
    }
    
    // Position dock at edge of island
    dockGroup.position.set(
      dockPosX,
      this.baseHeight,
      dockPosZ
    );
    
    // Rotate dock to face away from island
    dockGroup.lookAt(
      dockGroup.position.x + dockDirection.x * 10,
      this.baseHeight,
      dockGroup.position.z + dockDirection.z * 10
    );
    
    // Add dock to island
    this.mesh.add(dockGroup);
  }
  
  addPath() {
    // Create a visible path from dock to island center
    const pathMaterial = new THREE.MeshStandardMaterial({
      color: 0xBDBDBD, // Light gray
      roughness: 0.8,
      metalness: 0.1
    });
    
    // Create path geometry
    const pathWidth = this.dockWidth * 0.8;
    const pathLength = this._radius * 0.7;
    const pathGeometry = new THREE.PlaneGeometry(pathWidth, pathLength, 10, 10);
    
    // Rotate and position path
    pathGeometry.rotateX(-Math.PI / 2);
    
    // Apply height map to path vertices
    const vertices = pathGeometry.attributes.position.array;
    for (let i = 0; i < vertices.length; i += 3) {
      // Get position along path (0 to 1)
      const pathPos = (vertices[i + 1] / pathLength) + 0.5;
      
      // Calculate world position
      const worldX = this.dockDirection.x * pathPos * pathLength;
      const worldZ = this.dockDirection.z * pathPos * pathLength;
      
      // Get height at this position
      const height = this.getHeightAt(worldX, worldZ);
      
      // Set vertex height
      vertices[i + 2] = height + 0.05; // Slightly above terrain
    }
    
    // Update geometry
    pathGeometry.computeVertexNormals();
    
    // Create path mesh
    const path = new THREE.Mesh(pathGeometry, pathMaterial);
    
    // Position path at dock entrance
    path.position.set(
      this.dockDirection.x * (this._radius / 2),
      this.baseHeight + 0.05,
      this.dockDirection.z * (this._radius / 2)
    );
    
    // Rotate path to align with dock
    path.lookAt(
      path.position.x + this.dockDirection.x * 10,
      path.position.y,
      path.position.z + this.dockDirection.z * 10
    );
    
    // Add path to island
    this.mesh.add(path);
  }
  
  getHeightAt(x, z) {
    // Convert world coordinates to normalized coordinates (-1 to 1)
    const nx = x / this._radius;
    const nz = z / this._radius;
    
    // Check if point is outside island radius
    const distance = Math.sqrt(nx * nx + nz * nz);
    if (distance > 1) {
      return this.baseHeight;
    }
    
    // Convert normalized coordinates to grid coordinates
    const gridX = Math.floor(((nx + 1) / 2) * (this.terrainResolution - 1));
    const gridZ = Math.floor(((nz + 1) / 2) * (this.terrainResolution - 1));
    
    // Clamp to valid indices
    const x1 = Math.max(0, Math.min(this.terrainResolution - 1, gridX));
    const z1 = Math.max(0, Math.min(this.terrainResolution - 1, gridZ));
    
    // Get height from terrain data
    const height = this.terrainData[x1][z1];
    
    return this.baseHeight + height;
  }
  
  update(delta, time) {
    // Additional island animations or updates can be added here
    // For example, waves at shore, swaying trees, etc.
  }
  
  get position() {
    return this.mesh.position;
  }
  
  set position(value) {
    if (this.mesh) {
      this.mesh.position.copy(value);
    }
    this._position = value;
  }
  
  get radius() {
    return this._radius;
  }
  
  set radius(value) {
    this._radius = value;
  }
  
  // Check if a position is colliding with this island
  checkCollision(position, radius = 0) {
    const dx = position.x - this.position.x;
    const dz = position.z - this.position.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    
    // Check if the distance is less than the island radius plus the object radius plus margin
    return distance < (this._radius + radius + this.collisionMargin);
  }
  
  // Check if a position is near the dock
  isNearDock(position, maxDistance = 15) {
    if (!this.dockPosition) return false;
    
    const dx = position.x - this.dockPosition.x;
    const dz = position.z - this.dockPosition.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    
    return distance < maxDistance;
  }
  
  // Get dock information for ship parking
  getDockingInfo() {
    return {
      position: this.dockPosition.clone(),
      direction: this.dockDirection.clone(),
      landingPosition: this.landingPosition.clone(),
      islandId: this.mesh.uuid
    };
  }
} 