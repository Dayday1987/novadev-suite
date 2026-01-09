// Get the canvas element from the HTML
const canvas = document.getElementById("gameCanvas");
// Get the 2D drawing context (the "paintbrush")
const ctx = canvas.getContext("2d");

// Create image objects for the bike and tires
const bikeImg = new Image(); bikeImg.src = "assets/bike/ninja-h2r-2.png";
const tireImg = new Image(); tireImg.src = "assets/bike/biketire.png";

// Variable to track if the images are loaded and ready to draw
let bikeReady = false;
// Set bikeReady to true once the bike image finishes downloading
bikeImg.onload = () => { bikeReady = true; }; 

// ==========================================
// TUNING & CONFIGURATION SECTION
// ==========================================
const CONFIG = {
    // --- VISUAL SCALING ---
    bikeScale: 0.15,          // Size of the bike (0.15 = 15% of original image)
    tireSizeMult: 0.60,       // Size of tires (Higher = bigger wheels)
    
    // --- FRAME ALIGNMENT ---
    rearWheelOffsetX: 55,     // Shifts the bike body left/right over the rear tire
    frameYShift: -35,          // Shifts the bike body up/down on the axles (negative = up)
    noseDownAngle: 0.02,      // The default tilt of the bike (leaning forward)

    // --- WHEEL ALIGNMENT ---
    rearTireXShift: -42,      // Moves only the back tire left/right
    frontTireX: 0.60,         // Moves the front tire (0.55 = 55% of the bike's width)

    // --- PHYSICS & SPEED ---
    maxSpeed: 150,            // The fastest the bike can possibly go
    acceleration: 0.25,       // How much speed is added every frame you hold down
    friction: 0.98,           // How much speed you keep when letting go (0.98 = 2% loss)
    
    // --- WHEELIE MECHANICS ---
    torque: 0.0006,          // Power of the lift (Negative numbers pull the front wheel UP)
    torqueSpeedMult: 0.0001,  // Increases lift power as you go faster (wind/momentum)
    gravity: 0.008,            // Force pulling the front wheel back to the asphalt
    damping: 0.92,            // Smoothness (Higher = floatier, Lower = snappier/heavier)
    crashAngle: -0.75,        // The limit (If you tilt past this, you flip over)
    
    // --- WORLD & VIEW ---
    laneCount: 2,             // Number of lanes you can switch between
    roadYPercent: 0.55,       // VERTICAL POSITION: 0.50 is middle, 0.40 is higher, 0.60 is lower
    roadStripHeight: 150      // The thickness of the gray asphalt strip
};

// ==========================================
// GAME STATE
// ==========================================
const game = {
    phase: "IDLE",            // Current part of the game: IDLE, COUNTDOWN, or RACING
    speed: 0,                 // Current forward velocity
    scroll: 0,                // Total distance covered (used to move road lines)
    lane: 1,                  // Current lane (0 = top, 1 = bottom)
    throttle: false,          // Is the user touching the screen?
    countdownIndex: 0,        // Which light is on (0, 1, or 2)
    countdownTimer: 0,        // Timer to track 800ms intervals for lights
    bikeAngle: 0,             // Current rotation of the bike (0 is flat)
    bikeAngularVelocity: 0,   // The speed of the bike's rotation
    currentY: 0,              // The actual vertical pixel position of the bike
    wheelRotation: 0,         // Visual wheel spin (radians)
    score: 0,                 // Current wheelie score
    bestScore: 0,             // Best wheelie score
    inWheelie: false          // Currently in a wheelie
};

// Variables for screen dimensions
let width, height, roadYPos; 

// Function to handle screen resizing and orientation changes
function resize() {
    width = canvas.width = window.innerWidth; // Set canvas width to screen width
    height = canvas.height = window.innerHeight; // Set canvas height to screen height
    roadYPos = height * CONFIG.roadYPercent; // Calculate the road position in pixels
}
window.addEventListener("resize", resize); // Run resize when window changes
resize(); // Run resize immediately on load

// ==========================================
// INPUT LOCKING + MULTI-INPUT SUPPORT
// ==========================================

// Central input lock to prevent gameplay input when UI is active
const input = {
    locked: false
};

// Start accelerating and begin countdown if idle
function startThrottle() {
    if (game.phase === "IDLE") {
        game.phase = "COUNTDOWN";
        game.countdownIndex = 0;
        game.countdownTimer = performance.now();
    }
    game.throttle = true;
}

// Stop accelerating
function stopThrottle() {
    game.throttle = false;
}

// Touch input (canvas only so UI buttons still work)
canvas.addEventListener("touchstart", (e) => {
    if (input.locked) return;
    e.preventDefault(); // Stop mobile "bounce" and selection
    startThrottle();
}, { passive: false });

