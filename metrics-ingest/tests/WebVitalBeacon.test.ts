import { test } from "node:test";
import assert from "node:assert/strict";
import { webVitalBeaconFromJson } from "../src/models/WebVitalBeacon.js";

const validBody =
  '{"name":"LCP","value":2412.5,"rating":"good","path":"/projects","navType":"navigate"}';

test("parses the valid PLAN.md payload into an exact WebVitalBeacon", () => {
  const result = webVitalBeaconFromJson(validBody);
  assert.deepEqual(result, {
    ok: true,
    value: {
      name: "LCP",
      value: 2412.5,
      rating: "good",
      path: "/projects",
      navType: "navigate",
    },
  });
});

test("rejects malformed JSON with the malformed-json variant", () => {
  const result = webVitalBeaconFromJson('{"name":"LCP",');
  assert.deepEqual(result, { ok: false, error: { kind: "malformed-json" } });
});

test("rejects a JSON body that is not an object with the malformed-json variant", () => {
  const result = webVitalBeaconFromJson("42");
  assert.deepEqual(result, { ok: false, error: { kind: "malformed-json" } });
});

test("rejects an unknown metric name with the unknown-metric-name variant", () => {
  const result = webVitalBeaconFromJson(
    '{"name":"FID","value":12.3,"rating":"good","path":"/projects","navType":"navigate"}'
  );
  assert.deepEqual(result, {
    ok: false,
    error: { kind: "unknown-metric-name", received: "FID" },
  });
});

test("rejects a non-numeric value with the invalid-value variant", () => {
  const result = webVitalBeaconFromJson(
    '{"name":"LCP","value":"2412.5","rating":"good","path":"/projects","navType":"navigate"}'
  );
  assert.deepEqual(result, {
    ok: false,
    error: { kind: "invalid-value", received: "2412.5" },
  });
});

test("rejects a non-finite value with the invalid-value variant", () => {
  const result = webVitalBeaconFromJson(
    '{"name":"LCP","value":1e999,"rating":"good","path":"/projects","navType":"navigate"}'
  );
  assert.deepEqual(result, {
    ok: false,
    error: { kind: "invalid-value", received: Infinity },
  });
});

test("rejects a missing field with the missing-field variant naming that field", () => {
  const result = webVitalBeaconFromJson(
    '{"name":"LCP","value":2412.5,"path":"/projects","navType":"navigate"}'
  );
  assert.deepEqual(result, {
    ok: false,
    error: { kind: "missing-field", field: "rating" },
  });
});

test("rejects a bad rating with the invalid-rating variant", () => {
  const result = webVitalBeaconFromJson(
    '{"name":"LCP","value":2412.5,"rating":"excellent","path":"/projects","navType":"navigate"}'
  );
  assert.deepEqual(result, {
    ok: false,
    error: { kind: "invalid-rating", received: "excellent" },
  });
});

test("rejects a bad navType with the invalid-nav-type variant", () => {
  const result = webVitalBeaconFromJson(
    '{"name":"LCP","value":2412.5,"rating":"good","path":"/projects","navType":"refresh"}'
  );
  assert.deepEqual(result, {
    ok: false,
    error: { kind: "invalid-nav-type", received: "refresh" },
  });
});
