const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Asset Loading
const bikeImg = new Image(); bikeImg.src = "assets/bike/ninja-h2r-2.png";
const tireImg = new Image(); tireImg.src = "assets/bike/biketire.png";

let bikeReady = false;
bikeImg.onload = () => { bikeReady = true; }; // Only start drawing bike when image is loaded

// ==========================================
// TUNING & CONFIGURATION SECTION
// ==========================================
const CONFIG = {
    // --- VISUAL SCALING ---
    bikeScale: 0.15,          // Size of the bike frame (0.1 = 10% of original image size)
    tireSizeMult: 0.58,       // Tire size relative to bike height (higher = beefier tires)
    
    // --- FRAME ALIGNMENT (The "Skeleton") ---
    rearWheelOffsetX: 55,     // Horizontal shift: Moves the frame left/right over the rear tire
    frameYShift: 5,           // Vertical shift: Moves frame up/down to sit on the axles
    noseDownAngle: 0.09,      // Static tilt: Tilts the bike nose-down for a more aggressive stance

    // --- WHEEL ALIGNMENT ---
    rearTireXShift: -25,      // Moves ONLY the back tire left or right
    frontTireX: 0.55,         // Moves front tire forward (calculated as % of bike width)

    // --- PHYSICS & SPEED ---
    maxSpeed: 160,            // The maximum velocity the bike can reach
    acceleration: 0.25,       // Speed added per frame when holding the throttle
    friction: 0.98,           // Percentage of speed kept per frame when coasting (0.98 = 2% loss)
    
    // --- WHEELIE MECHANICS ---
    torque: -0.007,           // Power of the lift (negative pulls the front wheel UP)
    torqueSpeedMult: 0.0004,  // Speed-based lift: faster speed = more aerodynamic/torque lift
    gravity: 0.03,            // Constant pull bringing the front wheel back to the road
    damping: 0.92,            // Elasticity: How much the wheelie "settles" (lower = stiffer)
    crashAngle: -0.85,        // The limit: If bike tilts past this angle, game resets
    
    // --- WORLD & VIEW ---
    laneCount: 2,             // Dividing the road into paths (0 = top lane, 1 = bottom lane)
    roadYPercent: 0.60,       // Vertical position of the road strip (0.0 = top, 1.0 = bottom)
    roadStripHeight: 150      // The actual thickness (in pixels) of the asphalt
};

// ==========================================
// GAME STATE TRACKING
// ==========================================
const game = {
    phase: "IDLE",            // Current state: IDLE, COUNTDOWN, or RACING
    speed: 0,                 // Current forward velocity
    scroll: 0,                // Total distance traveled (used to move road lines)
    lane: 1,                  // Current lane index (0 or 1)
    throttle: false,          // Is the user currently touching the screen?
    countdownIndex: 0,        // Which light is lit (0, 1, or 2)
    countdownTimer: 0,        // Timestamp to track timing between lights
    bikeAngle: 0,             // Current rotation of the bike (0 = flat on ground)
    bikeAngularVelocity: 0,    // Speed of the rotation (for smooth wheelies)
    currentY: 0               // Current vertical position of the bike (for lane switching)
};

// Handle Window Resizing
let width, height;
function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
}
window.addEventListener("resize", resize);
resize();

// Helper: Calculates exactly where the top of the road strip starts
const ROAD_Y = () => height * CONFIG.roadYPercent;

// ==========================================
// CORE LOGIC (Update Loop)
// ==========================================
function update(now) {
    // Calculate lane spacing based on the strip thickness
    const laneHeight = CONFIG.roadStripHeight / CONFIG.laneCount;
    // targetY is the middle of the current lane
    const targetY = ROAD_Y() + (game.lane * laneHeight) + (laneHeight / 2);
    
    if (game.phase === "IDLE") {
        game.currentY = targetY; // Keep bike snapped to lane center
        return;
    }

    if (game.phase === "COUNTDOWN") {
        if (now - game.countdownTimer > 800) { // Every 800ms, change the light
            game.countdownIndex++;
            game.countdownTimer = now;
            if (game.countdownIndex >= 3) game.phase = "RACING";
        }
        return;
    }

    if (game.phase === "RACING") {
        // Speed Logic
        if (game.throttle) {
            game.speed += CONFIG.acceleration;
            // Torque: Lift increases with speed
            game.bikeAngularVelocity += (CONFIG.torque - game.speed * CONFIG.torqueSpeedMult);
        } else {
            game.speed *= CONFIG.friction;
        }
        game.speed = Math.min(game.speed, CONFIG.maxSpeed);

        // Wheelie Physics (Gravity vs. Momentum)
        const gravityForce = -game.bikeAngle * (CONFIG.gravity + Math.abs(game.bikeAngle) * 0.4);
        game.bikeAngularVelocity += gravityForce;
        game.bikeAngularVelocity *= CONFIG.damping; // Prevent infinite bouncing
        game.bikeAngle += game.bikeAngularVelocity;

        // Ground Collision: Stop rotation if bike is flat on ground
        if (game.bikeAngle > 0.03) { game.bikeAngle = 0; game.bikeAngularVelocity = 0; }
        
        // Movement Logic
        game.scroll += game.speed; // Advance the road
        game.currentY += (targetY - game.currentY) * 0.1; // Smoothly slide toward lane center

        // Lose Condition
        if (game.bikeAngle < CONFIG.crashAngle) resetGame();
    }
}

