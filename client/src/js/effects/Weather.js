import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';

/**
 * Weather: single source of truth for sun, sky, and ambient lighting.
 *
 * Replaces the previous setup which had two duplicate sky spheres
 * (SkyBox + Weather) and a separate directional sun in Game.addLights —
 * those fought each other and produced a flat, washed-out look.
 *
 * Uses three's Sky (Hosek-Wilkie atmospheric scattering) and exposes
 * the live sun direction so Ocean.water can match its specular glints.
 */
export class Weather {
  constructor(scene, game = null) {
    this.scene = scene;
    this.game = game;

    // Day/night state
    this.timeOfDay = 0.32; // mid-morning by default
    this.dayDuration = 600; // 10 min full cycle
    this.lastUpdate = Date.now();
    this.useServerTime = true;

    // Reusable temp vectors (don't allocate per frame)
    this._sunDir = new THREE.Vector3();
    this._tmpColor = new THREE.Color();

    // Sky (Hosek-Wilkie)
    this.sky = new Sky();
    this.sky.scale.setScalar(10000);
    const u = this.sky.material.uniforms;
    u.turbidity.value = 4.5;
    u.rayleigh.value = 2.2;
    u.mieCoefficient.value = 0.005;
    u.mieDirectionalG.value = 0.8;
    this.scene.add(this.sky);

    // Sun (drives shadows)
    this.sunLight = new THREE.DirectionalLight(0xffffff, 2.2);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(2048, 2048);
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 600;
    this.sunLight.shadow.camera.left = -120;
    this.sunLight.shadow.camera.right = 120;
    this.sunLight.shadow.camera.top = 120;
    this.sunLight.shadow.camera.bottom = -120;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.02;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    // Hemisphere (fills shadows with sky bounce)
    this.hemiLight = new THREE.HemisphereLight(0x9ec9ff, 0x214d6e, 0.6);
    this.scene.add(this.hemiLight);

    // Atmospheric fog tinted to sky color
    this.scene.fog = new THREE.FogExp2(0x9ec9ff, 0.0008);

    this.updateWeather();
  }

  setTimeOfDay(time) {
    this.timeOfDay = time;
    this.updateWeather();
  }

  update() {
    const now = Date.now();
    const delta = (now - this.lastUpdate) / 1000;
    this.lastUpdate = now;

    if (!this.useServerTime) {
      this.timeOfDay = (this.timeOfDay + delta / this.dayDuration) % 1;
    }

    this.updateWeather();
  }

  /**
   * Sun travels across an arc tilted away from the horizon so we
   * get a proper sunset path rather than the sun rolling through
   * the floor. timeOfDay 0..1 maps to a full sky orbit.
   */
  updateWeather() {
    // Tilt the orbit so the sun rises in the east, sets in the west,
    // and never sits exactly at the horizon at noon.
    const phi = THREE.MathUtils.degToRad(90 - this.getSunElevation());
    const theta = THREE.MathUtils.degToRad(this.getSunAzimuth());

    this._sunDir.setFromSphericalCoords(1, phi, theta);
    this.sky.material.uniforms.sunPosition.value.copy(this._sunDir);

    // Position the directional light so it actually casts useful shadows
    this.sunLight.position.copy(this._sunDir).multiplyScalar(200);
    this.sunLight.target.position.set(0, 0, 0);

    // Light/colour mood follows altitude
    const altitude = Math.max(this._sunDir.y, -0.2);
    const day = THREE.MathUtils.clamp(altitude * 2.0, 0, 1);
    const dusk = THREE.MathUtils.clamp(1 - Math.abs(altitude * 4), 0, 1);

    // Sun color: warm at horizon, white overhead
    this._tmpColor.setHSL(0.08 - 0.04 * day, 0.7 - 0.5 * day, 0.5 + 0.45 * day);
    this.sunLight.color.copy(this._tmpColor);
    this.sunLight.intensity = 0.4 + 1.8 * day;

    // Hemisphere fill
    this.hemiLight.intensity = 0.25 + 0.5 * day + 0.2 * dusk;

    // Fog colour matches horizon mood
    this._tmpColor.setHSL(0.58, 0.55, 0.35 + 0.45 * day);
    this.scene.fog.color.copy(this._tmpColor);
    this.scene.fog.density = 0.0005 + (1 - day) * 0.0008;

    // Sync the Ocean's water shader to the sun (specular glints)
    if (this.game && this.game.ocean && this.game.ocean.setSunDirection) {
      this.game.ocean.setSunDirection(this._sunDir, this.sunLight.color);
    }
  }

  // Sun arc tuned so noon ≈ ~75° altitude and night dips below horizon
  getSunElevation() {
    // timeOfDay 0=midnight, 0.25=sunrise, 0.5=noon, 0.75=sunset
    const t = this.timeOfDay;
    return Math.sin((t - 0.25) * Math.PI * 2) * 75; // -75..+75
  }

  getSunAzimuth() {
    // East at sunrise → west at sunset
    return 90 + (this.timeOfDay - 0.25) * 360;
  }

  getTimeString() {
    const totalMinutes = this.timeOfDay * 24 * 60;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.floor(totalMinutes % 60);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  }

  getTimeOfDayName() {
    const hour = this.timeOfDay * 24;
    if (hour >= 5 && hour < 8) return 'Dawn';
    if (hour >= 8 && hour < 12) return 'Morning';
    if (hour >= 12 && hour < 14) return 'Noon';
    if (hour >= 14 && hour < 17) return 'Afternoon';
    if (hour >= 17 && hour < 20) return 'Sunset';
    if (hour >= 20 && hour < 22) return 'Dusk';
    return 'Night';
  }
}
