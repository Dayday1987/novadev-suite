const canvas = document.getElementById("game");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const ctx = canvas.getContext("2d");

ctx.fillStyle = "lime";
ctx.fillRect(0, 0, canvas.width, canvas.height);

ctx.fillStyle = "black";
ctx.font = "28px sans-serif";
ctx.fillText("THROTTLE-UP IS LIVE", 40, 80);

console.log("Throttle-Up main.js running");
