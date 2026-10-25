import { spawn } from "node:child_process";
import path from "node:path";

const port = process.env.PORT || "3000";
const nextBin = path.join(process.cwd(), "node_modules", "next", "dist", "bin", "next");

const child = spawn(process.execPath, [nextBin, "start", "-p", port], {
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code) => process.exit(code ?? 0));
child.on("error", (error) => {
  console.error("Failed to start Next.js:", error.message);
  process.exit(1);
});
