const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Assets
const bikeImg = new Image(); bikeImg.src = "assets/bike/ninja-h2r-2.png";
const tireImg = new Image(); tireImg.src = "assets/bike/biketire.png";
const riderImg = new Image(); riderImg.src = "assets/bike/bike-rider.png";

let width, height;
function resize() {
    width = canvas.width = canvas.offsetWidth;
    height = canvas.height = canvas.offsetHeight;
}
window.addEventListener("resize", resize);
resize();

const game = {
    phase: "IDLE",
    speed: 0,
    scroll: 0,
    angle: 0,
    vAngle: 0,
    throttle: false,
    timer: 0,
    step: 0,
    lane: 1, 
    currentY: 0,
    touchStartY: 0
};

const overlay = document.getElementById("countdownOverlay");
const lights = [
    document.getElementById("lightYellow1"),
    document.getElementById("lightYellow2"),
    document.getElementById("lightGreen")
];

// PERSPECTIVE CONSTANTS
const HORIZON_Y = 0.45;     // Road starts 45% down the screen (Higher = Longer Road)
const ROAD_W_TOP = 0.30;    // Road is only 30% wide at the horizon
const ROAD_W_BOT = 1.20;    // Road is 120% wide at bottom (overflows for effect)

function startCountdown() {
    game.phase = "COUNTDOWN";
    game.step = 0;
    game.timer = Date.now();
    overlay.hidden = false;
    lights.forEach(l => l.classList.remove("active"));
}

function update() {
    if (game.phase === "COUNTDOWN") {
        const now = Date.now();
        if (now - game.timer > 800) {
            if (game.step < 3) {
                lights[game.step].classList.add("active");
                game.step++;
                game.timer = now;
            } else {
                overlay.hidden = true;
                game.phase = "RACING";
            }
        }
    }

    if (game.phase === "RACING") {
        if (game.throttle) {
            game.vAngle += 0.005;
            game.speed = Math.min(game.speed + 0.15, 18);
        } else {
            game.vAngle -= 0.008;
            game.speed = Math.max(game.speed - 0.1, 0);
        }
        
        game.scroll += game.speed;
        game.angle = Math.max(0, game.angle + game.vAngle);
        game.vAngle *= 0.96;

        // Perspective Lane Calculation
        // Lane 0 is further (higher Y, smaller scale), Lane 1 is closer (lower Y, larger scale)
        const lane0Y = height * 0.70; 
        const lane1Y = height * 0.85;
        const targetY = game.lane === 0 ? lane0Y : lane1Y;
        
        if (game.currentY === 0) game.currentY = lane1Y;
        game.currentY += (targetY - game.currentY) * 0.1;

        if (game.angle > 1.7) {
            game.phase = "IDLE";
            game.angle = 0; game.vAngle = 0; game.speed = 0;
            alert("Crash!");
        }
    }
}

function draw() {
    ctx.clearRect(0, 0, width, height);
    
    // 1. Sky
    ctx.fillStyle = "#87ceeb";
    ctx.fillRect(0, 0, width, height);

    const hY = height * HORIZON_Y;
    const bY = height; // Bottom of screen

    // 2. Road Trapezoid (Perspective)
    ctx.fillStyle = "#333";
    ctx.beginPath();
    ctx.moveTo(width / 2 - (width * ROAD_W_TOP) / 2, hY);
    ctx.lineTo(width / 2 + (width * ROAD_W_TOP) / 2, hY);
    ctx.lineTo(width / 2 + (width * ROAD_W_BOT) / 2, bY);
    ctx.lineTo(width / 2 - (width * ROAD_W_BOT) / 2, bY);
    ctx.fill();

    // 3. Scrolling Lane Dashes (Angled)
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.lineWidth = 6;
    ctx.lineDashOffset = game.scroll;
    ctx.setLineDash([60, 100]);
    
    // Draw the center divider line
    ctx.beginPath();
    ctx.moveTo(width / 2, hY);
    ctx.lineTo(width / 2, bY);
    ctx.stroke();
    ctx.restore();

    // 4. Draw Bike
    // We scale the bike down slightly if it's in the "far" lane (Lane 0)
    const perspectiveScale = game.lane === 0 ? 0.14 : 0.18;
    const pivotX = width * 0.3;

    ctx.save();
    ctx.translate(pivotX, game.currentY);
    ctx.rotate(-game.angle);

    if (bikeImg.complete && tireImg.complete) {
        const bW = bikeImg.width * perspectiveScale;
        const bH = bikeImg.height * perspectiveScale;
        const tSize = bH * 0.45;

        // Rear Tire (Pivot)
        ctx.save();
        ctx.rotate(game.scroll * 0.1);
        ctx.drawImage(tireImg, -tSize/2, -tSize/2, tSize, tSize);
        ctx.restore();

        // Front Tire
        ctx.save();
        ctx.translate(bW * 0.72, 0); 
        ctx.rotate(game.scroll * 0.1);
        ctx.drawImage(tireImg, -tSize/2, -tSize/2, tSize, tSize);
        ctx.restore();

        // Frame & Rider
        ctx.drawImage(bikeImg, -bW * 0.2, -bH + (tSize * 0.3), bW, bH);
        if (riderImg.complete) {
            ctx.drawImage(riderImg, -bW * 0.1, -bH * 1.05, bW * 0.8, bH * 0.8);
        }
    }
    ctx.restore();

    update();
    requestAnimationFrame(draw);
}

// INPUT
canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    game.touchStartY = e.touches[0].clientY;
    if (game.phase === "IDLE") startCountdown();
    if (game.phase === "RACING") game.throttle = true;
});

canvas.addEventListener("touchend", (e) => {
    game.throttle = false;
    const diffY = game.touchStartY - e.changedTouches[0].clientY;
    if (Math.abs(diffY) > 30) { 
        game.lane = diffY > 0 ? 0 : 1; 
    }
});

draw();
