import "dotenv/config";
import { runTick } from "@/lib/scheduler";

const TICK_MS = 30_000;
let stopping = false;

async function loop() {
  console.log(`[scheduler] starting, ticking every ${TICK_MS / 1000}s`);
  while (!stopping) {
    try {
      await runTick();
    } catch (error) {
      console.error("[scheduler] tick failed:", error);
    }
    await new Promise((resolve) => setTimeout(resolve, TICK_MS));
  }
}

function shutdown(signal: string) {
  console.log(`[scheduler] received ${signal}, shutting down`);
  stopping = true;
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

loop();
