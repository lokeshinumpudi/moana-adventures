import * as THREE from 'three';

/**
 * Build a low-poly stylised ship — carved hull, proper mast with yardarm,
 * curved sail, bowsprit, and a flag pivot at the masthead. Returns a Group
 * with named children so callers can grab them later (e.g. tinting the
 * sail, attaching a flag, animating the cannon recoil).
 *
 * Drop-in replacement for the cuboid hull in Ship.createBasicShip(). To
 * wire it, replace that method's body with:
 *
 *   const model = buildShipModel({ hullColor: this.originalColor });
 *   this.mesh.add(model);
 *   this.hull = model.userData.hull;       // for damage tinting
 *   this.flagPivot = model.userData.flagPivot; // for wind flag
 *
 * Coordinate system matches the existing Ship: forward = +Z, port = +X.
 */
export function buildShipModel({
  hullColor = new THREE.Color(0x8b5a2b),
  sailColor = new THREE.Color(0xf5e6c8),
  trimColor = new THREE.Color(0x3a2418),
} = {}) {
  const group = new THREE.Group();
  group.name = 'ShipModel';

  const hullMat = new THREE.MeshStandardMaterial({
    color: hullColor,
    roughness: 0.85,
    metalness: 0.05,
    flatShading: true,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: trimColor,
    roughness: 0.9,
    metalness: 0.05,
    flatShading: true,
  });
  const woodMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0x6b4423),
    roughness: 0.95,
    metalness: 0.0,
    flatShading: true,
  });
  const sailMat = new THREE.MeshStandardMaterial({
    color: sailColor,
    roughness: 0.7,
    metalness: 0.0,
    side: THREE.DoubleSide,
    flatShading: true,
  });
  const ironMat = new THREE.MeshStandardMaterial({
    color: 0x2a2a2a,
    roughness: 0.6,
    metalness: 0.6,
  });

  // ---- Hull: tapered prism with raised bow, made by ExtrudeGeometry over
  //      a top-down outline. Cheap geometry, looks carved.
  const hullShape = new THREE.Shape();
  hullShape.moveTo(0, 3.6);          // bow point
  hullShape.lineTo(1.4, 1.4);
  hullShape.lineTo(1.6, -3.2);       // stern beam
  hullShape.lineTo(-1.6, -3.2);
  hullShape.lineTo(-1.4, 1.4);
  hullShape.lineTo(0, 3.6);

  const hullGeom = new THREE.ExtrudeGeometry(hullShape, {
    depth: 1.4,
    bevelEnabled: true,
    bevelThickness: 0.18,
    bevelSize: 0.18,
    bevelSegments: 2,
    curveSegments: 2,
  });
  // Extrude pushes along +Z; we want depth on Y instead.
  hullGeom.rotateX(-Math.PI / 2);
  hullGeom.translate(0, -1.0, 0); // sink so deck sits near y=0

  const hull = new THREE.Mesh(hullGeom, hullMat);
  hull.castShadow = true;
  hull.receiveShadow = true;
  hull.name = 'hull';
  group.add(hull);

  // Deck plank trim around the gunwale
  const deckRing = new THREE.Mesh(
    new THREE.TorusGeometry(2.6, 0.06, 4, 12),
    trimMat,
  );
  deckRing.rotation.x = Math.PI / 2;
  deckRing.scale.set(0.7, 1.1, 1);
  deckRing.position.y = 0.05;
  deckRing.castShadow = true;
  group.add(deckRing);

  // Bowsprit — pointed wood beam off the bow
  const bowsprit = new THREE.Mesh(
    new THREE.ConeGeometry(0.12, 1.6, 6),
    woodMat,
  );
  bowsprit.rotation.x = -Math.PI / 2;
  bowsprit.position.set(0, 0.1, 4.2);
  bowsprit.castShadow = true;
  group.add(bowsprit);

  // Mast — slightly tapered cylinder
  const mast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.18, 5.2, 8),
    woodMat,
  );
  mast.position.set(0, 2.4, 0.2);
  mast.castShadow = true;
  group.add(mast);

  // Yardarm (horizontal spar) holding the sail
  const yard = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 4.4, 6),
    woodMat,
  );
  yard.rotation.z = Math.PI / 2;
  yard.position.set(0, 4.4, 0.2);
  yard.castShadow = true;
  group.add(yard);

  // Curved sail — a plane displaced into a gentle bow shape so it doesn't
  // look like cardboard. PlaneGeometry segments allow the curve.
  const sailGeom = new THREE.PlaneGeometry(4.2, 3.6, 8, 6);
  const sailPositions = sailGeom.attributes.position;
  for (let i = 0; i < sailPositions.count; i++) {
    const x = sailPositions.getX(i);
    const y = sailPositions.getY(i);
    // Convex bow on the leeward side, scaled by horizontal taper
    const bow = Math.cos((x / 2.1) * (Math.PI / 2)) * 0.55;
    const yFactor = 1 - Math.abs(y) / 1.8;
    sailPositions.setZ(i, bow * Math.max(0, yFactor));
  }
  sailGeom.computeVertexNormals();
  const sail = new THREE.Mesh(sailGeom, sailMat);
  sail.position.set(0, 2.6, 0.2);
  sail.castShadow = true;
  sail.name = 'sail';
  group.add(sail);

  // Flag pivot at masthead — caller rotates this Y to point downwind
  const flagPivot = new THREE.Group();
  flagPivot.position.set(0, 5.05, 0.2);
  flagPivot.name = 'flagPivot';
  group.add(flagPivot);

  const flag = new THREE.Mesh(
    new THREE.PlaneGeometry(1.0, 0.5),
    new THREE.MeshStandardMaterial({
      color: hullColor,
      roughness: 0.6,
      side: THREE.DoubleSide,
    }),
  );
  flag.position.set(0.5, 0, 0); // hangs from staff toward +X (downwind)
  flag.castShadow = true;
  flagPivot.add(flag);

  // Side cannons (3 per side) — the existing Ship code references a single
  // leftCannon/rightCannon, so we keep two as the primary mounts and add
  // four more as visual detail. Drop the duplicates if you don't want them.
  const cannonGeom = new THREE.CylinderGeometry(0.18, 0.18, 0.9, 8);
  cannonGeom.rotateZ(Math.PI / 2);

  const leftCannon = new THREE.Mesh(cannonGeom, ironMat);
  leftCannon.position.set(1.55, 0.45, 0);
  leftCannon.castShadow = true;
  leftCannon.name = 'leftCannon';
  group.add(leftCannon);

  const rightCannon = new THREE.Mesh(cannonGeom, ironMat);
  rightCannon.position.set(-1.55, 0.45, 0);
  rightCannon.castShadow = true;
  rightCannon.name = 'rightCannon';
  group.add(rightCannon);

  for (const z of [1.4, -1.4]) {
    for (const sx of [1.55, -1.55]) {
      const c = new THREE.Mesh(cannonGeom, ironMat);
      c.position.set(sx, 0.45, z);
      c.castShadow = true;
      group.add(c);
    }
  }

  // Front bow chaser cannon
  const frontCannonGeom = new THREE.CylinderGeometry(0.18, 0.18, 1.0, 8);
  frontCannonGeom.rotateX(Math.PI / 2);
  const frontCannon = new THREE.Mesh(frontCannonGeom, ironMat);
  frontCannon.position.set(0, 0.45, 3.4);
  frontCannon.castShadow = true;
  frontCannon.name = 'frontCannon';
  group.add(frontCannon);

  group.userData = { hull, sail, flagPivot, flag, leftCannon, rightCannon, frontCannon };
  return group;
}
