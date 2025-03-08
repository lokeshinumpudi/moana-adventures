import './style.css'
import { Game } from './js/game.js'
import { SocketManager } from './js/SocketManager.js'

document.addEventListener('DOMContentLoaded', async () => {
  // Create container for the game
  const container = document.querySelector('#game-container')
  
  // Get the existing loading screen from HTML
  const loadingScreen = document.querySelector('#loading-screen')
  
  // Initialize the game
  const game = new Game(container)
  
  // Start loading assets
  game.init().then(() => {
    // Completely remove loading screen when everything is loaded
    if (loadingScreen && loadingScreen.parentNode) {
      loadingScreen.parentNode.removeChild(loadingScreen);
    }
    
    // Also check for manually created loading screens
    const manualLoadingScreens = document.querySelectorAll('div[id="loading-screen"]');
    manualLoadingScreens.forEach(screen => screen.remove());
    
    // Start game loop
    game.start()
  }).catch(error => {
    console.error('Error initializing game:', error)
    if (loadingScreen) {
      loadingScreen.innerHTML = 'Error loading game: ' + error.message
    }
  })
  
  // Add event listener for restart button
  const restartButton = document.getElementById('restart-button');
  if (restartButton) {
    restartButton.addEventListener('click', () => {
      document.getElementById('restart-container').classList.add('hidden')
      game.restart()
    })
  }
  
  // Add event listener for return-to-ship button
  const returnToShipBtn = document.getElementById('return-to-ship-btn');
  if (returnToShipBtn) {
    returnToShipBtn.addEventListener('click', () => {
      if (game.returnToShip) {
        game.returnToShip();
      }
    });
  }
})
