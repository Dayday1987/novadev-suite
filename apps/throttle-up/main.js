// Updated Constants for better geometry
const BIKE_SCALE = 0.15; 
// Increase this to slide the bike frame forward (makes rear tire look "behind")
const REAR_WHEEL_OFFSET_X = 45; 
const LANE_COUNT = 2;

// ... (keep resize and update logic same as previous) ...

function draw() {
    ctx.clearRect(0, 0, width, height);
    
    // Sky, Grass, and Road
    ctx.fillStyle = "#6db3f2"; ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "#2e7d32"; ctx.fillRect(0, ROAD_Y() - 40, width, 40);
    ctx.fillStyle = "#333"; ctx.fillRect(0, ROAD_Y(), width, ROAD_HEIGHT());

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
        // Move to the Rear Axle Position
        ctx.translate(pivotX, game.currentY);
        // Apply Wheelie Physics Rotation
        ctx.rotate(game.bikeAngle);
        
        // DRAW TIRES FIRST (So they appear behind the frame if needed)
        if (tireImg.complete) {
            const tS = bH * 0.52; // BIGGER TIRES
            
            // 1. Rear Tire (Pinned to pivot)
            ctx.save();
            ctx.rotate(-game.scroll * 0.1);
            ctx.drawImage(tireImg, -tS/2, -tS/2, tS, tS);
            ctx.restore();
            
            // 2. Front Tire (Slid slightly left/back towards the bike)
            ctx.save();
            // Adjusted from 0.72 to 0.68 to move it left
            ctx.translate(bW * 0.68, 0); 
            ctx.rotate(-game.scroll * 0.1);
            ctx.drawImage(tireImg, -tS/2, -tS/2, tS, tS);
            ctx.restore();
        }

        // 3. Draw Bike Frame
        ctx.save();
        // This slight rotation (0.05) lowers the nose of the bike
        ctx.rotate(0.05); 
        ctx.drawImage(bikeImg, -REAR_WHEEL_OFFSET_X, -bH, bW, bH);
        ctx.restore();

        ctx.restore();
    }

    // UI (Countdown)
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
