// Wheelie — improved version
// - proper DPI scaling
// - starts with rear wheel on the ground
// - improved bike visuals (frame + wheels)
// - no slow auto-scrolling / floating
// - better pointer handling (prevent selection on mobile)
// - more responsive lift torque

(function () {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  // UI
  const scoreEl = document.getElementById('score');
  const restartBtn = document.getElementById('restart');

  // responsive / DPI helpers
  function resizeCanvasToDisplaySize() {
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    const displayW = Math.max(640, Math.floor(rect.width));
    const displayH = Math.max(420, Math.floor(rect.height || (displayW * 0.54)));
    // set physical size
    canvas.width = Math.round(displayW * ratio);
    canvas.height = Math.round(displayH * ratio);
    // set CSS size (kept by existing layout)
    canvas.style.height = displayH + 'px';
    // map drawing so 1 unit = 1 css pixel
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    return { w: displayW, h: displayH };
  }

  let VIEW = resizeCanvasToDisplaySize();
  window.addEventListener('resize', () => { VIEW = resizeCanvasToDisplaySize(); });

  // Game state
  let running = true;
  let lastTime = performance.now();
  let applying = false; // input active (pointer / space)
  let timeBalance = 0;
  let best = 0;

  // Logical "world" parameters (in CSS pixels after transform)
  const world = {
    x: 200,        // rear wheel x
    yGround: VIEW.h - 80,
    angle: 0,      // 0 = frame horizontal
    angVel: 0,
  };

  // Visual params (relative to viewport width)
  function visualParams() {
    // compute based on current view width so things scale
    const W = VIEW.w;
    return {
      rearR: Math.max(18, Math.round(W * 0.035)),   // rear wheel radius
      frontR: Math.max(14, Math.round(W * 0.028)),  // front wheel radius
      frameLen: Math.max(160, Math.round(W * 0.22)),// distance rear->front wheel
    };
  }

  // Physics tuning
  const PHYS = {
    inertia: 1.0,
    liftTorque: 0.038,    // applied while holding (higher => faster wheelie)
    gravityTorque: 0.012, // gravity restoring torque
    damping: 0.985,       // angular damping (lower => faster damping)
    crashAngle: Math.PI * 0.5 // ~90deg
  };

  // Input handling — pointer on canvas only (prevents selection)
  canvas.style.touchAction = 'none';
  canvas.addEventListener('pointerdown', (e) => {
    applying = true;
    // capture the pointer so we continue receiving events if finger moves off canvas
    try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    e.preventDefault();
  }, { passive: false });

  canvas.addEventListener('pointerup', (e) => {
    applying = false;
    try { canvas.releasePointerCapture && canvas.releasePointerCapture(e.pointerId); } catch (err) {}
  });
  canvas.addEventListener('pointercancel', () => { applying = false; });

  // keyboard
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') { applying = true; e.preventDefault(); }
    if (e.code === 'KeyR') reset();
  });
  window.addEventListener('keyup', (e) => {
    if (e.code === 'Space') { applying = false; e.preventDefault(); }
  });

  restartBtn.addEventListener('click', reset);

  function reset() {
    // recompute view and visuals (in case of resize)
    VIEW = resizeCanvasToDisplaySize();
    const V = visualParams();
    world.x = Math.max(180, Math.round(V.frameLen * 0.85));
    world.yGround = VIEW.h - Math.max(80, Math.round(V.rearR * 2.5));
    world.angle = 0; // horizontal start
    world.angVel = 0;
    timeBalance = 0;
    running = true;
    applying = false;
    lastTime = performance.now();
    scoreEl.textContent = '0.00s';
  }

  // draw environment: static ground + subtle decorative stripes (not scrolling)
  function drawEnvironment() {
    const W = VIEW.w;
    const H = VIEW.h;
    // ground area
    ctx.fillStyle = '#071422';
    ctx.fillRect(0, 0, W, H);
    // road band
    const roadTop = world.yGround + 30;
    ctx.fillStyle = '#0b1a27';
    ctx.fillRect(0, roadTop, W, H - roadTop);

    // dashed road line (static)
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    const dashW = 52;
    for (let x = 0; x < W; x += dashW * 2) {
      ctx.fillRect(x + 12, roadTop + 22, dashW, 6);
    }
    // horizon subtle line
    ctx.strokeStyle = 'rgba(255,255,255,0.02)';
    ctx.beginPath();
    ctx.moveTo(0, world.yGround);
    ctx.lineTo(W, world.yGround);
    ctx.stroke();
  }

  // draw wheel (rim + spokes)
  function drawWheel(x, y, r, rot) {
    // tire
    ctx.beginPath();
    ctx.fillStyle = '#0c0c0c';
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    // rim / spokes
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

  // draw bike: frame + wheels + small details
  function drawBike() {
    const V = visualParams();
    const rwx = world.x;
    const rwy = world.yGround - V.rearR;
    const frameAngle = world.angle;
    const fwx = rwx + Math.cos(frameAngle) * V.frameLen;
    const fwy = rwy + Math.sin(frameAngle) * V.frameLen;

    // draw frame (rotated rectangle)
    ctx.save();
    ctx.translate(rwx, rwy);
    ctx.rotate(frameAngle);
    // frame body
    ctx.fillStyle = '#6EE7F7';
    ctx.fillRect(12, -10, V.frameLen - 14, 10);
    // seat block
    ctx.fillStyle = '#071422';
    ctx.fillRect(28, -28, 60, 12);
    // handlebar mast
    ctx.fillRect(V.frameLen - 22, -28, 8, 36);
    // small accent circle near front
    ctx.fillStyle = '#7C5CFF';
    ctx.beginPath(); ctx.arc(V.frameLen - 8, -8, 7, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // wheels (draw after so they overlap)
    drawWheel(rwx, rwy + V.rearR, V.rearR, world.angVel * 30);
    drawWheel(fwx, fwy + V.frontR, V.frontR, world.angVel * 28);
  }

  // update physics per dt (seconds)
  function update(dt) {
    if (!running) return;

    // input torque
    const torqueInput = applying ? PHYS.liftTorque : 0;
    // gravity-like restoring torque: tends to bring frame back toward horizontal (angle 0)
    const torqueGravity = -PHYS.gravityTorque * Math.sin(world.angle);
    const torque = torqueInput + torqueGravity;

    // angular acceleration
    const angAcc = torque / PHYS.inertia;
    world.angVel += angAcc * dt * 60; // scale for feel
    // damping (frame)
    world.angVel *= Math.pow(PHYS.damping, dt * 60);
    // integrate angle
    world.angle += world.angVel * dt * 60;

    // scoring: count seconds while angle is meaningfully up
    if (world.angle > 0.12 && running) {
      timeBalance += dt;
      scoreEl.textContent = timeBalance.toFixed(2) + 's';
    } else {
      // show current but not increase
      scoreEl.textContent = timeBalance.toFixed(2) + 's';
    }

    // crash check (if angle gets too big forwards or backwards)
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
    update(dt);
    drawBike();

    // if crashed visual overlay
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

  // Start
  reset();
  requestAnimationFrame(loop);

  // expose for debugging
  window.wheelie = {
    reset,
    setApplying: (v) => { applying = Boolean(v); }
  };

})();
