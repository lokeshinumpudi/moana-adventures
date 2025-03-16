export class InputManager {
  constructor(game) {
    this.game = game;
    this.keys = {};
    this.mousePosition = { x: 0, y: 0 };
    this.leftMouseDown = false;
    this.rightMouseDown = false;

    // Touch state
    this.isTouching = false;
    this.touchStartPos = { x: 0, y: 0 };
    this.touchCurrentPos = { x: 0, y: 0 };
    this.touchJoystickCenter = { x: 0, y: 0 };
    this.touchJoystickActive = false;

    // Touch UI elements
    this.touchControls = null;
    this.virtualJoystick = null;
    this.joystickKnob = null;
    this.fireButtons = {
      left: null,
      right: null,
      front: null
    };

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
    this.createTouchControls();
  }

  init() {
    // Add event listeners
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
    window.addEventListener('keyup', this.handleKeyUp.bind(this));
    window.addEventListener('mousedown', this.handleMouseDown.bind(this));
    window.addEventListener('mouseup', this.handleMouseUp.bind(this));
    window.addEventListener('mousemove', this.handleMouseMove.bind(this));
    window.addEventListener('contextmenu', (e) => e.preventDefault());

    // Add touch event listeners with passive: false
    window.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    window.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    window.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });

    // We no longer need to modify the game.update method
    // The Game class will call our update method directly
  }

  createTouchControls() {
    // Create touch controls container
    this.touchControls = document.createElement('div');
    this.touchControls.className = 'touch-controls';

    // Create virtual joystick
    this.virtualJoystick = document.createElement('div');
    this.virtualJoystick.className = 'virtual-joystick';

    // Create joystick knob
    this.joystickKnob = document.createElement('div');
    this.joystickKnob.className = 'joystick-knob';
    this.virtualJoystick.appendChild(this.joystickKnob);

    // Create fire controls container
    const fireControls = document.createElement('div');
    fireControls.className = 'fire-controls';

    // Create cannon buttons
    this.fireButtons.left = document.createElement('div');
    this.fireButtons.left.className = 'fire-button left-cannon';
    this.fireButtons.left.textContent = 'Left';

    this.fireButtons.front = document.createElement('div');
    this.fireButtons.front.className = 'fire-button front-cannon';
    this.fireButtons.front.textContent = 'Front';

    this.fireButtons.right = document.createElement('div');
    this.fireButtons.right.className = 'fire-button right-cannon';
    this.fireButtons.right.textContent = 'Right';

    // Add buttons to fire controls
    fireControls.appendChild(this.fireButtons.left);
    fireControls.appendChild(this.fireButtons.front);
    fireControls.appendChild(this.fireButtons.right);

    // Add elements to container
    this.touchControls.appendChild(this.virtualJoystick);
    this.touchControls.appendChild(fireControls);

    // Add container to document
    document.body.appendChild(this.touchControls);
  }

  handleKeyDown(event) {
    this.keys[event.key] = true;

    // Handle cannon fire on key press, not continuously
    if (this.LEFT_CANNON_KEYS.includes(event.key)) {
      this.fireLeftCannon();
    } else if (this.RIGHT_CANNON_KEYS.includes(event.key)) {
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

  handleTouchStart(event) {
    event.preventDefault();
    
    // Handle multiple touches
    for (let i = 0; i < event.touches.length; i++) {
      const touch = event.touches[i];
      
      // Get the touched element
      const touchedElement = document.elementFromPoint(touch.clientX, touch.clientY);
      
      // First touch or joystick touch
      if (i === 0 || touchedElement === this.virtualJoystick || touchedElement === this.joystickKnob) {
        if (!this.touchJoystickActive) {
          this.isTouching = true;
          this.touchStartPos = { x: touch.clientX, y: touch.clientY };
          this.touchCurrentPos = { x: touch.clientX, y: touch.clientY };
          
          // Handle joystick touch
          if (touchedElement === this.virtualJoystick || touchedElement === this.joystickKnob) {
            this.touchJoystickActive = true;
            this.touchJoystickCenter = { x: touch.clientX, y: touch.clientY };
            
            // Update joystick visuals
            const rect = this.virtualJoystick.getBoundingClientRect();
            this.joystickKnob.style.transform = `translate(${touch.clientX - rect.left - rect.width/2}px, ${touch.clientY - rect.top - rect.height/2}px)`;
          }
        }
      }
      
      // Handle cannon button touches (can happen simultaneously with joystick)
      if (touchedElement === this.fireButtons.left) {
        this.fireLeftCannon();
        this.fireButtons.left.style.transform = 'scale(0.9)';
        this.fireButtons.left.style.opacity = '0.8';
      }
      else if (touchedElement === this.fireButtons.right) {
        this.fireRightCannon();
        this.fireButtons.right.style.transform = 'scale(0.9)';
        this.fireButtons.right.style.opacity = '0.8';
      }
      else if (touchedElement === this.fireButtons.front) {
        this.fireFrontCannon();
        this.fireButtons.front.style.transform = 'scale(0.9)';
        this.fireButtons.front.style.opacity = '0.8';
      }
    }
  }

  handleTouchMove(event) {
    event.preventDefault();
    
    // Find the joystick touch if it exists
    let joystickTouch = null;
    for (let i = 0; i < event.touches.length; i++) {
      const touch = event.touches[i];
      const touchedElement = document.elementFromPoint(touch.clientX, touch.clientY);
      
      // If this touch started on or near the joystick, use it for joystick control
      if (this.touchJoystickActive) {
        const dx = touch.clientX - this.touchJoystickCenter.x;
        const dy = touch.clientY - this.touchJoystickCenter.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // If this touch is close to where the joystick was activated, it's likely the joystick touch
        if (distance < 150) {
          joystickTouch = touch;
          break;
        }
      }
    }
    
    // If we found a joystick touch, update the joystick
    if (joystickTouch && this.touchJoystickActive) {
      this.touchCurrentPos = { x: joystickTouch.clientX, y: joystickTouch.clientY };
      
      // Calculate joystick delta
      const dx = this.touchCurrentPos.x - this.touchJoystickCenter.x;
      const dy = this.touchCurrentPos.y - this.touchJoystickCenter.y;
      
      // Limit joystick movement radius
      const maxRadius = 40;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const scale = distance > maxRadius ? maxRadius / distance : 1;
      
      // Update joystick knob position
      const rect = this.virtualJoystick.getBoundingClientRect();
      const knobX = dx * scale;
      const knobY = dy * scale;
      this.joystickKnob.style.transform = `translate(${knobX}px, ${knobY}px)`;
      
      // Update virtual key states based on joystick position
      const deadzone = 20;
      this.keys['ArrowUp'] = dy < -deadzone;
      this.keys['ArrowDown'] = dy > deadzone;
      this.keys['ArrowLeft'] = dx < -deadzone;
      this.keys['ArrowRight'] = dx > deadzone;
    }
  }

  handleTouchEnd(event) {
    event.preventDefault();
    
    // Only reset joystick if no touches remain
    if (event.touches.length === 0) {
      this.isTouching = false;
      this.touchJoystickActive = false;
      
      // Reset joystick visuals
      this.joystickKnob.style.transform = 'translate(-50%, -50%)';
      
      // Reset virtual key states
      this.keys['ArrowUp'] = false;
      this.keys['ArrowDown'] = false;
      this.keys['ArrowLeft'] = false;
      this.keys['ArrowRight'] = false;
    }
    
    // Reset fire button visuals
    this.fireButtons.left.style.transform = 'scale(1)';
    this.fireButtons.left.style.opacity = '1';
    this.fireButtons.right.style.transform = 'scale(1)';
    this.fireButtons.right.style.opacity = '1';
    this.fireButtons.front.style.transform = 'scale(1)';
    this.fireButtons.front.style.opacity = '1';
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