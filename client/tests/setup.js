// Mock browser globals
global.requestAnimationFrame = (callback) => setTimeout(callback, 0);
global.cancelAnimationFrame = jest.fn();

// Mock DOM elements that might not exist in jsdom
document.body.innerHTML = `
  <div id="game-container"></div>
  <div id="ui-layer">
    <div class="stats-container">
      <div class="score-display"></div>
      <div class="health-bar-container">
        <div class="health-bar-fill"></div>
        <div class="health-bar-text"></div>
      </div>
      <div class="kills-display"></div>
      <div class="online-count"></div>
    </div>
    <div class="powerups-container"></div>
    <div id="mini-map-container">
      <div id="blips-container"></div>
    </div>
    <div class="notification-container"></div>
  </div>
`;

// Mock window methods
window.innerWidth = 1024;
window.innerHeight = 768;

// Mock Audio
global.Audio = class {
  constructor() {
    this.play = jest.fn();
    this.pause = jest.fn();
    this.volume = 1;
    this.loop = false;
  }
};

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn(key => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn(key => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    })
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
}); 