// ===== Canvas setup =====
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resize();
window.addEventListener("resize", resize);

// ===== Game state =====
const game = {
  speed: 0,
  scrollX: 0,
  lane: 0, // 0 = left lane, 1 = right lane
  throttle: false,
};

// ===== Input =====
window.addEventListener("touchstart", () => {
  game.throttle = true;
});

window.addEventListener("touchend", () => {
  game.throttle = false;
});

window.addEventListener("touchmove", (e) => {
  const touch = e.touches[0];
  const y = touch.clientY;

  game.lane = y < canvas.height / 2 ? 0 : 1;
});

// ===== Update =====
function update() {
  if (game.throttle) {
    game.speed += 0.15;
  } else {
    game.speed *= 0.98;
  }

  game.speed = Math.min(game.speed, 12);
  game.scrollX += game.speed;
}

// ===== Render =====
function drawSky() {
  ctx.fillStyle = "#6db3f2";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawTrack() {
  const roadY = canvas.height * 0.55;
  const roadH = canvas.height * 0.22;

  // Grass (top)
  ctx.fillStyle = "#2e7d32";
  ctx.fillRect(0, roadY - roadH * 1.2, canvas.width, roadH);

  // Road
  ctx.fillStyle = "#333";
  ctx.fillRect(0, roadY, canvas.width, roadH);

  // Grass (bottom)
  ctx.fillRect(0, roadY + roadH, canvas.width, roadH);
}

function drawBike() {
  const laneY =
    canvas.height * (game.lane === 0 ? 0.62 : 0.68);

  ctx.save();
  ctx.translate(canvas.width * 0.35, laneY);

  // Bike placeholder
  ctx.fillStyle = "black";
  ctx.fillRect(-30, -10, 60, 20);

  // Wheels
  ctx.fillStyle = "gray";
  ctx.beginPath();
  ctx.arc(-20, 12, 8, 0, Math.PI * 2);
  ctx.arc(20, 12, 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawHUD() {
  ctx.fillStyle = "white";
  ctx.font = "16px sans-serif";
  ctx.fillText(`Speed: ${game.speed.toFixed(1)}`, 16, 28);
}

// ===== Game loop =====
function loop() {
  update();

  drawSky();
  drawTrack();
  drawBike();
  drawHUD();

  requestAnimationFrame(loop);
}

loop();
