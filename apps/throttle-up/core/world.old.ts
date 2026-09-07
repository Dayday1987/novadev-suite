// core/world.ts

export interface WorldLayer {
  x: number;
  speedFactor: number;
}

export interface WorldState {
  scrollSpeed: number;
  layers: Record<string, WorldLayer>;
}

export function createWorld(): WorldState {
  return {
    scrollSpeed: 0,
    layers: {
      track: { x: 0, speedFactor: 1.0 },
      grass: { x: 0, speedFactor: 0.95 },
      barriers: { x: 0, speedFactor: 0.8 },
      grandstand: { x: 0, speedFactor: 0.45 },
      crowd: { x: 0, speedFactor: 0.35 },
      sky: { x: 0, speedFactor: 0.1 },
    },
  };
}
