# Moana's Wake: Pirate Pursuit

A 3D browser-based racing and combat game built with Three.js featuring Moana sailing a Polynesian-inspired ship across a dynamic ocean, battling obstacles, and racing to the finish line.

##  Product Preview
<p align="center">
  <img src="https://github.com/lokeshinumpudi/moana-adventures/blob/release/moana-adventures.jpeg" alt="Moana adventures game" width="350"/>
  <br/>
  <em>Moana adventures</em>
</p>

## Project Structure

```
client/
├── src/
│   ├── js/
│   │   ├── components/
│   │   │   ├── Ship.js         # Ship class with physics and weapons
│   │   │   ├── Character.js    # Character model with animations
│   │   │   ├── Ocean.js        # Dynamic ocean with wave simulation
│   │   │   ├── Buoy.js         # Race markers and obstacles
│   │   │   ├── Obstacle.js     # Various obstacles (rocks, logs, etc.)
│   │   │   ├── Projectile.js   # Projectile physics and effects
│   │   │   ├── ParticleSystem.js # Visual effects system
│   │   │   ├── SkyBox.js       # Environmental skybox
│   │   │   └── HUD.js          # Heads-up display
│   │   ├── utils/
│   │   │   ├── InputManager.js  # Handles user input
│   │   │   └── CameraManager.js # Camera controls and modes
│   │   ├── SocketManager.js     # Multiplayer networking
│   │   └── Game.js             # Main game loop and logic
│   ├── style.css               # Game styles
│   └── main.js                 # Entry point
└── index.html                  # Main HTML file
```

## Current Features

- [x] Dynamic 3D ocean with realistic wave simulation
- [x] Detailed Polynesian outrigger canoe with physics
- [x] Character model with hair physics
- [x] Weapon systems (cannons and machine guns)
- [x] Particle effects for impacts and water
- [x] Multiplayer support with Socket.io
- [x] Client-side prediction and interpolation
- [x] Multiple camera modes
- [x] HUD with player info and weapon cooldowns
- [x] Race markers and obstacles
- [x] Collision detection and damage system

## In Progress

- [ ] Enhanced visual effects
- [ ] Sound effects and music
- [ ] More detailed environment
- [ ] Power-ups and collectibles
- [ ] Race modes and scoring system
- [ ] Character customization
- [ ] Weather system
- [ ] AI opponents

## Next Steps

1. Add sound effects and background music
2. Implement power-ups and collectibles
3. Add more detailed environment with islands and sea life
4. Create a weather system with storms and day/night cycle
5. Add AI-controlled ships for single-player mode
6. Implement character customization
7. Add race modes with checkpoints and scoring

## Controls

- **W/Up Arrow**: Move forward
- **S/Down Arrow**: Move backward
- **A/Left Arrow**: Turn left
- **D/Right Arrow**: Turn right
- **Q/Left Click**: Fire port (left) cannon
- **E/Right Click**: Fire starboard (right) cannon
- **Z**: Fire left machine gun
- **X**: Fire right machine gun
- **F**: Fire front machine gun
- **C**: Toggle camera mode
- **1-4**: Camera presets

## Development

1. Clone the repository
2. Open `index.html` in a modern browser
3. No build step required - it's all vanilla JavaScript!

## Credits

- Built with Three.js
- Inspired by Disney's Moana and Polynesian voyaging

## Future Enhancements

- Full multiplayer implementation with Socket.io
- More detailed ship and character models
- Additional weapons and powerups
- Race timing and leaderboards
- Weather effects and day/night cycle
