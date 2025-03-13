import * as THREE from 'three';

export class Character {
  constructor() {
    // Character properties
    this.mesh = new THREE.Group();
    this.hairStrands = [];
    this.hairPhysicsEnabled = true;

    // Animation properties
    this.animationTime = 0;
    this.swayAmount = 0.1;
  }

  async init() {
    // Create a simple character inspired by Moana
    this.createCharacterMesh();

    return this;
  }

  createCharacterMesh() {
    // Body
    const bodyGeometry = new THREE.CylinderGeometry(0.3, 0.5, 1.2, 8);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xCD853F });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.6;
    this.mesh.add(body);

    // Head
    const headGeometry = new THREE.SphereGeometry(0.4, 16, 16);
    const headMaterial = new THREE.MeshStandardMaterial({ color: 0xCD853F });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.5;
    this.mesh.add(head);

    // Hair (multiple strands for physics)
    const hairColor = 0x1A1A1A;
    this.createHair(head.position, hairColor);

    // Eyes
    const eyeGeometry = new THREE.SphereGeometry(0.08, 8, 8);
    const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });

    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(0.15, 1.5, 0.35);
    this.mesh.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(-0.15, 1.5, 0.35);
    this.mesh.add(rightEye);

    // Mouth (simple curve)
    const mouthGeometry = new THREE.TorusGeometry(0.1, 0.02, 8, 6, Math.PI);
    const mouthMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
    const mouth = new THREE.Mesh(mouthGeometry, mouthMaterial);
    mouth.position.set(0, 1.35, 0.35);
    mouth.rotation.x = Math.PI / 2;
    this.mesh.add(mouth);

    // Clothing (simple top)
    const topGeometry = new THREE.CylinderGeometry(0.35, 0.55, 0.6, 8);
    const topMaterial = new THREE.MeshStandardMaterial({ color: 0xE57373 });
    const top = new THREE.Mesh(topGeometry, topMaterial);
    top.position.y = 0.6;
    this.mesh.add(top);

    // Skirt
    const skirtGeometry = new THREE.CylinderGeometry(0.55, 0.7, 0.6, 8);
    const skirtMaterial = new THREE.MeshStandardMaterial({ color: 0xFFA07A });
    const skirt = new THREE.Mesh(skirtGeometry, skirtMaterial);
    skirt.position.y = 0.1;
    this.mesh.add(skirt);

    // Add shadow casting to all parts
    this.mesh.traverse(child => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }

  createHair(headPosition, color) {
    // Create multiple hair strands with physics
    const hairMaterial = new THREE.MeshStandardMaterial({ color });

    // Create a base for the hair
    const hairBaseGeometry = new THREE.SphereGeometry(0.38, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const hairBase = new THREE.Mesh(hairBaseGeometry, hairMaterial);
    hairBase.position.copy(headPosition);
    hairBase.position.y += 0.02;
    this.mesh.add(hairBase);

    // Create flowing hair strands
    const strandCount = 8;
    const strandSegments = 5;
    const strandLength = 1.2;

    for (let i = 0; i < strandCount; i++) {
      const angle = (i / strandCount) * Math.PI * 2;
      const strand = new THREE.Group();

      // Position at the edge of the head
      strand.position.set(
        headPosition.x + Math.sin(angle) * 0.35,
        headPosition.y - 0.1,
        headPosition.z + Math.cos(angle) * 0.35,
      );

      // Create segments for the strand
      const segments = [];
      for (let j = 0; j < strandSegments; j++) {
        const segmentGeometry = new THREE.SphereGeometry(0.08 - (j * 0.01), 6, 6);
        const segment = new THREE.Mesh(segmentGeometry, hairMaterial);
        segment.position.y = -j * (strandLength / strandSegments);

        // Connect to previous segment
        if (j > 0) {
          segment.position.copy(segments[j-1].position);
          segment.position.y -= 0.2;
        }

        strand.add(segment);
        segments.push(segment);
      }

      this.mesh.add(strand);
      this.hairStrands.push({
        group: strand,
        segments: segments,
        angle: angle,
        velocity: new THREE.Vector3(0, 0, 0),
        originalPositions: segments.map(s => s.position.clone()),
      });
    }
  }

  update(delta, ship) {
    // Update animation time
    this.animationTime += delta;

    // Gentle body sway based on ship movement
    if (ship && ship.speed) {
      const swayAngle = Math.sin(this.animationTime * 2) * this.swayAmount * (ship.speed / ship.maxSpeed);
      this.mesh.rotation.z = swayAngle;
      this.mesh.rotation.x = Math.sin(this.animationTime * 3) * this.swayAmount * 0.5 * (ship.speed / ship.maxSpeed);
    }

    // Update hair physics
    if (this.hairPhysicsEnabled) {
      this.updateHairPhysics(delta, ship);
    }
  }

  updateHairPhysics(delta, ship) {
    // Skip if no ship data
    if (!ship) return;

    // Calculate forces based on ship movement and rotation
    const shipVelocity = ship.velocity.clone();
    const shipRotation = ship.mesh.rotation.y - this.mesh.rotation.y;

    // Apply physics to each hair strand
    this.hairStrands.forEach(strand => {
      // Apply forces to each segment
      for (let i = 0; i < strand.segments.length; i++) {
        const segment = strand.segments[i];

        // Base movement from ship velocity (opposite direction)
        const force = shipVelocity.clone().multiplyScalar(-0.5);

        // Add rotational force
        force.x += Math.sin(shipRotation) * 2;
        force.z += Math.cos(shipRotation) * 2;

        // Add gravity
        force.y -= 9.8 * delta;

        // Add wind effect
        const windForce = Math.sin(this.animationTime + strand.angle) * 0.5;
        force.x += windForce;
        force.z += windForce;

        // Apply force with more effect on segments further from the head
        const segmentForce = force.clone().multiplyScalar(delta * (i + 1) / strand.segments.length);
        strand.velocity.add(segmentForce);

        // Damping
        strand.velocity.multiplyScalar(0.95);

        // Apply velocity to position
        segment.position.add(strand.velocity.clone().multiplyScalar(delta));

        // Constrain to maximum distance from original position
        const originalPos = strand.originalPositions[i].clone();
        const maxDistance = 0.2 * (i + 1);
        const currentDistance = segment.position.distanceTo(originalPos);

        if (currentDistance > maxDistance) {
          const direction = segment.position.clone().sub(originalPos).normalize();
          segment.position.copy(originalPos.clone().add(direction.multiplyScalar(maxDistance)));
        }
      }
    });
  }
}