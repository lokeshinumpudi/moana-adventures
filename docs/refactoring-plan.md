# Moana's Wake: Refactoring Plan

This document outlines specific refactoring steps to improve code organization, maintainability, and performance.

## Game.js Refactoring

The current Game.js file (2000+ lines) should be broken down into the following modules:

### 1. Core Game Engine (`core/Game.js`)

```javascript
// Responsibilities:
// - Game loop management
// - Component coordination
// - High-level game state

export class Game {
  constructor(container) {
    this.container = container;
    this.isRunning = false;
    this.lastTime = 0;

    // Initialize managers
    this.sceneManager = new SceneManager(this);
    this.stateManager = new StateManager(this);
    this.entityManager = new EntityManager(this);
    this.inputManager = new InputManager(this);
    this.socketManager = new SocketManager(this);
    this.physicsManager = new PhysicsManager();
    this.notificationManager = new NotificationManager();

    // Initialize systems
    this.combatSystem = new CombatSystem(this);
    this.collisionSystem = new CollisionSystem(this);
    this.progressionSystem = new ProgressionSystem(this);
  }

  init() {
    // Initialize all managers and systems
    // Set up event listeners
  }

  start() {
    // Start game loop
  }

  stop() {
    // Stop game loop
  }

  update(delta) {
    // Update all managers and systems
  }

  render() {
    // Render the scene
  }
}
```

### 2. Scene Management (`core/SceneManager.js`)

```javascript
// Responsibilities:
// - Three.js scene setup and management
// - Camera management
// - Lighting setup

export class SceneManager {
  constructor(game) {
    this.game = game;
    this.scene = new THREE.Scene();
    this.camera = null;
    this.renderer = null;
  }

  init() {
    // Set up scene, camera, renderer
    // Add lights
  }

  setupCamera() {
    // Create and configure camera
  }

  addLights() {
    // Add lights to the scene
  }

  updateCamera(delta) {
    // Update camera position and rotation
  }

  onWindowResize() {
    // Handle window resize
  }
}
```

### 3. Entity Management (`core/EntityManager.js`)

```javascript
// Responsibilities:
// - Track all game entities
// - Entity creation and destruction
// - Entity updates

export class EntityManager {
  constructor(game) {
    this.game = game;
    this.entities = {
      player: null,
      otherPlayers: new Map(),
      projectiles: [],
      obstacles: [],
      islands: [],
      buoys: [],
      collectibles: [],
    };
  }

  createPlayerShip() {
    // Create player ship
  }

  createOtherPlayerShip(playerData) {
    // Create other player ship
  }

  createProjectile(position, direction, type) {
    // Create projectile
  }

  createIsland(islandData) {
    // Create island
  }

  // Other entity creation methods

  removeEntity(entityType, entityId) {
    // Remove entity
  }

  updateEntities(delta) {
    // Update all entities
  }
}
```

### 4. Combat System (`systems/combat/CombatSystem.js`)

```javascript
// Responsibilities:
// - Weapon firing logic
// - Projectile management
// - Damage calculation

export class CombatSystem {
  constructor(game) {
    this.game = game;
    this.projectiles = [];
    this.lastCannonFireTime = 0;
    this.cannonCooldown = 10;
    this.lastMachineGunFireTime = 0;
    this.machineGunCooldown = 10;
  }

  fireProjectile(side) {
    // Fire cannon projectile
  }

  fireMachineGun(side) {
    // Fire machine gun projectile
  }

  updateProjectiles(delta) {
    // Update projectile positions
    // Check for collisions
  }

  handleProjectileHit(data) {
    // Handle projectile hit
  }

  cleanupProjectiles() {
    // Remove old projectiles
  }
}
```

### 5. Collision System (`systems/physics/CollisionSystem.js`)

```javascript
// Responsibilities:
// - Collision detection
// - Collision response

export class CollisionSystem {
  constructor(game) {
    this.game = game;
    this.collisionCheckInterval = 100;
    this.lastCollisionCheckTime = 0;
  }

  checkCollisions() {
    // Check for collisions between entities
  }

  checkProjectileCollisions(projectile) {
    // Check for projectile collisions
  }

  checkPickupCollisions() {
    // Check for collectible pickups
  }

  handleShipObstacleCollision(obstacle) {
    // Handle ship-obstacle collision
  }
}
```

