import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class CameraManager {
  constructor(scene, target) {
    this.scene = scene;
    this.target = target;
    
    // Camera settings
    this.followDistance = 15;
    this.followHeight = 8;
    this.followOffset = 5;
    this.transitionSpeed = 2.0; // Speed of camera transitions
    
    // Camera state
    this.currentMode = 'follow'; // 'follow', 'orbit', 'fixed'
    this.orbitAngle = 0;
    this.orbitRadius = 20;
    this.orbitHeight = 10;
    this.orbitSpeed = 0.2;
    
    // Transition state
    this.isTransitioning = false;
    this.transitionStartPosition = null;
    this.transitionTargetPosition = null;
    this.transitionStartLookAt = null;
    this.transitionTargetLookAt = null;
    this.transitionProgress = 0;
    this.transitionDuration = 1.0; // seconds
    
    // Mouse control
    this.mouseX = 0;
    this.mouseY = 0;
    this.mouseInfluence = 0.1;
    
    // Initialize cameras
    this.initCameras();
    
    // Set default camera
    this.activeCamera = this.followCamera;
    scene.add(this.activeCamera);
  }
  
  initCameras() {
    // Create follow camera (third-person view)
    this.followCamera = new THREE.PerspectiveCamera(
      75, // FOV
      window.innerWidth / window.innerHeight, // Aspect ratio
      0.1, // Near plane
      1000 // Far plane
    );
    
    // Create orbit camera (circles around target)
    this.orbitCamera = new THREE.PerspectiveCamera(
      75, // FOV
      window.innerWidth / window.innerHeight, // Aspect ratio
      0.1, // Near plane
      1000 // Far plane
    );
    
    // Create fixed camera (static position, looks at target)
    this.fixedCamera = new THREE.PerspectiveCamera(
      75, // FOV
      window.innerWidth / window.innerHeight, // Aspect ratio
      0.1, // Near plane
      1000 // Far plane
    );
    
    // Set fixed camera position
    this.fixedCamera.position.set(0, 50, 0);
    this.fixedCamera.lookAt(0, 0, 0);
  }
  
  update(delta = 0.016) { // Default to 60fps if delta not provided
    if (!this.target) return;
    
    // Update camera based on current mode
    switch (this.currentMode) {
      case 'follow':
        this.updateFollowCamera(delta);
        break;
      case 'orbit':
        this.updateOrbitCamera(delta);
        break;
      case 'fixed':
        this.updateFixedCamera(delta);
        break;
    }
  }
  
  updateFollowCamera(delta) {
    // If we're transitioning, handle that first
    if (this.isTransitioning) {
      this.updateCameraTransition(delta);
      return;
    }
    
    // Get target position and direction
    let targetPosition, targetDirection;
    let desiredCameraPosition = new THREE.Vector3();
    let desiredLookAtPosition = new THREE.Vector3();
    
    // Check if target is an explorer (has isActive property) or a ship
    const isExplorer = this.target.isActive !== undefined;
    
    if (isExplorer && this.target.isActive) {
      // Explorer camera settings - closer and higher angle for better visibility
      this.followDistance = 10;
      this.followHeight = 8; // Higher for better view of the island
      this.followOffset = 0; // No side offset for explorer
      
      targetPosition = this.target.mesh.position.clone();
      targetDirection = new THREE.Vector3(0, 0, 1).applyAxisAngle(
        new THREE.Vector3(0, 1, 0), this.target.mesh.rotation.y
      );
      
      // For explorer, we want a more top-down view to see the island better
      const cameraOffset = targetDirection.clone().multiplyScalar(-this.followDistance);
      desiredCameraPosition = targetPosition.clone().add(cameraOffset);
      desiredCameraPosition.y = targetPosition.y + this.followHeight; // Set absolute height above player
      
      // Look directly at the player
      desiredLookAtPosition.copy(targetPosition);
      desiredLookAtPosition.y += 1.0; // Look slightly above player for better view
    } else {
      // Ship camera settings - further back and higher
      this.followDistance = 15;
      this.followHeight = 8;
      this.followOffset = 5;
      
      targetPosition = this.target.mesh.position.clone();
      targetDirection = new THREE.Vector3(0, 0, 1).applyQuaternion(this.target.mesh.quaternion);
      
      // Calculate camera position behind target
      const cameraOffset = targetDirection.clone().multiplyScalar(-this.followDistance);
      desiredCameraPosition = targetPosition.clone().add(cameraOffset);
      desiredCameraPosition.y = targetPosition.y + this.followHeight;
      
      // Add slight offset to the side for better view
      const rightVector = new THREE.Vector3(1, 0, 0);
      rightVector.applyQuaternion(this.target.mesh.quaternion);
      desiredCameraPosition.add(rightVector.multiplyScalar(this.followOffset));
      
      // Look at target with slight forward offset
      desiredLookAtPosition = targetPosition.clone();
      desiredLookAtPosition.add(targetDirection.multiplyScalar(10));
    }
    
    // Apply mouse influence for slight camera movement
    if (this.mouseX !== 0 || this.mouseY !== 0) {
      const rightVector = new THREE.Vector3(1, 0, 0);
      rightVector.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.followCamera.rotation.y);
      
      const upVector = new THREE.Vector3(0, 1, 0);
      
      // Add mouse-based offset
      desiredCameraPosition.add(rightVector.multiplyScalar(this.mouseX * this.mouseInfluence));
      desiredCameraPosition.add(upVector.multiplyScalar(-this.mouseY * this.mouseInfluence));
    }
    
    // Smoothly interpolate camera position
    this.followCamera.position.lerp(desiredCameraPosition, Math.min(1.0, 5.0 * delta));
    
    // Create a temporary vector for the look-at position
    const currentLookAt = new THREE.Vector3();
    
    // If we have a previous look-at position, use it for interpolation
    if (this.previousLookAt) {
      currentLookAt.copy(this.previousLookAt);
      currentLookAt.lerp(desiredLookAtPosition, Math.min(1.0, 5.0 * delta));
    } else {
      currentLookAt.copy(desiredLookAtPosition);
    }
    
    // Store the current look-at position for next frame
    this.previousLookAt = currentLookAt.clone();
    
    // Make the camera look at the interpolated position
    this.followCamera.lookAt(currentLookAt);
  }
  
  updateCameraTransition(delta) {
    // Update transition progress
    this.transitionProgress += delta / this.transitionDuration;
    
    // Clamp progress to 0-1
    this.transitionProgress = Math.min(1.0, this.transitionProgress);
    
    // Use smooth step for easing
    const t = this.smoothStep(0, 1, this.transitionProgress);
    
    // Interpolate camera position
    const newPosition = new THREE.Vector3();
    newPosition.lerpVectors(this.transitionStartPosition, this.transitionTargetPosition, t);
    this.followCamera.position.copy(newPosition);
    
    // Interpolate look-at position
    const newLookAt = new THREE.Vector3();
    newLookAt.lerpVectors(this.transitionStartLookAt, this.transitionTargetLookAt, t);
    this.followCamera.lookAt(newLookAt);
    
    // Check if transition is complete
    if (this.transitionProgress >= 1.0) {
      this.isTransitioning = false;
      this.previousLookAt = newLookAt.clone();
    }
  }
  
  smoothStep(min, max, value) {
    // Hermite interpolation for smooth transitions
    const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
    return x * x * (3 - 2 * x);
  }
  
  updateOrbitCamera(delta) {
    // Update orbit angle
    this.orbitAngle += this.orbitSpeed * delta;
    
    // Calculate camera position
    const x = Math.sin(this.orbitAngle) * this.orbitRadius;
    const z = Math.cos(this.orbitAngle) * this.orbitRadius;
    
    // Set camera position
    this.orbitCamera.position.set(
      this.target.mesh.position.x + x,
      this.target.mesh.position.y + this.orbitHeight,
      this.target.mesh.position.z + z
    );
    
    // Look at target
    this.orbitCamera.lookAt(this.target.mesh.position);
  }
  
  updateFixedCamera(delta) {
    // Fixed camera doesn't move, but still looks at target
    this.fixedCamera.lookAt(this.target.mesh.position);
  }
  
  toggleCameraMode() {
    // Cycle through camera modes
    switch (this.currentMode) {
      case 'follow':
        this.currentMode = 'orbit';
        this.activeCamera = this.orbitCamera;
        break;
      case 'orbit':
        this.currentMode = 'fixed';
        this.activeCamera = this.fixedCamera;
        break;
      case 'fixed':
        this.currentMode = 'follow';
        this.activeCamera = this.followCamera;
        break;
    }
    
    return this.currentMode;
  }
  
  setPreset(index) {
    // Set camera to a specific preset
    switch (index) {
      case 0: // Default follow camera
        this.currentMode = 'follow';
        this.activeCamera = this.followCamera;
        this.followDistance = 15;
        this.followHeight = 8;
        this.followOffset = 5;
        break;
        
      case 1: // Close follow camera
        this.currentMode = 'follow';
        this.activeCamera = this.followCamera;
        this.followDistance = 8;
        this.followHeight = 4;
        this.followOffset = 2;
        break;
        
      case 2: // Top-down view
        this.currentMode = 'fixed';
        this.activeCamera = this.fixedCamera;
        this.fixedCamera.position.set(
          this.target.mesh.position.x,
          this.target.mesh.position.y + 50,
          this.target.mesh.position.z
        );
        break;
        
      case 3: // Cinematic orbit
        this.currentMode = 'orbit';
        this.activeCamera = this.orbitCamera;
        this.orbitRadius = 30;
        this.orbitHeight = 15;
        this.orbitSpeed = 0.1;
        break;
    }
    
    return this.currentMode;
  }
  
  handleMouseMove(event) {
    // Update mouse position for camera control
    this.mouseX = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouseY = (event.clientY / window.innerHeight) * 2 - 1;
  }
  
  resize(width, height) {
    // Update all cameras with new aspect ratio
    const aspect = width / height;
    
    this.followCamera.aspect = aspect;
    this.followCamera.updateProjectionMatrix();
    
    this.orbitCamera.aspect = aspect;
    this.orbitCamera.updateProjectionMatrix();
    
    this.fixedCamera.aspect = aspect;
    this.fixedCamera.updateProjectionMatrix();
  }
  
  setTarget(target, immediate = false) {
    // If immediate, just set the target
    if (immediate) {
      this.target = target;
      return;
    }
    
    // Otherwise, start a transition
    this.startTransition(target);
  }
  
  startTransition(newTarget) {
    // Store current camera position and look-at as transition start
    this.transitionStartPosition = this.followCamera.position.clone();
    this.transitionStartLookAt = this.previousLookAt ? 
      this.previousLookAt.clone() : 
      this.target.mesh.position.clone();
    
    // Store the current target
    const oldTarget = this.target;
    
    // Set new target
    this.target = newTarget;
    
    // Calculate target position for new target
    const isExplorer = this.target.isActive !== undefined;
    let targetPosition, targetDirection;
    
    if (isExplorer && this.target.isActive) {
      // Explorer camera settings
      this.followDistance = 8;
      this.followHeight = 4;
      this.followOffset = 2;
      
      targetPosition = this.target.mesh.position.clone();
      targetDirection = new THREE.Vector3(0, 0, 1).applyAxisAngle(
        new THREE.Vector3(0, 1, 0), this.target.mesh.rotation.y
      );
      
      // Calculate desired camera position
      const cameraOffset = targetDirection.clone().multiplyScalar(-this.followDistance);
      this.transitionTargetPosition = targetPosition.clone().add(cameraOffset);
      this.transitionTargetPosition.y = targetPosition.y + this.followHeight;
      
      // Add slight offset to the side
      const rightVector = new THREE.Vector3(1, 0, 0);
      rightVector.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.target.mesh.rotation.y);
      this.transitionTargetPosition.add(rightVector.multiplyScalar(this.followOffset));
      
      // Set look-at target
      this.transitionTargetLookAt = targetPosition.clone();
      this.transitionTargetLookAt.y += 1.0; // Look slightly above player
    } else {
      // Ship camera settings
      this.followDistance = 15;
      this.followHeight = 8;
      this.followOffset = 5;
      
      targetPosition = this.target.mesh.position.clone();
      targetDirection = new THREE.Vector3(0, 0, 1).applyQuaternion(this.target.mesh.quaternion);
      
      // Calculate desired camera position
      const cameraOffset = targetDirection.clone().multiplyScalar(-this.followDistance);
      this.transitionTargetPosition = targetPosition.clone().add(cameraOffset);
      this.transitionTargetPosition.y = targetPosition.y + this.followHeight;
      
      // Add slight offset to the side
      const rightVector = new THREE.Vector3(1, 0, 0);
      rightVector.applyQuaternion(this.target.mesh.quaternion);
      this.transitionTargetPosition.add(rightVector.multiplyScalar(this.followOffset));
      
      // Set look-at target
      this.transitionTargetLookAt = targetPosition.clone();
      this.transitionTargetLookAt.add(targetDirection.multiplyScalar(10));
    }
    
    // Start transition
    this.isTransitioning = true;
    this.transitionProgress = 0;
  }
  
  getActiveCamera() {
    return this.activeCamera;
  }
} 