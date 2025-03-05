export class HUD {
  constructor(game) {
    this.game = game;
    this.container = document.createElement('div');
    this.container.id = 'hud-container';
    document.body.appendChild(this.container);
    
    this.createElements();
    this.lastRadarUpdate = 0;
    this.radarUpdateInterval = 100; // Update radar every 100ms
  }
  
  createElements() {
    // Mini-map
    this.miniMapContainer = document.createElement('div');
    this.miniMapContainer.id = 'mini-map-container';
    
    // Add radar scan line
    this.radarLine = document.createElement('div');
    this.radarLine.className = 'radar-line';
    this.miniMapContainer.appendChild(this.radarLine);
    
    // Container for enemy blips
    this.blipsContainer = document.createElement('div');
    this.blipsContainer.id = 'blips-container';
    this.miniMapContainer.appendChild(this.blipsContainer);
    
    this.container.appendChild(this.miniMapContainer);

    // Player health
    this.healthContainer = document.createElement('div');
    this.healthContainer.id = 'health-container';
    this.healthBar = document.createElement('div');
    this.healthBar.id = 'health-bar';
    this.healthText = document.createElement('div');
    this.healthText.id = 'health-text';
    this.healthContainer.appendChild(this.healthBar);
    this.healthContainer.appendChild(this.healthText);
    this.container.appendChild(this.healthContainer);
    
    // Score
    this.scoreContainer = document.createElement('div');
    this.scoreContainer.id = 'score-container';
    this.scoreText = document.createElement('div');
    this.scoreText.id = 'score-text';
    this.scoreContainer.appendChild(this.scoreText);
    this.container.appendChild(this.scoreContainer);
    
    // Online count instead of player list
    this.onlineCount = document.createElement('div');
    this.onlineCount.id = 'online-count';
    this.container.appendChild(this.onlineCount);
    
    // Weapon cooldowns
    this.cooldownContainer = document.createElement('div');
    this.cooldownContainer.id = 'cooldown-container';
    
    // Left cannon
    this.leftCooldown = document.createElement('div');
    this.leftCooldown.className = 'cooldown-indicator left';
    this.cooldownContainer.appendChild(this.leftCooldown);
    
    // Right cannon
    this.rightCooldown = document.createElement('div');
    this.rightCooldown.className = 'cooldown-indicator right';
    this.cooldownContainer.appendChild(this.rightCooldown);
    
    this.container.appendChild(this.cooldownContainer);
  }
  
  updateMiniMap() {
    const now = Date.now();
    if (now - this.lastRadarUpdate < this.radarUpdateInterval) return;
    this.lastRadarUpdate = now;

    // Clear existing blips
    this.blipsContainer.innerHTML = '';

    // Add player blip
    if (this.game.ship) {
      const playerBlip = document.createElement('div');
      playerBlip.className = 'player-blip';
      playerBlip.style.left = '50%';
      playerBlip.style.top = '50%';
      this.blipsContainer.appendChild(playerBlip);
    }

    // Add enemy blips
    if (this.game.socketManager && this.game.socketManager.otherPlayers) {
      this.game.socketManager.otherPlayers.forEach(player => {
        if (!player.ship || !this.game.ship) return;

        // Calculate relative position
        const relativePos = player.ship.mesh.position.clone()
          .sub(this.game.ship.mesh.position);

        // Convert world position to radar coordinates
        const radarX = (relativePos.x / 200 * 100) + 50;
        const radarZ = (relativePos.z / 200 * 100) + 50;

        // Only show if within radar range
        if (radarX >= 0 && radarX <= 100 && radarZ >= 0 && radarZ <= 100) {
          const enemyBlip = document.createElement('div');
          enemyBlip.className = 'enemy-blip';
          enemyBlip.style.left = `${radarX}%`;
          enemyBlip.style.top = `${radarZ}%`;
          this.blipsContainer.appendChild(enemyBlip);
        }
      });
    }
    
    // Add obstacle blips
    if (this.game.obstacles && this.game.obstacles.length > 0) {
      this.game.obstacles.forEach(obstacle => {
        if (!obstacle.mesh || !this.game.ship) return;
        
        // Calculate relative position
        const relativePos = obstacle.mesh.position.clone()
          .sub(this.game.ship.mesh.position);
          
        // Convert world position to radar coordinates
        const radarX = (relativePos.x / 200 * 100) + 50;
        const radarZ = (relativePos.z / 200 * 100) + 50;
        
        // Only show if within radar range
        if (radarX >= 0 && radarX <= 100 && radarZ >= 0 && radarZ <= 100) {
          const obstacleBlip = document.createElement('div');
          obstacleBlip.className = 'obstacle-blip';
          obstacleBlip.style.left = `${radarX}%`;
          obstacleBlip.style.top = `${radarZ}%`;
          this.blipsContainer.appendChild(obstacleBlip);
        }
      });
    }
    
    // Also add buoys to the radar
    if (this.game.buoys && this.game.buoys.length > 0) {
      this.game.buoys.forEach(buoy => {
        if (!buoy.mesh || !this.game.ship) return;
        
        // Calculate relative position
        const relativePos = buoy.mesh.position.clone()
          .sub(this.game.ship.mesh.position);
          
        // Convert world position to radar coordinates
        const radarX = (relativePos.x / 200 * 100) + 50;
        const radarZ = (relativePos.z / 200 * 100) + 50;
        
        // Only show if within radar range
        if (radarX >= 0 && radarX <= 100 && radarZ >= 0 && radarZ <= 100) {
          const buoyBlip = document.createElement('div');
          buoyBlip.className = 'obstacle-blip';
          buoyBlip.style.backgroundColor = 'var(--secondary-color)';
          buoyBlip.style.left = `${radarX}%`;
          buoyBlip.style.top = `${radarZ}%`;
          this.blipsContainer.appendChild(buoyBlip);
        }
      });
    }
  }
  
  update() {
    // Update mini-map
    this.updateMiniMap();

    // Update health
    if (this.game.ship) {
      const health = this.game.ship.health;
      this.healthBar.style.width = `${health}%`;
      this.healthText.textContent = `Health: ${Math.round(health)}%`;
      
      // Change color based on health
      if (health > 60) {
        this.healthBar.style.backgroundColor = 'var(--health-color)';
      } else if (health > 30) {
        this.healthBar.style.backgroundColor = 'var(--warning-color)';
      } else {
        this.healthBar.style.backgroundColor = 'var(--danger-color)';
      }
    }
    
    // Update online count - only show other players
    const onlineCount = this.game.socketManager ? this.game.socketManager.otherPlayers.size : 0;
    this.onlineCount.textContent = `Online: ${onlineCount}`;
    
    // Update score
    this.scoreText.textContent = `Score: ${this.game.score}`;
    
    // Update cooldowns
    const now = Date.now();
    const inputManager = this.game.inputManager;
    
    // Left cannon cooldown
    const leftProgress = Math.min(1, (now - inputManager.lastLeftCannonFire) / inputManager.cannonCooldown);
    this.leftCooldown.style.height = `${leftProgress * 100}%`;
    
    // Right cannon cooldown
    const rightProgress = Math.min(1, (now - inputManager.lastRightCannonFire) / inputManager.cannonCooldown);
    this.rightCooldown.style.height = `${rightProgress * 100}%`;
  }
} 