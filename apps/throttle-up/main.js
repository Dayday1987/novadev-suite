// =====================
// GAME INITIALIZATION
// =====================
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.style.touchAction = "none"; // prevent pinch zoom

// =====================
// LOAD IMAGES (lazy load for performance)
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
// TUNABLE CONSTANTS
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
// COUNTDOWN OVERLAY
// =====================
const overlay = document.getElementById("countdownOverlay");
overlay.hidden = true;

function startCountdown() {
  game.phase = "COUNTDOWN";
  game.countdownIndex = 0;
  game.countdownTimer = performance.now();
  overlay.hidden = false; // show overlay during countdown
}

// defines the sequence of lights that appear during countdown
const COUNTDOWN_STEPS = ["YELLOW", "YELLOW", "GREEN"];

function updateCountdown(now) {
  const lights = [
    document.getElementById("lightYellow1"),
    document.getElementById("lightYellow2"),
    document.getElementById("lightGreen")
  ];
  const countdownNumber = document.getElementById("countdownNumber");
  const goText = document.getElementById("goText");

  const step = game.countdownIndex;

  // reset all lights first
  lights.forEach((light) => light.classList.remove("active"));

  // show 3 → 2 → 1 → GO
  if (step < COUNTDOWN_STEPS.length) {
    countdownNumber.textContent = 3 - step;

    if (COUNTDOWN_STEPS[step] === "YELLOW") lights[step].classList.add("active");
    if (COUNTDOWN_STEPS[step] === "GREEN") {
      lights[2].classList.add("active");
      countdownNumber.hidden = true;
      goText.hidden = false;
    }
  }

  // advance countdown every 800ms
  if (now - game.countdownTimer > 800) {
    game.countdownIndex++;
    game.countdownTimer = now;

    if (game.countdownIndex >= COUNTDOWN_STEPS.length) {
      overlay.hidden = true;      // remove overlay
      goText.hidden = true;
      countdownNumber.hidden = false;
      game.phase = "RACING";
      if (game.fingerDown) game.throttle = true;
    }
  }
}

// =====================
// INPUT
// =====================
canvas.addEventListener("touchstart", (e) => {
  e.stopPropagation();
  game.fingerDown = true;

  if (game.phase === "IDLE") startCountdown();
  else if (game.phase === "RACING") game.throttle = true;
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

  // ---- SPEED ----
  game.speed += game.throttle ? 0.45 : -0.6;
  game.speed = Math.max(0, Math.min(game.speed, MAX_SPEED));

  // ---- WORLD SCROLL ----
  game.scroll -= game.speed;
  if (game.scroll < -100000) game.scroll = 0;

  // ---- WHEELIE PHYSICS ----
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

  // ---- GRAVITY ----
  if (game.bikeAngle > 0) {
    let gravity = 0.002 + game.bikeAngle * 0.015;
    if (game.bikeAngle > BALANCE_POINT) gravity *= 0.12;
    game.bikeAngularVelocity -= gravity;
  }

  // ---- DAMPING ----
  game.bikeAngularVelocity *= 0.99;

  // ---- ANGLE LIMITS ----
  game.bikeAngularVelocity = Math.max(-MAX_ANGULAR_VELOCITY, game.bikeAngularVelocity);
  game.bikeAngle += game.bikeAngularVelocity;

  // ---- GROUND CONTACT ----
  if (game.bikeAngle < 0) {
    game.bikeAngle = 0;
    game.bikeAngularVelocity = 0;
    game.hasLifted = false;
  }

  // ---- CRASH ----
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
  const groundY = canvas.height * 0.8;
  const roadHeight = canvas.height * 0.15;

  ctx.fillStyle = "#4caf50";
  ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);

  ctx.fillStyle = "#3a3a3a";
  ctx.fillRect(0, groundY - roadHeight, canvas.width, roadHeight);
}

function drawBike() {
  if (!bikeImage.complete) return;

  const groundY = canvas.height * 0.85;
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
