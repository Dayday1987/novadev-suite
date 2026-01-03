const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
canvas.style.touchAction = "none";

const bikeImage = new Image();
bikeImage.src = "./assets/bike/ninja-h2r-2.png";
const wheelImage = new Image();
wheelImage.src = "./assets/bike/biketire.png";
const riderImage = new Image();
riderImage.src = "./assets/bike/bikerider.png"; // Fixed filename here

const BIKE_SCALE = 0.15;
let bikeReady = false;

const CRASH_ANGLE = 1.6; 
const BALANCE_ANGLE = 1.45; 

bikeImage.onload = () => { bikeReady = true; };

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resize();
window.addEventListener("resize", resize);

// ===== Constants & State =====
const ROAD_HEIGHT = () => canvas.height * 0.28;
const ROAD_Y = () => canvas.height - ROAD_HEIGHT();
const LANE_COUNT = 2;
const MAX_SPEED = 120; 

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
  hasLifted: false,
};

const COUNTDOWN_STEPS = ["YELLOW", "YELLOW", "GREEN"];

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

  if (game.throttle) game.speed += 0.6;
  else game.speed -= 0.8; 
  game.speed = Math.max(0, Math.min(game.speed, MAX_SPEED));

  let torque = 0;
  if (game.speed > 10) { 
    if (game.throttle) {
      if (!game.hasLifted) { game.bikeAngularVelocity += 0.055; game.hasLifted = true; }
      torque = 0.0038 * (game.speed / 40);
    }
  }
  game.bikeAngularVelocity += torque;

  let gravity = 0;
  if (game.bikeAngle > 0) {
    gravity = 0.001 + (game.bikeAngle * 0.038);
    if (game.bikeAngle > BALANCE_ANGLE) gravity *= 0.6; 
  }
  game.bikeAngularVelocity -= gravity;
  game.bikeAngularVelocity *= 0.975;
  game.bikeAngle += game.bikeAngularVelocity;
  game.scroll -= game.speed;

  if (game.bikeAngle < 0) {
    game.bikeAngle = 0;
    game.bikeAngularVelocity = 0;
    game.hasLifted = false;
  }
  if (game.bikeAngle > CRASH_ANGLE) resetGame();
}

// ===== Render =====
// ===== Render =====
function drawSky() {
  ctx.fillStyle = "#6db3f2";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawEnvironment() {
  const horizonY = ROAD_Y() - 100;

  // 1. Distant Grandstands & Crowd
  const standSpacing = 800;
  const standOffset = (game.scroll * 0.15) % standSpacing;
  
  for (let i = -1; i < (canvas.width / standSpacing) + 1; i++) {
    let x = i * standSpacing + standOffset;
    
    ctx.fillStyle = "#4a4a4a"; 
    ctx.fillRect(x, horizonY - 120, 500, 120);
    
    ctx.fillStyle = "#222";
    ctx.fillRect(x + 20, horizonY - 100, 460, 60);

    const colors = ["#e74c3c", "#3498db", "#f1c40f", "#ecf0f1"];
    for (let dot = 0; dot < 40; dot++) {
      ctx.fillStyle = colors[dot % 4];
      ctx.fillRect(x + 30 + (dot * 11), horizonY - 90 + (dot % 3 * 5), 6, 8);
    }
    
    ctx.fillStyle = "#2c3e50";
    ctx.fillRect(x - 10, horizonY - 130, 520, 15);
  }

  // 2. Concrete Track Wall
  ctx.fillStyle = "#95a5a6"; 
  const wallOffset = (game.scroll * 0.4) % 200;
  for (let i = -1; i < (canvas.width / 200) + 1; i++) {
    let x = i * 200 + wallOffset;
    ctx.fillRect(x, ROAD_Y() - 35, 190, 35);
    ctx.fillStyle = i % 2 === 0 ? "#e74c3c" : "#ecf0f1";
    ctx.fillRect(x, ROAD_Y() - 35, 190, 8);
  }

  // 3. Track Surface
  ctx.fillStyle = "#2c3e50";
  ctx.fillRect(0, ROAD_Y(), canvas.width, ROAD_HEIGHT());

  // 4. Hay Bales
  const baleOffset = game.scroll % 400;
  for (let i = -1; i < (canvas.width / 400) + 1; i++) {
    let x = i * 400 + baleOffset;
    ctx.fillStyle = "#f1c40f"; 
    ctx.fillRect(x, ROAD_Y() - 15, 60, 25);
    ctx.strokeStyle = "#9a7d0a";
    ctx.strokeRect(x, ROAD_Y() - 15, 60, 25);
  }

  drawRoadLines();
}

function drawRoadLines() {
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 4;
  const dashLength = 60, gap = 40;
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

function drawBike() {
  if (!bikeReady) return;
  const groundY = ROAD_Y() + (ROAD_HEIGHT() / 2) * (game.lane === 0 ? 0.5 : 1.5);
  const rearGroundX = canvas.width * 0.18; 
  const bikeW = bikeImage.width * BIKE_SCALE;
  const bikeH = bikeImage.height * BIKE_SCALE;
  const wheelSize = bikeH * 0.50; 

  ctx.save(); 
    ctx.translate(rearGroundX, groundY);
    ctx.rotate(-game.bikeAngle);
    
    // Wheels
    ctx.save(); ctx.rotate(game.scroll * 0.1); ctx.drawImage(wheelImage, -wheelSize/2, -wheelSize/2, wheelSize, wheelSize); ctx.restore();
    ctx.save(); ctx.translate(bikeW * 0.68, 0); ctx.rotate(game.scroll * 0.1); ctx.drawImage(wheelImage, -wheelSize/2, -wheelSize/2, wheelSize, wheelSize); ctx.restore();

    // Frame
    ctx.drawImage(bikeImage, -(bikeW * 0.22), -bikeH + (bikeH * 0.18), bikeW, bikeH);

    // Rider
    if (riderImage.complete && riderImage.naturalWidth > 0) {
        const rW = riderImage.width * (BIKE_SCALE * 0.75);
        const rH = riderImage.height * (BIKE_SCALE * 0.75);
        const speedTuck = (game.speed / MAX_SPEED) * 15;
        const wheelieLean = game.bikeAngle * 25; 

        ctx.drawImage(
          riderImage, 
          -(bikeW * 0.12) + speedTuck - wheelieLean, 
          -bikeH + (bikeH * 0.08) + (speedTuck * 0.3), 
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
  game.phase = "IDLE"; game.speed = 0; game.scroll = 0;
  game.bikeAngle = 0; game.bikeAngularVelocity = 0;
  game.throttle = false; game.hasLifted = false;
}

function loop(now) {
  update(now);
  ctx.setLineDash([]);
  drawSky();
  drawEnvironment();
  drawBike();
  drawCountdown();
  drawHUD();
  requestAnimationFrame(loop);
}
loop(performance.now());


