// ==========================
// Throttle-Up Game Script
// ==========================

// === Canvas Setup ===
const container = document.getElementById("game-container");
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const WIDTH = 480;
const HEIGHT = 320;

function resizeCanvas() {
  const ratio = WIDTH / HEIGHT;
  const width = container.clientWidth;
  const height = width / ratio;
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  canvas.style.width = width + "px";
  canvas.style.height = height + "px";
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// === Game State ===
let running = false;
let crashed = false;
let score = 0;
let coins = 0;
let distance = 0;
let highScore = 0;
let timeElapsed = 0;
let frontLifted = false;
let lastFrontLiftTime = 0;
let lane = 1;

// === Physics Constants ===
const CONFIG = {
  gravity: 0.25,
  groundY: HEIGHT - 60,
  torque: 0.02,
  wheelRadius: 25,
  bikeLength: 80,
  baseSpeed: 3,
  wheelieBoost: 0.4,
  maxRotation: Math.PI / 4, // 45 degrees
  minRotation: -Math.PI / 6, // -30 degrees
  laneOffsets: [-100, 0, 100],
  crashTolerance: 0.05
};

// === Game Objects ===
let player = {
  x: WIDTH / 2,
  y: CONFIG.groundY - CONFIG.wheelRadius * 2,
  angle: 0,
  rotationSpeed: 0,
  speed: CONFIG.baseSpeed,
  angularMomentum: 0,
  color: "#ffcc00"
};

let obstacles = [];
let coinsArr = [];
let crowdDots = [];

// === Audio ===
const engineSound = new Audio("assets/sounds/engine.mp3");
engineSound.loop = true;
engineSound.volume = 0.2;

const crashSound = new Audio("assets/sounds/crash.mp3");
const coinSound = new Audio("assets/sounds/coin.mp3");
const countdownBeep = new Audio("assets/sounds/beep.mp3");
const goSound = new Audio("assets/sounds/go.mp3");

// === UI Elements ===
const scoreDisplay = document.getElementById("score");
const coinsDisplay = document.getElementById("coins");
const distanceDisplay = document.getElementById("distance");
const highscoreDisplay = document.getElementById("highscore");
const restartBtn = document.getElementById("restartBtn");
const countdownOverlay = document.getElementById("countdownOverlay");
const lights = {
  yellow1: document.getElementById("lightYellow1"),
  yellow2: document.getElementById("lightYellow2"),
  green: document.getElementById("lightGreen")
};
const countdownNumber = document.getElementById("countdownNumber");
const goText = document.getElementById("goText");

// === Initialization ===
function initCrowd() {
  crowdDots = [];
  for (let i = 0; i < WIDTH; i += 12) {
    crowdDots.push({
      x: i + Math.random() * 8,
      y: HEIGHT - 180 + 10 + Math.random() * 20,
      color: ["#ff6b6b", "#4ecdc4", "#ffe66d", "#a8e6cf", "#ff8b94"][Math.floor(Math.random() * 5)]
    });
  }
}

function resetGame() {
  player = { ...player, x: WIDTH / 2, y: CONFIG.groundY - CONFIG.wheelRadius * 2, angle: 0, rotationSpeed: 0, speed: CONFIG.baseSpeed, angularMomentum: 0 };
  score = 0;
  coins = 0;
  distance = 0;
  timeElapsed = 0;
  obstacles = [];
  coinsArr = [];
  crashed = false;
  running = false;
  frontLifted = false;
  lane = 1;
  initCrowd();
  restartBtn.hidden = true;
  countdownOverlay.hidden = false;
  startCountdown();
}

function spawnObstacle() {
  const spacing = 300 + Math.random() * 200;
  const lastX = obstacles.length ? obstacles[obstacles.length - 1].x : 0;
  obstacles.push({
    x: lastX + spacing,
    lane: Math.floor(Math.random() * 3),
    width: 30,
    height: 40
  });
}

function spawnCoin() {
  const spacing = 180 + Math.random() * 120;
  const lastX = coinsArr.length ? coinsArr[coinsArr.length - 1].x : 0;
  coinsArr.push({
    x: lastX + spacing,
    lane: Math.floor(Math.random() * 3)
  });
}

// === Countdown ===
function startCountdown() {
  let count = 3;
  lights.yellow1.classList.remove("active");
  lights.yellow2.classList.remove("active");
  lights.green.classList.remove("active");
  goText.hidden = true;

  countdownNumber.textContent = count;
  countdownOverlay.hidden = false;

  const interval = setInterval(() => {
    countdownBeep.currentTime = 0;
    countdownBeep.play();

    if (count === 3) lights.yellow1.classList.add("active");
    if (count === 2) lights.yellow2.classList.add("active");
    if (count === 1) {
      lights.yellow1.classList.remove("active");
      lights.yellow2.classList.remove("active");
      lights.green.classList.add("active");
    }

    countdownNumber.textContent = count;
    count--;

    if (count < 0) {
      clearInterval(interval);
      countdownOverlay.hidden = true;
      goText.hidden = false;
      goSound.play();
      setTimeout(() => (goText.hidden = true), 800);
      startGame();
    }
  }, 800);
}

// === Game Loop ===
function startGame() {
  running = true;
  engineSound.play();
  requestAnimationFrame(loop);
}

function loop() {
  if (!running) return;

  update();
  draw();
  requestAnimationFrame(loop);
}

function update() {
  timeElapsed++;
  distance += player.speed;
  score = Math.floor(distance / 10);
  player.y += CONFIG.gravity * (frontLifted ? -0.6 : 1);
  player.rotationSpeed *= 0.95;
  player.angle += player.rotationSpeed;

  // clamp rotation
  if (player.angle > CONFIG.maxRotation) player.angle = CONFIG.maxRotation;
  if (player.angle < CONFIG.minRotation) player.angle = CONFIG.minRotation;

  // movement
  player.x = WIDTH / 2 + CONFIG.laneOffsets[lane];

  // spawn obstacles/coins
  if (obstacles.length < 5) spawnObstacle();
  if (coinsArr.length < 6) spawnCoin();

  // move environment
  obstacles.forEach(o => (o.x -= player.speed));
  coinsArr.forEach(c => (c.x -= player.speed));

  // remove off-screen
  obstacles = obstacles.filter(o => o.x + o.width > 0);
  coinsArr = coinsArr.filter(c => c.x > -20);

  // collision detection
  for (const o of obstacles) {
    const dx = Math.abs(o.x - player.x);
    const dy = Math.abs(o.lane - lane);
    if (dx < 30 && dy < 0.5) crash();
  }

  for (let i = 0; i < coinsArr.length; i++) {
    const c = coinsArr[i];
    const dx = Math.abs(c.x - player.x);
    const dy = Math.abs(c.lane - lane);
    if (dx < 20 && dy < 0.5) {
      coins++;
      coinSound.currentTime = 0;
      coinSound.play();
      coinsArr.splice(i, 1);
      break;
    }
  }

  scoreDisplay.textContent = score;
  coinsDisplay.textContent = coins;
  distanceDisplay.textContent = Math.floor(distance);
  highscoreDisplay.textContent = Math.max(score, highScore);

  // crash detection (lenient)
  if (player.y > CONFIG.groundY + CONFIG.crashTolerance * HEIGHT) crash();
}

function crash() {
  running = false;
  crashed = true;
  engineSound.pause();
  crashSound.play();
  highScore = Math.max(highScore, score);
  restartBtn.hidden = false;
}

// === Drawing ===
function draw() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  drawRoad();
  drawObstacles();
  drawCoins();
  drawPlayer();
}

