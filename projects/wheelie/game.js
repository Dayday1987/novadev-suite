// Wheelie — mirrored visuals so bike faces LEFT + gentler controls
// Overwrite current game.js with this file.

(function () {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('score');
  const restartBtn = document.getElementById('restart');

  // Resize & DPR
  function resize() {
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    const cssW = Math.max(640, Math.floor(rect.width));
    const cssH = Math.max(420, Math.floor(rect.height || (cssW * 0.54)));
    canvas.width = Math.round(cssW * ratio);
    canvas.height = Math.round(cssH * ratio);
    canvas.style.height = cssH + 'px';
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    return { w: cssW, h: cssH, ratio };
  }

  let VIEW = resize();
  window.addEventListener('resize', () => { VIEW = resize(); });

  // Visual scaling
  function visuals() {
    const W = VIEW.w;
    return {
      rearR: Math.max(18, Math.round(W * 0.035)),
      frontR: Math.max(14, Math.round(W * 0.028)),
      frameLen: Math.max(140, Math.round(W * 0.22))
    };
  }

  // Physics constants (conservative & stable)
  const PHY = {
    inertia: 1.0,
    liftFull: 0.0075,  // full lift torque (negative in sign later)
    gravity: 0.0100,
    damping: 0.987,
    crashAngle: Math.PI * 0.58,
    maxAngVel: 1.0,
    rampMs: 260
  };

  // World state (physics stays as before, front is to the right logically)
  const world = {
    rearX: 220,
    yGround: VIEW.h - 60,
    angle: 0,
    angVel: 0
  };

  let running = true;
  let lastTime = performance.now();
  let timeBalance = 0;
  let best = 0;

  let applying = false;
  let applyingStart = 0;
  let roadOffset = 0;

  // pointer handling (prevent selection on mobile)
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

  // Reset: compute ground and initial angle so rear wheel sits on ground
  function reset() {
    VIEW = resize();
    const V = visuals();

    world.yGround = VIEW.h - Math.max(72, Math.round(V.rearR * 2.4));
    world.rearX = Math.max(140, Math.round(V.frameLen * 0.9));

    // compute initial slight nose-up so wheels naturally touch ground
    const ratio = (V.rearR - V.frontR) / V.frameLen;
    world.angle = (Math.abs(ratio) <= 1) ? -Math.asin(ratio) : 0; // negative => front slightly up
    world.angVel = 0;

    // tiny settle (no visible bounce)
    for (let i = 0; i < 3; i++) {
      const torqueG = -PHY.gravity * Math.sin(world.angle);
      world.angVel += (torqueG / PHY.inertia) * (1/60);
      world.angVel *= PHY.damping;
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

  // Drawing helpers (physics uses front on the right; we'll mirror coords visually)
  function drawEnvironment() {
    const W = VIEW.w, H = VIEW.h;
    ctx.fillStyle = '#071422';
    ctx.fillRect(0, 0, W, H);

    const roadTop = world.yGround + 28;
    ctx.fillStyle = '#0b1a27';
    ctx.fillRect(0, roadTop, W, H - roadTop);

    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    const dash = 52, gap = dash;
    const base = Math.floor(roadOffset % (dash + gap));
    for (let x = - (dash + gap); x < W + dash; x += dash + gap) {
      ctx.fillRect(x + 12 + base, roadTop + 22, dash, 6);
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.02)';
    ctx.beginPath();
    ctx.moveTo(0, world.yGround);
    ctx.lineTo(W, world.yGround);
    ctx.stroke();
  }

  function drawWheel(cx, cy, r, rot) {
    ctx.beginPath();
    ctx.fillStyle = '#0c0c0c';
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

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

  // IMPORTANT: physics assumes front wheel is to the RIGHT of rearX
  // We'll compute physics positions (rearCx/frontCx) and then mirror them
  // for display so the bike appears to face LEFT.
  function drawBike() {
    const V = visuals();
    // physics centers (front to the right)
    const rearCx = world.rearX;
    const rearCy = world.yGround - V.rearR;
    const ang = world.angle;
    const frontCx = rearCx + Math.cos(ang) * V.frameLen;
    const frontCy = rearCy + Math.sin(ang) * V.frameLen;

    // Mirror positions horizontally for visual (face left)
    const mirror = (x) => VIEW.w - x;
    const mRearX = mirror(rearCx);
    const mFrontX = mirror(frontCx);

    // frame drawn relative to mirrored rear point:
    ctx.save();
    // translate to mirrored rear center
    ctx.translate(mRearX, rearCy);
    // rotation: we need to flip angle horizontally: flipping horizontally changes rotation sign
    ctx.rotate(-ang);

    // shadow under frame
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(18, -6 + 8, V.frameLen - 20, 12);

    // main frame bar (draw left-to-right visually, but we've flipped transform)
    ctx.fillStyle = '#6EE7F7';
    ctx.fillRect(12, -12, V.frameLen - 14, 12);

    // seat
    ctx.fillStyle = '#071422';
    ctx.fillRect(28, -32, 60, 12);

    // handlebar mast (on the visual left side after mirroring)
    ctx.fillRect(V.frameLen - 22, -32, 10, 36);

    // accent (purple) near front on visual left side (we still draw here because transform handles it)
    ctx.fillStyle = '#7C5CFF';
    ctx.beginPath();
    ctx.arc(V.frameLen - 8, -10, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // draw mirrored wheels (wheel rotation uses world.angVel; spin direction doesn't need to change)
    drawWheel(mRearX, rearCy, V.rearR, world.angVel * 16);
    drawWheel(mFrontX, frontCy, V.frontR, world.angVel * 14);
  }

  // Physics update (physics unchanged: front is logically right)
  function update(dt, now) {
    if (!running) return;
    const V = visuals();

    // ramp input (longer ramp keeps hold controlled)
    let inputFactor = 0;
    if (applying) {
      const elapsed = Math.max(0, now - applyingStart);
      inputFactor = Math.min(1, elapsed / PHY.rampMs);
      // make short taps noticeable but not slingshot
      if (elapsed < 120) inputFactor = Math.max(inputFactor, 0.32);
    } else {
      inputFactor = 0;
    }

    // lift torque must be NEGATIVE to reduce world.angle (nose up)
    const torqueInput = -PHY.liftFull * inputFactor;
    const torqueGravity = -PHY.gravity * Math.sin(world.angle);
    const torque = torqueInput + torqueGravity;

    // integrate
    const angAcc = torque / PHY.inertia;
    world.angVel += angAcc * dt;

    // clamp velocity
    if (world.angVel > PHY.maxAngVel) world.angVel = PHY.maxAngVel;
    if (world.angVel < -PHY.maxAngVel) world.angVel = -PHY.maxAngVel;

    world.angVel *= Math.pow(PHY.damping, dt * 60);
    world.angle += world.angVel * dt * 60;

    // scoring: when nose is up (angle negative because lift reduces angle)
    if (world.angle < -0.12 && running) {
      timeBalance += dt;
      scoreEl.textContent = timeBalance.toFixed(2) + 's';
    } else {
      scoreEl.textContent = timeBalance.toFixed(2) + 's';
    }

    if (Math.abs(world.angle) > PHY.crashAngle) {
      crash();
    }

    // gentle road parallax
    const baseline = 8;
    const extra = applying ? 22 : 0;
    roadOffset += (baseline + extra) * dt;
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
    const dt = Math.min(0.033, (now - lastTime) / 1000);
    lastTime = now;

    VIEW = resize();
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

  // start
  reset();
  requestAnimationFrame(loop);

  // small debug export
  window.wheelie = { reset };

})();
