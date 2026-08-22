import { test } from "node:test";
import assert from "node:assert/strict";

const VM_BASE = "http://127.0.0.1:8428";
const INGEST_BASE = "http://127.0.0.1:9091";
const DEADLINE_MS = 30_000;
const POLL_INTERVAL_MS = 500;
const COMPOSE_HINT =
  "Contract test requires the docker compose stack. Run `npm run compose:up` first.";

type VectorSample = {
  readonly metric: Record<string, string>;
  readonly value: readonly [number, string];
};

type QueryResponse = {
  readonly status: string;
  readonly data: { readonly resultType: string; readonly result: VectorSample[] };
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pollUntil<T>(
  attempt: () => Promise<T | undefined>,
  failureMessage: string
): Promise<T> {
  const deadline = Date.now() + DEADLINE_MS;
  while (Date.now() < deadline) {
    const found = await attempt();
    if (found !== undefined) return found;
    await sleep(POLL_INTERVAL_MS);
  }
  throw new Error(failureMessage);
}

async function respondsOk(url: string): Promise<true | undefined> {
  try {
    const response = await fetch(url);
    return response.ok ? true : undefined;
  } catch {
    return undefined;
  }
}

async function firstVectorSample(query: string): Promise<VectorSample | undefined> {
  // latency_offset=1s overrides VM's default -search.latencyOffset (30s),
  // which would otherwise hide samples ingested within the last 30 seconds.
  const url = `${VM_BASE}/api/v1/query?query=${encodeURIComponent(query)}&latency_offset=1s`;
  try {
    const response = await fetch(url);
    if (!response.ok) return undefined;
    const body = (await response.json()) as QueryResponse;
    return body.data.result.length > 0 ? body.data.result[0] : undefined;
  } catch {
    return undefined;
  }
}

test("ingested beacon is queryable from VictoriaMetrics with exact labels and value", async () => {
  await pollUntil(
    () => respondsOk(`${VM_BASE}/health`),
    `VictoriaMetrics health check at ${VM_BASE}/health did not pass within ${DEADLINE_MS}ms. ${COMPOSE_HINT}`
  );
  await pollUntil(
    () => respondsOk(`${INGEST_BASE}/healthz`),
    `metrics-ingest health check at ${INGEST_BASE}/healthz did not pass within ${DEADLINE_MS}ms. ${COMPOSE_HINT}`
  );

  const path = `/contract-${Date.now()}`;
  const beacon = {
    name: "LCP",
    value: 2412.5,
    rating: "good",
    path,
    navType: "navigate",
  };
  const posted = await fetch(`${INGEST_BASE}/metrics`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(beacon),
  });
  assert.equal(posted.status, 204);

  const query = `web_vitals_lcp_ms{path="${path}"}`;
  const sample = await pollUntil(
    () => firstVectorSample(query),
    `Query ${query} returned an empty vector within ${DEADLINE_MS}ms after a 204 ingest.`
  );
  assert.equal(sample.metric["path"], path);
  assert.equal(sample.metric["rating"], "good");
  assert.equal(sample.metric["nav_type"], "navigate");
  assert.equal(Number(sample.value[1]), 2412.5);
});
