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
  `server.proxy` yet — milestone 3 adds one for `/metrics`.
- `Dockerfile` (repo root): multi-stage node:22-alpine build → nginx:1.27-alpine,
  envsubst of `nginx.conf.template` with `$PORT` only. The template's envsubst
  variable list must gain `$INGEST_PORT` when the `/metrics` proxy location is
  added (milestone 4). nginx serves the SPA with `try_files ... /index.html`.
- `Makefile`: plain `docker build`/`docker run` targets `build/start/stop/restart`
  on port 8099; no `test` target and no docker-compose yet (milestone 4 repoints
  it and adds `test`).
- Site `package.json` scripts: `build` = `vite build`, `lint` = `eslint . --quiet`,
  `typecheck` = `tsc -p ./jsconfig.json`. **No test framework exists in the repo**
  (no vitest/jest), so the ingest service should not inherit one.
- No `docs/` folder, no PROJECT.md, no docker-compose.yml. `PLAN.md` at root is
  the feature spec, not project context.
- No `metrics-ingest/` directory exists yet; it is green-field.

Build/test commands the executor should run:

- **Ingest service** (from `/home/jose/src/josemleon.com/metrics-ingest`):
  - Build: `npm run build` (script: `tsc`)
  - Test: `npm test` (script: `node --import tsx --test "tests/*.test.ts"`)
  - Test runner decision: **Node 22 built-in `node:test` + `tsx` loader**,
    devDependencies only `typescript`, `tsx`, `@types/node`. Chosen because the
    repo has no existing test framework, this keeps dependencies minimal, and
    `node:test` assertions (`node:assert/strict`) suffice for exact-payload
    assertions. No mocking frameworks — hand-written Fakes under
    `metrics-ingest/tests/` only.
  - Docker: `docker build -t metrics-ingest ./metrics-ingest` (from repo root).
- **Site** (from `/home/jose/src/josemleon.com`):
  - `npm run lint`, `npm run typecheck`, `npm run build`. No site unit tests.
- **Whole system** (from milestone 4 onward): `make build`, `make test`,
  `make start`, `make stop`, `make restart` at repo root.

Assumptions:

- Node 22 and Docker are available on the dev host (Dockerfile already targets
  node:22-alpine; PLAN.md specifies Node 22).
- No spike milestone is needed: every technology involved (node:http,
  VictoriaMetrics import API, web-vitals, nginx proxy, compose) has
  well-understood behavior; the dominant risk is boundary correctness (exact
  exposition lines, real VM acceptance), which milestones 1–2 retire directly.
- The conventions in the user's global CLAUDE.md apply in full to
  `metrics-ingest`: I/O interface pattern, constructor injection, Result types
  (no exceptions for expected outcomes), typed objects over primitives, no
  static classes, routes call services only, functions < 30 lines, required env
  config with no defaults, Fakes only under `tests/`.
- Commit prefixes: `FEAT:` for behavior steps, `CHORE:` for scaffolding/refactor
  steps that change no behavior.
- Milestone 1 wires `main.ts` to a temporary `StubMetricsStore` (accepts writes,
  returns ok, stores nothing) because `VictoriaMetricsStore` is deliberately
  milestone 2 per PLAN.md. VictoriaMetrics is an external dependency, so
  stubbing it in the walking skeleton is allowed (core rule 2); the stub is
  tracked in the ledger with its removal step. Config (`VM_IMPORT_URL`, `PORT`)
  is still required at startup in milestone 1 so the config contract never
  changes later.

## Milestone list

### Milestone 1 — Ingest walking skeleton (NEXT — fully elaborated)

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

**Steps** (execute in order; each leaves the ingest project compiling and all
its tests green; run `npm run build && npm test` in
`/home/jose/src/josemleon.com/metrics-ingest` at the end of every step):

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

### Milestone 2 — VictoriaMetrics integration

- **Goal:** Replace the stub with a real `VictoriaMetricsStore` and prove the
  real boundary with a contract test against a VictoriaMetrics container.
- **Working state at the end:** `docker compose up` (compose file with
  `metrics-ingest` + `victoriametrics`, named volume, `127.0.0.1:8428:8428`,
  `-retentionPeriod=12`) lets a curl'd beacon to the ingest service appear in
  `GET /api/v1/query?query=web_vitals_lcp_ms` with correct labels; the contract
  test automates exactly that; `StubMetricsStore` is deleted; unit tests still
  green and still Fake-based.
