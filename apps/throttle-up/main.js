const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
canvas.style.touchAction = "none";

// ===== Image Loading =====
const bikeImage = new Image();
bikeImage.src = "./assets/bike/ninja-h2r-2.png";
const wheelImage = new Image();
wheelImage.src = "./assets/bike/biketire.png";
const riderImage = new Image();
riderImage.src = "./assets/bike/bike-rider.png";

// 1. SCALED UP BIKE (Increased for better presence)
const BIKE_SCALE = 0.13; 
let bikeReady = false;
bikeImage.onload = () => { bikeReady = true; };

// ===== Constants =====
const MAX_SPEED = 140;
const CRASH_ANGLE = 2.2; 
const BALANCE_POINT = 1.4; 

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

// 2. DISTANT PERSPECTIVE (Road height reduced to make it look further away)
const ROAD_HEIGHT = () => canvas.height * 0.14; 
const ROAD_Y = () => canvas.height - ROAD_HEIGHT() - 40;

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resize();
window.addEventListener("resize", resize);

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

function update(now) {
  if (game.phase === "COUNTDOWN") {
    if (now - game.countdownTimer > 800) {
      game.countdownIndex++;
      game.countdownTimer = now;
      if (game.countdownIndex >= COUNTDOWN_STEPS.length) {
        game.phase = "RACING";
        if (game.fingerDown) game.throttle = true;
      }
    }
    return;
  }
  if (game.phase !== "RACING") return;

  if (game.throttle) game.speed += 0.45;
  else game.speed -= 0.6;
  game.speed = Math.max(0, Math.min(game.speed, MAX_SPEED));

  let torque = 0;
  if (game.speed > 20 && game.throttle) {
    torque = 0.004 * (game.speed / MAX_SPEED);
  }
  game.bikeAngularVelocity += torque;

  if (game.bikeAngle > 0) {
    let gravity = 0.0025 + (game.bikeAngle * 0.02);
    if (game.bikeAngle > BALANCE_POINT) gravity *= 0.4;
    game.bikeAngularVelocity -= gravity;
  }

  game.bikeAngularVelocity *= 0.98;
  game.bikeAngle += game.bikeAngularVelocity;
  game.scroll -= game.speed;

  if (game.bikeAngle < 0) { game.bikeAngle = 0; game.bikeAngularVelocity = 0; }
  if (game.bikeAngle > CRASH_ANGLE) resetGame();
}

// ===== Rendering =====
function drawEnvironment() {
  const hY = ROAD_Y();
  
  // Sky
  ctx.fillStyle = "#6db3f2";
  ctx.fillRect(0, 0, canvas.width, hY);
  
  // Grass (Higher to fill the gap of the distant road)
  ctx.fillStyle = "#2e7d32";
  ctx.fillRect(0, hY - 150, canvas.width, 150);

  // Grandstands (Anchored to the grass horizon)
  const standOffset = (game.scroll * 0.15) % 1200;
  for (let i = -1; i < (canvas.width / 1200) + 1; i++) {
    let x = i * 1200 + standOffset;
    ctx.fillStyle = "#444"; 
    ctx.fillRect(x, hY - 110, 700, 110);
    ctx.fillStyle = "#111";
    ctx.fillRect(x + 25, hY - 90, 650, 45);
  }

  // Road Surface
  ctx.fillStyle = "#222d3a";
  ctx.fillRect(0, hY, canvas.width, canvas.height - hY);

  // Dash Lines (Adjusted for distant perspective)
  ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
  ctx.lineWidth = 3; 
  ctx.setLineDash([100, 60]);
  ctx.lineDashOffset = -(game.scroll % 160);
  ctx.beginPath();
  ctx.moveTo(0, hY + ROAD_HEIGHT()/2);
  ctx.lineTo(canvas.width, hY + ROAD_HEIGHT()/2);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawBike() {
  if (!bikeReady) return;
  const laneFactor = (game.lane === 0 ? 0.25 : 0.75);
  const groundY = ROAD_Y() + (ROAD_HEIGHT() * laneFactor);
  const rearX = canvas.width * 0.2; 

  const bW = bikeImage.width * BIKE_SCALE;
  const bH = bikeImage.height * BIKE_SCALE;
  const wSize = bH * 0.48;

  ctx.save();
    ctx.translate(rearX, groundY);
    ctx.rotate(-game.bikeAngle);

    // Wheels
    ctx.save(); ctx.rotate(game.scroll * 0.1); ctx.drawImage(wheelImage, -wSize/2, -wSize/2, wSize, wSize); ctx.restore();
    ctx.save(); ctx.translate(bW * 0.68, 0); ctx.rotate(game.scroll * 0.1); ctx.drawImage(wheelImage, -wSize/2, -wSize/2, wSize, wSize); ctx.restore();

    // Bike Frame
    ctx.drawImage(bikeImage, -(bW * 0.22), -bH + (bH * 0.15), bW, bH);

    // Rider
    if (riderImage.complete) {
        const rW = bW * 0.88;
        const rH = bH * 0.88;
        const tuck = (game.speed / MAX_SPEED) * 15;
        const lean = game.bikeAngle * 25;
        ctx.drawImage(riderImage, -(bW * 0.1) + tuck - lean, -bH - (bH * 0.02), rW, rH);
    }
  ctx.restore();
}

function resetGame() {
  game.phase = "IDLE";
  game.speed = 0;
  game.bikeAngle = 0;
  game.bikeAngularVelocity = 0;
}

function loop(now) {
  update(now);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawEnvironment();
  drawBike();
  
  if (game.phase === "COUNTDOWN") {
    const cx = canvas.width / 2;
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(cx - 100, 100, 200, 100);
    COUNTDOWN_STEPS.forEach((step, i) => {
      ctx.fillStyle = (i === game.countdownIndex) ? (step === "GREEN" ? "#2ecc71" : "#f1c40f") : "#333";
      ctx.beginPath(); ctx.arc(cx + (i - 1) * 60, 150, 20, 0, Math.PI * 2); ctx.fill();
    });
  }

  ctx.fillStyle = "white";
  ctx.font = "bold 20px Arial";
  if (game.phase === "IDLE") {
      ctx.textAlign = "center";
      ctx.fillText("TAP TO START", canvas.width/2, 50);
  }
  if (game.phase === "RACING") {
      ctx.textAlign = "left";
      ctx.fillText(`MPH: ${Math.floor(game.speed)}`, 20, 40);
  }

  requestAnimationFrame(loop);
}
loop(performance.now());

