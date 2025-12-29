// render/trackRenderer2d.ts

export function drawTrack(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  sprites: Record<string, HTMLImageElement>,
  scrollX: number
) {
  const roadY = canvas.height * 0.55;
  const roadHeight = canvas.height * 0.22;

  // Grass (top)
  tile(ctx, sprites.grass, canvas, scrollX, 0, roadY - roadHeight * 0.5);

  // Road (asphalt)
  tile(ctx, sprites.asphalt, canvas, scrollX, roadY, roadHeight);

  // Grass (bottom)
  tile(
    ctx,
    sprites.grass,
    canvas,
    scrollX,
    roadY + roadHeight,
    canvas.height - roadY
  );

  // Barriers
  tile(
    ctx,
    sprites.barriers,
    canvas,
    scrollX,
    roadY - roadHeight * 0.55,
    roadHeight * 0.2
  );

  // Grandstand (background)
  tile(
    ctx,
    sprites.grandstand,
    canvas,
    scrollX * 0.4, // parallax
    0,
    roadY - roadHeight
  );
}

function tile(
  ctx: CanvasRenderingContext2D,
  sprite: HTMLImageElement,
  canvas: HTMLCanvasElement,
  scrollX: number,
  y: number,
  height: number
) {
  const scale = height / sprite.height;
  const tileWidth = sprite.width * scale;

  let x = -(scrollX % tileWidth);

  while (x < canvas.width) {
    ctx.drawImage(sprite, x, y, tileWidth, height);
    x += tileWidth;
  }
}
