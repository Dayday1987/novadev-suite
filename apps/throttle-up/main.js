// apps/throttle-up/main.js

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
canvas.style.touchAction = "none";
const bikeImage = new Image();
bikeImage.src = "./assets/bike/ninja-h2r-2.png";

// Bike parts (not rendered yet)

const wheelImage = new Image();
wheelImage.src = "./assets/bike/biketire.png";

const riderImage = new Image();
riderImage.src = "./assets/bike/bikerider.png";

const BIKE_SCALE = 0.15;
let bikeReady = false;

const WHEEL_SCALE = 0.7; // try 0.6–0.75 later if needed

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
const REAR_WHEEL_OFFSET_X = 145;
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
window.addEventListener("touchstart", (e) => {
    e.preventDefault();
    game.fingerDown = true;

    if (game.phase === "IDLE") {
      startCountdown();
    } else if (game.phase === "RACING") {
      game.throttle = true;
    }
  }, { passive: false }
);

window.addEventListener("touchend", (e) => {
    e.preventDefault();
    game.fingerDown = false;
    game.throttle = false;
  }, { passive: false }
);

window.addEventListener("touchmove", (e) => {
    e.preventDefault();
    const y = e.touches[0].clientY;
    game.lane = y < canvas.height / 2 ? 0 : 1;
  }, { passive: false }
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
      // If player is already holding the screen, start throttle immediately
      if (game.fingerDown) game.throttle = true;
    }
  }
}

const MAX_SPEED = 120; 

