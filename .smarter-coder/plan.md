# Evolutionary Design Plan: Self-Hosted Performance Metrics Pipeline

Authoritative feature spec: /home/jose/src/josemleon.com/PLAN.md

## Feature summary

Capture real-visitor Core Web Vitals from josemleon.com entirely on our own
infrastructure: a `web-vitals` reporter in the SPA sends one beacon per metric to
`POST /metrics`; nginx proxies it to a new TypeScript `metrics-ingest` service
(Route → Service → MetricsStore interface) which converts each beacon into a
Prometheus exposition line and writes it to a VictoriaMetrics container via
`/api/v1/import/prometheus`; everything runs under docker-compose. Definition of
done: visiting any page of the running site produces Web Vitals samples queryable
in vmui and via the Prometheus HTTP API; data persists across `make restart`; no
third-party network calls; ingest unit tests prove exact exposition-line payloads
and prohibited side effects (invalid beacon → zero writes on the Fake) plus a
contract test against the real VictoriaMetrics; `make build/test/start/stop/restart`
all work.

## Codebase findings & assumptions

Findings:

- Vite 6 / React 18 SPA. Entry: `/home/jose/src/josemleon.com/src/main.jsx`
  (renders `App`; this is where the vitals reporter gets wired once).
  `vite.config.js` has base44 + react plugins and a `preview` block but no
  `server` block yet — milestone 3 adds `server.proxy` for `/metrics`.
- Site frontend conventions (for milestone 3): `src/lib/` holds plain-JS
  kebab-case modules (`query-client.js`, `projects-data.js`, `app-params.js`);
  the `@/` path alias resolves to `src/` (used by `main.jsx` already); no site
  test framework exists, so reporter verification is manual per PLAN.md.
- `Dockerfile` (repo root): multi-stage node:22-alpine build → nginx:1.27-alpine,
  envsubst of `nginx.conf.template` with `$PORT` only. The template's envsubst
  variable list must gain `$INGEST_PORT` when the `/metrics` proxy location is
  added (milestone 4). nginx serves the SPA with `try_files ... /index.html`.
- `Makefile`: plain `docker build`/`docker run` targets `build/start/stop/restart`
  on port 8099; no `test` target and no docker-compose usage yet (milestone 4
  repoints it and adds `test`).
- Site `package.json` scripts: `build` = `vite build`, `lint` = `eslint . --quiet`,
  `typecheck` = `tsc -p ./jsconfig.json`. **No test framework exists in the repo**
  (no vitest/jest), so the ingest service did not inherit one.
- No `docs/` folder, no PROJECT.md. `PLAN.md` at root is the feature spec, not
  project context.
- Milestone 1 outcome (verified): `metrics-ingest/` exists with green tests;
  `MetricsStore` interface is
  `write(lines: ImportLine[]): Promise<Result<void, StoreError>>` with
  `StoreError = { kind: "write-failed"; message: string }`; `IngestConfig`
  carries a typed `vmImportUrl: URL` and branded `Port`; the `npm test` glob is
  the **flat** pattern `tests/*.test.ts`, so files in `tests/contract/` are
  naturally excluded from the default unit-test run; the Dockerfile runtime
  stage copies only `package.json` + `dist/` and runs `node dist/main.js` as
  `USER node`. Global `fetch` is available (Node 22).
- Milestone 2 outcome (verified): `VictoriaMetricsStore` is the real store wired
  in `main.ts`; `StubMetricsStore` deleted (ledger closed); **44 unit tests
  green** via `npm test`; root `docker-compose.yml` runs `victoriametrics`
  (127.0.0.1:8428, `-retentionPeriod=12`, named volume `vm-data`) +
  `metrics-ingest` (127.0.0.1:9091, `PORT=9091`,
  `VM_IMPORT_URL=http://victoriametrics:8428/api/v1/import/prometheus`);
  `compose:up` / `compose:down` / `test:contract` scripts exist in
  `metrics-ingest/package.json`; the contract test lives under
  `tests/contract/` and runs against the compose stack.
