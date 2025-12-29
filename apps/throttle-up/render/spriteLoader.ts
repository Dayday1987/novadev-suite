// render/spriteLoader.ts

export type SpriteMap = Record<string, HTMLImageElement>;

export function loadSprites(
  paths: Record<string, string>
): Promise<SpriteMap> {
  const entries = Object.entries(paths);

  return Promise.all(
    entries.map(([key, src]) => {
      return new Promise<[string, HTMLImageElement]>((resolve, reject) => {
        const img = new Image();
        img.src = src;
        img.onload = () => resolve([key, img]);
        img.onerror = () => reject(`Failed to load ${src}`);
      });
    })
  ).then((results) => Object.fromEntries(results));
}
