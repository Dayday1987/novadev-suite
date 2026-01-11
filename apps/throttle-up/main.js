// ==========================================
// THROTTLE UP - IMPROVED VERSION
// A motorcycle wheelie physics game
// ==========================================

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// ==========================================
// ASSET LOADING SYSTEM
// ==========================================
const assets = {
    bike: { img: new Image(), loaded: false },
    tire: { img: new Image(), loaded: false },
    rider: { img: new Image(), loaded: false }
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
    // Visual scaling
    bikeScale: 0.15,
    tireSizeMult: 0.60,
    
    // Frame alignment
    rearWheelOffsetX: 55,
    frameYShift: -35,
    noseDownAngle: 0.02,
    
    // Wheel alignment
    rearTireXShift: -42,
    frontTireX: 0.60,
    
    // Physics
    maxSpeed: 150,
    acceleration: 0.5,  // Increased from 0.25
    friction: 0.995,  // Reduced friction from 0.98
    
    // Wheelie mechanics
    torque: 0.0006,
    torqueSpeedMult: 0.0001,
    gravity: 0.008,
    damping: 0.92,
    crashAngle: -0.75,
    
    // Wheelie detection thresholds
    WHEELIE_START_ANGLE: -0.02,
    GROUND_CONTACT_ANGLE: 0.03,
    
    // World
    laneCount: 2,
    roadYPercent: 0.45,
    roadStripHeight: 150,
    
    // Visual positioning
    BIKE_X_PERCENT: 0.10,
    LANE_SWITCH_SMOOTHING: 0.1,
    
    // Countdown
    COUNTDOWN_Y: 60,
    COUNTDOWN_SPACING: 60,
    COUNTDOWN_RADIUS: 15,
    COUNTDOWN_INTERVAL_MS: 800
};

// ==========================================
// GAME STATE
// ==========================================
const game = {
    phase: "IDLE",
    speed: 0,
    scroll: 0,
    lane: 1,
    throttle: false,
    countdownIndex: 0,
    countdownTimer: 0,
    bikeAngle: 0,
    bikeAngularVelocity: 0,
    currentY: 0,
    wheelRotation: 0,
    score: 0,
    bestScore: parseInt(localStorage.getItem('throttleUpBest')) || 0,
    inWheelie: false,
    distance: 0
};

let width, height, roadYPos;
let lastTime = performance.now();
let paused = false;

// ==========================================
// AUDIO SYSTEM
// ==========================================
const audio = {
    enabled: true,
    sounds: {},
    
    init() {
        try {
            this.sounds.engine = new Audio('assets/audio/engine-rev.mp3');
            this.sounds.crash = new Audio('assets/audio/crash.wav');
            this.sounds.crowd = new Audio('assets/audio/crowd.wav');
            
            this.sounds.engine.loop = true;
            this.sounds.crowd.loop = true;
            this.sounds.crowd.volume = 0.3;
        } catch (e) {
            console.warn('Audio initialization failed:', e);
            this.enabled = false;
        }
    },
    
    play(name) {
        if (this.enabled && this.sounds[name]) {
            const sound = this.sounds[name];
            sound.currentTime = 0;
            sound.play().catch(e => console.log('Audio play failed:', e));
        }
    },
    
    stop(name) {
        if (this.enabled && this.sounds[name]) {
            this.sounds[name].pause();
            this.sounds[name].currentTime = 0;
        }
    },
    
    updateEngineSound() {
        if (this.enabled && this.sounds.engine) {
            const pitchFactor = 1 + (game.speed / CONFIG.maxSpeed) * 0.5;
            this.sounds.engine.playbackRate = Math.max(0.5, Math.min(2, pitchFactor));
            this.sounds.engine.volume = game.throttle ? 0.4 : 0.2;
        }
    }
};

// ==========================================
// PARTICLE SYSTEM
// ==========================================
const particles = {
    list: [],
    
    createDust(x, y) {
        if (game.speed < 20) return;
        
        for (let i = 0; i < 3; i++) {
            this.list.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 2 - game.speed * 0.1,
                vy: (Math.random() - 0.5) * 2,
                life: 1.0,
                size: Math.random() * 3 + 2,
                color: '#888'
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
                color: ['#ff4400', '#ffaa00', '#ffff00'][Math.floor(Math.random() * 3)]
            });
        }
    },
    
    update(deltaTime) {
        this.list = this.list.filter(p => {
            p.x += p.vx * deltaTime;
            p.y += p.vy * deltaTime;
            p.vy += 0.15 * deltaTime;
            p.life -= 0.02 * deltaTime;
            return p.life > 0;
        });
    },
    
    draw() {
        this.list.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life;
            ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
        });
        ctx.globalAlpha = 1.0;
    }
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
    }
};

