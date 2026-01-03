const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
canvas.style.touchAction = "none";

const bikeImage = new Image();
bikeImage.src = "./assets/bike/ninja-h2r-2.png";
const wheelImage = new Image();
wheelImage.src = "./assets/bike/biketire.png";
const riderImage = new Image();
riderImage.src = "./assets/bike/bikerider.png";

// ===== Balanced Scaling =====
const BIKE_SCALE = 0.12; // Scaled down for more reaction time
let bikeReady = false;
bikeImage.onload = () => { bikeReady = true; };

// Physics Constants
const MAX_SPEED = 140;
const CRASH_ANGLE = 1.7; // Allows slightly past 90 degrees
const BALANCE_POINT = 1.2; // Point where gravity feels lighter

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resize();
window.addEventListener("resize", resize);

// ===== Game State =====
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
  fingerDown: false
};

const COUNTDOWN_STEPS = ["YELLOW", "YELLOW", "GREEN"];

// Dynamically calculated positions
const ROAD_HEIGHT = () => canvas.height * 0.22; // Thinner road = more distant look
const ROAD_Y = () => canvas.height - ROAD_HEIGHT() - 20;

// ===== Input =====
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
    const y = e.touches[0].clientY;
    game.lane = y < canvas.height / 2 ? 0 : 1;
}, { passive: false });

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

// ===== Physics Update =====
function update(now) {
  if (game.phase === "COUNTDOWN") { updateCountdown(now); return; }
  if (game.phase !== "RACING") return;

  // Acceleration
  if (game.throttle) game.speed += 0.5;
  else game.speed -= 0.7;
  game.speed = Math.max(0, Math.min(game.speed, MAX_SPEED));

  // WHEELIE PHYSICS REFINED
  let torque = 0;
  // Rule: No wheelies below 20mph
  if (game.speed > 20 && game.throttle) {
    // Torque builds with speed for a smooth power wheelie
    const speedFactor = game.speed / MAX_SPEED;
    torque = 0.0035 * speedFactor;
  }

  game.bikeAngularVelocity += torque;

  // Gravity
  if (game.bikeAngle > 0) {
    let gravityForce = 0.0015 + (game.bikeAngle * 0.015);
    // Past balance point, bike gets "tippy"
    if (game.bikeAngle > BALANCE_POINT) gravityForce *= 0.5;
    game.bikeAngularVelocity -= gravityForce;
  }

  // Damping & Application
  game.bikeAngularVelocity *= 0.98;
  game.bikeAngle += game.bikeAngularVelocity;
  game.scroll -= game.speed;

  // Ground Check
  if (game.bikeAngle < 0) {
    game.bikeAngle = 0;
    game.bikeAngularVelocity = 0;
  }

  // Crash Logic
  if (game.bikeAngle > CRASH_ANGLE) resetGame();
}

