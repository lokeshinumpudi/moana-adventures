const logger = require('./logger');

const TWO_PI = Math.PI * 2;

/**
 * Server-authoritative wind. One source of truth for every client so sails,
 * flags, particles, and any future projectile drift all agree on direction.
 *
 * Drifts slowly via Ornstein-Uhlenbeck-ish smoothing — not random walk —
 * so the wind feels like weather, not strobe.
 */
class WindManager {
  constructor(io, opts = {}) {
    this.io = io;
    this.broadcastInterval = opts.broadcastInterval || 5000;
    this.tickInterval = opts.tickInterval || 500;

    this.targetDirection = Math.random() * TWO_PI;
    this.direction = this.targetDirection;
    this.targetStrength = 0.55;
    this.strength = this.targetStrength;

    this._tickHandle = setInterval(() => this._tick(), this.tickInterval);
    this._broadcastHandle = setInterval(() => this._broadcast(), this.broadcastInterval);

    this._setupSocketHandlers();
    logger.info({ direction: this.direction.toFixed(2), strength: this.strength.toFixed(2) }, 'WindManager initialized');
  }

  _setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      socket.emit('wind:state', this.snapshot());
      socket.on('wind:request', () => socket.emit('wind:state', this.snapshot()));
    });
  }

  _tick() {
    if (Math.random() < 0.05) {
      this.targetDirection = (this.targetDirection + (Math.random() - 0.5) * 0.6 + TWO_PI) % TWO_PI;
    }
    if (Math.random() < 0.08) {
      this.targetStrength = 0.25 + Math.random() * 0.6;
    }

    let delta = this.targetDirection - this.direction;
    if (delta > Math.PI) delta -= TWO_PI;
    if (delta < -Math.PI) delta += TWO_PI;
    this.direction = (this.direction + delta * 0.05 + TWO_PI) % TWO_PI;
    this.strength += (this.targetStrength - this.strength) * 0.05;
  }

  _broadcast() {
    this.io.emit('wind:state', this.snapshot());
  }

  snapshot() {
    return {
      direction: this.direction,
      strength: Number(this.strength.toFixed(3)),
      serverTime: Date.now(),
    };
  }

  dispose() {
    clearInterval(this._tickHandle);
    clearInterval(this._broadcastHandle);
  }
}

module.exports = WindManager;
