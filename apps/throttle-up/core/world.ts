// core/world.ts

export interface Lane {
  id: number;
  y: number;
}

export class World {

  public width = 0;
  public height = 0;

  public scrollX = 0;

  public roadY = 0;
  public roadHeight = 0;

  public lanes: Lane[] = [];

  public backgroundOffset = 0;

  resize(width: number, height: number) {

    this.width = width;
    this.height = height;

    this.roadY = height * 0.55;
    this.roadHeight = height * 0.22;

    this.lanes = [
      {
        id: 0,
        y: this.roadY + this.roadHeight * 0.25
      },
      {
        id: 1,
        y: this.roadY + this.roadHeight * 0.75
      }
    ];

  }

  update(speed: number, delta: number) {

    const worldSpeed = speed * 18;

    this.scrollX += worldSpeed * delta;

    this.backgroundOffset +=
      worldSpeed *
      0.4 *
      delta;

  }

  getLaneY(index: number): number {

    if (index < 0) index = 0;

    if (index >= this.lanes.length)
      index = this.lanes.length - 1;

    return this.lanes[index].y;

  }

}
