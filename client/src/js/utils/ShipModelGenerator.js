import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

export class ShipModelGenerator {
  static generateSimpleShipModel() {
    // Create a group for the ship
    const shipGroup = new THREE.Group();
    
    // Create hull
    const hullGeometry = new THREE.BoxGeometry(3, 1, 7);
    const hullMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x8B4513,
      roughness: 0.7,
      metalness: 0.2
    });
    const hull = new THREE.Mesh(hullGeometry, hullMaterial);
    hull.name = 'hull';
    hull.castShadow = true;
    hull.receiveShadow = true;
    shipGroup.add(hull);
    
    // Create mast
    const mastGeometry = new THREE.CylinderGeometry(0.1, 0.1, 4, 8);
    const mastMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x8B4513,
      roughness: 0.8
    });
    const mast = new THREE.Mesh(mastGeometry, mastMaterial);
    mast.name = 'mast';
    mast.position.set(0, 2.5, 0);
    mast.castShadow = true;
    shipGroup.add(mast);
    
    // Create sail
    const sailGeometry = new THREE.PlaneGeometry(3, 3);
    const sailMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xF5F5DC,
      side: THREE.DoubleSide,
      roughness: 0.5
    });
    const sail = new THREE.Mesh(sailGeometry, sailMaterial);
    sail.name = 'sail';
    sail.position.set(0, 2.5, 0);
    sail.rotation.y = Math.PI / 2;
    sail.castShadow = true;
    shipGroup.add(sail);
    
    // Create outrigger float
    const floatGeometry = new THREE.CylinderGeometry(0.3, 0.3, 5, 8);
    floatGeometry.rotateZ(Math.PI / 2);
    const float = new THREE.Mesh(floatGeometry, hullMaterial);
    float.name = 'float';
    float.position.set(2.5, 0, 0);
    float.scale.set(1, 0.4, 1);
    float.castShadow = true;
    shipGroup.add(float);
    
    // Create connecting beams
    const beamGeometry = new THREE.BoxGeometry(3, 0.2, 0.2);
    const beam1 = new THREE.Mesh(beamGeometry, mastMaterial);
    beam1.name = 'beam1';
    beam1.position.set(1.25, 0.6, 1.5);
    beam1.castShadow = true;
    shipGroup.add(beam1);
    
    const beam2 = new THREE.Mesh(beamGeometry, mastMaterial);
    beam2.name = 'beam2';
    beam2.position.set(1.25, 0.6, -1.5);
    beam2.castShadow = true;
    shipGroup.add(beam2);
    
    // Create cannon mounts
    const cannonMountGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.5, 8);
    cannonMountGeometry.rotateX(Math.PI / 2);
    const cannonMountMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    
    // Left cannon mount
    const leftCannonMount = new THREE.Mesh(cannonMountGeometry, cannonMountMaterial);
    leftCannonMount.name = 'leftCannonMount';
    leftCannonMount.position.set(-1.5, 0.5, 0);
    leftCannonMount.rotation.z = Math.PI / 2;
    shipGroup.add(leftCannonMount);
    
    // Right cannon mount
    const rightCannonMount = new THREE.Mesh(cannonMountGeometry, cannonMountMaterial);
    rightCannonMount.name = 'rightCannonMount';
    rightCannonMount.position.set(1.5, 0.5, 0);
    rightCannonMount.rotation.z = -Math.PI / 2;
    shipGroup.add(rightCannonMount);
    
    // Front cannon mount
    const frontCannonMount = new THREE.Mesh(cannonMountGeometry, cannonMountMaterial);
    frontCannonMount.name = 'frontCannonMount';
    frontCannonMount.position.set(0, 0.5, -3.5);
    shipGroup.add(frontCannonMount);
    
    return shipGroup;
  }
  
  static exportToGLB(callback) {
    const shipModel = this.generateSimpleShipModel();
    const exporter = new GLTFExporter();
    
    exporter.parse(shipModel, (gltf) => {
      const blob = new Blob([gltf], { type: 'application/octet-stream' });
      callback(blob);
    }, { binary: true });
  }
  
  static downloadShipModel() {
    this.exportToGLB((blob) => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'ship.glb';
      link.click();
    });
  }
} 