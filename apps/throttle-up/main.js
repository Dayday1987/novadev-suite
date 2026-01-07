const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// =====================
// LOAD IMAGES (Updated Paths)
// =====================
const bikeImage = new Image(); bikeImage.src = "assets/bike/ninja-h2r-2.png";
const wheelImage = new Image(); wheelImage.src = "assets/bike/biketire.png";
const riderImage = new Image(); riderImage.src = "assets/bike/bike-rider.png";

// =====================
// CONSTANTS & STATE
// =====================
const BIKE_SCALE = 0.15;
const MAX_SPEED = 15;
const BALANCE_POINT = 1.25;
const CRASH_ANGLE = 1.9;

const game = {
  phase: "IDLE",
  speed: 0,
  scroll: 0,
  bikeAngle: 0,
  bikeAngularVelocity: 0,
  throttle: false,
  countdownIndex: 0,
  countdownTimer: 0
};

const overlay = document.getElementById("countdownOverlay");
const lights = [
  document.getElementById("lightYellow1"),
  document.getElementById("lightYellow2"),
  document.getElementById("lightGreen")
];

// =====================
// CORE LOGIC
// =====================
function resize() {
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
}
window.addEventListener("resize", resize);
resize();

function startCountdown() {
  game.phase = "COUNTDOWN";
  game.countdownIndex = 0;
  game.countdownTimer = Date.now();
  overlay.hidden = false;
  lights.forEach(l => l.classList.remove("active"));
}

function updateCountdown() {
  const now = Date.now();
  if (now - game.countdownTimer > 800) {
    if (game.countdownIndex < 3) {
      lights[game.countdownIndex].classList.add("active");
      game.countdownIndex++;
      game.countdownTimer = now;
    } else {
      overlay.hidden = true;
      game.phase = "RACING";
    }
  }
}

// =====================
// INPUT
// =====================
canvas.addEventListener("touchstart", (e) => {
  e.preventDefault();
  if (game.phase === "IDLE") startCountdown();
  if (game.phase === "RACING") game.throttle = true;
});

canvas.addEventListener("touchend", () => {
  game.throttle = false;
});

// =====================
// RENDER LOOP
// =====================
function loop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 1. Draw Environment
  ctx.fillStyle = "#87ceeb"; // Sky
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  const roadY = canvas.height * 0.75;
  const roadH = canvas.height * 0.2;
  
  ctx.fillStyle = "#2d7d32"; // Grass
  ctx.fillRect(0, roadY - 40, canvas.width, 40);
  
  ctx.fillStyle = "#333"; // Road
  ctx.fillRect(0, roadY, canvas.width, roadH);

  // 2. Dash Lines (Fixed visibility)
  ctx.strokeStyle = "rgba(255,255,255,0.8)";
  ctx.setLineDash([30, 30]);
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, roadY + roadH / 2);
  ctx.lineTo(canvas.width, roadY + roadH / 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // 3. Logic
  if (game.phase === "COUNTDOWN") updateCountdown();
  if (game.phase === "RACING") {
    // Basic physics
    if (game.throttle) {
      game.bikeAngularVelocity += 0.005;
      game.speed = Math.min(game.speed + 0.1, MAX_SPEED);
    } else {
      game.bikeAngularVelocity -= 0.008;
      game.speed = Math.max(game.speed - 0.05, 0);
    }
    game.bikeAngle = Math.max(0, game.bikeAngle + game.bikeAngularVelocity);
    game.bikeAngularVelocity *= 0.95; // Friction

    if (game.bikeAngle > CRASH_ANGLE) {
      game.phase = "IDLE";
      game.bikeAngle = 0;
      game.bikeAngularVelocity = 0;
      alert("Crashed!");
    }
  }

  // 4. Draw Bike (Simplified for testing visibility)
  const bX = canvas.width * 0.2;
  const bY = roadY + roadH * 0.4;

  ctx.save();
  ctx.translate(bX, bY);
  ctx.rotate(-game.bikeAngle);

  if (bikeImage.complete) {
    const w = bikeImage.width * BIKE_SCALE;
    const h = bikeImage.height * BIKE_SCALE;
    // Draw rider if loaded
    if(riderImage.complete) ctx.drawImage(riderImage, -w/2, -h, w, h);
    ctx.drawImage(bikeImage, -w/2, -h, w, h);
  } else {
    // Fallback if image path fails
    ctx.fillStyle = "orange";
    ctx.fillRect(-25, -50, 50, 50);
  }
  ctx.restore();

  requestAnimationFrame(loop);
}

loop();