canvas.addEventListener("touchend", (e) => {
    if (input.locked) return;
    e.preventDefault();
    stopThrottle();
}, { passive: false });

canvas.addEventListener("touchmove", (e) => {
    if (input.locked) return;
    e.preventDefault();
    const y = e.touches[0].clientY; // Get Y position of finger
    game.lane = y < height / 2 ? 0 : 1; // Top half = Lane 0, Bottom half = Lane 1
}, { passive: false });

// Keyboard input (desktop support)
window.addEventListener("keydown", (e) => {
    if (input.locked) return;
    if (e.code === "Space") startThrottle();
    if (e.code === "ArrowUp") game.lane = 0;
    if (e.code === "ArrowDown") game.lane = 1;
});

window.addEventListener("keyup", (e) => {
    if (e.code === "Space") stopThrottle();
});

// Gamepad input (controller support)
function pollGamepad() {
    if (!input.locked) {
        const gp = navigator.getGamepads?.()[0];
        if (gp) {
            gp.buttons[0]?.pressed ? startThrottle() : stopThrottle();
            if (gp.axes[1] < -0.5) game.lane = 0;
            if (gp.axes[1] > 0.5) game.lane = 1;
        }
    }
    requestAnimationFrame(pollGamepad);
}
pollGamepad();

// Function to reset the bike if it crashes
function resetGame() {
    game.phase = "IDLE"; 
    game.speed = 0; 
    game.bikeAngle = 0; 
    game.bikeAngularVelocity = 0;
    game.inWheelie = false;
    game.score = 0;
}

// End wheelie and save best score
function endWheelie() {
    game.bestScore = Math.max(game.bestScore, game.score);
    resetGame();
}

// ==========================================
// GAME LOGIC (The "Brain")
// ==========================================
function update(now) {
    // If not playing, initialize position
    if (game.phase === "IDLE") {
        const laneHeight = CONFIG.roadStripHeight / CONFIG.laneCount;
        const laneTopY = roadYPos + (game.lane * laneHeight);
        const laneSurfaceY = laneTopY + laneHeight;
        const tS = bikeImg.height * CONFIG.bikeScale * CONFIG.tireSizeMult;
        game.currentY = laneSurfaceY - (tS / 2);
        return;
    }

    // Handle the 3-light countdown logic
    if (game.phase === "COUNTDOWN") {
        if (now - game.countdownTimer > 800) { // If 800ms has passed
            game.countdownIndex++; // Light up the next bulb
            game.countdownTimer = now; // Reset the timer
            if (game.countdownIndex >= 3) game.phase = "RACING"; // Start game after 3 lights
        }
        return;
    }

    // Racing Physics
    if (game.phase === "RACING") {
        // Gain speed if touching, lose speed to friction if not
        if (game.throttle) {
            game.speed += CONFIG.acceleration;
            // Lift the front wheel when throttling
            game.bikeAngularVelocity -= CONFIG.torque;
        } else {
            game.speed *= CONFIG.friction;
            if (game.speed < 0.05) game.speed = 0;
        }

        // Cap the speed at the max allowed
        game.speed = Math.min(game.speed, CONFIG.maxSpeed);

        // Calculate gravity pulling the bike back down (increases as the bike tilts higher)
        const gravityForce = -game.bikeAngle * (CONFIG.gravity + Math.abs(game.bikeAngle) * 0.4);
        game.bikeAngularVelocity += gravityForce; // Apply gravity to rotation speed
        game.bikeAngularVelocity *= CONFIG.damping; // Apply damping to prevent infinite bouncing
        game.bikeAngle += game.bikeAngularVelocity; // Apply rotation speed to the actual angle

        // Prevent the bike from rotating "into" the ground
        if (game.bikeAngle > 0.03) { 
            game.bikeAngle = 0.03; 
            game.bikeAngularVelocity *= 0.5; 
        }
        
        game.scroll += game.speed; // Move the world forward based on speed
        game.wheelRotation += game.speed * 0.02; // Advance wheel spin based on forward speed
        // Lane switching is now handled in draw() function

        // Check if in a wheelie (front tire lifted)
        if (game.bikeAngle < -0.02) {
            if (!game.inWheelie) {
                game.inWheelie = true;
                game.score = 0; // start counting fresh
            }
            game.score += 1; // increase score while wheelie held
        } else {
            if (game.inWheelie) {
                // front tire hit ground → end of wheelie
                endWheelie();
            }
        }

        // If the bike flips back too far, reset the game
        if (game.bikeAngle < CONFIG.crashAngle) {
            // Flipped backwards
            endWheelie();
        }
    }
}

