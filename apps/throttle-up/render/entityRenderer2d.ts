// render/entityRenderer2d.ts

export function drawEntity(
  ctx: CanvasRenderingContext2D,
  entity: any,
  canvas: HTMLCanvasElement,
  sprites: Record<string, HTMLImageElement>
) {
  if (entity.collected) return;

  const sprite =
    entity.type === "COIN"
      ? sprites.coin
      : entity.type === "OBSTACLE" && entity.subtype === "CONE"
      ? sprites.cone
      : sprites.oil;

  const x = canvas.width * entity.x;
  const y = canvas.height * entity.y;
  const size = 40;

  ctx.drawImage(sprite, x - size / 2, y - size / 2, size, size);
}
