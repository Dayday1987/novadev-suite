const canvas = document.getElementById("game") as HTMLCanvasElement;

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const ctx = canvas.getContext("2d")!;

ctx.fillStyle = "lime";
ctx.fillRect(0, 0, canvas.width, canvas.height);

ctx.fillStyle = "black";
ctx.font = "30px sans-serif";
ctx.fillText("MAIN.TS IS RUNNING", 40, 80);

console.log("MAIN.TS EXECUTED");
