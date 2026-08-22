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
- **Pre-existing baseline defect (discovered in milestone 3 step 1 execution,
  verified via git stash to predate the feature):** `npm run typecheck`
  (`tsc -p ./jsconfig.json`) fails on the clean tree with 8 TS2339 errors, all
  in `src/lib/app-params.js` — 5 from `setItem`/`getItem`/`removeItem` calls on
  the union `Storage | Map<any, any>` (line 2 uses a `Map` as the Node-side
  localStorage stand-in), 3 from untyped `import.meta.env` (jsconfig has
  `"types": []`, so Vite's `ImportMeta.env` augmentation is absent). The file
  sits in jsconfig's `exclude` list but is still checked because it is
  import-reachable from included files (`exclude` only limits the `include`
  globs, not import resolution). Repaired type-only in milestone 3 step 1
  (revised); no runtime behavior change. **Verified: typecheck is genuinely
  green from milestone 3 onward.**
- `Dockerfile` (repo root, read again at milestone 4 elaboration): multi-stage
  node:22-alpine build → nginx:1.27-alpine; the SPA build is copied to
  `/usr/share/nginx/html` and `nginx.conf.template` to
  `/etc/nginx/templates/default.conf.template`; the exact runtime line is
  `CMD export PORT="${PORT:-80}" && envsubst '$PORT' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && exec nginx -g 'daemon off;'`
  — i.e. envsubst's variable list is the single-quoted `'$PORT'` argument, and
  `PORT` has a pre-existing `:-80` default. `nginx.conf.template` is one
  `server` block: `listen ${PORT};`, SPA `try_files $uri $uri/ /index.html;`.
  Milestone 4 adds the `/metrics` proxy location, `$INGEST_PORT` to the
  envsubst list, and a fail-clearly guard for a missing `INGEST_PORT`.
- `Makefile` (read again at milestone 4 elaboration): variables
  `IMAGE := josemleon-com`, `CONTAINER := josemleon-com`, `PORT := 8099`;
  targets `build` (`docker build -t $(IMAGE) .`), `start`
  (`docker run -d --name $(CONTAINER) -p $(PORT):80 $(IMAGE)` — publishes
  **8099 on all interfaces**), `stop` (`docker rm -f $(CONTAINER)`),
  `restart: stop start`; no `test` target, no compose usage. Milestone 4
  repoints these at compose and adds `test`/`test-contract`. A stale container
  named `josemleon-com` from the old workflow may still hold port 8099 on a dev
  host — remove it before the first `make start` under compose.
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
- Milestone 3 outcome (verified): typecheck baseline repaired (type-only);
  `web-vitals` 6.1.1 installed; `src/lib/vitals-reporter.js` sends one beacon
  per metric (sendBeacon with fetch-keepalive fallback, navigationType
  normalized/dropped per the ingest contract), wired once in `src/main.jsx`;
  `vite.config.js` `server.proxy` forwards `/metrics` to
  `http://127.0.0.1:9091`; verified end-to-end with real browser samples
  landing in VM through the dev proxy; site lint/typecheck/build all green.
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
  → 400 with zero writes. The installed `web-vitals` is **6.1.1** (milestone 3
  step 1 execution); its `Metric.navigationType` union is
  `"navigate" | "reload" | "back-forward" | "back-forward-cache" | "prerender"
  | "restore" | "soft-navigation"` (already hyphenated). The reporter's
  normalize/drop logic (milestone 3 step 2) covers every member:
  `back-forward-cache` → `back-forward`; `restore`, `soft-navigation`, and
  undefined are dropped before sending.
- **No interactive browser on this host.** Milestone 4's end-to-end
  verification uses headless Chrome (`google-chrome --headless=new`) against
  `http://localhost:8099`. Consequences: INP may legitimately be absent
  (it needs user interaction); LCP/CLS flush on page close, which headless
  page teardown triggers.
- Host port **5173 is occupied by an unrelated dev server**. Irrelevant to
  production wiring (nothing in milestone 4 touches 5173) — recorded only to
  avoid confusion if a `npm run dev` is attempted during verification.

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
    all three green since milestone 3 and must stay green at the end of every
    code step.
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
  steps that change no behavior, `BUG:` for defect repairs (milestone 3 step 1).
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

### Milestone 3 — Frontend beacon (COMPLETE — verified; revised at plan revision 2)

**Goal:** The SPA reports real Web Vitals through the full dev path (browser →
vite dev proxy → metrics-ingest → VictoriaMetrics).

**Working state at the end (reached and verified):** `npm run typecheck` at the
repo root exits 0 with zero errors (the pre-existing `app-params.js` baseline
defect is repaired, type-only); `web-vitals` (6.1.1) is a site dependency;
`src/lib/vitals-reporter.js` sends one beacon per metric via
`navigator.sendBeacon('/metrics', ...)` with a `fetch` keepalive fallback when
sendBeacon is unavailable, wired once in `src/main.jsx`; `vite.config.js`
`server.proxy` forwards `/metrics` to `http://127.0.0.1:9091`; with the compose
stack up, browsing the dev site makes samples for the visited paths appear via
`/api/v1/query?...&latency_offset=1s` and in vmui; `npm run lint`,
`npm run typecheck`, `npm run build` all green; the `metrics-ingest` project is
untouched.

**Steps** (all executed and verified; retained for the record):

1. (refactor) Repair the pre-existing typecheck baseline defect — type-only, no
   runtime behavior change. `npm run typecheck` (`tsc -p ./jsconfig.json`)
   fails on the clean tree with 8 TS2339 errors, all in
   `/home/jose/src/josemleon.com/src/lib/app-params.js` (the file is in
   jsconfig's `exclude` list but is still checked because it is import-reachable
   from included files). Make exactly two edits:
   (a) in `src/lib/app-params.js` line 3, change
   `const storage = windowObj.localStorage;` to
   `const storage = /** @type {Storage} */ (windowObj.localStorage);` — a
   comment-only JSDoc cast narrowing the `Storage | Map<any, any>` union,
   fixing the 5 `setItem`/`getItem`/`removeItem` errors; this is safe because
   the Map arm is dead at runtime for those calls (every storage call site in
   `getAppParamValue` is behind the `isNode` early return, and under Node
   `getAppParamValue("clear_access_token")` returns `undefined` so the
   `removeItem` branch in `getAppParams` never runs) — change no executable
   code;
   (b) in `/home/jose/src/josemleon.com/jsconfig.json` change `"types": []` to
   `"types": ["vite/client"]`, giving `import.meta.env` its Vite typing and
   fixing the remaining 3 errors (lines 43/46/47); `vite` is already a
   dependency. If adding `vite/client` surfaces any new type errors elsewhere,
   fix them with equally type-only changes if trivial, otherwise report
   `DIVERGENCE` — do not suppress with `@ts-nocheck` or weaken jsconfig.
   Verify `npm run lint && npm run typecheck && npm run build` — typecheck must
   exit 0 with zero errors. Commit **only** `src/lib/app-params.js` and
   `jsconfig.json` (leave the beacon files from step 2 uncommitted). Commit
   message: `BUG: fix pre-existing typecheck errors in app-params.js`.
2. (behavior — already implemented in the uncommitted working tree by the
   pre-divergence execution; validate against the now-green gate and commit)
   The work: `web-vitals` **6.1.1** installed (`npm install web-vitals`; its
   `navigationType` union is `"navigate" | "reload" | "back-forward" |
   "back-forward-cache" | "prerender" | "restore" | "soft-navigation"` — fully
   covered by the normalization below);
   `/home/jose/src/josemleon.com/src/lib/vitals-reporter.js` (plain JS,
   kebab-case, matching the existing `src/lib/` modules) exports a single
   verb-named function `reportWebVitals()` that imports
   `onLCP, onINP, onCLS, onTTFB, onFCP` from `web-vitals` and registers each
   exactly once with a shared handler which, per metric callback: (a) computes
   `navType` by normalizing `metric.navigationType` — replace every `_` with
   `-` (defensive), then map `"back-forward-cache"` to `"back-forward"`; if the
   result is still not one of
   `"navigate" | "reload" | "back-forward" | "prerender"` (the ingest 400s
   anything else — e.g. `"restore"`, `"soft-navigation"`, or an undefined
   `navigationType`), **return without sending** — a beacon guaranteed to be
   rejected has no value and this drop is the decided handling; (b) builds
   `const body = JSON.stringify({ name: metric.name, value: metric.value,
   rating: metric.rating, path: window.location.pathname, navType })` — one
   metric per beacon, exactly these five fields; (c) sends it with
   `navigator.sendBeacon('/metrics', body)` when `navigator.sendBeacon` is
   available, otherwise `fetch('/metrics', { method: 'POST', body,
   keepalive: true })` fire-and-forget (no await, no error handling/UI, no
   retries). Functions under 30 lines, ≤ 2 indentation levels. Wired once in
   `/home/jose/src/josemleon.com/src/main.jsx`:
   `import { reportWebVitals } from '@/lib/vitals-reporter'` and one
   `reportWebVitals()` call after `ReactDOM.createRoot(...).render(...)`.
   In this step: confirm the working tree matches this spec, run
   `npm run lint && npm run typecheck && npm run build` — all three must now be
   green (typecheck was repaired in step 1; the new files contribute zero
   errors). Commit `package.json`, `package-lock.json`,
   `src/lib/vitals-reporter.js`, and `src/main.jsx` with
   `FEAT: report Core Web Vitals beacons from the SPA`.
3. (behavior) In `/home/jose/src/josemleon.com/vite.config.js` add a `server`
   block alongside the existing `preview` block:
   `server: { proxy: { '/metrics': { target: 'http://127.0.0.1:9091' } } }`
   (hardcoded target per resolved Open decision #2; `127.0.0.1`, not
   `localhost`, because the compose port is published IPv4-only and Node may
   resolve `localhost` to `::1`). This affects the dev server only; production
   `/metrics` routing is nginx's job in milestone 4. Verify lint/typecheck/build
   green. Commit `FEAT: proxy /metrics to metrics-ingest in vite dev server`.
4. (verify — manual end-to-end, no code change, no commit) Prove the full dev
   path with a real browser: compose stack up, browse the dev site, confirm the
   five series appear via `/api/v1/query?...&latency_offset=1s` and in vmui,
   no ingest 400s, then tear down and confirm site checks + 44 ingest tests
   still green. (Executed and verified with real browser samples in VM.)

**Risks retired:** the site's typecheck gate is made genuinely green (baseline
`app-params.js` defect repaired type-only), so every later "all three green"
gate is meaningful; web-vitals callback payloads map cleanly onto the beacon
contract (including the navigationType mismatch —
`back-forward-cache`/`restore`/`soft-navigation` — now explicitly
normalized/filtered against the installed 6.1.1 union); sendBeacon + vite proxy
path works end to end from a real browser into the real store.