- **VictoriaMetrics instant-query gotcha (learned in milestone 2 execution):**
  VM's default `-search.latencyOffset` is **30s**, so `/api/v1/query` silently
  hides samples younger than 30 seconds. The contract test appends
  `latency_offset=1s` to its `/api/v1/query` URL to see fresh samples. Every
  manual verification curl against `/api/v1/query` in milestones 3 and 4 must
  append `&latency_offset=1s` (or wait 30s), otherwise just-written samples will
  falsely appear missing.
- Ingest beacon contract relevant to the frontend (from
  `metrics-ingest/src/models/WebVitalBeacon.ts`): accepted `navType` values are
  exactly `"navigate" | "reload" | "back-forward" | "prerender"`; anything else
  → 400 with zero writes. web-vitals v4/v5's `Metric.navigationType` can emit
  `"navigate" | "reload" | "back-forward" | "back-forward-cache" | "prerender" |
  "restore"` (already hyphenated), so the reporter must normalize/filter (see
  milestone 3 step 1 for the decided handling).

Build/test commands the executor should run:

- **Ingest service** (from `/home/jose/src/josemleon.com/metrics-ingest`):
  - Build: `npm run build` (script: `tsc`)
  - Test: `npm test` (script: `node --import tsx --test "tests/*.test.ts"`)
  - Contract tests: `npm run compose:up`, `npm run test:contract`,
    `npm run compose:down` (see Open decisions, #1 — resolved).
  - Test runner decision: **Node 22 built-in `node:test` + `tsx` loader**,
    devDependencies only `typescript`, `tsx`, `@types/node`. Chosen because the
    repo has no existing test framework, this keeps dependencies minimal, and
    `node:test` assertions (`node:assert/strict`) suffice for exact-payload
    assertions. No mocking frameworks — hand-written Fakes under
    `metrics-ingest/tests/` only.
  - Docker: `docker build -t metrics-ingest ./metrics-ingest` (from repo root).
- **Site** (from `/home/jose/src/josemleon.com`):
  - `npm run lint`, `npm run typecheck`, `npm run build`. No site unit tests;
    all three must stay green at the end of every milestone-3 code step.
- **Whole system** (from milestone 4 onward): `make build`, `make test`,
  `make start`, `make stop`, `make restart` at repo root.

Assumptions:

- Node 22, Docker, and docker compose are available on the dev host (Dockerfile
  already targets node:22-alpine; PLAN.md specifies Node 22).
- No spike milestone is needed: every technology involved (node:http,
  VictoriaMetrics import API, web-vitals, nginx proxy, compose) has
  well-understood behavior; the dominant risk is boundary correctness (exact
  exposition lines, real VM acceptance), which milestones 1–2 retire directly.
- The conventions in the user's global CLAUDE.md apply in full to
  `metrics-ingest`: I/O interface pattern, constructor injection, Result types
  (no exceptions for expected outcomes), typed objects over primitives, no
  static classes, routes call services only, functions < 30 lines, required env
  config with no defaults, Fakes only under `tests/`. The milestone-3 frontend
  code is plain-JS SPA glue and follows the **site's** existing conventions
  (kebab-case `src/lib/` module, small verb-named functions, no test framework);
  the size limits (functions < 30 lines, ≤ 2 indent levels) still apply.
- Commit prefixes: `FEAT:` for behavior steps, `CHORE:` for scaffolding/refactor
  steps that change no behavior.
- The `victoriametrics/victoria-metrics` image is scratch-based (no shell), so
  compose exec-form healthchecks cannot run inside it; readiness is instead
  polled over HTTP (`GET /health` on 8428) by the contract test itself.
- Unit-test choice for `VictoriaMetricsStore` (decided at milestone 2
  elaboration): its HTTP behavior is unit-tested against a locally spawned
  `node:http` server inside the test process — a real socket boundary listener,
  not a mock framework — asserting the exact serialized request; the contract
  test then proves the real VictoriaMetrics accepts that request.

## Milestone list

### Milestone 1 — Ingest walking skeleton (COMPLETE — verified)

**Goal:** A real, dockerized `metrics-ingest` service whose full internal path
(IngestRoute → MetricsService → MetricsStore interface) accepts Web Vitals
beacons over HTTP, with unit tests proving exact exposition-line payloads and
one-write-per-beacon cardinality, and startup that fails clearly without
`VM_IMPORT_URL`/`PORT`.

**Working state at the end:** `cd metrics-ingest && npm test` is green;
`docker build ./metrics-ingest` succeeds; running the container with
`VM_IMPORT_URL` and `PORT` set answers `GET /healthz` with 200 and
`POST /metrics` with 204/400/502 semantics; starting it without either env var
exits non-zero with a clear message naming the missing variable.

**Steps** (all executed and verified; retained for the record):

1. (behavior) Create `/home/jose/src/josemleon.com/metrics-ingest/` with
   `package.json` (`"type": "module"`, scripts `build: "tsc"`,
   `test: "node --import tsx --test \"tests/*.test.ts\""`, devDeps `typescript`,
   `tsx`, `@types/node`), a strict NodeNext `tsconfig.json` compiling `src/` to
   `dist/`, and `src/models/Result.ts` exporting the discriminated union
   `Result<T, E> = { ok: true; value: T } | { ok: false; error: E }` with `ok()`
   and `err()` constructor functions; add `tests/Result.test.ts` (node:test +
   node:assert/strict) asserting the exact shape of both variants.
2. (behavior) Add `src/models/WebVitalBeacon.ts`: branded/typed
   `MetricName` (`"LCP" | "INP" | "CLS" | "TTFB" | "FCP"`), `Rating`
   (`"good" | "needs-improvement" | "poor"`), `NavType`
   (`"navigate" | "reload" | "back-forward" | "prerender"`), `PagePath`,
   `MetricValue`, the `WebVitalBeacon` type, and a
   `webVitalBeaconFromJson(body: string): Result<WebVitalBeacon, BeaconError>`
   parser that returns `err` (never throws) for malformed JSON, unknown metric
   name, non-finite/non-numeric value, missing fields, bad rating, or bad
   navType; add `tests/WebVitalBeacon.test.ts` covering the valid payload from
   PLAN.md (`{"name":"LCP","value":2412.5,"rating":"good","path":"/projects","navType":"navigate"}`)
   and one test per rejection case asserting the exact error variant.
3. (behavior) Add `src/services/MetricsService.ts` with a pure mapping from a
   `WebVitalBeacon` to exactly one `ImportLine` (typed string wrapper) using the
   metric-name table LCP→`web_vitals_lcp_ms`, INP→`web_vitals_inp_ms`,
   CLS→`web_vitals_cls`, TTFB→`web_vitals_ttfb_ms`, FCP→`web_vitals_fcp_ms`,
   label order `path`, `rating`, `nav_type`, and Prometheus label-value escaping
   of `\`, `"`, and newline; add `tests/MetricsService.test.ts` asserting the
   exact line `web_vitals_lcp_ms{path="/projects",rating="good",nav_type="navigate"} 2412.5`
   plus exact lines for the other four metric names and for a path containing a
   `"` character.
4. (behavior) Add `src/clients/MetricsStore.ts` interface
   (`write(lines: ImportLine[]): Promise<Result<void, StoreError>>`), a
   hand-written `tests/FakeMetricsStore.ts` that records every `write` call
   (lines and call count, with a settable failure Result), and a
   `MetricsService.record(body: string): Promise<Result<void, RecordError>>`
   method taking the store via constructor injection that validates, maps, and
   writes; extend `tests/MetricsService.test.ts` to assert: valid beacon →
   exactly one `write` call containing exactly the expected line; invalid
   beacon → `err` result and zero writes on the Fake; store failure → `err`
   result surfaced.
5. (behavior) Add `src/routes/IngestRoute.ts` (node:http request listener class,
   constructor-injected `MetricsService`, no direct I/O): `POST /metrics` reads
   the body and calls `MetricsService.record` only — 204 empty on success, 400
   with JSON error body on validation failure, 502 with JSON error body on
   store failure; `GET /healthz` → 200; anything else → 404; add
   `tests/IngestRoute.test.ts` that starts a real `node:http` server on an
   ephemeral port wired to `IngestRoute` → real `MetricsService` →
   `FakeMetricsStore` and asserts status codes, response bodies, the exact line
   recorded on the Fake for a valid beacon, and zero Fake writes for the 400
   case.
6. (behavior) Add `src/models/IngestConfig.ts` with
   `ingestConfigFromEnv(env: NodeJS.ProcessEnv): Result<IngestConfig, ConfigError>`
   requiring `VM_IMPORT_URL` (typed URL) and `PORT` (typed port number) with no
   defaults; add `tests/IngestConfig.test.ts` asserting the exact missing-variable
   name in the error for each absent var, rejection of a non-numeric `PORT`, and
   the typed values on success.
7. (behavior) Add `src/clients/StubMetricsStore.ts` (temporary: implements
   `MetricsStore`, returns `ok` and stores nothing — see ledger, removed in
   milestone 2) and `src/main.ts` that calls `ingestConfigFromEnv(process.env)`,
   prints the config error to stderr and exits with code 1 when it fails, and
   otherwise wires StubMetricsStore → MetricsService → IngestRoute → http server
   listening on `PORT`; add `tests/Startup.test.ts` that spawns
   `node --import tsx src/main.ts` without `VM_IMPORT_URL` (and separately
   without `PORT`) asserting exit code 1 and a stderr message naming the missing
   variable, and with both set asserting `GET /healthz` on the child returns
   200 before killing it.
8. (behavior) Add `metrics-ingest/Dockerfile` (multi-stage: node:22-alpine,
   `npm ci`, `npm run build` (tsc), runtime stage `node dist/main.js` with only
   production files) and `metrics-ingest/.dockerignore` (node_modules, dist,
   tests); verify with `docker build -t metrics-ingest ./metrics-ingest` from
   the repo root and a smoke run
   `docker run --rm -e VM_IMPORT_URL=http://victoriametrics:8428/api/v1/import/prometheus -e PORT=9091 -p 9091:9091 metrics-ingest`
   answering `GET /healthz` 200 (then stop it); also confirm a run with no env
   vars exits non-zero.

**Risks retired:** exposition-line format and label escaping are pinned by exact
tests; the Route → Service → Store layering, Result-type error flow, required-env
startup contract, and Docker packaging all proven before any external system is
involved.

### Milestone 2 — VictoriaMetrics integration (COMPLETE — verified)

**Goal:** Replace the stub with a real `VictoriaMetricsStore` and prove the real
boundary with a contract test against a VictoriaMetrics container run via a new
root docker-compose.yml.

**Working state at the end (reached and verified):** `docker compose up -d
--build` at the repo root starts `metrics-ingest` (localhost:9091) +
`victoriametrics` (localhost:8428, `-retentionPeriod=12`, named volume); a
curl'd beacon to `http://127.0.0.1:9091/metrics` returns 204 and the sample
appears in `GET http://127.0.0.1:8428/api/v1/query?query=web_vitals_lcp_ms`
(with `latency_offset=1s` — see Codebase findings) with correct labels; with the
VM container stopped the same beacon returns 502;
`npm run compose:up && npm run test:contract` automates the happy path;
`src/clients/StubMetricsStore.ts` is deleted; `npm run build && npm test`
(44 unit tests, Fake-based, no docker needed) green and excludes the contract
test.

**Steps** (all executed and verified; retained for the record):

1. (behavior) Add
   `/home/jose/src/josemleon.com/metrics-ingest/src/clients/VictoriaMetricsStore.ts`
   implementing the existing `MetricsStore` interface: constructor takes
   `importUrl: URL` (constructor injection — only `main.ts` will instantiate
   it); `write(lines)` POSTs the lines joined by `\n` with one trailing `\n` as
   the body to `importUrl` using global `fetch` with header
   `Content-Type: text/plain`, returns `ok(undefined)` on any 2xx response,
   `err({ kind: "write-failed", message })` with the status code in the message
   on any non-2xx, and wraps the fetch call so a network failure (the one
   legitimate boundary try/catch) also returns
   `err({ kind: "write-failed", ... })` — the method never throws; add
   `tests/VictoriaMetricsStore.test.ts` that starts a real `node:http` server on
   an ephemeral port inside the test process (a real socket boundary listener —
   permitted; no mocking frameworks) and asserts: the store sends exactly one
   POST to exactly the path of the configured URL; the exact received body
   `web_vitals_lcp_ms{path="/projects",rating="good",nav_type="navigate"} 2412.5\n`
   for one line and the exact newline-joined body for two lines; the
   `Content-Type: text/plain` header; `ok` when the server answers 204; `err`
   with a message containing `500` when it answers 500; and `err` (not a throw)
   when writing to a port whose server has been closed (connection refused).
2. (behavior) In
   `/home/jose/src/josemleon.com/metrics-ingest/src/main.ts` replace
   `new StubMetricsStore()` with
   `new VictoriaMetricsStore(config.value.vmImportUrl)` (import from
   `./clients/VictoriaMetricsStore.js`), then **delete
   `src/clients/StubMetricsStore.ts`** and grep the project to confirm zero
   remaining references; `tests/Startup.test.ts` must still pass unchanged
   (`GET /healthz` never touches the store, so a dead `VM_IMPORT_URL` is fine);
   finish with `npm run build && npm test` green — this closes the ledger's
   StubMetricsStore row.
3. (behavior) Create `/home/jose/src/josemleon.com/docker-compose.yml` (repo
   root) with exactly two services on the default network, no `container_name`
   overrides, written so milestone 4 can add a `site` service without
   restructuring: `victoriametrics` (image `victoriametrics/victoria-metrics`,
   `command: ["-retentionPeriod=12"]`, `ports: ["127.0.0.1:8428:8428"]`, named
   volume `vm-data` mounted at `/victoria-metrics-data`, top-level
   `volumes: vm-data:`) and `metrics-ingest` (build context `./metrics-ingest`,
   `depends_on: [victoriametrics]`, environment
   `VM_IMPORT_URL=http://victoriametrics:8428/api/v1/import/prometheus` and
   `PORT=9091`, `ports: ["127.0.0.1:9091:9091"]` — localhost-only, needed by the
   contract test and operator); this step's test is the smoke sequence, run it
   in full: `docker compose up -d --build`; POST
   `{"name":"LCP","value":2412.5,"rating":"good","path":"/projects","navType":"navigate"}`
   to `http://127.0.0.1:9091/metrics` → expect 204; curl
   `http://127.0.0.1:8428/api/v1/query?query=web_vitals_lcp_ms` → expect the
   sample with labels `path="/projects"`, `rating="good"`,
   `nav_type="navigate"`; `docker compose stop victoriametrics` then repeat the
   beacon POST → expect 502 (real down-VM store failure surfaces through the
   route); `docker compose start victoriametrics`; `docker compose down`; then
   confirm `npm run build && npm test` still green (untouched by this step).
4. (behavior) Add the automated contract test and its invocation scripts: in
   `metrics-ingest/package.json` add scripts
   `"compose:up": "docker compose -f ../docker-compose.yml up -d --build"`,
   `"compose:down": "docker compose -f ../docker-compose.yml down"`, and
   `"test:contract": "node --import tsx --test \"tests/contract/*.test.ts\""`
   (the `tests/contract/` subdirectory is outside the default `tests/*.test.ts`
   glob, so `npm test` never runs it); add
   `tests/contract/VictoriaMetricsStore.contract.test.ts` which (a) polls
   `http://127.0.0.1:8428/health` and `http://127.0.0.1:9091/healthz` with a
   bounded deadline (~30s, failing with a message telling the user to run
   `npm run compose:up`), (b) POSTs a beacon whose `path` is unique per run
   (e.g. `/contract-<epoch-ms>`, name `LCP`, value `2412.5`, rating `good`,
   navType `navigate`) to `http://127.0.0.1:9091/metrics` and asserts 204,
   (c) polls `http://127.0.0.1:8428/api/v1/query` with the URL-encoded query
   `web_vitals_lcp_ms{path="/contract-<epoch-ms>"}` and `latency_offset=1s`
   (bounded deadline ~30s) until the result vector is non-empty, then asserts
   the exact labels `path`, `rating="good"`, `nav_type="navigate"` and sample
   value `2412.5`; add a short `metrics-ingest/README.md` documenting the
   workflow (`npm run compose:up && npm run test:contract`, then
   `npm run compose:down`; unit tests via `npm test` need no docker); verify by
   running that full sequence green, and confirm `npm run build && npm test`
   alone is still green and still excludes the contract test.

**Risks retired:** the real VictoriaMetrics accepts our exact exposition lines
and the sample round-trips through `/api/v1/query` with correct labels; compose
networking (service-name DNS), named-volume mount, and localhost-only port
publishing work; the non-2xx and connection-refused → `err(StoreError)` paths
are pinned at the socket level (step 1) and the end-to-end 502-with-VM-down
behavior is proven against the real stopped container (step 3). Execution also
surfaced the `-search.latencyOffset` 30s query gotcha, now recorded in Codebase
findings and baked into all later verification instructions.

### Milestone 3 — Frontend beacon (NEXT — fully elaborated)

**Goal:** The SPA reports real Web Vitals through the full dev path (browser →
vite dev proxy → metrics-ingest → VictoriaMetrics).

**Working state at the end:** `web-vitals` is a site dependency;
`src/lib/vitals-reporter.js` sends one beacon per metric via
`navigator.sendBeacon('/metrics', ...)` with a `fetch` keepalive fallback when
sendBeacon is unavailable, wired once in `src/main.jsx`; `vite.config.js`
`server.proxy` forwards `/metrics` to `http://127.0.0.1:9091`; with the compose
stack up, browsing the dev site makes samples for the visited paths appear via
`/api/v1/query?...&latency_offset=1s` and in vmui; `npm run lint`,
`npm run typecheck`, `npm run build` all green; the `metrics-ingest` project is
untouched.

**Steps** (execute in order; steps 1–2 are code steps — run
`npm run lint && npm run typecheck && npm run build` from
`/home/jose/src/josemleon.com` at the end of each and keep all three green;
this milestone touches only the site, never `metrics-ingest/`):

1. (behavior) From `/home/jose/src/josemleon.com` run `npm install web-vitals`
   (current major, v4 or v5 — whatever npm resolves; then check the installed
   package's `navigationType` union in `node_modules/web-vitals` and confirm
   the normalization below covers every member). Create
   `/home/jose/src/josemleon.com/src/lib/vitals-reporter.js` (plain JS,
   kebab-case, matching the existing `src/lib/` modules) exporting a single
   verb-named function `reportWebVitals()` that imports
   `onLCP, onINP, onCLS, onTTFB, onFCP` from `web-vitals` and registers each
   exactly once with a shared handler which, per metric callback: (a) computes
   `navType` by normalizing `metric.navigationType` — replace every `_` with
   `-` (defensive, in case a raw `back_forward` ever surfaces), then map
   `"back-forward-cache"` to `"back-forward"`; if the result is still not one
   of `"navigate" | "reload" | "back-forward" | "prerender"` (the ingest 400s
   anything else — e.g. web-vitals' `"restore"`, or an undefined
   `navigationType`), **return without sending** — a beacon guaranteed to be
   rejected has no value and this drop is the decided handling; (b) builds
   `const body = JSON.stringify({ name: metric.name, value: metric.value,
   rating: metric.rating, path: window.location.pathname, navType })` — one
   metric per beacon, exactly these five fields; (c) sends it with
   `navigator.sendBeacon('/metrics', body)` when `navigator.sendBeacon` is
   available, otherwise `fetch('/metrics', { method: 'POST', body,
   keepalive: true })` fire-and-forget (no await, no error handling/UI — losing
   a beacon is acceptable; do not add retries or other unrequested fallbacks).
   Keep every function under 30 lines and at most 2 indentation levels (extract
   small helpers like `normalizeNavType` / `sendBeacon` as needed). Wire it
   once: in `/home/jose/src/josemleon.com/src/main.jsx` add
   `import { reportWebVitals } from '@/lib/vitals-reporter'` and call
   `reportWebVitals()` once after the `ReactDOM.createRoot(...).render(...)`
   call. Verify lint/typecheck/build green. Commit
   `FEAT: report Core Web Vitals beacons from the SPA`.
2. (behavior) In `/home/jose/src/josemleon.com/vite.config.js` add a `server`
   block alongside the existing `preview` block:
   `server: { proxy: { '/metrics': { target: 'http://127.0.0.1:9091' } } }`
   (hardcoded target per resolved Open decision #2; `127.0.0.1`, not
   `localhost`, because the compose port is published IPv4-only and Node may
   resolve `localhost` to `::1`). This affects the dev server only; production
   `/metrics` routing is nginx's job in milestone 4. Verify lint/typecheck/build
   green. Commit `FEAT: proxy /metrics to metrics-ingest in vite dev server`.
3. (verify — manual end-to-end, no code change, no commit) Prove the full dev
   path with a real browser:
   - `cd /home/jose/src/josemleon.com/metrics-ingest && npm run compose:up`,
     then confirm `curl -s http://127.0.0.1:9091/healthz` returns 200 and
     `curl -s http://127.0.0.1:8428/health` returns OK.
   - `cd /home/jose/src/josemleon.com && npm run dev` and open the printed URL
     (default `http://localhost:5173`) in a browser.
   - Browse: load the home page, navigate to at least one other route (e.g.
     `/projects`), interact (click links/buttons, scroll) so INP and CLS have
     input, then **hide the tab (switch tabs or minimize)** — web-vitals flushes
     LCP/CLS/INP on visibility change.
   - Query (note the **required** `latency_offset=1s` — without it VM hides
     samples younger than 30s):
     `curl -s 'http://127.0.0.1:8428/api/v1/query?query=web_vitals_lcp_ms&latency_offset=1s'`
     and the same for `web_vitals_fcp_ms`, `web_vitals_ttfb_ms`,
     `web_vitals_cls`, `web_vitals_inp_ms`. Success criteria: LCP/FCP/TTFB
     return non-empty result vectors with `path` labels matching the routes you
     visited and `nav_type="navigate"` (or `"reload"` after a reload); CLS and
     INP appear after the interact-then-hide sequence. Optionally eyeball the
     same series in vmui at `http://127.0.0.1:8428/vmui/`.
   - Confirm the ingest logs no 400s for these beacons
     (`docker compose logs metrics-ingest` from the repo root).
   - Teardown: stop the dev server, then
     `cd /home/jose/src/josemleon.com/metrics-ingest && npm run compose:down`.
   - Finish with `npm run lint && npm run typecheck && npm run build` (site)
     and `cd metrics-ingest && npm run build && npm test` (44 tests) green to
     confirm nothing regressed.

**Risks retired:** web-vitals callback payloads map cleanly onto the beacon
contract (including the navigationType mismatch — `back-forward-cache`/`restore`
— now explicitly normalized/filtered); sendBeacon + vite proxy path works end to
end from a real browser into the real store.

**Dependencies:** milestone 2 (a real store to land samples in for manual
verification) — complete.

### Milestone 4 — Production wiring

- **Goal:** One-command production topology: site + ingest + VM under compose,
  driven by the Makefile.
- **Working state at the end:** root `docker-compose.yml` gains the `site`
  service alongside the existing `metrics-ingest` + `victoriametrics`;
  `nginx.conf.template` gains
  `location = /metrics { proxy_pass http://metrics-ingest:$INGEST_PORT/metrics; }`
  and the Dockerfile envsubst list gains `$INGEST_PORT`; Makefile
  `build/start/stop/restart` repointed at compose and `make test` runs ingest
  unit tests + site lint/typecheck; `make start`, browse
  `http://localhost:8099`, samples visible in vmui and via
  `curl 'http://localhost:8428/api/v1/query?query=web_vitals_lcp_ms&latency_offset=1s'`
  (the `latency_offset=1s` parameter is required on all verification curls —
  VM's default 30s `-search.latencyOffset` otherwise hides fresh samples; see
  Codebase findings); data survives `make restart`.
- **Risks retired:** nginx proxy templating with two envsubst vars; compose
  replaces docker-run without breaking the existing site workflow; persistence
  across restart.
- **Dependencies:** milestones 2 and 3.

### Milestone 5 — Docs

- **Goal:** Operator documentation in README.
- **Working state at the end:** README section covering vmui access, example
  PromQL (p75 LCP per path via
  `quantile_over_time(0.75, web_vitals_lcp_ms[7d])`), example query-API curl
  (including the `latency_offset=1s` note for fresh samples), retention/volume
  notes; no code changes; all Make targets still green.
- **Risks retired:** none (knowledge capture).
- **Dependencies:** milestone 4.

## Stubs & flags ledger

| Item | Introduced | Removed |
|------|------------|---------|
| `metrics-ingest/src/clients/StubMetricsStore.ts` (production stub for the external VictoriaMetrics boundary; accepts writes, returns ok) | Milestone 1, step 7 | **Milestone 2, step 2 — DONE**: `main.ts` swapped in `VictoriaMetricsStore(config.vmImportUrl)` and the stub file was deleted in the same step (verified) |

No feature flags planned: the beacon endpoint is inert until the frontend sends
to it, so each milestone is safely shippable without dark-launch flags.

## Open decisions

1. **Contract-test invocation mechanism** — **RESOLVED (milestone 2
   elaboration).** The contract test does **not** manage containers; compose
   lifecycle lives in npm scripts. `npm run compose:up`
   (`docker compose -f ../docker-compose.yml up -d --build`) and
   `npm run compose:down` provide/tear down the real VM + ingest;
   `npm run test:contract` runs only `tests/contract/*.test.ts` (a subdirectory
   deliberately outside the default `tests/*.test.ts` glob, so `npm test` never
   touches docker). Rationale: (a) the test stays a plain HTTP client — no
   docker-CLI coupling inside test code, and it can be re-run in seconds
   against an already-running stack while iterating; (b) readiness is handled
   once, by bounded HTTP polling of `/health` (VM) and `/healthz` (ingest)
   inside the test — necessary anyway because the scratch-based VM image cannot
   run exec-form compose healthchecks; (c) milestone 4's Make targets can reuse
   the same compose file and scripts without restructuring. The test fails with
   a clear "run `npm run compose:up`" message when the stack is absent.
2. **Vite dev proxy target** — **RESOLVED (milestone 3 elaboration).**
   Hardcode `http://127.0.0.1:9091` in `vite.config.js` `server.proxy`; no env
   plumbing. Rationale: (a) this is not a per-environment value — the dev proxy
   only ever targets the local compose stack, whose port is itself fixed at
   `127.0.0.1:9091` in `docker-compose.yml` (milestone 2, verified), and
   production `/metrics` routing goes through nginx (milestone 4), never the
   vite dev server; (b) an env-driven target would need either an implicit
   default (prohibited by the no-implicit-defaults rule) or a mandatory env var
   that breaks plain `npm run dev` for no benefit; (c) `127.0.0.1` rather than
   `localhost` avoids Node resolving `localhost` to `::1` and missing the
   IPv4-only published compose port.
3. **`make test` composition details** — whether it includes `npm run typecheck`
   alongside lint. Decide when elaborating milestone 4. The contract-test half
   is settled by decision #1: contract tests never run under the default
   unit-test entry point; milestone 4 may add a thin `make test-contract`
   wrapper over `compose:up`/`test:contract`/`compose:down`, but `make test`
   stays docker-free.
4. **INGEST_PORT value and env plumbing** through compose/site container.
   Partially constrained by milestone 2: compose sets `PORT=9091` on the
   `metrics-ingest` service and publishes `127.0.0.1:9091:9091`; milestone 4
   decides how `$INGEST_PORT` reaches the site container's nginx template
   (expected value 9091).

## Out of scope

Per PLAN.md: Grafana; alerting, downsampling, auth on the query API
(localhost-only exposure); custom User Timing spans. Additionally: no site-side
unit-test framework is introduced (the SPA has none today; reporter verification
is manual per PLAN.md milestone 3), no retry queue or buffering in the ingest
service, no beacon batching, no user identifiers or IP labels, no sendBeacon
false-return retry logic (fire-and-forget only, per the literal-requirements
rule).

## Plan changelog

(empty — no replans; milestone 2 marked complete and milestone 3 elaborated on
2026-08-22, resolving Open decision #2 and recording the VictoriaMetrics
`latency_offset` finding from milestone 2 execution)
