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

// Slightly adjusted for a more "real" weight on the road
const BIKE_SCALE = 0.11; 
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

// PERSPECTIVE: Lowered slightly from the previous "too high" version
// but kept high enough to show foreground grass.
const ROAD_HEIGHT = () => canvas.height * 0.18; 
const ROAD_Y = () => canvas.height - ROAD_HEIGHT() - (canvas.height * 0.2);

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resize();
window.addEventListener("resize", resize);

// ===== Physics & Update (Same as your stable version) =====
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
  const roadBottom = hY + ROAD_HEIGHT();
  
  // Sky
  ctx.fillStyle = "#6db3f2";
  ctx.fillRect(0, 0, canvas.width, hY);
  
  // Background Grass
  ctx.fillStyle = "#2e7d32";
  ctx.fillRect(0, hY - 120, canvas.width, 120);

  // Grandstands
  const standOffset = (game.scroll * 0.15) % 1500;
  for (let i = -1; i < (canvas.width / 1500) + 1; i++) {
    let x = i * 1500 + standOffset;
    ctx.fillStyle = "#444"; 
    ctx.fillRect(x, hY - 90, 800, 90);
    ctx.fillStyle = "#111";
    ctx.fillRect(x + 30, hY - 75, 740, 40);
  }

  // Road Surface (Darker Asphalt)
  ctx.fillStyle = "#1c252e";
  ctx.fillRect(0, hY, canvas.width, ROAD_HEIGHT());

  // Foreground Grass
  ctx.fillStyle = "#388e3c"; 
  ctx.fillRect(0, roadBottom, canvas.width, canvas.height - roadBottom);

  // Dash Lines (Increased length for "fast" feel)
  ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
  ctx.lineWidth = 4; 
  ctx.setLineDash([120, 80]);
  ctx.lineDashOffset = -(game.scroll % 200);
  ctx.beginPath();
  ctx.moveTo(0, hY + ROAD_HEIGHT()/2);
  ctx.lineTo(canvas.width, hY + ROAD_HEIGHT()/2);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawBike() {
  if (!bikeReady) return;
  const laneFactor = (game.lane === 0 ? 0.3 : 0.7);
  const groundY = ROAD_Y() + (ROAD_HEIGHT() * laneFactor);
  
  // REACTION TIME FIX: Moved rearX back to 12% of screen width 
  // (leaving 88% of the screen for obstacles)
  const rearX = canvas.width * 0.12; 

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
    if (riderImage.complete && riderImage.naturalWidth > 0) {
        const rW = bW * 0.85;
        const rH = bH * 0.85;
        const tuck = (game.speed / MAX_SPEED) * 15;
        const lean = game.bikeAngle * 25;
        ctx.drawImage(riderImage, -(bW * 0.1) + tuck - lean, -bH - (bH * 0.05), rW, rH);
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
  
  // HUD and Countdown logic stays the same...
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
