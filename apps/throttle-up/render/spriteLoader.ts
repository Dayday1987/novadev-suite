export async function loadSprite(src: string): Promise<Sprite> {
  const img = new Image();
  img.src = src;
  await img.decode();
  return {
    img,
    w: img.width,
    h: img.height,
    anchorX: 0.5,
    anchorY: 0.5,
  };
}
