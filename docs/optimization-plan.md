# Moana's Wake: Optimization Plan

This document outlines specific optimizations to improve performance and remove unused code.

## Code Cleanup

### Unused Code Identification

Based on the codebase analysis, the following areas likely contain unused code that can be removed:

1. **Game.js**

   - Placeholder world creation methods (createPlaceholderWorld, createBuoys, etc.) that are no longer used
   - Debug functions that are only used during development
   - Commented-out code blocks and TODOs that have been implemented

2. **SocketManager.js**

   - Unused optimization settings and flags
   - Debug-only network code
   - Redundant state tracking variables

3. **Component Files**
   - Unused methods in Island.js, Ship.js, and other component files
   - Placeholder graphics code that has been replaced with final assets
   - Experimental features that were never fully implemented

### Identification Strategy

To systematically identify unused code:

1. Use static analysis tools to find:

   - Unused functions and methods
   - Unused variables
   - Unreachable code blocks

2. Perform runtime analysis:

   - Add logging to suspect functions to verify if they're called
   - Track code paths during typical gameplay sessions
   - Monitor performance metrics to identify bottlenecks

3. Manual code review:
   - Review each file for commented-out code
   - Check for duplicate functionality
   - Look for outdated TODOs and FIXMEs

## Performance Optimizations

### Rendering Optimizations

1. **Level of Detail (LOD)**
   - Implement LOD for distant objects
   - Reduce polygon count for objects far from the camera
   - Simplify shaders for distant objects

```javascript
// Example LOD implementation for islands
updateLOD() {
  const distanceToCamera = this.mesh.position.distanceTo(this.game.camera.position);

  if (distanceToCamera > 200) {
    // Use low detail model
    if (this.currentLOD !== 'low') {
      this.switchToLowDetail();
    }
  } else if (distanceToCamera > 100) {
    // Use medium detail model
    if (this.currentLOD !== 'medium') {
      this.switchToMediumDetail();
    }
  } else {
    // Use high detail model
    if (this.currentLOD !== 'high') {
      this.switchToHighDetail();
    }
  }
}
```

2. **Occlusion Culling**
   - Don't render objects that are not visible to the camera
   - Use frustum culling to skip rendering objects outside the view
   - Implement occlusion queries for complex scenes

```javascript
// Example frustum culling implementation
isVisible(camera) {
  const frustum = new THREE.Frustum();
  frustum.setFromProjectionMatrix(
    new THREE.Matrix4().multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse
    )
  );

  return frustum.intersectsObject(this.mesh);
}
```

3. **Shader Optimization**
   - Simplify complex shaders
   - Use shader instancing for similar objects
   - Implement shader LOD based on distance

### Physics Optimizations

1. **Collision Detection**
   - Implement spatial partitioning (quadtree/octree)
   - Use broad-phase collision detection to filter potential collisions
   - Simplify collision shapes for distant objects

```javascript
// Example spatial partitioning implementation
class QuadTree {
  constructor(bounds, maxObjects = 10, maxLevels = 4, level = 0) {
    this.bounds = bounds;
    this.maxObjects = maxObjects;
    this.maxLevels = maxLevels;
    this.level = level;
    this.objects = [];
    this.nodes = [];
  }

  split() {
    // Split the node into four quadrants
  }

  getIndex(object) {
    // Determine which node the object belongs to
  }

  insert(object) {
    // Insert an object into the quadtree
  }

  retrieve(object) {
    // Return all objects that could collide with the given object
  }
}
```

2. **Physics Stepping**
   - Use variable time steps for physics based on distance
   - Reduce physics precision for distant objects
   - Implement physics sleeping for inactive objects

```javascript
// Example physics sleeping implementation
updatePhysics(delta) {
  if (this.velocity.lengthSq() < 0.01 && !this.hasActiveCollisions) {
    if (!this.isSleeping) {
      this.isSleeping = true;
      console.log('Object sleeping:', this.id);
    }
    return; // Skip physics update
  }

  if (this.isSleeping) {
    this.isSleeping = false;
    console.log('Object waking up:', this.id);
  }

  // Regular physics update
  this.applyForces(delta);
  this.updatePosition(delta);
  this.checkCollisions();
}
```

### Network Optimizations

1. **Data Compression**
   - Use delta compression for position updates
   - Quantize floating-point values to reduce bandwidth
   - Batch updates to reduce packet overhead

```javascript
// Example delta compression
sendPositionUpdate() {
  const currentState = {
    x: Math.round(this.position.x * 100) / 100,
    y: Math.round(this.position.y * 100) / 100,
    z: Math.round(this.position.z * 100) / 100,
    rx: Math.round(this.rotation.x * 100) / 100,
    ry: Math.round(this.rotation.y * 100) / 100,
    rz: Math.round(this.rotation.z * 100) / 100
  };

  if (!this.lastSentState) {
    this.lastSentState = currentState;
    return currentState;
  }

  const delta = {
    t: Date.now(), // timestamp
    changes: {}
  };

  for (const [key, value] of Object.entries(currentState)) {
    if (Math.abs(value - this.lastSentState[key]) > 0.01) {
      delta.changes[key] = value;
    }
  }

  if (Object.keys(delta.changes).length > 0) {
    this.lastSentState = currentState;
    return delta;
  }

  return null; // No significant changes
}
```

