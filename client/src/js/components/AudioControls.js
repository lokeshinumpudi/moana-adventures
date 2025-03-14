/**
 * AudioControls.js
 * UI component for controlling game audio settings
 */

export class AudioControls {
  constructor(game) {
    this.game = game;
    this.soundManager = game.soundManager;
    this.container = null;
    this.isVisible = false;
    
    // Create UI elements
    this.createUI();
    
    // Initialize event listeners
    this.initEventListeners();
  }
  
  /**
   * Create the audio controls UI
   */
  createUI() {
    // Create container
    this.container = document.createElement('div');
    this.container.className = 'audio-controls';
    this.container.style.display = 'none';
    
    // Create header
    const header = document.createElement('div');
    header.className = 'audio-controls-header';
    header.innerHTML = '<h3>Audio Settings</h3>';
    
    // Add close button
    const closeButton = document.createElement('button');
    closeButton.className = 'audio-controls-close';
    closeButton.innerHTML = '×';
    closeButton.addEventListener('click', () => this.hide());
    header.appendChild(closeButton);
    
    // Create content
    const content = document.createElement('div');
    content.className = 'audio-controls-content';
    
    // Master volume
    const masterVolume = this.createVolumeControl('Master Volume', 'master', this.soundManager.masterVolume);
    
    // Music volume
    const musicVolume = this.createVolumeControl('Music Volume', 'music', this.soundManager.musicVolume);
    
    // SFX volume
    const sfxVolume = this.createVolumeControl('Sound Effects', 'sfx', this.soundManager.sfxVolume);
    
    // Category volumes
    const categoryVolumes = document.createElement('div');
    categoryVolumes.className = 'audio-controls-categories';
    categoryVolumes.innerHTML = '<h4>Sound Categories</h4>';
    
    for (const [category, data] of Object.entries(this.soundManager.categories)) {
      const categoryControl = this.createVolumeControl(
        this.formatCategoryName(category), 
        `category-${category}`, 
        data.volume
      );
      categoryVolumes.appendChild(categoryControl);
    }
    
    // Mute button
    const muteButton = document.createElement('button');
    muteButton.className = 'audio-controls-mute';
    muteButton.textContent = this.soundManager.isMuted ? 'Unmute' : 'Mute All';
    muteButton.addEventListener('click', () => {
      const isMuted = this.soundManager.toggleMute();
      muteButton.textContent = isMuted ? 'Unmute' : 'Mute All';
    });
    
    // Test sounds button
    const testButton = document.createElement('button');
    testButton.className = 'audio-controls-test';
    testButton.textContent = 'Test Sounds';
    testButton.addEventListener('click', () => {
      // Play a test sound
      this.soundManager.playSound('notification');
      setTimeout(() => {
        this.soundManager.playSound('cannon_fire');
      }, 500);
    });
    
    // Append all elements
    content.appendChild(masterVolume);
    content.appendChild(musicVolume);
    content.appendChild(sfxVolume);
    content.appendChild(categoryVolumes);
    
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'audio-controls-buttons';
    buttonContainer.appendChild(muteButton);
    buttonContainer.appendChild(testButton);
    content.appendChild(buttonContainer);
    
    // Append header and content to container
    this.container.appendChild(header);
    this.container.appendChild(content);
    
    // Add to document
    document.body.appendChild(this.container);
    
    // Add styles
    this.addStyles();
  }
  
  /**
   * Create a volume control slider
   * @param {string} label - Label for the control
   * @param {string} id - Unique ID for the control
   * @param {number} initialValue - Initial volume value (0-1)
   * @returns {HTMLElement} - The volume control element
   */
  createVolumeControl(label, id, initialValue) {
    const control = document.createElement('div');
    control.className = 'audio-volume-control';
    
    const labelElement = document.createElement('label');
    labelElement.htmlFor = `volume-${id}`;
    labelElement.textContent = label;
    
    const sliderContainer = document.createElement('div');
    sliderContainer.className = 'slider-container';
    
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '0';
    slider.max = '100';
    slider.value = Math.round(initialValue * 100);
    slider.id = `volume-${id}`;
    
    const valueDisplay = document.createElement('span');
    valueDisplay.className = 'volume-value';
    valueDisplay.textContent = `${slider.value}%`;
    
    // Add event listener
    slider.addEventListener('input', () => {
      const value = parseInt(slider.value) / 100;
      valueDisplay.textContent = `${slider.value}%`;
      
      // Update volume based on control type
      if (id === 'master') {
        this.soundManager.setMasterVolume(value);
      } else if (id === 'music') {
        this.soundManager.setMusicVolume(value);
      } else if (id === 'sfx') {
        this.soundManager.setSfxVolume(value);
      } else if (id.startsWith('category-')) {
        const category = id.replace('category-', '');
        this.soundManager.setCategoryVolume(category, value);
      }
      
      // Play feedback sound for SFX changes
      if (id === 'sfx' || id.startsWith('category-')) {
        if (parseInt(slider.value) % 20 === 0) {
          this.soundManager.playSound('button_click', { volume: 0.3 });
        }
      }
    });
    
    sliderContainer.appendChild(slider);
    sliderContainer.appendChild(valueDisplay);
    
    control.appendChild(labelElement);
    control.appendChild(sliderContainer);
    
    return control;
  }
  