**Dependencies:** milestone 2 (a real store to land samples in for manual
verification) — complete.

### Milestone 4 — Production wiring (NEXT — fully elaborated)

**Goal:** One-command production topology: site + ingest + VM under compose,
driven by the Makefile.

**Working state at the end:** root `docker-compose.yml` has the `site` service
(existing root Dockerfile, published on `8099:80` exactly as today's Makefile
publishes, `INGEST_PORT=9091` in its environment) alongside `metrics-ingest` +
`victoriametrics`; `nginx.conf.template` proxies `location = /metrics` to
`http://metrics-ingest:${INGEST_PORT}/metrics` and the Dockerfile envsubst list
is `'$PORT $INGEST_PORT'` with a fail-clearly guard when `INGEST_PORT` is
unset; Makefile `build/start/stop/restart` drive compose (named volume
`vm-data` survives `make restart`), `make test` runs ingest build + 44 unit
tests + site lint + typecheck with no docker, and `make test-contract` wraps
the compose contract-test workflow; `make start`, load `http://localhost:8099`
pages (headless Chrome), and the Web Vitals series are queryable via
`curl 'http://127.0.0.1:8428/api/v1/query?query=web_vitals_lcp_ms&latency_offset=1s'`
(the `latency_offset=1s` parameter is required on all verification curls —
VM's default 30s `-search.latencyOffset` otherwise hides fresh samples; see
Codebase findings) and in vmui; a beacon written before `make restart` is still
queryable after it.

