(() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('score');
  const distanceEl = document.getElementById('distance');
  const coinsEl = document.getElementById('coins');
  const highscoreEl = document.getElementById('highscore');
  const restartBtn = document.getElementById('restartBtn');

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
  const BIKE_WIDTH = 60;
  const BIKE_HEIGHT = 30;

  let bike = {
    x: 60,
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
  const sounds = {
    wheelSpin: null,
    crash: null,
  };

  function createSound(freq, duration, type = 'square') {
    if (!window.AudioContext) return null;
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();

    setTimeout(() => {
      oscillator.stop();
      audioCtx.close();
    }, duration);

    return audioCtx;
  }

  // Play short beep for crash
  function playCrashSound() {
    if (sounds.crash) return;
    if (!window.AudioContext) return;
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(100, audioCtx.currentTime);
    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();

    setTimeout(() => {
      oscillator.stop();
      audioCtx.close();
      sounds.crash = null;
    }, 300);

    sounds.crash = audioCtx;
  }

  // Play continuous wheel spin sound while holding
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

  // Generate obstacles at intervals
  function spawnObstacle() {
    const lastObstacle = obstacles[obstacles.length - 1];
    let x = WIDTH + Math.random() * (OBSTACLE_GAP_MAX - OBSTACLE_GAP_MIN) + OBSTACLE_GAP_MIN;
    if (lastObstacle) x = lastObstacle.x + Math.random() * (OBSTACLE_GAP_MAX - OBSTACLE_GAP_MIN) + OBSTACLE_GAP_MIN;

    obstacles.push({
      x,
      y: HEIGHT - 60 - OBSTACLE_HEIGHT,
      width: OBSTACLE_WIDTH,
      height: OBSTACLE_HEIGHT,
      passed: false,
    });
  }

  // Generate coins at intervals
  function spawnCoin() {
    const lastCoin = coins[coins.length - 1];
    let x = WIDTH + Math.random() * (OBSTACLE_GAP_MAX - OBSTACLE_GAP_MIN) + OBSTACLE_GAP_MIN;
    if (lastCoin) x = lastCoin.x + Math.random() * (OBSTACLE_GAP_MAX - OBSTACLE_GAP_MIN) + OBSTACLE_GAP_MIN;

    coins.push({
      x,
      y: HEIGHT - 100 - Math.random() * 40,
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
    scoreEl.textContent = bike.wheelieTime.toFixed(2);
    distanceEl.textContent = Math.floor(bike.distance);
    coinsEl.textContent = bike.coins;
    highscoreEl.textContent = highscore.toFixed(2);
  }

  // Draw bike as a simple SVG-like shape on canvas
  function drawBike(x, y, angle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-angle);

    // Draw wheels
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(-20, 10, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(20, 10, 12, 0, Math.PI * 2);
    ctx.fill();

    // Draw wheel rims
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(-20, 10, 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(20, 10, 8, 0, Math.PI * 2);
    ctx.stroke();

    // Draw bike body
    ctx.fillStyle = '#4a8c1f';
    ctx.beginPath();
    ctx.moveTo(-25, 10);
    ctx.lineTo(-10, -10);
    ctx.lineTo(15, -10);
    ctx.lineTo(25, 10);
    ctx.closePath();
    ctx.fill();

    // Draw front fork and handlebar
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(20, 10);
    ctx.lineTo(30, -20);
    ctx.lineTo(40, -25);
    ctx.stroke();

    // Rider silhouette (simple)
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(0, -20, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-5, -10);
    ctx.lineTo(5, -10);
    ctx.lineTo(5, 0);
    ctx.lineTo(-5, 0);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  // Draw obstacles as rectangles
  function drawObstacles() {
    ctx.fillStyle = '#800000';
    obstacles.forEach(o => {
      ctx.fillRect(o.x, o.y, o.width, o.height);
    });
  }

  // Draw coins as yellow circles
  function drawCoins() {
    ctx.fillStyle = '#ffcc00';
    coins.forEach(c => {
      if (!c.collected) {
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#aa8800';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });
  }

  // Draw ground line
  function drawGround() {
    ctx.strokeStyle = '#2e5d0e';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, HEIGHT - 50);
    ctx.lineTo(WIDTH, HEIGHT - 50);
    ctx.stroke();
  }

  // Check collision between bike and obstacles
  function checkCollision() {
    // Bike bounding box approximation
    const bikeBox = {
      x: bike.x - 25,
      y: bike.y - 20,
      width: 50,
      height: 40,
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

      // Update distance
      bike.distance += OBSTACLE_SPEED * delta * 60;

      // Update obstacles and coins positions
      obstacles.forEach(o => (o.x -= OBSTACLE_SPEED));
      coins.forEach(c => (c.x -= COIN_SPEED));

      // Remove offscreen obstacles and coins
      obstacles = obstacles.filter(o => o.x + o.width > 0);
      coins = coins.filter(c => c.x + c.radius > 0);

      // Spawn new obstacles and coins
      if (obstacles.length === 0 || obstacles[obstacles.length - 1].x < WIDTH - OBSTACLE_GAP_MIN) {
        spawnObstacle();
      }
      if (coins.length === 0 || coins[coins.length - 1].x < WIDTH - OBSTACLE_GAP_MIN) {
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
      if (bike.wheelieTime > highscore) {
        highscore = bike.wheelieTime;
        localStorage.setItem('wheelieHighscore', highscore.toFixed(2));
      }
    }

    // Clear canvas
    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    // Draw ground
    drawGround();

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
      ctx.font = 'bold 24px monospace';
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
