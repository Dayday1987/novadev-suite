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
riderImage.src = "./assets/bike/bike-rider.png";

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
const MAX_SPEED = 120; 

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


// ===== Update =====
function update(now) {
  // 1. Handle Countdown phase
  if (game.phase === "COUNTDOWN") {
    updateCountdown(now);
    return; // Stop here during countdown
  }

  // 2. Handle Idle/Reset phase
  if (game.phase !== "RACING") return;

  // 3. Acceleration & Speed
  if (game.throttle) {
    game.speed += 0.6;
  } else {
    game.speed -= 0.8; 
  }
  game.speed = Math.max(0, Math.min(game.speed, MAX_SPEED));

  // 4. Wheelie Physics (Starts only above 10mph)
  let torque = 0;
  if (game.speed > 10) { 
    if (game.throttle) {
      // Powerful initial lift (Takeoff)
      if (!game.hasLifted) {
        game.bikeAngularVelocity += 0.055; // Aggressive pop
        game.hasLifted = true;
      }
      // Sustained torque: Strong enough to flip the bike if held
      torque = 0.0038 * (game.speed / 40);
    } else {
      // Let off throttle: Torque drops to zero, gravity takes over
      torque = 0;
    }
  }

  game.bikeAngularVelocity += torque;

  // 5. Gravity (The downward pull)
  let gravity = 0;
  if (game.bikeAngle > 0) {
    // Gravity gets stronger as the bike gets higher
    gravity = 0.001 + (game.bikeAngle * 0.038);
    
    // Danger Zone: Past balance point, gravity "weakens" relative to the bike's tilt
    if (game.bikeAngle > BALANCE_ANGLE) {
      gravity *= 0.6; 
    }
  }
  game.bikeAngularVelocity -= gravity;

  // 6. Damping (Rotational air resistance)
  game.bikeAngularVelocity *= 0.975;

  // 7. Apply Rotation & Movement
  game.bikeAngle += game.bikeAngularVelocity;
  game.scroll -= game.speed;

  // 🛑 GROUND FLOOR: Prevents the front tire from sinking
  if (game.bikeAngle < 0) {
    game.bikeAngle = 0;
    game.bikeAngularVelocity = 0;
    game.hasLifted = false; // Reset so you can pop another wheelie
  }

  // 🛑 CRASH CHECK: If you loop the bike (Backflip)
  if (game.bikeAngle > CRASH_ANGLE) {
    resetGame();
  }
}