// ===== Update =====
function update(now) {
  // 1️⃣ Handle Countdown phase
  if (game.phase === "COUNTDOWN") {
    updateCountdown(now);
    return; // Don't run physics during countdown
  }

  // 2️⃣ Handle Idle phase
  if (game.phase !== "RACING") {
    return; 
  }

  // 3️⃣ RACING PHYSICS
  if (game.throttle) {
    game.speed += 0.6;
  } else {
    game.speed -= 0.8; 
  }

  game.speed = Math.max(0, Math.min(game.speed, MAX_SPEED));

  // --- Wheelie Physics ---
  let torque = 0;
  if (game.throttle && game.speed > 12 && !game.hasLifted) {
    game.bikeAngularVelocity += 0.022;
    game.hasLifted = true;
  }
  
  if (game.throttle && game.speed > 8 && game.hasLifted) {
    const speedFactor = Math.min(game.speed / 40, 1);
    const angleFade = Math.max(0.15, 1 - game.bikeAngle / BALANCE_ANGLE);
    torque = 0.0016 * speedFactor * angleFade;
  }

  game.bikeAngularVelocity += torque;

  // --- Gravity ---
  let gravity = 0;
  if (game.bikeAngle > 0.05) {
    gravity = game.bikeAngle * 0.03;
    if (game.bikeAngle > BALANCE_ANGLE) {
      gravity += (game.bikeAngle - BALANCE_ANGLE) * 0.9;
    }
  }
  game.bikeAngularVelocity -= gravity;

  // --- Damping ---
  const damping = game.throttle ? 0.985 : 0.96;
  game.bikeAngularVelocity *= damping;

  // --- Clamp and Epsilon ---
  game.bikeAngularVelocity = Math.max(-MAX_ANGULAR_VELOCITY, Math.min(MAX_ANGULAR_VELOCITY, game.bikeAngularVelocity));
  if (Math.abs(game.bikeAngularVelocity) < 0.0005) {
    game.bikeAngularVelocity = 0;
  }

  // --- Apply Movement ---
  game.bikeAngle += game.bikeAngularVelocity;
  game.scroll -= game.speed;

  // --- Crash check ---
  if (game.bikeAngle > CRASH_ANGLE || game.bikeAngle < -0.35) {
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

  const offset = game.scroll % total;

  ctx.setLineDash([dashLength, gap]);
  ctx.lineDashOffset = -offset;

  ctx.beginPath();
  ctx.moveTo(0, ROAD_Y() + ROAD_HEIGHT() / 2);
  ctx.lineTo(canvas.width, ROAD_Y() + ROAD_HEIGHT() / 2);
  ctx.stroke();

  ctx.setLineDash([]);
}

//DRAW BIKE
function drawBike() {
  if (!bikeReady) return;

  const laneHeight = ROAD_HEIGHT() / LANE_COUNT;
  const groundY = ROAD_Y() + laneHeight * game.lane + laneHeight / 2;
  
  // Pivot on the rear wheel contact point
  const rearGroundX = canvas.width * 0.18; 

  const bikeW = bikeImage.width * BIKE_SCALE;
  const bikeH = bikeImage.height * BIKE_SCALE;
  
  // --- CALIBRATION SETTINGS ---
  // 1. Shift the frame LEFT so the rear axle area sits on (0,0)
  const FRAME_SHIFT_X = bikeW * 0.22; 
  // 2. Shift the frame DOWN so the axles sit inside the tires
  const FRAME_SHIFT_Y = bikeH * 0.18; 
  // 3. Move the front wheel forward to hit the forks
  const WHEELBASE = bikeW * 0.68;
  // 4. Match wheel size to the gap in the forks
  const wheelSize = bikeH * 0.50; 

  ctx.save();
    // Move to road contact
    ctx.translate(rearGroundX, groundY);
    ctx.rotate(-game.bikeAngle);

    // A. REAR TIRE (Drawn centered at 0,0)
    ctx.save();
      ctx.rotate(game.scroll * 0.1);
      ctx.drawImage(wheelImage, -wheelSize/2, -wheelSize/2, wheelSize, wheelSize);
    ctx.restore();

    // B. BIKE FRAME
    // We subtract FRAME_SHIFT_X to move the image left
    ctx.drawImage(
      bikeImage,
      -FRAME_SHIFT_X, 
      -bikeH + FRAME_SHIFT_Y, 
      bikeW, 
      bikeH
    );

    // C. FRONT TIRE
    // Move forward by WHEELBASE, then draw centered
    ctx.save();
      ctx.translate(WHEELBASE, 0);
      ctx.rotate(game.scroll * 0.1);
      ctx.drawImage(wheelImage, -wheelSize/2, -wheelSize/2, wheelSize, wheelSize);
    ctx.restore();

    // D. RIDER (Positioned relative to the shifted frame)
    // D. RIDER (Positioned relative to the shifted frame)
// We check if the image is loaded AND that it has a width > 0
if (riderImage.complete && riderImage.naturalWidth !== 0) {
    const rW = riderImage.width * BIKE_SCALE;
    const rH = riderImage.height * BIKE_SCALE;
    
    ctx.drawImage(
      riderImage, 
      -FRAME_SHIFT_X + (bikeW * 0.3), 
      -bikeH + (FRAME_SHIFT_Y * 1.5), 
      rW, 
      rH
    );
}

  ctx.restore();
}

//DRAW COUNTDOWN
function drawCountdown() {
  if (game.phase !== "COUNTDOWN") return;

  const cx = canvas.width / 2;
  const cy = 120; 

  // 1. Draw a dark background box so the lights "pop"
  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  ctx.fillRect(cx - 80, cy - 40, 160, 80);

  // 2. Loop through our 3 steps ("YELLOW", "YELLOW", "GREEN")
  COUNTDOWN_STEPS.forEach((step, i) => {
    // Determine the color of this specific light
    let color = "#222"; // Default "OFF" color (dark gray)

    // Only light up the circle that matches the current game index
    if (i === game.countdownIndex) {
      if (step === "YELLOW") color = "#FFD700"; // Bright Gold
      if (step === "GREEN") color = "#00FF00";  // Neon Green
    }

    // 3. Draw the light circle
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx + (i - 1) * 50, cy, 22, 0, Math.PI * 2);
    ctx.fill();
    
    // 4. Add a white "Active" ring to the light that is currently on
    if (i === game.countdownIndex) {
      ctx.strokeStyle = "white";
      ctx.lineWidth = 4;
      ctx.stroke();
    }
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
