import * as THREE from 'three';

export function createEarthTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('No se pudo crear la textura del planeta.');

  context.fillStyle = '#071122';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = 'rgba(56, 189, 248, 0.16)';
  context.lineWidth = 1;
  for (let x = 0; x <= canvas.width; x += 64) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, canvas.height);
    context.stroke();
  }
  for (let y = 0; y <= canvas.height; y += 64) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(canvas.width, y);
    context.stroke();
  }

  const continents = [
    [[135, 88], [255, 78], [295, 145], [242, 212], [210, 238], [172, 185]],
    [[260, 255], [328, 275], [348, 348], [302, 438], [276, 422], [254, 322]],
    [[468, 94], [562, 84], [578, 152], [492, 166], [464, 132]],
    [[474, 180], [576, 184], [608, 268], [556, 378], [512, 362], [464, 256]],
    [[586, 84], [824, 94], [858, 188], [768, 246], [646, 226], [590, 166]],
    [[766, 316], [858, 316], [868, 386], [776, 392]],
  ];
  continents.forEach((continent) => {
    context.beginPath();
    continent.forEach(([x, y], index) => {
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.closePath();
    context.fillStyle = 'rgba(14, 116, 144, 0.34)';
    context.fill();
    context.strokeStyle = '#38bdf8';
    context.lineWidth = 1.75;
    context.stroke();
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
