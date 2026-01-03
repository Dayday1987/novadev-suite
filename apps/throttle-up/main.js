const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
canvas.style.touchAction = "none";

// Images
const bikeImage = new Image();
bikeImage.src = "./assets/bike/ninja-h2r-2.png";
const wheelImage = new Image();
wheelImage.src = "./assets/bike/biketire.png";
const riderImage = new Image();
riderImage.src = "./assets/bike/bikerider.png";

const BIKE_SCALE = 0.12; 
let bikeReady = false;
bikeImage.onload = () => { bikeReady = true; };

// Physics Constants
const MAX_SPEED = 140;
const CRASH_ANGLE = 1.8; 
const BALANCE_POINT = 1.3;

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resize();
window.addEventListener("resize", resize);

// Game State
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
const ROAD_HEIGHT = () => canvas.height * 0.25;
const ROAD_Y = () => canvas.height - ROAD_HEIGHT() - 40;

// Input
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

function update(now) {
  if (game.phase === "COUNTDOWN") { updateCountdown(now); return; }
  if (game.phase !== "RACING") return;

  if (game.throttle) game.speed += 0.5;
  else game.speed -= 0.7;
  game.speed = Math.max(0, Math.min(game.speed, MAX_SPEED));

  // Refined Wheelie: No lift until 20mph
  let torque = 0;
  if (game.speed > 20 && game.throttle) {
    const speedFactor = game.speed / MAX_SPEED;
    torque = 0.0035 * speedFactor;
  }
  game.bikeAngularVelocity += torque;

  if (game.bikeAngle > 0) {
    let gravityForce = 0.002 + (game.bikeAngle * 0.018);
    if (game.bikeAngle > BALANCE_POINT) gravityForce *= 0.4; // Tippy zone
    game.bikeAngularVelocity -= gravityForce;
  }

  game.bikeAngularVelocity *= 0.98;
  game.bikeAngle += game.bikeAngularVelocity;
  game.scroll -= game.speed;

  if (game.bikeAngle < 0) {
    game.bikeAngle = 0;
    game.bikeAngularVelocity = 0;
  }
  if (game.bikeAngle > CRASH_ANGLE) resetGame();
}

// Rendering
function drawSky() {
  ctx.fillStyle = "#6db3f2";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawEnvironment() {
  const hY = ROAD_Y();
  
  // Grass
  ctx.fillStyle = "#2e7d32";
  ctx.fillRect(0, hY - 100, canvas.width, 100);

  // Grandstands
  const standSpacing = 900;
  const standOffset = (game.scroll * 0.15) % standSpacing;
  for (let i = -1; i < (canvas.width / standSpacing) + 1; i++) {
    let x = i * standSpacing + standOffset;
    ctx.fillStyle = "#4a4a4a"; 
    ctx.fillRect(x, hY - 110, 500, 110);
    ctx.fillStyle = "#222";
    ctx.fillRect(x + 20, hY - 90, 460, 50);
  }

  // Wall
  ctx.fillStyle = "#95a5a6";
  const wallOffset = (game.scroll * 0.4) % 200;
  for (let i = -1; i < (canvas.width / 200) + 1; i++) {
    let x = i * 200 + wallOffset;
    ctx.fillRect(x, hY - 30, 195, 30);
    ctx.fillStyle = i % 2 === 0 ? "#e74c3c" : "#ecf0f1";
    ctx.fillRect(x, hY - 30, 195, 6);
  }

  // Road
  ctx.fillStyle = "#2c3e50";
  ctx.fillRect(0, hY, canvas.width, ROAD_HEIGHT() + 40);

  // Lines
  ctx.strokeStyle = "white";
  ctx.lineWidth = 4;
  ctx.setLineDash([60, 40]);
  ctx.lineDashOffset = -(game.scroll % 100);
  ctx.beginPath();
  ctx.moveTo(0, hY + ROAD_HEIGHT()/2);
  ctx.lineTo(canvas.width, hY + ROAD_HEIGHT()/2);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawBike() {
  if (!bikeReady) return;
  const lanePos = (game.lane === 0 ? 0.3 : 0.7);
  const groundY = ROAD_Y() + (ROAD_HEIGHT() * lanePos);
  const rearX = canvas.width * 0.15;

  const bW = bikeImage.width * BIKE_SCALE;
  const bH = bikeImage.height * BIKE_SCALE;
  const wSize = bH * 0.48;

  ctx.save();
    ctx.translate(rearX, groundY);
    ctx.rotate(-game.bikeAngle);

    // Wheels
    ctx.save(); ctx.rotate(game.scroll * 0.1); ctx.drawImage(wheelImage, -wSize/2, -wSize/2, wSize, wSize); ctx.restore();
    ctx.save(); ctx.translate(bW * 0.65, 0); ctx.rotate(game.scroll * 0.1); ctx.drawImage(wheelImage, -wSize/2, -wSize/2, wSize, wSize); ctx.restore();

    // Bike
    ctx.drawImage(bikeImage, -(bW * 0.22), -bH + (bH * 0.15), bW, bH);

    // Rider
    if (riderImage.complete) {
        const rW = riderImage.width * (BIKE_SCALE * 0.75);
        const rH = riderImage.height * (BIKE_SCALE * 0.75);
        const tuck = (game.speed / MAX_SPEED) * 12;
        const lean = game.bikeAngle * 20;
        ctx.drawImage(riderImage, -(bW * 0.1) + tuck - lean, -bH + (bH * 0.08), rW, rH);
    }
  ctx.restore();
}

function drawCountdown() {
  if (game.phase !== "COUNTDOWN") return;
  const cx = canvas.width / 2;
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(cx - 100, 50, 200, 100);
  COUNTDOWN_STEPS.forEach((step, i) => {
    ctx.fillStyle = (i === game.countdownIndex) ? (step === "GREEN" ? "#2ecc71" : "#f1c40f") : "#333";
    ctx.beginPath(); ctx.arc(cx + (i - 1) * 60, 100, 20, 0, Math.PI * 2); ctx.fill();
  });
}

function drawHUD() {
  ctx.fillStyle = "white";
  ctx.font = "20px Arial";
  if (game.phase === "IDLE") ctx.fillText("TAP TO RACE", canvas.width/2 - 60, 40);
  if (game.phase === "RACING") ctx.fillText(`MPH: ${Math.floor(game.speed)}`, 20, 40);
}

function resetGame() {
  game.phase = "IDLE";
  game.speed = 0;
  game.bikeAngle = 0;
  game.bikeAngularVelocity = 0;
}

function loop(now) {
  update(now);
  ctx.clearRect(0,0,canvas.width, canvas.height); // Fresh start every frame
  drawSky();
  drawEnvironment();
  drawBike();
  drawCountdown();
  drawHUD();
  requestAnimationFrame(loop);
}
loop(performance.now());

