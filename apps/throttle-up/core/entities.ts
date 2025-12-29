export type EntityType = "OBSTACLE" | "COIN";

export interface Entity {
  type: EntityType;
  x: number;
  laneY: number;
  collected?: boolean;
}
