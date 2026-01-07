const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const bikeImg = new Image(); bikeImg.src = "assets/bike/ninja-h2r-2.png";
const tireImg = new Image(); tireImg.src = "assets/bike/biketire.png";

let bikeReady = false;
bikeImg.onload = () => bikeReady = true;

const BIKE_SCALE = 0.15; 
const REAR_WHEEL_OFFSET_X = 25; 
const LANE_COUNT = 2;

let width, height;
function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
}
window.addEventListener("resize", resize);
resize();

// FIX: Road now fills 100% of the remaining bottom space
const ROAD_Y = () => height * 0.70;
const ROAD_HEIGHT = () => height - ROAD_Y(); 

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

const COUNTDOWN_STEPS = ["YELLOW", "YELLOW", "GREEN"];

function update(now) {
    const laneHeight = ROAD_HEIGHT() / LANE_COUNT;
    const targetY = ROAD_Y() + (game.lane * laneHeight) + (laneHeight / 2);
    
    if (game.phase === "IDLE") {
        game.currentY = targetY;
        return;
    }

    if (game.phase === "COUNTDOWN") {
        if (now - game.countdownTimer > 800) {
            game.countdownIndex++;
            game.countdownTimer = now;
            if (game.countdownIndex >= COUNTDOWN_STEPS.length) game.phase = "RACING";
        }
        return;
    }

    if (game.phase !== "RACING") return;

    if (game.throttle) {
        game.speed += 0.25;
        game.bikeAngularVelocity += (-0.007 - game.speed * 0.0003);
    } else {
        game.speed *= 0.98;
    }
    game.speed = Math.min(game.speed, 60);

    const gravity = -game.bikeAngle * (0.04 + Math.abs(game.bikeAngle) * 0.3);
    game.bikeAngularVelocity += gravity;
    game.bikeAngularVelocity *= 0.92;
    game.bikeAngle += game.bikeAngularVelocity;

    if (game.bikeAngle > 0) { game.bikeAngle = 0; game.bikeAngularVelocity = 0; }

    game.scroll += game.speed;
    game.currentY += (targetY - game.currentY) * 0.1;

    if (game.bikeAngle < -0.75) resetGame();
}

function draw() {
    ctx.clearRect(0, 0, width, height);
    
    // Sky
    ctx.fillStyle = "#6db3f2"; ctx.fillRect(0, 0, width, height);
    
    // Grass (Visual buffer)
    ctx.fillStyle = "#2e7d32"; ctx.fillRect(0, ROAD_Y() - 40, width, 40);
    
    // Road (Now fills to the bottom)
    ctx.fillStyle = "#333";
    ctx.fillRect(0, ROAD_Y(), width, ROAD_HEIGHT());

    // Divider
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 2;
    ctx.setLineDash([60, 40]);
    ctx.lineDashOffset = game.scroll;
    ctx.beginPath();
    ctx.moveTo(0, ROAD_Y() + ROAD_HEIGHT() / 2);
    ctx.lineTo(width, ROAD_Y() + ROAD_HEIGHT() / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    if (bikeReady) {
        const bW = bikeImg.width * BIKE_SCALE;
        const bH = bikeImg.height * BIKE_SCALE;
        const pivotX = width * 0.2; 

        ctx.save();
        ctx.translate(pivotX, game.currentY);
        ctx.rotate(game.bikeAngle);
        
        ctx.drawImage(bikeImg, -REAR_WHEEL_OFFSET_X, -bH, bW, bH);
        
        if (tireImg.complete) {
            // FIX: Scaled tires up to 0.45 (from 0.38)
            const tS = bH * 0.45; 
            // Rear
            ctx.save();
            ctx.rotate(-game.scroll * 0.1);
            ctx.drawImage(tireImg, -tS/2, -tS/2, tS, tS);
            ctx.restore();
            // Front
            ctx.save();
            ctx.translate(bW * 0.72, 0);
            ctx.rotate(-game.scroll * 0.1);
            ctx.drawImage(tireImg, -tS/2, -tS/2, tS, tS);
            ctx.restore();
        }
        ctx.restore();
    }

    // UI
    if (game.phase === "COUNTDOWN") {
        const cx = width / 2;
        const cy = 60;
        ["#333", "#333", "#333"].forEach((c, i) => {
            if (game.countdownIndex === i && i < 2) c = "yellow";
            if (i === 2 && game.countdownIndex >= 2) c = "lime";
            ctx.fillStyle = c; ctx.beginPath(); ctx.arc(cx + (i-1)*60, cy, 15, 0, Math.PI*2); ctx.fill();
        });
    }

    update(performance.now());
    requestAnimationFrame(draw);
}

// Fullscreen + Throttle
window.addEventListener("touchstart", (e) => {
    e.preventDefault(); // This is the main fix for text selection
    if (game.phase === "IDLE") {
        game.phase = "COUNTDOWN";
        game.countdownIndex = 0;
        game.countdownTimer = performance.now();
        
        // Request Fullscreen on start
        if (canvas.requestFullscreen) canvas.requestFullscreen();
        else if (canvas.webkitRequestFullscreen) canvas.webkitRequestFullscreen();
    }
    game.throttle = true;
}, { passive: false });

window.addEventListener("touchend", (e) => {
    e.preventDefault();
    game.throttle = false;
}, { passive: false });

window.addEventListener("touchmove", (e) => {
    e.preventDefault();
    const y = e.touches[0].clientY;
    game.lane = y < height / 2 ? 0 : 1;
}, { passive: false });

function resetGame() {
    game.phase = "IDLE"; game.speed = 0; game.bikeAngle = 0; game.bikeAngularVelocity = 0;
}

draw();
