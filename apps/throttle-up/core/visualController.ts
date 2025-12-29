// core/visualController.ts
import { VisualState } from "./visualState";
import { BIKE_PHYSICS } from "./physics";

export function updateVisuals(
  v: VisualState,
  angle: number,
  angularVelocity: number,
  speed: number,
  throttle: number
) {
  const angleAbs = Math.abs(angle);

  v.cameraShake = Math.min(1, throttle * 0.6 + angleAbs * 0.8);

  v.wheelBlurRear = Math.min(1, speed * 0.04);
  v.wheelBlurFront = Math.min(1, angleAbs * 1.2);

  v.riderLean = Math.min(1, angleAbs / BIKE_PHYSICS.balanceSweetSpot);

  v.suspension += (throttle * 0.8 - v.suspension) * 0.15;

  v.shadowScale = 1 - Math.min(0.4, angleAbs * 0.5);

  v.dangerPulse =
    angleAbs > BIKE_PHYSICS.warningAngle
      ? Math.min(1, (angleAbs - BIKE_PHYSICS.warningAngle) * 2)
      : 0;
}
