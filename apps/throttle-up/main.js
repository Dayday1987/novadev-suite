// ==========================================
// THROTTLE UP – FIXED BUILD
// ==========================================

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// ==========================================
// ASSETS
// ==========================================
const assets = {
    bike: { img: new Image(), loaded: false },
    tire: { img: new Image(), loaded: false },
    rider: { img: new Image(), loaded: false },
};

let assetsLoaded = 0;
const TOTAL_ASSETS = 3;
let gameReady = false;

function loadAsset(asset, src) {
    asset.img.src = src;
    asset.img.onload = () => {
        asset.loaded = true;
        assetsLoaded++;
        if (assetsLoaded === TOTAL_ASSETS) {
            gameReady = true;
        }
    };
}

function loadAssets() {
    loadAsset(assets.bike, "assets/bike/ninja-h2r-2.png");
    loadAsset(assets.tire, "assets/bike/biketire.png");
    loadAsset(assets.rider, "assets/bike/bike-rider.png");
}

// ==========================================
// CONFIG
// ==========================================
const CONFIG = {
    bikeScale: 0.15,
    tireSizeMult: 0.6,

    rearWheelOffsetX: 55,
    frameYShift: -35,
    noseDownAngle: 0.01,

    rearTireXShift: -42,
    frontTireX: 0.6,

    maxSpeed: 170,
    acceleration: 0.35,

    // Wheelie physics
    wheelieBalanceAngle: -0.45,
    throttleTorque: 0.045,
    brakeTorque: 0.06,
    gravityTorque: 0.10,
    angularDamping: 0.992,
    maxAngularVelocity: 2.2,

    WHEELIE_START_ANGLE: -0.05,
    GROUND_CONTACT_ANGLE: 0.03,

    laneCount: 2,
    roadYPercent: 0.45,
    roadStripHeight: 150,

    BIKE_X_PERCENT: 0.1,
    LANE_SWITCH_SMOOTHING: 0.1,

    RIDER_LEAN_FORWARD: -0.15,
    RIDER_LEAN_BACK: 0.2,
};

// ==========================================
// GAME STATE
// ==========================================
const game = {
    phase: "IDLE",
    speed: 0,
    lane: 1,

    throttle: false,
    brake: false,

    bikeAngle: 0,
    bikeAngularVelocity: 0,

    wheelRotation: 0,
    distance: 0,
    dashOffset: 0,

    inWheelie: false,
    score: 0,

    currentY: 0,

    countdownIndex: 0,
    countdownTimer: 0,
};

// ==========================================
// INPUT
// ==========================================
function startThrottle() {
    if (!gameReady) return;

    if (game.phase === "IDLE") {
        game.phase = "COUNTDOWN";
        game.countdownIndex = 0;
        game.countdownTimer = performance.now();
    }

    game.throttle = true;
}

function stopThrottle() {
    game.throttle = false;
}

canvas.addEventListener("touchstart", e => {
    e.preventDefault();
    startThrottle();
}, { passive: false });

canvas.addEventListener("touchend", e => {
    e.preventDefault();
    stopThrottle();
}, { passive: false });

window.addEventListener("keydown", e => {
    if (e.code === "Space") {
        e.preventDefault();
        startThrottle();
    }
    if (e.code === "ArrowLeft") game.brake = true;
});

window.addEventListener("keyup", e => {
    if (e.code === "Space") {
        e.preventDefault();
        stopThrottle();
    }
    if (e.code === "ArrowLeft") game.brake = false;
});

// ==========================================
// RESIZE
// ==========================================
let width, height, roadYPos;

function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    roadYPos = height * CONFIG.roadYPercent;
}
window.addEventListener("resize", resize);
resize();

// ==========================================
// UPDATE LOOP
// ==========================================
let lastTime = performance.now();

