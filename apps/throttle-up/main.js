// apps/throttle-up/app.js

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
canvas.style.touchAction = "none";

// =====================
// IMAGES
// =====================
const bikeImage = new Image();
bikeImage.src = "./assets/bike/ninja-h2r-2.png";

const wheelImage = new Image();
wheelImage.src = "./assets/bike/biketire.png";

const riderImage = new Image();
riderImage.src = "./assets/bike/bike-rider.png";

const BIKE_SCALE = 0.15;
let bikeReady = false;
bikeImage.onload = () => (bikeReady = true);

// =====================
// PHYSICS CONSTANTS
// =====================
const MAX_SPEED = 140;
const CRASH_ANGLE = 1.9;
const BALANCE_POINT = 1.25;
const MAX_ANGULAR_VELOCITY = 0.025;
const LIFT_SPEED = 12;
const POP_FORCE = 0.055;
// =====================
// CANVAS
// =====================
function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resize();
window.addEventListener("resize", resize);

// =====================
// GAME STATE
// =====================
const game = {
  phase: "IDLE",
  speed: 0,
  scroll: 0,
  lane: 0,
  throttle: false,
  countdownIndex: 0,
  countdownTimer: 0,
  bikeAngle: 0,
  bikeAngularVelocity: 0,
  fingerDown: false,
  hasLifted: false
};

const COUNTDOWN_STEPS = ["YELLOW", "YELLOW", "GREEN"];
const ROAD_HEIGHT = () => canvas.height * 0.22;
const ROAD_Y = () => canvas.height - ROAD_HEIGHT() - 20;

// =====================
// INPUT
// =====================
window.addEventListener(
  "touchstart",
  (e) => {
    e.preventDefault();
    game.fingerDown = true;

    if (game.phase === "IDLE") startCountdown();
    else if (game.phase === "RACING") game.throttle = true;
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
    if (!e.touches.length) return;
    const y = e.touches[0].clientY;
    game.lane = y < canvas.height / 2 ? 0 : 1;
  },
  { passive: false }
);

// =====================
// COUNTDOWN
// =====================
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

// =====================
// UPDATE
// =====================
function update(now) {
  if (game.phase === "COUNTDOWN") {
    updateCountdown(now);
    return;
  }

  if (game.phase !== "RACING") return;

  // SPEED
  if (game.throttle) game.speed += 0.45;
  else game.speed -= 0.6;

  game.speed = Math.max(0, Math.min(game.speed, MAX_SPEED));

  // ✅ WORLD SCROLL
  game.scroll -= game.speed;
  if (game.scroll < -100000) game.scroll = 0;

  // WHEELIE PHYSICS
  let torque = 0;

if (game.speed > LIFT_SPEED) {

  // 🚀 Initial POP (one-time impulse)
  if (game.throttle && !game.hasLifted) {
    game.bikeAngularVelocity += POP_FORCE;
    game.hasLifted = true;
  }

  // 🔥 Sustained lift while holding throttle
  if (game.throttle) {
    const speedFactor = Math.min(game.speed / 60, 1);
    torque = 0.0055 * speedFactor;
  }
}

game.bikeAngularVelocity += torque;

  // GRAVITY
  if (game.bikeAngle > 0) {
    let gravity = 0.0022 + game.bikeAngle * 0.02;
    if (game.bikeAngle > BALANCE_POINT) gravity *= 0.45;
    game.bikeAngularVelocity -= gravity;
  }

  // DAMPING
  game.bikeAngularVelocity *= 0.975;

  // CLAMP ROTATION SPEED
  game.bikeAngularVelocity = Math.max(
    -MAX_ANGULAR_VELOCITY,
    Math.min(game.bikeAngularVelocity, MAX_ANGULAR_VELOCITY)
  );

  // APPLY ROTATION
  game.bikeAngle += game.bikeAngularVelocity;

  // GROUND
  if (game.bikeAngle < 0) {
    game.bikeAngle = 0;
    game.bikeAngularVelocity = 0;
    game.hasLifted = false;
  }

  // CRASH
  if (game.bikeAngle >= CRASH_ANGLE) {
    resetGame();
  }
}