// ===== Render =====
function drawSky() {
  ctx.fillStyle = "#6db3f2";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawEnvironment() {
  const horizonY = ROAD_Y() - 100;

  // Grass (The floor for the grandstands)
  ctx.fillStyle = "#2e7d32";
  ctx.fillRect(0, horizonY, canvas.width, 100);

  // 1. Distant Grandstands (Now Sitting on the Grass)
  const standSpacing = 900;
  const standOffset = (game.scroll * 0.15) % standSpacing;
  for (let i = -1; i < (canvas.width / standSpacing) + 1; i++) {
    let x = i * standSpacing + standOffset;
    ctx.fillStyle = "#4a4a4a"; 
    ctx.fillRect(x, horizonY - 110, 500, 110); // Anchored to horizonY
    ctx.fillStyle = "#222"; // Crowd Area
    ctx.fillRect(x + 20, horizonY - 90, 460, 50);
    ctx.fillStyle = "#2c3e50"; // Roof
    ctx.fillRect(x - 10, horizonY - 120, 520, 12);
  }

  // 2. Track Wall
  ctx.fillStyle = "#95a5a6"; 
  const wallOffset = (game.scroll * 0.4) % 200;
  for (let i = -1; i < (canvas.width / 200) + 1; i++) {
    let x = i * 200 + wallOffset;
    ctx.fillRect(x, ROAD_Y() - 30, 195, 30);
    ctx.fillStyle = i % 2 === 0 ? "#e74c3c" : "#ecf0f1";
    ctx.fillRect(x, ROAD_Y() - 30, 195, 6);
  }

  // 3. Track Surface
  ctx.fillStyle = "#2c3e50";
  ctx.fillRect(0, ROAD_Y(), canvas.width, ROAD_HEIGHT());

  // 4. Track Stripes (Dashed Lines)
  drawRoadLines();
}

function drawRoadLines() {
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 4;
  const total = 100;
  const offset = game.scroll % total;
  ctx.setLineDash([60, 40]);
  ctx.lineDashOffset = -offset;
  ctx.beginPath();
  ctx.moveTo(0, ROAD_Y() + ROAD_HEIGHT() / 2);
  ctx.lineTo(canvas.width, ROAD_Y() + ROAD_HEIGHT() / 2);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawBike() {
  if (!bikeReady) return;
  const laneOffset = (game.lane === 0 ? 0.3 : 0.7);
  const groundY = ROAD_Y() + ROAD_HEIGHT() * laneOffset;
  const rearGroundX = canvas.width * 0.15; 

  const bikeW = bikeImage.width * BIKE_SCALE;
  const bikeH = bikeImage.height * BIKE_SCALE;
  const wheelSize = bikeH * 0.48;

  ctx.save(); 
    ctx.translate(rearGroundX, groundY);
    ctx.rotate(-game.bikeAngle);
    
    // Wheels
    ctx.save(); ctx.rotate(game.scroll * 0.1); ctx.drawImage(wheelImage, -wheelSize/2, -wheelSize/2, wheelSize, wheelSize); ctx.restore();
    ctx.save(); ctx.translate(bikeW * 0.65, 0); ctx.rotate(game.scroll * 0.1); ctx.drawImage(wheelImage, -wheelSize/2, -wheelSize/2, wheelSize, wheelSize); ctx.restore();

    // Frame
    ctx.drawImage(bikeImage, -(bikeW * 0.22), -bikeH + (bikeH * 0.15), bikeW, bikeH);

    // Rider
    if (riderImage.complete) {
        const rW = riderImage.width * (BIKE_SCALE * 0.75);
        const rH = riderImage.height * (BIKE_SCALE * 0.75);
        const speedTuck = (game.speed / MAX_SPEED) * 12;
        const wheelieLean = game.bikeAngle * 20;

        ctx.drawImage(
          riderImage, 
          -(bikeW * 0.1) + speedTuck - wheelieLean, 
          -bikeH + (bikeH * 0.08), 
          rW, 
          rH
        );
    }
  ctx.restore(); 
}

function drawCountdown() {
  if (game.phase !== "COUNTDOWN") return;
  const cx = canvas.width / 2;
  ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
  ctx.fillRect(cx - 90, 80, 180, 90);
  COUNTDOWN_STEPS.forEach((step, i) => {
    ctx.fillStyle = (i === game.countdownIndex) ? (step === "GREEN" ? "#2ecc71" : "#f1c40f") : "#333";
    ctx.beginPath(); ctx.arc(cx + (i - 1) * 60, 125, 22, 0, Math.PI * 2); ctx.fill();
  });
}

function drawHUD() {
  ctx.fillStyle = "white";
  ctx.font = "bold 20px sans-serif";
  if (game.phase === "IDLE") {
    ctx.textAlign = "center";
    ctx.fillText("TAP TO START", canvas.width / 2, 60);
  }
  if (game.phase === "RACING") {
    ctx.textAlign = "left";
    ctx.fillText(`SPEED: ${game.speed.toFixed(0)} MPH`, 25, 40);
  }
}

function resetGame() {
  game.phase = "IDLE";
  game.speed = 0;
  game.bikeAngle = 0;
  game.bikeAngularVelocity = 0;
}

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

