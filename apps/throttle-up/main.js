document.addEventListener("DOMContentLoaded", () => {

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// ==========================================
// ASSET LOADING SYSTEM
// ==========================================
const assets = {
  bike: { img: new Image(), loaded: false },
  tire: { img: new Image(), loaded: false },
  rider: { img: new Image(), loaded: false },
};

let assetsLoaded = 0;
const TOTAL_ASSETS = 3;
let gameReady = false;

function loadAssets() {
  loadAsset(assets.bike, "assets/bike/ninja-h2r-2.png");
  loadAsset(assets.tire, "assets/bike/biketire.png");
  loadAsset(assets.rider, "assets/bike/bike-rider.png");
}

function loadAsset(asset, src) {
  asset.img.src = src;
  asset.img.onload = () => {
    asset.loaded = true;
    assetsLoaded++;
    if (assetsLoaded === TOTAL_ASSETS) {
      gameReady = true;
      audio.init();
    }
  };
  asset.img.onerror = () => {
    console.error(`Failed to load: ${src}`);
    alert(`Failed to load game assets. Please refresh the page.`);
  };
}

// ==========================================
// CONFIGURATION
// ==========================================
const CONFIG = {
  bikeScale: 0.15,
  tireSizeMult: 0.6,
  rearWheelOffsetX: 55,
  frameYShift: -35,
  noseDownAngle: 0.01,
  rearTireXShift: -42,
  frontTireX: 0.6,
  maxSpeed: 240,
  acceleration: 45,
  friction: 0.995,
  torque: 10.0,
  gravity: 14,
  damping: 0.96,
  WHEELIE_START_ANGLE: -0.05,
  GROUND_CONTACT_ANGLE: 0.03,
  laneCount: 2,
  roadYPercent: 0.45,
  roadStripHeight: 150,
  BIKE_X_PERCENT: 0.22,
  LANE_SWITCH_SMOOTHING: 0.1,
  RIDER_LEAN_FORWARD: -0.15,
  RIDER_LEAN_BACK: 0.2,
  COUNTDOWN_Y: 60,
  COUNTDOWN_SPACING: 60,
  COUNTDOWN_RADIUS: 15,
  COUNTDOWN_INTERVAL_MS: 800,
};

CONFIG.GEARS = [
  { min: 0, max: 80 },
  { min: 80, max: 110 },
  { min: 110, max: 140 },
  { min: 140, max: 170 },
  { min: 170, max: 198 },
  { min: 198, max: 260 },
];

CONFIG.SHIFT_DELAY = 0.15;

// ==========================================
// GAME STATE
// ==========================================
const game = {
  phase: "IDLE",
  crashing: false,
  speed: 0,
  scroll: 0,
  lane: 1,
  throttle: false,
  countdownIndex: 0,
  countdownTimer: 0,
  launchSmokeTimer: 0,
  bikeAngle: 0,
  bikeAngularVelocity: 0,
  currentY: 0,
  wheelRotation: 0,
  score: 0,
  bestScore: parseInt(localStorage.getItem("throttleUpBest")) || 0,
  inWheelie: false,
  distance: 0,
  dashOffset: 0,
  gear: 1,
  shiftTimer: 0,
  rpm: 0,           // FIX: smoothed 0–1 RPM position within current gear's rev range
};

let width, height, roadYPos;
// FIX: cached header height — read from DOM once in resize(), never during draw loop
let cachedHeaderHeight = 0;
let lastTime = performance.now();
let paused = false;
let squatOffset = 0;
let audioUpdateTimer = 0; // throttle HTMLAudioElement writes to ~10/sec

// FIX: cache DOM elements once — querySelector inside updateUI() every frame causes reflow
const _scoreEl = document.getElementById("score");
const _distanceEl = document.getElementById("distance");
const _highscoreEl = document.getElementById("highscore");
// FIX: track last-written values so we only write when something actually changed
let _lastUIScore = -1;
let _lastUIDistance = -1;

// ==========================================
// AUDIO SYSTEM
// ==========================================
const audio = {
  enabled: true,
  engine: null,

  init() {
    this.enabled = true;
  },

  startEngine() {
  if (!this.enabled) return;

  if (!this.engine) {
    this.engine = new Audio();
    this.engine.src = "assets/audio/engine_loop_mid.mp3";
    this.engine.loop = true;
    this.engine.preload = "auto";

    // Force iOS to actually load it
    this.engine.load();
  }

  if (!this.engine.paused) return;

  this.engine.volume = 0.7;
  this.engine.playbackRate = 0.7;

  this.engine.play().catch((e) =>
    console.warn("Engine play failed:", e)
  );
}

  stopEngine() {
    if (!this.enabled || !this.engine) return;

    this.engine.pause();
    this.engine.currentTime = 0;
  },

  // RPM-driven pitch — game.rpm (0–1) tracks position within the current gear's
  // speed band. Pitch rises as RPM climbs, drops on upshift, spikes on downshift.
  // game.rpm lerps every frame (pure JS). The write to engine.playbackRate is
  // throttled to every 6 frames (≈10/sec) because HTMLAudioElement property writes
  // cross the JS→audio thread boundary and cause micro-stalls at 60/sec (stutter).
  updateEngineSound() {
    if (!this.enabled || !this.engine) return;
    if (game.phase !== "RACING" && game.phase !== "COUNTDOWN") return;

    // Compute where we sit in the current gear's rev range (0 = just shifted in, 1 = redline)
    const gearData = CONFIG.GEARS[game.gear - 1];
    const gearSpan = gearData.max - gearData.min;
    const speedInGear = Math.max(0, game.speed - gearData.min);
    const targetRPM = gearSpan > 0 ? Math.min(speedInGear / gearSpan, 1) : 0;

    // Smooth RPM toward target — faster rise under throttle, slower coast-down.
    // This runs every frame so the value is always accurate for when we do write.
    const lerpRate = game.throttle ? 0.07 : 0.035;
    game.rpm += (targetRPM - game.rpm) * lerpRate;

    // BUG 3 FIX: only write to the HTMLAudioElement every 6 frames.
    // The lerp above keeps game.rpm smooth; the audio thread only needs ~10 updates/sec.
    audioUpdateTimer++;
    if (audioUpdateTimer % 6 !== 0) return;

    // Map RPM to playback rate:
    //   bottom of gear (rpm≈0) → 0.68  (deep, just-shifted note)
    //   top of gear    (rpm≈1) → 1.58  (screaming near redline)
    const targetRate = 0.68 + game.rpm * 0.90;
    this.engine.playbackRate = Math.max(0.5, Math.min(2.0, targetRate));
    this.engine.volume = game.throttle ? 0.88 : 0.55;
  }
};

// ==========================================
// PARTICLE SYSTEM
// ==========================================
const particles = {
  list: [],

  createDust(x, y) {
    for (let i = 0; i < 1; i++) {
      this.list.push({
        x: x + (Math.random() - 0.5) * 8,
        y: y + (Math.random() - 0.5) * 4,
        vx: (Math.random() - 0.5) * 1.5 - game.speed * 0.02,
        vy: -Math.random() * 1.5,
        life: 1.0,
        size: Math.random() * 6 + 6,
        color: "rgba(200,200,200,0.6)",
      });
    }
  },

  createCrashSparks(x, y) {
    for (let i = 0; i < 20; i++) {
      this.list.push({
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10 - 2,
        life: 1.0,
        size: Math.random() * 4 + 2,
        color: ["#ff4400", "#ffaa00", "#ffff00"][Math.floor(Math.random() * 3)],
      });
    }
  },

  update(deltaTime) {
    this.list = this.list.filter((p) => {
      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;
      p.vy += 0.15 * deltaTime;
      p.life -= 0.02 * deltaTime;
      return p.life > 0;
    });
  },

  draw() {
    this.list.forEach((p) => {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    });
    ctx.globalAlpha = 1.0;
  },
};

// ==========================================
// CAMERA SHAKE
// ==========================================
const camera = {
  shake: 0,

  startShake(intensity = 10) {
    this.shake = intensity;
  },

  update(deltaTime) {
    this.shake *= Math.pow(0.9, deltaTime);
    if (this.shake < 0.1) this.shake = 0;
  },

  apply() {
    if (this.shake > 0) {
      const offsetX = (Math.random() - 0.5) * this.shake;
      const offsetY = (Math.random() - 0.5) * this.shake;
      ctx.translate(offsetX, offsetY);
    }
  },
};

// ==========================================
// SCREEN RESIZE
// ==========================================
function resize() {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
  roadYPos = height * CONFIG.roadYPercent;
  // FIX: measure offsetHeight once here, not inside the draw loop
  const header = document.getElementById("ui-top");
  cachedHeaderHeight = header ? header.offsetHeight : 100;
}

window.addEventListener("resize", resize);
resize();

// ==========================================
// INPUT SYSTEM
// ==========================================
const input = {
  locked: false,

  lock() {
    this.locked = true;
  },

  unlock() {
    this.locked = false;
  },

  startThrottle() {
    if (this.locked || !gameReady) return;

    // iOS warm-up hack (forces buffer + unlock)
    if (audio.engine && audio.engine.paused) {
      audio.engine.play().then(() => {
        audio.engine.pause();
        audio.engine.currentTime = 0;
      }).catch(() => {});
    }

    audio.startEngine();

    if (game.phase === "IDLE") {
      game.phase = "COUNTDOWN";
      game.countdownIndex = 0;
      game.countdownTimer = performance.now();
    }

    game.throttle = true;
  },

  stopThrottle() {
    game.throttle = false;
  },
};

// Touch input
canvas.addEventListener("touchstart", (e) => {
  e.preventDefault();
  input.startThrottle();
});

canvas.addEventListener("touchend", (e) => {
  e.preventDefault();
  input.stopThrottle();
});

// Keyboard input
window.addEventListener("keydown", (e) => {
  if (input.locked) return;
  if (e.code === "Space") {
    e.preventDefault();
    input.startThrottle();
  }
  if (e.code === "ArrowUp") game.lane = 0;
  if (e.code === "ArrowDown") game.lane = 1;
  if (e.code === "Escape") togglePause();
});

window.addEventListener("keyup", (e) => {
  if (e.code === "Space") {
    e.preventDefault();
    input.stopThrottle();
  }
});

// Gamepad support
function pollGamepad() {
  if (!input.locked) {
    const gp = navigator.getGamepads?.()?.[0];
    if (gp) {
      if (gp.buttons[0]?.pressed) {
        input.startThrottle();
      } else {
        input.stopThrottle();
      }
      if (gp.axes[1] < -0.5) game.lane = 0;
      if (gp.axes[1] > 0.5) game.lane = 1;
    }
  }
  requestAnimationFrame(pollGamepad);
}
pollGamepad();

// ==========================================
// UI CONTROLS
// ==========================================
const infoPopup = document.getElementById("infoPopup");
const infoBtn = document.getElementById("infoBtn");
const closeInfoBtn = document.getElementById("closeInfoBtn");
const homeBtn = document.getElementById("homeBtn");

infoBtn?.addEventListener("click", () => {
  infoPopup.hidden = false;
  input.lock();
  if (game.phase === "RACING") togglePause();
});

closeInfoBtn?.addEventListener("click", () => {
  infoPopup.hidden = true;
  input.unlock();
});

homeBtn?.addEventListener("click", () => {
  window.location.href = "../../index.html";
});

// FIX: only write to the DOM when values have actually changed — eliminates
// layout thrashing from textContent writes triggering reflow every frame
function updateUI() {
  const s = Math.floor(game.score);
  const d = Math.floor(game.distance);
  if (s === _lastUIScore && d === _lastUIDistance) return;
  _lastUIScore = s;
  _lastUIDistance = d;
  if (_scoreEl) _scoreEl.textContent = s;
  if (_distanceEl) _distanceEl.textContent = d;
  if (_highscoreEl) _highscoreEl.textContent = Math.floor(game.bestScore);
}

function togglePause() {
  if (game.phase !== "RACING") return;
  paused = !paused;

  if (paused) {
    audio.stopEngine();
  } else {
    lastTime = performance.now();
    // engine resumes automatically on next updateEngineSound() call
  }
}

// ==========================================
// GAME LOGIC
// ==========================================
function resetGame() {
  game.crashing = false;
  game.phase = "IDLE";
  game.speed = 0;
  game.bikeAngle = 0;
  game.bikeAngularVelocity = 0;
  game.inWheelie = false;
  game.score = 0;
  game.distance = 0;
  game.scroll = 0;
  game.wheelRotation = 0;
  game.dashOffset = 0;
  game.gear = 1;
  game.shiftTimer = 0;
  game.rpm = 0;         // FIX: reset RPM on restart

  particles.list = [];
  camera.shake = 0;

  // FIX: reset cached UI values so the next updateUI() write goes through
  _lastUIScore = -1;
  _lastUIDistance = -1;

  audio.stopEngine();
  // audio.stop("crowd");
  // audio.stop("crash");

  updateUI();
}

function crash() {
  if (game.crashing) return;

  game.crashing = true;
  game.phase = "CRASHING";
  game.bikeAngularVelocity = 0;
  game.speed = 0;

  const bikeX = width * CONFIG.BIKE_X_PERCENT;
  camera.startShake(15);
  particles.createCrashSparks(bikeX, game.currentY);

  audio.stopEngine();
  //audio.play("crash");

  setTimeout(() => {
    endWheelie();
  }, 1000);
}

function endWheelie() {
  if (game.score > game.bestScore) {
    game.bestScore = game.score;
    localStorage.setItem("throttleUpBest", game.bestScore);
  }
  resetGame();
}

function update(now) {
  if (paused) return;

  const deltaTime = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  camera.update(deltaTime);
  particles.update(deltaTime);

  if (game.phase === "CRASHING") return;

  // IDLE
  if (game.phase === "IDLE") {
    const laneHeight = CONFIG.roadStripHeight / CONFIG.laneCount;
    const laneTopY = roadYPos + game.lane * laneHeight;
    const laneSurfaceY = laneTopY + laneHeight;
    const tS = assets.bike.img.height * CONFIG.bikeScale * CONFIG.tireSizeMult;
    game.currentY = laneSurfaceY - tS / 2;
    return;
  }

  // COUNTDOWN
  if (game.phase === "COUNTDOWN") {
    if (now - game.countdownTimer > CONFIG.COUNTDOWN_INTERVAL_MS) {
      game.countdownIndex++;
      game.countdownTimer = now;

      if (game.countdownIndex >= 3) {
        game.phase = "RACING";
      }
    }
    // FIX: keep engine audio warm during countdown
    audio.updateEngineSound();
    return;
  }

  // RACING
  if (game.phase === "RACING") {
    // ===== SPEED WITH GEARS =====
    let gearRatio = 1 - (game.gear - 1) * 0.08;
    gearRatio = Math.max(0.55, gearRatio);

    if (game.throttle) {
      game.speed += CONFIG.acceleration * gearRatio * deltaTime;
    } else {
      game.speed -= game.speed * (1 - CONFIG.friction) * 60 * deltaTime;
    }
    if (game.speed < 0.05) game.speed = 0;
    game.speed = Math.min(game.speed, CONFIG.maxSpeed);

    // ===== GEAR SYSTEM =====
    game.shiftTimer -= deltaTime;

    if (game.shiftTimer <= 0) {
      const currentGearData = CONFIG.GEARS[game.gear - 1];

      // Shift up
      if (game.gear < CONFIG.GEARS.length && game.speed > currentGearData.max) {
        game.gear++;
        game.shiftTimer = CONFIG.SHIFT_DELAY;
        // FIX: on upshift RPM snaps low — the pitch will drop then climb back up
        game.rpm = 0.12;
        // audio.playChirp();

        if (game.bikeAngle < 0) {
          game.bikeAngularVelocity += 1.2;
        }
      }

      // Shift down
      if (game.gear > 1 && game.speed < CONFIG.GEARS[game.gear - 2].min) {
        game.gear--;
        game.shiftTimer = CONFIG.SHIFT_DELAY;
        // FIX: on downshift RPM snaps high — the pitch blips up then settles
        game.rpm = 0.88;
      }
    }

    // ===== TORQUE WITH H2R-STYLE HIGH SPEED LIFT =====
    let throttleTorque = 0;

    if (game.throttle && game.speed > 15) {
      const speedFactor = (game.speed - 15) / 100;

      let gearLiftMultiplier = 1 - (game.gear - 1) * 0.14;
      gearLiftMultiplier = Math.max(0.45, gearLiftMultiplier);

      const aeroLift = Math.min(game.speed / 180, 1) * 0.35;

      throttleTorque =
        CONFIG.torque *
        Math.min(speedFactor, 1) *
        (gearLiftMultiplier + aeroLift);
    }

    const gravityTorque =
      Math.sin(game.bikeAngle) * CONFIG.gravity * Math.cos(game.bikeAngle);

    let angularAcceleration = -throttleTorque - gravityTorque;

    if (game.bikeAngle < 0) {
      const riseFactor = Math.min(Math.abs(game.bikeAngle) / 1.2, 1);
      angularAcceleration *= 0.6 + riseFactor * 0.6;
    }

    // ===== INTEGRATE =====
    game.bikeAngularVelocity += angularAcceleration * deltaTime;
    game.bikeAngularVelocity *= Math.pow(CONFIG.damping, deltaTime * 60);

    const MAX_ANGULAR_VEL = 5.0;
    game.bikeAngularVelocity = Math.max(
      -MAX_ANGULAR_VEL,
      Math.min(MAX_ANGULAR_VEL, game.bikeAngularVelocity),
    );

    game.bikeAngle += game.bikeAngularVelocity * deltaTime;

    if (game.bikeAngle > CONFIG.GROUND_CONTACT_ANGLE) {
      game.bikeAngle = CONFIG.GROUND_CONTACT_ANGLE;
      game.bikeAngularVelocity = 0;
    }

    if (Math.abs(game.bikeAngle) > 2.2) crash();

    // ===== WORLD SPEED =====
    const WORLD_SPEED_SCALE = 18;
    const worldSpeed = game.speed * WORLD_SPEED_SCALE;

    if (game.speed > 0) {
      game.scroll -= worldSpeed * deltaTime;
      game.wheelRotation -= worldSpeed * 0.015 * deltaTime;
      game.distance += game.speed * deltaTime;
      // BUG 2 FIX: keep dashOffset bounded within the dash pattern period (60+40=100px).
      // Without this, dashOffset grows to tens of thousands, and floating-point precision
      // causes lineDashOffset to snap / reverse direction mid-race.
      game.dashOffset = ((game.dashOffset - worldSpeed * deltaTime) % 100 + 100) % 100;
    }

    audio.updateEngineSound();

    // ===== BURNOUT SMOKE =====
    const bikeX = width * CONFIG.BIKE_X_PERCENT;
    const isGrounded = game.bikeAngle >= CONFIG.GROUND_CONTACT_ANGLE - 0.01;

    const isBurnout =
      game.throttle &&
      game.gear === 1 &&
      game.speed < 12 &&
      isGrounded &&
      Math.abs(game.bikeAngularVelocity) < 0.2;

    if (isBurnout) {
      game.launchSmokeTimer = 0.2;
    }

    if (game.launchSmokeTimer > 0) {
      particles.createDust(bikeX - 35, game.currentY + 12);
      game.launchSmokeTimer -= deltaTime;
    }

    if (game.bikeAngle < CONFIG.WHEELIE_START_ANGLE) {
      if (!game.inWheelie) {
        game.inWheelie = true;
        game.score = 0;
      }
      game.score += deltaTime * 10;
    } else if (game.inWheelie) {
      endWheelie();
    }

    updateUI();
  }
}

// ==========================================
// RENDERING
// ==========================================
function drawLoadingScreen() {
  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(0, 0, width, height);

  const progress = assetsLoaded / TOTAL_ASSETS;

  ctx.fillStyle = "#fff";
  ctx.font = "bold 48px Roboto Mono, monospace";
  ctx.textAlign = "center";
  ctx.fillText("THROTTLE UP", width / 2, height / 2 - 60);

  const barWidth = 400;
  const barHeight = 30;
  const barX = (width - barWidth) / 2;
  const barY = height / 2 + 20;

  ctx.strokeStyle = "#444";
  ctx.lineWidth = 2;
  ctx.strokeRect(barX, barY, barWidth, barHeight);

  ctx.fillStyle = "#4CAF50";
  ctx.fillRect(barX + 2, barY + 2, (barWidth - 4) * progress, barHeight - 4);

  ctx.fillStyle = "#aaa";
  ctx.font = "20px Roboto Mono, monospace";
  ctx.fillText(
    `Loading... ${Math.floor(progress * 100)}%`,
    width / 2,
    barY + barHeight + 40,
  );
}

function drawWheelieIndicator() {
  if (!game.inWheelie || game.phase !== "RACING") return;

  const x = width / 2;
  const y = height * 0.18;
  const pulse = Math.sin(Date.now() / 100) * 0.15 + 1;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(pulse, pulse);

  ctx.fillStyle = "#FFD700";
  ctx.strokeStyle = "#FF4500";
  ctx.lineWidth = 4;
  ctx.font = "bold 42px Roboto Mono, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.strokeText("WHEELIE!", 0, 0);
  ctx.fillText("WHEELIE!", 0, 0);

  ctx.restore();
}

// FIX: returns the pre-cached value — never triggers a layout reflow
function getHeaderHeight() {
  return cachedHeaderHeight;
}

function drawSpeedometer() {
  if (game.phase !== "RACING") return;

  const radius = Math.min(width, height) * 0.055;
  const headerHeight = getHeaderHeight();
  const x = width - radius - 20;
  const y = headerHeight + radius + 10;

  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  ctx.beginPath();
  ctx.arc(x, y, radius + 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#333";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0.75 * Math.PI, 2.25 * Math.PI);
  ctx.stroke();

  const speedPercent = game.speed / CONFIG.maxSpeed;
  const angle = 0.75 * Math.PI + speedPercent * 1.5 * Math.PI;

  ctx.strokeStyle = speedPercent > 0.8 ? "#ff4444" : "#4CAF50";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0.75 * Math.PI, angle);
  ctx.stroke();

  ctx.fillStyle = "#fff";
  ctx.font = "bold 24px Roboto Mono, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(Math.floor(game.speed), x, y);

  ctx.font = "12px Roboto Mono, monospace";
  ctx.fillText("km/h", x, y + 20);

  ctx.font = "bold 18px Roboto Mono";
  ctx.fillText(`G${game.gear}`, x, y + 40);
}

// FIX: draw() is now pure rendering — no update() call inside it.
// The loop() function drives both at the correct rAF timestamp.
function draw() {
  if (!gameReady) {
    drawLoadingScreen();
    return;
  }

  ctx.fillStyle = "#2e7d32";
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#6db3f2";
  ctx.fillRect(0, 0, width, roadYPos - 40);

  ctx.fillStyle = "#333";
  ctx.fillRect(0, roadYPos, width, CONFIG.roadStripHeight);

  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2;
  ctx.setLineDash([60, 40]);
  ctx.lineDashOffset = -game.dashOffset;
  ctx.beginPath();
  ctx.moveTo(0, roadYPos + CONFIG.roadStripHeight / 2);
  ctx.lineTo(width, roadYPos + CONFIG.roadStripHeight / 2);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.save();
  camera.apply();

  particles.draw();

  if (assets.bike.loaded && assets.tire.loaded) {
    const bW = assets.bike.img.width * CONFIG.bikeScale;
    const bH = assets.bike.img.height * CONFIG.bikeScale;
    const tS = bH * CONFIG.tireSizeMult;

    squatOffset += (6 - squatOffset) * 0.2;
    if (!(game.phase === "RACING" && game.throttle && game.speed < 20)) {
      squatOffset *= 0.8;
    }

    const pivotX = width * CONFIG.BIKE_X_PERCENT;
    const laneHeight = CONFIG.roadStripHeight / CONFIG.laneCount;
    const laneTopY = roadYPos + game.lane * laneHeight;
    const laneSurfaceY = laneTopY + laneHeight;
    const ROAD_OFFSET = -8;
    const targetY = laneSurfaceY - tS / 2 + ROAD_OFFSET;
    game.currentY += (targetY - game.currentY) * CONFIG.LANE_SWITCH_SMOOTHING;

    ctx.save();
    ctx.translate(pivotX + CONFIG.rearTireXShift, game.currentY + squatOffset);
    ctx.rotate(game.bikeAngle);

    // Rear tire
    ctx.save();
    ctx.rotate(game.wheelRotation);
    ctx.drawImage(assets.tire.img, -tS / 2, -tS / 2, tS, tS);
    ctx.restore();

    // Bike frame
    ctx.save();
    ctx.rotate(CONFIG.noseDownAngle);
    ctx.drawImage(
      assets.bike.img,
      -CONFIG.rearWheelOffsetX - CONFIG.rearTireXShift,
      -bH / 2 + CONFIG.frameYShift,
      bW,
      bH,
    );
    ctx.restore();

    // Rider
    if (assets.rider.loaded) {
      ctx.save();

      let riderLean = 0;
      if (game.throttle && game.bikeAngle > CONFIG.WHEELIE_START_ANGLE) {
        riderLean = CONFIG.RIDER_LEAN_FORWARD;
      }
      if (game.bikeAngle < CONFIG.WHEELIE_START_ANGLE) {
        riderLean = CONFIG.RIDER_LEAN_BACK;
      }

      const bikeCenterX =
        (bW * CONFIG.frontTireX - CONFIG.rearTireXShift) * 0.4;
      const riderOffsetY = -bH * 0.7;
      const riderWidth = bW * 0.55;
      const riderHeight = bH * 0.85;

      ctx.translate(bikeCenterX, riderOffsetY);
      ctx.rotate(riderLean);
      ctx.drawImage(
        assets.rider.img,
        -riderWidth / 2,
        -riderHeight / 2,
        riderWidth,
        riderHeight,
      );
      ctx.restore();
    }

    // Front tire
    ctx.save();
    ctx.translate(bW * CONFIG.frontTireX - CONFIG.rearTireXShift, 0);
    ctx.rotate(game.wheelRotation);
    ctx.drawImage(assets.tire.img, -tS / 2, -tS / 2, tS, tS);
    ctx.restore();

    ctx.restore(); // bike rotation
  }

  ctx.restore(); // camera shake

  // Countdown lights
  if (game.phase === "COUNTDOWN") {
    const cx = width / 2;
    const cy = CONFIG.COUNTDOWN_Y;

    for (let i = 0; i < 3; i++) {
      ctx.fillStyle =
        game.countdownIndex > i
          ? i === 2
            ? "lime"
            : "yellow"
          : "rgba(0,0,0,0.3)";
      ctx.beginPath();
      ctx.arc(
        cx + (i - 1) * CONFIG.COUNTDOWN_SPACING,
        cy,
        CONFIG.COUNTDOWN_RADIUS,
        0,
        Math.PI * 2,
      );
      ctx.fill();

      if (game.countdownIndex > i) {
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  }

  drawWheelieIndicator();
  drawSpeedometer();

  if (paused) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "#fff";
    ctx.font = `bold ${Math.min(width * 0.04, 48)}px Roboto Mono`;
    ctx.textAlign = "center";
    ctx.fillText("PAUSED", width / 2, height / 2);
    ctx.font = "20px Roboto Mono, monospace";
    ctx.fillText("Press ESC to resume", width / 2, height / 2 + 50);
  }
}

// FIX: unified game loop — update() runs first with the rAF high-res timestamp,
// then draw() renders the result. Previously update() was called at the end of
// draw() with a second performance.now() call, making deltaTime include render cost.
function loop(now) {
  update(now);
  draw();
  requestAnimationFrame(loop);
}

// ==========================================
// INITIALIZATION
// ==========================================
loadAssets();
requestAnimationFrame(loop);
});
