import './style.css'
import { Game } from './js/Game.js'
import { SocketManager } from './js/SocketManager.js'

document.addEventListener('DOMContentLoaded', () => {
  // Initialize the game
  const game = new Game()
  
  // Initialize socket connection
  const socketManager = new SocketManager(game)
  
  // Start loading assets
  game.init().then(() => {
    // Hide loading screen when everything is loaded
    document.getElementById('loading-screen').classList.add('hidden')
    
    // Start game loop
    game.start()
  }).catch(error => {
    console.error('Error initializing game:', error)
  })
  
  // Add event listener for restart button
  document.getElementById('restart-button').addEventListener('click', () => {
    document.getElementById('restart-container').classList.add('hidden')
    game.restart()
  })
})