**Steps** (execute in order from `/home/jose/src/josemleon.com`; every step
ends with `cd metrics-ingest && npm run build && npm test` (44 tests) and
`npm run lint && npm run typecheck && npm run build` at the repo root all
green; this milestone never touches `metrics-ingest/src` or the SPA source):

1. (behavior) Run the site under compose and repoint the Makefile run targets.
   In `/home/jose/src/josemleon.com/docker-compose.yml` add a third service
   `site` (keep the existing two services and the `vm-data` volume untouched,
   no `container_name`): `build: { context: . }` (the existing root
   Dockerfile), `depends_on: [metrics-ingest]`, `ports: ["8099:80"]` —
   all-interfaces on 8099, exact parity with today's
   `docker run -p 8099:80` (VM and ingest stay `127.0.0.1`-only); do **not**
   set `PORT` (the container keeps its pre-existing `${PORT:-80}` default and
   nginx listens on 80) and do **not** set `INGEST_PORT` yet (nothing consumes
   it until step 2). Rewrite `/home/jose/src/josemleon.com/Makefile`: delete
   the `IMAGE`/`CONTAINER`/`PORT` variables and the `docker build`/`docker
   run`/`docker rm` bodies; new targets — `build:` = `docker compose build`,
   `start:` = `docker compose up -d`, `stop:` = `docker compose down` (never
   pass `-v`; the named volume `vm-data` must survive), `restart: stop start`;
   `.PHONY: build start stop restart`. Verify: first remove any stale
   container from the old workflow (`docker rm -f josemleon-com` — ignore
   "no such container"); `make build`; `make start`; poll then curl
   `http://localhost:8099/` → 200 with the SPA `index.html` (contains
   `<div id="root">`); `curl http://127.0.0.1:9091/healthz` → 200 and
   `curl http://127.0.0.1:8428/health` → OK (all three services up);
   `make restart` → site answers again; `make stop` → `docker compose ps`
   shows nothing; also confirm the standalone image build still works:
   `docker build -t josemleon-com .` succeeds. Finish with the ingest tests
   and site lint/typecheck/build green (untouched by this step). Commit
   `docker-compose.yml` + `Makefile` with
   `FEAT: run the site under docker compose via the Makefile`.