- **Risks retired:** the VictoriaMetrics import API accepts our exact exposition
  lines; compose networking, volume persistence, and 502-on-store-failure
  behavior against a real down/up VM.
- **Dependencies:** milestone 1 (MetricsStore interface, Dockerfile, exact line
  format).

### Milestone 3 — Frontend beacon

- **Goal:** The SPA reports real Web Vitals through the full dev path.
- **Working state at the end:** `web-vitals` dependency added;
  `src/lib/vitals-reporter.js` sends one beacon per metric via
  `navigator.sendBeacon` (fetch keepalive fallback), wired once in
  `src/main.jsx`; `vite.config.js` `server.proxy` forwards `/metrics` to the
  running ingest service; browsing the dev site makes samples appear in vmui;
  `npm run lint`, `npm run typecheck`, `npm run build` green.
- **Risks retired:** web-vitals callback payloads map cleanly onto the beacon
  contract; sendBeacon + proxy path works end to end from a real browser.
- **Dependencies:** milestone 2 (a real store to land samples in for manual
  verification).

### Milestone 4 — Production wiring

- **Goal:** One-command production topology: site + ingest + VM under compose,
  driven by the Makefile.
- **Working state at the end:** root `docker-compose.yml` with `site`,
  `metrics-ingest`, `victoriametrics`; `nginx.conf.template` gains
  `location = /metrics { proxy_pass http://metrics-ingest:$INGEST_PORT/metrics; }`
  and the Dockerfile envsubst list gains `$INGEST_PORT`; Makefile
  `build/start/stop/restart` repointed at compose and `make test` runs ingest
  unit tests + site lint/typecheck; `make start`, browse
  `http://localhost:8099`, samples visible in vmui and via
  `curl 'http://localhost:8428/api/v1/query?query=web_vitals_lcp_ms'`; data
  survives `make restart`.
- **Risks retired:** nginx proxy templating with two envsubst vars; compose
  replaces docker-run without breaking the existing site workflow; persistence
  across restart.
- **Dependencies:** milestones 2 and 3.

### Milestone 5 — Docs

- **Goal:** Operator documentation in README.
- **Working state at the end:** README section covering vmui access, example
  PromQL (p75 LCP per path via
  `quantile_over_time(0.75, web_vitals_lcp_ms[7d])`), example query-API curl,
  retention/volume notes; no code changes; all Make targets still green.
- **Risks retired:** none (knowledge capture).
- **Dependencies:** milestone 4.

## Stubs & flags ledger

| Item | Introduced | Removed |
|------|------------|---------|
| `metrics-ingest/src/clients/StubMetricsStore.ts` (production stub for the external VictoriaMetrics boundary; accepts writes, returns ok) | Milestone 1, step 7 | Milestone 2 — the step that lands `VictoriaMetricsStore` swaps it in `main.ts` and deletes the stub file |

No feature flags planned: the beacon endpoint is inert until the frontend sends
to it, so each milestone is safely shippable without dark-launch flags.

## Open decisions

1. **Contract-test invocation mechanism** — how the milestone 2 contract test
   obtains a real VictoriaMetrics (compose up in a Make/npm target vs. spawning
   the container from the test). Decide when elaborating milestone 2.
2. **Vite dev proxy target** — hardcoded `http://localhost:<port>` vs. env-driven
   target for the `/metrics` proxy. Decide when elaborating milestone 3.
3. **`make test` composition details** — whether it includes `npm run typecheck`
   alongside lint, and whether contract tests run under `make test` or a
   separate target. Decide when elaborating milestone 4 (contract-test half may
   be settled at milestone 2).
4. **INGEST_PORT value and env plumbing** through compose/site container. Decide
   when elaborating milestone 4.

## Out of scope

Per PLAN.md: Grafana; alerting, downsampling, auth on the query API
(localhost-only exposure); custom User Timing spans. Additionally: no site-side
unit-test framework is introduced (the SPA has none today; reporter verification
is manual per PLAN.md milestone 3), no retry queue or buffering in the ingest
service, no user identifiers or IP labels.

## Plan changelog

(empty)
