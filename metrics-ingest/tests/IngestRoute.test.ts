import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { IngestRoute } from "../src/routes/IngestRoute.js";
import { MetricsService } from "../src/services/MetricsService.js";
import { FakeMetricsStore } from "./FakeMetricsStore.js";

type RunningServer = {
  readonly url: string;
  readonly close: () => Promise<void>;
};

function startServer(store: FakeMetricsStore): Promise<RunningServer> {
  const route = new IngestRoute(new MetricsService(store));
  const server = createServer(route.listener());
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve(runningServer(server)));
  });
}

function runningServer(server: Server): RunningServer {
  const address = server.address();
  assert.ok(address !== null && typeof address === "object");
  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolve) => server.close(() => resolve())),
  };
}

const VALID_BEACON = JSON.stringify({
  name: "LCP",
  value: 2412.5,
  rating: "good",
  path: "/projects",
  navType: "navigate",
});

test("POST /metrics with a valid beacon responds 204 empty and records the exact line", async () => {
  const store = new FakeMetricsStore();
  const server = await startServer(store);

  const response = await fetch(`${server.url}/metrics`, {
    method: "POST",
    body: VALID_BEACON,
  });

  assert.equal(response.status, 204);
  assert.equal(await response.text(), "");
  assert.equal(store.writeCallCount(), 1);
  assert.deepEqual(store.writtenLines(), [
    ['web_vitals_lcp_ms{path="/projects",rating="good",nav_type="navigate"} 2412.5'],
  ]);
  await server.close();
});

test("POST /metrics with an invalid body responds 400 with a JSON error and writes nothing", async () => {
  const store = new FakeMetricsStore();
  const server = await startServer(store);

  const response = await fetch(`${server.url}/metrics`, {
    method: "POST",
    body: "not json",
  });

  assert.equal(response.status, 400);
  assert.equal(response.headers.get("content-type"), "application/json");
  assert.deepEqual(await response.json(), {
    error: { kind: "validation", error: { kind: "malformed-json" } },
  });
  assert.equal(store.writeCallCount(), 0);
  await server.close();
});

test("POST /metrics responds 502 with a JSON error when the store fails", async () => {
  const store = new FakeMetricsStore().failWith({
    kind: "write-failed",
    message: "victoria-metrics unreachable",
  });
  const server = await startServer(store);

  const response = await fetch(`${server.url}/metrics`, {
    method: "POST",
    body: VALID_BEACON,
  });

  assert.equal(response.status, 502);
  assert.equal(response.headers.get("content-type"), "application/json");
  assert.deepEqual(await response.json(), {
    error: {
      kind: "store",
      error: { kind: "write-failed", message: "victoria-metrics unreachable" },
    },
  });
  await server.close();
});

test("GET /healthz responds 200", async () => {
  const server = await startServer(new FakeMetricsStore());

  const response = await fetch(`${server.url}/healthz`);

  assert.equal(response.status, 200);
  await server.close();
});

test("any other route responds 404 and writes nothing", async () => {
  const store = new FakeMetricsStore();
  const server = await startServer(store);

  const getMetrics = await fetch(`${server.url}/metrics`);
  const postOther = await fetch(`${server.url}/other`, {
    method: "POST",
    body: VALID_BEACON,
  });

  assert.equal(getMetrics.status, 404);
  assert.equal(postOther.status, 404);
  assert.equal(store.writeCallCount(), 0);
  await server.close();
});
