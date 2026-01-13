// Import cloud download utilities
import { showToast, showDownloadModal } from './utils.js';

export function initMemeMaker() {
  const canvas = document.getElementById('memeCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const imgInput = document.getElementById('imageInput');
  const topText = document.getElementById('topText');
  const bottomText = document.getElementById('bottomText');
  let image = new Image();
  
  imgInput?.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    image.src = URL.createObjectURL(file);
    image.onload = () => {
      draw();
      showToast('🖼️ Image loaded!'); // Added toast notification
    };
  });
  
  document.getElementById('drawMeme')?.addEventListener('click', () => {
    draw();
    if (image.src) {
      showToast('🎨 Meme updated!'); // Added toast notification
    }
  });
  
  // UPDATED: Download with cloud options
  document.getElementById('downloadMeme')?.addEventListener('click', () => {
    if (!image.src) {
      showToast('⚠️ Please upload an image first', 'error');
      return;
    }
    const filename = `meme-${Date.now()}.png`;
    showDownloadModal(filename, canvas, 'image');
  });
  
  document.getElementById('resetMeme')?.addEventListener('click', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    imgInput.value = '';
    topText.value = '';
    bottomText.value = '';
    image = new Image();
    showToast('🔄 Reset complete'); // Added toast notification
  });
  
  function draw() {
    if (!image.src) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    ctx.font = 'bold 40px Impact';
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 3;
    ctx.textAlign = 'center';
    drawText(topText.value, canvas.width / 2, 50);
    drawText(bottomText.value, canvas.width / 2, canvas.height - 20);
  }
  
  function drawText(text, x, y) {
    ctx.strokeText(text.toUpperCase(), x, y);
    ctx.fillText(text.toUpperCase(), x, y);
  }
}
