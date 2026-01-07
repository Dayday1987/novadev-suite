const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Assets
const bikeImg = new Image(); bikeImg.src = "assets/bike/ninja-h2r-2.png";
const tireImg = new Image(); tireImg.src = "assets/bike/biketire.png";
const riderImg = new Image(); riderImg.src = "assets/bike/bike-rider.png";

let bikeReady = false;
bikeImg.onload = () => bikeReady = true;

// Adjusted Constants for Right-Facing Bike
const BIKE_SCALE = 0.5; 
// Offset now represents the distance from the LEFT edge of the image to the rear wheel center
const REAR_WHEEL_OFFSET_X = 85; 
const LANE_COUNT = 2;

let width, height;
function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
}
window.addEventListener("resize", resize);
resize();

const ROAD_HEIGHT = () => height * 0.28;
const ROAD_Y = () => height - ROAD_HEIGHT();

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
    fingerDown: false,
    currentY: 0
};

const COUNTDOWN_STEPS = ["YELLOW", "YELLOW", "GREEN"];

// ===== Physics & Update =====
function update(now) {
    if (game.phase === "COUNTDOWN") {
        if (now - game.countdownTimer > 800) {
            game.countdownIndex++;
            game.countdownTimer = now;
            if (game.countdownIndex >= COUNTDOWN_STEPS.length) {
                game.phase = "RACING";
                if (game.fingerDown) game.throttle = true;
            }
        }
        return;
    }

    if (game.phase !== "RACING") return;

    if (game.throttle) {
        game.speed += 0.25;
    } else {
        game.speed *= 0.97;
    }
    game.speed = Math.min(game.speed, 50);

    // Physics Torque (Single source of truth)
    if (game.throttle) {
        // Torque is negative here because rotating "up" for a right-facing bike is a negative angle in Canvas
        const torque = -0.008 - game.speed * 0.0004;
        game.bikeAngularVelocity += torque;
    }

    // Gravity restoring force (pushes back toward 0)
    const gravityForce = -game.bikeAngle * (0.05 + Math.abs(game.bikeAngle) * 0.4);
    game.bikeAngularVelocity += gravityForce;
    game.bikeAngularVelocity *= 0.92; 
    
    game.bikeAngle += game.bikeAngularVelocity;

    // Limit the wheelie so it doesn't just spin 360 (until it crashes)
    game.bikeAngle = Math.max(-2.0, Math.min(0, game.bikeAngle));

    game.scroll += game.speed;

    const laneHeight = ROAD_HEIGHT() / LANE_COUNT;
    const targetY = ROAD_Y() + laneHeight * game.lane + laneHeight / 2;
    if (game.currentY === 0) game.currentY = targetY;
    game.currentY += (targetY - game.currentY) * 0.1;

    // Crash limits (Adjusted for right-facing negative angles)
    if (game.bikeAngle < -0.65 || (game.bikeAngle > 0.1 && game.speed > 5)) {
        resetGame();
    }
}

// ===== Rendering =====
function draw() {
    ctx.clearRect(0, 0, width, height);
    
    // Sky
    ctx.fillStyle = "#6db3f2";
    ctx.fillRect(0, 0, width, height);

    // Environment
    ctx.fillStyle = "#2e7d32"; 
    ctx.fillRect(0, ROAD_Y() - 60, width, 60);
    ctx.fillStyle = "#333"; 
    ctx.fillRect(0, ROAD_Y(), width, ROAD_HEIGHT());

    // Scrolling Divider
    ctx.strokeStyle = "#bbb";
    ctx.lineWidth = 4;
    const dashTotal = 70;
    ctx.setLineDash([40, 30]);
    // Positive scroll for left-to-right movement
    ctx.lineDashOffset = -game.scroll % dashTotal;
    ctx.beginPath();
    ctx.moveTo(0, ROAD_Y() + ROAD_HEIGHT() / 2);
    ctx.lineTo(width, ROAD_Y() + ROAD_HEIGHT() / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Bike
    if (bikeReady) {
        const rearGroundX = width * 0.25; // Keep bike on the left side of screen
        const w = bikeImg.width * BIKE_SCALE;
        const h = bikeImg.height * BIKE_SCALE;

        ctx.save();
        ctx.translate(rearGroundX, game.currentY);
        ctx.rotate(game.bikeAngle);
        
        // NO scale flip - keep it facing right
        
        // Draw the frame relative to the rear wheel center
        ctx.drawImage(bikeImg, -REAR_WHEEL_OFFSET_X, -h, w, h);
        
        // Tires
        if (tireImg.complete) {
            const tSize = h * 0.35;
            // Rear tire (at 0,0 relative to translation)
            ctx.save();
            ctx.translate(0, -tSize/4);
            ctx.rotate(game.scroll * 0.1);
            ctx.drawImage(tireImg, -tSize/2, -tSize/2, tSize, tSize);
            ctx.restore();
            
            // Front tire (at the front of the bike)
            ctx.save();
            ctx.translate(w * 0.7, -tSize/4);
            ctx.rotate(game.scroll * 0.1);
            ctx.drawImage(tireImg, -tSize/2, -tSize/2, tSize, tSize);
            ctx.restore();
        }
        ctx.restore();
    }

    // Countdown Lights
    if (game.phase === "COUNTDOWN") {
        const light = COUNTDOWN_STEPS[game.countdownIndex];
        const cx = width / 2;
        const cy = 100;
        ["#333", "#333", "#333"].forEach((color, i) => {
            if (light === "YELLOW" && i === game.countdownIndex) color = "yellow";
            if (light === "GREEN" && i === 2) color = "lime";
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(cx + (i - 1) * 50, cy, 20, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    update(performance.now());
    requestAnimationFrame(draw);
}

// Input Handlers
window.addEventListener("touchstart", (e) => {
    e.preventDefault();
    game.fingerDown = true;
    if (game.phase === "IDLE") {
        game.phase = "COUNTDOWN";
        game.countdownIndex = 0;
        game.countdownTimer = performance.now();
    }
    if (game.phase === "RACING") game.throttle = true;
}, { passive: false });

window.addEventListener("touchend", () => {
    game.fingerDown = false;
    game.throttle = false;
}, { passive: false });

window.addEventListener("touchmove", (e) => {
    const y = e.touches[0].clientY;
    game.lane = y < height / 2 ? 0 : 1;
}, { passive: false });

function resetGame() {
    game.phase = "IDLE";
    game.speed = 0;
    game.bikeAngle = 0;
    game.bikeAngularVelocity = 0;
    game.throttle = false;
}

draw();
