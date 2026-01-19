// ==========================================
// THROTTLE UP - IMPROVED VERSION
// A motorcycle wheelie physics game
// ==========================================

// Get the canvas element from HTML and set up 2D rendering context
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// ==========================================
// ASSET LOADING SYSTEM
// ==========================================
// Object to store all game images and their loading status
const assets = {
    bike: { img: new Image(), loaded: false },    // Motorcycle image
    tire: { img: new Image(), loaded: false },    // Wheel/tire image
    rider: { img: new Image(), loaded: false }    // Rider image
};

let assetsLoaded = 0;        // Counter for loaded assets
const TOTAL_ASSETS = 3;      // Total number of assets to load
let gameReady = false;       // Flag indicating if game can start

// Function to load all game assets
function loadAssets() {
    loadAsset(assets.bike, "assets/bike/ninja-h2r-2.png");     // Load bike sprite
    loadAsset(assets.tire, "assets/bike/biketire.png");        // Load tire sprite
    loadAsset(assets.rider, "assets/bike/bike-rider.png");     // Load rider sprite
}

// Function to load individual asset with error handling
function loadAsset(asset, src) {
    asset.img.src = src;                          // Set image source path
    asset.img.onload = () => {                    // When image loads successfully
        asset.loaded = true;                      // Mark asset as loaded
        assetsLoaded++;                           // Increment loaded counter
        if (assetsLoaded === TOTAL_ASSETS) {      // If all assets are loaded
            gameReady = true;                     // Enable game to start
            audio.init();                         // Initialize audio system
        }
    };
    asset.img.onerror = () => {                   // If image fails to load
        console.error(`Failed to load: ${src}`);  // Log error to console
        alert(`Failed to load game assets. Please refresh the page.`); // Alert user
    };
}

// ==========================================
// CONFIGURATION
// ==========================================
const CONFIG = {
    // Visual scaling
    bikeScale: 0.15,          // Scale factor for bike sprite size
    tireSizeMult: 0.60,       // Tire size as percentage of bike height
    
    // Frame alignment
    rearWheelOffsetX: 55,     // Distance from bike center to rear wheel pivot
    frameYShift: -35,         // Vertical offset to align bike frame
    noseDownAngle: 0.02,      // Slight forward tilt of bike frame
    
    // Wheel alignment
    rearTireXShift: -42,      // Horizontal shift for rear tire position
    frontTireX: 0.60,         // Front tire position as fraction of bike width
    
    // Physics
    maxSpeed: 70,            // Maximum speed in game units
    acceleration: 0.5,        // Acceleration rate when throttle is applied
    friction: 0.995,          // Friction multiplier (closer to 1 = less friction)
    
    // Wheelie mechanics
    torque: 0.0030,           // INCREASED: Rotational force applied during wheelie (was 0.001)
    torqueSpeedMult: 0.0002,  // Speed-dependent torque multiplier
    gravity: 0.003,           // Gravity force pulling bike nose down
    damping: 0.92,            // Angular velocity damping (rotation slowdown)
    
    // Wheelie detection thresholds
    WHEELIE_START_ANGLE: -0.02,      // Angle at which wheelie is considered started
    GROUND_CONTACT_ANGLE: 0.03,      // Angle when front wheel touches ground
    
    // World
    laneCount: 2,             // Number of lanes on the road
    roadYPercent: 0.45,       // Vertical position of road as screen percentage
    roadStripHeight: 150,     // Height of the road in pixels
    
    // Visual positioning
    BIKE_X_PERCENT: 0.10,     // Horizontal position of bike as screen percentage
    LANE_SWITCH_SMOOTHING: 0.1, // Smoothing factor for lane changes (0-1)
    
    // Rider lean
    RIDER_LEAN_FORWARD: -0.15,  // Lean angle when accelerating (radians)
    RIDER_LEAN_BACK: 0.2,       // Lean angle during wheelie (radians)
    
    // Countdown
    COUNTDOWN_Y: 60,          // Y position of countdown indicators
    COUNTDOWN_SPACING: 60,    // Horizontal spacing between countdown lights
    COUNTDOWN_RADIUS: 15,     // Radius of countdown light circles
    COUNTDOWN_INTERVAL_MS: 800 // Time between countdown steps (milliseconds)
};

