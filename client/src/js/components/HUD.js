export class HUD {
  constructor(game) {
    this.game = game;

    // Track active powerups
    this.activePowerups = [];

    // Initialize element references
    this.initializeElements();
  }

  initializeElements() {
    // Get references to HUD elements from the DOM
    this.container = document.getElementById('ui-layer');

    // Stats elements
    this.statsContainer = document.querySelector('.stats-container');
    this.scoreDisplay = document.querySelector('.score-display');
    this.healthBarContainer = document.querySelector('.health-bar-container');
    this.healthBarFill = document.querySelector('.health-bar-fill');
    this.healthBarText = document.querySelector('.health-bar-text');
    this.killsDisplay = document.querySelector('.kills-display');
    this.onlineCount = document.querySelector('.online-count');

    // Power-ups container
    this.powerupsContainer = document.querySelector('.powerups-container');

    // Minimap elements
    this.minimapContainer = document.getElementById('mini-map-container');
    this.blipsContainer = document.getElementById('blips-container');

    // Notification container
    this.notificationContainer = document.querySelector('.notification-container');

    // Create time of day display
    this.createTimeDisplay();

    // Validate that required elements exist
    if (!this.container) {
      console.error('HUD container not found');
    }

    if (!this.statsContainer) {
      console.error('Stats container not found');
    }

    if (!this.healthBarFill) {
      console.error('Health bar fill element not found');
    }

    if (!this.minimapContainer) {
      console.error('Minimap container not found');
    }

    if (!this.notificationContainer) {
      console.error('Notification container not found');
    }

    // Initialize minimap
    this.minimapContainer = document.getElementById('mini-map-container');
    this.blipsContainer = document.getElementById('blips-container');
    
    // Clear any existing content in the blips container
    if (this.blipsContainer) {
      while (this.blipsContainer.firstChild) {
        this.blipsContainer.removeChild(this.blipsContainer.firstChild);
      }
    }
  }

  createTimeDisplay() {
    // Create time display container
    this.timeDisplay = document.createElement('div');
    this.timeDisplay.className = 'time-display';
    
    // Create clock element
    this.timeClock = document.createElement('div');
    this.timeClock.className = 'time-clock';
    this.timeClock.textContent = '00:00';
    
    // Create period element
    this.timePeriod = document.createElement('div');
    this.timePeriod.className = 'time-period';
    this.timePeriod.textContent = 'Dawn';
    
    // Assemble elements
    this.timeDisplay.appendChild(this.timeClock);
    this.timeDisplay.appendChild(this.timePeriod);
    
    // Add to container
    this.container.appendChild(this.timeDisplay);
  }

  update(data = {}) {
    // Update score
    if (data.score !== undefined && this.scoreDisplay) {
      this.scoreDisplay.textContent = `Score: ${data.score}`;
    }

    // Update health bar
    if (data.health !== undefined && data.maxHealth !== undefined) {
      const healthPercent = (data.health / data.maxHealth) * 100;

      if (this.healthBarFill) {
        this.healthBarFill.style.width = `${healthPercent}%`;

        // Change color based on health
        if (healthPercent < 25) {
          this.healthBarFill.style.backgroundColor = '#ff0000';
        } else if (healthPercent < 50) {
          this.healthBarFill.style.backgroundColor = '#ffaa00';
        } else {
          this.healthBarFill.style.backgroundColor = '#00cc00';
        }
      }

      if (this.healthBarText) {
        this.healthBarText.textContent = `${Math.ceil(data.health)} / ${data.maxHealth}`;
      }
    }

    // Update kills
    if (data.kills !== undefined && this.killsDisplay) {
      this.killsDisplay.textContent = `Kills: ${data.kills}`;
    }

    // Update players online
    if (data.playersOnline !== undefined && this.onlineCount) {
      this.onlineCount.textContent = `Players Online: ${data.playersOnline}`;
    }

    // Update time of day display if weather system exists
    if (this.game.weather) {
      this.updateTimeDisplay();
    }

    // Update ping if debug is enabled
    if (this.game.debug && this.game.socketManager) {
      const debugElement = document.getElementById('debug-overlay');
      if (debugElement) {
        const pingElement = debugElement.querySelector('.debug-ping');
        if (pingElement) {
          pingElement.textContent = `Ping: ${this.game.socketManager.lastPing}ms`;
        }
      }
    }

    // Update powerup timers
    this.updatePowerupTimers();

    // Update minimap
    this.updateMinimap();
  }

  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    // Add to container
    this.notificationContainer.appendChild(notification);

    // Auto-remove after delay
    setTimeout(() => {
      notification.classList.add('fadeout');

      // Remove from DOM after animation
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 500);
    }, 3000);

    return notification;
  }

  addPowerup(type, duration) {
    // Check if powerup already exists
    const existingPowerup = this.activePowerups.find(p => p.type === type);

    if (existingPowerup) {
      // Update duration and reset timer
      existingPowerup.duration = duration;
      existingPowerup.startTime = Date.now();

      // Update UI
      if (existingPowerup.element) {
        const timerElement = existingPowerup.element.querySelector('.powerup-timer');
        if (timerElement) {
          timerElement.textContent = `${duration.toFixed(1)}s`;
        }
      }

      return;
    }

    // Create new powerup entry
    const powerup = {
      type: type,
      duration: duration,
      startTime: Date.now(),
      element: null,
    };

    // Create UI element
    const powerupElement = document.createElement('div');
    powerupElement.className = 'powerup-item';

    // Create icon
    const iconElement = document.createElement('div');
    iconElement.className = 'powerup-icon';

    // Set icon based on type
    let iconContent = '?';
    let powerupName = 'Unknown';

    switch (type) {
    case 'speed':
      iconContent = '⚡';
      powerupName = 'Speed Boost';
      break;
    case 'rapidfire':
      iconContent = '🔥';
      powerupName = 'Rapid Fire';
      break;
    case 'shield':
      iconContent = '🛡️';
      powerupName = 'Shield';
      break;
    case 'repair':
      iconContent = '🔧';
      powerupName = 'Repair';
      break;
    case 'doublecannon':
      iconContent = '💥';
      powerupName = 'Double Cannon';
      break;
    }

    iconElement.textContent = iconContent;

    // Create info container
    const infoElement = document.createElement('div');
    infoElement.className = 'powerup-info';

    // Create name element
    const nameElement = document.createElement('div');
    nameElement.className = 'powerup-name';
    nameElement.textContent = powerupName;

    // Create timer element
    const timerElement = document.createElement('div');
    timerElement.className = 'powerup-timer';
    timerElement.textContent = `${duration.toFixed(1)}s`;

    // Assemble elements
    infoElement.appendChild(nameElement);
    infoElement.appendChild(timerElement);

    powerupElement.appendChild(iconElement);
    powerupElement.appendChild(infoElement);

    // Add to container
    this.powerupsContainer.appendChild(powerupElement);

    // Store element reference
    powerup.element = powerupElement;

    // Add to active powerups
    this.activePowerups.push(powerup);

    // Show notification
    this.showNotification(`${powerupName} activated!`, 'powerup');
  }

  updatePowerupTimers() {
    const now = Date.now();
    const expiredPowerups = [];

    // Update each powerup
    this.activePowerups.forEach(powerup => {
      const elapsed = (now - powerup.startTime) / 1000;
      const remaining = powerup.duration - elapsed;

      if (remaining <= 0) {
        // Powerup expired
        expiredPowerups.push(powerup);
      } else {
        // Update timer display
        const timerElement = powerup.element.querySelector('.powerup-timer');
        if (timerElement) {
          timerElement.textContent = `${remaining.toFixed(1)}s`;
        }
      }
    });

    // Remove expired powerups
    expiredPowerups.forEach(powerup => {
      // Remove from UI
      if (powerup.element && powerup.element.parentNode) {
        powerup.element.parentNode.removeChild(powerup.element);
      }

      // Remove from array
      const index = this.activePowerups.indexOf(powerup);
      if (index >= 0) {
        this.activePowerups.splice(index, 1);
      }

      // Notify game
      this.game.onPowerupExpired(powerup.type);

      // Show notification
      let powerupName = 'Unknown';
      switch (powerup.type) {
      case 'speed': powerupName = 'Speed Boost'; break;
      case 'rapidfire': powerupName = 'Rapid Fire'; break;
      case 'shield': powerupName = 'Shield'; break;
      case 'repair': powerupName = 'Repair'; break;
      case 'doublecannon': powerupName = 'Double Cannon'; break;
      }

      this.showNotification(`${powerupName} has expired`, 'info');
    });
  }

  updateMinimap() {
    if (!this.game || !this.game.ship || !this.blipsContainer) return;

    // Clear existing blips
    while (this.blipsContainer.firstChild) {
      this.blipsContainer.removeChild(this.blipsContainer.firstChild);
    }

    // Add minimap background
    const background = document.createElement('div');
    background.className = 'minimap-background';
    this.blipsContainer.appendChild(background);

    // Add compass rose
    const compassRose = document.createElement('div');
    compassRose.className = 'compass-rose';
    
    // Add compass lines
    const lineNS = document.createElement('div');
    lineNS.className = 'compass-line compass-line-ns';
    compassRose.appendChild(lineNS);
    
    const lineEW = document.createElement('div');
    lineEW.className = 'compass-line compass-line-ew';
    compassRose.appendChild(lineEW);
    
    // Add compass directions
    const directions = ['N', 'E', 'S', 'W'];
    const classes = ['compass-n', 'compass-e', 'compass-s', 'compass-w'];
    
    directions.forEach((dir, i) => {
      const direction = document.createElement('div');
      direction.className = `compass-direction ${classes[i]}`;
      direction.textContent = dir;
      compassRose.appendChild(direction);
    });
    
    this.blipsContainer.appendChild(compassRose);

    // Add radar sweep
    const sweep = document.createElement('div');
    sweep.className = 'radar-sweep';
    this.blipsContainer.appendChild(sweep);

    // Get our ship's position and rotation
    const ourShip = this.game.ship.mesh;
    const ourPosition = ourShip.position;
    const ourRotation = ourShip.rotation.y;
    
    // Get our player ID for comparison
    const ourPlayerId = this.game.socketManager?.socket?.id;
    
    // COORDINATE SYSTEM MAPPING:
    // In Three.js: 
    // - Positive Z is forward (when rotation.y = 0)
    // - Positive X is right
    // - Rotation increases clockwise (looking from above)
    //
    // On minimap screen:
    // - Top of screen is "forward" (negative Z in Three.js)
    // - Right of screen is "right" (positive X in Three.js)
    
    // Add islands
    if (this.game.islands) {
      this.game.islands.forEach(island => {
        if (!island.mesh?.position) return;

        // Calculate relative position in game world coordinates
        const relativeX = island.mesh.position.x - ourPosition.x;
        const relativeZ = island.mesh.position.z - ourPosition.z;
        
        // Check if in range
        const mapRange = 200; // World units visible on minimap
        const distance = Math.sqrt(relativeX * relativeX + relativeZ * relativeZ);
        if (distance > mapRange * 1.2) return;
        
        // Simple rotation formula - rotate around origin (player position)
        const sin = Math.sin(-ourRotation);
        const cos = Math.cos(-ourRotation);
        const rotatedX = (relativeX * cos) - (relativeZ * sin);
        const rotatedZ = (relativeX * sin) + (relativeZ * cos);
        
        // Convert to screen coordinates (percentage position)
        // Map to radar coordinates with z-flip (since forward is -z in Three.js but top on screen)
        const radarX = (rotatedX / mapRange) * 50 + 50;
        const radarZ = (-rotatedZ / mapRange) * 50 + 50; // Flip Z so forward is up
        
        // Only show if within radar bounds
        if (radarX >= 0 && radarX <= 100 && radarZ >= 0 && radarZ <= 100) {
          // Create island marker (green square)
          const islandMarker = document.createElement('div');
          islandMarker.className = 'island-marker';
          islandMarker.style.left = `${radarX}%`;
          islandMarker.style.top = `${radarZ}%`;

          // Scale marker based on island size
          const markerSize = Math.max(6, (island.radius || 10) / 5);
          islandMarker.style.width = `${markerSize}px`;
          islandMarker.style.height = `${markerSize}px`;
          
          // Add island label
          const islandLabel = document.createElement('div');
          islandLabel.className = 'minimap-label island-label';
          islandLabel.textContent = 'Island';
          islandLabel.style.left = `${radarX}%`;
          islandLabel.style.top = `${radarZ + 5}%`;
          
          this.blipsContainer.appendChild(islandMarker);
          this.blipsContainer.appendChild(islandLabel);
        }
      });
    }
    
    // Add other players as red dots with labels
    if (this.game.socketManager) {
      const otherPlayers = Array.from(this.game.socketManager.otherPlayers.values());
      
      otherPlayers.forEach(player => {
        if (!player?.state?.position) return;

        // Skip if this is our own player
        if (player.id === ourPlayerId) return;

        // Calculate relative position in game world coordinates
        const relativeX = player.state.position.x - ourPosition.x;
        const relativeZ = player.state.position.z - ourPosition.z;
        
        // Check if in range
        const mapRange = 200; // World units visible on minimap
        const distance = Math.sqrt(relativeX * relativeX + relativeZ * relativeZ);
        if (distance > mapRange) return;
        
        // Simple rotation formula - rotate around origin (player position)
        const sin = Math.sin(-ourRotation);
        const cos = Math.cos(-ourRotation);
        const rotatedX = (relativeX * cos) - (relativeZ * sin);
        const rotatedZ = (relativeX * sin) + (relativeZ * cos);
        
        // Convert to screen coordinates (percentage position)
        // Map to radar coordinates with z-flip (since forward is -z in Three.js but top on screen)
        const radarX = (rotatedX / mapRange) * 50 + 50;
        const radarZ = (-rotatedZ / mapRange) * 50 + 50; // Flip Z so forward is up
        
        // Only show if within radar bounds
        if (radarX >= 0 && radarX <= 100 && radarZ >= 0 && radarZ <= 100) {
          // Create enemy blip (red dot)
          const enemyBlip = document.createElement('div');
          enemyBlip.className = 'enemy-blip';
          enemyBlip.style.left = `${radarX}%`;
          enemyBlip.style.top = `${radarZ}%`;
          
          // Add enemy label
          const enemyLabel = document.createElement('div');
          enemyLabel.className = 'minimap-label enemy-label';
          enemyLabel.textContent = 'Enemy';
          enemyLabel.style.left = `${radarX}%`;
          enemyLabel.style.top = `${radarZ + 5}%`;
          
          this.blipsContainer.appendChild(enemyBlip);
          this.blipsContainer.appendChild(enemyLabel);
        }
      });
    }
    
    // Add player indicator (ship-like arrow in center)
    const playerIndicator = document.createElement('div');
    playerIndicator.className = 'player-arrow';
    playerIndicator.style.left = '50%';
    playerIndicator.style.top = '50%';
    
    // Rotate the arrow to match the ship's orientation including our correction
    // The arrow points up by default in CSS, which is opposite of Three.js Z+ direction
    playerIndicator.style.transform = `translate(-50%, -50%) rotate(${ourRotation}rad)`;
    
    // Add label for player
    const playerLabel = document.createElement('div');
    playerLabel.className = 'minimap-label player-label';
    playerLabel.textContent = 'You';
    playerLabel.style.left = '50%';
    playerLabel.style.top = '60%'; // Move label down a bit to avoid overlap
    
    this.blipsContainer.appendChild(playerIndicator);
    this.blipsContainer.appendChild(playerLabel);
  }

  calculateRelativePosition(targetPos, playerPos) {
    return {
      x: targetPos.x - playerPos.x,
      y: targetPos.y - playerPos.y,
      z: targetPos.z - playerPos.z,
    };
  }

  updateTimeDisplay() {
    if (!this.timeClock || !this.timePeriod || !this.game.weather) return;
    
    // Get formatted time string
    const timeString = this.game.weather.getTimeString();
    const periodName = this.game.weather.getTimeOfDayName();
    
    // Update display
    this.timeClock.textContent = timeString;
    this.timePeriod.textContent = periodName;
    
    // Update colors based on time of day
    const hour = this.game.weather.timeOfDay * 24;
    
    if (hour >= 5 && hour < 8) {
      // Dawn - orange
      this.timeDisplay.style.background = 'rgba(255, 153, 51, 0.6)';
      this.timeDisplay.style.borderLeft = '3px solid #ff9933';
    } else if (hour >= 8 && hour < 17) {
      // Day - blue
      this.timeDisplay.style.background = 'rgba(25, 42, 86, 0.6)';
      this.timeDisplay.style.borderLeft = '3px solid #5bc0de';
    } else if (hour >= 17 && hour < 20) {
      // Sunset - orange/red
      this.timeDisplay.style.background = 'rgba(204, 51, 0, 0.6)';
      this.timeDisplay.style.borderLeft = '3px solid #ff6600';
    } else {
      // Night - dark blue
      this.timeDisplay.style.background = 'rgba(10, 26, 42, 0.8)';
      this.timeDisplay.style.borderLeft = '3px solid #3366cc';
    }
    
    // Add server sync indicator if using server time
    if (this.game.weather.useServerTime) {
      this.timeClock.textContent += ' ⟳';
    }
  }
}