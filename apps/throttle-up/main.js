// apps/throttle-up/main.js

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
canvas.style.touchAction = "none";
const bikeImage = new Image();
bikeImage.src = "./assets/bike/ninja-h2r.svg";

const BIKE_SCALE = 1.2;
let bikeReady = false;

bikeImage.onload = () => {
  bikeReady = true;
  console.log("Bike loaded:", bikeImage.src);
};

bikeImage.onerror = () => {
  bikeReady = false;
  console.error("Bike image failed to load:", bikeImage.src);
};

// These position the image so the rear wheel sits on the road
const REAR_WHEEL_OFFSET_X = 60;   // pixels
const REAR_WHEEL_OFFSET_Y = -5; // % of image height
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
window.addEventListener(
  "touchstart",
  (e) => {
    e.preventDefault();
    game.fingerDown = true;
    game.throttle = game.phase === "RACING";

    if (game.phase === "IDLE") {
      startCountdown();
    }
  },
  { passive: false }
);

window.addEventListener(
  "touchend",
  (e) => {
    e.preventDefault();
    game.fingerDown = false;
    game.throttle = false;
  },
  { passive: false }
);

window.addEventListener(
  "touchmove",
  (e) => {
    e.preventDefault();
    const y = e.touches[0].clientY;
    game.lane = y < canvas.height / 2 ? 0 : 1;
  },
  { passive: false }
);

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

  // Forward acceleration
  if (game.throttle) {
    game.speed += 0.25;
  } else {
    game.speed *= 0.97;
  }
  game.speed = Math.min(game.speed, 20);
  

  // ===== Wheelie physics (corrected) =====

// Throttle torque (rear wheel pushing bike back)
if (game.throttle) {
  game.bikeAngularVelocity += 0.006; // <-- lift strength
}

// Gravity pulls bike back toward flat
const GRAVITY = 0.04;
game.bikeAngularVelocity += -game.bikeAngle * GRAVITY;

// Damping (stability)
game.bikeAngularVelocity *= 0.93;

// Apply rotation
game.bikeAngle += game.bikeAngularVelocity;

  // Scroll world
  game.scroll += game.speed;

  // Safety
  if (!Number.isFinite(game.bikeAngle)) {
    resetGame();
    return;
  }

  // Crash limits
  if (game.bikeAngle > 0.65 || game.bikeAngle < -0.35) {
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
  if (!bikeReady) return;

  const laneHeight = ROAD_HEIGHT() / LANE_COUNT;
  const groundY = ROAD_Y() + laneHeight * game.lane + laneHeight / 2;
  const rearX = canvas.width * 0.35;

  const w = bikeImage.width * BIKE_SCALE;
  const h = bikeImage.height * BIKE_SCALE;

  ctx.save();
ctx.translate(bikeX, bikeY);
ctx.drawImage(bikeImage, 0, -h, w, h);
ctx.restore();
 
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
