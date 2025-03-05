export class HUD {
  constructor(game) {
    this.game = game;
    
    // Create HUD container
    this.container = document.createElement('div');
    this.container.id = 'ui-layer';
    this.container.style.position = 'absolute';
    this.container.style.top = '0';
    this.container.style.left = '0';
    this.container.style.width = '100%';
    this.container.style.height = '100%';
    this.container.style.pointerEvents = 'none';
    this.container.style.zIndex = '1000';
    
    // Create score display
    this.scoreDisplay = document.createElement('div');
    this.scoreDisplay.style.position = 'absolute';
    this.scoreDisplay.style.top = '20px';
    this.scoreDisplay.style.left = '20px';
    this.scoreDisplay.style.color = 'white';
    this.scoreDisplay.style.fontSize = '24px';
    this.scoreDisplay.style.fontFamily = 'Arial, sans-serif';
    this.scoreDisplay.style.textShadow = '2px 2px 4px rgba(0,0,0,0.5)';
    this.container.appendChild(this.scoreDisplay);
    
    // Create health bar
    this.healthBar = document.createElement('div');
    this.healthBar.style.position = 'absolute';
    this.healthBar.style.top = '60px';
    this.healthBar.style.left = '20px';
    this.healthBar.style.width = '200px';
    this.healthBar.style.height = '20px';
    this.healthBar.style.backgroundColor = 'rgba(0,0,0,0.5)';
    this.healthBar.style.border = '2px solid white';
    this.healthBar.style.borderRadius = '10px';
    this.healthBar.style.overflow = 'hidden';
    
    this.healthFill = document.createElement('div');
    this.healthFill.style.width = '100%';
    this.healthFill.style.height = '100%';
    this.healthFill.style.backgroundColor = '#4CAF50';
    this.healthFill.style.transition = 'width 0.2s ease-out';
    this.healthBar.appendChild(this.healthFill);
    this.container.appendChild(this.healthBar);

    // Create online player count
    this.onlineCount = document.createElement('div');
    this.onlineCount.style.position = 'absolute';
    this.onlineCount.style.top = '20px';
    this.onlineCount.style.right = '20px';
    this.onlineCount.style.color = 'white';
    this.onlineCount.style.fontSize = '16px';
    this.onlineCount.style.fontFamily = 'Arial, sans-serif';
    this.onlineCount.style.textShadow = '2px 2px 4px rgba(0,0,0,0.5)';
    this.onlineCount.style.backgroundColor = 'rgba(0,0,0,0.5)';
    this.onlineCount.style.padding = '8px 12px';
    this.onlineCount.style.borderRadius = '5px';
    this.container.appendChild(this.onlineCount);

    // Create minimap container
    this.minimap = document.createElement('div');
    this.minimap.id = 'mini-map-container';
    this.minimap.style.position = 'absolute';
    this.minimap.style.bottom = '20px';
    this.minimap.style.right = '20px';
    this.minimap.style.width = '200px';
    this.minimap.style.height = '200px';
    this.minimap.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    this.minimap.style.border = '2px solid white';
    this.minimap.style.borderRadius = '50%';
    this.minimap.style.overflow = 'hidden';
    this.minimap.style.zIndex = '1000';
    this.minimap.style.display = 'block';
    
    // Create blips container
    this.blipsContainer = document.createElement('div');
    this.blipsContainer.id = 'blips-container';
    this.blipsContainer.style.width = '100%';
    this.blipsContainer.style.height = '100%';
    this.blipsContainer.style.position = 'relative';
    this.minimap.appendChild(this.blipsContainer);
    
    // Create radar sweep effect
    this.radarLine = document.createElement('div');
    this.radarLine.className = 'radar-line';
    this.minimap.appendChild(this.radarLine);
    
    // Add minimap to container
    this.container.appendChild(this.minimap);

    // Create FPS counter
    this.fpsDisplay = document.createElement('div');
    this.fpsDisplay.style.position = 'absolute';
    this.fpsDisplay.style.top = '50px';
    this.fpsDisplay.style.right = '20px';
    this.fpsDisplay.style.color = 'white';
    this.fpsDisplay.style.fontSize = '16px';
    this.fpsDisplay.style.fontFamily = 'monospace';
    this.fpsDisplay.style.textShadow = '2px 2px 4px rgba(0,0,0,0.5)';
    this.container.appendChild(this.fpsDisplay);

    // FPS calculation variables
    this.frameCount = 0;
    this.lastFpsUpdate = 0;
    this.fps = 0;
    
    // Add to game container
    this.game.container.appendChild(this.container);
  }
  
  update() {
    // Update score
    this.scoreDisplay.textContent = `Score: ${this.game.score}`;
    
    // Update health bar
    if (this.game.ship) {
      const health = this.game.ship.health || 0;
      this.healthFill.style.width = `${health}%`;
      
      // Change color based on health
      if (health > 60) {
        this.healthFill.style.backgroundColor = '#4CAF50'; // Green
      } else if (health > 30) {
        this.healthFill.style.backgroundColor = '#FFC107'; // Yellow
      } else {
        this.healthFill.style.backgroundColor = '#F44336'; // Red
      }
    }

    // Update online player count
    if (this.game.socketManager) {
      const playerCount = this.game.socketManager.otherPlayers.size + 1;
      this.onlineCount.textContent = `Players Online: ${playerCount}`;
    }

    // Update minimap blips
    this.updateMinimap();

    // Update FPS counter
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFpsUpdate >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / (now - this.lastFpsUpdate));
      this.fpsDisplay.textContent = `FPS: ${this.fps}`;
      this.frameCount = 0;
      this.lastFpsUpdate = now;
    }
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
      playerBlip.style.position = 'absolute';
      playerBlip.style.width = '8px';
      playerBlip.style.height = '8px';
      playerBlip.style.backgroundColor = '#36aae0';
      playerBlip.style.borderRadius = '50%';
      playerBlip.style.transform = 'translate(-50%, -50%)';
      
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
          blip.style.position = 'absolute';
          blip.style.width = '6px';
          blip.style.height = '6px';
          blip.style.backgroundColor = '#e74c3c';
          blip.style.borderRadius = '50%';
          blip.style.transform = 'translate(-50%, -50%)';
          
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