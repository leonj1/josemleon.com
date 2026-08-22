import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { VictoriaMetricsStore } from "../src/clients/VictoriaMetricsStore.js";
import type { ImportLine } from "../src/models/ImportLine.js";

type ReceivedRequest = {
  method: string | undefined;
  path: string | undefined;
  contentType: string | undefined;
  body: string;
};

type BoundaryServer = {
  server: Server;
  port: number;
  requests: ReceivedRequest[];
};

function line(text: string): ImportLine {
  return text as ImportLine;
}

async function startServer(statusCode: number): Promise<BoundaryServer> {
  const requests: ReceivedRequest[] = [];
  const server = createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      requests.push({
        method: req.method,
        path: req.url,
        contentType: req.headers["content-type"],
        body,
      });
      res.statusCode = statusCode;
      res.end();
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("expected an ephemeral TCP address");
  }
  return { server, port: address.port, requests };
}

async function stopServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve()))
  );
}

const lcpLine = line(
  'web_vitals_lcp_ms{path="/projects",rating="good",nav_type="navigate"} 2412.5'
);
const clsLine = line(
  'web_vitals_cls{path="/projects",rating="good",nav_type="navigate"} 0.05'
);

test("sends exactly one POST to the configured URL path", async () => {
  const boundary = await startServer(204);
  const store = new VictoriaMetricsStore(
    new URL(`http://127.0.0.1:${boundary.port}/api/v1/import/prometheus`)
  );

  await store.write([lcpLine]);
  await stopServer(boundary.server);

  assert.equal(boundary.requests.length, 1);
  assert.equal(boundary.requests[0]?.method, "POST");
  assert.equal(boundary.requests[0]?.path, "/api/v1/import/prometheus");
});

test("sends one line as the exact body with one trailing newline", async () => {
  const boundary = await startServer(204);
  const store = new VictoriaMetricsStore(
    new URL(`http://127.0.0.1:${boundary.port}/api/v1/import/prometheus`)
  );

  await store.write([lcpLine]);
  await stopServer(boundary.server);

  assert.equal(
    boundary.requests[0]?.body,
    'web_vitals_lcp_ms{path="/projects",rating="good",nav_type="navigate"} 2412.5\n'
  );
});

test("sends two lines newline-joined with one trailing newline", async () => {
  const boundary = await startServer(204);
  const store = new VictoriaMetricsStore(
    new URL(`http://127.0.0.1:${boundary.port}/api/v1/import/prometheus`)
  );

  await store.write([lcpLine, clsLine]);
  await stopServer(boundary.server);

  assert.equal(boundary.requests[0]?.body, `${lcpLine}\n${clsLine}\n`);
});

test("sends the Content-Type: text/plain header", async () => {
  const boundary = await startServer(204);
  const store = new VictoriaMetricsStore(
    new URL(`http://127.0.0.1:${boundary.port}/api/v1/import/prometheus`)
  );

  await store.write([lcpLine]);
  await stopServer(boundary.server);

  assert.equal(boundary.requests[0]?.contentType, "text/plain");
});

test("returns ok when the server answers 204", async () => {
  const boundary = await startServer(204);
  const store = new VictoriaMetricsStore(
    new URL(`http://127.0.0.1:${boundary.port}/api/v1/import/prometheus`)
  );

  const result = await store.write([lcpLine]);
  await stopServer(boundary.server);

  assert.deepEqual(result, { ok: true, value: undefined });
});

test("returns err with the status code in the message when the server answers 500", async () => {
  const boundary = await startServer(500);
  const store = new VictoriaMetricsStore(
    new URL(`http://127.0.0.1:${boundary.port}/api/v1/import/prometheus`)
  );

  const result = await store.write([lcpLine]);
  await stopServer(boundary.server);

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.error.kind, "write-failed");
  assert.ok(result.error.message.includes("500"));
});

test("returns err instead of throwing when the connection is refused", async () => {
  const boundary = await startServer(204);
  await stopServer(boundary.server);
  const store = new VictoriaMetricsStore(
    new URL(`http://127.0.0.1:${boundary.port}/api/v1/import/prometheus`)
  );

  const result = await store.write([lcpLine]);

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.error.kind, "write-failed");
  assert.equal(boundary.requests.length, 0);
});
