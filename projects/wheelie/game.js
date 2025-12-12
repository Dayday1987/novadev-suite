// Wheelie — corrected geometry, gentler controls, road parallax
// Overwrites previous versions — paste exactly and commit.

(function () {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  const scoreEl = document.getElementById('score');
  const restartBtn = document.getElementById('restart');

  // DPI / resize
  function resizeCanvasToDisplaySize() {
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    const displayW = Math.max(640, Math.floor(rect.width));
    const displayH = Math.max(420, Math.floor(rect.height || (displayW * 0.54)));
    canvas.width = Math.round(displayW * ratio);
    canvas.height = Math.round(displayH * ratio);
    canvas.style.height = displayH + 'px';
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    return { w: displayW, h: displayH, ratio };
  }

  let VIEW = resizeCanvasToDisplaySize();
  window.addEventListener('resize', () => { VIEW = resizeCanvasToDisplaySize(); });

  // Visual params (scale with viewport)
  function visualParams() {
    const W = VIEW.w;
    return {
      rearR: Math.max(18, Math.round(W * 0.035)),
      frontR: Math.max(14, Math.round(W * 0.028)),
      frameLen: Math.max(140, Math.round(W * 0.22))
    };
  }

  // Physics constants (tuned)
  const PHYS = {
    inertia: 1.0,
    liftTorqueFull: 0.025,   // full torque after ramp
    gravityTorque: 0.011,
    damping: 0.992,
    crashAngle: Math.PI * 0.52,
    maxAngVel: 2.5           // lower clamp to avoid slingshot
  };

  // world state
  const world = { x: 200, yGround: 0, angle: 0, angVel: 0 };

  let running = true;
  let lastTime = performance.now();
  let timeBalance = 0;
  let best = 0;

  // input
  let applying = false;
  let applyingStart = 0;

  // road offset for parallax movement
  let roadOffset = 0;

  // pointer handling (prevent selection)
  canvas.style.touchAction = 'none';
  canvas.addEventListener('pointerdown', (e) => {
    applying = true; applyingStart = performance.now();
    try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    e.preventDefault();
  }, { passive: false });

  canvas.addEventListener('pointerup', (e) => {
    applying = false; applyingStart = 0;
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

  // reset: compute ground, place rear wheel exactly on ground, compute initial angle so front touches ground
  function reset() {
    VIEW = resizeCanvasToDisplaySize();
    const V = visualParams();

    world.yGround = VIEW.h - Math.max(80, Math.round(V.rearR * 2.6));
    world.x = Math.max(180, Math.round(V.frameLen * 0.9));

    // compute initial angle so wheel centers are aligned to the ground:
    // rearCenterY = world.yGround - rearR
    // We want frontCenterY = world.yGround - frontR
    // So sin(angle) = (frontCenterY - rearCenterY) / frameLen = (rearR - frontR)/frameLen
    const ratio = (V.rearR - V.frontR) / V.frameLen;
    world.angle = Math.abs(ratio) <= 1 ? Math.asin(ratio) : 0;
    world.angVel = 0;

    // small relaxation to remove any tiny bounce: run several micro-steps
    for (let i = 0; i < 6; i++) {
      // apply small gravity torque and damping to settle
      const torqueG = -PHYS.gravityTorque * Math.sin(world.angle);
      const angAcc = torqueG / PHYS.inertia;
      world.angVel += angAcc * (1/60);
      world.angVel *= Math.pow(PHYS.damping, 1);
      world.angle += world.angVel * (1/60);
    }

    running = true;
    timeBalance = 0;
    applying = false;
    applyingStart = 0;
    lastTime = performance.now();
    roadOffset = 0;
    scoreEl.textContent = '0.00s';
  }

  // draw environment + moving dashed road
  function drawEnvironment() {
    const W = VIEW.w, H = VIEW.h;
    ctx.fillStyle = '#071422';
    ctx.fillRect(0, 0, W, H);

    const roadTop = world.yGround + 30;
    ctx.fillStyle = '#0b1a27';
    ctx.fillRect(0, roadTop, W, H - roadTop);

    // moving dashed line (parallax)
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    const dashW = 52, gap = dashW;
    // roadOffset increases slowly; mod to keep in range
    const base = Math.floor(roadOffset % (dashW + gap));
    for (let x = - (dashW + gap); x < W + dashW; x += dashW + gap) {
      ctx.fillRect(x + 12 + base, roadTop + 22, dashW, 6);
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.02)';
    ctx.beginPath();
    ctx.moveTo(0, world.yGround);
    ctx.lineTo(W, world.yGround);
    ctx.stroke();
  }

  // draw wheel
  function drawWheel(cx, cy, r, rot) {
    // tire
    ctx.beginPath();
    ctx.fillStyle = '#0c0c0c';
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // rim/spokes
    ctx.save();
    ctx.translate(cx, cy);
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

  // draw frame centered between wheel centers
  function drawBike() {
    const V = visualParams();
    const rearCenterX = world.x;
    const rearCenterY = world.yGround - V.rearR;

    const ang = world.angle;
    const frontCenterX = rearCenterX + Math.cos(ang) * V.frameLen;
    const frontCenterY = rearCenterY + Math.sin(ang) * V.frameLen;

    // frame rectangle from rear center to front center
    ctx.save();
    ctx.translate(rearCenterX, rearCenterY);
    ctx.rotate(ang);

    // subtle shadow under frame
    ctx.fillStyle = 'rgba(0,0,0,0.14)';
    ctx.fillRect(18, -6 + 8, V.frameLen - 20, 12);

    // main frame bar
    ctx.fillStyle = '#6EE7F7';
    ctx.fillRect(12, -12, V.frameLen - 14, 12);

    // seat
    ctx.fillStyle = '#071422';
    ctx.fillRect(28, -32, 64, 12);

    // handlebar mast / head
    ctx.fillRect(V.frameLen - 22, -32, 10, 36);

    // accent circle
    ctx.fillStyle = '#7C5CFF';
    ctx.beginPath();
    ctx.arc(V.frameLen - 8, -10, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // draw wheels at computed centers (no extra offsets)
    // wheel rotation visual uses angVel for simple spin
    drawWheel(rearCenterX, rearCenterY, V.rearR, world.angVel * 18);
    drawWheel(frontCenterX, frontCenterY, V.frontR, world.angVel * 16);
  }

  // update physics
  function update(dt, now) {
    if (!running) return;

    const V = visualParams();

    // input ramping (ramp ~ 200ms)
    let inputFactor = 0;
    if (applying) {
      const rampMs = 200;
      const elapsed = Math.max(0, now - applyingStart);
      inputFactor = Math.min(1, elapsed / rampMs);
      if (elapsed < 80) inputFactor *= 0.18; // very quick taps produce small fraction
    } else {
      inputFactor = 0;
    }

    const torqueInput = PHYS.liftTorqueFull * inputFactor;
    const torqueGravity = -PHYS.gravityTorque * Math.sin(world.angle);
    const torque = torqueInput + torqueGravity;

    const angAcc = torque / PHYS.inertia;
    world.angVel += angAcc * dt * 60;

    // clamp angular velocity
    if (world.angVel > PHYS.maxAngVel) world.angVel = PHYS.maxAngVel;
    if (world.angVel < -PHYS.maxAngVel) world.angVel = -PHYS.maxAngVel;

    // damping & integrate
    world.angVel *= Math.pow(PHYS.damping, dt * 60);
    world.angle += world.angVel * dt * 60;

    // scoring
    if (world.angle > 0.12 && running) {
      timeBalance += dt;
      scoreEl.textContent = timeBalance.toFixed(2) + 's';
    } else {
      scoreEl.textContent = timeBalance.toFixed(2) + 's';
    }

    // crash check
    if (Math.abs(world.angle) > PHYS.crashAngle) {
      crash();
    }

    // road parallax: small speed when balanced or when holding
    const baseSpeed = 10; // px/sec baseline
    const extra = applying ? 40 : 0;
    roadOffset += (baseSpeed + extra) * dt;
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

  // initial run
  reset();
  requestAnimationFrame(loop);

  // exposed for debugging
  window.wheelie = { reset };

})();
