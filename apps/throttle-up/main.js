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
    lane: 1, // 0 for Far Lane (Top), 1 for Near Lane (Bottom)
    currentY: 0,
    touchStartY: 0
};

const overlay = document.getElementById("countdownOverlay");
const lights = [
    document.getElementById("lightYellow1"),
    document.getElementById("lightYellow2"),
    document.getElementById("lightGreen")
];

// PERSPECTIVE CONSTANTS (Side-View)
const HORIZON_Y_PERCENT = 0.65; // Moves road up (0.0 to 1.0)
const ROAD_HEIGHT_PX = 120;     // Narrower road for "distance" feel

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
            game.speed = Math.min(game.speed + 0.12, 16);
        } else {
            game.vAngle -= 0.008;
            game.speed = Math.max(game.speed - 0.08, 0);
        }
        
        game.scroll += game.speed;
        game.angle = Math.max(0, game.angle + game.vAngle);
        game.vAngle *= 0.96;

        // Lane positions based on the narrowed road height
        const roadStartY = height * HORIZON_Y_PERCENT;
        const lane0Y = roadStartY + (ROAD_HEIGHT_PX * 0.25); // Top Lane
        const lane1Y = roadStartY + (ROAD_HEIGHT_PX * 0.75); // Bottom Lane
        
        const targetY = game.lane === 0 ? lane0Y : lane1Y;
        
        if (game.currentY === 0) game.currentY = lane1Y;
        game.currentY += (targetY - game.currentY) * 0.1; // Smooth transition

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

    const rY = height * HORIZON_Y_PERCENT;
    const rH = ROAD_HEIGHT_PX;

    // 2. Grass Background
    ctx.fillStyle = "#2d7d32";
    ctx.fillRect(0, rY - 60, width, 60);

    // 3. Road Surface
    ctx.fillStyle = "#333";
    ctx.fillRect(0, rY, width, rH);

    // 4. Scrolling Lane Dashes (Side-view horizontal)
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.lineWidth = 3;
    ctx.lineDashOffset = game.scroll;
    ctx.setLineDash([50, 50]);
    ctx.beginPath();
    ctx.moveTo(0, rY + (rH / 2));
    ctx.lineTo(width, rY + (rH / 2));
    ctx.stroke();
    ctx.setLineDash([]);

    // 5. Draw Bike
    // Lane 0 (further away) gets a slightly smaller scale
    const baseScale = 0.18;
    const pScale = game.lane === 0 ? baseScale * 0.85 : baseScale;
    const pivotX = width * 0.25;

    ctx.save();
    ctx.translate(pivotX, game.currentY);
    ctx.rotate(-game.angle);

    if (bikeImg.complete && tireImg.complete) {
        const bW = bikeImg.width * pScale;
        const bH = bikeImg.height * pScale;
        const tSize = bH * 0.45;

        // Rear Tire (Pinned to road at translate point 0,0)
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

        // Frame (Adjusted so frame sits on tires)
        ctx.drawImage(bikeImg, -bW * 0.2, -bH + (tSize * 0.35), bW, bH);
        
        // Rider
        if (riderImg.complete) {
            ctx.drawImage(riderImg, -bW * 0.1, -bH * 1.05, bW * 0.8, bH * 0.8);
        }
    }
    ctx.restore();

    update();
    requestAnimationFrame(draw);
}

// =====================
// INPUT (Swipe Up/Down)
// =====================
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
        game.lane = diffY > 0 ? 0 : 1; // Swipe Up = Top Lane, Down = Bottom
    }
});

draw();
