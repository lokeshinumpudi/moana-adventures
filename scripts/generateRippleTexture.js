const fs = require('fs');
const { createCanvas } = require('canvas');

// Create a canvas
const size = 64;
const canvas = createCanvas(size, size);
const ctx = canvas.getContext('2d');

// Create a radial gradient for the ripple
const gradient = ctx.createRadialGradient(
    size/2, size/2, 0,
    size/2, size/2, size/2
);

// Add color stops for a soft, circular ripple
gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.4)');
gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.1)');
gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

// Fill the canvas with the gradient
ctx.fillStyle = gradient;
ctx.fillRect(0, 0, size, size);

// Save the image
const buffer = canvas.toBuffer('image/png');
fs.writeFileSync('public/assets/textures/ripple.png', buffer); 