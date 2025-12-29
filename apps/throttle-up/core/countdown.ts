export type CountdownPhase = "OFF" | "YELLOW1" | "YELLOW2" | "GREEN";

export interface CountdownState {
  phase: CountdownPhase;
  timer: number;
}

export const createCountdown = (): CountdownState => ({
  phase: "OFF",
  timer: 0,
});

export function startCountdown(c: CountdownState) {
  c.phase = "YELLOW1";
  c.timer = 0;
}

export function updateCountdown(c: CountdownState, dt: number): boolean {
  c.timer += dt;

  if (c.phase === "YELLOW1" && c.timer > 1) {
    c.phase = "YELLOW2"; c.timer = 0;
  } else if (c.phase === "YELLOW2" && c.timer > 1) {
    c.phase = "GREEN"; c.timer = 0;
    return true; // race starts
  }
  return false;
}