  /**
   * Format category name for display
   * @param {string} category - Category ID
   * @returns {string} - Formatted name
   */
  formatCategoryName(category) {
    return category.charAt(0).toUpperCase() + category.slice(1);
  }
  
  /**
   * Add CSS styles for the audio controls
   */
  addStyles() {
    // Check if styles already exist
    if (document.getElementById('audio-controls-styles')) {
      return;
    }
    
    const style = document.createElement('style');
    style.id = 'audio-controls-styles';
    style.textContent = `
      .audio-controls {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 350px;
        background-color: rgba(0, 0, 0, 0.85);
        color: white;
        border-radius: 8px;
        padding: 15px;
        font-family: Arial, sans-serif;
        z-index: 1000;
        box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
        border: 1px solid #4a6fa5;
      }
      
      .audio-controls-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid #4a6fa5;
        padding-bottom: 10px;
        margin-bottom: 15px;
      }
      
      .audio-controls-header h3 {
        margin: 0;
        color: #4a9af5;
      }
      
      .audio-controls-close {
        background: none;
        border: none;
        color: #4a9af5;
        font-size: 24px;
        cursor: pointer;
        padding: 0;
        line-height: 1;
      }
      
      .audio-volume-control {
        margin-bottom: 15px;
      }
      
      .audio-volume-control label {
        display: block;
        margin-bottom: 5px;
        font-size: 14px;
      }
      
      .slider-container {
        display: flex;
        align-items: center;
      }
      
      .slider-container input[type="range"] {
        flex: 1;
        height: 5px;
        -webkit-appearance: none;
        background: #2c3e50;
        border-radius: 5px;
        outline: none;
      }
      
      .slider-container input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 15px;
        height: 15px;
        border-radius: 50%;
        background: #4a9af5;
        cursor: pointer;
      }
      
      .volume-value {
        width: 45px;
        text-align: right;
        font-size: 12px;
        margin-left: 10px;
      }
      
      .audio-controls-categories {
        margin-top: 20px;
        padding-top: 10px;
        border-top: 1px solid #4a6fa5;
      }
      
      .audio-controls-categories h4 {
        margin-top: 0;
        margin-bottom: 10px;
        color: #4a9af5;
        font-size: 16px;
      }
      
      .audio-controls-buttons {
        display: flex;
        justify-content: space-between;
        margin-top: 20px;
        padding-top: 15px;
        border-top: 1px solid #4a6fa5;
      }
      
      .audio-controls-buttons button {
        padding: 8px 15px;
        background-color: #4a6fa5;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        transition: background-color 0.2s;
      }
      
      .audio-controls-buttons button:hover {
        background-color: #4a9af5;
      }
      
      .audio-controls-mute {
        background-color: #a55a4a !important;
      }
      
      .audio-controls-mute:hover {
        background-color: #f55a4a !important;
      }
    `;
    
    document.head.appendChild(style);
  }
  
  /**
   * Initialize event listeners
   */
  initEventListeners() {
    // Add keyboard shortcut for audio controls (M key)
    document.addEventListener('keydown', (e) => {
      if (e.key === 'm' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        if (this.isVisible) {
          this.hide();
        } else {
          this.show();
        }
      }
    });
  }
  
  /**
   * Show the audio controls
   */
  show() {
    this.container.style.display = 'block';
    this.isVisible = true;
    
    // Play UI sound
    this.soundManager.playSound('button_click');
    
    // Resume audio context if suspended
    this.soundManager.resumeAudioContext();
  }
  
  /**
   * Hide the audio controls
   */
  hide() {
    this.container.style.display = 'none';
    this.isVisible = false;
    
    // Play UI sound
    this.soundManager.playSound('button_click');
  }
  
  /**
   * Toggle visibility of audio controls
   */
  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }
}
