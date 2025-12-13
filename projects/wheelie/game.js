(() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('score');
  const wheelieTimeEl = document.getElementById('wheelieTime');
  const distanceEl = document.getElementById('distance');
  const coinsEl = document.getElementById('coins');
  const highscoreEl = document.getElementById('highscore');
  const restartBtn = document.getElementById('restartBtn');
  const infoBtn = document.getElementById('infoBtn');
  const infoPopup = document.getElementById('infoPopup');
  const closeInfoBtn = document.getElementById('closeInfoBtn');

  const WIDTH = canvas.width;
  const HEIGHT = canvas.height;

  // Game constants
  const GRAVITY = 0.5;
  const TORQUE = -0.15; // lifting force when holding controls
  const MAX_FRONT_ANGLE = Math.PI / 3; // max front wheel lift angle (~60 degrees)
  const MIN_FRONT_ANGLE = 0; // bike horizontal
  const OBSTACLE_WIDTH = 20;
  const OBSTACLE_HEIGHT = 30;
  const OBSTACLE_GAP_MIN = 150;
  const OBSTACLE_GAP_MAX = 300;
  const OBSTACLE_SPEED = 3;
  const COIN_RADIUS = 8;
  const COIN_SPEED = OBSTACLE_SPEED;
  const BIKE_WIDTH = 80;
  const BIKE_HEIGHT = 40;

  // Bike starts flat (angle=0), moves left across screen (x decreases)
  let bike = {
    x: WIDTH - 80,
    y: HEIGHT - 60,
    angle: 0, // front wheel lift angle in radians
    angleVelocity: 0,
    wheelieTime: 0,
    distance: 0,
    coins: 0,
    crashed: false,
  };

  let obstacles = [];
  let coins = [];
  let frameCount = 0;
  let lastTimestamp = 0;
  let isHolding = false;
  let highscore = parseFloat(localStorage.getItem('wheelieHighscore')) || 0;

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

  // Play short beep for crash
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

  // Generate obstacles at intervals
  function spawnObstacle() {
    const lastObstacle = obstacles[obstacles.length - 1];
    let x = -OBSTACLE_WIDTH - Math.random() * (OBSTACLE_GAP_MAX - OBSTACLE_GAP_MIN) - OBSTACLE_GAP_MIN;
    if (lastObstacle) x = lastObstacle.x - Math.random() * (OBSTACLE_GAP_MAX - OBSTACLE_GAP_MIN) - OBSTACLE_GAP_MIN;

    // Random lane: 0 = left lane, 1 = right lane
    const laneY = HEIGHT - 60 - OBSTACLE_HEIGHT;
    const laneOffset = Math.random() < 0.5 ? 0 : 60;

    obstacles.push({
      x,
      y: laneY + laneOffset,
      width: OBSTACLE_WIDTH,
      height: OBSTACLE_HEIGHT,
      passed: false,
    });
  }

  // Generate coins at intervals
  function spawnCoin() {
    const lastCoin = coins[coins.length - 1];
    let x = -COIN_RADIUS * 2 - Math.random() * (OBSTACLE_GAP_MAX - OBSTACLE_GAP_MIN) - OBSTACLE_GAP_MIN;
    if (lastCoin) x = lastCoin.x - Math.random() * (OBSTACLE_GAP_MAX - OBSTACLE_GAP_MIN) - OBSTACLE_GAP_MIN;

    // Random lane coin height between lanes
    const laneY = HEIGHT - 100;
    const laneOffset = Math.random() < 0.5 ? 0 : 60;

    coins.push({
      x,
      y: laneY + laneOffset,
      radius: COIN_RADIUS,
      collected: false,
    });
  }

  // Reset game state
  function resetGame() {
    bike.angle = 0;
    bike.angleVelocity = 0;
    bike.wheelieTime = 0;
    bike.distance = 0;
    bike.coins = 0;
    bike.crashed = false;
    bike.x = WIDTH - 80;
    obstacles = [];
    coins = [];
    frameCount = 0;
    lastTimestamp = 0;
    isHolding = false;
    spawnObstacle();
    spawnCoin();
    updateUI();
  }

  // Update UI elements
  function updateUI() {
    // Score = wheelieTime * 100 + coins * 50 (example formula)
    const score = Math.floor(bike.wheelieTime * 100 + bike.coins * 50);
    scoreEl.textContent = score;
    wheelieTimeEl.textContent = bike.wheelieTime.toFixed(2);
    distanceEl.textContent = Math.floor(bike.distance);
    coinsEl.textContent = bike.coins;
    highscoreEl.textContent = Math.floor(highscore);
  }

  // Draw 2-lane paved road with dotted center line
  function drawRoad() {
    // Road background
    ctx.fillStyle = '#444';
    ctx.fillRect(0, HEIGHT - 100, WIDTH, 100);

    // Lane lines
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;

    // Outer solid lines
    ctx.beginPath();
    ctx.moveTo(0, HEIGHT - 100);
    ctx.lineTo(WIDTH, HEIGHT - 100);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, HEIGHT - 20);
    ctx.lineTo(WIDTH, HEIGHT - 20);
    ctx.stroke();

    // Dotted center line
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    const dashLength = 15;
    const gapLength = 15;
    let x = 0;
    while (x < WIDTH) {
      ctx.beginPath();
      ctx.moveTo(x, HEIGHT - 60);
      ctx.lineTo(Math.min(x + dashLength, WIDTH), HEIGHT - 60);
      ctx.stroke();
      x += dashLength + gapLength;
    }
  }

  // Draw bike as a more realistic sportbike and rider
  function drawBike(x, y, angle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-angle);

    // Wheels
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(-25, 15, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(25, 15, 14, 0, Math.PI * 2);
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

    // Sportbike body (inspired by Ninja H2R)
    ctx.fillStyle = '#0f9d58'; // bright green
    ctx.beginPath();
    // Body main shape
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

  // Draw obstacles as red rectangles in lanes
  function drawObstacles() {
    ctx.fillStyle = '#b22222';
    obstacles.forEach(o => {
      ctx.fillRect(o.x, o.y, o.width, o.height);
      // Add simple shading
      ctx.strokeStyle = '#7a1212';
      ctx.lineWidth = 2;
      ctx.strokeRect(o.x, o.y, o.width, o.height);
    });
  }

  // Draw coins as shiny yellow circles
  function drawCoins() {
    coins.forEach(c => {
      if (!c.collected) {
        const grad = ctx.createRadialGradient(c.x, c.y, c.radius / 3, c.x, c.y, c.radius);
        grad.addColorStop(0, '#fff700');
        grad.addColorStop(1, '#c9a700');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#a38700';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
        ctx.stroke();
      }
    });
  }

  // Check collision between bike and obstacles
  function checkCollision() {
    // Bike bounding box approximation
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

  // Game loop
  function gameLoop(timestamp) {
    if (!lastTimestamp) lastTimestamp = timestamp;
    const delta = (timestamp - lastTimestamp) / 1000;
    lastTimestamp = timestamp;

    if (!bike.crashed) {
      // Update bike angle velocity based on controls and gravity
      if (isHolding) {
        bike.angleVelocity += TORQUE;
        startWheelSpinSound();
      } else {
        bike.angleVelocity += GRAVITY * 0.1;
        stopWheelSpinSound();
      }

      // Clamp angle velocity and angle
      bike.angleVelocity = Math.min(Math.max(bike.angleVelocity, -0.5), 0.5);
      bike.angle += bike.angleVelocity;

      if (bike.angle > MAX_FRONT_ANGLE) {
        bike.angle = MAX_FRONT_ANGLE;
        bike.angleVelocity = 0;
      }
      if (bike.angle < MIN_FRONT_ANGLE) {
        bike.angle = MIN_FRONT_ANGLE;
        bike.angleVelocity = 0;
      }

      // Update distance (bike moves left)
      bike.distance += OBSTACLE_SPEED * delta * 60;

      // Move bike left
      bike.x -= OBSTACLE_SPEED;
      if (bike.x < 80) bike.x = 80; // keep bike visible on left side

      // Update obstacles and coins positions (move right to left)
      obstacles.forEach(o => (o.x += OBSTACLE_SPEED));
      coins.forEach(c => (c.x += COIN_SPEED));

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
        stopWheelSpinSound();
        playCrashSound();
      }

      // Check coin collection
      checkCoinCollection();

      // Update wheelie time if front wheel is lifted
      if (bike.angle > 0.1) {
        bike.wheelieTime += delta;
      }

      // Update highscore
      const currentScore = bike.wheelieTime * 100 + bike.coins * 50;
      if (currentScore > highscore) {
        highscore = currentScore;
        localStorage.setItem('wheelieHighscore', highscore.toFixed(0));
      }
    }

    // Clear canvas
    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    // Draw road
    drawRoad();

    // Draw obstacles and coins
    drawObstacles();
    drawCoins();

    // Draw bike
    drawBike(bike.x, bike.y, bike.angle);

    // If crashed, show crash effect
    if (bike.crashed) {
      ctx.fillStyle = 'rgba(255,0,0,0.5)';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 28px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('CRASHED!', WIDTH / 2, HEIGHT / 2);
    }

    updateUI();

    requestAnimationFrame(gameLoop);
  }

  // Input handlers
  function onPointerDown(e) {
    e.preventDefault();
    if (!bike.crashed) {
      isHolding = true;
    }
  }
  function onPointerUp(e) {
    e.preventDefault();
    isHolding = false;
  }

  function onKeyDown(e) {
    if (e.code === 'Space') {
      e.preventDefault();
      if (!bike.crashed) {
        isHolding = true;
      }
    }
  }

  function onKeyUp(e) {
    if (e.code === 'Space') {
      e.preventDefault();
      isHolding = false;
    }
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

  // Setup input listeners
  canvas.addEventListener('touchstart', onPointerDown, { passive: false });
  canvas.addEventListener('touchend', onPointerUp, { passive: false });
  canvas.addEventListener('mousedown', onPointerDown);
  canvas.addEventListener('mouseup', onPointerUp);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  // Initialize
  resetGame();
  requestAnimationFrame(gameLoop);
})();