// ==========================================
// GAME STATE
// ==========================================
// Object containing all game state variables
const game = {
    phase: "IDLE",            // Current game phase: IDLE, COUNTDOWN, RACING
    speed: 0,                 // Current forward speed
    scroll: 0,                // Background scroll position (for visual reference only)
    lane: 1,                  // Current lane (0 = top, 1 = bottom)
    throttle: false,          // Whether throttle is currently pressed
    countdownIndex: 0,        // Current countdown step (0-3)
    countdownTimer: 0,        // Timestamp for countdown timing
    bikeAngle: 0,             // Current rotation angle of bike (radians, negative = wheelie)
    bikeAngularVelocity: 0,   // Rate of rotation change
    currentY: 0,              // Current Y position of bike on screen
    wheelRotation: 0,         // Rotation angle of wheels for animation
    score: 0,                 // Current wheelie score
    bestScore: parseInt(localStorage.getItem('throttleUpBest')) || 0, // High score from storage
    inWheelie: false,         // Whether currently performing a wheelie
    distance: 0,              // Total distance traveled
    dashOffset: 0             // Offset for road dash animation
};

let width, height, roadYPos;    // Canvas dimensions and road position
let lastTime = performance.now(); // Timestamp of last frame for deltaTime calculation
let paused = false;              // Whether game is paused

// ==========================================
// AUDIO SYSTEM
// ==========================================
const audio = {
    enabled: true,            // Whether audio is enabled
    sounds: {},               // Object to store all sound objects
    
    // Initialize all audio files
    init() {
        try {
            this.sounds.engine = new Audio('assets/audio/engine-rev.mp3'); // Engine sound
            this.sounds.crash = new Audio('assets/audio/crash.wav');       // Crash sound effect
            this.sounds.crowd = new Audio('assets/audio/crowd.wav');       // Crowd ambience
            
            this.sounds.engine.loop = true;   // Engine sound loops continuously
            this.sounds.crowd.loop = true;    // Crowd sound loops continuously
            this.sounds.crowd.volume = 0.3;   // Set crowd volume lower
        } catch (e) {
            console.warn('Audio initialization failed:', e); // Log if audio fails
            this.enabled = false;             // Disable audio system
        }
    },
    
    // Play a sound by name
    play(name) {
        if (this.enabled && this.sounds[name]) {  // Check if audio enabled and sound exists
            const sound = this.sounds[name];       // Get the sound object
            sound.currentTime = 0;                 // Reset to beginning
            sound.play().catch(e => console.log('Audio play failed:', e)); // Play and catch errors
        }
    },
    
    // Stop a sound by name
    stop(name) {
        if (this.enabled && this.sounds[name]) {  // Check if audio enabled and sound exists
            this.sounds[name].pause();             // Pause the sound
            this.sounds[name].currentTime = 0;     // Reset to beginning
        }
    },
    
    // Update engine sound based on current speed
    updateEngineSound() {
        if (this.enabled && this.sounds.engine) { // Check if audio enabled and engine sound exists
            const pitchFactor = 1 + (game.speed / CONFIG.maxSpeed) * 0.5; // Calculate pitch based on speed
            this.sounds.engine.playbackRate = Math.max(0.5, Math.min(2, pitchFactor)); // Set playback rate (clamped)
            this.sounds.engine.volume = game.throttle ? 0.4 : 0.2; // Louder when throttling
        }
    }
};

// ==========================================
// PARTICLE SYSTEM
// ==========================================
const particles = {
    list: [],                 // Array of active particles
    
    // Create dust particles behind bike
    createDust(x, y) {
        if (game.speed < 20) return;  // Only create dust when moving fast enough
        
        for (let i = 0; i < 3; i++) {  // Create 3 dust particles
            this.list.push({
                x: x,                   // X position
                y: y,                   // Y position
                vx: (Math.random() - 0.5) * 2 - game.speed * 0.1, // Horizontal velocity
                vy: (Math.random() - 0.5) * 2,                    // Vertical velocity
                life: 1.0,              // Lifetime (1.0 = full, 0 = dead)
                size: Math.random() * 3 + 2, // Random size
                color: '#888'           // Gray color
            });
        }
    },
    
    // Create spark particles for crash effect
    createCrashSparks(x, y) {
        for (let i = 0; i < 20; i++) { // Create 20 sparks
            this.list.push({
                x: x,                   // X position
                y: y,                   // Y position
                vx: (Math.random() - 0.5) * 10,  // Random horizontal velocity
                vy: (Math.random() - 0.5) * 10 - 2, // Random vertical velocity (biased upward)
                life: 1.0,              // Lifetime
                size: Math.random() * 4 + 2,     // Random size
                color: ['#ff4400', '#ffaa00', '#ffff00'][Math.floor(Math.random() * 3)] // Random fire color
            });
        }
    },
    
    // Update all particles
    update(deltaTime) {
        this.list = this.list.filter(p => {  // Filter out dead particles
            p.x += p.vx * deltaTime;         // Move particle horizontally
            p.y += p.vy * deltaTime;         // Move particle vertically
            p.vy += 0.15 * deltaTime;        // Apply gravity to particle
            p.life -= 0.02 * deltaTime;      // Decrease lifetime
            return p.life > 0;               // Keep particle if still alive
        });
    },
    
    // Draw all particles
    draw() {
        this.list.forEach(p => {             // Loop through each particle
            ctx.fillStyle = p.color;         // Set particle color
            ctx.globalAlpha = p.life;        // Set transparency based on lifetime
            ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size); // Draw square particle
        });
        ctx.globalAlpha = 1.0;               // Reset alpha to full opacity
    }
};

