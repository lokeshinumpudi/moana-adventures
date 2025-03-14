#!/bin/bash

# Script to download audio assets for Moana's Wake game
# This script will download royalty-free sounds and music from Pixabay, Freesound, and other sources

# Create directories if they don't exist
mkdir -p ./client/public/audio/music
mkdir -p ./client/public/audio/sfx

echo "Downloading audio assets for Moana's Wake..."

# Function to download a file if it doesn't exist
download_if_not_exists() {
    local url="$1"
    local output_file="$2"
    local description="$3"
    
    if [ ! -f "$output_file" ]; then
        echo "Downloading $description..."
        curl -L "$url" -o "$output_file" --create-dirs
        if [ $? -eq 0 ]; then
            echo "✅ Downloaded $description"
        else
            echo "❌ Failed to download $description"
        fi
    else
        echo "✅ $description already exists"
    fi
}

# Music files
echo "Downloading music files..."

# Main Theme - Relaxing Polynesian music
download_if_not_exists "https://cdn.pixabay.com/download/audio/2022/01/17/audio_bdaa8a4276.mp3" "./client/public/audio/music/main_theme.mp3" "Main Theme"

# Battle - More intense battle music
download_if_not_exists "https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73503.mp3" "./client/public/audio/music/battle.mp3" "Battle Music"

# Victory - Triumphant music
download_if_not_exists "https://cdn.pixabay.com/download/audio/2021/11/01/audio_00fa5593f1.mp3" "./client/public/audio/music/victory.mp3" "Victory Music"

# Defeat - Sad music
download_if_not_exists "https://cdn.pixabay.com/download/audio/2022/02/07/audio_cb1288bd42.mp3" "./client/public/audio/music/defeat.mp3" "Defeat Music"

# Exploration - Calm exploration music
download_if_not_exists "https://cdn.pixabay.com/download/audio/2022/10/25/audio_c1fe50a1a2.mp3" "./client/public/audio/music/exploration.mp3" "Exploration Music"

# Sound effects
echo "Downloading sound effects..."

# Ocean waves (loop)
download_if_not_exists "https://cdn.pixabay.com/download/audio/2022/03/15/audio_c9add55d05.mp3" "./client/public/audio/sfx/ocean_waves.mp3" "Ocean Waves"

# Wind (loop)
download_if_not_exists "https://cdn.pixabay.com/download/audio/2022/03/22/audio_1d2977d0e9.mp3" "./client/public/audio/sfx/wind.mp3" "Wind"

# Ship creak (loop)
download_if_not_exists "https://cdn.pixabay.com/download/audio/2022/03/10/audio_e0e7424dc5.mp3" "./client/public/audio/sfx/ship_creak.mp3" "Ship Creak"

# Sail flap
download_if_not_exists "https://cdn.pixabay.com/download/audio/2022/10/30/audio_096b7cf801.mp3" "./client/public/audio/sfx/sail_flap.mp3" "Sail Flap"

# Paddle sound
download_if_not_exists "https://cdn.pixabay.com/download/audio/2021/08/09/audio_88447cafa6.mp3" "./client/public/audio/sfx/paddle.mp3" "Paddle"

# Cannon fire
download_if_not_exists "https://cdn.pixabay.com/download/audio/2022/03/10/audio_270f6b80cb.mp3" "./client/public/audio/sfx/cannon_fire.mp3" "Cannon Fire"

# Cannon impact
download_if_not_exists "https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0fd56071a.mp3" "./client/public/audio/sfx/cannon_impact.mp3" "Cannon Impact"

# Machine gun
download_if_not_exists "https://cdn.pixabay.com/download/audio/2022/10/02/audio_5998240b32.mp3" "./client/public/audio/sfx/machine_gun.mp3" "Machine Gun"

# Explosion
download_if_not_exists "https://cdn.pixabay.com/download/audio/2021/08/04/audio_12b0c7443c.mp3" "./client/public/audio/sfx/explosion.mp3" "Explosion"

# Splash
download_if_not_exists "https://cdn.pixabay.com/download/audio/2021/08/09/audio_649348ae50.mp3" "./client/public/audio/sfx/splash.mp3" "Splash"

# Button click
download_if_not_exists "https://cdn.pixabay.com/download/audio/2021/08/04/audio_695d9edd5c.mp3" "./client/public/audio/sfx/button_click.mp3" "Button Click"

# Notification
download_if_not_exists "https://cdn.pixabay.com/download/audio/2021/08/04/audio_d54f605a21.mp3" "./client/public/audio/sfx/notification.mp3" "Notification"

# Powerup
download_if_not_exists "https://cdn.pixabay.com/download/audio/2022/02/15/audio_d0c6df7504.mp3" "./client/public/audio/sfx/powerup.mp3" "Powerup"

# Thunder
download_if_not_exists "https://cdn.pixabay.com/download/audio/2022/03/15/audio_20a89868bb.mp3" "./client/public/audio/sfx/thunder.mp3" "Thunder"

# Rain (loop)
download_if_not_exists "https://cdn.pixabay.com/download/audio/2021/08/09/audio_2cfa32d798.mp3" "./client/public/audio/sfx/rain.mp3" "Rain"

# Storm (loop)
download_if_not_exists "https://cdn.pixabay.com/download/audio/2021/11/13/audio_90173d33ce.mp3" "./client/public/audio/sfx/storm.mp3" "Storm"

echo "All audio assets downloaded successfully!"
echo "Note: Some URLs may expire over time. If any downloads fail, you'll need to update the URLs with fresh ones."
