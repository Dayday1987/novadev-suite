// Simple Wheelie balancing game (canvas)
// Controls: hold Space or pointerdown to apply lifting torque
(function(){
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  // resolution scaling
  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.max(800, rect.width * ratio);
    canvas.height = Math.max(360, rect.height * ratio);
  }
  // ensure a consistent logical size for physics
  function setLogicalSize() {
    canvas.style.height = (canvas.width * 0.54) + 'px';
  }
  // initial size
  canvas.width = 1000;
  canvas.height = 540;
  setLogicalSize();

  // Game state
  let running = true;
  let lastTime = performance.now();
  let applying = false; // is player holding input
  let timeUp = 0; // time balance ongoing
  let best = 0;

  // Bike state (pivot about rear wheel)
  const state = {
    x: 200,           // world x for rear wheel
    yGround: 420,     // ground y in canvas pixels
    angle: -0.05,     // radians; 0 = frame horizontal
    angVel: 0,        // angular velocity
    speed: 0.6        // forward speed factor (parallax)
  };

  // physics constants (tuned experimentally)
  const I = 1.0;                // moment (normalized)
  const liftTorque = 0.015;     // torque while pressing
  const gravityTorque = 0.008;  // gravity pulling down when front up
  const damping = 0.995;        // angular damping each frame
  const maxTilt = Math.PI * 0.6; // beyond this you crash

  // wheels / visual
  const rearWheel = {rx: 0, ry: 0, r: 34};
  const frontWheel = {dx: 220, r: 28}; // front wheel offset along frame

  // UI
  const scoreEl = document.getElementById('score');
  const restartBtn = document.getElementById('restart');

  restartBtn.addEventListener('click', reset);

  // input handlers: pointer + keyboard
  window.addEventListener('pointerdown', (e) => { applying = true; e.preventDefault(); }, {passive:false});
  window.addEventListener('pointerup', () => { applying = false; });
  window.addEventListener('pointercancel', () => { applying = false; });

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') { applying = true; e.preventDefault(); }
    if (e.code === 'KeyR') reset();
  });
  window.addEventListener('keyup', (e) => {
    if (e.code === 'Space') { applying = false; e.preventDefault(); }
  });

  // Reset function
  function reset() {
    state.angle = -0.05;
    state.angVel = 0;
    timeUp = 0;
    running = true;
    applying = false;
    lastTime = performance.now();
    scoreEl.textContent = '0.0s';
  }

  // crash handler
  function crash() {
    running = false;
    best = Math.max(best, timeUp);
    // simple crash effect: flash and show final time
    scoreEl.textContent = timeUp.toFixed(2) + 's (crash) Best: ' + best.toFixed(2) + 's';
  }

  // draw background / ground
  function drawEnvironment() {
    // sky gradient is the canvas background; add road and horizon marks
    ctx.fillStyle = '#04121a';
    ctx.fillRect(0, state.yGround + 40, canvas.width, canvas.height - state.yGround - 40);
    // simple ground stripes
    ctx.fillStyle = '#071422';
    for (let i = -500; i < canvas.width + 500; i += 80) {
      ctx.fillRect((i + (performance.now()/10 * state.speed) % 80), state.yGround + 60, 40, 6);
    }
    // horizon line
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.beginPath();
    ctx.moveTo(0, state.yGround);
    ctx.lineTo(canvas.width, state.yGround);
    ctx.stroke();
  }

  // draw bike
  function drawBike() {
    const cx = state.x;
    const cy = state.yGround;
    // rear wheel position
    const rwx = cx;
    const rwy = cy - rearWheel.r;

    // front wheel position (rotated with frame)
    const frameAngle = state.angle;
    const fwx = rwx + Math.cos(frameAngle) * frontWheel.dx;
    const fwy = rwy + Math.sin(frameAngle) * frontWheel.dx;

    // wheels
    ctx.fillStyle = '#0b1a28';
    // rear wheel shadow / rim
    drawWheel(rwx, rwy, rearWheel.r, state.angle * 3);
    drawWheel(fwx, fwy, frontWheel.r, state.angle * 2.4);

    // frame (a slender rectangle rotating around rear wheel)
    ctx.save();
    ctx.translate(rwx, rwy);
    ctx.rotate(frameAngle);
    // draw frame body
    ctx.fillStyle = '#6EE7F7';
    ctx.fillRect(20, -16, frontWheel.dx - 20, 10);
    // seat
    ctx.fillStyle = '#071422';
    ctx.fillRect(24, -34, 70, 12);
    // handlebars
    ctx.fillRect(frontWheel.dx - 18, -26, 10, 42);
    ctx.restore();

    // small accent / front fender
    ctx.fillStyle = '#7C5CFF';
    ctx.beginPath(); ctx.arc(fwx, fwy - 6, 8, 0, Math.PI*2); ctx.fill();
  }

  function drawWheel(x,y,r,rot) {
    // tire
    ctx.beginPath();
    ctx.fillStyle = '#0c0c0c';
    ctx.arc(x, y, r, 0, Math.PI*2);
    ctx.fill();
    // rim
    ctx.save();
    ctx.translate(x,y);
    ctx.rotate(rot || 0);
    ctx.strokeStyle = '#9fb8c0';
    ctx.lineWidth = Math.max(2, r * 0.14);
    // spokes
    for (let s=0;s<6;s++){
      const a = s * Math.PI*2/6;
      ctx.beginPath();
      ctx.moveTo(0,0);
      ctx.lineTo(Math.cos(a)*(r*0.7), Math.sin(a)*(r*0.7));
      ctx.stroke();
    }
    ctx.restore();
  }

  // update physics
  function update(dt) {
    if (!running) return;

    // torque from player: positive torque lifts front (increases angle)
    const torqueInput = applying ? liftTorque : 0;

    // gravity torque: tends to make front drop if angle > 0, and pull up if angle < 0
    // simple model: torque due to gravity proportional to sin(angle)
    const torqueGravity = -gravityTorque * Math.sin(state.angle);

    // net torque
    const torque = torqueInput + torqueGravity;

    // angular acceleration = torque / inertia (I)
    const angAcc = torque / I;

    // integrate
    state.angVel += angAcc * dt;
    // damping
    state.angVel *= Math.pow(damping, dt * 60);

    state.angle += state.angVel * dt;

    // subtle bobbing / small speed effect (visual)
    state.x += state.speed * dt * (1 + Math.max(0, state.angle)*0.1);

    // check fail conditions:
    if (state.angle > maxTilt || state.angle < -maxTilt) {
      crash();
    } else {
      // scoring: we count time while angle is positive (front up) and bike not crashed
      if (state.angle > 0.12) {
        timeUp += dt;
      } else {
        // small negative drift when not holding front
        // don't reset timeUp — it's cumulative for best; display current balancing moment
      }
      // update score display every frame (show current balance time)
      scoreEl.textContent = timeUp.toFixed(2) + 's';
    }
  }

  // clear screen
  function clear() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
  }

  // main loop
  function loop(now) {
    const dt = Math.min(0.034, (now - lastTime) / 1000); // clamp dt to avoid jump
    lastTime = now;

    // resizing adapt (makes canvas responsive)
    // only adjust CSS height; keep logical canvas.width for crisp rendering
    if (canvas.clientWidth !== canvas.width) {
      // keep width
    }

    clear();
    drawEnvironment();
    update(dt);
    drawBike();

    // if crashed, show crash text
    if (!running) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.fillStyle = '#ffe0e0';
      ctx.font = 'bold 36px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('You Crashed!', canvas.width/2, canvas.height/2 - 10);
      ctx.font = '20px Inter, sans-serif';
      ctx.fillStyle = '#f0f0f0';
      ctx.fillText('Press Restart to try again', canvas.width/2, canvas.height/2 + 28);
    }

    requestAnimationFrame(loop);
  }

  // initialize
  function init() {
    lastTime = performance.now();
    // responsive scaling - set CSS height based on width
    setLogicalSize();
    window.addEventListener('resize', () => {
      setLogicalSize();
    });

    reset();
    requestAnimationFrame(loop);
  }

  // start
  init();

})();
