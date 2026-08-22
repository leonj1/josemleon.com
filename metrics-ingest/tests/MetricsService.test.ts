import { test } from "node:test";
import assert from "node:assert/strict";
import { MetricsService } from "../src/services/MetricsService.js";
import { FakeMetricsStore } from "./FakeMetricsStore.js";
import type {
  MetricName,
  MetricValue,
  PagePath,
  WebVitalBeacon,
} from "../src/models/WebVitalBeacon.js";

function beacon(name: MetricName, value: number, path: string): WebVitalBeacon {
  return {
    name,
    value: value as MetricValue,
    rating: "good",
    path: path as PagePath,
    navType: "navigate",
  };
}

function service(): MetricsService {
  return new MetricsService(new FakeMetricsStore());
}

test("maps an LCP beacon to the exact PLAN.md import line", () => {
  const line = service().importLine(beacon("LCP", 2412.5, "/projects"));
  assert.equal(
    line,
    'web_vitals_lcp_ms{path="/projects",rating="good",nav_type="navigate"} 2412.5'
  );
});

test("maps an INP beacon to web_vitals_inp_ms", () => {
  const line = service().importLine(beacon("INP", 180, "/projects"));
  assert.equal(
    line,
    'web_vitals_inp_ms{path="/projects",rating="good",nav_type="navigate"} 180'
  );
});

test("maps a CLS beacon to web_vitals_cls", () => {
  const line = service().importLine(beacon("CLS", 0.05, "/projects"));
  assert.equal(
    line,
    'web_vitals_cls{path="/projects",rating="good",nav_type="navigate"} 0.05'
  );
});

test("maps a TTFB beacon to web_vitals_ttfb_ms", () => {
  const line = service().importLine(beacon("TTFB", 320.25, "/projects"));
  assert.equal(
    line,
    'web_vitals_ttfb_ms{path="/projects",rating="good",nav_type="navigate"} 320.25'
  );
});

test("maps an FCP beacon to web_vitals_fcp_ms", () => {
  const line = service().importLine(beacon("FCP", 1801.5, "/projects"));
  assert.equal(
    line,
    'web_vitals_fcp_ms{path="/projects",rating="good",nav_type="navigate"} 1801.5'
  );
});

test('escapes a `"` character in the path label value', () => {
  const line = service().importLine(beacon("LCP", 2412.5, '/pro"jects'));
  assert.equal(
    line,
    'web_vitals_lcp_ms{path="/pro\\"jects",rating="good",nav_type="navigate"} 2412.5'
  );
});

test("record writes exactly one line for a valid beacon", async () => {
  const store = new FakeMetricsStore();
  const body = JSON.stringify({
    name: "LCP",
    value: 2412.5,
    rating: "good",
    path: "/projects",
    navType: "navigate",
  });

  const result = await new MetricsService(store).record(body);

  assert.deepEqual(result, { ok: true, value: undefined });
  assert.equal(store.writeCallCount(), 1);
  assert.deepEqual(store.writtenLines(), [
    ['web_vitals_lcp_ms{path="/projects",rating="good",nav_type="navigate"} 2412.5'],
  ]);
});

test("record returns a validation error and writes nothing for an invalid beacon", async () => {
  const store = new FakeMetricsStore();

  const result = await new MetricsService(store).record("not json");

  assert.deepEqual(result, {
    ok: false,
    error: { kind: "validation", error: { kind: "malformed-json" } },
  });
  assert.equal(store.writeCallCount(), 0);
});

test("record surfaces a store failure as a store error", async () => {
  const store = new FakeMetricsStore().failWith({
    kind: "write-failed",
    message: "victoria-metrics unreachable",
  });
  const body = JSON.stringify({
    name: "CLS",
    value: 0.05,
    rating: "good",
    path: "/projects",
    navType: "navigate",
  });

  const result = await new MetricsService(store).record(body);

  assert.deepEqual(result, {
    ok: false,
    error: {
      kind: "store",
      error: { kind: "write-failed", message: "victoria-metrics unreachable" },
    },
  });
  assert.equal(store.writeCallCount(), 1);
});