// ==========================================
// SCREEN RESIZE
// ==========================================
function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    roadYPos = height * CONFIG.roadYPercent;
}

window.addEventListener("resize", resize);
resize();

// ==========================================
// INPUT SYSTEM
// ==========================================
const input = {
    locked: false,
    
    lock() { this.locked = true; },
    unlock() { this.locked = false; },
    
    startThrottle() {
        if (this.locked || !gameReady) return;
        
        if (game.phase === "IDLE") {
            game.phase = "COUNTDOWN";
            game.countdownIndex = 0;
            game.countdownTimer = performance.now();
            audio.play('crowd');
        }
        game.throttle = true;
    },
    
    stopThrottle() {
        game.throttle = false;
    }
};

// Touch input
canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    input.startThrottle();
}, { passive: false });

canvas.addEventListener("touchend", (e) => {
    e.preventDefault();
    input.stopThrottle();
}, { passive: false });

canvas.addEventListener("touchmove", (e) => {
    if (input.locked) return;
    e.preventDefault();
    const y = e.touches[0].clientY;
    game.lane = y < height / 2 ? 0 : 1;
}, { passive: false });

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
const infoPopup = document.getElementById('infoPopup');
const infoBtn = document.getElementById('infoBtn');
const closeInfoBtn = document.getElementById('closeInfoBtn');
const homeBtn = document.getElementById('homeBtn');

infoBtn?.addEventListener('click', () => {
    infoPopup.hidden = false;
    input.lock();
    if (game.phase === "RACING") togglePause();
});

closeInfoBtn?.addEventListener('click', () => {
    infoPopup.hidden = true;
    input.unlock();
});

homeBtn?.addEventListener('click', () => {
    window.location.href = '../../index.html';
});

function updateUI() {
    const scoreEl = document.getElementById('score');
    const distanceEl = document.getElementById('distance');
    const highscoreEl = document.getElementById('highscore');
    
    if (scoreEl) scoreEl.textContent = Math.floor(game.score);
    if (distanceEl) distanceEl.textContent = Math.floor(game.distance);
    if (highscoreEl) highscoreEl.textContent = Math.floor(game.bestScore);
}

// ==========================================
// PAUSE SYSTEM
// ==========================================
function togglePause() {
    if (game.phase !== "RACING") return;
    
    paused = !paused;
    
    if (paused) {
        audio.stop('engine');
    } else {
        audio.play('engine');
        lastTime = performance.now();
    }
}

// ==========================================
// GAME LOGIC
// ==========================================
function resetGame() {
    game.phase = "IDLE";
    game.speed = 0;
    game.bikeAngle = 0;
    game.bikeAngularVelocity = 0;
    game.inWheelie = false;
    game.score = 0;
    game.distance = 0;
    game.scroll = 0;
    game.wheelRotation = 0;
    particles.list = [];
    audio.stop('engine');
    audio.stop('crowd');
    updateUI();
}

function crash() {
    const bikeX = width * CONFIG.BIKE_X_PERCENT;
    camera.startShake(15);
    particles.createCrashSparks(bikeX, game.currentY);
    audio.stop('engine');
    audio.play('crash');
    
    setTimeout(() => {
        endWheelie();
    }, 1000);
}

function endWheelie() {
    if (game.score > game.bestScore) {
        game.bestScore = game.score;
        localStorage.setItem('throttleUpBest', game.bestScore);
    }
    resetGame();
}