function update(now) {
    const dt = Math.min((now - lastTime) / 16.67, 2);
    lastTime = now;

    // COUNTDOWN
    if (game.phase === "COUNTDOWN") {
        if (now - game.countdownTimer > 800) {
            game.countdownIndex++;
            game.countdownTimer = now;
            if (game.countdownIndex >= 3) {
                game.phase = "RACING";
            }
        }
        return;
    }

    if (game.phase !== "RACING") return;

    // SPEED (NO REVERSE)
    if (game.throttle) {
        game.speed += CONFIG.acceleration * dt;
    } else {
        game.speed -= 0.05 * dt;
    }
    game.speed = Math.max(0, Math.min(CONFIG.maxSpeed, game.speed));

    // WHEELIE PHYSICS
    let torque = 0;
    if (game.throttle) torque -= CONFIG.throttleTorque;
    if (game.brake) torque += CONFIG.brakeTorque;

    torque -= Math.sin(game.bikeAngle - CONFIG.wheelieBalanceAngle)
        * CONFIG.gravityTorque;

    game.bikeAngularVelocity += torque * dt;
    game.bikeAngularVelocity *= Math.pow(CONFIG.angularDamping, dt);
    game.bikeAngularVelocity = Math.max(
        -CONFIG.maxAngularVelocity,
        Math.min(CONFIG.maxAngularVelocity, game.bikeAngularVelocity)
    );

    game.bikeAngle += game.bikeAngularVelocity * dt;

    if (game.bikeAngle > CONFIG.GROUND_CONTACT_ANGLE) {
        game.bikeAngle = CONFIG.GROUND_CONTACT_ANGLE;
        if (game.bikeAngularVelocity > 0) {
            game.bikeAngularVelocity *= 0.3;
        }
    }

    // WORLD SCROLL
    game.wheelRotation -= game.speed * 0.02 * dt;
    game.distance += game.speed * 0.1 * dt;
    game.dashOffset -= game.speed * dt;
}

// ==========================================
// DRAW
// ==========================================
function draw() {
    ctx.fillStyle = "#2e7d32";
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "#333";
    ctx.fillRect(0, roadYPos, width, CONFIG.roadStripHeight);

    ctx.strokeStyle = "#fff";
    ctx.setLineDash([60, 40]);
    ctx.lineDashOffset = -game.dashOffset;
    ctx.beginPath();
    ctx.moveTo(0, roadYPos + CONFIG.roadStripHeight / 2);
    ctx.lineTo(width, roadYPos + CONFIG.roadStripHeight / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    if (assets.bike.loaded && assets.tire.loaded) {
        const bW = assets.bike.img.width * CONFIG.bikeScale;
        const bH = assets.bike.img.height * CONFIG.bikeScale;
        const tS = bH * CONFIG.tireSizeMult;

        const pivotX = width * CONFIG.BIKE_X_PERCENT;
        const laneHeight = CONFIG.roadStripHeight / CONFIG.laneCount;
        const laneTopY = roadYPos + game.lane * laneHeight;
        const surfaceY = laneTopY + laneHeight;
        const targetY = surfaceY - tS / 2;

        game.currentY += (targetY - game.currentY) * CONFIG.LANE_SWITCH_SMOOTHING;

        ctx.save();
        ctx.translate(pivotX, game.currentY);
        ctx.rotate(game.bikeAngle);

        // Rear tire
        ctx.save();
        ctx.rotate(game.wheelRotation);
        ctx.drawImage(assets.tire.img, -tS/2, -tS/2, tS, tS);
        ctx.restore();

        // Frame
        ctx.save();
        ctx.rotate(CONFIG.noseDownAngle);
        ctx.drawImage(
            assets.bike.img,
            -CONFIG.rearWheelOffsetX,
            -bH/2 + CONFIG.frameYShift,
            bW,
            bH
        );
        ctx.restore();

        // Rider (slightly higher)
        if (assets.rider.loaded) {
            ctx.save();
            const lean = game.bikeAngle < CONFIG.WHEELIE_START_ANGLE
                ? CONFIG.RIDER_LEAN_BACK
                : CONFIG.RIDER_LEAN_FORWARD;

            ctx.translate(bW * 0.25, -bH * 0.78);
            ctx.rotate(lean);
            ctx.drawImage(
                assets.rider.img,
                -bW * 0.25,
                -bH * 0.4,
                bW * 0.5,
                bH * 0.8
            );
            ctx.restore();
        }

        // Front tire
        ctx.save();
        ctx.translate(bW * CONFIG.frontTireX, 0);
        ctx.rotate(game.wheelRotation);
        ctx.drawImage(assets.tire.img, -tS/2, -tS/2, tS, tS);
        ctx.restore();

        ctx.restore();
    }

    update(performance.now());
    requestAnimationFrame(draw);
}

// ==========================================
// START
// ==========================================
loadAssets();
draw();
