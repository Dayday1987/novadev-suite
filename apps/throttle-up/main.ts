import { Game } from "./core/game";

const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;

if (!canvas) {
    throw new Error("Game canvas not found.");
}

const game = new Game(canvas);

game.start();