2. **Interest Management**
   - Only send updates for entities that are relevant to the player
   - Implement areas of interest based on distance
   - Reduce update frequency for distant entities

```javascript
// Example interest management
getRelevantEntities(player, maxDistance = 200) {
  const relevantEntities = [];
  const playerPosition = player.position;

  for (const entity of this.entities) {
    const distance = entity.position.distanceTo(playerPosition);

    if (distance <= maxDistance) {
      // Entity is within relevant distance
      relevantEntities.push({
        entity,
        distance,
        updateFrequency: this.getUpdateFrequency(distance)
      });
    }
  }

  return relevantEntities;
}

getUpdateFrequency(distance) {
  if (distance < 50) {
    return 50; // 20 updates per second
  } else if (distance < 100) {
    return 100; // 10 updates per second
  } else if (distance < 150) {
    return 200; // 5 updates per second
  } else {
    return 500; // 2 updates per second
  }
}
```

3. **Prediction and Interpolation**
   - Improve client-side prediction accuracy
   - Optimize interpolation for smoother movement
   - Implement jitter buffer for network inconsistencies

### Memory Optimizations

1. **Object Pooling**
   - Reuse objects instead of creating new ones
   - Pool frequently created objects like projectiles
   - Implement a generic object pool manager

```javascript
// Example object pooling for projectiles
class ProjectilePool {
  constructor(initialSize = 20) {
    this.pool = [];
    this.activeProjectiles = new Set();

    // Pre-create projectiles
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(this.createProjectile());
    }
  }

  createProjectile() {
    // Create a new projectile object
    const projectile = new Projectile();
    projectile.mesh.visible = false;
    return projectile;
  }

  getProjectile() {
    // Get a projectile from the pool or create a new one
    let projectile;

    if (this.pool.length > 0) {
      projectile = this.pool.pop();
    } else {
      projectile = this.createProjectile();
    }

    projectile.reset(); // Reset projectile state
    projectile.mesh.visible = true;
    this.activeProjectiles.add(projectile);

    return projectile;
  }

  releaseProjectile(projectile) {
    // Return a projectile to the pool
    projectile.mesh.visible = false;
    this.activeProjectiles.delete(projectile);
    this.pool.push(projectile);
  }

  update(delta) {
    // Update all active projectiles
    for (const projectile of this.activeProjectiles) {
      projectile.update(delta);

      if (projectile.isDead()) {
        this.releaseProjectile(projectile);
      }
    }
  }
}
```

2. **Texture Atlasing**

   - Combine multiple textures into a single atlas
   - Reduce draw calls and texture switches
   - Implement texture compression

3. **Asset Management**
   - Implement asset loading/unloading based on game state
   - Use progressive loading for large assets
   - Implement asset caching

## Implementation Priority

1. **High Priority (Immediate Impact)**

   - Object pooling for projectiles
   - Spatial partitioning for collision detection
   - Delta compression for network updates
   - Remove unused code in Game.js

2. **Medium Priority (Significant Optimization)**

   - Level of detail for distant objects
   - Interest management for network updates
   - Frustum culling for rendering
   - Texture atlasing

3. **Low Priority (Polish)**
   - Shader optimizations
   - Physics sleeping
   - Progressive asset loading
   - Advanced prediction and interpolation

## Measurement and Validation

For each optimization:

1. **Establish Baseline**

   - Measure current performance (FPS, memory usage, network bandwidth)
   - Document current behavior

2. **Implement Optimization**

   - Make targeted changes
   - Keep changes isolated for easier validation

3. **Measure Impact**

   - Compare performance metrics before and after
   - Verify no regressions in functionality
   - Document improvements

4. **Iterate if Necessary**
   - Fine-tune parameters
   - Combine complementary optimizations
   - Address any new issues

## Tools and Techniques

1. **Performance Monitoring**

   - Implement an in-game performance overlay
   - Track FPS, memory usage, and network stats
   - Log performance metrics for analysis

2. **Profiling**

   - Use Chrome DevTools for JavaScript profiling
   - Identify hot spots and bottlenecks
   - Focus optimization efforts on high-impact areas

3. **Automated Testing**
   - Create performance test scenarios
   - Automate performance measurement
   - Set performance budgets and alerts

## Conclusion

By systematically identifying and removing unused code, and implementing targeted performance optimizations, we can significantly improve the game's performance and maintainability. The optimizations should be implemented incrementally, with careful measurement and validation at each step to ensure they provide the expected benefits without introducing new issues.
