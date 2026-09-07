// core/physics.ts

export interface BikeState {
  speed: number;
  rpm: number;
  gear: number;

  angle: number;
  angularVelocity: number;

  wheelRotation: number;

  throttle: boolean;
  braking: boolean;

  crashed: boolean;
}

export class PhysicsEngine {
  public readonly bike: BikeState = {
    speed: 0,
    rpm: 0,
    gear: 1,

    angle: 0,
    angularVelocity: 0,

    wheelRotation: 0,

    throttle: false,
    braking: false,

    crashed: false
  };

  readonly MAX_SPEED = 260;
  readonly ACCELERATION = 45;
  readonly FRICTION = 0.995;
  readonly TORQUE = 10;
  readonly GRAVITY = 14;
  readonly DAMPING = 0.96;

  update(delta: number) {
    this.updateSpeed(delta);
    this.updateWheelie(delta);
    this.updateWheelRotation(delta);
    this.updateRPM();
  }

  private updateSpeed(delta: number) {

    if (this.bike.throttle) {

      this.bike.speed +=
        this.ACCELERATION * delta;

    } else {

      this.bike.speed *= this.FRICTION;

    }

    this.bike.speed = Math.max(
      0,
      Math.min(this.MAX_SPEED, this.bike.speed)
    );
  }

  private updateWheelie(delta: number) {

    if (this.bike.throttle && this.bike.speed > 20) {

      this.bike.angularVelocity -=
        this.TORQUE * delta;

    }

    this.bike.angularVelocity +=
      Math.sin(this.bike.angle) *
      this.GRAVITY *
      delta;

    this.bike.angularVelocity *= this.DAMPING;

    this.bike.angle +=
      this.bike.angularVelocity * delta;
  }

  private updateWheelRotation(delta: number) {

    this.bike.wheelRotation +=
      this.bike.speed *
      delta *
      0.25;
  }

  private updateRPM() {

    this.bike.rpm =
      this.bike.speed /
      this.MAX_SPEED;

  }

  reset() {

    this.bike.speed = 0;
    this.bike.angle = 0;
    this.bike.angularVelocity = 0;
    this.bike.rpm = 0;
    this.bike.gear = 1;
    this.bike.wheelRotation = 0;
    this.bike.crashed = false;

  }

}
