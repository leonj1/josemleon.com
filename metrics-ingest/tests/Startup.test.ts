import assert from "node:assert/strict";
import test from "node:test";
import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { type Result, ok, err } from "../src/models/Result.js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function baseEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env };
  delete env["VM_IMPORT_URL"];
  delete env["PORT"];
  return env;
}

function spawnMain(env: Record<string, string>): ChildProcess {
  return spawn(process.execPath, ["--import", "tsx", "src/main.ts"], {
    cwd: projectRoot,
    env: { ...baseEnv(), ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function exited(child: ChildProcess): Promise<{ code: number | null; stderr: string }> {
  return new Promise((resolve) => {
    let stderr = "";
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    child.on("close", (code) => resolve({ code, stderr }));
  });
}

function closed(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return Promise.resolve();
  return new Promise((resolve) => child.once("close", () => resolve()));
}

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      if (address === null || typeof address === "string") {
        probe.close(() => reject(new Error("could not determine a free port")));
        return;
      }
      probe.close(() => resolve(address.port));
    });
  });
}

async function attemptHealthz(port: number): Promise<Result<number, string>> {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/healthz`);
    return ok(response.status);
  } catch {
    return err("connection refused");
  }
}

async function healthzStatus(
  port: number,
  timeoutMs: number
): Promise<Result<number, string>> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const status = await attemptHealthz(port);
    if (status.ok) return status;
    await delay(50);
  }
  return err(`healthz did not respond within ${timeoutMs}ms`);
}

test("exits 1 and names VM_IMPORT_URL on stderr when it is missing", async () => {
  const child = spawnMain({ PORT: "19091" });
  const result = await exited(child);
  assert.equal(result.code, 1);
  assert.match(result.stderr, /Missing required environment variable: VM_IMPORT_URL/);
});

test("exits 1 and names PORT on stderr when it is missing", async () => {
  const child = spawnMain({ VM_IMPORT_URL: "http://127.0.0.1:8428/api/v1/import/prometheus" });
  const result = await exited(child);
  assert.equal(result.code, 1);
  assert.match(result.stderr, /Missing required environment variable: PORT/);
});

test("serves GET /healthz with 200 when both env vars are set", async () => {
  const port = await freePort();
  const child = spawnMain({
    VM_IMPORT_URL: "http://127.0.0.1:8428/api/v1/import/prometheus",
    PORT: String(port),
  });
  try {
    const status = await healthzStatus(port, 10_000);
    assert.deepEqual(status, { ok: true, value: 200 });
  } finally {
    child.kill();
    await closed(child);
  }
});