2. (behavior) Proxy `/metrics` from the site's nginx to metrics-ingest.
   (a) In `/home/jose/src/josemleon.com/nginx.conf.template`, inside the
   `server` block above the existing `location /`, add:
   `location = /metrics { proxy_pass http://metrics-ingest:${INGEST_PORT}/metrics; }`
   (use `${INGEST_PORT}`, matching the template's existing `${PORT}` style).
   (b) In `/home/jose/src/josemleon.com/Dockerfile`, change the CMD line to
   `CMD export PORT="${PORT:-80}" && : "${INGEST_PORT:?INGEST_PORT is required}" && envsubst '$PORT $INGEST_PORT' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && exec nginx -g 'daemon off;'`
   — two changes only: the `:?` guard makes a missing `INGEST_PORT` exit
   non-zero with a message naming the variable (no default, per resolved Open
   decision #4; the pre-existing `PORT` `:-80` default stays as-is), and the
   envsubst variable list gains `$INGEST_PORT`.
   (c) In `docker-compose.yml`, add `environment: INGEST_PORT: "9091"` to the
   `site` service (9091 = the ingest container's `PORT`; container-to-container
   traffic on the compose network, unrelated to the `127.0.0.1:9091` host
   publish).
   Verify: `make build && make start`; poll `http://localhost:8099/` → 200;
   `curl -s -o /dev/null -w '%{http_code}' -X POST -d '{"name":"LCP","value":2412.5,"rating":"good","path":"/step2-smoke","navType":"navigate"}' http://localhost:8099/metrics`
   → `204` (browser path: nginx → ingest → VM); then
   `curl -s 'http://127.0.0.1:8428/api/v1/query?query=web_vitals_lcp_ms%7Bpath%3D%22%2Fstep2-smoke%22%7D&latency_offset=1s'`
   → non-empty result with `rating="good"`, `nav_type="navigate"`; an invalid
   beacon (`-d '{}'`) through `http://localhost:8099/metrics` → `400`;
   `make stop`. Fail-clearly check: `docker run --rm josemleon-com` (image
   from step 1's standalone build check, rebuilt here:
   `docker build -t josemleon-com .`) with no `INGEST_PORT` exits non-zero
   printing a message naming `INGEST_PORT`. Known, accepted consequence
   (record only, do not "fix"): running the site image standalone **with**
   `INGEST_PORT` set now also requires a network where the hostname
   `metrics-ingest` resolves — nginx exits with "host not found in upstream"
   otherwise; `docker build` is unaffected and compose is the supported
   runtime path (see resolved Open decision #4). Finish with ingest tests and
   site lint/typecheck/build green. Commit `nginx.conf.template` +
   `Dockerfile` + `docker-compose.yml` with
   `FEAT: proxy /metrics from the site nginx to metrics-ingest`.
3. (behavior) Add `make test` and `make test-contract` per resolved Open
   decision #3. In `/home/jose/src/josemleon.com/Makefile` add:
   `test:` with two recipe lines —
   `cd metrics-ingest && npm run build && npm test` and
   `npm run lint && npm run typecheck` (each Make recipe line runs in its own
   shell at the repo root, so the `cd` is scoped to its line); and
   `test-contract:` with one recipe line —
   `cd metrics-ingest && npm run compose:up && npm run test:contract && npm run compose:down`
   (on failure the stack is deliberately left up for debugging — tear down
   with `make stop`). Extend `.PHONY` with `test test-contract`. Verify:
   `make test` exits 0 and its output shows the 44 ingest tests, eslint, and
   tsc all passing while invoking no docker command; `make test-contract`
   exits 0 (contract test green against the now three-service stack — this
   also proves the compose file change did not break the milestone-2
   scripts); confirm site `npm run build` still green. Commit `Makefile` with
   `FEAT: add make test and make test-contract targets`.
4. (verify — end-to-end production-path verification with headless Chrome; no
   code change, no commit) Prove the definition-of-done flow on the real
   production topology:
   - `docker rm -f josemleon-com` if a stale old-workflow container exists;
     `make start`; poll `http://localhost:8099/` (bounded ~60s) → 200.
   - Generate real browser samples (no interactive browser on this host):
     `google-chrome --headless=new --virtual-time-budget=10000 --dump-dom http://localhost:8099/ > /dev/null`
     then the same for `http://localhost:8099/projects`. Each run loads the
     SPA, the reporter sends beacons via `/metrics` through nginx, and page
     close flushes LCP/CLS.
   - Query each of the five series (the `latency_offset=1s` is required):
     `curl -s 'http://127.0.0.1:8428/api/v1/query?query=<SERIES>&latency_offset=1s'`
     for `web_vitals_lcp_ms`, `web_vitals_fcp_ms`, `web_vitals_ttfb_ms`,
     `web_vitals_cls`, `web_vitals_inp_ms`. Success criteria: LCP, FCP, TTFB,
     and CLS return non-empty vectors with `path` labels including `/` and
     `/projects` and `nav_type="navigate"`; **INP may legitimately be absent**
     (it requires user interaction, which headless page loads do not produce)
     — absence of INP alone is not a failure. Optionally confirm vmui serves:
     `curl -s -o /dev/null -w '%{http_code}' 'http://127.0.0.1:8428/vmui/'`
     → 200.
   - Confirm zero 400s for the browser beacons:
     `docker compose logs metrics-ingest` shows no 400 responses.
   - Persistence across restart: POST a uniquely-labeled beacon
     `{"name":"LCP","value":2412.5,"rating":"good","path":"/persist-<epoch-ms>","navType":"navigate"}`
     to `http://localhost:8099/metrics` → 204; `make restart`; poll
     `http://127.0.0.1:8428/health` until OK; then
     `curl -s 'http://127.0.0.1:8428/api/v1/query?query=web_vitals_lcp_ms%7Bpath%3D%22%2Fpersist-<epoch-ms>%22%7D&latency_offset=1s'`
     → the sample is still present (named volume `vm-data` survived
     `docker compose down`/`up`).
   - Teardown: `make stop`. Final gates: `make test` green and site
     `npm run build` green.

**Risks retired:** nginx proxy templating with two envsubst variables works
(and a missing `INGEST_PORT` fails clearly, never a half-rendered config);
compose fully replaces the docker-run workflow on the same host port 8099
without breaking the standalone `docker build`; the full production request
path (browser → nginx → ingest → VM) carries real headless-browser beacons;
VM data demonstrably survives `make restart` via the named volume.

**Dependencies:** milestones 2 and 3 — both complete.

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
Milestone 4 introduces no temporary artifacts — the compose `site` service,
nginx proxy, and Make targets are all permanent.

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
3. **`make test` composition** — **RESOLVED (milestone 4 elaboration).**
   `make test` = ingest `npm run build && npm test` (tsc compile + 44 unit
   tests) followed by site `npm run lint && npm run typecheck`; it invokes no
   docker. Rationale: (a) PLAN.md specifies exactly "metrics-ingest tests +
   site lint/typecheck"; (b) typecheck is **included** because the baseline
   defect was repaired type-only in milestone 3 step 1 (plan revision 2), so
   typecheck is now a meaningful green gate rather than perma-red noise;
   (c) the ingest `npm run build` is kept in front of `npm test` because it is
   the established milestone gate (`npm run build && npm test`) and catches
   compile errors the tsx-loader test run can mask; (d) site `npm run build`
   is deliberately excluded — the production bundle is `make build`'s concern
   (the Docker image runs `npm run build` inside), and keeping `make test`
   fast and docker-free preserves the tight loop; (e) per decision #1,
   contract tests stay out of `make test`; a thin `make test-contract` target
   (`compose:up && test:contract && compose:down`, run from
   `metrics-ingest/`) is added in milestone 4 step 3 as the documented
   docker-backed entry point.
4. **`INGEST_PORT` value and env plumbing** — **RESOLVED (milestone 4
   elaboration).** Value: **9091**, matching the `PORT` the compose file
   already sets on the `metrics-ingest` service — the site's nginx dials the
   ingest **container** port over the compose network (the `127.0.0.1:9091`
   host publish is irrelevant to container-to-container traffic). Plumbing:
   `docker-compose.yml` sets `INGEST_PORT: "9091"` in the `site` service's
   `environment`; the site Dockerfile's CMD gains
   `: "${INGEST_PORT:?INGEST_PORT is required}"` and the envsubst list becomes
   `'$PORT $INGEST_PORT'`; the template references `${INGEST_PORT}` inside
   `location = /metrics`. Rationale: (a) **no default** for `INGEST_PORT`, per
   the no-implicit-defaults rule — a container missing it must exit non-zero
   naming the variable, not start with a half-rendered config (the
   pre-existing `${PORT:-80}` default is grandfathered and untouched); (b) the
   value lives in compose, the single place that already pins 9091, so there
   is exactly one file to change if the port ever moves; (c) accepted
   consequence: standalone `docker run` of the site image now requires
   `INGEST_PORT` plus a network resolving `metrics-ingest` (nginx resolves the
   upstream at startup); `docker build` remains fully standalone, and compose
   is the sole supported runtime path once the Makefile is repointed.

## Out of scope

Per PLAN.md: Grafana; alerting, downsampling, auth on the query API
(localhost-only exposure); custom User Timing spans. Additionally: no site-side
unit-test framework is introduced (the SPA has none today; reporter verification
is manual per PLAN.md milestone 3), no retry queue or buffering in the ingest
service, no beacon batching, no user identifiers or IP labels, no sendBeacon
false-return retry logic (fire-and-forget only, per the literal-requirements
rule).

## Plan changelog

- **2026-08-22 — revision 2 (replan after `DIVERGENCE` in milestone 3, step 1).**
  What changed: milestone 3 gained a new **step 1 (refactor)** repairing a
  pre-existing baseline defect, and the former steps 1–3 were renumbered 2–4.
  Why: the milestone's gate (`npm run lint && npm run typecheck &&
  npm run build` all green) assumed a green baseline, but `npm run typecheck`
  was already failing on the clean pre-feature tree (verified via git stash)
  with 8 TS2339 errors in `src/lib/app-params.js` — a `Map` localStorage
  stand-in lacking `setItem`/`getItem`/`removeItem` on the
  `Storage | Map<any, any>` union (5 errors) and untyped `import.meta.env`
  because jsconfig sets `"types": []` (3 errors). Decision: fix the baseline
  rather than weaken the gate — both fixes are strictly type-only (a JSDoc
  `/** @type {Storage} */` cast on the storage fallback, whose Map arm is dead
  at runtime for those calls, plus `"types": ["vite/client"]` in
  `jsconfig.json`), so a genuinely green typecheck gate is cheap and the
  lint+typecheck+build gate stays intact for all milestone-3 code steps and
  beyond (also noted in Open decision #3 for milestone 4's `make test`).
  Step 2 (the beacon reporter, formerly step 1) is otherwise complete and
  sitting uncommitted in the working tree; its text was updated to record the
  actually installed `web-vitals` 6.1.1 and its full `navigationType` union
  (adding `soft-navigation`, covered by the existing drop rule), and the step
  now instructs the executor to validate the existing work against the
  repaired gate and commit it. Steps 3 (vite proxy) and 4 (manual end-to-end
  verification) are unchanged apart from renumbering. Codebase findings gained
  the baseline-defect entry and the corrected web-vitals version. Milestones
  4–5 are unchanged. Milestone 3's intent approval must be reset.
