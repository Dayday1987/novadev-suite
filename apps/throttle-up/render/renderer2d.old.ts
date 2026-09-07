import { drawTrack } from "./trackRenderer2d";
import { drawBike } from "./bikeRenderer2d";
import { drawEntity } from "./entityRenderer2d";
import { loadSprites } from "./spriteLoader";
import { SPRITE_PATHS } from "./sprites";

export interface Renderer2D {
  render(game: any): void;
}

export function createRenderer2D(canvas: HTMLCanvasElement): Renderer2D {
  const ctx = canvas.getContext("2d")!;
  let sprites: Record<string, HTMLImageElement> | null = null;

  loadSprites(SPRITE_PATHS).then((loaded) => {
    sprites = loaded;
  });

  function clear() {
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function render(game: any) {
    clear();

    // Track background (placeholder or later asset)
    ctx.fillStyle = "#333";
    ctx.fillRect(0, canvas.height * 0.4, canvas.width, canvas.height * 0.2);

    if (sprites) {
  drawTrack(
    ctx,
    canvas,
    sprites,
    game.world.scrollX
  );
}

    if (sprites) {
      for (const e of game.spawns.entities) {
        drawEntity(ctx, e, canvas, sprites);
      }

      drawBike(
        ctx,
        {
          x: canvas.width * 0.5,
          y: canvas.height * game.bike.laneY,
          angle: game.bike.angle,
        },
        game.visuals,
        sprites.bike
      );
    }

    // HUD
    ctx.fillStyle = "white";
    ctx.font = "16px sans-serif";
    ctx.fillText(`Score: ${game.score}`, canvas.width - 120, 24);

    if (game.phase === "COUNTDOWN") {
      ctx.fillText(game.countdown.phase, canvas.width / 2 - 40, 80);
    }

    if (game.phase === "GAME_OVER") {
      ctx.fillText("GAME OVER", canvas.width / 2 - 60, canvas.height / 2);
    }
  }

  return { render };
}
