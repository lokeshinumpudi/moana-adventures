/**
 * SoundManager.js
 * Handles all audio for the game including background music and sound effects.
 * Provides methods for playing, pausing, and controlling volume of audio.
 */

export class SoundManager {
  constructor(game) {
    this.game = game;
    
    // Audio context for Web Audio API
    this.audioContext = null;
    
    // Master volume controls
    this.masterVolume = 1.0;
    this.musicVolume = 0.7;
    this.sfxVolume = 1.0;
    this.isMuted = false;
    
    // Track loaded audio
    this.sounds = new Map();
    this.music = new Map();
    
    // Currently playing sounds and music
    this.currentSounds = [];
    this.currentMusic = null;
    
    // Sound categories for different environments
    this.categories = {
      ambient: {
        volume: 0.5,
        sounds: []
      },
      ship: {
        volume: 0.8,
        sounds: []
      },
      combat: {
        volume: 0.9,
        sounds: []
      },
      ui: {
        volume: 0.6,
        sounds: []
      },
      weather: {
        volume: 0.7,
        sounds: []
      }
    };
    
    // Initialize audio system
    this.init();
    
    // Bind to window events
    this.setupEventListeners();
  }
  
  /**
   * Initialize the audio system
   */
  init() {
    try {
      // Create audio context
      window.AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioContext();
      
      console.log('AudioContext state:', this.audioContext.state);
      
      // Create master gain node
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = this.masterVolume;
      this.masterGain.connect(this.audioContext.destination);
      
      // Create separate gain nodes for music and SFX
      this.musicGain = this.audioContext.createGain();
      this.musicGain.gain.value = this.musicVolume;
      this.musicGain.connect(this.masterGain);
      
      this.sfxGain = this.audioContext.createGain();
      this.sfxGain.gain.value = this.sfxVolume;
      this.sfxGain.connect(this.masterGain);
      
      console.log('Sound system initialized successfully');
      
      // Auto-resume AudioContext for browsers with strict autoplay policy
      if (this.audioContext.state === 'suspended') {
        console.log('Audio context is suspended, trying to resume...');
        const resumeAudio = () => {
          this.audioContext.resume().then(() => {
            console.log('AudioContext resumed successfully');
            document.removeEventListener('click', resumeAudio);
            document.removeEventListener('keydown', resumeAudio);
          }).catch(err => {
            console.error('Failed to resume audio context:', err);
          });
        };
        
        // Add event listeners to resume on user interaction
        document.addEventListener('click', resumeAudio);
        document.addEventListener('keydown', resumeAudio);
      }
      
      // Preload essential sounds
      this.preloadSounds();
      
    } catch (e) {
      console.error('Failed to initialize audio system:', e);
    }
  }
  
