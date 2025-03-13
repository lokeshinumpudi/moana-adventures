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
    // Clear existing blips
    while (this.blipsContainer.firstChild) {
      this.blipsContainer.removeChild(this.blipsContainer.firstChild);
    }

    const playerPos = this.game.ship.mesh.position;

    // Add player blip
    const playerBlip = document.createElement('div');
    playerBlip.className = 'player-blip';

    // Center the player on the minimap
    playerBlip.style.left = '50%';
    playerBlip.style.top = '50%';

    // Add player direction indicator
    const playerDirection = document.createElement('div');
    playerDirection.className = 'player-direction';

    // Rotate the direction indicator to match player rotation
    playerDirection.style.transform = `rotate(${-this.game.ship.mesh.rotation.y}rad)`;

    playerBlip.appendChild(playerDirection);
    this.blipsContainer.appendChild(playerBlip);

    // Add other players
    if (this.game.socketManager && this.game.socketManager.otherPlayers) {
      this.game.socketManager.otherPlayers.forEach((player) => {
        const state = player.state || player;
        if (!state.position) return;

        // Calculate position relative to player
        const relativePos = this.calculateRelativePosition(state.position, playerPos);

        // Check if in range
        const mapRange = 100; // World units visible on minimap
        if (Math.abs(relativePos.x) > mapRange || Math.abs(relativePos.z) > mapRange) {
          return; // Skip if out of range
        }

        // Calculate position on minimap (convert world coordinates to minimap coordinates)
        const mapSize = 100; // Size of minimap in pixels
        const mapX = (relativePos.x / mapRange) * (mapSize / 2) + 50; // Convert to percentage (50% is center)
        const mapZ = (relativePos.z / mapRange) * (mapSize / 2) + 50; // Convert to percentage (50% is center)

        // Create blip for other player
        const enemyBlip = document.createElement('div');
        enemyBlip.className = 'enemy-blip';
        enemyBlip.style.left = `${mapX}%`;
        enemyBlip.style.top = `${mapZ}%`;

        // Add direction indicator for enemy
        const enemyDirection = document.createElement('div');
        enemyDirection.className = 'enemy-direction';

        // Rotate to match enemy rotation
        if (state.rotation) {
          enemyDirection.style.transform = `rotate(${-state.rotation.y}rad)`;
        }

        enemyBlip.appendChild(enemyDirection);
        this.blipsContainer.appendChild(enemyBlip);
      });
    }

    // Add islands if available
    if (this.game.islands) {
      this.game.islands.forEach(island => {
        const islandPos = island.mesh.position;

        // Calculate position relative to player
        const relativePos = this.calculateRelativePosition(islandPos, playerPos);

        // Check if in range
        const mapRange = 150; // Larger range for islands
        if (Math.abs(relativePos.x) > mapRange || Math.abs(relativePos.z) > mapRange) {
          return; // Skip if out of range
        }

        // Calculate size based on island radius
        const mapSize = 100; // Size of minimap in pixels
        const mapX = (relativePos.x / mapRange) * (mapSize / 2) + 50;
        const mapZ = (relativePos.z / mapRange) * (mapSize / 2) + 50;

        // Create marker for island
        const islandMarker = document.createElement('div');
        islandMarker.className = 'island-marker';
        islandMarker.style.left = `${mapX}%`;
        islandMarker.style.top = `${mapZ}%`;

        // Scale marker based on island size
        const markerSize = Math.max(5, island.radius / 10);
        islandMarker.style.width = `${markerSize}px`;
        islandMarker.style.height = `${markerSize}px`;

        this.blipsContainer.appendChild(islandMarker);
      });
    }
  }

  calculateRelativePosition(targetPos, playerPos) {
    return {
      x: targetPos.x - playerPos.x,
      y: targetPos.y - playerPos.y,
      z: targetPos.z - playerPos.z,
    };
  }
}