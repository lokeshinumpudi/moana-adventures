import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class CameraManager {
  constructor(scene, target) {
    this.scene = scene;
    this.target = target;
    
    // Camera mode settings
    this.isOrbitMode = false;
    this.followDistance = 15;
    this.followHeight = 8;
    this.followOffset = 5;
    
    // Initialize cameras
    this.initCameras();
    
    // Set active camera
    this.activeCamera = this.followCamera;
    
    // Camera presets for orbit mode
    this.presets = [
      { position: new THREE.Vector3(0, 50, 0), target: new THREE.Vector3(0, 0, 0) }, // Top-down
      { position: new THREE.Vector3(30, 10, 0), target: new THREE.Vector3(0, 0, 0) }, // Side
      { position: new THREE.Vector3(0, 10, 30), target: new THREE.Vector3(0, 0, 0) }, // Front
      { position: new THREE.Vector3(0, 2, 0), target: new THREE.Vector3(5, 2, 0) }    // First-person
    ];
  }
  
  initCameras() {
    // Follow camera (third-person view)
    this.followCamera = new THREE.PerspectiveCamera(
      70, window.innerWidth / window.innerHeight, 0.1, 1000
    );
    
    // Orbit camera (debug/free view)
    this.orbitCamera = new THREE.PerspectiveCamera(
      70, window.innerWidth / window.innerHeight, 0.1, 1000
    );
    this.orbitCamera.position.set(0, 20, 20);
    this.orbitControls = new OrbitControls(this.orbitCamera, document.querySelector('canvas'));
    this.orbitControls.enableDamping = true;
    this.orbitControls.dampingFactor = 0.1;
    this.orbitControls.enableZoom = true;
    
    // Add cameras to scene
    this.scene.add(this.followCamera);
    this.scene.add(this.orbitCamera);
  }
  
  update() {
    if (this.isOrbitMode) {
      // Update orbit controls
      this.orbitControls.update();
    } else {
      // Update follow camera position
      this.updateFollowCamera();
    }
  }
  
  updateFollowCamera() {
    if (!this.target || !this.target.mesh) return;
    
    // Get ship position and rotation
    const shipPosition = this.target.mesh.position.clone();
    const shipDirection = new THREE.Vector3(0, 0, 1).applyQuaternion(this.target.mesh.quaternion);
    
    // Calculate camera position behind ship
    const cameraOffset = shipDirection.clone().multiplyScalar(-this.followDistance);
    const cameraPosition = shipPosition.clone().add(cameraOffset);
    cameraPosition.y += this.followHeight;
    
    // Move camera slightly to side for better view
    const rightVector = new THREE.Vector3(1, 0, 0).applyQuaternion(this.target.mesh.quaternion);
    cameraPosition.add(rightVector.multiplyScalar(this.followOffset));
    
    // Update camera position
    this.followCamera.position.copy(cameraPosition);
    
    // Look slightly ahead of the ship
    const lookAtPosition = shipPosition.clone().add(shipDirection.multiplyScalar(this.followOffset));
    this.followCamera.lookAt(lookAtPosition);
  }
  
  toggleCameraMode() {
    this.isOrbitMode = !this.isOrbitMode;
    
    // Switch active camera
    this.activeCamera = this.isOrbitMode ? this.orbitCamera : this.followCamera;
    
    // If switching to orbit mode, set target
    if (this.isOrbitMode && this.target) {
      this.orbitControls.target.copy(this.target.mesh.position);
    }
  }
  
  setPreset(index) {
    if (!this.isOrbitMode || index < 0 || index >= this.presets.length) return;
    
    const preset = this.presets[index];
    
    // If we have a target, adjust the preset to target's position
    if (this.target && this.target.mesh) {
      const targetPos = this.target.mesh.position.clone();
      
      // Adjust orbit camera position
      this.orbitCamera.position.copy(preset.position.clone().add(targetPos));
      
      // Adjust orbit controls target
      this.orbitControls.target.copy(preset.target.clone().add(targetPos));
    } else {
      // No target, use preset as is
      this.orbitCamera.position.copy(preset.position);
      this.orbitControls.target.copy(preset.target);
    }
    
    // Update controls
    this.orbitControls.update();
  }
  
  handleMouseMove(event) {
    // Only used for orbit camera when dragging
    if (!this.isOrbitMode) return;
    
    // OrbitControls handles this automatically
  }
  
  resize(width, height) {
    // Update camera aspect ratios
    this.followCamera.aspect = width / height;
    this.followCamera.updateProjectionMatrix();
    
    this.orbitCamera.aspect = width / height;
    this.orbitCamera.updateProjectionMatrix();
  }
} 