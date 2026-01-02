// apps/throttle-up/main.js

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
canvas.style.touchAction = "none";
const bikeImage = new Image();
bikeImage.src = "./assets/bike/HEIF Image.png";

const BIKE_SCALE = 0.15;
let bikeReady = false;

const MAX_ANGULAR_VELOCITY = 0.025;
const CRASH_ANGLE = 1.6; // ~92°;

const BALANCE_ANGLE = 1.45; // ~83 degrees

bikeImage.onload = () => {
  bikeReady = true;
  console.log("Bike loaded:", bikeImage.src);
  console.log("Bike size:", bikeImage.width, bikeImage.height);
};

bikeImage.onerror = () => {
  bikeReady = false;
  console.error("Bike image failed to load:", bikeImage.src);
};

// These position the image so the rear wheel sits on the road
const REAR_WHEEL_OFFSET_X = 190;
const REAR_WHEEL_OFFSET_Y = 0;
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
  hasLifted: false,
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

const MAX_SPEED = 120;

// ===== Update =====
function update(now) {
  if (game.phase === "COUNTDOWN") {
    updateCountdown(now);
    return;
  }

  if (game.phase !== "RACING") return;

  // 1️⃣ Forward acceleration
  if (game.throttle) {
  game.speed += 0.6;
} else {
  game.speed -= 0.8; // braking force
}

if (game.speed < 0) game.speed = 0;

  game.speed = Math.min(game.speed, MAX_SPEED);

  // ===== Wheelie Physics (FINAL & STABLE) =====
let torque = 0;

// --- Takeoff impulse (ONE TIME ONLY) ---
if (
  game.throttle &&
  game.speed > 12 &&
  !game.hasLifted
) {
  game.bikeAngularVelocity += 0.022;// 🔥 positive
  game.hasLifted = true;
}
  
// --- Sustained wheelie torque (AFTER lift) ---
if (game.throttle && game.speed > 8 && game.hasLifted) {
  const speedFactor = Math.min(game.speed / 40, 1);

  const angleFade =
    Math.max(0.15, 1 - game.bikeAngle / BALANCE_ANGLE);

   torque = 0.0016 * speedFactor * angleFade;// 🔥 positive
}

// Apply torque ONCE
game.bikeAngularVelocity += torque;

// --- Gravity (only after lift) ---
let gravity = 0;

if (game.bikeAngle > 0.05) {
  gravity = game.bikeAngle * 0.03;

  if (game.bikeAngle > BALANCE_ANGLE) {
    gravity +=
      (game.bikeAngle - BALANCE_ANGLE) * 0.9;
  }
}

game.bikeAngularVelocity -= gravity;

// --- Damping ---
const damping = game.throttle ? 0.985 : 0.96;
game.bikeAngularVelocity *= damping;

// --- Clamp angular velocity ---
game.bikeAngularVelocity = Math.max(
  -MAX_ANGULAR_VELOCITY,
  Math.min(MAX_ANGULAR_VELOCITY, game.bikeAngularVelocity)
);

  // --- Kill tiny oscillation near flat ---
const EPSILON = 0.0005;
if (Math.abs(game.bikeAngularVelocity) < EPSILON) {
  game.bikeAngularVelocity = 0;
}

// --- Apply rotation ---
game.bikeAngle += game.bikeAngularVelocity;
  
  // 3️⃣ Move world
  game.scroll -= game.speed;

  // 4️⃣ Crash
  if (
    game.bikeAngle > CRASH_ANGLE ||
    game.bikeAngle < -0.35
  ) {
    resetGame();
    return;
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

  const offset = game.scroll % total;

  ctx.setLineDash([dashLength, gap]);
  ctx.lineDashOffset = -offset;

  ctx.beginPath();
  ctx.moveTo(0, ROAD_Y() + ROAD_HEIGHT() / 2);
  ctx.lineTo(canvas.width, ROAD_Y() + ROAD_HEIGHT() / 2);
  ctx.stroke();

  ctx.setLineDash([]);
}

//drawBike
function drawBike() {
  if (!bikeReady) return;

  const laneHeight = ROAD_HEIGHT() / LANE_COUNT;
  const groundY = ROAD_Y() + laneHeight * game.lane + laneHeight / 2;

  // Rear wheel ground contact (RIGHT side now)
  const rearGroundX = canvas.width * 0.50;

  const w = bikeImage.width * BIKE_SCALE;
  const h = bikeImage.height * BIKE_SCALE;

  ctx.save();

// 1️⃣ Move origin to rear wheel contact point
ctx.translate(rearGroundX, groundY);

// 2️⃣ Rotate around rear wheel
ctx.rotate(-game.bikeAngle);

// 3️⃣ Draw bike normally (facing RIGHT)
ctx.drawImage(
  bikeImage,
  -REAR_WHEEL_OFFSET_X, // rear wheel now truly behind pivot
  -h,
  w,
  h
);
  
// DEBUG: rear wheel contact point
ctx.fillStyle = "red";
ctx.beginPath();
ctx.arc(0, 0, 5, 0, Math.PI * 2);
ctx.fill();

  // FRONT marker
ctx.fillStyle = "blue";
ctx.beginPath();
ctx.arc(w - REAR_WHEEL_OFFSET_X, 0, 5, 0, Math.PI * 2);
ctx.fill();
  
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
  game.hasLifted = false;
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
