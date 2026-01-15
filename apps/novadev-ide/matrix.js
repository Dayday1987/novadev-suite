// 1. Digital Rain Animation
const canvas = document.getElementById('matrixCanvas');
const ctx = canvas.getContext('2d');
let w = canvas.width = window.innerWidth;
let h = canvas.height = window.innerHeight;
const cols = Math.floor(w / 14);
const y = Array(cols).fill(0);

function matrix() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#00FF41';
  ctx.font = '14px monospace';
  y.forEach((pos, i) => {
    const text = String.fromCharCode(Math.random() * 128);
    ctx.globalAlpha = 0.2;
    ctx.fillText(text, i * 14, pos);
    y[i] = pos > h + Math.random() * 10000 ? 0 : pos + 14;
  });
}
setInterval(matrix, 50);

// 2. Sidebar Toggle Logic
document.querySelectorAll('.activity-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const sidebar = document.querySelector('.sidebar');
    if (btn.classList.contains('active')) {
      sidebar.classList.toggle('collapsed');
    } else {
      sidebar.classList.remove('collapsed');
    }
  });
});

// Mobile Init
if (window.innerWidth < 768) document.querySelector('.sidebar').classList.add('collapsed');

window.onresize = () => { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; };
