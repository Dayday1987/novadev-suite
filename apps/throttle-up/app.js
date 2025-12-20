(() => {
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  // UI
  const scoreEl = document.getElementById("score");
  const distanceEl = document.getElementById("distance");
  const coinsEl = document.getElementById("coins");
  const highscoreEl = document.getElementById("highscore");
  const restartBtn = document.getElementById("restartBtn");
  const infoBtn = document.getElementById("infoBtn");
  const infoPopup = document.getElementById("infoPopup");
  const closeInfoBtn = document.getElementById("closeInfoBtn");
  const homeBtn = document.getElementById("homeBtn");
  const countdownOverlay = document.getElementById("countdownOverlay");
  const lightYellow1 = document.getElementById("lightYellow1");
  const lightYellow2 = document.getElementById("lightYellow2");
  const lightGreen = document.getElementById("lightGreen");
  const countdownNumber = document.getElementById("countdownNumber");
  const goText = document.getElementById("goText");

  const container = document.getElementById("game-container");
  canvas.width = 480;
  canvas.height = 320;
  const WIDTH = 480;
  const HEIGHT = 320;

  // Game constants
  const GRAVITY = 0.3;
  const TORQUE = 0.5;
  const MAX_FRONT_ANGLE = Math.PI / 3;
  const MIN_FRONT_ANGLE = 0;
  const TAP_BOOST = 0.3;
  const TAP_SPEED_BOOST = 1;
  const OBSTACLE_SPEED_BASE = 1;
  const OBSTACLE_SPEED_MAX = 5;
  const COIN_RADIUS = 8;
  const LANES_Y = [HEIGHT - 60, HEIGHT - 120];

  // Game state
  let bike = {};
  let obstacles = [];
  let coins = [];

  let highscore = parseFloat(
    localStorage.getItem("throttleHighscore")
  ) || 0;

  let lastTimestamp = 0;
  let countdownRemaining = 0;

  const STATE = {
    IDLE: 0,
    COUNTDOWN: 1,
    RUNNING: 2,
    CRASHED: 3,
  };
  let gameState = STATE.IDLE;

  let isHolding = false;
  let pressTime = 0;

  let touchStartX = null;
  let touchStartY = null;

  // Sounds (same as original)
  function startWheelSpinSound() { /* unchanged */ }
  function stopWheelSpinSound() { /* unchanged */ }
  function playCrashSound() { /* unchanged */ }

  // Spawn functions (unchanged)
  function spawnObstacle() { /* unchanged */ }
  function spawnCoin() { /* unchanged */ }

  function resetGame() {
    bike = {
      x: WIDTH / 2,
      y: LANES_Y[0],
      lane: 0,
      angle: 0,
      angleVelocity: 0,
      distance: 0,
      coins: 0,
      crashed: false,
      speed: 0,
    };
    obstacles = [];
    coins = [];
    lastTimestamp = 0;
    countdownRemaining = 3; // 3-second countdown
    gameState = STATE.IDLE;
    restartBtn.hidden = true;
    countdownOverlay.hidden = true;

    spawnObstacle();
    spawnCoin();
    updateUI();
  }

  function updateUI() {
    scoreEl.textContent = Math.floor(bike.distance);
    coinsEl.textContent = bike.coins;
    distanceEl.textContent = Math.floor(bike.distance);
    highscoreEl.textContent = Math.floor(highscore);
  }

  function changeLane(newLane) {
    if (newLane === bike.lane) return;
    if (newLane < 0 || newLane > 1) return;
    bike.lane = newLane;
    bike.y = LANES_Y[bike.lane];
  }

  // Input
  function onPointerDown(e) {
    e.preventDefault();
    if (gameState === STATE.IDLE) {
      gameState = STATE.COUNTDOWN;
      countdownRemaining = 3;
      countdownOverlay.hidden = false;
      lightYellow1.classList.add("active");
      lightYellow2.classList.remove("active");
      lightGreen.classList.remove("active");
      goText.hidden = true;
      countdownNumber.style.display = "block";
    } else if (gameState === STATE.RUNNING) {
      isHolding = true;
      pressTime = Date.now();
      startWheelSpinSound();
    }
  }

  function onPointerUp(e) {
    e.preventDefault();
    if (isHolding && gameState === STATE.RUNNING) {
      const duration = Date.now() - pressTime;
      if (duration < 200) {
        bike.angle += TAP_BOOST;
        bike.speed += TAP_SPEED_BOOST;
      }
    }
    isHolding = false;
    stopWheelSpinSound();
  }

  function onTouchStart(e) {
    if (e.touches.length === 1) {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }
  }

  function onTouchEnd(e) {
    if (!touchStartX || !touchStartY) return;
    const touchEndX = e.changedTouches[0].clientX;
    const dx = touchEndX - touchStartX;
    if (Math.abs(dx) > 50) {
      changeLane(
        dx > 0 ? bike.lane + 1 : bike.lane - 1
      );
    }
    touchStartX = null;
    touchStartY = null;
  }

  function onKeyDown(e) {
    if (!gameState || gameState === STATE.IDLE) {
      gameState = STATE.COUNTDOWN;
      countdownRemaining = 3;
      countdownOverlay.hidden = false;
      lightYellow1.classList.add("active");
      lightYellow2.classList.remove("active");
      lightGreen.classList.remove("active");
      goText.hidden = true;
      countdownNumber.style.display = "block";
    }
    if (e.code === "Space" && gameState === STATE.RUNNING) {
      isHolding = true;
      pressTime = Date.now();
      startWheelSpinSound();
    }
    if (e.key === "a" || e.code === "ArrowLeft") {
      changeLane(bike.lane - 1);
    }
    if (e.key === "d" || e.code === "ArrowRight") {
      changeLane(bike.lane + 1);
    }
  }

  function onKeyUp(e) {
    if (e.code === "Space") {
      isHolding = false;
      stopWheelSpinSound();
    }
  }

  function updateCountdown(delta) {
    // Show countdown
    countdownRemaining -= delta;
    if (countdownRemaining <= 2 && countdownRemaining > 1) {
      lightYellow1.classList.remove("active");
      lightYellow2.classList.add("active");
      countdownNumber.textContent = "2";
    } else if (countdownRemaining <= 1 && countdownRemaining > 0) {
      lightYellow2.classList.remove("active");
      lightGreen.classList.add("active");
      countdownNumber.textContent = "1";
    } else if (countdownRemaining <= 0) {
      goText.hidden = false;
      countdownOverlay.hidden = true;
      gameState = STATE.RUNNING;
      bike.speed = OBSTACLE_SPEED_BASE;
    } else {
      countdownNumber.textContent = Math.ceil(countdownRemaining);
    }
  }

  function gameLoop(timestamp) {
    if (!lastTimestamp) lastTimestamp = timestamp;
    const delta = (timestamp - lastTimestamp) / 1000;
    lastTimestamp = timestamp;

    if (gameState === STATE.COUNTDOWN) {
      updateCountdown(delta);
    } else if (gameState === STATE.RUNNING) {
      bike.angleVelocity -= GRAVITY;
      if (isHolding) bike.angleVelocity += TORQUE;
      bike.angleVelocity = Math.min(
        Math.max(bike.angleVelocity, -0.2),
        0.2
      );
      bike.angle += bike.angleVelocity;
      if (bike.angle <= MIN_FRONT_ANGLE || bike.angle >= MAX_FRONT_ANGLE) {
        bike.crashed = true;
        gameState = STATE.CRASHED;
        playCrashSound();
        restartBtn.hidden = false;
      } else {
        bike.speed =
          OBSTACLE_SPEED_BASE +
          (bike.angle / MAX_FRONT_ANGLE) *
            (OBSTACLE_SPEED_MAX - OBSTACLE_SPEED_BASE);
      }
      bike.distance += bike.speed * delta * 60;  
      obstacles.forEach((o) => (o.x -= bike.speed));
      coins.forEach((c) => (c.x -= bike.speed));
      obstacles = obstacles.filter(
        (o) => o.x < WIDTH + 50
      );
      coins = coins.filter((c) => c.x < WIDTH + 50);
      if (
        obstacles.length === 0 ||
        obstacles[obstacles.length - 1].x > 150
      ) {
        spawnObstacle();
      }
      if (
        coins.length === 0 ||
        coins[coins.length - 1].x > 150
      ) {
        spawnCoin();
      }
    }

    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    drawRoad();
    drawObstacles();
    drawCoins();
    drawBike(bike.x, bike.y, bike.angle);

    if (gameState === STATE.CRASHED) {
      ctx.fillStyle = "rgba(255,0,0,0.5)";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = "#fff";
      ctx.font = "28px monospace";
      ctx.textAlign = "center";
      ctx.fillText("CRASHED!", WIDTH / 2, HEIGHT / 2);
    }

    updateUI();
    requestAnimationFrame(gameLoop);
  }

  canvas.addEventListener(
    "touchstart",
    onPointerDown,
    { passive: false }
  );
  canvas.addEventListener(
    "touchend",
    onPointerUp,
    { passive: false }
  );
  canvas.addEventListener(
    "touchstart",
    onTouchStart,
    { passive: false }
  );
  canvas.addEventListener(
    "touchend",
    onTouchEnd,
    { passive: false }
  );
  canvas.addEventListener("mousedown", onPointerDown);
  canvas.addEventListener("mouseup", onPointerUp);
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  resetGame();
  requestAnimationFrame(gameLoop);
})();
