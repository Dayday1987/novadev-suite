const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const bikeImg = new Image(); bikeImg.src = "assets/bike/ninja-h2r-2.png";
const tireImg = new Image(); tireImg.src = "assets/bike/biketire.png";

let bikeReady = false;
bikeImg.onload = () => { bikeReady = true; };

// GEOMETRY TUNING
const BIKE_SCALE = 0.15; 
const REAR_WHEEL_OFFSET_X = 75; // Pushes bike frame RIGHT (Rear tire shows behind)
const FRONT_TIRE_X_OFFSET = 0.62; // Moves front tire LEFT (Tucks into fairing)
const TIRE_RADIUS_SCALE = 0.58;  // Even bigger tires
const LANE_COUNT = 2;

let width, height;
function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
}
window.addEventListener("resize", resize);
resize();

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
            if (game.countdownIndex >= 3) game.phase = "RACING";
        }
        return;
    }

    if (game.phase === "RACING") {
        if (game.throttle) {
            game.speed += 0.25;
            game.bikeAngularVelocity += (-0.007 - game.speed * 0.0004);
        } else {
            game.speed *= 0.98;
        }
        game.speed = Math.min(game.speed, 60);

        const gravity = -game.bikeAngle * (0.05 + Math.abs(game.bikeAngle) * 0.4);
        game.bikeAngularVelocity += gravity;
        game.bikeAngularVelocity *= 0.92;
        game.bikeAngle += game.bikeAngularVelocity;

        if (game.bikeAngle > 0.03) { game.bikeAngle = 0; game.bikeAngularVelocity = 0; }
        
        game.scroll += game.speed;
        game.currentY += (targetY - game.currentY) * 0.1;

        if (game.bikeAngle < -0.8) resetGame();
    }
}

function draw() {
    // Ensure we clear the whole screen to prevent "ghosting" or black frames
    ctx.fillStyle = "#6db3f2";
    ctx.fillRect(0, 0, width, height);
    
    // Grass and Road
    ctx.fillStyle = "#2e7d32"; ctx.fillRect(0, ROAD_Y() - 40, width, 40);
    ctx.fillStyle = "#333"; ctx.fillRect(0, ROAD_Y(), width, ROAD_HEIGHT());

    // Road Lines
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
        const pivotX = width * 0.25;

        ctx.save();
        ctx.translate(pivotX, game.currentY);
        ctx.rotate(game.bikeAngle);
        
        // DRAW TIRES (Z-index: behind or aligned with frame)
        if (tireImg.complete) {
            const tS = bH * TIRE_RADIUS_SCALE;
            
            // 1. Rear Tire (Behind the bike body)
            ctx.save();
            ctx.rotate(-game.scroll * 0.1);
            ctx.drawImage(tireImg, -tS/2, -tS/2, tS, tS);
            ctx.restore();
            
            // 2. Front Tire (Tucked in front)
            ctx.save();
            ctx.translate(bW * FRONT_TIRE_X_OFFSET, 0);
            ctx.rotate(-game.scroll * 0.1);
            ctx.drawImage(tireImg, -tS/2, -tS/2, tS, tS);
            ctx.restore();
        }

        // DRAW FRAME (Nose slightly tilted down)
        ctx.save();
        ctx.rotate(0.04); 
        // We add a tiny Y offset (+5) to sit the frame perfectly on the tires
        ctx.drawImage(bikeImg, -REAR_WHEEL_OFFSET_X, -bH + 5, bW, bH);
        ctx.restore();

        ctx.restore();
    }

    // COUNTDOWN UI
    if (game.phase === "COUNTDOWN") {
        const cx = width / 2;
        const cy = 60;
        for(let i=0; i<3; i++) {
            ctx.fillStyle = (game.countdownIndex > i) ? (i === 2 ? "lime" : "yellow") : "rgba(0,0,0,0.3)";
            ctx.beginPath(); ctx.arc(cx + (i-1)*60, cy, 15, 0, Math.PI*2); ctx.fill();
        }
    }

    update(performance.now());
    requestAnimationFrame(draw);
}

// INPUTS
window.addEventListener("touchstart", (e) => {
    e.preventDefault();
    if (game.phase === "IDLE") {
        game.phase = "COUNTDOWN";
        game.countdownIndex = 0;
        game.countdownTimer = performance.now();
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