## SocketManager.js Refactoring

The current SocketManager.js file should be broken down into the following modules:

### 1. Socket Management (`network/SocketManager.js`)

```javascript
// Responsibilities:
// - Socket.io connection management
// - Event registration and handling

export class SocketManager {
  constructor(game) {
    this.game = game;
    this.socket = null;
  }

  init() {
    // Initialize socket connection
    // Set up event listeners
  }

  setupSocketListeners() {
    // Register event handlers
  }

  disconnect() {
    // Disconnect socket
  }
}
```

### 2. Entity Synchronization (`network/Synchronization.js`)

```javascript
// Responsibilities:
// - Entity state synchronization
// - Network optimization

export class Synchronization {
  constructor(socketManager) {
    this.socketManager = socketManager;
    this.lastUpdateTime = 0;
    this.updateInterval = 50;
    this.positionThreshold = 0.1;
    this.rotationThreshold = 0.05;
  }

  update(delta) {
    // Send player state updates
  }

  processBatchedPlayers(players) {
    // Process batched player updates
  }

  updateOtherPlayer(playerData) {
    // Update other player state
  }

  handleProjectileUpdates(projectiles, player) {
    // Update projectile states
  }
}
```

### 3. Client Prediction (`network/Prediction.js`)

```javascript
// Responsibilities:
// - Client-side prediction
// - Server reconciliation

export class Prediction {
  constructor(socketManager) {
    this.socketManager = socketManager;
    this.pendingInputs = [];
    this.lastProcessedInputTime = 0;
    this.serverReconciliationEnabled = true;
    this.clientPredictionEnabled = true;
  }

  createInputSnapshot() {
    // Create input snapshot
  }

  reconcileWithServer(serverState) {
    // Reconcile client state with server state
  }

  updateOtherPlayersInterpolation(delta) {
    // Interpolate other player positions
  }
}
```

## Server/index.js Refactoring

The current server/index.js file should be broken down into the following modules:

### 1. Server Entry Point (`src/index.js`)

```javascript
// Responsibilities:
// - Express server setup
// - Socket.io initialization
// - Route registration

const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const GameController = require("./controllers/game-controller");
const SocketManager = require("./socket/socket-manager");

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin:
      process.env.NODE_ENV === "production"
        ? "https://moana-adventures.vercel.app"
        : ["http://localhost:5173", "http://127.0.0.1:5500", "*"],
    methods: ["GET", "POST"],
  },
});

// Initialize controllers
const gameController = new GameController();

// Initialize socket manager
const socketManager = new SocketManager(io, gameController);
socketManager.init();

// Start server
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### 2. Game Controller (`controllers/game-controller.js`)

```javascript
// Responsibilities:
// - Game state management
// - Player management

const WorldService = require("../services/world-service");
const PhysicsService = require("../services/physics-service");
const Player = require("../models/player");

class GameController {
  constructor() {
    this.players = new Map();
    this.projectiles = new Map();
    this.worldService = new WorldService();
    this.physicsService = new PhysicsService();
    this.worldData = this.worldService.generateWorld();
  }

  addPlayer(socketId, playerData) {
    // Add player to game
  }

  removePlayer(socketId) {
    // Remove player from game
  }

  updatePlayerState(socketId, state) {
    // Update player state
  }

  getGameState() {
    // Get current game state
  }

  // Other game management methods
}

module.exports = GameController;
```

### 3. World Service (`services/world-service.js`)

```javascript
// Responsibilities:
// - World generation
// - Environment management

class WorldService {
  constructor() {
    this.worldConfig = {
      worldSize: 800,
      islands: {
        count: 5,
        minDistance: 150,
        minRadius: 40,
        maxRadius: 70,
        minHeight: 15,
        maxHeight: 25,
      },
      collectibles: {
        perIsland: { min: 5, max: 10 },
        types: [
          "treasure",
          "gem",
          "fruit",
          "wood",
          "powerup_health",
          "powerup_speed",
          "powerup_shield",
          "powerup_weapon",
        ],
      },
      obstacles: {
        count: 20,
        types: ["rock", "log", "barrel"],
      },
      buoys: {
        count: 10,
      },
    };
  }

