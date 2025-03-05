import './style.css'
import { Game } from './js/game.js'
import { SocketManager } from './js/SocketManager.js'

document.addEventListener('DOMContentLoaded', async () => {
  // Create container for the game
  const container = document.querySelector('#game-container')
  
  // Create loading screen
  const loadingScreen = document.createElement('div')
  loadingScreen.id = 'loading-screen'
  loadingScreen.innerHTML = 'Loading...'
  loadingScreen.style.position = 'fixed'
  loadingScreen.style.top = '50%'
  loadingScreen.style.left = '50%'
  loadingScreen.style.transform = 'translate(-50%, -50%)'
  loadingScreen.style.fontSize = '24px'
  loadingScreen.style.color = 'white'
  document.body.appendChild(loadingScreen)
  
  // Load HUD HTML dynamically
  try {
    const response = await fetch('/src/ui/hud.html');
    const hudHtml = await response.text();
    container.innerHTML = hudHtml;
  } catch (error) {
    console.error('Error loading HUD HTML:', error);
  }
  
  // Initialize the game
  const game = new Game(container)
  
  // Start loading assets
  game.init().then(() => {
    // Hide loading screen when everything is loaded
    loadingScreen.style.display = 'none'
    
    // Start game loop
    game.start()
  }).catch(error => {
    console.error('Error initializing game:', error)
    loadingScreen.innerHTML = 'Error loading game: ' + error.message
  })
  
  // Add event listener for restart button
  const restartButton = document.getElementById('restart-button');
  if (restartButton) {
    restartButton.addEventListener('click', () => {
      document.getElementById('restart-container').classList.add('hidden')
      game.restart()
    })
  }
})