// ==========================================
// CAMERA SHAKE
// ==========================================
const camera = {
    shake: 0,                 // Current shake intensity
    
    // Start camera shake with given intensity
    startShake(intensity = 10) {
        this.shake = intensity; // Set shake intensity
    },
    
    // Update shake intensity (decay over time)
    update(deltaTime) {
        this.shake *= Math.pow(0.9, deltaTime);  // Exponential decay
        if (this.shake < 0.1) this.shake = 0;    // Stop shaking when very small
    },
    
    // Apply shake offset to canvas
    apply() {
        if (this.shake > 0) {                    // Only apply if shake is active
            const offsetX = (Math.random() - 0.5) * this.shake; // Random horizontal offset
            const offsetY = (Math.random() - 0.5) * this.shake; // Random vertical offset
            ctx.translate(offsetX, offsetY);     // Apply translation to canvas
        }
    }
};

// ==========================================
// SCREEN RESIZE
// ==========================================
// Resize canvas to match window size
function resize() {
    width = canvas.width = window.innerWidth;    // Set canvas width to window width
    height = canvas.height = window.innerHeight; // Set canvas height to window height
    roadYPos = height * CONFIG.roadYPercent;     // Calculate road Y position
}

window.addEventListener("resize", resize); // Listen for window resize events
resize();                                  // Initial resize

// ==========================================
// INPUT SYSTEM
// ==========================================
const input = {
    locked: false,            // Whether input is locked (during menus)
    
    lock() { this.locked = true; },   // Lock input
    unlock() { this.locked = false; }, // Unlock input
    
    // Handle throttle press
    startThrottle() {
        if (this.locked || !gameReady) return; // Don't start if locked or assets not ready
        
        if (game.phase === "IDLE") {           // If in idle state
            game.phase = "COUNTDOWN";          // Start countdown
            game.countdownIndex = 0;           // Reset countdown
            game.countdownTimer = performance.now(); // Record start time
            audio.play('crowd');               // Play crowd sound
        }
        game.throttle = true;                  // Set throttle to true
    },
    
    // Handle throttle release
    stopThrottle() {
        game.throttle = false;                 // Set throttle to false
    }
};

// Touch input
canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();                        // Prevent default touch behavior
    input.startThrottle();                     // Start throttle on touch
}, { passive: false });

canvas.addEventListener("touchend", (e) => {
    e.preventDefault();                        // Prevent default touch behavior
    input.stopThrottle();                      // Stop throttle on touch end
}, { passive: false });

canvas.addEventListener("touchmove", (e) => {
    if (input.locked) return;                  // Don't process if input locked
    e.preventDefault();                        // Prevent default touch behavior
    const y = e.touches[0].clientY;            // Get touch Y position
    game.lane = y < height / 2 ? 0 : 1;        // Top half = lane 0, bottom half = lane 1
}, { passive: false });

// Keyboard input
window.addEventListener("keydown", (e) => {
    if (input.locked) return;                  // Don't process if input locked
    if (e.code === "Space") {                  // If spacebar pressed
        e.preventDefault();                    // Prevent page scroll
        input.startThrottle();                 // Start throttle
    }
    if (e.code === "ArrowUp") game.lane = 0;   // Up arrow = top lane
    if (e.code === "ArrowDown") game.lane = 1; // Down arrow = bottom lane
    if (e.code === "Escape") togglePause();    // Escape = toggle pause
});

window.addEventListener("keyup", (e) => {
    if (e.code === "Space") {                  // If spacebar released
        e.preventDefault();                    // Prevent page scroll
        input.stopThrottle();                  // Stop throttle
    }
});

