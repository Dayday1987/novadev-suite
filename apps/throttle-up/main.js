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

// ===== Constants =====
const ROAD_HEIGHT = () => canvas.height * 0.28;
const ROAD_Y = () => canvas.height - ROAD_HEIGHT();
const LANE_COUNT = 2;

// ===== Game state =====
const game = {
  phase: "IDLE", // IDLE | COUNTDOWN | RACING
  speed: 0,
  scroll: 0,
  lane: 0,
  throttle: false,
  countdownIndex: 0,
  countdownTimer: 0,
  bikeAngle: 0,
bikeAngularVelocity: 0,
fingerDown: false,
};

const COUNTDOWN_STEPS = ["YELLOW", "YELLOW", "GREEN"];

// ===== Input =====
window.addEventListener("touchstart", (e) => {
  e.preventDefault();
  game.fingerDown = true;
game.throttle = game.phase === "RACING";

  if (game.phase === "IDLE") {
    startCountdown();
  }
});

window.addEventListener("touchend", () => {
  game.fingerDown = false;
  game.throttle = false;
});

window.addEventListener("touchmove", (e) => {
  const y = e.touches[0].clientY;
  game.lane = y < canvas.height / 2 ? 0 : 1;
});

// ===== Countdown control =====
function startCountdown() {
  game.phase = "COUNTDOWN";
  game.countdownIndex = 0;
  game.countdownTimer = performance.now();
}

function updateCountdown(now) {
  
  if (now - game.countdownTimer > 800) {
    game.countdownIndex++;
    game.countdownTimer = now;

      if (game.countdownIndex >= COUNTDOWN_STEPS.length) {
  game.phase = "RACING";
  if (game.fingerDown) game.throttle = true;
}
    }
  }

// ===== Update =====
function update(now) {
  if (game.phase === "COUNTDOWN") {
    updateCountdown(now);
    return;
  }

  if (game.phase !== "RACING") return;

  // Throttle → torque
  if (game.throttle) {
    game.speed += 0.2;
    game.bikeAngularVelocity -= 0.001;
  } else {
    game.speed *= 0.96;
    game.bikeAngularVelocity += 0.003;
  }

  // Clamp values
  game.speed = Math.min(game.speed, 18);
  game.bikeAngularVelocity *= 0.98;

  // Apply rotation
  game.bikeAngle += game.bikeAngularVelocity;

  // Gravity pulls bike down
  game.bikeAngle *= 0.995;

  // Scroll world
  game.scroll += game.speed;

  // CRASH condition (over-rotation)
  if (game.bikeAngle > 0.6 || game.bikeAngle < -0.4) {
    resetGame();
  }
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
  ctx.fillRect(0, ROAD_Y(), canvas.width, ROAD_HEIGHT());

  // Moving lane divider (SCROLLING)
  ctx.strokeStyle = "#bbb";
  ctx.lineWidth = 4;

  const dashLength = 40;
  const gap = 30;
  const total = dashLength + gap;

  const offset = -(game.scroll % total);

  ctx.setLineDash([dashLength, gap]);
  ctx.lineDashOffset = offset;

  ctx.beginPath();
  ctx.moveTo(0, ROAD_Y() + ROAD_HEIGHT() / 2);
  ctx.lineTo(canvas.width, ROAD_Y() + ROAD_HEIGHT() / 2);
  ctx.stroke();

  ctx.setLineDash([]);
}

function drawBike() {
  const laneHeight = ROAD_HEIGHT() / LANE_COUNT;
  const bikeY =
    ROAD_Y() + laneHeight * game.lane + laneHeight / 2;
  const bikeX = canvas.width * 0.35;

  ctx.save();
  ctx.translate(bikeX, bikeY);
ctx.rotate(-game.bikeAngle);

  // Body
  ctx.fillStyle = "black";
  ctx.fillRect(-70, -18, 140, 36);

  // Wheels
  const rotation = game.scroll * 0.05;

  function drawWheel(x, y) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.fillStyle = "gray";
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#111";
    ctx.beginPath();
    ctx.moveTo(-10, 0);
    ctx.lineTo(10, 0);
    ctx.stroke();
    ctx.restore();
  }

  drawWheel(-40, 22);
  drawWheel(40, 22);

  ctx.restore();
}

function drawCountdown() {
  if (game.phase !== "COUNTDOWN") return;

  const light = COUNTDOWN_STEPS[game.countdownIndex];
  const colors = ["#333", "#333", "#333"];

  if (light === "YELLOW") colors[game.countdownIndex] = "yellow";
  if (light === "GREEN") colors[2] = "lime";

  const cx = canvas.width / 2;
  const cy = 100;

  colors.forEach((color, i) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx + (i - 1) * 40, cy, 14, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawHUD() {
  ctx.fillStyle = "white";
  ctx.font = "16px sans-serif";

  if (game.phase === "IDLE") {
    ctx.fillText("Tap to start", canvas.width / 2 - 40, 40);
  }

  if (game.phase === "RACING") {
    ctx.fillText(`Speed: ${game.speed.toFixed(1)}`, 16, 28);
  }
}

function resetGame() {
  game.phase = "IDLE";
  game.speed = 0;
  game.scroll = 0;
  game.bikeAngle = 0;
  game.bikeAngularVelocity = 0;
  game.throttle = false;
}

// ===== Loop =====
function loop(now) {
  update(now);

  drawSky();
  drawEnvironment();
  drawBike();
  drawCountdown();
  drawHUD();

  requestAnimationFrame(loop);
}

loop(performance.now());
