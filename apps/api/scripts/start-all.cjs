const { spawn } = require("node:child_process");
const path = require("node:path");

const processes = [];
let stopping = false;
let remaining = 0;
let exitCode = 0;

function start(entrypoint) {
  const child = spawn(
    process.execPath,
    [path.join(__dirname, "..", "dist", entrypoint)],
    { stdio: "inherit" },
  );
  processes.push(child);
  remaining += 1;
  child.on("error", () => stop(1));
  child.on("close", () => {
    remaining -= 1;
    if (!stopping) stop(1);
    if (remaining === 0) process.exit(exitCode);
  });
  return child;
}

function stop(code) {
  if (stopping) return;
  stopping = true;
  exitCode = code;

  for (const child of processes) {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill("SIGTERM");
    }
  }

  const forceStop = setTimeout(() => {
    for (const child of processes) {
      if (child.exitCode === null && child.signalCode === null) {
        child.kill("SIGKILL");
      }
    }
  }, 10_000);
  forceStop.unref();
}

process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));

async function waitUntilApiReady() {
  const apiUrl = `http://127.0.0.1:${process.env.PORT || 3000}/health`;
  const deadline = Date.now() + 60_000;

  while (!stopping && Date.now() < deadline) {
    try {
      const response = await fetch(apiUrl, {
        signal: AbortSignal.timeout(2_000),
      });
      if (response.ok) return true;
    } catch {
      // The API may still be starting or connecting to the database.
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }

  return false;
}

async function main() {
  start("server.js");
  if (await waitUntilApiReady()) {
    start(path.join("jobs", "review-worker.js"));
  } else if (!stopping) {
    console.error("API did not become healthy; review worker was not started.");
    stop(1);
  }
}

main().catch((error) => {
  console.error("Could not start API and review worker.", error);
  stop(1);
});