// Gamepad support
function pollGamepad() {
    if (!input.locked) {                       // Only poll if input not locked
        const gp = navigator.getGamepads?.()?.[0]; // Get first gamepad
        if (gp) {                              // If gamepad exists
            if (gp.buttons[0]?.pressed) {      // If button 0 pressed
                input.startThrottle();         // Start throttle
            } else {
                input.stopThrottle();          // Stop throttle
            }
            if (gp.axes[1] < -0.5) game.lane = 0;  // Joystick up = top lane
            if (gp.axes[1] > 0.5) game.lane = 1;   // Joystick down = bottom lane
        }
    }
    requestAnimationFrame(pollGamepad);        // Continue polling
}
pollGamepad();                                 // Start gamepad polling

// ==========================================
// UI CONTROLS
// ==========================================
const infoPopup = document.getElementById('infoPopup');     // Get info popup element
const infoBtn = document.getElementById('infoBtn');         // Get info button element
const closeInfoBtn = document.getElementById('closeInfoBtn'); // Get close button element
const homeBtn = document.getElementById('homeBtn');         // Get home button element

infoBtn?.addEventListener('click', () => {     // When info button clicked
    infoPopup.hidden = false;                  // Show popup
    input.lock();                              // Lock input
    if (game.phase === "RACING") togglePause(); // Pause game if racing
});

closeInfoBtn?.addEventListener('click', () => { // When close button clicked
    infoPopup.hidden = true;                   // Hide popup
    input.unlock();                            // Unlock input
});

homeBtn?.addEventListener('click', () => {     // When home button clicked
    window.location.href = '../../index.html'; // Navigate to home page
});

// Update UI elements with current game state
function updateUI() {
    const scoreEl = document.getElementById('score');         // Get score element
    const distanceEl = document.getElementById('distance');   // Get distance element
    const highscoreEl = document.getElementById('highscore'); // Get highscore element
    
    if (scoreEl) scoreEl.textContent = Math.floor(game.score);         // Update score display
    if (distanceEl) distanceEl.textContent = Math.floor(game.distance); // Update distance display
    if (highscoreEl) highscoreEl.textContent = Math.floor(game.bestScore); // Update highscore display
}

// ==========================================
// PAUSE SYSTEM
// ==========================================
// Toggle game pause state
function togglePause() {
    if (game.phase !== "RACING") return;       // Only pause during racing
    
    paused = !paused;                          // Toggle pause flag
    
    if (paused) {                              // If now paused
        audio.stop('engine');                  // Stop engine sound
    } else {                                   // If now unpaused
        audio.play('engine');                  // Start engine sound
        lastTime = performance.now();          // Reset time for deltaTime calculation
    }
}

// ==========================================
// GAME LOGIC
// ==========================================
// Reset game to initial state
function resetGame() {
    game.phase = "IDLE";                       // Set to idle phase
    game.speed = 0;                            // Reset speed
    game.bikeAngle = 0;                        // Reset bike angle
    game.bikeAngularVelocity = 0;              // Reset angular velocity
    game.inWheelie = false;                    // Not in wheelie
    game.score = 0;                            // Reset score
    game.distance = 0;                         // Reset distance
    game.scroll = 0;                           // Reset scroll
    game.wheelRotation = 0;                    // Reset wheel rotation
    game.dashOffset = 0;                       // Reset dash offset
    particles.list = [];                       // Clear all particles
    audio.stop('engine');                      // Stop engine sound
    audio.stop('crowd');                       // Stop crowd sound
    updateUI();                                // Update UI display
}

// Handle crash event
function crash() {
    const bikeX = width * CONFIG.BIKE_X_PERCENT; // Calculate bike X position
    camera.startShake(15);                     // Start camera shake
    particles.createCrashSparks(bikeX, game.currentY); // Create crash particles
    audio.stop('engine');                      // Stop engine sound
    audio.play('crash');                       // Play crash sound
    
    setTimeout(() => {                         // Wait 1 second
        endWheelie();                          // Then end wheelie
    }, 1000);
}

// End wheelie and reset game
function endWheelie() {
    if (game.score > game.bestScore) {         // If new high score
        game.bestScore = game.score;           // Update best score
        localStorage.setItem('throttleUpBest', game.bestScore); // Save to storage
    }
    resetGame();                               // Reset the game
}

