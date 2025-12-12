// Wheelie — improved controls & start-position fix
// - DPI aware
// - rear wheel starts on ground (no floating)
// - ramped torque (hold) so quick taps are gentle
// - stronger frame visuals (not just a line)
// - pointer handling prevents selection on mobile

(function () {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  const scoreEl = document.getElementById('score');
  const restartBtn = document.getElementById('restart');

  // --- Responsive / DPI helpers ---
  function resizeCanvasToDisplaySize() {
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    const displayW = Math.max(640, Math.floor(rect.width));
    const displayH = Math.max(420, Math.floor(rect.height || (displayW * 0.54)));
    canvas.width = Math.round(displayW * ratio);
    canvas.height = Math.round(displayH * ratio);
    canvas.style.height = displayH + 'px';
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    return { w: displayW, h: displayH };
  }

  let VIEW = resizeCanvasToDisplaySize();
  window.addEventListener('resize', () => { VIEW = resizeCanvasToDisplaySize(); });

  // --- Visual params computed from view so it scales ---
  function visualParams() {
    const W = VIEW.w;
    return {
      rearR: Math.max(18, Math.round(W * 0.035)),
      frontR: Math.max(14, Math.round(W * 0.028)),
      frameLen: Math.max(160, Math.round(W * 0.22))
    };
  }

  // --- Physics tuning ---
  const PHYS = {
    inertia: 1.0,
    liftTorque: 0.03,    // full torque after ramp
    gravityTorque: 0.012,
    damping: 0.988,
    crashAngle: Math.PI * 0.52,
    maxAngVel: 6.0       // clamp angular velocity for safety
  };

  // --- Game state ---
  const world = {
    x: 200,
    yGround: 0,
    angle: 0,
    angVel: 0
  };

  let running = true;
  let lastTime = performance.now();
  let timeBalance = 0;
  let best = 0;

  // input state (pointer & keyboard)
  let applying = false;
  let applyingStart = 0; // timestamp when pointerdown started

  // Prevent selection on pointer hold
  canvas.style.touchAction = 'none';
  canvas.addEventListener('pointerdown', (e) => {
    applying = true;
    applyingStart = performance.now();
    try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    e.preventDefault();
  }, { passive: false });

  canvas.addEventListener('pointerup', (e) => {
    applying = false;
    applyingStart = 0;
    try { canvas.releasePointerCapture && canvas.releasePointerCapture(e.pointerId); } catch (err) {}
  });
  canvas.addEventListener('pointercancel', () => { applying = false; applyingStart = 0; });

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') { applying = true; applyingStart = performance.now(); e.preventDefault(); }
    if (e.code === 'KeyR') reset();
  });
  window.addEventListener('keyup', (e) => {
    if (e.code === 'Space') { applying = false; applyingStart = 0; e.preventDefault(); }
  });

  restartBtn.addEventListener('click', reset);

  // --- Reset sets proper ground and initial angle so rear wheel sits on ground ---
  function reset() {
    VIEW = resizeCanvasToDisplaySize();
    const V = visualParams();

    // set ground such that there's room for UI and canvas visual
    world.yGround = VIEW.h - Math.max(80, Math.round(V.rearR * 2.5));

    // place rear wheel x relative to frame length
    world.x = Math.max(180, Math.round(V.frameLen * 0.9));

    // compute initial angle so both wheels touch ground if radii differ:
    // rear wheel center Y = world.yGround - rearR
    // want front wheel center Y = world.yGround - frontR
    // sin(angle) = (frontCenterY - rearCenterY) / frameLen = (rearR - frontR) / frameLen
    const num = (V.rearR - V.frontR) / V.frameLen;
    let initialAngle = 0;
    if (Math.abs(num) <= 1) initialAngle = Math.asin(num);
    else initialAngle = 0; // fallback

    world.angle = initialAngle; // slight tilt so wheels meet ground
    world.angVel = 0;

    running = true;
    timeBalance = 0;
    applying = false;
    applyingStart = 0;
    lastTime = performance.now();
    scoreEl.textContent = '0.00s';
  }

  // --- Draw helpers ---
  function drawEnvironment() {
    const W = VIEW.w, H = VIEW.h;
    ctx.fillStyle = '#071422';
    ctx.fillRect(0, 0, W, H);

    const roadTop = world.yGround + 30;
    ctx.fillStyle = '#0b1a27';
    ctx.fillRect(0, roadTop, W, H - roadTop);

    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    const dashW = 52;
    for (let x = 0; x < W; x += dashW * 2) {
      ctx.fillRect(x + 12, roadTop + 22, dashW, 6);
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.02)';
    ctx.beginPath();
    ctx.moveTo(0, world.yGround);
    ctx.lineTo(W, world.yGround);
    ctx.stroke();
  }

  function drawWheel(x, y, r, rot) {
    ctx.beginPath();
    ctx.fillStyle = '#0c0c0c';
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot || 0);
    ctx.strokeStyle = '#9fb8c0';
    ctx.lineWidth = Math.max(2, r * 0.12);
    for (let s = 0; s < 6; s++) {
      const a = (s / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * (r * 0.7), Math.sin(a) * (r * 0.7));
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawBike() {
    const V = visualParams();
    const rwx = world.x;
    const rwy = world.yGround - V.rearR;
    const ang = world.angle;
    const fwx = rwx + Math.cos(ang) * V.frameLen;
    const fwy = rwy + Math.sin(ang) * V.frameLen;

    // frame: thicker, rounded feel
    ctx.save();
    ctx.translate(rwx, rwy);
    ctx.rotate(ang);
    // shadow / under-frame
    ctx.fillStyle = 'rgba(0,0,0,0.14)';
    ctx.fillRect(18, -6 + 8, V.frameLen - 20, 12);

    // main frame
    ctx.fillStyle = '#6EE7F7';
    ctx.fillRect(12, -12, V.frameLen - 14, 12);

    // seat
    ctx.fillStyle = '#071422';
    ctx.fillRect(28, -32, 64, 12);

    // handlebars mast
    ctx.fillRect(V.frameLen - 22, -32, 10, 36);
    // small purple accent near head
    ctx.fillStyle = '#7C5CFF';
    ctx.beginPath();
    ctx.arc(V.frameLen - 8, -10, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // wheels drawn after frame for overlap
    drawWheel(rwx, rwy + V.rearR, V.rearR, world.angVel * 20);
    drawWheel(fwx, fwy + V.frontR, V.frontR, world.angVel * 18);
  }

  // --- Update physics ---
  function update(dt, now) {
    if (!running) return;

    const V = visualParams();

    // compute torque input with ramping:
    // if applying is true, ramp from 0 to 1 over rampMs (180ms).
    // short taps (less than rampMs) will only apply a fraction of torque.
    let inputFactor = 0;
    if (applying) {
      const rampMs = 180;
      const elapsed = Math.max(0, now - applyingStart);
      inputFactor = Math.min(1, elapsed / rampMs);
      // also ensure minimum tiny impulse for very short taps (so quick taps do something small)
      if (elapsed < 80) {
        // quick tap: very small fraction
        inputFactor *= 0.18;
      }
    } else {
      inputFactor = 0;
    }

    const torqueInput = PHYS.liftTorque * inputFactor;
    const torqueGravity = -PHYS.gravityTorque * Math.sin(world.angle);
    const torque = torqueInput + torqueGravity;

    // angular acceleration (scale so dt feels consistent)
    const angAcc = torque / PHYS.inertia;
    world.angVel += angAcc * dt * 60;

    // clamp angVel to avoid huge jumps on quick frames
    if (world.angVel > PHYS.maxAngVel) world.angVel = PHYS.maxAngVel;
    if (world.angVel < -PHYS.maxAngVel) world.angVel = -PHYS.maxAngVel;

    world.angVel *= Math.pow(PHYS.damping, dt * 60);
    world.angle += world.angVel * dt * 60;

    // scoring: accumulate when angle is meaningfully positive (front up)
    if (world.angle > 0.12 && running) {
      timeBalance += dt;
      scoreEl.textContent = timeBalance.toFixed(2) + 's';
    } else {
      scoreEl.textContent = timeBalance.toFixed(2) + 's';
    }

    if (Math.abs(world.angle) > PHYS.crashAngle) {
      crash();
    }
  }

  function crash() {
    running = false;
    best = Math.max(best, timeBalance);
    scoreEl.textContent = timeBalance.toFixed(2) + 's (crash) Best: ' + best.toFixed(2) + 's';
  }

  function clear() {
    ctx.clearRect(0, 0, VIEW.w, VIEW.h);
  }

  function loop(now) {
    const dt = Math.min(0.034, (now - lastTime) / 1000);
    lastTime = now;

    VIEW = resizeCanvasToDisplaySize();
    clear();
    drawEnvironment();
    update(dt, now);
    drawBike();

    if (!running) {
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(0, 0, VIEW.w, VIEW.h);
      ctx.fillStyle = '#ffe0e0';
      ctx.font = 'bold 26px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('You Crashed!', VIEW.w / 2, VIEW.h / 2 - 10);
      ctx.font = '16px Inter, sans-serif';
      ctx.fillStyle = '#f0f0f0';
      ctx.fillText('Click Restart to try again', VIEW.w / 2, VIEW.h / 2 + 22);
    }

    requestAnimationFrame(loop);
  }

  // --- start ---
  reset();
  requestAnimationFrame(loop);

  // expose for debugging if needed
  window.wheelie = { reset, setApplying: v => { applying = !!v; applyingStart = performance.now(); } };

})();
