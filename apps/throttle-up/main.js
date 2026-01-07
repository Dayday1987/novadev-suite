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
    step: 0
};

const overlay = document.getElementById("countdownOverlay");
const lights = [
    document.getElementById("lightYellow1"),
    document.getElementById("lightYellow2"),
    document.getElementById("lightGreen")
];

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
            game.speed = Math.min(game.speed + 0.15, 15);
        } else {
            game.vAngle -= 0.008;
            game.speed = Math.max(game.speed - 0.1, 0);
        }
        
        // Update scroll based on speed
        game.scroll += game.speed;

        game.angle = Math.max(0, game.angle + game.vAngle);
        game.vAngle *= 0.96;

        if (game.angle > 1.7) {
            game.phase = "IDLE";
            game.angle = 0;
            game.vAngle = 0;
            game.speed = 0;
            alert("Crash!");
        }
    }
}

function draw() {
    ctx.clearRect(0, 0, width, height);
    
    // 1. Sky
    ctx.fillStyle = "#87ceeb";
    ctx.fillRect(0, 0, width, height);

    const roadY = height * 0.75;
    const roadH = height * 0.25;

    // 2. Grass
    ctx.fillStyle = "#2d7d32";
    ctx.fillRect(0, roadY - 40, width, 40);

    // 3. Road
    ctx.fillStyle = "#333";
    ctx.fillRect(0, roadY, width, roadH);

    // 4. Scrolling Lane Dashes
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 4;
    // lineDashOffset makes the dashes move!
    ctx.lineDashOffset = game.scroll; 
    ctx.setLineDash([40, 40]);
    ctx.beginPath();
    ctx.moveTo(0, roadY + roadH / 2);
    ctx.lineTo(width, roadY + roadH / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // 5. Draw Bike (PIVOT FIX)
    const scale = 0.22;
    // Pivot Point: Where the back tire meets the road
    const pivotX = width * 0.25;
    const pivotY = roadY + 40; 

    ctx.save();
    // Move to the contact point of the REAR tire
    ctx.translate(pivotX, pivotY);
    ctx.rotate(-game.angle);

    if (bikeImg.complete && tireImg.complete) {
        const bW = bikeImg.width * scale;
        const bH = bikeImg.height * scale;
        const tSize = bH * 0.45;

        // Draw Rear Tire centered on the pivot (0,0)
        // Rotating it based on scroll to simulate movement
        ctx.save();
        ctx.rotate(game.scroll * 0.1);
        ctx.drawImage(tireImg, -tSize/2, -tSize/2, tSize, tSize);
        ctx.restore();

        // Draw Front Tire (offset to the right)
        ctx.save();
        ctx.translate(bW * 0.72, 0); 
        ctx.rotate(game.scroll * 0.1);
        ctx.drawImage(tireImg, -tSize/2, -tSize/2, tSize, tSize);
        ctx.restore();

        // Draw Bike Frame relative to rear tire
        // We adjust the Y so the frame sits "on top" of the tire
        ctx.drawImage(bikeImg, -bW * 0.2, -bH + (tSize * 0.3), bW, bH);

        // Draw Rider
        if (riderImg.complete) {
            ctx.drawImage(riderImg, -bW * 0.1, -bH * 1.05, bW * 0.8, bH * 0.8);
        }
    } else {
        // Fallback
        ctx.fillStyle = "orange";
        ctx.fillRect(-20, -40, 80, 40);
    }
    ctx.restore();

    update();
    requestAnimationFrame(draw);
}

canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    if (game.phase === "IDLE") startCountdown();
    if (game.phase === "RACING") game.throttle = true;
});
canvas.addEventListener("touchend", () => game.throttle = false);

draw();