// Main update function called every frame
function update(now) {
    if (paused) return;                        // Don't update if paused
    
    const deltaTime = Math.min((now - lastTime) / 16.67, 2); // Calculate deltaTime (capped at 2)
    lastTime = now;                            // Store current time for next frame
    
    camera.update(deltaTime);                  // Update camera shake
    particles.update(deltaTime);               // Update all particles
    
    // IDLE PHASE - bike is stationary
    if (game.phase === "IDLE") {
        const laneHeight = CONFIG.roadStripHeight / CONFIG.laneCount; // Calculate lane height
        const laneTopY = roadYPos + (game.lane * laneHeight);         // Calculate lane top Y
        const laneSurfaceY = laneTopY + laneHeight;                   // Calculate lane surface Y
        const tS = assets.bike.img.height * CONFIG.bikeScale * CONFIG.tireSizeMult; // Calculate tire size
        game.currentY = laneSurfaceY - (tS / 2);                      // Position bike on surface
        return;                                // Exit update early
    }
    
    // COUNTDOWN PHASE - waiting for race to start
    if (game.phase === "COUNTDOWN") {
        if (now - game.countdownTimer > CONFIG.COUNTDOWN_INTERVAL_MS) { // If countdown interval passed
            game.countdownIndex++;             // Move to next countdown step
            game.countdownTimer = now;         // Reset timer
            
            if (game.countdownIndex >= 3) {    // If countdown complete
                game.phase = "RACING";         // Start racing
                audio.play('engine');          // Start engine sound
            }
        }
        return;                                // Exit update early
    }
    
    // RACING PHASE - game is active
    if (game.phase === "RACING") {
        // Speed and acceleration
        if (game.throttle) {                   // If throttle is pressed
            game.speed += CONFIG.acceleration * deltaTime;    // Increase speed
            game.bikeAngularVelocity -= CONFIG.torque * deltaTime; // Apply wheelie torque
        } else {                               // If throttle not pressed
            game.speed *= Math.pow(CONFIG.friction, deltaTime); // Apply friction
            if (game.speed < 0.05) game.speed = 0;             // Stop if very slow
        }
        
        game.speed = Math.max(0, Math.min(game.speed, CONFIG.maxSpeed)); // Clamp speed to valid range
        
        // Physics - gravity pulls nose down (positive direction)
        const gravityForce = -game.bikeAngle * (CONFIG.gravity + Math.abs(game.bikeAngle) * 0.4); // Calculate gravity force
        game.bikeAngularVelocity += gravityForce * deltaTime;  // Apply gravity to angular velocity
        game.bikeAngularVelocity *= Math.pow(CONFIG.damping, deltaTime); // Apply damping
        game.bikeAngle += game.bikeAngularVelocity * deltaTime; // Update bike angle
        
        // Only clamp when front wheel is touching ground (bike angle is positive/level)
        if (game.bikeAngle > CONFIG.GROUND_CONTACT_ANGLE) {   // If front wheel on ground
            game.bikeAngle = CONFIG.GROUND_CONTACT_ANGLE;     // Clamp to ground level
            game.bikeAngularVelocity *= 1.0;                  // Reduce bounce
        }
        
        // Crash if bike loops too far backward (100 degrees = ~1.745 radians)
        if (game.bikeAngle < -1.745) {         // If bike rotated back 100 degrees
            crash();                           // Trigger crash
        }
        
        // Movement - move forward with speed
        if (game.speed > 0) {                  // If bike is moving
            game.scroll -= game.speed * deltaTime;  // Move scroll (visual reference)
            game.wheelRotation -= game.speed * 0.02 * deltaTime; // Rotate wheels
            game.distance += game.speed * 0.1 * deltaTime;       // Increase distance
            
            // Update dash offset - let it decrease (go negative) without wrapping
            game.dashOffset -= game.speed * deltaTime; // Decrease dash offset for forward motion
        }
        
        // Update audio
        audio.updateEngineSound();             // Update engine pitch based on speed
        
        // Dust particles
        if (Math.random() < 0.1 && game.speed > 20) { // 10% chance if moving fast
            const bikeX = width * CONFIG.BIKE_X_PERCENT;      // Calculate bike X position
            particles.createDust(bikeX - 30, game.currentY + 10); // Create dust behind bike
        }
        
        // Wheelie detection
        if (game.bikeAngle < CONFIG.WHEELIE_START_ANGLE) { // If bike angled back enough
            if (!game.inWheelie) {             // If not already in wheelie
                game.inWheelie = true;         // Start wheelie
                game.score = 0;                // Reset score
            }
            game.score += 1 * deltaTime;       // Increase score while in wheelie
        } else {                               // If bike not angled back enough
            if (game.inWheelie) {              // If was in wheelie
                endWheelie();                  // End wheelie
            }
        }
        
        updateUI();                            // Update UI display
    }
}

