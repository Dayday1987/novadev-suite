(() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('score');
  const distanceEl = document.getElementById('distance');
  const coinsEl = document.getElementById('coins');
  const highscoreEl = document.getElementById('highscore');
  const restartBtn = document.getElementById('restartBtn');
  const infoBtn = document.getElementById('infoBtn');
  const infoPopup = document.getElementById('infoPopup');
  const closeInfoBtn = document.getElementById('closeInfoBtn');
  const backBtn = document.getElementById('backBtn');

  const container = document.getElementById('game-container');
  const aspect = 480 / 320;
  let clientWidth = container.clientWidth;
  let clientHeight = container.clientHeight;
  if (clientWidth / clientHeight > aspect) {
    canvas.width = clientHeight * aspect;
    canvas.height = clientHeight;
  } else {
    canvas.width = clientWidth;
    canvas.height = clientWidth / aspect;
  }
  const scaleX = canvas.width / 480;
  const scaleY = canvas.height / 320;
  const WIDTH = 480;
  const HEIGHT = 320;

  // Game constants
  const GRAVITY = 0.3;
  const TORQUE = 0.05; // positive to lift front wheel
  const MAX_FRONT_ANGLE = Math.PI / 2.5; // ~72 degrees max front wheel lift
  const MIN_FRONT_ANGLE = 0; // bike horizontal
  const TAP_BOOST = 0.3; // radians
  const TAP_SPEED_BOOST = 1;
  const OBSTACLE_WIDTH = 20;
  const OBSTACLE_HEIGHT = 30;
  const OBSTACLE_GAP_MIN = 150;
  const OBSTACLE_GAP_MAX = 300;
  const OBSTACLE_SPEED_BASE = 1;
  const OBSTACLE_SPEED_MAX = 5;
  const COIN_RADIUS = 8;
  const BIKE_WIDTH = 80;
  const BIKE_HEIGHT = 40;

  // Lane Y positions
  const LANES_Y = [HEIGHT - 60, HEIGHT - 60 - 60]; // two lanes

  // Game state
  let bike = {
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

  let obstacles = [];
  let coins = [];
  let lastTimestamp = 0;
  let isHolding = false;
  let pressTime = 0;
  let highscore = parseFloat(localStorage.getItem('throttleHighscore')) || 0;
  let gameStarted = false;
  let gameRunning = false;

  // Swipe detection for lane change on mobile
  let touchStartX = null;
  let touchStartY = null;

  // Sound effects
  let wheelSpinOscillator = null;
  let wheelSpinGain = null;
  let audioCtx = null;

  function startWheelSpinSound() {
    if (wheelSpinOscillator) return;
    if (!window.AudioContext) return;

    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    wheelSpinOscillator = audioCtx.createOscillator();
    wheelSpinGain = audioCtx.createGain();

    wheelSpinOscillator.type = 'square';
    wheelSpinOscillator.frequency.setValueAtTime(200, audioCtx.currentTime);
    wheelSpinGain.gain.setValueAtTime(0.1, audioCtx.currentTime);

    wheelSpinOscillator.connect(wheelSpinGain);
    wheelSpinGain.connect(audioCtx.destination);

    wheelSpinOscillator.start();
  }

  function stopWheelSpinSound() {
    if (!wheelSpinOscillator) return;
    wheelSpinOscillator.stop();
    wheelSpinOscillator.disconnect();
    wheelSpinGain.disconnect();
    audioCtx.close();

    wheelSpinOscillator = null;
    wheelSpinGain = null;
    audioCtx = null;
  }

  function playCrashSound() {
    if (!window.AudioContext) return;
    const crashAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = crashAudioCtx.createOscillator();
    const gainNode = crashAudioCtx.createGain();

    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(100, crashAudioCtx.currentTime);
    gainNode.gain.setValueAtTime(0.3, crashAudioCtx.currentTime);

    oscillator.connect(gainNode);
    gainNode.connect(crashAudioCtx.destination);

    oscillator.start();

    setTimeout(() => {
      oscillator.stop();
      crashAudioCtx.close();
    }, 300);
  }

  // Spawn obstacles on left side in random lane
  function spawnObstacle() {
    const lastObstacle = obstacles[obstacles.length - 1];
    let x = -OBSTACLE_WIDTH - Math.random() * (OBSTACLE_GAP_MAX - OBSTACLE_GAP_MIN) - OBSTACLE_GAP_MIN;
    if (lastObstacle) x = lastObstacle.x - Math.random() * (OBSTACLE_GAP_MAX - OBSTACLE_GAP_MIN) - OBSTACLE_GAP_MIN;

    const lane = Math.random() < 0.5 ? 0 : 1;

    obstacles.push({
      x,
      y: LANES_Y[lane],
      width: OBSTACLE_WIDTH,
      height: OBSTACLE_HEIGHT,
      lane,
    });
  }

  // Spawn coins on left side in random lane
  function spawnCoin() {
    const lastCoin = coins[coins.length - 1];
    let x = -COIN_RADIUS * 2 - Math.random() * (OBSTACLE_GAP_MAX - OBSTACLE_GAP_MIN) - OBSTACLE_GAP_MIN;
    if (lastCoin) x = lastCoin.x - Math.random() * (OBSTACLE_GAP_MAX - OBSTACLE_GAP_MIN) - OBSTACLE_GAP_MIN;

    const lane = Math.random() < 0.5 ? 0 : 1;

    coins.push({
      x,
      y: LANES_Y[lane] - 40,
      radius: COIN_RADIUS,
      collected: false,
      lane,
    });
  }

  // Reset game state
  function resetGame() {
    bike.angle = 0;
    bike.angleVelocity = 0;
    bike.distance = 0;
    bike.coins = 0;
    bike.crashed = false;
    bike.speed = 0;
    bike.x = WIDTH / 2;
    bike.lane = 0;
    bike.y = LANES_Y[bike.lane];
    obstacles = [];
    coins = [];
    lastTimestamp = 0;
    isHolding = false;
    pressTime = 0;
    gameStarted = false;
    gameRunning = false;
    restartBtn.hidden = true;
    spawnObstacle();
    spawnCoin();
    updateUI();
  }

  // Update scoreboard UI
  function updateUI() {
    scoreEl.textContent = Math.floor(bike.distance);
    coinsEl.textContent = bike.coins;
    distanceEl.textContent = Math.floor(bike.distance);
    highscoreEl.textContent = Math.floor(highscore);
  }

  // Draw race track environment with crowd
  function drawRoad() {
    // Draw sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    skyGrad.addColorStop(0, '#4a90e2');
    skyGrad.addColorStop(0.4, '#87ceeb');
    skyGrad.addColorStop(0.7, '#b8e6f5');
    skyGrad.addColorStop(1, '#8fd14f');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Draw simple clouds
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.beginPath();
    ctx.ellipse(100, 40, 30, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(300, 60, 40, 20, 0, 0, Math.PI * 2);
    ctx.fill();

    // Grandstand/Crowd in background (simplified)
    const crowdY = HEIGHT - 180;
    ctx.fillStyle = '#555';
    ctx.fillRect(0, crowdY, WIDTH, 40);
    
    // Crowd heads (colorful dots)
    for (let i = 0; i < WIDTH; i += 12) {
      const colors = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#a8e6cf', '#ff8b94'];
      ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
      ctx.beginPath();
      ctx.arc(i + Math.random() * 8, crowdY + 10 + Math.random() * 20, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Barrier/fence
    ctx.fillStyle = '#d32f2f';
    ctx.fillRect(0, HEIGHT - 130, WIDTH, 8);
    ctx.fillStyle = '#fff';
    for (let i = 0; i < WIDTH; i += 30) {
      ctx.fillRect(i, HEIGHT - 130, 3, 8);
    }

    // Grass strip before track
    ctx.fillStyle = '#4a8c1f';
    ctx.fillRect(0, HEIGHT - 120, WIDTH, 20);

    // Race track surface (asphalt)
    const trackGrad = ctx.createLinearGradient(0, HEIGHT - 100, 0, HEIGHT - 20);
    trackGrad.addColorStop(0, '#3a3a3a');
    trackGrad.addColorStop(0.5, '#2a2a2a');
    trackGrad.addColorStop(1, '#3a3a3a');
    ctx.fillStyle = trackGrad;
    ctx.fillRect(0, HEIGHT - 100, WIDTH, 80);

    // Track texture (subtle noise)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
    for (let i = 0; i < 200; i++) {
      ctx.fillRect(Math.random() * WIDTH, HEIGHT - 100 + Math.random() * 80, 2, 2);
    }

    // Outer solid lines (bright white/yellow)
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, HEIGHT - 100);
    ctx.lineTo(WIDTH, HEIGHT - 100);
    ctx.stroke();
    
    // Bottom line
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, HEIGHT - 20);
    ctx.lineTo(WIDTH, HEIGHT - 20);
    ctx.stroke();

    // Dotted center line (yellow for race track)
    ctx.strokeStyle = '#ffeb3b';
    ctx.lineWidth = 4;
    let x = 0;
    const dashLength = 20;
    const gapLength = 15;
    while (x < WIDTH) {
      ctx.beginPath();
      ctx.moveTo(x, HEIGHT - 60);
      ctx.lineTo(Math.min(x + dashLength, WIDTH), HEIGHT - 60);
      ctx.stroke();
      x += dashLength + gapLength;
    }

    // Starting line (checkered pattern)
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 5; i++) {
      ctx.fillRect(80, HEIGHT - 100 + (i * 16), 6, 8);
      ctx.fillStyle = i % 2 === 0 ? '#fff' : '#222';
      ctx.fillRect(80, HEIGHT - 100 + (i * 16) + 8, 6, 8);
    }
  }

  // Draw bike with realistic sportbike and rider, front wheel lifts only
  function drawBike(x, y, angle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-angle);

    // Wheels: back wheel stays on ground
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(-25, 15, 14, 0, Math.PI * 2); // back wheel
    ctx.fill();

    ctx.beginPath();
    ctx.arc(25, 15, 14, 0, Math.PI * 2); // front wheel
    ctx.fill();

    // Wheel rims
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(-25, 15, 9, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(25, 15, 9, 0, Math.PI * 2);
    ctx.stroke();

    // Sportbike body (Ninja H2R inspired)
    ctx.fillStyle = '#0f9d58'; // bright green
    ctx.beginPath();
    ctx.moveTo(-40, 15);
    ctx.lineTo(-20, -10);
    ctx.lineTo(20, -10);
    ctx.lineTo(40, 15);
    ctx.closePath();
    ctx.fill();

    // Tank and seat
    ctx.fillStyle = '#0b6d37';
    ctx.beginPath();
    ctx.moveTo(-10, -10);
    ctx.lineTo(0, -30);
    ctx.lineTo(15, -30);
    ctx.lineTo(20, -10);
    ctx.closePath();
    ctx.fill();

    // Front fairing
    ctx.fillStyle = '#0b6d37';
    ctx.beginPath();
    ctx.moveTo(40, 15);
    ctx.lineTo(50, 0);
    ctx.lineTo(40, -15);
    ctx.closePath();
    ctx.fill();

    // Handlebars curved back toward rider
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(40, 15);
    ctx.bezierCurveTo(45, 10, 30, 0, 20, 0);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(40, 15);
    ctx.bezierCurveTo(45, 20, 30, 30, 20, 30);
    ctx.stroke();

    // Rider helmet (realistic shape)
    ctx.fillStyle = '#222';
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, -40, 15, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Helmet visor
    ctx.fillStyle = 'rgba(100, 150, 255, 0.7)';
    ctx.beginPath();
    ctx.ellipse(0, -40, 12, 10, 0, 0, Math.PI);
    ctx.fill();

    // Rider body
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.moveTo(-10, -20);
    ctx.lineTo(10, -20);
    ctx.lineTo(15, 0);
    ctx.lineTo(-15, 0);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  // Draw obstacles as bright red traffic cones/barriers
  function drawObstacles() {
    obstacles.forEach(o => {
      // Bright orange/red cone
      const grad = ctx.createLinearGradient(o.x, o.y, o.x, o.y + o.height);
      grad.addColorStop(0, '#ff4444');
      grad.addColorStop(1, '#cc0000');
      ctx.fillStyle = grad;
      ctx.fillRect(o.x, o.y, o.width, o.height);
      
      // White stripes
      ctx.fillStyle = '#fff';
      ctx.fillRect(o.x, o.y + 5, o.width, 3);
      ctx.fillRect(o.x, o.y + 13, o.width, 3);
      ctx.fillRect(o.x, o.y + 21, o.width, 3);
      
      // Border
      ctx.strokeStyle = '#8b0000';
      ctx.lineWidth = 2;
      ctx.strokeRect(o.x, o.y, o.width, o.height);
    });
  }

  // Draw coins as bright shiny gold circles
  function drawCoins() {
    coins.forEach(c => {
      if (!c.collected) {
        // Outer glow
        const glowGrad = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.radius + 4);
        glowGrad.addColorStop(0, 'rgba(255, 215, 0, 0.6)');
        glowGrad.addColorStop(1, 'rgba(255, 215, 0, 0)');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.radius + 4, 0, Math.PI * 2);
        ctx.fill();

        // Main coin
        const grad = ctx.createRadialGradient(c.x - 2, c.y - 2, c.radius / 4, c.x, c.y, c.radius);
        grad.addColorStop(0, '#fffacd');
        grad.addColorStop(0.3, '#ffd700');
        grad.addColorStop(0.7, '#ffb700');
        grad.addColorStop(1, '#cc9500');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
        ctx.fill();

        // Border
        ctx.strokeStyle = '#b8860b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
        ctx.stroke();

        // Shine highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        ctx.arc(c.x - 2, c.y - 2, c.radius / 3, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  // Check collision between bike and obstacles
  function checkCollision() {
    const bikeBox = {
      x: bike.x - 40,
      y: bike.y - 40,
      width: 80,
      height: 50,
    };

    for (let o of obstacles) {
      if (
        bikeBox.x < o.x + o.width &&
        bikeBox.x + bikeBox.width > o.x &&
        bikeBox.y < o.y + o.height &&
        bikeBox.y + bikeBox.height > o.y
      ) {
        return true;
      }
    }
    return false;
  }

  // Check coin collection
  function checkCoinCollection() {
    for (let c of coins) {
      if (!c.collected) {
        const dx = c.x - bike.x;
        const dy = c.y - bike.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < c.radius + 20) {
          c.collected = true;
          bike.coins++;
        }
      }
    }
  }

  // Handle lane change (0 or 1)
  function changeLane(newLane) {
    if (newLane === bike.lane) return;
    if (newLane < 0 || newLane > 1) return;
    bike.lane = newLane;
    bike.y = LANES_Y[bike.lane];
  }

  // Input handlers
  function onPointerDown(e) {
    e.preventDefault();
    if (!gameStarted) {
      startGameSequence();
    }
    if (gameRunning && !bike.crashed) {
      isHolding = true;
      pressTime = Date.now();
      startWheelSpinSound();
    }
  }
  function onPointerUp(e) {
    e.preventDefault();
    if (isHolding && gameRunning && !bike.crashed) {
      const duration = Date.now() - pressTime;
      if (duration < 200) {
        // tap
        bike.angle += TAP_BOOST;
        bike.speed += TAP_SPEED_BOOST;
        if (bike.angle > MAX_FRONT_ANGLE) bike.angle = MAX_FRONT_ANGLE;
        if (bike.angle < MIN_FRONT_ANGLE) bike.angle = MIN_FRONT_ANGLE;
      }
      // else hold release
    }
    isHolding = false;
    stopWheelSpinSound();
  }

  // Swipe detection for lane change
  function onTouchStart(e) {
    if (e.touches.length === 1) {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }
  }

  function onTouchEnd(e) {
    if (!touchStartX || !touchStartY) return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const dx = touchEndX - touchStartX;
    const dy = touchEndY - touchStartY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    // Horizontal swipe detection (threshold 30px)
    if (absDx > 30 && absDx > absDy) {
      if (dx > 0) {
        changeLane(bike.lane + 1);
      } else {
        changeLane(bike.lane - 1);
      }
    }

    touchStartX = null;
    touchStartY = null;
  }

  function onKeyDown(e) {
    if (!gameStarted) {
      gameStarted = true;
      gameRunning = true;
      restartBtn.hidden = true;
    }
    if (e.code === 'Space') {
      e.preventDefault();
      if (gameRunning && !bike.crashed) {
        isHolding = true;
        pressTime = Date.now();
        startWheelSpinSound();
      }
    }
    if (e.key === 'a' || e.key === 'A' || e.code === 'ArrowLeft') {
      changeLane(bike.lane - 1);
    }
    if (e.key === 'd' || e.key === 'D' || e.code === 'ArrowRight') {
      changeLane(bike.lane + 1);
    }
  }

  function onKeyUp(e) {
    if (e.code === 'Space') {
      e.preventDefault();
      if (isHolding && gameRunning && !bike.crashed) {
        const duration = Date.now() - pressTime;
        if (duration < 200) {
          // tap
          bike.angle += TAP_BOOST;
          bike.speed += TAP_SPEED_BOOST;
          if (bike.angle > MAX_FRONT_ANGLE) bike.angle = MAX_FRONT_ANGLE;
          if (bike.angle < MIN_FRONT_ANGLE) bike.angle = MIN_FRONT_ANGLE;
        }
      }
      isHolding = false;
      stopWheelSpinSound();
    }
  }

  // Start game countdown sequence
  function startGameSequence() {
    if (gameStarted) return;
    gameStarted = true;
    restartBtn.hidden = true;

    countdownOverlay.hidden = false;
    goText.hidden = true;
    countdownNumber.style.display = 'block';

    // First yellow light
    lightYellow1.classList.add('active');
    countdownNumber.textContent = '3';
    setTimeout(() => {
      // Second yellow light
      lightYellow1.classList.remove('active');
      lightYellow2.classList.add('active');
      countdownNumber.textContent = '2';
      setTimeout(() => {
        // Green light (go)
        lightYellow2.classList.remove('active');
        lightGreen.classList.add('active');
        countdownNumber.textContent = '1';
        setTimeout(() => {
          // GO!
          countdownNumber.style.display = 'none';
          goText.hidden = false;
          setTimeout(() => {
            countdownOverlay.hidden = true;
            lightGreen.classList.remove('active');
            gameRunning = true;
            bike.speed = OBSTACLE_SPEED_BASE;
          }, 1000);
        }, 1000);
      }, 1000);
    }, 1000);
  }

  // Restart button
  restartBtn.addEventListener('click', () => {
    resetGame();
  });

  // Info popup toggle
  infoBtn.addEventListener('click', () => {
    infoPopup.hidden = false;
  });
  closeInfoBtn.addEventListener('click', () => {
    infoPopup.hidden = true;
  });

  // Back button
  backBtn.addEventListener('click', () => {
    window.location.href = '../../index.html';
  });

  // Game loop
  function gameLoop(timestamp) {
    if (!lastTimestamp) lastTimestamp = timestamp;
    const delta = (timestamp - lastTimestamp) / 1000;
    lastTimestamp = timestamp;

    if (gameRunning && !bike.crashed) {
      // Gravity pulls down
      bike.angleVelocity -= GRAVITY;

      // Torque if holding
      if (isHolding) {
        bike.angleVelocity += TORQUE;
      }

      // Clamp angle velocity
      bike.angleVelocity = Math.min(Math.max(bike.angleVelocity, -0.2), 0.2);

      // Update angle
      bike.angle += bike.angleVelocity;

      // Check for crash conditions
      if (bike.angle <= MIN_FRONT_ANGLE) {
        bike.angle = MIN_FRONT_ANGLE;
        bike.speed = 0;
        bike.crashed = true;
        gameRunning = false;
        stopWheelSpinSound();
        playCrashSound();
        restartBtn.hidden = false;
      } else if (bike.angle >= MAX_FRONT_ANGLE) {
        bike.angle = MAX_FRONT_ANGLE;
        bike.speed = 0;
        bike.crashed = true;
        gameRunning = false;
        stopWheelSpinSound();
        playCrashSound();
        restartBtn.hidden = false;
      } else {
        // Speed based on angle
        bike.speed = OBSTACLE_SPEED_BASE + (bike.angle / MAX_FRONT_ANGLE) * (OBSTACLE_SPEED_MAX - OBSTACLE_SPEED_BASE);
      }

      // Update distance traveled
      bike.distance += bike.speed * delta * 60;

      // Move obstacles and coins left (world scrolls)
      obstacles.forEach(o => (o.x -= bike.speed));
      coins.forEach(c => (c.x -= bike.speed));

      // Remove offscreen obstacles and coins (right side)
      obstacles = obstacles.filter(o => o.x < WIDTH + OBSTACLE_WIDTH);
      coins = coins.filter(c => c.x < WIDTH + COIN_RADIUS);

      // Spawn new obstacles and coins on left side
      if (obstacles.length === 0 || obstacles[obstacles.length - 1].x > OBSTACLE_GAP_MIN) {
        spawnObstacle();
      }
      if (coins.length === 0 || coins[coins.length - 1].x > OBSTACLE_GAP_MIN) {
        spawnCoin();
      }

      // Check collisions
      if (checkCollision()) {
        bike.crashed = true;
        gameRunning = false;
        stopWheelSpinSound();
        playCrashSound();
        restartBtn.hidden = false;
      }

      // Check coin collection
      checkCoinCollection();

      // Update highscore (score = distance)
      const currentScore = Math.floor(bike.distance);
      if (currentScore > highscore) {
        highscore = currentScore;
        localStorage.setItem('throttleHighscore', highscore);
      }
    }

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.scale(scaleX, scaleY);

    // Draw road and starting line
    drawRoad();

    // Draw obstacles and coins
    drawObstacles();
    drawCoins();

    // Draw bike
    drawBike(bike.x, bike.y, bike.angle);

    // If crashed, overlay red and show message
    if (bike.crashed) {
      ctx.fillStyle = 'rgba(255,0,0,0.5)';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 28px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('CRASHED!', WIDTH / 2, HEIGHT / 2);
    }

    ctx.restore();

    updateUI();

    requestAnimationFrame(gameLoop);
  }

  // Setup input listeners
  container.addEventListener('touchstart', onPointerDown, { passive: false });
  container.addEventListener('touchend', onPointerUp, { passive: false });
  container.addEventListener('touchstart', onTouchStart, { passive: false });
  container.addEventListener('touchend', onTouchEnd, { passive: false });
  container.addEventListener('mousedown', onPointerDown);
  container.addEventListener('mouseup', onPointerUp);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  // Initialize game
  resetGame();
  requestAnimationFrame(gameLoop);
})();
