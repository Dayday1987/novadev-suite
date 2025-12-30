// core/game.ts

import { BIKE_PHYSICS } from "./physics";
import { createWorld } from "./world";
import { updateWorld } from "./worldController";
import { createCountdown, startCountdown, updateCountdown } from "./countdown";
import { createSpawnState, updateSpawns } from "./spawnController";
import { checkCollision } from "./collision";
import { createVisualState } from "./visualState";
import { updateVisuals } from "./visualController";

export type GamePhase = "IDLE" | "COUNTDOWN" | "RACING" | "GAME_OVER";

export interface BikeState {
  angle: number;
  angularVelocity: number;
  speed: number;
  laneY: number;
}

export interface GameState {
  phase: GamePhase;
  bike: BikeState;
  world: ReturnType<typeof createWorld>;
  countdown: ReturnType<typeof createCountdown>;
  spawns: ReturnType<typeof createSpawnState>;
  visuals: ReturnType<typeof createVisualState>;
  score: number;
}

export function createGame(): GameState {
  return {
    phase: "IDLE",
    bike: {
      angle: 0,
      angularVelocity: 0,
      speed: 0,
      laneY: 0.5,
    },
    world: createWorld(),
    countdown: createCountdown(),
    spawns: createSpawnState(),
    visuals: createVisualState(),
    score: 0,
  };
}

export function startGame(game: GameState) {
  game.phase = "COUNTDOWN";
  game.score = 0;
  game.bike.angle = 0;
  game.bike.angularVelocity = 0;
  game.bike.speed = 0;
  startCountdown(game.countdown);
}

export function updateGame(game: GameState, dt: number, throttle: number) {
  if (game.phase === "COUNTDOWN") {
    const started = updateCountdown(game.countdown, dt);
    if (started) game.phase = "RACING";
  }

  if (game.phase !== "RACING") return;

  // Bike physics
  game.bike.angularVelocity += throttle * BIKE_PHYSICS.torqueHoldForce;
  game.bike.angularVelocity -= game.bike.angle * BIKE_PHYSICS.gravityRestore;
  game.bike.angularVelocity *= BIKE_PHYSICS.angularDamping;

  game.bike.angle += game.bike.angularVelocity;
  game.bike.speed = Math.min(1, game.bike.speed + throttle * 0.02);

  if (Math.abs(game.bike.angle) > BIKE_PHYSICS.crashAngle) {
    game.phase = "GAME_OVER";
  }
  // World
  updateWorld(game.world, game.bike.speed);

  // Spawns
  updateSpawns(game.spawns, dt, game.bike.speed, true);

  for (const e of game.spawns.entities) {
    if (checkCollision(0.5, game.bike.laneY, e)) {
      if (e.type === "OBSTACLE") game.phase = "GAME_OVER";
      if (e.type === "COIN") {
        e.collected = true;
        game.score += 1;
      }
    }
  }

  // Visuals
  updateVisuals(
    game.visuals,
    game.bike.angle,
    game.bike.angularVelocity,
    game.bike.speed,
    throttle
  );
}
