// core/physics.ts
export const BIKE_PHYSICS = {
  mass: 210,                 // kg (H2R-ish)
  wheelBase: 1.45,           // meters
  centerOfGravity: 0.62,     // % toward rear

  torqueTapImpulse: 0.018,   // quick tap boost
  torqueHoldForce: 0.0018,   // continuous hold
  maxTorque: 0.035,

  gravityRestore: 0.0024,    // pulls bike down
  angularDamping: 0.985,     // stabilizes rotation

  wheelieStartAngle: 0.12,   // radians (~7°)
  balanceSweetSpot: 0.38,    // ideal wheelie angle
  warningAngle: 0.75,        // UI shake zone
  crashAngle: 1.05,          // hard fail

  angularVelocityCap: 0.06,  // prevents insta-flips
};
