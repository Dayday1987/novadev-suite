// render/renderer2d.ts

import { drawBike } from "./bikeRenderer2d";
import { drawEntity } from "./entityRenderer2d";

export interface Renderer2D {
  render(game: any): void;
}

export function createRenderer2D(
  canvas: HTMLCanvasElement
): Renderer2D {
  const ctx = canvas.getContext("2d")!;

  function clear() {
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function render(game: any) {
    clear();

    // Track
    ctx.fillStyle = "#333";
    ctx.fillRect(0, canvas.height * 0.4, canvas.width, canvas.height * 0.2);

    // Entities
    for (const e of game.spawns.entities) {
      drawEntity(ctx, e, canvas);
    }

    // Bike
    drawBike(
      ctx,
      {
        x: canvas.width * 0.5,
        y: canvas.height * game.bike.laneY,
        angle: game.bike.angle,
      },
      game.visuals
    );

    // HUD
    ctx.fillStyle = "white";
    ctx.font = "16px sans-serif";
    ctx.fillText(`Score: ${game.score}`, canvas.width - 120, 24);

    if (game.phase === "COUNTDOWN") {
      ctx.fillText(
        game.countdown.phase,
        canvas.width / 2 - 40,
        80
      );
    }

    if (game.phase === "GAME_OVER") {
      ctx.fillText(
        "GAME OVER",
        canvas.width / 2 - 60,
        canvas.height / 2
      );
    }
  }

  return { render };
}
