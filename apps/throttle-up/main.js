// apps/throttle-up/main.js

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resize();
window.addEventListener("resize", resize);

// Prevent long-press highlight
document.body.style.userSelect = "none";
document.body.style.webkitUserSelect = "none";

// ===== Game constants =====
const ROAD_HEIGHT = 220;
const ROAD_Y = () => canvas.height - ROAD_HEIGHT;
const LANE_COUNT = 2;

// ===== Game state =====
const game = {
  speed: 0,
  scroll: 0,
  lane: 0,
  throttle: false,
};

// ===== Input =====
window.addEventListener("touchstart", (e) => {
  e.preventDefault();
  game.throttle = true;
});

window.addEventListener("touchend", () => {
  game.throttle = false;
});

window.addEventListener("touchmove", (e) => {
  const y = e.touches[0].clientY;
  game.lane = y < canvas.height / 2 ? 0 : 1;
});

// ===== Update =====
function update() {
  if (game.throttle) {
    game.speed += 0.2;
  } else {
    game.speed *= 0.96;
  }

  game.speed = Math.min(game.speed, 18);
  game.scroll += game.speed;
}

// ===== Render =====
function drawSky() {
  ctx.fillStyle = "#6db3f2";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawEnvironment() {
  // Grass
  ctx.fillStyle = "#2e7d32";
  ctx.fillRect(0, ROAD_Y() - 60, canvas.width, 60);

  // Road
  ctx.fillStyle = "#333";
  ctx.fillRect(0, ROAD_Y(), canvas.width, ROAD_HEIGHT);

  // Lane divider
  ctx.strokeStyle = "#888";
  ctx.setLineDash([20, 20]);
  ctx.beginPath();
  ctx.moveTo(0, ROAD_Y() + ROAD_HEIGHT / 2);
  ctx.lineTo(canvas.width, ROAD_Y() + ROAD_HEIGHT / 2);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawBike() {
  const laneHeight = ROAD_HEIGHT / LANE_COUNT;
  const bikeY =
    ROAD_Y() + laneHeight * game.lane + laneHeight / 2;

  const bikeX = canvas.width * 0.35;

  ctx.save();
  ctx.translate(bikeX, bikeY);

  // Body
  ctx.fillStyle = "black";
  ctx.fillRect(-50, -15, 100, 30);

  // Wheels (rotate in place)
const rotation = game.scroll * 0.05;

ctx.fillStyle = "gray";

function drawWheel(x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.beginPath();
  ctx.arc(0, 0, 10, 0, Math.PI * 2);
  ctx.fill();

  // simple spoke
  ctx.strokeStyle = "#111";
  ctx.beginPath();
  ctx.moveTo(-10, 0);
  ctx.lineTo(10, 0);
  ctx.stroke();

  ctx.restore();
}

drawWheel(-30, 20);
drawWheel(30, 20);

function drawHUD() {
  ctx.fillStyle = "white";
  ctx.font = "16px sans-serif";
  ctx.fillText(`Speed: ${game.speed.toFixed(1)}`, 16, 28);
}

// ===== Game loop =====
function loop() {
  update();

  drawSky();
  drawEnvironment();
  drawBike();
  drawHUD();

  requestAnimationFrame(loop);
}

loop();
