# Moana’s Wake: Pirate Pursuit - Initial Game Plan and MVP

## Game Overview

**Moana’s Wake: Pirate Pursuit** is a browser-based 3D racing game built with Three.js, blending Polynesian-inspired ocean exploration with pirate combat. Players captain voyaging ships, racing across a dynamic sea to reach a treasure island while battling rivals with cannons and boarding actions. Real-time multiplayer lets players compete live, dodging obstacles, firing cannonballs, and stealing loot. The MVP focuses on core racing and combat mechanics, a simple ocean environment, and basic multiplayer sync.

---

## Game Vision

- **Setting**: A vibrant tropical sea with waves, islands, and pirate flair (e.g., floating wreckage, treasure chests).
- **Core Mechanics**:
  - Race to a finish line (treasure island).
  - Attack rival ships with cannons or board them for loot.
  - Navigate dynamic waves and obstacles.
- **Multiplayer**: Real-time ship movement and combat synced via WebSockets.
- **Aesthetic**: _Moana_-inspired Polynesian ships (outriggers, carved hulls) with pirate upgrades (cannons, tattered sails), set against a colorful ocean backdrop.

---

## Minimum Viable Product (MVP) Goals

The MVP will deliver a playable prototype with:

1. A single-player ship racing across a basic 3D ocean to a finish line.
2. Simple cannon combat against static targets (e.g., buoys).
3. Multiplayer sync for ship positions and basic interactions.
4. A minimal ocean environment with waves and one obstacle type.

This MVP tests the core loop—racing, combat, and multiplayer—while keeping development lightweight for iteration.

---

## MVP Features

### 1. Ocean Environment

- **Water Plane**: A flat 3D plane with basic wave animation (e.g., sine wave displacement via Three.js shaders).
- **Boundaries**: Invisible walls or edge markers to keep players on course.
- **Start/Finish**: Two glowing buoys (start and finish) to define the race path.
- **Obstacle**: Floating logs (simple cubes) that damage ships on collision.

### 2. Ship Mechanics

- **Model**: A basic outrigger canoe (hull, sail, paddles) as a 3D object.
- **Controls**:
  - WASD: Move forward, turn left/right, paddle harder.
  - Mouse: Adjust sail angle or aim cannon.
- **Physics**: Simple momentum (ship drifts when not paddling) and collision with obstacles.
- **Health**: Hull health bar (100 HP), reduced by obstacle hits or cannon fire.

### 3. Racing Mechanics

- **Objective**: Reach the finish buoy first.
- **Timer**: Tracks time from start to finish, displayed in a basic HUD.
- **Wind**: A constant directional force (e.g., +X axis) boosts speed when sails align.

### 4. Pirate Combat

- **Cannon**: Fires a single projectile (e.g., a sphere) on click, with a 3-second cooldown.
- **Damage**: Cannon hits reduce target health (e.g., 20 HP per hit).
- **Targets**: Static buoys (placeholders for enemy ships) that sink when health reaches 0.

### 5. Multiplayer

- **Sync**: Use WebSockets (e.g., Socket.io) to share ship positions and cannon fire in real-time.
- **Players**: Up to 4 players, each as a colored ship model (e.g., red, blue, green, yellow).
- **Basic Interaction**: Cannon hits damage other players’ ships, synced across clients.

### 6. Visuals and Audio

- **Graphics**: Low-poly ship and water with simple textures (e.g., blue water, wooden hull).
- **Effects**: Water splash particles when ships move or cannonballs hit.
- **Sound**: Basic wave loop and cannon blast sound (placeholder audio files).

---

## Technical Stack

- **Three.js**: 3D rendering for ocean, ships, and projectiles.
- **WebSockets (Socket.io)**: Real-time multiplayer sync.
- **Cannon.js**: Optional physics for ship momentum and collisions (can start with custom logic).
- **HTML/CSS**: Basic HUD (timer, health bar).
- **Tools**: Claude and Grok for code assistance, debugging, and optimization.

---

## Step-by-Step Development Plan

### Step 1: Ocean and Ship Setup

- **Tasks**:
  - Create a 3D water plane (100x100 units) with basic wave animation.
  - Add a ship model (e.g., a box with a triangle sail) at the origin.
  - Implement WASD movement (forward speed: 5 units/sec, turn: 90°/sec).
  - Place start/finish buoys (green/red spheres) 50 units apart.
- **Output**: A ship can move from start to finish across a wavy ocean.

### Step 2: Racing Mechanics

- **Tasks**:
  - Add a timer (starts on movement, stops at finish buoy collision).
  - Implement wind (constant +X force, +2 speed when facing it).
  - Create a HUD (HTML overlay) showing timer and speed.
- **Output**: A timed race to the finish with wind affecting speed.

### Step 3: Pirate Combat Basics

- **Tasks**:
  - Add a cannon (fires a sphere on click, speed: 10 units/sec, 3-sec cooldown).
  - Place 3 static buoys (50 HP each) as targets along the path.
  - Code collision detection: cannonballs reduce buoy health, sinking them at 0 HP.
- **Output**: Ship can shoot and destroy buoys while racing.

### Step 4: Multiplayer Integration

- **Tasks**:
  - Set up a WebSocket server (e.g., Node.js with Socket.io).
  - Sync ship positions (x, y, z, rotation) every 100ms.
  - Add 3 more player ships (colored models) visible to all.
  - Sync cannon fire and health changes across players.
- **Output**: 4 players can race and shoot each other live.

### Step 5: Obstacles and Polish

- **Tasks**:
  - Add floating logs (cubes, 10 HP damage on collision) mid-course.
  - Implement ship health (100 HP, visible bar), reduced by logs or cannon hits.
  - Add splash particles and cannon sound effects.
- **Output**: A complete MVP with racing, combat, obstacles, and multiplayer.

---

## MVP Success Criteria

- **Playable**: One player can race to the finish, shoot targets, and take damage.
- **Multiplayer**: Four players can join, see each other, and fight in real-time.
- **Stable**: Runs in the browser (Chrome/Firefox) at 30+ FPS with no crashes.
- **Fun**: Basic racing and combat feel engaging enough to iterate on.

---

## Next Steps (Post-MVP)

- **Enhanced Combat**: Boarding (grapple + duel), cannon types (chain shot, explosive).
- **Dynamic Ocean**: Bigger waves, storms, sea monsters.
- **Visuals**: Detailed ship models, textured water, pirate-themed assets.
- **Features**: Loot collection, ship customization, leaderboards.

---

## Development Notes

- **Start Simple**: Use basic shapes (cubes, spheres) for prototyping, then refine with models.
- **Test Early**: Check multiplayer sync and performance with 2-4 players locally.
- **Leverage Tools**: Use Claude/Grok to generate Three.js snippets (e.g., wave shaders, collision logic).

---
