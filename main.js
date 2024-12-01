import { spawn } from "child_process";

function startScript(scriptName) {
  const process = spawn("node", [scriptName]);

  process.stdout.on("data", (data) => {
    console.log(`[${scriptName}] ${data}`);
  });

  process.stderr.on("data", (data) => {
    console.error(`[${scriptName} ERROR] ${data}`);
  });

  process.on("close", (code) => {
    console.log(`[${scriptName}] process exited with code ${code}`);
  });
}

startScript("matchchain.js");
startScript("hot.js");
startScript("vooi.js");
startScript("supermoew.js");