// =====================
// RENDER
// =====================
function drawSky() {
  ctx.fillStyle = "#6db3f2";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawEnvironment() {
  const hY = ROAD_Y();

  ctx.fillStyle = "#2e7d32";
  ctx.fillRect(0, hY - 100, canvas.width, 100);

  const standSpacing = 1000;
  const standOffset = (game.scroll * 0.15) % standSpacing;
  for (let i = -1; i < canvas.width / standSpacing + 1; i++) {
    const x = i * standSpacing + standOffset;
    ctx.fillStyle = "#444";
    ctx.fillRect(x, hY - 115, 600, 115);
    ctx.fillStyle = "#111";
    ctx.fillRect(x + 20, hY - 95, 560, 60);
  }

  ctx.fillStyle = "#888";
  const wallOffset = (game.scroll * 0.4) % 250;
  for (let i = -1; i < canvas.width / 250 + 1; i++) {
    const x = i * 250 + wallOffset;
    ctx.fillRect(x, hY - 35, 240, 35);
  }

  ctx.fillStyle = "#222d3a";
  ctx.fillRect(0, hY, canvas.width, ROAD_HEIGHT() + 40);

  ctx.strokeStyle = "rgba(255,255,255,0.8)";
  ctx.lineWidth = 5;
  ctx.setLineDash([80, 50]);
  ctx.lineDashOffset = -(game.scroll % 130);
  ctx.beginPath();
  ctx.moveTo(0, hY + ROAD_HEIGHT() / 2);
  ctx.lineTo(canvas.width, hY + ROAD_HEIGHT() / 2);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawBike() {
  if (!bikeReady) return;

  const laneFactor = game.lane === 0 ? 0.35 : 0.75;
  const groundY = ROAD_Y() + ROAD_HEIGHT() * laneFactor;
  const rearX = canvas.width * 0.18;

  const bW = bikeImage.width * BIKE_SCALE;
  const bH = bikeImage.height * BIKE_SCALE;
  const wSize = bH * 0.48;

  ctx.save();
  ctx.translate(rearX, groundY);
  ctx.rotate(-game.bikeAngle);

  // Rear wheel
  ctx.save();
  ctx.rotate(game.scroll * 0.1);
  ctx.drawImage(wheelImage, -wSize / 2, -wSize / 2, wSize, wSize);
  ctx.restore();

  // Front wheel
  ctx.save();
  ctx.translate(bW * 0.68, 0);
  ctx.rotate(game.scroll * 0.1);
  ctx.drawImage(wheelImage, -wSize / 2, -wSize / 2, wSize, wSize);
  ctx.restore();

  // Bike frame
  ctx.drawImage(
    bikeImage,
    -(bW * 0.22),
    -bH + bH * 0.15,
    bW,
    bH
  );

  // Rider
  if (riderImage.complete && riderImage.naturalWidth > 0) {
    ctx.drawImage(
      riderImage,
      -(bW * 0.1),
      -bH - bH * 0.05,
      bW * 0.8,
      bH * 0.8
    );
  }

  ctx.restore();
}

function drawCountdown() {
  if (game.phase !== "COUNTDOWN") return;

  const cx = canvas.width / 2;
  const cy = canvas.height / 3;

  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(cx - 100, cy - 50, 200, 100);

  COUNTDOWN_STEPS.forEach((step, i) => {
    ctx.fillStyle =
      i === game.countdownIndex
        ? step === "GREEN"
          ? "#2ecc71"
          : "#f1c40f"
        : "#333";

    ctx.beginPath();
    ctx.arc(cx + (i - 1) * 60, cy, 22, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawHUD() {
  ctx.fillStyle = "white";
  ctx.font = "bold 24px Arial";

  if (game.phase === "IDLE") {
    ctx.textAlign = "center";
    ctx.fillText("TAP TO RACE", canvas.width / 2, 80);
  }

  if (game.phase === "RACING") {
    ctx.textAlign = "left";
    ctx.fillText(`MPH: ${Math.floor(game.speed)}`, 30, 50);
  }
}

// =====================
// RESET
// =====================
function resetGame() {
  game.phase = "IDLE";
  game.speed = 0;
  game.scroll = 0;
  game.bikeAngle = 0;
  game.bikeAngularVelocity = 0;
  game.throttle = false;
  game.hasLifted = false;
}

// =====================
// LOOP
// =====================
function loop(now) {
  update(now);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawSky();
  drawEnvironment();
  drawBike();
  drawCountdown();
  drawHUD();
  requestAnimationFrame(loop);
}

loop(performance.now());
