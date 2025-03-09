/**
 * Utility class to manage debug overlay
 */
export class DebugOverlay {
  constructor(game) {
    this.game = game;
    this.debugMode = false;
    this.debugContainer = null;
    this.fpsCounter = {
      element: null,
      frames: 0,
      lastTime: 0
    };
    this.memoryDisplay = null;
    this.entityCounter = null;
    this.positionDisplay = null;
    this.pingDisplay = null;
    
    this.initialize();
  }
  
  initialize() {
    // Create debug container
    this.debugContainer = document.createElement('div');
    this.debugContainer.id = 'debug-overlay';
    this.debugContainer.style.display = 'none';
    document.body.appendChild(this.debugContainer);
    
    // Create FPS counter
    this.fpsCounter.element = document.createElement('div');
    this.fpsCounter.element.id = 'fps-counter';
    this.fpsCounter.element.textContent = 'FPS: 0';
    this.debugContainer.appendChild(this.fpsCounter.element);
    
    // Create memory usage display
    this.memoryDisplay = document.createElement('div');
    this.memoryDisplay.id = 'memory-usage';
    this.memoryDisplay.textContent = 'Memory: 0 MB';
    this.debugContainer.appendChild(this.memoryDisplay);
    
    // Create entity counter
    this.entityCounter = document.createElement('div');
    this.entityCounter.id = 'entity-counter';
    this.entityCounter.textContent = 'Entities: 0';
    this.debugContainer.appendChild(this.entityCounter);
    
    // Create position display
    this.positionDisplay = document.createElement('div');
    this.positionDisplay.id = 'position-display';
    this.positionDisplay.textContent = 'Position: (0, 0, 0)';
    this.debugContainer.appendChild(this.positionDisplay);
    
    // Create ping display
    this.pingDisplay = document.createElement('div');
    this.pingDisplay.id = 'ping-display';
    this.pingDisplay.textContent = 'Ping: 0ms';
    this.debugContainer.appendChild(this.pingDisplay);
    
    // Add toggle button
    const toggleButton = document.createElement('button');
    toggleButton.textContent = 'Debug';
    toggleButton.id = 'debug-toggle';
    document.body.appendChild(toggleButton);
    
    // Add event listener
    toggleButton.addEventListener('click', () => {
      this.debugMode = !this.debugMode;
      this.debugContainer.style.display = this.debugMode ? 'block' : 'none';
    });
  }
  
  update(time, delta) {
    if (!this.debugMode) return;
    
    // Update FPS counter
    this.fpsCounter.frames++;
    
    if (time >= this.fpsCounter.lastTime + 1000) {
      this.fpsCounter.element.textContent = `FPS: ${this.fpsCounter.frames}`;
      this.fpsCounter.frames = 0;
      this.fpsCounter.lastTime = time;
    }
    
    // Update memory usage if available
    if (window.performance && window.performance.memory) {
      const memoryUsed = Math.round(window.performance.memory.usedJSHeapSize / 1048576);
      const memoryTotal = Math.round(window.performance.memory.totalJSHeapSize / 1048576);
      this.memoryDisplay.textContent = `Memory: ${memoryUsed}MB / ${memoryTotal}MB`;
    }
    
    // Update entity counter
    let entityCount = 0;
    if (this.game.projectiles) entityCount += this.game.projectiles.length;
    if (this.game.islands) entityCount += this.game.islands.length;
    if (this.game.collectibles) entityCount += this.game.collectibles.length;
    if (this.game.obstacles) entityCount += this.game.obstacles.length;
    if (this.game.socketManager && this.game.socketManager.otherPlayers) {
      entityCount += this.game.socketManager.otherPlayers.size;
    }
    
    this.entityCounter.textContent = `Entities: ${entityCount}`;
    
    // Update position display
    if (this.game.ship && this.game.ship.mesh) {
      const pos = this.game.ship.mesh.position;
      this.positionDisplay.textContent = `Position: (${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)})`;
    }
    
    // Update ping display
    if (this.game.socketManager) {
      this.pingDisplay.textContent = `Ping: ${this.game.socketManager.lastPing || 0}ms`;
    }
  }
} 