export function drawEntity(ctx, e, sprites) {
  const s =
    e.type === "COIN"
      ? sprites.coin
      : sprites.obstacles[Math.floor(e.variant)];

  ctx.drawImage(
    s.img,
    e.x * canvas.width - s.w / 2,
    e.laneY * canvas.height - s.h / 2
  );
}
