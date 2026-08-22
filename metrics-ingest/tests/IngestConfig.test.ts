import { test } from "node:test";
import assert from "node:assert/strict";
import { ingestConfigFromEnv } from "../src/models/IngestConfig.js";

const validEnv = {
  VM_IMPORT_URL: "http://victoria:8428/api/v1/import/prometheus",
  PORT: "8080",
};

test("returns typed values when both variables are present and valid", () => {
  const result = ingestConfigFromEnv({ ...validEnv });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.ok(result.value.vmImportUrl instanceof URL);
  assert.equal(
    result.value.vmImportUrl.href,
    "http://victoria:8428/api/v1/import/prometheus"
  );
  assert.equal(result.value.port, 8080);
});

test("errs naming VM_IMPORT_URL when it is absent", () => {
  const result = ingestConfigFromEnv({ PORT: "8080" });
  assert.deepEqual(result, {
    ok: false,
    error: { kind: "missing-env-var", name: "VM_IMPORT_URL" },
  });
});

test("errs naming PORT when it is absent", () => {
  const result = ingestConfigFromEnv({ VM_IMPORT_URL: validEnv.VM_IMPORT_URL });
  assert.deepEqual(result, {
    ok: false,
    error: { kind: "missing-env-var", name: "PORT" },
  });
});

test("errs naming VM_IMPORT_URL when it is not a parseable URL", () => {
  const result = ingestConfigFromEnv({ ...validEnv, VM_IMPORT_URL: "not a url" });
  assert.deepEqual(result, {
    ok: false,
    error: { kind: "invalid-url", name: "VM_IMPORT_URL", received: "not a url" },
  });
});

test("errs naming PORT when it is not numeric", () => {
  const result = ingestConfigFromEnv({ ...validEnv, PORT: "eighty" });
  assert.deepEqual(result, {
    ok: false,
    error: { kind: "invalid-port", name: "PORT", received: "eighty" },
  });
});

test("errs naming PORT when it is not an integer", () => {
  const result = ingestConfigFromEnv({ ...validEnv, PORT: "80.5" });
  assert.deepEqual(result, {
    ok: false,
    error: { kind: "invalid-port", name: "PORT", received: "80.5" },
  });
});

test("errs naming PORT when it is zero", () => {
  const result = ingestConfigFromEnv({ ...validEnv, PORT: "0" });
  assert.deepEqual(result, {
    ok: false,
    error: { kind: "invalid-port", name: "PORT", received: "0" },
  });
});

test("errs naming PORT when it exceeds the port range", () => {
  const result = ingestConfigFromEnv({ ...validEnv, PORT: "65536" });
  assert.deepEqual(result, {
    ok: false,
    error: { kind: "invalid-port", name: "PORT", received: "65536" },
  });
});
