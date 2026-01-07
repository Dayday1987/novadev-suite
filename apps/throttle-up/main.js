const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const bikeImg = new Image(); bikeImg.src = "assets/bike/ninja-h2r-2.png";
const tireImg = new Image(); tireImg.src = "assets/bike/biketire.png";

let bikeReady = false;
bikeImg.onload = () => { bikeReady = true; };

// ==========================================
// TUNING & CONFIGURATION SECTION
// Adjust these values to fine-tune the feel!
// ==========================================
const CONFIG = {
    // --- VISUAL SCALING ---
    bikeScale: 0.15,          // Overall size of the bike
    tireSizeMult: 0.58,       // Tire size relative to bike height (Radius)
    
    // --- FRAME & WHEEL ALIGNMENT (The "Skeleton") ---
    // Frame Positioning
    rearWheelOffsetX: 55,     // Moves frame LEFT/RIGHT relative to the pivot point
    frameYShift: 5,           // Moves frame UP/DOWN to sit perfectly on tires
    noseDownAngle: 0.04,      // Tilts frame forward (positive is nose-down)

    // Wheel Positioning
    rearTireXShift: 7,        // Moves ONLY back tire RIGHT (positive) or LEFT (negative)
    frontTireX: 0.55,         // Moves front tire LEFT/RIGHT (percentage of bike width)

    // --- PHYSICS & SPEED ---
    maxSpeed: 60,             // Top speed cap (landscape feels better fast!)
    acceleration: 0.25,       // How quickly you reach top speed
    friction: 0.98,           // Natural coasting slowdown (1.0 = never slows down)
    
    // --- WHEELIE MECHANICS ---
    torque: -0.007,           // Strength of the "lift" when throttling (negative is UP)
    torqueSpeedMult: 0.0004,  // Higher speed = more air lift/torque power
    gravity: 0.05,            // Base pull that brings the front wheel down
    damping: 0.92,            // "Weight" of the bike; lower is snappier, higher is floaty
    crashAngle: -0.85,        // The "Point of No Return" (angle where you flip/loop)
    
    // --- WORLD & VIEW ---
    laneCount: 2,             // Number of lanes for swiping
    roadYPercent: 0.70        // Vertical position of road (0.0 top to 1.0 bottom)
};


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

let width, height;
function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
}
window.addEventListener("resize", resize);
resize();

const ROAD_Y = () => height * CONFIG.roadYPercent;
const ROAD_HEIGHT = () => height - ROAD_Y();

function update(now) {
    const laneHeight = ROAD_HEIGHT() / CONFIG.laneCount;
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
        // --- 1. HANDLE SPEED ---
        if (game.throttle) {
            game.speed += CONFIG.acceleration;
            // Torque: Lifts the bike
            game.bikeAngularVelocity += (CONFIG.torque - game.speed * CONFIG.torqueSpeedMult);
        } else {
            game.speed *= CONFIG.friction;
        }
        game.speed = Math.min(game.speed, CONFIG.maxSpeed);

        // --- 2. HANDLE PHYSICS ---
        const gravityForce = -game.bikeAngle * (CONFIG.gravity + Math.abs(game.bikeAngle) * 0.4);
        game.bikeAngularVelocity += gravityForce;
        game.bikeAngularVelocity *= CONFIG.damping;
        game.bikeAngle += game.bikeAngularVelocity;

        // Prevent bike from clipping into ground (Angle 0 is flat)
        if (game.bikeAngle > 0.03) { game.bikeAngle = 0; game.bikeAngularVelocity = 0; }
        
        game.scroll += game.speed;
        game.currentY += (targetY - game.currentY) * 0.1;

        // Crash check
        if (game.bikeAngle < CONFIG.crashAngle) resetGame();
    }
}

function draw() {
    ctx.fillStyle = "#6db3f2";
    ctx.fillRect(0, 0, width, height);
    
    // Background layers
    ctx.fillStyle = "#2e7d32"; ctx.fillRect(0, ROAD_Y() - 40, width, 40);
    ctx.fillStyle = "#333"; ctx.fillRect(0, ROAD_Y(), width, ROAD_HEIGHT());

    // Road Markings
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 2;
    ctx.setLineDash([60, 40]);
    ctx.lineDashOffset = game.scroll;
    ctx.beginPath();
    ctx.moveTo(0, ROAD_Y() + ROAD_HEIGHT() / 2);
    ctx.lineTo(width, ROAD_Y() + ROAD_HEIGHT() / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    if (bikeReady) {
        const bW = bikeImg.width * CONFIG.bikeScale;
        const bH = bikeImg.height * CONFIG.bikeScale;
        const pivotX = width * 0.25;

        ctx.save();
        // The Pivot point is the REAR AXLE on the road
        ctx.translate(pivotX, game.currentY);
        ctx.rotate(game.bikeAngle);
        
                // --- DRAW TIRES ---
        if (tireImg.complete) {
            const tS = bH * CONFIG.tireSizeMult;
            
            // Rear tire logic
            ctx.save();
            // --- ADD THIS LINE TO SLIDE THE TIRE INDEPENDENTLY ---
            ctx.translate(CONFIG.rearTireXShift, 0); 
            
            ctx.rotate(-game.scroll * 0.1);
            ctx.drawImage(tireImg, -tS/2, -tS/2, tS, tS);
            ctx.restore();
            
            // Front tire remains at its translate position
            ctx.save();
            ctx.translate(bW * CONFIG.frontTireX, 0);
            ctx.rotate(-game.scroll * 0.1);
            ctx.drawImage(tireImg, -tS/2, -tS/2, tS, tS);
            ctx.restore();
        }


        // --- DRAW FRAME ---
        ctx.save();
        // Tilt frame forward/backward independently of wheels
        ctx.rotate(CONFIG.noseDownAngle); 
        // offset X moves the frame relative to the rear wheel
        // frameYShift moves the frame up/down relative to the axle centers
        ctx.drawImage(bikeImg, -CONFIG.rearWheelOffsetX, -bH + CONFIG.frameYShift, bW, bH);
        ctx.restore();

        ctx.restore();
    }

    // Countdown UI
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

// Input handling (remains the same)
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
