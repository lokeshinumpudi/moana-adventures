import * as THREE from 'three';

/**
 * Translucent wind ribbons that drift over the ocean in the current
 * wind direction — a global ambient cue separate from per-ship flags.
 *
 * Add once per Game on the scene root:
 *
 *   this.windRibbons = new WindRibbons();
 *   this.scene.add(this.windRibbons.group);
 *
 * Then call `windRibbons.update(delta, ship.position, wind)` each frame,
 * where `wind = { direction, strength }`. Ribbons recycle when they exit
 * a 200-unit radius around the camera/ship.
 */
const RIBBON_COUNT = 64;
const FIELD_RADIUS = 220;

export class WindRibbons {
  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'WindRibbons';

    const geom = new THREE.PlaneGeometry(2.8, 0.18);
    geom.rotateX(-Math.PI / 2);

    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    this._ribbons = [];
    for (let i = 0; i < RIBBON_COUNT; i++) {
      const m = new THREE.Mesh(geom, material);
      m.position.set(
        (Math.random() - 0.5) * FIELD_RADIUS * 2,
        0.4,
        (Math.random() - 0.5) * FIELD_RADIUS * 2,
      );
      this.group.add(m);
      this._ribbons.push(m);
    }

    this._tmp = new THREE.Vector3();
  }

  /**
   * @param {number} delta seconds since last frame
   * @param {THREE.Vector3} centerPos position to keep ribbons around
   * @param {{direction:number, strength:number}} wind world-frame radians, 0..1
   */
  update(delta, centerPos, wind) {
    if (!wind) return;
    const speed = 4 + wind.strength * 16;
    const dx = Math.sin(wind.direction) * speed * delta;
    const dz = Math.cos(wind.direction) * speed * delta;

    // Yaw each ribbon to face downwind
    const yaw = Math.atan2(Math.sin(wind.direction), Math.cos(wind.direction));

    for (const r of this._ribbons) {
      r.position.x += dx;
      r.position.z += dz;
      r.rotation.y = yaw;

      // Recycle when too far from the centre
      this._tmp.copy(r.position).sub(centerPos);
      this._tmp.y = 0;
      if (this._tmp.length() > FIELD_RADIUS) {
        // Respawn upstream of centre
        const upstreamX = centerPos.x - Math.sin(wind.direction) * FIELD_RADIUS * 0.95;
        const upstreamZ = centerPos.z - Math.cos(wind.direction) * FIELD_RADIUS * 0.95;
        const lateral = (Math.random() - 0.5) * FIELD_RADIUS * 1.2;
        r.position.x = upstreamX + Math.cos(wind.direction) * lateral;
        r.position.z = upstreamZ - Math.sin(wind.direction) * lateral;
      }
    }
  }
}

/**
 * Compute a sail-effectiveness multiplier in [0.35, 1.15] for a ship
 * heading at `shipYaw` (radians, world frame, +Z = forward) given the
 * current wind. Wind blowing from behind = boost; into the wind = drag.
 *
 *   import { sailEffectiveness } from './components/WindIndicator.js';
 *   const eff = sailEffectiveness(this.mesh.rotation.y, this.game.wind);
 *   ...velocity.multiplyScalar(this.speed * delta * eff);
 */
export function sailEffectiveness(shipYaw, wind) {
  if (!wind) return 1;
  // dotProduct of ship-forward and wind-direction (both unit, world-frame)
  const fx = Math.sin(shipYaw);
  const fz = Math.cos(shipYaw);
  const wx = Math.sin(wind.direction);
  const wz = Math.cos(wind.direction);
  const dot = fx * wx + fz * wz; // 1 = downwind, -1 = headwind
  // Map [-1, 1] to [0.35, 1.15], scaled by wind strength
  const base = 0.75 + 0.4 * dot;
  return THREE.MathUtils.lerp(1, base, Math.max(0.2, wind.strength));
}
