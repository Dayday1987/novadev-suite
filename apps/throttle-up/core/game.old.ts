import { BIKE_PHYSICS } from "./physics";
import { createWorld, WorldState } from "./world";
import { createCountdown, startCountdown, updateCountdown } from "./countdown";
import { createSpawnState, updateSpawns } from "./spawnController";

export type GamePhase = "IDLE" | "COUNTDOWN" | "RACING" | "GAME_OVER";

export interface BikeState {
  angle: number;
  angularVelocity: number;
  speed: number;
  laneY: number;
  crashTimer: number;
}

export interface GameState {
  phase: GamePhase;
  bike: BikeState;
  world: WorldState;
  countdown: ReturnType<typeof createCountdown>;
  spawns: ReturnType<typeof createSpawnState>;
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
      crashTimer: 0,
    },
    world: createWorld(),
    countdown: createCountdown(),
    spawns: createSpawnState(),
    score: 0,
  };
}

export function startGame(game: GameState) {
  game.phase = "COUNTDOWN";
  game.score = 0;

  game.bike.angle = 0;
  game.bike.angularVelocity = 0;
  game.bike.speed = 0;
  game.bike.crashTimer = 0;

  startCountdown(game.countdown);
}

export function updateGame(game: GameState, dt: number, throttle: number) {
  dt = Math.min(dt, 0.05);

  if (game.phase === "COUNTDOWN") {
    const started = updateCountdown(game.countdown, dt);
    if (started) game.phase = "RACING";
  }

  if (game.phase !== "RACING") return;

  updateBike(game, dt, throttle);
  updateWorldScroll(game, dt);
  updateSpawns(game.spawns, dt, game.bike.speed, true);
  handleCollisions(game);
}

function updateBike(game: GameState, dt: number, throttle: number) {
  const bike = game.bike;

  const {
    torqueHoldForce,
    gravityRestore,
    angularDamping,
    angularVelocityCap,
    crashAngle,
  } = BIKE_PHYSICS;

  const playerTorque = throttle * torqueHoldForce;
  const gravityTorque = -Math.sin(bike.angle) * gravityRestore;
  const angularAcceleration = playerTorque + gravityTorque;

  bike.angularVelocity += angularAcceleration * dt;
  bike.angularVelocity *= Math.pow(angularDamping, dt * 60);

  bike.angularVelocity = Math.max(
    -angularVelocityCap,
    Math.min(angularVelocityCap, bike.angularVelocity),
  );

  bike.angle += bike.angularVelocity * dt;

  if (Math.abs(bike.angle) < 0.15) {
    bike.angularVelocity *= 0.92;
  }

  bike.speed = Math.min(1, bike.speed + throttle * 2 * dt);

  if (Math.abs(bike.angle) > crashAngle) {
    bike.crashTimer += dt;
    if (bike.crashTimer > 0.2) {
      game.phase = "GAME_OVER";
    }
  } else {
    bike.crashTimer = 0;
  }
}

function updateWorldScroll(game: GameState, dt: number) {
  const world = game.world;

  world.scrollSpeed = game.bike.speed * 500;

  for (const key in world.layers) {
    const layer = world.layers[key];
    layer.x -= world.scrollSpeed * layer.speedFactor * dt;

    if (layer.x < -1) {
      layer.x += 1;
    }
  }
}

function handleCollisions(game: GameState) {
  for (const e of game.spawns.entities) {
    if (e.collected) continue;

    const laneMatch = Math.abs(e.laneY - game.bike.laneY) < 0.05;
    const xMatch = Math.abs(e.x - 0.5) < 0.05;

    if (laneMatch && xMatch) {
      if (e.type === "OBSTACLE") {
        game.phase = "GAME_OVER";
      }

      if (e.type === "COIN") {
        e.collected = true;
        game.score += 1;
      }
    }
  }
}
