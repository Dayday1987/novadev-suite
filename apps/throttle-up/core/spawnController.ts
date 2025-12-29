import { Entity } from "./entities";
import { LANES } from "./lanes";

export interface SpawnState {
  timer: number;
  entities: Entity[];
}

export const createSpawnState = (): SpawnState => ({
  timer: 0,
  entities: [],
});

export function updateSpawns(
  s: SpawnState,
  dt: number,
  speed: number,
  racing: boolean
) {
  if (!racing) return;

  s.timer += dt;

  if (s.timer > 1.2) {
    s.timer = 0;

    const lane = Math.random() > 0.5 ? LANES.LEFT : LANES.RIGHT;

    if (Math.random() > 0.3) {
      // obstacle
      s.entities.push({
        type: "OBSTACLE",
        x: 1.1,
        laneY: lane,
      });
    } else {
      // coin
      s.entities.push({
        type: "COIN",
        x: 1.1,
        laneY: lane,
      });
    }
  }

  // move entities
  for (const e of s.e
