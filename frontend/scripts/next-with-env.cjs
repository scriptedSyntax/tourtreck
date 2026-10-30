/* eslint-disable @typescript-eslint/no-require-imports */

const { spawn } = require("node:child_process");
const path = require("node:path");

const env = {
  ...process.env,
  BASELINE_BROWSER_MAPPING_IGNORE_OLD_DATA: "true",
  BROWSERSLIST_IGNORE_OLD_DATA: "true",
};

const nextBin = path.join(__dirname, "..", "node_modules", "next", "dist", "bin", "next");
const child = spawn(process.execPath, [nextBin, ...process.argv.slice(2)], {
  cwd: path.join(__dirname, ".."),
  env,
  shell: false,
});

function forwardFiltered(stream, target) {
  let pending = "";

  stream.on("data", (chunk) => {
    pending += chunk.toString();
    const lines = pending.split(/\r?\n/);
    pending = lines.pop() ?? "";

    for (const line of lines) {
      if (
        line.includes("[baseline-browser-mapping]") &&
        line.includes("over two months old")
      ) {
        continue;
      }
      target.write(`${line}\n`);
    }
  });

  stream.on("end", () => {
    if (
      pending &&
      !(
        pending.includes("[baseline-browser-mapping]") &&
        pending.includes("over two months old")
      )
    ) {
      target.write(pending);
    }
  });
}

forwardFiltered(child.stdout, process.stdout);
forwardFiltered(child.stderr, process.stderr);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
