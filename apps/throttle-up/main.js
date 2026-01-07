// =====================
// GAME INITIALIZATION
// =====================
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.style.touchAction = "none"; // prevent pinch zoom

// =====================
// LOAD IMAGES
// =====================
const loadImage = (src) => {
  const img = new Image();
  img.loading = "lazy";
  img.src = src;
  return img;
};

const bikeImage = loadImage("assets/bike/ninja-h2r-2.png");
const wheelImage = loadImage("assets/bike/biketire.png");
const riderImage = loadImage("assets/bike/bike-rider.png");

// =====================
// CONSTANTS
// =====================
const BIKE_SCALE = 0.15;
const MAX_SPEED = 140;
const LIFT_SPEED = 10;
const POP_FORCE = 0.065;
const MAX_ANGULAR_VELOCITY = 0.14;
const BALANCE_POINT = 1.25;
const CRASH_ANGLE = 1.9;

// =====================
// CANVAS HANDLING
// =====================
function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resize();
window.addEventListener("resize", resize);

function ROAD_Y() {
  return canvas.height * 0.8;
}
function ROAD_HEIGHT() {
  return canvas.height * 0.15;
}

// =====================
// GAME STATE
// =====================
const game = {
  phase: "IDLE", // IDLE → COUNTDOWN → RACING
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

// =====================
// COUNTDOWN LIGHTS
// =====================
const overlay = document.getElementById("countdownOverlay");
const lights = [
  document.getElementById("lightYellow1"),
  document.getElementById("lightYellow2"),
  document.getElementById("lightGreen")
];
const COUNTDOWN_STEPS = ["YELLOW", "YELLOW", "GREEN"];
overlay.hidden = true;

function startCountdown() {
  game.phase = "COUNTDOWN";
  game.countdownIndex = 0;
  game.countdownTimer = performance.now();
  overlay.hidden = false;
  lights.forEach(l => l.classList.remove("active"));
}

function updateCountdown(now) {
  if (now - game.countdownTimer > 800) {
    if (game.countdownIndex < COUNTDOWN_STEPS.length) {
      const color = COUNTDOWN_STEPS[game.countdownIndex];
      if (color === "YELLOW") lights[game.countdownIndex].classList.add("active");
      if (color === "GREEN") lights[2].classList.add("active");
      game.countdownIndex++;
      game.countdownTimer = now;
    } else {
      // ✅ Race starts
      overlay.hidden = true;
      lights.forEach(l => l.classList.remove("active"));
      game.phase = "RACING";

      // If finger was held during countdown, start throttle immediately
      if (game.fingerDown) game.throttle = true;
    }
  }
}

// =====================
// INPUT
// =====================
canvas.addEventListener("touchstart", (e) => {
  e.preventDefault();
  game.fingerDown = true;

  if (game.phase === "IDLE") startCountdown();
  else if (game.phase === "COUNTDOWN") {
    // Finger held before green light — throttle starts when countdown ends
    game.fingerDown = true;
  } else if (game.phase === "RACING") {
    game.throttle = true;
  }
});

canvas.addEventListener("touchend", () => {
  game.fingerDown = false;
  game.throttle = false;
});

canvas.addEventListener("touchmove", (e) => {
  if (!e.touches.length) return;
  const y = e.touches[0].clientY;
  game.lane = y < canvas.height / 2 ? 0 : 1;
});

// =====================
// UPDATE LOOP (physics)
// =====================
function update(now, delta) {
  if (game.phase === "COUNTDOWN") return updateCountdown(now);
  if (game.phase !== "RACING") return;

  game.speed += game.throttle ? 0.45 : -0.6;
  game.speed = Math.max(0, Math.min(game.speed, MAX_SPEED));

  game.scroll -= game.speed;
  if (game.scroll < -100000) game.scroll = 0;

  let torque = 0;
  if (game.speed > LIFT_SPEED) {
    if (game.throttle && !game.hasLifted) {
      game.bikeAngularVelocity += POP_FORCE;
      game.hasLifted = true;
    }
    if (game.throttle) {
      const speedFactor = Math.min(game.speed / 60, 1);
      torque = game.bikeAngle < BALANCE_POINT ? 0.007 * speedFactor : 0.012 * speedFactor;
    }
  }
  game.bikeAngularVelocity += torque;

  if (game.bikeAngle > 0) {
    let gravity = 0.002 + game.bikeAngle * 0.015;
    if (game.bikeAngle > BALANCE_POINT) gravity *= 0.12;
    game.bikeAngularVelocity -= gravity;
  }

  game.bikeAngularVelocity *= 0.99;
  game.bikeAngularVelocity = Math.max(-MAX_ANGULAR_VELOCITY, game.bikeAngularVelocity);
  game.bikeAngle += game.bikeAngularVelocity;

  if (game.bikeAngle < 0) {
    game.bikeAngle = 0;
    game.bikeAngularVelocity = 0;
    game.hasLifted = false;
  }

  if (game.bikeAngle >= CRASH_ANGLE) resetGame();
}

// =====================
// RENDER FUNCTIONS
// =====================
function drawSky() {
  ctx.fillStyle = "#87ceeb";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawEnvironment() {
  const hY = ROAD_Y();
  ctx.fillStyle = "#4caf50";
  ctx.fillRect(0, hY - 100, canvas.width, 100);
  ctx.fillStyle = "#3a3a3a";
  ctx.fillRect(0, hY, canvas.width, ROAD_HEIGHT() + 40);

  // dashed divider between lanes
  ctx.strokeStyle = "white";
  ctx.lineWidth = 3;
  ctx.setLineDash([20, 20]);
  ctx.beginPath();
  ctx.moveTo(0, hY + ROAD_HEIGHT() / 2);
  ctx.lineTo(canvas.width, hY + ROAD_HEIGHT() / 2);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawBike() {
  if (!bikeImage.complete || !wheelImage.complete) return;

  const roadHeight = canvas.height * 0.22;
  const roadY = canvas.height - roadHeight - 20;
  const laneFactor = game.lane === 0 ? 0.35 : 0.75;
  const groundY = roadY + roadHeight * laneFactor;
  const rearX = canvas.width * 0.18;

  const bW = bikeImage.width * BIKE_SCALE;
  const bH = bikeImage.height * BIKE_SCALE;
  const wSize = bH * 0.48;
  const rearWheelX = 0;
  const frontWheelX = bW * 0.68;

  ctx.save();
  ctx.translate(rearX, groundY);
  ctx.rotate(-game.bikeAngle);

  ctx.drawImage(wheelImage, rearWheelX - wSize / 2, -wSize / 2, wSize, wSize);
  ctx.drawImage(wheelImage, frontWheelX - wSize / 2, -wSize / 2, wSize, wSize);
  ctx.drawImage(bikeImage, -(bW * 0.22), -bH + bH * 0.15, bW, bH);
  if (riderImage.complete) {
    ctx.drawImage(riderImage, -(bW * 0.1), -bH - bH * 0.05, bW * 0.8, bH * 0.8);
  }
  ctx.restore();
}

// =====================
// RESET GAME
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
// MAIN LOOP
// =====================
let lastTime = performance.now();
function loop(now) {
  const delta = (now - lastTime) / 16.67;
  lastTime = now;

  update(now, delta);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawSky();
  drawEnvironment();
  drawBike();
  requestAnimationFrame(loop);
}
loop(performance.now());
