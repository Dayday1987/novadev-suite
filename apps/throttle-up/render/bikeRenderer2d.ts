export function drawBike(ctx, bike, sprites, visual) {
  ctx.save();

  ctx.translate(bike.x, bike.y);
  ctx.rotate(bike.angle);

  // shadow
  ctx.globalAlpha = 0.4;
  ctx.drawImage(
    sprites.shadow.img,
    -sprites.shadow.w * visual.shadowScale / 2,
    sprites.shadow.h * 0.6,
    sprites.shadow.w * visual.shadowScale,
    sprites.shadow.h * visual.shadowScale
  );
  ctx.globalAlpha = 1;

  drawWheel(ctx, sprites.rearWheel, visual.wheelBlurRear);
  drawSprite(ctx, sprites.frame);
  drawSprite(ctx, sprites.fairing);
  drawWheel(ctx, sprites.frontWheel, visual.wheelBlurFront);

  // rider
  ctx.save();
  ctx.rotate(-visual.riderLean * 0.2);
  drawSprite(ctx, sprites.rider);
  ctx.restore();

  ctx.restore();
}