// ==========================================
// RENDERING
// ==========================================
// Draw loading screen while assets load
function drawLoadingScreen() {
    ctx.fillStyle = '#1a1a1a';                 // Dark background
    ctx.fillRect(0, 0, width, height);         // Fill entire canvas
    
    const progress = assetsLoaded / TOTAL_ASSETS; // Calculate loading progress
    
    ctx.fillStyle = '#fff';                    // White text
    ctx.font = 'bold 48px Roboto Mono, monospace'; // Large bold font
    ctx.textAlign = 'center';                  // Center text horizontally
    ctx.fillText('THROTTLE UP', width / 2, height / 2 - 60); // Draw title
    
    // Progress bar
    const barWidth = 400;                      // Progress bar width
    const barHeight = 30;                      // Progress bar height
    const barX = (width - barWidth) / 2;       // Center bar horizontally
    const barY = height / 2 + 20;              // Position bar below title
    
    ctx.strokeStyle = '#444';                  // Dark gray border
    ctx.lineWidth = 2;                         // Border width
    ctx.strokeRect(barX, barY, barWidth, barHeight); // Draw bar outline
    
    ctx.fillStyle = '#4CAF50';                 // Green fill
    ctx.fillRect(barX + 2, barY + 2, (barWidth - 4) * progress, barHeight - 4); // Draw progress
    
    ctx.fillStyle = '#aaa';                    // Light gray text
    ctx.font = '20px Roboto Mono, monospace';  // Smaller font
    ctx.fillText(`Loading... ${Math.floor(progress * 100)}%`, width / 2, barY + barHeight + 40); // Draw percentage
}

// Draw "WHEELIE!" indicator when performing wheelie
function drawWheelieIndicator() {
    if (!game.inWheelie || game.phase !== "RACING") return; // Only draw during wheelie in race
    
    const x = width / 2;                       // Center horizontally
    const y = 100;                             // Fixed Y position
    const pulse = Math.sin(Date.now() / 100) * 0.15 + 1; // Pulsing animation
    
    ctx.save();                                // Save canvas state
    ctx.translate(x, y);                       // Move to position
    ctx.scale(pulse, pulse);                   // Apply pulse scale
    
    ctx.fillStyle = '#FFD700';                 // Gold color
    ctx.strokeStyle = '#FF4500';               // Orange-red outline
    ctx.lineWidth = 4;                         // Thick outline
    ctx.font = 'bold 42px Roboto Mono, monospace'; // Large bold font
    ctx.textAlign = 'center';                  // Center text
    ctx.textBaseline = 'middle';               // Center text vertically
    ctx.strokeText('WHEELIE!', 0, 0);          // Draw text outline
    ctx.fillText('WHEELIE!', 0, 0);            // Draw text fill
    
    ctx.restore();                             // Restore canvas state
}

// Draw speedometer in corner
function drawSpeedometer() {
    if (game.phase !== "RACING") return;       // Only draw during race
    
    const x = width - 100;                     // Position near right edge
    const y = height - 100;                    // Position near bottom edge
    const radius = 45;                         // Speedometer radius
    
    // Background circle
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';      // Semi-transparent black
    ctx.beginPath();                           // Start path
    ctx.arc(x, y, radius + 5, 0, Math.PI * 2); // Draw circle
    ctx.fill();                                // Fill circle
    
    // Outer arc (background)
    ctx.strokeStyle = '#333';                  // Dark gray
    ctx.lineWidth = 8;                         // Thick line
    ctx.beginPath();                           // Start path
    ctx.arc(x, y, radius, 0.75 * Math.PI, 2.25 * Math.PI); // Draw arc from -135° to 135°
    ctx.stroke();                              // Draw arc
    
    // Speed arc (progress indicator)
    const speedPercent = game.speed / CONFIG.maxSpeed; // Calculate speed percentage
    const angle = 0.75 * Math.PI + (speedPercent * 1.5 * Math.PI); // Calculate end angle
    
    ctx.strokeStyle = speedPercent > 0.8 ? '#ff4444' : '#4CAF50'; // Red if fast, green otherwise
    ctx.lineWidth = 8;                         // Thick line
    ctx.beginPath();                           // Start path
    ctx.arc(x, y, radius, 0.75 * Math.PI, angle); // Draw arc from start to current speed
    ctx.stroke();                              // Draw arc
    
    // Speed text
    ctx.fillStyle = '#fff';                    // White text
    ctx.font = 'bold 24px Roboto Mono, monospace'; // Large bold font
    ctx.textAlign = 'center';                  // Center text horizontally
    ctx.textBaseline = 'middle';               // Center text vertically
    ctx.fillText(Math.floor(game.speed), x, y); // Draw speed number
    
    ctx.font = '12px Roboto Mono, monospace';  // Smaller font
    ctx.fillText('km/h', x, y + 20);           // Draw units label
}

