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
    
    // Store the touch ID that's controlling the joystick
    let joystickTouchId = null;
    
    // Handle multiple touches
    for (let i = 0; i < event.touches.length; i++) {
      const touch = event.touches[i];
      
      // Get the touched element
      const touchedElement = document.elementFromPoint(touch.clientX, touch.clientY);
      
      // Handle joystick touch
      if (!this.touchJoystickActive && (touchedElement === this.virtualJoystick || touchedElement === this.joystickKnob)) {
        this.touchJoystickActive = true;
        this.touchJoystickCenter = { x: touch.clientX, y: touch.clientY };
        this.isTouching = true;
        this.touchStartPos = { x: touch.clientX, y: touch.clientY };
        this.touchCurrentPos = { x: touch.clientX, y: touch.clientY };
        joystickTouchId = touch.identifier;
        
        // Update joystick visuals
        this.joystickKnob.style.transform = `translate(0px, 0px)`;
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
    
    // Only process if joystick is active
    if (!this.touchJoystickActive) return;
    
    // Find the joystick touch if it exists
    let joystickTouch = null;
    
    // Try to find the touch that's closest to the joystick center
    let closestDistance = Infinity;
    
    for (let i = 0; i < event.touches.length; i++) {
      const touch = event.touches[i];
      
      // Calculate distance from joystick center
      const dx = touch.clientX - this.touchJoystickCenter.x;
      const dy = touch.clientY - this.touchJoystickCenter.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // If this touch is closer to the joystick center than any we've seen so far
      if (distance < closestDistance && distance < 150) {
        closestDistance = distance;
        joystickTouch = touch;
      }
    }
    
    // If we found a joystick touch, update the joystick
    if (joystickTouch) {
      this.touchCurrentPos = { x: joystickTouch.clientX, y: joystickTouch.clientY };
      
      // Calculate joystick delta
      const dx = this.touchCurrentPos.x - this.touchJoystickCenter.x;
      const dy = this.touchCurrentPos.y - this.touchJoystickCenter.y;
      
      // Limit joystick movement radius
      const maxRadius = 40;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const scale = distance > maxRadius ? maxRadius / distance : 1;
      
      // Update joystick knob position
      const knobX = dx * scale;
      const knobY = dy * scale;
      this.joystickKnob.style.transform = `translate(${knobX}px, ${knobY}px)`;
      
      // Update virtual key states based on joystick position
      const deadzone = 10; // Reduced deadzone for better responsiveness
      this.keys['ArrowUp'] = dy < -deadzone;
      this.keys['ArrowDown'] = dy > deadzone;
      this.keys['ArrowLeft'] = dx < -deadzone;
      this.keys['ArrowRight'] = dx > deadzone;
    }
  }

  handleTouchEnd(event) {
    event.preventDefault();
    
    // Check if any remaining touches are on the joystick
    let joystickTouchStillActive = false;
    
    for (let i = 0; i < event.touches.length; i++) {
      const touch = event.touches[i];
      const touchedElement = document.elementFromPoint(touch.clientX, touch.clientY);
      
      // If this touch is on or near the joystick, the joystick is still active
      if (touchedElement === this.virtualJoystick || touchedElement === this.joystickKnob) {
        joystickTouchStillActive = true;
        
        // Update joystick center to this touch
        this.touchJoystickCenter = { x: touch.clientX, y: touch.clientY };
        this.touchCurrentPos = { x: touch.clientX, y: touch.clientY };
        break;
      }
      
      // Also check if the touch is close to the joystick center
      const dx = touch.clientX - this.touchJoystickCenter.x;
      const dy = touch.clientY - this.touchJoystickCenter.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < 150) {
        joystickTouchStillActive = true;
        break;
      }
    }
    
    // Only reset joystick if no touches remain on it
    if (!joystickTouchStillActive) {
      // If no touches remain at all, reset everything
      if (event.touches.length === 0) {
        this.isTouching = false;
        this.touchJoystickActive = false;
        
        // Reset virtual key states
        this.keys['ArrowUp'] = false;
        this.keys['ArrowDown'] = false;
        this.keys['ArrowLeft'] = false;
        this.keys['ArrowRight'] = false;
        
        // Reset joystick visuals only when no touches remain
        this.joystickKnob.style.transform = 'translate(0px, 0px)';
      }
    }
    
    // Check if any remaining touches are on fire buttons
    let leftButtonTouched = false;
    let rightButtonTouched = false;
    let frontButtonTouched = false;
    
    for (let i = 0; i < event.touches.length; i++) {
      const touch = event.touches[i];
      const touchedElement = document.elementFromPoint(touch.clientX, touch.clientY);
      
      if (touchedElement === this.fireButtons.left) {
        leftButtonTouched = true;
      } else if (touchedElement === this.fireButtons.right) {
        rightButtonTouched = true;
      } else if (touchedElement === this.fireButtons.front) {
        frontButtonTouched = true;
      }
    }
    
    // Reset fire button visuals if no touches remain on them
    if (!leftButtonTouched) {
      this.fireButtons.left.style.transform = '';
      this.fireButtons.left.style.opacity = '';
    }
    
    if (!rightButtonTouched) {
      this.fireButtons.right.style.transform = '';
      this.fireButtons.right.style.opacity = '';
    }
    
    if (!frontButtonTouched) {
      this.fireButtons.front.style.transform = '';
      this.fireButtons.front.style.opacity = '';
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

  setupMobileControls() {
    // Create joystick container if it doesn't exist
    let joystickContainer = document.getElementById('joystick-container');
    if (!joystickContainer) {
      joystickContainer = document.createElement('div');
      joystickContainer.id = 'joystick-container';
      document.getElementById('ui-layer').appendChild(joystickContainer);
      
      // Create outer ring
      const joystickOuter = document.createElement('div');
      joystickOuter.id = 'joystick-outer';
      joystickContainer.appendChild(joystickOuter);
      
      // Create inner stick
      const joystickInner = document.createElement('div');
      joystickInner.id = 'joystick-inner';
      joystickContainer.appendChild(joystickInner);
    }
    
    // Create left button if it doesn't exist
    let leftButton = document.getElementById('left-button');
    if (!leftButton) {
      leftButton = document.createElement('div');
      leftButton.id = 'left-button';
      leftButton.className = 'mobile-button';
      leftButton.textContent = 'LEFT';
      document.getElementById('ui-layer').appendChild(leftButton);
    }
    
    // Create right button if it doesn't exist
    let rightButton = document.getElementById('right-button');
    if (!rightButton) {
      rightButton = document.createElement('div');
      rightButton.id = 'right-button';
      rightButton.className = 'mobile-button';
      rightButton.textContent = 'RIGHT';
      document.getElementById('ui-layer').appendChild(rightButton);
    }
    
    // Create front button if it doesn't exist
    let frontButton = document.getElementById('front-button');
    if (!frontButton) {
      frontButton = document.createElement('div');
      frontButton.id = 'front-button';
      frontButton.className = 'mobile-button';
      frontButton.textContent = 'FRONT';
      document.getElementById('ui-layer').appendChild(frontButton);
    }
    
    // Store references to the created elements
    this.joystickContainer = joystickContainer;
    this.joystickOuter = document.getElementById('joystick-outer');
    this.joystickInner = document.getElementById('joystick-inner');
    this.leftButton = leftButton;
    this.rightButton = rightButton;
    this.frontButton = frontButton;
    
    // Joystick state
    this.joystickActive = false;
    this.joystickTouchId = null;
    this.joystickCenterX = 0;
    this.joystickCenterY = 0;
    this.joystickMoveX = 0;
    this.joystickMoveY = 0;
    
    // Button touch states
    this.leftButtonTouchId = null;
    this.rightButtonTouchId = null;
    this.frontButtonTouchId = null;
    
    // Set up event listeners for the joystick
    const handleJoystickStart = (e) => {
      // Check if we're already tracking a touch
      if (this.joystickActive) return;
      
      const touch = e.changedTouches[0];
      e.preventDefault();
      
      this.joystickActive = true;
      this.joystickTouchId = touch.identifier;
      
      const rect = this.joystickContainer.getBoundingClientRect();
      this.joystickCenterX = rect.left + rect.width / 2;
      this.joystickCenterY = rect.top + rect.height / 2;
      
      // Move inner joystick to touch position
      this.updateJoystickPosition(touch.clientX, touch.clientY);
    };
    
    const handleJoystickMove = (e) => {
      if (!this.joystickActive) return;
      
      // Find our touch
      let touch = null;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === this.joystickTouchId) {
          touch = e.changedTouches[i];
          break;
        }
      }
      
      if (!touch) return;
      e.preventDefault();
      
      // Update joystick position
      this.updateJoystickPosition(touch.clientX, touch.clientY);
    };
    
    const endJoystickTouch = (e) => {
      if (!this.joystickActive) return;
      
      // Find our touch
      let foundTouch = false;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === this.joystickTouchId) {
          foundTouch = true;
          break;
        }
      }
      
      if (!foundTouch) return;
      e.preventDefault();
      
      // Reset joystick
      this.joystickActive = false;
      this.joystickTouchId = null;
      this.joystickMoveX = 0;
      this.joystickMoveY = 0;
      
      // Reset joystick position
      this.joystickInner.style.transform = 'translate(-50%, -50%)';
    };
    
    const handleButtonTouch = (button, action) => {
      const startAction = (e) => {
        e.preventDefault();
        button.style.transform = button === this.frontButton ? 
          'translateX(-50%) scale(0.95)' : 'scale(0.95)';
        action(true);
      };
      
      const endAction = (e) => {
        e.preventDefault();
        button.style.transform = button === this.frontButton ? 
          'translateX(-50%)' : 'none';
        action(false);
      };
      
      button.addEventListener('touchstart', startAction);
      button.addEventListener('touchend', endAction);
      button.addEventListener('touchcancel', endAction);
    };
    
    // Add event listeners
    this.joystickContainer.addEventListener('touchstart', handleJoystickStart);
    this.joystickContainer.addEventListener('touchmove', handleJoystickMove);
    this.joystickContainer.addEventListener('touchend', endJoystickTouch);
    this.joystickContainer.addEventListener('touchcancel', endJoystickTouch);
    
    // Set up button actions
    handleButtonTouch(this.leftButton, (active) => {
      this.keys.a = active;
    });
    
    handleButtonTouch(this.rightButton, (active) => {
      this.keys.d = active;
    });
    
    handleButtonTouch(this.frontButton, (active) => {
      this.keys.f = active;
    });
  }

  updateJoystickPosition(touchX, touchY) {
    if (!this.joystickActive || !this.joystickInner) return;
    
    // Calculate distance from center
    const deltaX = touchX - this.joystickCenterX;
    const deltaY = touchY - this.joystickCenterY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    // Get joystick container radius
    const containerRadius = this.joystickContainer.getBoundingClientRect().width / 2;
    
    // Limit distance to container radius
    const limitedDistance = Math.min(distance, containerRadius);
    
    // Calculate normalized position (-1 to 1)
    const normalizedX = distance > 0 ? (deltaX / distance) * limitedDistance : 0;
    const normalizedY = distance > 0 ? (deltaY / distance) * limitedDistance : 0;
    
    // Apply normalized values to joystick movement (0.1 deadzone)
    const deadzone = 10;
    this.joystickMoveY = Math.abs(normalizedY) > deadzone ? -normalizedY / containerRadius : 0;
    this.joystickMoveX = Math.abs(normalizedX) > deadzone ? normalizedX / containerRadius : 0;
    
    // Set keys based on joystick position
    this.keys.w = this.joystickMoveY < -0.2;
    this.keys.s = this.joystickMoveY > 0.2;
    
    // Move joystick inner
    this.joystickInner.style.transform = `translate(calc(-50% + ${normalizedX}px), calc(-50% + ${normalizedY}px))`;
  }
}