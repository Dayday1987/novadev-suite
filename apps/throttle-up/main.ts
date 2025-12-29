// main.ts

import { createGame, startGame, updateGame } from "./core/game";
import { createRenderer2D } from "./render/renderer2d";

const canvas = document.createElement("canvas");
document.body.style.margin = "0";
document.body.appendChild(canvas);

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const game = createGame();
const renderer = createRenderer2D(canvas);

let lastTime = performance.now();
let throttle = 0;

canvas.addEventListener("pointerdown", () => {
  throttle = 1;
  if (game.phase === "IDLE" || game.phase === "GAME_OVER") {
    startGame(game);
  }
});

canvas.addEventListener("pointerup", () => {
  throttle = 0;
});

function loop(time: number) {
  const dt = (time - lastTime) / 1000;
  lastTime = time;

  updateGame(game, dt, throttle);
  renderer.render(game);

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