function update(now) {
    if (paused) return;
    
    const deltaTime = Math.min((now - lastTime) / 16.67, 2);
    lastTime = now;
    
    camera.update(deltaTime);
    particles.update(deltaTime);
    
    if (game.phase === "IDLE") {
        const laneHeight = CONFIG.roadStripHeight / CONFIG.laneCount;
        const laneTopY = roadYPos + (game.lane * laneHeight);
        const laneSurfaceY = laneTopY + laneHeight;
        const tS = assets.bike.img.height * CONFIG.bikeScale * CONFIG.tireSizeMult;
        game.currentY = laneSurfaceY - (tS / 2);
        return;
    }
    
    if (game.phase === "COUNTDOWN") {
        if (now - game.countdownTimer > CONFIG.COUNTDOWN_INTERVAL_MS) {
            game.countdownIndex++;
            game.countdownTimer = now;
            
            if (game.countdownIndex >= 3) {
                game.phase = "RACING";
                audio.play('engine');
            }
        }
        return;
    }
    
    if (game.phase === "RACING") {
        // Speed and acceleration
        if (game.throttle && game.speed >= 0) {
            game.speed += CONFIG.acceleration * deltaTime;
            game.bikeAngularVelocity -= CONFIG.torque * deltaTime;
        } else {
            game.speed *= Math.pow(CONFIG.friction, deltaTime);
            if (game.speed < 0.05) game.speed = 0;
        }
        
        game.speed = Math.min(game.speed, CONFIG.maxSpeed);
        
        // Physics - gravity pulls nose down (positive direction)
        const gravityForce = -game.bikeAngle * (CONFIG.gravity + Math.abs(game.bikeAngle) * 0.4);
        game.bikeAngularVelocity += gravityForce * deltaTime;
        game.bikeAngularVelocity *= Math.pow(CONFIG.damping, deltaTime);
        game.bikeAngle += game.bikeAngularVelocity * deltaTime;
        
        if (game.bikeAngle > CONFIG.GROUND_CONTACT_ANGLE) {
            game.bikeAngle = CONFIG.GROUND_CONTACT_ANGLE;
            game.bikeAngularVelocity *= 0.5;
        }
        
        // Movement - move forward with speed (scroll moves background backward)
        if (game.speed > 0) {
            game.scroll -= game.speed * deltaTime;  // Negative = road moves backward as bike goes forward
            game.wheelRotation -= game.speed * 0.02 * deltaTime;  // Negative for forward rotation
            game.distance += game.speed * 0.1 * deltaTime;
        }
        
        // Update audio
        audio.updateEngineSound();
        
        // Dust particles
        if (Math.random() < 0.1 && game.speed > 20) {
            const bikeX = width * CONFIG.BIKE_X_PERCENT;
            particles.createDust(bikeX - 30, game.currentY + 10);
        }
        
        // Wheelie detection
        if (game.bikeAngle < CONFIG.WHEELIE_START_ANGLE) {
            if (!game.inWheelie) {
                game.inWheelie = true;
                game.score = 0;
            }
            game.score += 1 * deltaTime;
        } else {
            if (game.inWheelie) {
                endWheelie();
            }
        }
        
        // Crash detection
        if (game.bikeAngle < CONFIG.crashAngle) {
            crash();
        }
        
        updateUI();
    }
}

// ==========================================
// RENDERING
// ==========================================
function drawLoadingScreen() {
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, width, height);
    
    const progress = assetsLoaded / TOTAL_ASSETS;
    
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 48px Roboto Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('THROTTLE UP', width / 2, height / 2 - 60);
    
    // Progress bar
    const barWidth = 400;
    const barHeight = 30;
    const barX = (width - barWidth) / 2;
    const barY = height / 2 + 20;
    
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 2;
    ctx.strokeRect(barX, barY, barWidth, barHeight);
    
    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(barX + 2, barY + 2, (barWidth - 4) * progress, barHeight - 4);
    
    ctx.fillStyle = '#aaa';
    ctx.font = '20px Roboto Mono, monospace';
    ctx.fillText(`Loading... ${Math.floor(progress * 100)}%`, width / 2, barY + barHeight + 40);
}

function drawWheelieIndicator() {
    if (!game.inWheelie || game.phase !== "RACING") return;
    
    const x = width / 2;
    const y = 100;
    const pulse = Math.sin(Date.now() / 100) * 0.15 + 1;
    
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(pulse, pulse);
    
    ctx.fillStyle = '#FFD700';
    ctx.strokeStyle = '#FF4500';
    ctx.lineWidth = 4;
    ctx.font = 'bold 42px Roboto Mono, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeText('WHEELIE!', 0, 0);
    ctx.fillText('WHEELIE!', 0, 0);
    
    ctx.restore();
}

function drawSpeedometer() {
    if (game.phase !== "RACING") return;
    
    const x = width - 100;
    const y = height - 100;
    const radius = 45;
    
    // Background circle
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.arc(x, y, radius + 5, 0, Math.PI * 2);
    ctx.fill();
    
    // Outer arc
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0.75 * Math.PI, 2.25 * Math.PI);
    ctx.stroke();
    
    // Speed arc
    const speedPercent = game.speed / CONFIG.maxSpeed;
    const angle = 0.75 * Math.PI + (speedPercent * 1.5 * Math.PI);
    
    ctx.strokeStyle = speedPercent > 0.8 ? '#ff4444' : '#4CAF50';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0.75 * Math.PI, angle);
    ctx.stroke();
    
    // Speed text
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 24px Roboto Mono, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(Math.floor(game.speed), x, y);
    
    ctx.font = '12px Roboto Mono, monospace';
    ctx.fillText('km/h', x, y + 20);
}

