export class InputManager {
  constructor(game) {
    this.game = game;
    this.keys = {};
    this.mousePosition = { x: 0, y: 0 };
    this.leftMouseDown = false;
    this.rightMouseDown = false;
    
    // Key mappings
    this.FORWARD_KEYS = ['w', 'ArrowUp'];
    this.BACKWARD_KEYS = ['s', 'ArrowDown'];
    this.LEFT_KEYS = ['a', 'ArrowLeft'];
    this.RIGHT_KEYS = ['d', 'ArrowRight'];
    this.LEFT_CANNON_KEYS = ['q'];
    this.RIGHT_CANNON_KEYS = ['e'];
    this.FRONT_CANNON_KEY = ['f'];
    this.LEFT_MACHINE_GUN_KEYS = ['z'];
    this.RIGHT_MACHINE_GUN_KEYS = ['x'];
    this.CAMERA_TOGGLE_KEYS = ['c'];
    this.CAMERA_PRESET_KEYS = ['1', '2', '3', '4'];
    
    // Automatic fire state
    this.autoFiringLeft = false;
    this.autoFiringRight = false;
    this.autoFiringFront = false;
    
    this.init();
  }
  
  init() {
    // Add event listeners
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
    window.addEventListener('keyup', this.handleKeyUp.bind(this));
    window.addEventListener('mousedown', this.handleMouseDown.bind(this));
    window.addEventListener('mouseup', this.handleMouseUp.bind(this));
    window.addEventListener('mousemove', this.handleMouseMove.bind(this));
    window.addEventListener('contextmenu', (e) => e.preventDefault());
    
    // We no longer need to modify the game.update method
    // The Game class will call our update method directly
  }
  
  handleKeyDown(event) {
    this.keys[event.key] = true;
    
    // Handle cannon fire on key press, not continuously
    if (this.RIGHT_CANNON_KEYS.includes(event.key)) {
      this.fireLeftCannon();
    } else if (this.LEFT_CANNON_KEYS.includes(event.key)) {
      this.fireRightCannon();
    } else if (this.FRONT_CANNON_KEY.includes(event.key)) {
      this.fireFrontCannon();
    }
    
    // Handle machine gun fire - toggle state
    if (this.LEFT_MACHINE_GUN_KEYS.includes(event.key)) {
      this.autoFiringLeft = true;
    } else if (this.RIGHT_MACHINE_GUN_KEYS.includes(event.key)) {
      this.autoFiringRight = true;
    }
    
    // Handle camera toggle
    if (this.CAMERA_TOGGLE_KEYS.includes(event.key) && this.game.cameraManager) {
      this.game.cameraManager.toggleCameraMode();
    }
    
    // Handle camera presets (only in orbit mode)
    if (this.CAMERA_PRESET_KEYS.includes(event.key) && this.game.cameraManager) {
      const presetIndex = parseInt(event.key) - 1;
      this.game.cameraManager.setPreset(presetIndex);
    }
  }
  
  handleKeyUp(event) {
    this.keys[event.key] = false;
    
    // Stop automatic fire on key up
    if (this.LEFT_MACHINE_GUN_KEYS.includes(event.key)) {
      this.autoFiringLeft = false;
    } else if (this.RIGHT_MACHINE_GUN_KEYS.includes(event.key)) {
      this.autoFiringRight = false;
    }
  }
  
  handleMouseDown(event) {
    if (event.button === 0) { // Left mouse button
      this.leftMouseDown = true;
      this.autoFiringLeft = true;
    } else if (event.button === 2) { // Right mouse button
      this.rightMouseDown = true;
      this.autoFiringRight = true;
    } else if (event.button === 1) { // Middle mouse button (wheel)
      this.autoFiringFront = true;
    }
  }
  
  handleMouseUp(event) {
    if (event.button === 0) { // Left mouse button
      this.leftMouseDown = false;
      this.autoFiringLeft = false;
    } else if (event.button === 2) { // Right mouse button
      this.rightMouseDown = false;
      this.autoFiringRight = false;
    } else if (event.button === 1) { // Middle mouse button
      this.autoFiringFront = false;
    }
  }
  
  handleMouseMove(event) {
    this.mousePosition.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mousePosition.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    // If orbit camera is active, update it based on mouse movement
    if (this.game.cameraManager && this.game.cameraManager.isOrbitMode) {
      this.game.cameraManager.handleMouseMove(event);
    }
  }
  
  updateAutoFire() {
    // Handle automatic weapon fire
    const now = Date.now();
    
    if (this.autoFiringLeft && now - this.lastLeftMachineGunFire > this.machineGunCooldown) {
      this.fireLeftMachineGun();
      this.lastLeftMachineGunFire = now;
    }
    
    if (this.autoFiringRight && now - this.lastRightMachineGunFire > this.machineGunCooldown) {
      this.fireRightMachineGun();
      this.lastRightMachineGunFire = now;
    }
    
    if (this.autoFiringFront && now - this.lastFrontCannonFire > this.machineGunCooldown) {
      this.fireFrontCannon();
      this.lastFrontCannonFire = now;
    }
  }
  
  fireLeftCannon() {
    this.game.fireProjectile('left');
  }
  
  fireRightCannon() {
    this.game.fireProjectile('right');
  }
  
  fireLeftMachineGun() {
    this.game.fireMachineGun('left');
  }
  
  fireRightMachineGun() {
    this.game.fireMachineGun('right');
  }
  
  fireFrontCannon() {
    this.game.fireProjectile('front');
  }
  
  isMovingForward() {
    return this.FORWARD_KEYS.some(key => this.keys[key]);
  }
  
  isMovingBackward() {
    return this.BACKWARD_KEYS.some(key => this.keys[key]);
  }
  
  isTurningLeft() {
    return this.LEFT_KEYS.some(key => this.keys[key]);
  }
  
  isTurningRight() {
    return this.RIGHT_KEYS.some(key => this.keys[key]);
  }

  update(delta) {
    // Process any continuous input
    this.updateAutoFire();
    
    // Handle continuous keyboard input for smoother controls
    if (this.isMovingForward()) {
      // No need to call the game here, the game already checks isMovingForward()
    }
    
    if (this.isMovingBackward()) {
      // No need to call the game here, the game already checks isMovingBackward()
    }
    
    if (this.isTurningLeft()) {
      // No need to call the game here, the game already checks isTurningLeft()
    }
    
    if (this.isTurningRight()) {
      // No need to call the game here, the game already checks isTurningRight()
    }
  }
} 