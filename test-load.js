import fs from "fs";

const program = JSON.parse(
  fs.readFileSync("./data/powerlifting-program.json", "utf-8")
);

console.log("Weeks loaded:", [...new Set(program.map(x => x.week))]);
console.log("Total sessions:", program.length);