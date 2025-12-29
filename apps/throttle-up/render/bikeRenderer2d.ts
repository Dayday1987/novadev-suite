// render/bikeRenderer2d.ts

export function drawBike(
  ctx: CanvasRenderingContext2D,
  bike: { x: number; y: number; angle: number },
  visuals: any,
  sprite: HTMLImageElement
) {
  const scale = 0.6;
  const width = sprite.width * scale;
  const height = sprite.height * scale;

  ctx.save();
  ctx.translate(bike.x, bike.y);
  ctx.rotate(bike.angle);
  ctx.drawImage(
    sprite,
    -width * 0.4,
    -height * 0.6,
    width,
    height
  );
  ctx.restore();
}
