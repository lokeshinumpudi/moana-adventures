import * as CANNON from 'cannon-es';
import * as THREE from 'three';

/**
 * Utility class to manage physics using Cannon.js
 */
export class PhysicsManager {
  constructor() {
    this.world = new CANNON.World({
      gravity: new CANNON.Vec3(0, -9.82, 0)
    });
    
    this.bodies = new Map();
    this.debugMode = false;
    this.debugMeshes = [];
    
    // Set default material properties
    this.defaultMaterial = new CANNON.Material('default');
    this.defaultMaterial.friction = 0.3;
    this.defaultMaterial.restitution = 0.3;
    
    // Set up contact materials
    const defaultContactMaterial = new CANNON.ContactMaterial(
      this.defaultMaterial,
      this.defaultMaterial,
      {
        friction: 0.3,
        restitution: 0.3,
        contactEquationStiffness: 1e6,
        contactEquationRelaxation: 3
      }
    );
    
    this.world.addContactMaterial(defaultContactMaterial);
    this.world.defaultContactMaterial = defaultContactMaterial;
  }
  
  update(deltaTime) {
    // Update physics world
    this.world.step(1/60, deltaTime, 3);
    
    // Update meshes based on physics bodies
    this.bodies.forEach((body, mesh) => {
      mesh.position.copy(body.position);
      mesh.quaternion.copy(body.quaternion);
    });
    
    // Update debug meshes if debug mode is enabled
    if (this.debugMode) {
      this.updateDebugMeshes();
    }
  }
  
  addBody(mesh, options = {}) {
    const shape = this.createShapeFromMesh(mesh, options.shape);
    
    // Create body
    const body = new CANNON.Body({
      mass: options.mass || 0, // 0 = static
      position: new CANNON.Vec3(
        mesh.position.x,
        mesh.position.y,
        mesh.position.z
      ),
      shape: shape,
      material: options.material || this.defaultMaterial
    });
    
    // Add body to world
    this.world.addBody(body);
    
    // Store reference to mesh
    this.bodies.set(mesh, body);
    
    // Create debug mesh if debug mode is enabled
    if (this.debugMode) {
      this.createDebugMesh(body);
    }
    
    return body;
  }
  
  removeBody(mesh) {
    const body = this.bodies.get(mesh);
    if (body) {
      this.world.removeBody(body);
      this.bodies.delete(mesh);
    }
  }
  
  createShapeFromMesh(mesh, shapeType) {
    // Default to box shape
    shapeType = shapeType || 'box';
    
    switch (shapeType) {
      case 'box':
        const box = new THREE.Box3().setFromObject(mesh);
        const size = box.getSize(new THREE.Vector3());
        return new CANNON.Box(new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2));
        
      case 'sphere':
        // Get bounding sphere
        const sphere = new THREE.Sphere();
        new THREE.Box3().setFromObject(mesh).getBoundingSphere(sphere);
        return new CANNON.Sphere(sphere.radius);
        
      case 'cylinder':
        // Assume cylinder is aligned with y-axis
        const cylinder = new THREE.Box3().setFromObject(mesh);
        const cylinderSize = cylinder.getSize(new THREE.Vector3());
        return new CANNON.Cylinder(
          cylinderSize.x / 2, // radiusTop
          cylinderSize.x / 2, // radiusBottom
          cylinderSize.y,     // height
          16                  // numSegments
        );
        
      case 'cone':
        // Assume cone is aligned with y-axis
        const cone = new THREE.Box3().setFromObject(mesh);
        const coneSize = cone.getSize(new THREE.Vector3());
        return new CANNON.Cylinder(
          0,                // radiusTop
          coneSize.x / 2,   // radiusBottom
          coneSize.y,       // height
          16                // numSegments
        );
        
      default:
        console.warn(`Unknown shape type: ${shapeType}, using box instead`);
        const defaultBox = new THREE.Box3().setFromObject(mesh);
        const defaultSize = defaultBox.getSize(new THREE.Vector3());
        return new CANNON.Box(new CANNON.Vec3(defaultSize.x / 2, defaultSize.y / 2, defaultSize.z / 2));
    }
  }
  
  createDebugMesh(body) {
    let debugMesh;
    
    // Create debug mesh based on body shape
    if (body.shapes[0] instanceof CANNON.Box) {
      const boxGeometry = new THREE.BoxGeometry(
        body.shapes[0].halfExtents.x * 2,
        body.shapes[0].halfExtents.y * 2,
        body.shapes[0].halfExtents.z * 2
      );
      debugMesh = new THREE.Mesh(
        boxGeometry,
        new THREE.MeshBasicMaterial({ 
          color: 0x00ff00, 
          wireframe: true 
        })
      );
    } else if (body.shapes[0] instanceof CANNON.Sphere) {
      const sphereGeometry = new THREE.SphereGeometry(
        body.shapes[0].radius,
        16,
        16
      );
      debugMesh = new THREE.Mesh(
        sphereGeometry,
        new THREE.MeshBasicMaterial({ 
          color: 0x00ff00, 
          wireframe: true 
        })
      );
    } else if (body.shapes[0] instanceof CANNON.Cylinder) {
      const cylinderGeometry = new THREE.CylinderGeometry(
        body.shapes[0].radiusTop,
        body.shapes[0].radiusBottom,
        body.shapes[0].height,
        16
      );
      debugMesh = new THREE.Mesh(
        cylinderGeometry,
        new THREE.MeshBasicMaterial({ 
          color: 0x00ff00, 
          wireframe: true 
        })
      );
    }
    
    if (debugMesh) {
      debugMesh.position.copy(body.position);
      debugMesh.quaternion.copy(body.quaternion);
      this.debugMeshes.push({ mesh: debugMesh, body: body });
    }
    
    return debugMesh;
  }
  
  updateDebugMeshes() {
    this.debugMeshes.forEach(item => {
      item.mesh.position.copy(item.body.position);
      item.mesh.quaternion.copy(item.body.quaternion);
    });
  }
  
  toggleDebugMode(scene) {
    this.debugMode = !this.debugMode;
    
    if (this.debugMode) {
      // Create debug meshes for all bodies
      this.bodies.forEach((body, mesh) => {
        const debugMesh = this.createDebugMesh(body);
        if (debugMesh) {
          scene.add(debugMesh);
        }
      });
    } else {
      // Remove all debug meshes
      this.debugMeshes.forEach(item => {
        scene.remove(item.mesh);
      });
      this.debugMeshes = [];
    }
  }
} 