// Main draw function called every frame
function draw() {
    if (!gameReady) {                          // If assets not loaded yet
        drawLoadingScreen();                   // Draw loading screen
        requestAnimationFrame(draw);           // Continue animation loop
        return;                                // Exit early
    }
    
    // Background - fill entire screen with grass
    ctx.fillStyle = "#2e7d32";                 // Green grass color
    ctx.fillRect(0, 0, width, height);         // Fill entire canvas
    
    // Sky - only above the road
    ctx.fillStyle = "#6db3f2";                 // Blue sky color
    ctx.fillRect(0, 0, width, roadYPos - 40);  // Fill from top to above road
    
    // Road
    ctx.fillStyle = "#333";                    // Dark gray road color
    ctx.fillRect(0, roadYPos, width, CONFIG.roadStripHeight); // Draw road rectangle
    
    // Road markings - use separate dashOffset tracker
    ctx.strokeStyle = "#fff";                  // White dashes
    ctx.lineWidth = 2;                         // Thin line
    ctx.setLineDash([60, 40]);                 // Dash pattern: 60px dash, 40px gap
    ctx.lineDashOffset = -game.dashOffset;     // Set dash offset for animation
    ctx.beginPath();                           // Start path
    ctx.moveTo(0, roadYPos + CONFIG.roadStripHeight / 2); // Start at left center of road
    ctx.lineTo(width, roadYPos + CONFIG.roadStripHeight / 2); // Draw to right center of road
    ctx.stroke();                              // Draw dashed line
    ctx.setLineDash([]);                       // Reset dash pattern
    
    // Apply camera shake
    ctx.save();                                // Save canvas state
    camera.apply();                            // Apply shake transformation
    
    // Draw entities
    particles.draw();                          // Draw all particles
    
    // Draw bike
    if (assets.bike.loaded && assets.tire.loaded) { // If bike and tire assets loaded
        const bW = assets.bike.img.width * CONFIG.bikeScale;  // Calculate bike width
        const bH = assets.bike.img.height * CONFIG.bikeScale; // Calculate bike height
        const tS = bH * CONFIG.tireSizeMult;   // Calculate tire size
        const pivotX = width * CONFIG.BIKE_X_PERCENT; // Calculate bike pivot X position
        
        const laneHeight = CONFIG.roadStripHeight / CONFIG.laneCount; // Calculate lane height
        const laneTopY = roadYPos + (game.lane * laneHeight);         // Calculate lane top Y
        const laneSurfaceY = laneTopY + laneHeight;                   // Calculate lane surface Y
        const targetY = laneSurfaceY - (tS / 2);                      // Calculate target Y position
        
        game.currentY += (targetY - game.currentY) * CONFIG.LANE_SWITCH_SMOOTHING; // Smoothly move to target Y
        
        ctx.save();                            // Save canvas state
        ctx.translate(pivotX + CONFIG.rearTireXShift, game.currentY); // Move to bike pivot point
        ctx.rotate(game.bikeAngle);            // Rotate by bike angle
        
        // Rear tire
        ctx.save();                            // Save canvas state
        ctx.rotate(game.wheelRotation);        // Rotate wheel
        ctx.drawImage(assets.tire.img, -tS/2, -tS/2, tS, tS); // Draw tire centered
        ctx.restore();                         // Restore canvas state
        
        // Bike frame
        ctx.save();                            // Save canvas state
        ctx.rotate(CONFIG.noseDownAngle);      // Apply nose-down tilt
        ctx.drawImage(assets.bike.img, -CONFIG.rearWheelOffsetX - CONFIG.rearTireXShift, -bH/2 + CONFIG.frameYShift, bW, bH); // Draw bike
        ctx.restore();                         // Restore canvas state
        
        // Draw rider with dynamic lean
        if (assets.rider.loaded) {             // If rider asset loaded
            ctx.save();                        // Save canvas state
            
            // Calculate rider lean based on bike state
            let riderLean = 0;                 // Initialize lean angle
            if (game.throttle && game.bikeAngle > CONFIG.WHEELIE_START_ANGLE) { // If accelerating on ground
                riderLean = CONFIG.RIDER_LEAN_FORWARD; // Lean forward
            }
            if (game.bikeAngle < CONFIG.WHEELIE_START_ANGLE) { // If in wheelie
                riderLean = CONFIG.RIDER_LEAN_BACK;    // Lean back
            }
            
            // Position rider in the CENTER of the bike frame
            const bikeCenterX = (bW * CONFIG.frontTireX - CONFIG.rearTireXShift) * 0.4;  // Calculate rider X offset
            const riderOffsetY = -bH * 0.7;    // Calculate rider Y offset (higher up)
            const riderWidth = bW * 0.55;      // Calculate rider width (55% of bike)
            const riderHeight = bH * 0.85;     // Calculate rider height (85% of bike)
            
            ctx.translate(bikeCenterX, riderOffsetY); // Move to rider position
            ctx.rotate(riderLean);             // Apply rider lean
            ctx.drawImage(assets.rider.img, -riderWidth/2, -riderHeight/2, riderWidth, riderHeight); // Draw rider centered
            ctx.restore();                     // Restore canvas state
        }
        
        // Front tire
        ctx.save();                            // Save canvas state
        ctx.translate(bW * CONFIG.frontTireX - CONFIG.rearTireXShift, 0); // Move to front tire position
        ctx.rotate(game.wheelRotation);        // Rotate wheel
        ctx.drawImage(assets.tire.img, -tS/2, -tS/2, tS, tS); // Draw tire centered
        ctx.restore();                         // Restore canvas state
        
        ctx.restore();                         // Restore canvas state (bike rotation)
    }
    
    ctx.restore();                             // Restore canvas state (camera shake)
    
    // Countdown
    if (game.phase === "COUNTDOWN") {          // If in countdown phase
        const cx = width / 2;                  // Center X position
        const cy = CONFIG.COUNTDOWN_Y;         // Countdown Y position
        
        for (let i = 0; i < 3; i++) {          // Draw 3 countdown lights
            ctx.fillStyle = game.countdownIndex > i  // If this light is active
                ? (i === 2 ? "lime" : "yellow")      // Green for last, yellow for others
                : "rgba(0,0,0,0.3)";                 // Dark gray if not active
            ctx.beginPath();                   // Start path
            ctx.arc(cx + (i - 1) * CONFIG.COUNTDOWN_SPACING, cy, CONFIG.COUNTDOWN_RADIUS, 0, Math.PI * 2); // Draw circle
            ctx.fill();                        // Fill circle
            
            if (game.countdownIndex > i) {     // If this light is active
                ctx.strokeStyle = '#fff';      // White outline
                ctx.lineWidth = 2;             // Thin outline
                ctx.stroke();                  // Draw outline
            }
        }
    }
    
    // UI overlays
    drawWheelieIndicator();                    // Draw wheelie indicator if active
    drawSpeedometer();                         // Draw speedometer
    
    // Debug info
    if (game.phase === "RACING") {             // Only show during race
        ctx.fillStyle = '#fff';                // White text
        ctx.font = '14px monospace';           // Monospace font
        ctx.textAlign = 'left';                // Left align text
        ctx.fillText(`Speed: ${game.speed.toFixed(2)}`, 10, height - 120);         // Display speed
        ctx.fillText(`Scroll: ${game.scroll.toFixed(2)}`, 10, height - 100);       // Display scroll
        ctx.fillText(`Distance: ${game.distance.toFixed(2)}`, 10, height - 80);    // Display distance
        ctx.fillText(`DashOffset: ${game.dashOffset.toFixed(2)}`, 10, height - 60); // Display dash offset
        ctx.fillText(`Throttle: ${game.throttle}`, 10, height - 40);               // Display throttle state
        ctx.fillText(`BikeAngle: ${game.bikeAngle.toFixed(3)}`, 10, height - 20);  // Display bike angle
    }
    
    // Pause indicator
    if (paused) {                              // If game is paused
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';  // Semi-transparent black overlay
        ctx.fillRect(0, 0, width, height);     // Fill entire canvas
        ctx.fillStyle = '#fff';                // White text
        ctx.font = 'bold 48px Roboto Mono, monospace'; // Large bold font
        ctx.textAlign = 'center';              // Center text
        ctx.fillText('PAUSED', width / 2, height / 2);         // Draw "PAUSED" text
        ctx.font = '20px Roboto Mono, monospace'; // Smaller font
        ctx.fillText('Press ESC to resume', width / 2, height / 2 + 50); // Draw instruction
    }
    
    update(performance.now());                 // Update game logic
    requestAnimationFrame(draw);               // Continue animation loop
}

// ==========================================
// INITIALIZATION
// ==========================================
loadAssets();                                  // Start loading assets
draw();                                        // Start animation loop
