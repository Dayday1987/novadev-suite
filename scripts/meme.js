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
    image.onload = draw;
  });

  document.getElementById('drawMeme')?.addEventListener('click', draw);

  document.getElementById('downloadMeme')?.addEventListener('click', () => {
    const a = document.createElement('a');
    a.download = 'meme.png';
    a.href = canvas.toDataURL();
    a.click();
  });

  document.getElementById('resetMeme')?.addEventListener('click', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    imgInput.value = '';
    topText.value = '';
    bottomText.value = '';
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
