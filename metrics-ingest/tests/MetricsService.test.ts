import { test } from "node:test";
import assert from "node:assert/strict";
import { MetricsService } from "../src/services/MetricsService.js";
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

test("maps an LCP beacon to the exact PLAN.md import line", () => {
  const line = new MetricsService().importLine(beacon("LCP", 2412.5, "/projects"));
  assert.equal(
    line,
    'web_vitals_lcp_ms{path="/projects",rating="good",nav_type="navigate"} 2412.5'
  );
});

test("maps an INP beacon to web_vitals_inp_ms", () => {
  const line = new MetricsService().importLine(beacon("INP", 180, "/projects"));
  assert.equal(
    line,
    'web_vitals_inp_ms{path="/projects",rating="good",nav_type="navigate"} 180'
  );
});

test("maps a CLS beacon to web_vitals_cls", () => {
  const line = new MetricsService().importLine(beacon("CLS", 0.05, "/projects"));
  assert.equal(
    line,
    'web_vitals_cls{path="/projects",rating="good",nav_type="navigate"} 0.05'
  );
});

test("maps a TTFB beacon to web_vitals_ttfb_ms", () => {
  const line = new MetricsService().importLine(beacon("TTFB", 320.25, "/projects"));
  assert.equal(
    line,
    'web_vitals_ttfb_ms{path="/projects",rating="good",nav_type="navigate"} 320.25'
  );
});

test("maps an FCP beacon to web_vitals_fcp_ms", () => {
  const line = new MetricsService().importLine(beacon("FCP", 1801.5, "/projects"));
  assert.equal(
    line,
    'web_vitals_fcp_ms{path="/projects",rating="good",nav_type="navigate"} 1801.5'
  );
});

test('escapes a `"` character in the path label value', () => {
  const line = new MetricsService().importLine(beacon("LCP", 2412.5, '/pro"jects'));
  assert.equal(
    line,
    'web_vitals_lcp_ms{path="/pro\\"jects",rating="good",nav_type="navigate"} 2412.5'
  );
});
