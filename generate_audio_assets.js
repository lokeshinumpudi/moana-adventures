/**
 * Audio Asset Generator for Moana's Wake
 * This script generates placeholder audio files using the Web Audio API
 * Run with: node generate_audio_assets.js
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Create directories if they don't exist
const musicDir = path.resolve(__dirname, 'client/public/audio/music');
const sfxDir = path.resolve(__dirname, 'client/public/audio/sfx');

if (!fs.existsSync(musicDir)) {
  fs.mkdirSync(musicDir, { recursive: true });
}

if (!fs.existsSync(sfxDir)) {
  fs.mkdirSync(sfxDir, { recursive: true });
}

// List of audio files we need
const musicFiles = [
  'main_theme',
  'battle',
  'victory',
  'defeat',
  'exploration'
];

const sfxFiles = [
  'ocean_waves',
  'wind', 
  'ship_creak',
  'sail_flap',
  'paddle',
  'cannon_fire',
  'cannon_impact',
  'machine_gun',
  'explosion',
  'splash',
  'button_click',
  'notification',
  'powerup',
  'thunder',
  'rain',
  'storm'
];

// URLs to download audio from GitHub repositories with royalty-free sounds
const soundUrls = {
  // Music files (polynesian/tropical themed)
  'main_theme': 'https://github.com/freeCodeCamp/cdn/raw/main/build/testable-projects-fcc/audio/BeepSound.wav',
  'battle': 'https://github.com/anars/blank-audio/raw/master/1-second-of-silence.mp3',
  'victory': 'https://github.com/anars/blank-audio/raw/master/1-second-of-silence.mp3',
  'defeat': 'https://github.com/anars/blank-audio/raw/master/1-second-of-silence.mp3',
  'exploration': 'https://github.com/anars/blank-audio/raw/master/1-second-of-silence.mp3',
  
  // Sound effects
  'ocean_waves': 'https://github.com/anars/blank-audio/raw/master/1-second-of-silence.mp3',
  'wind': 'https://github.com/anars/blank-audio/raw/master/1-second-of-silence.mp3',
  'ship_creak': 'https://github.com/anars/blank-audio/raw/master/1-second-of-silence.mp3',
  'sail_flap': 'https://github.com/anars/blank-audio/raw/master/1-second-of-silence.mp3',
  'paddle': 'https://github.com/anars/blank-audio/raw/master/1-second-of-silence.mp3',
  'cannon_fire': 'https://github.com/anars/blank-audio/raw/master/1-second-of-silence.mp3',
  'cannon_impact': 'https://github.com/anars/blank-audio/raw/master/1-second-of-silence.mp3',
  'machine_gun': 'https://github.com/anars/blank-audio/raw/master/1-second-of-silence.mp3',
  'explosion': 'https://github.com/anars/blank-audio/raw/master/1-second-of-silence.mp3',
  'splash': 'https://github.com/anars/blank-audio/raw/master/1-second-of-silence.mp3',
  'button_click': 'https://github.com/anars/blank-audio/raw/master/1-second-of-silence.mp3',
  'notification': 'https://github.com/anars/blank-audio/raw/master/1-second-of-silence.mp3',
  'powerup': 'https://github.com/anars/blank-audio/raw/master/1-second-of-silence.mp3',
  'thunder': 'https://github.com/anars/blank-audio/raw/master/1-second-of-silence.mp3',
  'rain': 'https://github.com/anars/blank-audio/raw/master/1-second-of-silence.mp3',
  'storm': 'https://github.com/anars/blank-audio/raw/master/1-second-of-silence.mp3',
};

// HTML template for audio generation
const generateHtml = (filename, type) => {
  let freq, duration;
  
  // Different sound profiles based on type
  switch(filename) {
    case 'main_theme':
      freq = 440; // A4 note
      duration = 15;
      break;
    case 'battle':
      freq = 392; // G4 note
      duration = 10;
      break;
    case 'victory':
      freq = 523.25; // C5 note
      duration = 5;
      break;
    case 'defeat':
      freq = 293.66; // D4 note
      duration = 8;
      break; 
    case 'exploration':
      freq = 329.63; // E4 note
      duration = 20;
      break;
    case 'ocean_waves':
      freq = 100;
      duration = 10;
      break;
    case 'wind':
      freq = 200;
      duration = 10;
      break;
    case 'cannon_fire':
      freq = 80;
      duration = 2;
      break;
    case 'explosion':
      freq = 60;
      duration = 3;
      break;
    case 'thunder':
      freq = 40;
      duration = 5;
      break;
    default:
      freq = 300;
      duration = 2;
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <title>Generate ${filename}</title>
  <script>
    function generateTone() {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.type = '${type === 'music' ? 'sine' : 'sawtooth'}';
      oscillator.frequency.value = ${freq}; 
      gainNode.gain.value = 0.5;
      
      const startTime = audioCtx.currentTime;
      oscillator.start();
      
      // Create fade in/out
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.5, startTime + 0.1);
      gainNode.gain.linearRampToValueAtTime(0, startTime + ${duration});
      
      // Stop after duration
      oscillator.stop(startTime + ${duration});
      
      // Record the audio
      const dest = audioCtx.createMediaStreamDestination();
      const mediaRecorder = new MediaRecorder(dest.stream);
      oscillator.connect(dest);
      
      const chunks = [];
      mediaRecorder.ondataavailable = (evt) => {
        chunks.push(evt.data);
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/mp3' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = '${filename}.mp3';
        a.click();
        
        document.getElementById('status').textContent = 'Done! You can close this window.';
      };
      
      mediaRecorder.start();
      setTimeout(() => {
        mediaRecorder.stop();
      }, ${duration} * 1000);
    }
  </script>
</head>
<body onload="generateTone()">
  <h1>Generating ${filename}.mp3</h1>
  <p id="status">Please wait...</p>
</body>
</html>
`;
};

// Function to download from a URL
const downloadFile = (url, outputPath) => {
  return new Promise((resolve, reject) => {
    const command = `curl -L "${url}" -o "${outputPath}"`;
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve(stdout);
      }
    });
  });
};

// Process music files
async function processAudioFiles() {
  console.log("Downloading audio asset placeholder files...");
  
  // Download main_theme as a beep sound
  try {
    await downloadFile(
      'https://github.com/freeCodeCamp/cdn/raw/main/build/testable-projects-fcc/audio/BeepSound.wav', 
      path.join(musicDir, 'main_theme.mp3')
    );
    console.log("✅ Downloaded main_theme placeholder");
  } catch (err) {
    console.error("Failed to download main_theme:", err);
  }

  // Helper function to create a silent audio file
  const createSilentAudio = (outputPath) => {
    return new Promise((resolve, reject) => {
      const command = `ffmpeg -f lavfi -i anullsrc=r=44100:cl=mono -t 2 -q:a 9 -acodec libmp3lame "${outputPath}" -y`;
      exec(command, (error) => {
        if (error) {
          // If ffmpeg fails, try downloading a silent MP3
          downloadFile(
            'https://github.com/anars/blank-audio/raw/master/1-second-of-silence.mp3',
            outputPath
          ).then(resolve).catch(reject);
        } else {
          resolve();
        }
      });
    });
  };

  // Create silent audio for remaining files
  for (const file of [...musicFiles.slice(1), ...sfxFiles]) {
    const outputDir = file === 'battle' || file === 'victory' || file === 'defeat' || file === 'exploration' 
      ? musicDir 
      : sfxDir;
    const outputPath = path.join(outputDir, `${file}.mp3`);
    
    try {
      await createSilentAudio(outputPath);
      console.log(`✅ Created placeholder for ${file}`);
    } catch (err) {
      console.error(`Failed to create placeholder for ${file}:`, err);
    }
  }

  console.log("\nAll audio placeholders created!");
  console.log("\nImportant: These are just placeholder sounds. For your final game, you should replace these with:");
  console.log("1. Free sounds from sites like Pixabay, Freesound, or Free Music Archive");
  console.log("2. Licensed audio packs from Unity Asset Store, GameDev Market, or itch.io");
  console.log("3. Custom created sounds using tools like Audacity or LMMS");
}

// Execute the function
processAudioFiles().catch(console.error);
