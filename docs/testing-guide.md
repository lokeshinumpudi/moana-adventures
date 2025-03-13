# Moana's Wake: Testing Guide

This document provides an overview of the test cases created for the Moana's Wake game and guidance on how to run and fix the tests.

## Test Structure

The tests are organized by component and utility type:

```
client/tests/
├── components/           # Tests for game components
│   ├── Ship.test.js      # Tests for Ship component
│   ├── Island.test.js    # Tests for Island component
│   ├── Ocean.test.js     # Tests for Ocean component
│   └── Projectile.test.js # Tests for Projectile component
├── utils/                # Tests for utility classes
│   ├── InputManager.test.js # Tests for InputManager
│   └── PhysicsManager.test.js # Tests for PhysicsManager
├── network/              # Tests for networking code
│   └── SocketManager.test.js # Tests for SocketManager
└── Game.test.js          # Tests for main Game class

server/tests/
└── server.test.js        # Tests for server functionality
```

## Test Cases

### Ship Component Tests

- Creation with default properties
- Position updates based on speed and direction
- Acceleration and deceleration
- Turning left and right
- Projectile firing and cooldown
- Damage handling
- Reset functionality

### Island Component Tests

- Creation with default and custom properties
- Vegetation and dock addition
- User data setup
- Physics body creation and management
- Position and radius getters/setters

### Ocean Component Tests

- Creation with default and custom properties
- Wave updates
- Height calculation at position
- Wave height and speed setters
- Resource disposal

### Projectile Component Tests

- Creation with default and custom properties
- Position updates based on direction and speed
- Gravity effects
- Lifetime management
- Trail creation

### InputManager Tests

- Default key states
- Key state updates on keydown/keyup events
- Arrow key handling
- Mouse position updates
- Mouse button state updates
- Context menu prevention
- Event listener cleanup

### PhysicsManager Tests

- Creation with default properties
- World initialization with gravity
- Material creation
- Physics body updates
- Box and sphere body creation
- Body removal
- Debug mode toggling

### SocketManager Tests

- Creation with default properties
- Socket connection initialization
- Event listener registration
- Player update sending
- Player joining/leaving handling
- Projectile creation/update/removal
- Update frequency control

### Game Tests

- Creation with default properties
- Component initialization
- Game loop start/stop
- Component updates
- Scene rendering
- Projectile management
- Other player management
- Window resize handling
- Resource cleanup

### Server Tests

- Socket connection
- Player joining/leaving events
- Player update events
- Projectile creation/update/removal events
- World data events

## Current Issues and Fixes

The tests are currently facing several issues that need to be addressed:

### 1. ES Modules vs. CommonJS

**Issue**: The project uses ES modules (`type: "module"` in package.json), but Jest works better with CommonJS.

**Fix**:

- Use `babel-jest` to transform ES modules to CommonJS for testing
- Ensure babel.config.cjs is properly configured
- Update jest.config.cjs to handle ES modules

```javascript
// babel.config.cjs
module.exports = {
  presets: [["@babel/preset-env", { targets: { node: "current" } }]],
};

// jest.config.cjs
module.exports = {
  transform: {
    "^.+\\.js$": ["babel-jest", { configFile: "./babel.config.cjs" }],
  },
  transformIgnorePatterns: [
    "node_modules/(?!(three|socket.io-client|cannon-es)/)",
  ],
};
```

### 2. Mocking External Libraries

**Issue**: Three.js, Socket.io, and Cannon.es are not properly mocked.

**Fix**:

- Update the mock implementations to match the actual API
- Add missing methods to the mocks
- Ensure mocks are properly imported in test files

For example, update the socket.io-client mock:

```javascript
// __mocks__/socket.io-client.js
const socketMock = {
  on: jest.fn(),
  emit: jest.fn(),
  disconnect: jest.fn(),
  connect: jest.fn(),
  removeAllListeners: jest.fn(),
  id: "test-socket-id",
};

export const io = jest.fn().mockImplementation(() => socketMock);
```

### 3. Jest Configuration for Browser Environment

**Issue**: Some browser APIs are not available in the Jest environment.

**Fix**:

- Ensure the test environment is set to 'jsdom'
- Mock browser APIs in the setup file
- Add missing DOM elements needed by components

```javascript
// tests/setup.js
global.requestAnimationFrame = (callback) => setTimeout(callback, 0);
global.cancelAnimationFrame = jest.fn();

// Mock DOM elements
document.body.innerHTML = `
  <div id="game-container"></div>
  <div id="ui-layer">
    <!-- Add required UI elements here -->
  </div>
`;
```

### 4. Module Import Issues

**Issue**: Jest has trouble with ES module imports in the actual code.

**Fix**:

- Configure Jest to handle ES module imports
- Use moduleNameMapper to redirect imports to mocks
- Transform node_modules that use ES modules

```javascript
// jest.config.cjs
module.exports = {
  moduleNameMapper: {
    "^three$": "<rootDir>/__mocks__/three.js",
    "^socket.io-client$": "<rootDir>/__mocks__/socket.io-client.js",
    "^cannon-es$": "<rootDir>/__mocks__/cannon-es.js",
  },
  transformIgnorePatterns: [
    "node_modules/(?!(three|socket.io-client|cannon-es)/)",
  ],
};
```

## Running Tests

Once the issues are fixed, you can run the tests using the following commands:

```bash
# Run all client tests
cd client
npm test

# Run specific test file
npm test -- tests/components/Ship.test.js

# Run tests with coverage
npm run test:coverage

# Run server tests
cd ../server
npm test
```

## Adding New Tests

When adding new tests, follow these guidelines:

1. Create test files in the appropriate directory
2. Import the component or utility to test
3. Mock dependencies using Jest's mock functions
4. Use descriptive test names that explain what is being tested
5. Follow the Arrange-Act-Assert pattern in test cases
6. Test both success and failure cases
7. Keep tests independent of each other

Example test structure:

```javascript
import { Component } from "../../src/js/components/Component";

// Mock dependencies
jest.mock("dependency", () => ({
  dependency: jest.fn(),
}));

describe("Component", () => {
  let component;

  beforeEach(() => {
    // Set up component instance
    component = new Component();
  });

  afterEach(() => {
    // Clean up
    jest.clearAllMocks();
  });

  test("should do something", () => {
    // Arrange
    const input = "test";

    // Act
    const result = component.doSomething(input);

    // Assert
    expect(result).toBe("expected result");
  });
});
```

## Continuous Integration

In the future, we should set up continuous integration to run tests automatically:

1. Add a GitHub Actions workflow to run tests on push and pull requests
2. Configure test coverage thresholds
3. Add linting to ensure code quality
4. Generate test reports for review

This will help maintain code quality and prevent regressions as the codebase grows.