// ===== RENDER =====
function drawSky() {
  ctx.fillStyle = "#6db3f2";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

const environmentSettings = {
  grandstandZ: 500, // Deep background
  fenceZ: 100,      // Mid-ground
  trackZ: 0         // Everything else is on the track
};


function drawEnvironment() {
  // Grass
  function drawEnvironment() {
  const horizonY = ROAD_Y() - 100;

  // 1️⃣ BACKGROUND LAYER (Deep Z)
  // Grandstands move at 20% speed to look miles away
  ctx.fillStyle = "#444"; 
  const standSpacing = 600;
  const standOffset = (game.scroll * 0.2) % standSpacing;
  for (let i = -1; i < (canvas.width / standSpacing) + 1; i++) {
    let x = i * standSpacing + standOffset;
    ctx.fillRect(x, horizonY - 80, 400, 80); // Structure
    ctx.fillStyle = "#222";
    ctx.fillRect(x + 20, horizonY - 60, 360, 40); // Seating area
    ctx.fillStyle = "#444";
  }

  // 2️⃣ MID-GROUND LAYER (Medium Z)
  // The wall/fence moves at 50% speed
  ctx.fillStyle = "#888"; 
  const wallOffset = (game.scroll * 0.5) % 200;
  for (let i = -1; i < (canvas.width / 200) + 1; i++) {
    let x = i * 200 + wallOffset;
    ctx.fillRect(x, ROAD_Y() - 25, 195, 25); // Concrete barriers
  }

  // 3️⃣ TRACK LAYER (Surface Z)
  // Road surface
  ctx.fillStyle = "#333";
  ctx.fillRect(0, ROAD_Y(), canvas.width, ROAD_HEIGHT());

  // 4️⃣ FOREGROUND OBJECTS (Closest Z)
  // Hay bales move at 100% speed (same as road)
  const baleSpacing = 300;
  const baleOffset = game.scroll % baleSpacing;
  for (let i = -1; i < (canvas.width / baleSpacing) + 1; i++) {
    let x = i * baleSpacing + baleOffset;
    // Simple 3D "box" look for hay bales
    ctx.fillStyle = "#f1c40f"; // Front face
    ctx.fillRect(x, ROAD_Y() - 20, 50, 30);
    ctx.fillStyle = "#d4ac0d"; // Top face (simulated 3D)
    ctx.beginPath();
    ctx.moveTo(x, ROAD_Y() - 20);
    ctx.lineTo(x + 10, ROAD_Y() - 30);
    ctx.lineTo(x + 60, ROAD_Y() - 30);
    ctx.lineTo(x + 50, ROAD_Y() - 20);
    ctx.fill();
  }

  // 5️⃣ DASHED LINES (Track Surface)
  drawRoadLines();
}

function drawBike() {
  if (!bikeReady) return;

  const laneHeight = ROAD_HEIGHT() / LANE_COUNT;
  const groundY = ROAD_Y() + laneHeight * game.lane + laneHeight / 2;
  const rearGroundX = canvas.width * 0.18; 

  const bikeW = bikeImage.width * BIKE_SCALE;
  const bikeH = bikeImage.height * BIKE_SCALE;
  
  const FRAME_SHIFT_X = bikeW * 0.22; 
  const FRAME_SHIFT_Y = bikeH * 0.18; 
  const WHEELBASE = bikeW * 0.68;
  const wheelSize = bikeH * 0.50; 

  ctx.save(); 
    ctx.translate(rearGroundX, groundY);
    ctx.rotate(-game.bikeAngle);

    // A. REAR TIRE
    ctx.save();
      ctx.rotate(game.scroll * 0.1);
      ctx.drawImage(wheelImage, -wheelSize/2, -wheelSize/2, wheelSize, wheelSize);
    ctx.restore();

    // B. BIKE FRAME
    ctx.drawImage(bikeImage, -FRAME_SHIFT_X, -bikeH + FRAME_SHIFT_Y, bikeW, bikeH);

    // C. FRONT TIRE
    ctx.save();
      ctx.translate(WHEELBASE, 0);
      ctx.rotate(game.scroll * 0.1);
      ctx.drawImage(wheelImage, -wheelSize/2, -wheelSize/2, wheelSize, wheelSize);
    ctx.restore();

    // D. RIDER - Scaled and tucked in
    if (riderImage.complete && riderImage.naturalWidth > 0) {
        // We use a specific multiplier so he stays small even if BIKE_SCALE grows
        const RIDER_SCALE = BIKE_SCALE * 0.72; 
        const rW = riderImage.width * RIDER_SCALE;
        const rH = riderImage.height * RIDER_SCALE;
        
        ctx.drawImage(
          riderImage, 
          -FRAME_SHIFT_X + (bikeW * 0.10), // Horizontal Nudge
          -bikeH - (bikeH * 0.05),        // Seat Height Nudge
          rW, 
          rH
        );
    }
  ctx.restore(); 
}

 // <--- Function correctly closed here

//DRAW COUNTDOWN
function drawCountdown() {
  if (game.phase !== "COUNTDOWN") return;

  const cx = canvas.width / 2;
  const cy = 120; 

  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  ctx.fillRect(cx - 80, cy - 40, 160, 80);

  COUNTDOWN_STEPS.forEach((step, i) => {
    let color = "#222"; 
    if (i === game.countdownIndex) {
      if (step === "YELLOW") color = "#FFD700"; 
      if (step === "GREEN") color = "#00FF00";  
    }

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx + (i - 1) * 50, cy, 22, 0, Math.PI * 2);
    ctx.fill();
    
    if (i === game.countdownIndex) {
      ctx.strokeStyle = "white";
      ctx.lineWidth = 4;
      ctx.stroke();
    }
  });
}

// DRAW HUD
function drawHUD() {
  ctx.fillStyle = "white";
  ctx.font = "bold 20px sans-serif";
  ctx.textAlign = "center"; 

  if (game.phase === "IDLE") {
    ctx.fillText("TAP TO START", canvas.width / 2, 50);
  }

  if (game.phase === "RACING") {
    ctx.textAlign = "left"; 
    ctx.font = "16px sans-serif";
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
// ===== Loop =====
function loop(now) {
  update(now);

  // 1. Reset canvas settings to prevent "squeezed" or dashed UI
  ctx.setLineDash([]);
  ctx.globalAlpha = 1.0;

  // 2. Standard Draw Order
  drawSky();
  drawEnvironment();
  drawBike();
  drawCountdown();
  drawHUD();

  requestAnimationFrame(loop);
}


loop(performance.now());
