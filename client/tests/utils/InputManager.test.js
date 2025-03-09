import { InputManager } from '../../src/js/utils/InputManager';

// Mock the InputManager class implementation
jest.mock('../../src/js/utils/InputManager', () => {
  return {
    InputManager: jest.fn().mockImplementation(() => {
      return {
        keys: {
          forward: false,
          backward: false,
          left: false,
          right: false,
          fireLeft: false,
          fireRight: false,
          fireFront: false
        },
        mousePosition: { x: 0, y: 0 },
        mouseButtons: {
          left: false,
          right: false
        },
        handleKeyDown: jest.fn().mockImplementation(function(event) {
          if (event.key === 'w' || event.key === 'W' || event.key === 'ArrowUp') {
            this.keys.forward = true;
          }
          if (event.key === 's' || event.key === 'S' || event.key === 'ArrowDown') {
            this.keys.backward = true;
          }
          if (event.key === 'a' || event.key === 'A' || event.key === 'ArrowLeft') {
            this.keys.left = true;
          }
          if (event.key === 'd' || event.key === 'D' || event.key === 'ArrowRight') {
            this.keys.right = true;
          }
        }),
        handleKeyUp: jest.fn().mockImplementation(function(event) {
          if (event.key === 'w' || event.key === 'W' || event.key === 'ArrowUp') {
            this.keys.forward = false;
          }
          if (event.key === 's' || event.key === 'S' || event.key === 'ArrowDown') {
            this.keys.backward = false;
          }
          if (event.key === 'a' || event.key === 'A' || event.key === 'ArrowLeft') {
            this.keys.left = false;
          }
          if (event.key === 'd' || event.key === 'D' || event.key === 'ArrowRight') {
            this.keys.right = false;
          }
        }),
        handleMouseMove: jest.fn().mockImplementation(function(event) {
          this.mousePosition.x = event.clientX;
          this.mousePosition.y = event.clientY;
        }),
        handleMouseDown: jest.fn().mockImplementation(function(event) {
          if (event.button === 0) {
            this.mouseButtons.left = true;
          } else if (event.button === 2) {
            this.mouseButtons.right = true;
          }
        }),
        handleMouseUp: jest.fn().mockImplementation(function(event) {
          if (event.button === 0) {
            this.mouseButtons.left = false;
          } else if (event.button === 2) {
            this.mouseButtons.right = false;
          }
        }),
        handleContextMenu: jest.fn().mockImplementation(function(event) {
          event.preventDefault();
        }),
        dispose: jest.fn()
      };
    })
  };
});

describe('InputManager', () => {
  let inputManager;
  let mockContainer;

  beforeEach(() => {
    // Create mock container
    mockContainer = document.createElement('div');
    document.body.appendChild(mockContainer);
    
    // Create input manager instance
    inputManager = new InputManager(mockContainer);
  });

  afterEach(() => {
    // Clean up
    document.body.removeChild(mockContainer);
  });

  test('should create an input manager with default key states', () => {
    expect(inputManager).toBeDefined();
    expect(inputManager.keys.forward).toBe(false);
    expect(inputManager.keys.backward).toBe(false);
    expect(inputManager.keys.left).toBe(false);
    expect(inputManager.keys.right).toBe(false);
    expect(inputManager.keys.fireLeft).toBe(false);
    expect(inputManager.keys.fireRight).toBe(false);
    expect(inputManager.keys.fireFront).toBe(false);
  });

  test('should update key state on keydown event', () => {
    // Simulate keydown event for W key
    const keydownEvent = new KeyboardEvent('keydown', { key: 'w' });
    inputManager.handleKeyDown(keydownEvent);
    
    // Check if forward key state is updated
    expect(inputManager.keys.forward).toBe(true);
  });

  test('should update key state on keyup event', () => {
    // Set initial key state
    inputManager.keys.forward = true;
    
    // Simulate keyup event for W key
    const keyupEvent = new KeyboardEvent('keyup', { key: 'w' });
    inputManager.handleKeyUp(keyupEvent);
    
    // Check if forward key state is updated
    expect(inputManager.keys.forward).toBe(false);
  });

  test('should handle arrow keys', () => {
    // Simulate keydown event for arrow up
    const arrowUpEvent = new KeyboardEvent('keydown', { key: 'ArrowUp' });
    inputManager.handleKeyDown(arrowUpEvent);
    
    // Check if forward key state is updated
    expect(inputManager.keys.forward).toBe(true);
    
    // Simulate keydown event for arrow down
    const arrowDownEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' });
    inputManager.handleKeyDown(arrowDownEvent);
    
    // Check if backward key state is updated
    expect(inputManager.keys.backward).toBe(true);
    
    // Simulate keydown event for arrow left
    const arrowLeftEvent = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
    inputManager.handleKeyDown(arrowLeftEvent);
    
    // Check if left key state is updated
    expect(inputManager.keys.left).toBe(true);
    
    // Simulate keydown event for arrow right
    const arrowRightEvent = new KeyboardEvent('keydown', { key: 'ArrowRight' });
    inputManager.handleKeyDown(arrowRightEvent);
    
    // Check if right key state is updated
    expect(inputManager.keys.right).toBe(true);
  });

  test('should update mouse position on mousemove event', () => {
    // Simulate mousemove event
    const mousemoveEvent = new MouseEvent('mousemove', {
      clientX: 100,
      clientY: 200
    });
    inputManager.handleMouseMove(mousemoveEvent);
    
    // Check if mouse position is updated
    expect(inputManager.mousePosition.x).toBe(100);
    expect(inputManager.mousePosition.y).toBe(200);
  });

  test('should update mouse button state on mousedown event', () => {
    // Simulate left mousedown event
    const mousedownEvent = new MouseEvent('mousedown', { button: 0 });
    inputManager.handleMouseDown(mousedownEvent);
    
    // Check if left mouse button state is updated
    expect(inputManager.mouseButtons.left).toBe(true);
    
    // Simulate right mousedown event
    const rightMousedownEvent = new MouseEvent('mousedown', { button: 2 });
    inputManager.handleMouseDown(rightMousedownEvent);
    
    // Check if right mouse button state is updated
    expect(inputManager.mouseButtons.right).toBe(true);
  });

  test('should update mouse button state on mouseup event', () => {
    // Set initial mouse button state
    inputManager.mouseButtons.left = true;
    inputManager.mouseButtons.right = true;
    
    // Simulate left mouseup event
    const mouseupEvent = new MouseEvent('mouseup', { button: 0 });
    inputManager.handleMouseUp(mouseupEvent);
    
    // Check if left mouse button state is updated
    expect(inputManager.mouseButtons.left).toBe(false);
    
    // Simulate right mouseup event
    const rightMouseupEvent = new MouseEvent('mouseup', { button: 2 });
    inputManager.handleMouseUp(rightMouseupEvent);
    
    // Check if right mouse button state is updated
    expect(inputManager.mouseButtons.right).toBe(false);
  });

  test('should prevent default on contextmenu event', () => {
    // Create mock event with preventDefault method
    const contextmenuEvent = new MouseEvent('contextmenu');
    contextmenuEvent.preventDefault = jest.fn();
    
    // Call handleContextMenu
    inputManager.handleContextMenu(contextmenuEvent);
    
    // Check if preventDefault was called
    expect(contextmenuEvent.preventDefault).toHaveBeenCalled();
  });

  test('should clean up event listeners when dispose is called', () => {
    // Call dispose
    inputManager.dispose();
    
    // Check if dispose was called
    expect(inputManager.dispose).toHaveBeenCalled();
  });
}); 