  generateWorld() {
    // Generate world data
    const islands = this.generateIslands();
    const collectibles = this.generateCollectibles(islands);
    const obstacles = this.generateObstacles(islands);
    const buoys = this.generateBuoys(islands);

    return {
      islands,
      collectibles,
      obstacles,
      buoys,
      worldSize: this.worldConfig.worldSize,
    };
  }

  generateIslands() {
    // Generate islands
  }

  generateCollectibles(islands) {
    // Generate collectibles
  }

  generateObstacles(islands) {
    // Generate obstacles
  }

  generateBuoys(islands) {
    // Generate buoys
  }

  generateRandomPosition() {
    // Generate random position
  }

  isPositionValid(position, existingObjects, minDistance) {
    // Check if position is valid
  }
}

module.exports = WorldService;
```

### 4. Physics Service (`services/physics-service.js`)

```javascript
// Responsibilities:
// - Server-side physics calculations
// - Collision detection

class PhysicsService {
  constructor() {
    this.gravity = 9.8;
    this.maxProjectileLifetime = 10000; // 10 seconds
  }

  updateProjectilePhysics(projectiles, delta) {
    // Update projectile physics
  }

  checkCollisions(players, projectiles, obstacles) {
    // Check for collisions
  }

  applyGravity(object, delta) {
    // Apply gravity to object
  }
}

module.exports = PhysicsService;
```

### 5. Socket Manager (`socket/socket-manager.js`)

```javascript
// Responsibilities:
// - Socket event handling
// - Player connection management

const GameEvents = require("./game-events");
const PlayerEvents = require("./player-events");

class SocketManager {
  constructor(io, gameController) {
    this.io = io;
    this.gameController = gameController;
    this.gameEvents = new GameEvents(io, gameController);
    this.playerEvents = new PlayerEvents(io, gameController);
  }

  init() {
    this.io.on("connection", (socket) => {
      console.log(`Player connected: ${socket.id}`);

      // Register player events
      this.playerEvents.registerEvents(socket);

      // Register game events
      this.gameEvents.registerEvents(socket);

      // Handle disconnect
      socket.on("disconnect", () => {
        console.log(`Player disconnected: ${socket.id}`);
        this.gameController.removePlayer(socket.id);
        this.io.emit("playerDisconnected", socket.id);
      });
    });
  }
}

module.exports = SocketManager;
```

## Implementation Strategy

### Phase 1: Preparation

1. Create the new directory structure
2. Set up configuration files
3. Create empty files for all new modules

### Phase 2: Core Refactoring

1. Refactor Game.js into core modules
   - Extract SceneManager
   - Extract EntityManager
   - Extract CombatSystem
   - Extract CollisionSystem
2. Update imports and references

### Phase 3: Network Refactoring

1. Refactor SocketManager.js into network modules
   - Extract Synchronization
   - Extract Prediction
2. Update imports and references

### Phase 4: Server Refactoring

1. Refactor server/index.js into server modules
   - Extract GameController
   - Extract WorldService
   - Extract PhysicsService
   - Extract SocketManager
2. Update imports and references

### Phase 5: Testing and Optimization

1. Test all refactored components
2. Fix any issues
3. Optimize performance
4. Add documentation

## Timeline

- **Week 1**: Phase 1 and start of Phase 2
- **Week 2**: Complete Phase 2 and start Phase 3
- **Week 3**: Complete Phase 3 and start Phase 4
- **Week 4**: Complete Phase 4 and Phase 5

## Risks and Mitigations

### Risks

- Breaking existing functionality during refactoring
- Introducing performance regressions
- Increasing complexity with too many small modules

### Mitigations

- Refactor one component at a time and test thoroughly
- Measure performance before and after each refactoring
- Use clear naming conventions and documentation
- Maintain a consistent coding style across all modules
