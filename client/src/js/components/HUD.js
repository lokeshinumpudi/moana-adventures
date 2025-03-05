export class HUD {
  constructor(game) {
    this.game = game;
    
    // Get references to existing HTML elements
    this.container = document.getElementById('ui-layer');
    this.statsContainer = document.getElementById('stats-container');
    this.scoreDisplay = document.getElementById('score-display');
    this.healthBarContainer = document.getElementById('health-bar-container');
    this.healthFill = document.getElementById('health-fill');
    this.healthText = document.getElementById('health-text');
    this.onlineCount = document.getElementById('online-count');
    this.fpsDisplay = document.getElementById('fps-display');
    this.minimap = document.getElementById('mini-map-container');
    this.blipsContainer = document.getElementById('blips-container');
    this.radarLine = document.querySelector('.radar-line');

    // FPS calculation variables
    this.frameCount = 0;
    this.lastFpsUpdate = 0;
    this.fps = 0;
  }
  
  update() {
    // Update score
    this.scoreDisplay.textContent = `Score: ${this.game.score}`;
    
    // Update health bar
    if (this.game.ship) {
      const health = Math.max(0, Math.min(100, this.game.ship.health));
      this.healthFill.style.width = `${health}%`;
      this.healthText.textContent = `${Math.round(health)} HP`;
      
      // Change color based on health
      if (health > 60) {
        this.healthFill.className = 'health-high';
      } else if (health > 30) {
        this.healthFill.className = 'health-medium';
      } else {
        this.healthFill.className = 'health-low';
      }
    }

    // Update online player count
    if (this.game.socketManager) {
      const playerCount = this.game.socketManager.otherPlayers.size + 1;
      this.onlineCount.textContent = `Crew Online: ${playerCount}`;
    }

    // Update FPS counter
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFpsUpdate >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / (now - this.lastFpsUpdate));
      this.fpsDisplay.textContent = `Speed: ${this.fps} knots`;
      this.frameCount = 0;
      this.lastFpsUpdate = now;
    }
    
    // Update minimap blips
    this.updateMinimap();
  }

  updateMinimap() {
    // Clear existing blips
    while (this.blipsContainer.firstChild) {
      this.blipsContainer.removeChild(this.blipsContainer.firstChild);
    }

    // Add player blip
    if (this.game.ship) {
      const playerBlip = document.createElement('div');
      playerBlip.className = 'player-blip';
      
      // Position in center
      playerBlip.style.left = '50%';
      playerBlip.style.top = '50%';
      
      this.blipsContainer.appendChild(playerBlip);
    }

    // Add other players' blips
    if (this.game.socketManager) {
      this.game.socketManager.otherPlayers.forEach(player => {
        if (player.ship && this.game.ship) {
          const relativePos = this.calculateRelativePosition(
            player.ship.mesh.position,
            this.game.ship.mesh.position
          );

          const blip = document.createElement('div');
          blip.className = 'enemy-blip';
          
          // Position relative to player
          blip.style.left = `${(relativePos.x * 0.5 + 0.5) * 100}%`;
          blip.style.top = `${(relativePos.z * 0.5 + 0.5) * 100}%`;
          
          this.blipsContainer.appendChild(blip);
        }
      });
    }
  }

  calculateRelativePosition(targetPos, playerPos) {
    // Calculate relative position within a certain range
    const range = 100; // Adjust this value to change minimap scale
    return {
      x: Math.max(-1, Math.min(1, (targetPos.x - playerPos.x) / range)),
      z: Math.max(-1, Math.min(1, (targetPos.z - playerPos.z) / range))
    };
  }
} 