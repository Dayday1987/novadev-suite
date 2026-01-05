// apps/throttle-up/app.js

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
canvas.style.touchAction = "none";

// =====================================================
// IMAGES
// =====================================================
function loadImage(src) {
  const img = new Image();
  img.src = src;
  return img;
}

const bikeImage = loadImage("./assets/bike/ninja-h2r-2.png");
const wheelImage = loadImage("./assets/bike/biketire.png");
const riderImage = loadImage("./assets/bike/bike-rider.png");

// Environment
const crowdImage = loadImage("./assets/env/crowd.png");
const barrierImage = loadImage("./assets/env/barrier.png");
const grandstandImage = loadImage("./assets/env/grandstand.png");

const BIKE_SCALE = 0.15;

// =====================================================
// PHYSICS CONSTANTS
// =====================================================
const MAX_SPEED = 140;
const LIFT_SPEED = 10;

const POP_FORCE = 0.07;
const MAX_ANGULAR_VELOCITY = 0.22;
const BALANCE_POINT = 1.25;
const CRASH_ANGLE = 2.2;

// =====================================================
// CANVAS
// =====================================================
function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resize();
window.addEventListener("resize", resize);

// =====================================================
// GAME STATE
// =====================================================
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

const COUNTDOWN_STEPS = ["RED", "RED", "RED", "RED", "RED", "GREEN"];
const ROAD_HEIGHT = () => canvas.height * 0.22;
const ROAD_Y = () => canvas.height - ROAD_HEIGHT() - 20;

// =====================================================
// INPUT
// =====================================================
window.addEventListener("touchstart", (e) => {
  e.preventDefault();
  game.fingerDown = true;

  if (game.phase === "IDLE") startCountdown();
  else if (game.phase === "RACING") game.throttle = true;
}, { passive: false });

window.addEventListener("touchend", (e) => {
  e.preventDefault();
  game.fingerDown = false;
  game.throttle = false;
}, { passive: false });

window.addEventListener("touchmove", (e) => {
  e.preventDefault();
  if (!e.touches.length) return;
  game.lane = e.touches[0].clientY < canvas.height / 2 ? 0 : 1;
}, { passive: false });

// =====================================================
// COUNTDOWN
// =====================================================
function startCountdown() {
  game.phase = "COUNTDOWN";
  game.countdownIndex = 0;
  game.countdownTimer = performance.now();
}

function updateCountdown(now) {
  if (now - game.countdownTimer > 700) {
    game.countdownIndex++;
    game.countdownTimer = now;

    if (game.countdownIndex >= COUNTDOWN_STEPS.length - 1) {
      game.phase = "RACING";
      if (game.fingerDown) game.throttle = true;
    }
  }
}

// =====================================================
// UPDATE
// =====================================================
function update(now) {
  if (game.phase === "COUNTDOWN") {
    updateCountdown(now);
    return;
  }

  if (game.phase !== "RACING") return;

  // SPEED
  if (game.throttle) game.speed += 0.5;
  else game.speed -= 0.7;

  game.speed = Math.max(0, Math.min(game.speed, MAX_SPEED));

  // WORLD SCROLL (USED IN RENDER)
  game.scroll -= game.speed * 0.6;

  // =====================================================
  // WHEELIE PHYSICS
  // =====================================================
  let torque = 0;

  if (game.speed > LIFT_SPEED) {
    if (game.throttle && !game.hasLifted) {
      game.bikeAngularVelocity += POP_FORCE;
      game.hasLifted = true;
    }

    if (game.throttle) {
      const speedFactor = Math.min(game.speed / 60, 1);
      torque =
        game.bikeAngle < BALANCE_POINT
          ? 0.01 * speedFactor
          : 0.02 * speedFactor;
    }
  }

  game.bikeAngularVelocity += torque;

  // GRAVITY
  if (game.bikeAngle > 0) {
    let gravity = 0.003 + game.bikeAngle * 0.018;
    game.bikeAngularVelocity -= gravity;
  }

  // DAMPING
  game.bikeAngularVelocity *= 0.985;

  // CLAMP (BOTH DIRECTIONS — FIX)
  game.bikeAngularVelocity = Math.max(
    -MAX_ANGULAR_VELOCITY,
    Math.min(MAX_ANGULAR_VELOCITY, game.bikeAngularVelocity)
  );

  game.bikeAngle += game.bikeAngularVelocity;

  // GROUND RESET
  if (game.bikeAngle < 0) {
    game.bikeAngle = 0;
    game.bikeAngularVelocity = 0;
    game.hasLifted = false;
  }

  // CRASH
  if (game.bikeAngle >= CRASH_ANGLE) resetGame();
}

// =====================================================
// RENDER
// =====================================================
function drawSky() {
  ctx.fillStyle = "#6db3f2";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawParallax(img, y, speed, height) {
  if (!img.complete || !img.naturalWidth) return;

  const w = img.width;
  let x = game.scroll * speed % w;
  if (x > 0) x -= w;

  for (; x < canvas.width; x += w) {
    ctx.drawImage(img, x, y, w, height);
  }
}

function drawEnvironment() {
  const roadY = ROAD_Y();

  drawParallax(grandstandImage, roadY - 260, 0.2, 200);
  drawParallax(crowdImage, roadY - 120, 0.35, 120);
  drawParallax(barrierImage, roadY - 40, 0.6, 40);

  ctx.fillStyle = "#222d3a";
  ctx.fillRect(0, roadY, canvas.width, ROAD_HEIGHT());
}

function drawBike() {
  const laneFactor = game.lane === 0 ? 0.35 : 0.75;
  const groundY = ROAD_Y() + ROAD_HEIGHT() * laneFactor;
  const rearX = canvas.width * 0.18;

  const bW = bikeImage.width * BIKE_SCALE;
  const bH = bikeImage.height * BIKE_SCALE;
  const wSize = bH * 0.48;

  ctx.save();
  ctx.translate(rearX, groundY);
  ctx.rotate(-game.bikeAngle);

  ctx.drawImage(wheelImage, -wSize / 2, -wSize / 2, wSize, wSize);
  ctx.drawImage(wheelImage, bW * 0.68 - wSize / 2, -wSize / 2, wSize, wSize);

  ctx.drawImage(bikeImage, -(bW * 0.22), -bH + bH * 0.15, bW, bH);

  if (riderImage.complete) {
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

  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.arc(cx - 120 + i * 60, cy, 22, 0, Math.PI * 2);
    ctx.fillStyle =
      game.countdownIndex > i
        ? "red"
        : "rgba(80,80,80,0.6)";
    ctx.fill();
  }
}

// =====================================================
// RESET
// =====================================================
function resetGame() {
  game.phase = "IDLE";
  game.speed = 0;
  game.scroll = 0;
  game.bikeAngle = 0;
  game.bikeAngularVelocity = 0;
  game.throttle = false;
  game.hasLifted = false;
}

// =====================================================
// LOOP
// =====================================================
function loop(now) {
  update(now);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawSky();
  drawEnvironment();
  drawBike();
  drawCountdown();
  requestAnimationFrame(loop);
}

loop(performance.now());