function draw() {
    if (!gameReady) {
        drawLoadingScreen();
        requestAnimationFrame(draw);
        return;
    }
    
    // Background - fill entire screen with grass
    ctx.fillStyle = "#2e7d32";
    ctx.fillRect(0, 0, width, height);
    
    // Sky - only above the road
    ctx.fillStyle = "#6db3f2";
    ctx.fillRect(0, 0, width, roadYPos - 40);
    
    // Road
    ctx.fillStyle = "#333";
    ctx.fillRect(0, roadYPos, width, CONFIG.roadStripHeight);
    
    // Road markings
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.setLineDash([60, 40]);
    ctx.lineDashOffset = -(game.scroll % 100);
    ctx.beginPath();
    ctx.moveTo(0, roadYPos + CONFIG.roadStripHeight / 2);
    ctx.lineTo(width, roadYPos + CONFIG.roadStripHeight / 2);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Apply camera shake
    ctx.save();
    camera.apply();
    
    // Draw entities
    particles.draw();
    
    // Draw bike
    if (assets.bike.loaded && assets.tire.loaded) {
        const bW = assets.bike.img.width * CONFIG.bikeScale;
        const bH = assets.bike.img.height * CONFIG.bikeScale;
        const tS = bH * CONFIG.tireSizeMult;
        const pivotX = width * CONFIG.BIKE_X_PERCENT;
        
        const laneHeight = CONFIG.roadStripHeight / CONFIG.laneCount;
        const laneTopY = roadYPos + (game.lane * laneHeight);
        const laneSurfaceY = laneTopY + laneHeight;
        const targetY = laneSurfaceY - (tS / 2);
        
        game.currentY += (targetY - game.currentY) * CONFIG.LANE_SWITCH_SMOOTHING;
        
        ctx.save();
        ctx.translate(pivotX + CONFIG.rearTireXShift, game.currentY);
        ctx.rotate(game.bikeAngle);
        
        // Rear tire
        ctx.save();
        ctx.rotate(game.wheelRotation);
        ctx.drawImage(assets.tire.img, -tS/2, -tS/2, tS, tS);
        ctx.restore();
        
        // Bike frame
        ctx.save();
        ctx.rotate(CONFIG.noseDownAngle);
        ctx.drawImage(assets.bike.img, -CONFIG.rearWheelOffsetX - CONFIG.rearTireXShift, -bH/2 + CONFIG.frameYShift, bW, bH);
        ctx.restore();
        
        // Front tire
        ctx.save();
        ctx.translate(bW * CONFIG.frontTireX - CONFIG.rearTireXShift, 0);
        ctx.rotate(game.wheelRotation);
        ctx.drawImage(assets.tire.img, -tS/2, -tS/2, tS, tS);
        ctx.restore();
        
        ctx.restore();
    }
    
    ctx.restore();
    
    // Countdown
    if (game.phase === "COUNTDOWN") {
        const cx = width / 2;
        const cy = CONFIG.COUNTDOWN_Y;
        
        for (let i = 0; i < 3; i++) {
            ctx.fillStyle = game.countdownIndex > i 
                ? (i === 2 ? "lime" : "yellow") 
                : "rgba(0,0,0,0.3)";
            ctx.beginPath();
            ctx.arc(cx + (i - 1) * CONFIG.COUNTDOWN_SPACING, cy, CONFIG.COUNTDOWN_RADIUS, 0, Math.PI * 2);
            ctx.fill();
            
            if (game.countdownIndex > i) {
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        }
    }
    
    // UI overlays
    drawWheelieIndicator();
    drawSpeedometer();
    
    // Pause indicator
    if (paused) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 48px Roboto Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText('PAUSED', width / 2, height / 2);
        ctx.font = '20px Roboto Mono, monospace';
        ctx.fillText('Press ESC to resume', width / 2, height / 2 + 50);
    }
    
    update(performance.now());
    requestAnimationFrame(draw);
}

// ==========================================
// INITIALIZATION
// ==========================================
loadAssets();
draw();