function drawRoad() {
  const roadY = HEIGHT - 60;
  ctx.fillStyle = "#222";
  ctx.fillRect(0, roadY, WIDTH, 60);

  // lane dividers
  ctx.strokeStyle = "#555";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(WIDTH / 2 - 100, roadY);
  ctx.lineTo(WIDTH / 2 - 100, HEIGHT);
  ctx.moveTo(WIDTH / 2 + 100, roadY);
  ctx.lineTo(WIDTH / 2 + 100, HEIGHT);
  ctx.stroke();

  // crowd (cached)
  crowdDots.forEach(dot => {
    ctx.fillStyle = dot.color;
    ctx.beginPath();
    ctx.arc(dot.x, dot.y, 4, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawPlayer() {
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.angle);

  // body
  ctx.fillStyle = player.color;
  ctx.fillRect(-CONFIG.bikeLength / 2, -20, CONFIG.bikeLength, 10);

  // wheels
  ctx.beginPath();
  ctx.arc(-CONFIG.bikeLength / 2, 10, CONFIG.wheelRadius, 0, Math.PI * 2);
  ctx.arc(CONFIG.bikeLength / 2, 10, CONFIG.wheelRadius, 0, Math.PI * 2);
  ctx.fillStyle = "#333";
  ctx.fill();

  ctx.restore();
}

function drawObstacles() {
  ctx.fillStyle = "#c0392b";
  obstacles.forEach(o => {
    const y = CONFIG.groundY - o.height;
    const x = o.x + CONFIG.laneOffsets[o.lane];
    ctx.fillRect(x - o.width / 2, y, o.width, o.height);
  });
}

function drawCoins() {
  coinsArr.forEach(c => {
    const x = c.x + CONFIG.laneOffsets[c.lane];
    const y = CONFIG.groundY - 70;
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.fillStyle = "gold";
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.stroke();
  });
}

// === Input Controls ===
function onPointerDown() {
  if (crashed) return;
  frontLifted = true;
  player.speed += CONFIG.wheelieBoost;
  engineSound.play();
}

function onPointerUp() {
  if (crashed) return;
  frontLifted = false;
  player.speed = CONFIG.baseSpeed;
}

function onTouchStart(e) {
  e.preventDefault();
  this.touchStartX = e.changedTouches[0].screenX;
  onPointerDown(e);
}

function onTouchEnd(e) {
  e.preventDefault();
  const touchEndX = e.changedTouches[0].screenX;
  const dx = touchEndX - this.touchStartX;

  if (dx > 30 && lane < 2) lane++;
  else if (dx < -30 && lane > 0) lane--;
  onPointerUp(e);
}

// === Combined Touch/Mouse Listeners ===
canvas.addEventListener("mousedown", onPointerDown);
canvas.addEventListener("mouseup", onPointerUp);
canvas.addEventListener(
  "touchstart",
  (e) => {
    onPointerDown(e);
    onTouchStart(e);
  },
  { passive: false }
);
canvas.addEventListener(
  "touchend",
  (e) => {
    onPointerUp(e);
    onTouchEnd(e);
  },
  { passive: false }
);

// === Restart ===
restartBtn.addEventListener("click", resetGame);

// === Start Initial Game ===
resetGame();