// ==========================================
// RENDERING (The "Eyes")
// ==========================================
function draw() {
    // Fill the entire background with the grass color first
    ctx.fillStyle = "#2e7d32";
    ctx.fillRect(0, 0, width, height);
    
    // Draw the Blue Sky on the top half
    ctx.fillStyle = "#6db3f2";
    ctx.fillRect(0, 0, width, roadYPos - 40); // Ends just above the "horizon" grass

    // Draw the Asphalt Strip (The Road)
    ctx.fillStyle = "#333"; 
    ctx.fillRect(0, roadYPos, width, CONFIG.roadStripHeight);

    // Draw the Animated Road Markings (White dashes)
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; // Color and thickness
    ctx.setLineDash([60, 40]); // 60px line, 40px gap
    ctx.lineDashOffset = -game.scroll % 100; // Negative for forward motion
    ctx.beginPath();
    ctx.moveTo(0, roadYPos + CONFIG.roadStripHeight / 2); // Move pen to middle of road
    ctx.lineTo(width, roadYPos + CONFIG.roadStripHeight / 2); // Draw to end of screen
    ctx.stroke(); // Actually paint the line
    ctx.setLineDash([]); // Reset dash for other drawings

    // Draw the Bike and Tires
    if (bikeReady) {
        const bW = bikeImg.width * CONFIG.bikeScale; // Calculated width
        const bH = bikeImg.height * CONFIG.bikeScale; // Calculated height
        const tS = bH * CONFIG.tireSizeMult; // Size of tires based on bike height
        const pivotX = width * 0.10; // Keep the bike on the left side (10% in)
        
        // Calculate lane-specific road surface position
        const laneHeight = CONFIG.roadStripHeight / CONFIG.laneCount;
        const laneTopY = roadYPos + (game.lane * laneHeight);
        const laneSurfaceY = laneTopY + laneHeight; // Bottom of current lane
        
        // Smooth transition between lanes
        const targetY = laneSurfaceY - (tS / 2);
        game.currentY += (targetY - game.currentY) * 0.1;
        
        // Pivot point is at the rear tire contact patch
        const rearTireContactY = game.currentY;

        ctx.save(); // Save the canvas state
        ctx.translate(pivotX + CONFIG.rearTireXShift, rearTireContactY); // Pivot at rear tire contact point
        ctx.rotate(game.bikeAngle); // Rotate the whole bike around that point
        
        if (tireImg.complete) {
            // 1. Draw Rear Tire (Behind the bike frame) - locked to ground, no X offset needed
            ctx.save();
            ctx.rotate(game.wheelRotation);
            ctx.drawImage(tireImg, -tS/2, -tS/2, tS, tS); // Draw tire centered on pivot
            ctx.restore();

            // 2. Draw the Bike Frame (On top of the rear tire)
            ctx.save();
            ctx.rotate(CONFIG.noseDownAngle); // Apply the static forward lean
            // Adjust bike position relative to rear tire contact point
            // The frame is drawn with its bottom-left at the specified position
            ctx.drawImage(bikeImg, -CONFIG.rearWheelOffsetX - CONFIG.rearTireXShift, -bH/2 + CONFIG.frameYShift, bW, bH);
            ctx.restore();

            // 3. Draw Front Tire (On top of the bike frame)
            ctx.save();
            // Position front tire relative to rear tire contact point
            ctx.translate(bW * CONFIG.frontTireX - CONFIG.rearTireXShift, 0);
            ctx.rotate(game.wheelRotation);
            ctx.drawImage(tireImg, -tS/2, -tS/2, tS, tS); // Draw tire
            ctx.restore();
        }

        ctx.restore(); // Restore the canvas state
    }

    // Draw the Countdown Circles
    if (game.phase === "COUNTDOWN") {
        const cx = width / 2; // Center of screen
        const cy = 60; // Distance from top
        for(let i=0; i<3; i++) {
            // Fill with color if light is active, otherwise dark gray
            ctx.fillStyle = (game.countdownIndex > i) ? (i === 2 ? "lime" : "yellow") : "rgba(0,0,0,0.3)";
            ctx.beginPath(); 
            ctx.arc(cx + (i-1)*60, cy, 15, 0, Math.PI*2); 
            ctx.fill();
        }
    }

    // Draw Score Display (always visible during racing)
    if (game.phase === "RACING") {
        ctx.fillStyle = "#fff";
        ctx.font = "24px Arial";
        ctx.fillText(`Score: ${Math.floor(game.score)}`, 20, 40);
        ctx.fillText(`Best: ${Math.floor(game.bestScore)}`, 20, 70);
    }

    update(performance.now()); // Update physics based on current time
    requestAnimationFrame(draw); // Tell the browser to run this function again immediately
}

draw(); // Kick off the game loop
