// =====================================================
// CANVAS & CONTEXT
// =====================================================
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// =====================================================
// ASSETS
// =====================================================
const bikeImg = new Image(); bikeImg.src = "assets/bike/ninja-h2r-2.png";
const tireImg = new Image(); tireImg.src = "assets/bike/biketire.png";

let bikeReady = false;
bikeImg.onload = () => { bikeReady = true; };

// =====================================================
// CONFIG
// =====================================================
const CONFIG = {
    bikeScale: 0.15,
    tireSizeMult: 0.55,

    rearWheelOffsetX: 55,
    frameYShift: 5,
    noseDownAngle: 0.06,

    rearTireXShift: -25,
    frontTireX: 0.55,

    maxSpeed: 160,
    acceleration: 0.25,
    friction: 0.98,

    torque: -0.0009,
    torqueSpeedMult: 0.0001,
    gravity: 0.05,
    damping: 0.92,
    crashAngle: -0.85,

    laneCount: 2,
    roadYPercent: 0.55,
    roadStripHeight: 150
};

// =====================================================
// GAME STATE
// =====================================================
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
    currentY: 0
};

// =====================================================
// RESIZE
// =====================================================
let width, height, roadYPos;

function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    roadYPos = height * CONFIG.roadYPercent;
}
window.addEventListener("resize", resize);
resize();

// =====================================================
// INPUT CONTROLLER (NEW)
// =====================================================
class InputController {
    constructor(canvas, game) {
        this.canvas = canvas;
        this.game = game;
        this.locked = false;

        this._bindTouch();
        this._bindKeyboard();
        this._bindGamepad();
    }

    lock() { this.locked = true; }
    unlock() { this.locked = false; }

    _startThrottle() {
        if (this.game.phase === "IDLE") {
            this.game.phase = "COUNTDOWN";
            this.game.countdownIndex = 0;
            this.game.countdownTimer = performance.now();
        }
        this.game.throttle = true;
    }

    _stopThrottle() {
        this.game.throttle = false;
    }

    _bindTouch() {
        this.canvas.addEventListener("touchstart", e => {
            if (this.locked) return;
            e.preventDefault();
            this._startThrottle();
        }, { passive: false });

        this.canvas.addEventListener("touchend", e => {
            if (this.locked) return;
            e.preventDefault();
            this._stopThrottle();
        }, { passive: false });

        this.canvas.addEventListener("touchmove", e => {
            if (this.locked) return;
            e.preventDefault();
            this.game.lane = e.touches[0].clientY < height / 2 ? 0 : 1;
        }, { passive: false });
    }

    _bindKeyboard() {
        window.addEventListener("keydown", e => {
            if (this.locked) return;
            if (e.code === "Space") this._startThrottle();
            if (e.code === "ArrowUp") this.game.lane = 0;
            if (e.code === "ArrowDown") this.game.lane = 1;
        });

        window.addEventListener("keyup", e => {
            if (e.code === "Space") this._stopThrottle();
        });
    }

    _bindGamepad() {
        const poll = () => {
            if (!this.locked) {
                const gp = navigator.getGamepads?.()[0];
                if (gp) {
                    gp.buttons[0]?.pressed ? this._startThrottle() : this._stopThrottle();

                    if (gp.axes[1] < -0.5) this.game.lane = 0;
                    if (gp.axes[1] > 0.5) this.game.lane = 1;
                }
            }
            requestAnimationFrame(poll);
        };
        poll();
    }
}

const input = new InputController(canvas, game);

// =====================================================
// GAME LOGIC
// =====================================================
function update(now) {
    const laneHeight = CONFIG.roadStripHeight / CONFIG.laneCount;
    const targetY = roadYPos + (game.lane * laneHeight) + laneHeight / 2;

    if (game.phase === "IDLE") {
        game.currentY = targetY;
        return;
    }

    if (game.phase === "COUNTDOWN") {
        if (now - game.countdownTimer > 800) {
            game.countdownIndex++;
            game.countdownTimer = now;
            if (game.countdownIndex >= 3) game.phase = "RACING";
        }
        return;
    }

    if (game.phase === "RACING") {
        if (game.throttle) {
            game.speed += CONFIG.acceleration;
            game.bikeAngularVelocity += (CONFIG.torque - game.speed * CONFIG.torqueSpeedMult);
        } else {
            game.speed *= CONFIG.friction;
        }

        game.speed = Math.min(game.speed, CONFIG.maxSpeed);

        const gravityForce = -game.bikeAngle * (CONFIG.gravity + Math.abs(game.bikeAngle) * 0.4);
        game.bikeAngularVelocity += gravityForce;
        game.bikeAngularVelocity *= CONFIG.damping;
        game.bikeAngle += game.bikeAngularVelocity;

        if (game.bikeAngle > 0.03) {
            game.bikeAngle = 0;
            game.bikeAngularVelocity = 0;
        }

        game.scroll += game.speed;
        game.currentY += (targetY - game.currentY) * 0.1;

        if (game.bikeAngle < CONFIG.crashAngle) resetGame();
    }
}

// =====================================================
// RENDER
// =====================================================
function draw() {
    ctx.fillStyle = "#2e7d32";
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "#6db3f2";
    ctx.fillRect(0, 0, width, roadYPos - 40);

    ctx.fillStyle = "#333";
    ctx.fillRect(0, roadYPos, width, CONFIG.roadStripHeight);

    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.setLineDash([60, 40]);
    ctx.lineDashOffset = game.scroll;
    ctx.beginPath();
    ctx.moveTo(0, roadYPos + CONFIG.roadStripHeight / 2);
    ctx.lineTo(width, roadYPos + CONFIG.roadStripHeight / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    if (bikeReady && tireImg.complete) {
        const bW = bikeImg.width * CONFIG.bikeScale;
        const bH = bikeImg.height * CONFIG.bikeScale;
        const pivotX = width * 0.25;
        const tS = bH * CONFIG.tireSizeMult;

        ctx.save();
        ctx.translate(pivotX, game.currentY);
        ctx.rotate(game.bikeAngle);

        ctx.save();
        ctx.translate(CONFIG.rearTireXShift, 0);
        ctx.rotate(-game.scroll * 0.1);
        ctx.drawImage(tireImg, -tS / 2, -tS / 2, tS, tS);
        ctx.restore();

        ctx.save();
        ctx.rotate(CONFIG.noseDownAngle);
        ctx.drawImage(bikeImg, -CONFIG.rearWheelOffsetX, -bH + CONFIG.frameYShift, bW, bH);
        ctx.restore();

        ctx.save();
        ctx.translate(bW * CONFIG.frontTireX, 0);
        ctx.rotate(-game.scroll * 0.1);
        ctx.drawImage(tireImg, -tS / 2, -tS / 2, tS, tS);
        ctx.restore();

        ctx.restore();
    }

    if (game.phase === "COUNTDOWN") {
        const cx = width / 2;
        const cy = 60;
        for (let i = 0; i < 3; i++) {
            ctx.fillStyle =
                game.countdownIndex > i
                    ? (i === 2 ? "lime" : "yellow")
                    : "rgba(0,0,0,0.3)";
            ctx.beginPath();
            ctx.arc(cx + (i - 1) * 60, cy, 15, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    update(performance.now());
    requestAnimationFrame(draw);
}

// =====================================================
// RESET
// =====================================================
function resetGame() {
    game.phase = "IDLE";
    game.speed = 0;
    game.bikeAngle = 0;
    game.bikeAngularVelocity = 0;
}

// =====================================================
draw();
