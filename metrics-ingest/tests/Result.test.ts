import { test } from "node:test";
import assert from "node:assert/strict";
import { ok, err, type Result } from "../src/models/Result.js";

test("ok() produces the exact success variant shape", () => {
  const result: Result<number, string> = ok(42);
  assert.deepEqual(result, { ok: true, value: 42 });
  assert.deepEqual(Object.keys(result).sort(), ["ok", "value"]);
});

test("err() produces the exact failure variant shape", () => {
  const result: Result<number, string> = err("boom");
  assert.deepEqual(result, { ok: false, error: "boom" });
  assert.deepEqual(Object.keys(result).sort(), ["error", "ok"]);
});

test("discriminant narrows each variant to its payload", () => {
  const success: Result<string, string> = ok("payload");
  const failure: Result<string, string> = err("reason");
  assert.equal(success.ok, true);
  if (success.ok) {
    assert.equal(success.value, "payload");
  }
  assert.equal(failure.ok, false);
  if (!failure.ok) {
    assert.equal(failure.error, "reason");
  }
});