// ==========================================
// RENDERING (Drawing Loop)
// ==========================================
function draw() {
    // Draw Sky
    ctx.fillStyle = "#6db3f2";
    ctx.fillRect(0, 0, width, height);
    
    // Draw Back Grass (All space above the road)
    ctx.fillStyle = "#2e7d32"; 
    ctx.fillRect(0, ROAD_Y() - 1000, width, 1000);

    // Draw Asphalt Strip
    ctx.fillStyle = "#333"; 
    ctx.fillRect(0, ROAD_Y(), width, CONFIG.roadStripHeight);

    // Draw Front Grass (All space below the road)
    ctx.fillStyle = "#2e7d32"; 
    ctx.fillRect(0, ROAD_Y() + CONFIG.roadStripHeight, width, height);

    // Draw Animated Road Lines
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 2;
    ctx.setLineDash([60, 40]); // Length of dash, length of gap
    ctx.lineDashOffset = game.scroll; // Move dashes backward as bike moves forward
    ctx.beginPath();
    ctx.moveTo(0, ROAD_Y() + CONFIG.roadStripHeight / 2);
    ctx.lineTo(width, ROAD_Y() + CONFIG.roadStripHeight / 2);
    ctx.stroke();
    ctx.setLineDash([]); // Reset dash for other drawing

    if (bikeReady) {
        const bW = bikeImg.width * CONFIG.bikeScale;
        const bH = bikeImg.height * CONFIG.bikeScale;
        const pivotX = width * 0.25; // Keep bike 25% from left edge

        ctx.save();
        ctx.translate(pivotX, game.currentY); // Move drawing center to rear axle
        ctx.rotate(game.bikeAngle); // Tilt entire bike+wheels for wheelie
        
        if (tireImg.complete) {
            const tS = bH * CONFIG.tireSizeMult;
            
            // Draw Rear Tire
            ctx.save();
            ctx.translate(CONFIG.rearTireXShift, 0); // Fine-tune tire vs swingarm
            ctx.rotate(-game.scroll * 0.1); // Spin based on distance
            ctx.drawImage(tireImg, -tS/2, -tS/2, tS, tS);
            ctx.restore();
            
            // Draw Front Tire
            ctx.save();
            ctx.translate(bW * CONFIG.frontTireX, 0); // Position at front forks
            ctx.rotate(-game.scroll * 0.1); // Spin based on distance
            ctx.drawImage(tireImg, -tS/2, -tS/2, tS, tS);
            ctx.restore();
        }

        // Draw Bike Frame
        ctx.save();
        ctx.rotate(CONFIG.noseDownAngle); // Apply static lean
        // Draw image relative to pivot point
        ctx.drawImage(bikeImg, -CONFIG.rearWheelOffsetX, -bH + CONFIG.frameYShift, bW, bH);
        ctx.restore();

        ctx.restore();
    }

    // Draw Countdown Lights
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

// ==========================================
// INPUT HANDLING
// ==========================================
window.addEventListener("touchstart", (e) => {
    e.preventDefault(); // Stop screen from zooming/selecting text
    if (game.phase === "IDLE") {
        game.phase = "COUNTDOWN";
        game.countdownIndex = 0;
        game.countdownTimer = performance.now();
    }
    game.throttle = true; // Engage power
}, { passive: false });

window.addEventListener("touchend", (e) => {
    e.preventDefault();
    game.throttle = false; // Release power
}, { passive: false });

window.addEventListener("touchmove", (e) => {
    e.preventDefault();
    const y = e.touches[0].clientY;
    // Split screen in half horizontally to determine lane
    game.lane = y < height / 2 ? 0 : 1;
}, { passive: false });

// Reset all physics variables
function resetGame() {
    game.phase = "IDLE"; 
    game.speed = 0; 
    game.bikeAngle = 0; 
    game.bikeAngularVelocity = 0;
}

// Start the game loop
draw();