  /**
   * Set up event listeners for window focus/blur
   */
  setupEventListeners() {
    // Pause audio when window loses focus
    window.addEventListener('blur', () => {
      if (this.currentMusic && !this.game.debugMode) {
        this.fadeOutMusic(0.5);
      }
    });
    
    // Resume audio when window gains focus
    window.addEventListener('focus', () => {
      if (this.currentMusic && !this.isMuted && !this.game.debugMode) {
        this.fadeInMusic(1.0);
      }
    });
    
    // Handle visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && !this.game.debugMode) {
        this.fadeOutMusic(0.5);
      } else if (!this.isMuted && !this.game.debugMode) {
        this.fadeInMusic(1.0);
      }
    });
  }
  
  /**
   * Preload essential game sounds
   */
  preloadSounds() {
    // Background music
    this.loadMusic('main_theme', '/audio/music/main_theme.mp3');
    this.loadMusic('battle', '/audio/music/battle.mp3');
    this.loadMusic('victory', '/audio/music/victory.mp3');
    this.loadMusic('defeat', '/audio/music/defeat.mp3');
    this.loadMusic('exploration', '/audio/music/exploration.mp3');
    
    // Ambient sounds - Using the new audio files
    this.loadSound('ocean_waves', '/audio/sfx/mixkit-sea-waves-loop-1196.wav', 'ambient', true);
    this.loadSound('wind', '/audio/sfx/wind.mp3', 'ambient', true);
    
    // Ship sounds - Using the new audio file
    this.loadSound('ship_creak', '/audio/sfx/mixkit-wooden-ship-on-the-sea-1187.wav', 'ship', true);
    this.loadSound('sail_flap', '/audio/sfx/sail_flap.mp3', 'ship');
    this.loadSound('paddle', '/audio/sfx/paddle.mp3', 'ship');
    
    // Combat sounds - Using the new audio files
    this.loadSound('cannon_fire', '/audio/sfx/cannon-fire.mp3', 'combat');
    this.loadSound('cannon_load', '/audio/sfx/cannon-load.mp3', 'combat');
    this.loadSound('cannon_impact', '/audio/sfx/cannon_impact.mp3', 'combat');
    this.loadSound('machine_gun', '/audio/sfx/machine_gun.mp3', 'combat');
    this.loadSound('explosion', '/audio/sfx/explosion.mp3', 'combat');
    this.loadSound('splash', '/audio/sfx/splash.mp3', 'combat');
    
    // UI sounds
    this.loadSound('button_click', '/audio/sfx/button_click.mp3', 'ui');
    this.loadSound('notification', '/audio/sfx/notification.mp3', 'ui');
    this.loadSound('powerup', '/audio/sfx/powerup.mp3', 'ui');
    
    // Weather sounds
    this.loadSound('thunder', '/audio/sfx/thunder.mp3', 'weather');
    this.loadSound('rain', '/audio/sfx/rain.mp3', 'weather', true);
    this.loadSound('storm', '/audio/sfx/storm.mp3', 'weather', true);
  }
  
  /**
   * Load a sound effect
   * @param {string} id - Unique identifier for the sound
   * @param {string} path - Path to the sound file
   * @param {string} category - Category the sound belongs to
   * @param {boolean} loop - Whether the sound should loop
   */
  loadSound(id, path, category = 'ui', loop = false) {
    console.log(`Loading sound: ${id} from ${path}`);
    fetch(path)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to load sound: ${path} (${response.status} ${response.statusText})`);
        }
        console.log(`Sound ${id} fetched successfully, getting array buffer...`);
        return response.arrayBuffer();
      })
      .then(arrayBuffer => {
        console.log(`Decoding sound ${id} (${arrayBuffer.byteLength} bytes)...`);
        return this.audioContext.decodeAudioData(arrayBuffer);
      })
      .then(audioBuffer => {
        this.sounds.set(id, {
          buffer: audioBuffer,
          category: category,
          loop: loop
        });
        
        // Add to category
        if (this.categories[category]) {
          this.categories[category].sounds.push(id);
        }
        
        console.log(`Sound loaded successfully: ${id} (duration: ${audioBuffer.duration.toFixed(2)}s)`);
      })
      .catch(error => {
        console.error(`Error loading sound ${id} from ${path}:`, error);
      });
  }
  
  /**
   * Load background music
   * @param {string} id - Unique identifier for the music
   * @param {string} path - Path to the music file
   */
  loadMusic(id, path) {
    fetch(path)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to load music: ${path}`);
        }
        return response.arrayBuffer();
      })
      .then(arrayBuffer => this.audioContext.decodeAudioData(arrayBuffer))
      .then(audioBuffer => {
        this.music.set(id, {
          buffer: audioBuffer,
          source: null
        });
        console.log(`Music loaded: ${id}`);
      })
      .catch(error => {
        console.warn(`Error loading music ${id}:`, error);
      });
  }
  
  /**
   * Play a sound effect
   * @param {string} id - ID of the sound to play
   * @param {Object} options - Options for playing the sound
   * @param {number} options.volume - Volume multiplier (0-1)
   * @param {number} options.pitch - Pitch multiplier (0.5-2)
   * @param {boolean} options.loop - Override loop setting
   * @param {function} options.onEnd - Callback when sound ends
   * @returns {Object} - Sound object with control methods
   */
  playSound(id, options = {}) {
    if (this.isMuted) return null;
    
    const sound = this.sounds.get(id);
    if (!sound) {
      console.warn(`Sound not found: ${id}`);
      return null;
    }
    
    // Create source node
    const source = this.audioContext.createBufferSource();
    source.buffer = sound.buffer;
    source.loop = options.loop !== undefined ? options.loop : sound.loop;
    
    // Apply pitch if specified
    if (options.pitch) {
      source.playbackRate.value = options.pitch;
    }
    
    // Create gain node for this sound
    const gainNode = this.audioContext.createGain();
    
    // Calculate volume based on category and options
    const categoryVolume = this.categories[sound.category]?.volume || 1.0;
    const finalVolume = this.sfxVolume * categoryVolume * (options.volume || 1.0);
    gainNode.gain.value = finalVolume;
    
    // Connect nodes
    source.connect(gainNode);
    gainNode.connect(this.sfxGain);
    
    // Start playback
    source.start(0);
    
    // Set up end event
    source.onended = () => {
      // Remove from current sounds
      const index = this.currentSounds.findIndex(s => s.id === id && s.source === source);
      if (index !== -1) {
        this.currentSounds.splice(index, 1);
      }
      
      // Call onEnd callback if provided
      if (options.onEnd) {
        options.onEnd();
      }
    };
    
    // Create sound control object
    const soundControl = {
      id,
      source,
      gainNode,
      stop: () => {
        try {
          source.stop();
        } catch (e) {
          console.warn(`Error stopping sound ${id}:`, e);
        }
      },
      setVolume: (volume) => {
        gainNode.gain.value = volume * categoryVolume * this.sfxVolume;
      },
      getVolume: () => {
        return gainNode.gain.value / (categoryVolume * this.sfxVolume);
      },
      setPitch: (pitch) => {
        source.playbackRate.value = pitch;
      }
    };
    
    // Add to current sounds
    this.currentSounds.push(soundControl);
    
    return soundControl;
  }
  
  /**
   * Play background music
   * @param {string} id - ID of the music to play
   * @param {Object} options - Options for playing the music
   * @param {number} options.volume - Volume multiplier (0-1)
   * @param {number} options.fadeIn - Fade in duration in seconds
   * @param {boolean} options.loop - Whether to loop the music (default: true)
   */
  playMusic(id, options = {}) {
    if (this.isMuted) return;
    
    const musicData = this.music.get(id);
    if (!musicData) {
      console.warn(`Music not found: ${id}`);
      return;
    }
    
    // Stop current music if playing
    if (this.currentMusic) {
      this.stopMusic(options.fadeOut);
    }
    
    // Create source node
    const source = this.audioContext.createBufferSource();
    source.buffer = musicData.buffer;
    source.loop = options.loop !== undefined ? options.loop : true;
    
    // Create gain node for this music
    const gainNode = this.audioContext.createGain();
    
    // Set initial volume (0 if fading in)
    const targetVolume = (options.volume || 1.0) * this.musicVolume;
    if (options.fadeIn) {
      gainNode.gain.value = 0;
    } else {
      gainNode.gain.value = targetVolume;
    }
    
    // Connect nodes
    source.connect(gainNode);
    gainNode.connect(this.musicGain);
    
    // Start playback
    source.start(0);
    
    // Fade in if requested
    if (options.fadeIn) {
      const startTime = this.audioContext.currentTime;
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(targetVolume, startTime + options.fadeIn);
    }
    
    // Update current music
    this.currentMusic = {
      id,
      source,
      gainNode,
      volume: targetVolume
    };
    
    console.log(`Playing music: ${id}`);
  }
  
  /**
   * Stop the currently playing music
   * @param {number} fadeOut - Fade out duration in seconds
   */
  stopMusic(fadeOut = 0) {
    if (!this.currentMusic) return;
    
    const { source, gainNode } = this.currentMusic;
    
    if (fadeOut && fadeOut > 0) {
      // Fade out
      const startTime = this.audioContext.currentTime;
      const currentVolume = gainNode.gain.value;
      gainNode.gain.setValueAtTime(currentVolume, startTime);
      gainNode.gain.linearRampToValueAtTime(0, startTime + fadeOut);
      
      // Stop after fade out
      setTimeout(() => {
        try {
          source.stop();
        } catch (e) {
          // Ignore errors if already stopped
        }
      }, fadeOut * 1000);
    } else {
      // Stop immediately
      try {
        source.stop();
      } catch (e) {
        // Ignore errors if already stopped
      }
    }
    
    this.currentMusic = null;
  }
  
  /**
   * Fade out the current music
   * @param {number} targetVolume - Target volume level (0-1)
   * @param {number} duration - Fade duration in seconds
   */
  fadeOutMusic(targetVolume = 0, duration = 1.0) {
    if (!this.currentMusic) return;
    
    const { gainNode } = this.currentMusic;
    const startTime = this.audioContext.currentTime;
    const currentVolume = gainNode.gain.value;
    
    gainNode.gain.setValueAtTime(currentVolume, startTime);
    gainNode.gain.linearRampToValueAtTime(
      targetVolume * this.musicVolume, 
      startTime + duration
    );
  }
  
  /**
   * Fade in the current music
   * @param {number} targetVolume - Target volume level (0-1)
   * @param {number} duration - Fade duration in seconds
   */
  fadeInMusic(targetVolume = 1.0, duration = 1.0) {
    if (!this.currentMusic) return;
    
    const { gainNode } = this.currentMusic;
    const startTime = this.audioContext.currentTime;
    const currentVolume = gainNode.gain.value;
    
    gainNode.gain.setValueAtTime(currentVolume, startTime);
    gainNode.gain.linearRampToValueAtTime(
      targetVolume * this.musicVolume, 
      startTime + duration
    );
  }
  
  /**
   * Play a random sound from a category
   * @param {string} category - Category to play from
   * @param {Object} options - Sound options
   */
  playRandomFromCategory(category, options = {}) {
    if (!this.categories[category] || this.categories[category].sounds.length === 0) {
      return null;
    }
    
    const sounds = this.categories[category].sounds;
    const randomIndex = Math.floor(Math.random() * sounds.length);
    const soundId = sounds[randomIndex];
    
    return this.playSound(soundId, options);
  }
  
  /**
   * Set master volume
   * @param {number} volume - Volume level (0-1)
   */
  setMasterVolume(volume) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    this.masterGain.gain.value = this.masterVolume;
  }
  
  /**
   * Set music volume
   * @param {number} volume - Volume level (0-1)
   */
  setMusicVolume(volume) {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    this.musicGain.gain.value = this.musicVolume;
    
    // Update current music if playing
    if (this.currentMusic) {
      this.currentMusic.volume = this.musicVolume;
    }
  }
  
  /**
   * Set SFX volume
   * @param {number} volume - Volume level (0-1)
   */
  setSfxVolume(volume) {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
    this.sfxGain.gain.value = this.sfxVolume;
  }
  
  /**
   * Set category volume
   * @param {string} category - Category name
   * @param {number} volume - Volume level (0-1)
   */
  setCategoryVolume(category, volume) {
    if (this.categories[category]) {
      this.categories[category].volume = Math.max(0, Math.min(1, volume));
    }
  }
  
  /**
   * Mute all audio
   */
  mute() {
    this.isMuted = true;
    this.masterGain.gain.value = 0;
  }
  
  /**
   * Unmute all audio
   */
  unmute() {
    this.isMuted = false;
    this.masterGain.gain.value = this.masterVolume;
  }
  
  /**
   * Toggle mute state
   * @returns {boolean} - New mute state
   */
  toggleMute() {
    if (this.isMuted) {
      this.unmute();
    } else {
      this.mute();
    }
    return this.isMuted;
  }
  
  /**
   * Resume the audio context if it was suspended
   * This is necessary due to browser autoplay policy
   */
  resumeAudioContext() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      console.log('Attempting to resume suspended AudioContext...');
      this.audioContext.resume().then(() => {
        console.log('AudioContext resumed successfully');
        // Try to play a test sound
        this.playSound('button_click', { volume: 0.3 });
      }).catch(error => {
        console.error('Failed to resume AudioContext:', error);
      });
    } else {
      console.log('AudioContext state is:', this.audioContext ? this.audioContext.state : 'null');
    }
  }
  
  /**
   * Stop all sounds
   */
  stopAllSounds() {
    this.currentSounds.forEach(sound => {
      try {
        sound.source.stop();
      } catch (e) {
        // Ignore errors if already stopped
      }
    });
    this.currentSounds = [];
  }
  
  /**
   * Stop a specific sound by id
   * @param {string} id - Sound ID to stop
   */
  stopSound(id) {
    const index = this.currentSounds.findIndex(sound => sound.id === id);
    if (index !== -1) {
      try {
        this.currentSounds[index].source.stop();
      } catch (e) {
        console.warn(`Error stopping sound ${id}:`, e);
      }
      this.currentSounds.splice(index, 1);
      console.log(`Sound stopped: ${id}`);
    }
  }
  
  /**
   * Play a sound effect based on an event in the game
   * @param {string} event - Game event
   * @param {Object} options - Sound options
   */
  playEventSound(event, options = {}) {
    switch (event) {
      case 'cannon_fire':
        return this.playSound('cannon_fire', { volume: 0.8, ...options });
      case 'cannon_load':
        return this.playSound('cannon_load', { volume: 0.6, ...options });
      case 'machine_gun_fire':
        return this.playSound('machine_gun', options);
      case 'hit':
      case 'impact':
        return this.playSound('cannon_impact', options);
      case 'splash':
        return this.playSound('splash', options);
      case 'explosion':
        return this.playSound('explosion', options);
      case 'powerup':
        return this.playSound('powerup', options);
      case 'notification':
        return this.playSound('notification', options);
      case 'button_click':
        return this.playSound('button_click', options);
      case 'ship_movement':
        return this.playSound('ship_creak', options);
      case 'sail':
        return this.playSound('sail_flap', options);
      case 'paddle':
        return this.playSound('paddle', options);
      case 'thunder':
        return this.playSound('thunder', options);
      default:
        console.warn(`No sound defined for event: ${event}`);
        return null;
    }
  }
  
  /**
   * Update the sound system
   * @param {number} delta - Time delta
   */
  update(delta) {
    // PRIORITY: Always ensure ocean ambient sound is playing - this is our idle state sound
    const oceanSoundControl = this.currentSounds.find(s => s.id === 'ocean_waves');
    if (!oceanSoundControl) {
      console.log('Ocean sound not found - starting ocean ambient sound');
      this.playSound('ocean_waves', { volume: 0.8, loop: true });
    } else {
      // Make sure ocean sound is not accidentally stopped or muted
      if (oceanSoundControl.getVolume() < 0.1) {
        console.log('Ocean sound volume too low - adjusting');
        oceanSoundControl.setVolume(0.8);
      }
    }
    
    // Handle dynamic sounds based on game state
    if (this.game.ship) {
      // Track if we have an active ship_creak sound
      const shipSoundControl = this.currentSounds.find(s => s.id === 'ship_creak');
      
      // Check ship movement speed
      if (this.game.ship.speed > 0.3) {
        // Start or continue ship creaking sound when moving
        if (!shipSoundControl) {
          // Ship is moving but no ship sound is playing, so start it
          console.log('Ship started moving - playing ship sound');
          this.playSound('ship_creak', { 
            volume: Math.min(0.8, this.game.ship.speed / 4 + 0.2), 
            loop: true 
          });
        } else {
          // Ship sound is already playing, adjust volume based on speed
          shipSoundControl.setVolume(Math.min(0.8, this.game.ship.speed / 4 + 0.2));
        }
        
        // Reduce ocean volume slightly when ship is moving
        if (oceanSoundControl) {
          oceanSoundControl.setVolume(0.4);
        }
      } else {
        // Ship is idle, stop the ship sound if it's playing
        if (shipSoundControl) {
          console.log('Ship stopped moving - stopping ship sound');
          this.stopSound('ship_creak');
        }
        
        // Increase ocean volume during idle state for more soothing effect
        if (oceanSoundControl) {
          oceanSoundControl.setVolume(0.8);
        }
      }
      
      // Play sail flapping based on wind and sail angle
      if (this.game.ship.speed > 1.0 && Math.random() < 0.02) {
        this.playSound('sail_flap', { volume: Math.min(1.0, this.game.ship.speed / 4) });
      }
    }
    
    // Handle weather sounds
    if (this.game.weather) {
      // Play thunder during storms
      if (this.game.weather.isStorm && Math.random() < 0.005) {
        this.playSound('thunder', { 
          volume: 0.7 + Math.random() * 0.3,
          pitch: 0.8 + Math.random() * 0.4
        });
      }
    }
  }
  
  /**
   * Resume audio context if suspended
   * Called when user interacts with the page
   */
  resumeAudioContext() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume().then(() => {
        console.log('AudioContext resumed');
      });
    }
  }
}
