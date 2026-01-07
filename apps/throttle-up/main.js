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
    lane: 1, // 0 for Top, 1 for Bottom
    targetY: 0,
    currentY: 0,
    touchStartY: 0 // For swipe detection
};

const overlay = document.getElementById("countdownOverlay");
const lights = [
    document.getElementById("lightYellow1"),
    document.getElementById("lightYellow2"),
    document.getElementById("lightGreen")
];

// Road Geometry Constants
const ROAD_TOP = 0.55;    // Horizon position (55% down the screen)
const ROAD_HEIGHT = 0.35; // Road thickness (35% of screen height)

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
        // Throttle & Speed
        if (game.throttle) {
            game.vAngle += 0.005;
            game.speed = Math.min(game.speed + 0.15, 15);
        } else {
            game.vAngle -= 0.008;
            game.speed = Math.max(game.speed - 0.1, 0);
        }
        
        game.scroll += game.speed;
        game.angle = Math.max(0, game.angle + game.vAngle);
        game.vAngle *= 0.96;

        // Lane interpolation (Smoothly move bike to the target lane)
        const roadStartY = height * ROAD_TOP;
        const laneHeight = (height * ROAD_HEIGHT) / 2;
        game.targetY = roadStartY + (game.lane * laneHeight) + (laneHeight * 0.5);
        
        // Easing: move currentY toward targetY
        game.currentY += (game.targetY - game.currentY) * 0.1;

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

    const rTop = height * ROAD_TOP;
    const rHeight = height * ROAD_HEIGHT;

    // 2. Grass (Distant)
    ctx.fillStyle = "#2d7d32";
    ctx.fillRect(0, rTop - 40, width, 40);

    // 3. Road (Trapezoid for perspective)
    ctx.fillStyle = "#333";
    ctx.beginPath();
    ctx.moveTo(0, rTop);
    ctx.lineTo(width, rTop);
    ctx.lineTo(width, rTop + rHeight);
    ctx.lineTo(0, rTop + rHeight);
    ctx.fill();

    // 4. Scrolling Lane Dashes
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 4;
    ctx.lineDashOffset = game.scroll; 
    ctx.setLineDash([40, 60]);
    ctx.beginPath();
    ctx.moveTo(0, rTop + (rHeight / 2));
    ctx.lineTo(width, rTop + (rHeight / 2));
    ctx.stroke();
    ctx.setLineDash([]);

    // 5. Draw Bike
    const scale = 0.18; // Slightly smaller to fit the narrower road
    const pivotX = width * 0.25;
    
    // Start at initial Y if game just started
    if (game.currentY === 0) game.currentY = rTop + (rHeight * 0.75);

    ctx.save();
    ctx.translate(pivotX, game.currentY);
    ctx.rotate(-game.angle);

    if (bikeImg.complete && tireImg.complete) {
        const bW = bikeImg.width * scale;
        const bH = bikeImg.height * scale;
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

// =====================
// INPUT (With Swipe)
// =====================
canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    game.touchStartY = e.touches[0].clientY;
    
    if (game.phase === "IDLE") startCountdown();
    if (game.phase === "RACING") game.throttle = true;
});

canvas.addEventListener("touchend", (e) => {
    game.throttle = false;
    
    // Swipe detection logic
    const touchEndY = e.changedTouches[0].clientY;
    const diffY = game.touchStartY - touchEndY;

    if (Math.abs(diffY) > 30) { // Swipe threshold
        if (diffY > 0) game.lane = 0; // Swiped Up
        else game.lane = 1;          // Swiped Down
    }
});

draw();
