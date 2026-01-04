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

// Scale reduced for better reaction time (dodge/collect)
const BIKE_SCALE = 0.10; 
let bikeReady = false;
bikeImage.onload = () => { bikeReady = true; };

// Physics Constants
const MAX_SPEED = 140;
const CRASH_ANGLE = 1.9; // Allows leaning further back
const BALANCE_POINT = 1.25;

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

// Lowered the road to provide more screen space for the environment
const ROAD_HEIGHT = () => canvas.height * 0.22;
const ROAD_Y = () => canvas.height - ROAD_HEIGHT() - 20;

// Input Logic
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

  if (game.throttle) game.speed += 0.45; // Smoother acceleration
  else game.speed -= 0.6;
  game.speed = Math.max(0, Math.min(game.speed, MAX_SPEED));

  // Power Wheelie: Torque kicks in after 20mph
  let torque = 0;
  if (game.speed > 20 && game.throttle) {
    const powerCurve = game.speed / MAX_SPEED;
    torque = 0.0038 * powerCurve; 
  }
  game.bikeAngularVelocity += torque;

  // Gravity with a "Tippy" Balance Point
  if (game.bikeAngle > 0) {
    let gravity = 0.0022 + (game.bikeAngle * 0.02);
    if (game.bikeAngle > BALANCE_POINT) gravity *= 0.45; // Floatier at height
    game.bikeAngularVelocity -= gravity;
  }

  game.bikeAngularVelocity *= 0.975;
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
  
  // Grass (The floor for grandstands)
  ctx.fillStyle = "#2e7d32";
  ctx.fillRect(0, hY - 100, canvas.width, 100);

  // Grandstands & Crowd
  const standSpacing = 1000;
  const standOffset = (game.scroll * 0.15) % standSpacing;
  for (let i = -1; i < (canvas.width / standSpacing) + 1; i++) {
    let x = i * standSpacing + standOffset;
    ctx.fillStyle = "#444"; 
    ctx.fillRect(x, hY - 115, 600, 115);
    ctx.fillStyle = "#111"; // Audience tunnel
    ctx.fillRect(x + 20, hY - 95, 560, 60);
    
    // Tiny crowd dots
    const colors = ["#ff5555", "#55ff55", "#5555ff", "#ffffff"];
    for(let j=0; j<20; j++) {
        ctx.fillStyle = colors[j%4];
        ctx.fillRect(x + 30 + (j*25), hY-85, 8, 10);
    }
  }

  // Track Wall
  ctx.fillStyle = "#888";
  const wallOffset = (game.scroll * 0.4) % 250;
  for (let i = -1; i < (canvas.width / 250) + 1; i++) {
    let x = i * 250 + wallOffset;
    ctx.fillRect(x, hY - 35, 240, 35);
    ctx.fillStyle = i % 2 === 0 ? "#e74c3c" : "#f5f5f5";
    ctx.fillRect(x, hY - 35, 240, 8);
  }

  // Road
  ctx.fillStyle = "#222d3a";
  ctx.fillRect(0, hY, canvas.width, ROAD_HEIGHT() + 40);

  // Dashed Center Lines
  ctx.strokeStyle = "rgba(255,255,255,0.8)";
  ctx.lineWidth = 5;
  ctx.setLineDash([80, 50]);
  ctx.lineDashOffset = -(game.scroll % 130);
  ctx.beginPath();
  ctx.moveTo(0, hY + ROAD_HEIGHT()/2);
  ctx.lineTo(canvas.width, hY + ROAD_HEIGHT()/2);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawBike() {
  if (!bikeReady) return;
  const laneFactor = (game.lane === 0 ? 0.35 : 0.75);
  const groundY = ROAD_Y() + (ROAD_HEIGHT() * laneFactor);
  const rearX = canvas.width * 0.18;

  const bW = bikeImage.width * BIKE_SCALE;
  const bH = bikeImage.height * BIKE_SCALE;
  const wSize = bH * 0.48;

  ctx.save();
    ctx.translate(rearX, groundY);
    ctx.rotate(-game.bikeAngle);

    // Front/Rear Wheels
    ctx.save(); 
      ctx.rotate(game.scroll * 0.1); 
      ctx.drawImage(wheelImage, -wSize/2, -wSize/2, wSize, wSize); 
    ctx.restore();
    
    ctx.save(); 
      ctx.translate(bW * 0.68, 0); 
      ctx.rotate(game.scroll * 0.1); 
      ctx.drawImage(wheelImage, -wSize/2, -wSize/2, wSize, wSize); 
    ctx.restore();

    // Bike Body
    ctx.drawImage(bikeImage, -(bW * 0.22), -bH + (bH * 0.15), bW, bH);

    // Rider
    if (riderImage.complete && riderImage.naturalWidth > 0) {
        const rW = riderImage.width * (BIKE_SCALE * 0.78);
        const rH = riderImage.height * (BIKE_SCALE * 0.78);
        const tuck = (game.speed / MAX_SPEED) * 15;
        const lean = game.bikeAngle * 25;
        
        ctx.drawImage(riderImage, -(bW * 0.1) + tuck - lean, -bH + (bH * 0.05), rW, rH);
    }
  ctx.restore();
}

function drawCountdown() {
  if (game.phase !== "COUNTDOWN") return;
  const cx = canvas.width / 2;
  const cy = canvas.height / 3;
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.roundRect ? ctx.fillRoundRect(cx - 100, cy - 50, 200, 100, 10) : ctx.fillRect(cx - 100, cy - 50, 200, 100);
  
  COUNTDOWN_STEPS.forEach((step, i) => {
    ctx.fillStyle = (i === game.countdownIndex) ? (step === "GREEN" ? "#2ecc71" : "#f1c40f") : "#333";
    ctx.beginPath(); ctx.arc(cx + (i - 1) * 60, cy, 22, 0, Math.PI * 2); ctx.fill();
  });
}

function drawHUD() {
  ctx.fillStyle = "white";
  ctx.font = "bold 24px Arial";
  if (game.phase === "IDLE") {
    ctx.textAlign = "center";
    ctx.fillText("TAP TO RACE", canvas.width/2, 80);
  }
  if (game.phase === "RACING") {
    ctx.textAlign = "left";
    ctx.fillText(`MPH: ${Math.floor(game.speed)}`, 30, 50);
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
  ctx.clearRect(0, 0, canvas.width, canvas.height); // Crucial for fixing the "blue strip"
  drawSky();
  drawEnvironment();
  drawBike();
  drawCountdown();
  drawHUD();
  requestAnimationFrame(loop);
}
loop(performance.now());
