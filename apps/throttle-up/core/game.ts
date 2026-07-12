// core/game.ts

export interface GameSystem {
  update(deltaTime: number): void;
  render(ctx: CanvasRenderingContext2D): void;
  resize(width: number, height: number): void;
}

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private width = 0;
  private height = 0;

  private lastFrame = 0;
  private running = false;
  private paused = false;

  private systems: GameSystem[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("Unable to create 2D rendering context.");
    }

    this.ctx = ctx;

    this.resize();

    window.addEventListener("resize", () => this.resize());

    document.addEventListener("visibilitychange", () => {
      this.paused = document.hidden;

      if (!this.paused) {
        this.lastFrame = performance.now();
      }
    });
  }

  /**
   * Register any game subsystem.
   * Physics, Renderer, Audio, UI, etc.
   */
  public addSystem(system: GameSystem): void {
    this.systems.push(system);

    system.resize(this.width, this.height);
  }

  public start(): void {
    if (this.running) return;

    this.running = true;
    this.lastFrame = performance.now();

    requestAnimationFrame(this.loop);
  }

  public stop(): void {
    this.running = false;
  }

  public pause(): void {
    this.paused = true;
  }

  public resume(): void {
    this.paused = false;
    this.lastFrame = performance.now();
  }

  private resize(): void {
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.canvas.width = this.width;
    this.canvas.height = this.height;

    for (const system of this.systems) {
      system.resize(this.width, this.height);
    }
  }

  private loop = (time: number): void => {
    if (!this.running) return;

    requestAnimationFrame(this.loop);

    if (this.paused) return;

    const delta = Math.min((time - this.lastFrame) / 1000, 0.05);

    this.lastFrame = time;

    for (const system of this.systems) {
      system.update(delta);
    }

    this.ctx.clearRect(0, 0, this.width, this.height);

    for (const system of this.systems) {
      system.render(this.ctx);
    }
  };
}
