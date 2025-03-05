export class HUD {
  constructor(game) {
    this.game = game;
    
    // Create HUD container
    this.container = document.createElement('div');
    this.container.style.position = 'absolute';
    this.container.style.top = '0';
    this.container.style.left = '0';
    this.container.style.width = '100%';
    this.container.style.pointerEvents = 'none';
    
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

    // Create FPS counter
    this.fpsDisplay = document.createElement('div');
    this.fpsDisplay.style.position = 'absolute';
    this.fpsDisplay.style.top = '20px';
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
} 