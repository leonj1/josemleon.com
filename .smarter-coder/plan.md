# Evolutionary Design Plan: Local-only Web Vitals stack — metrics-free production image

## Feature summary

Make the self-hosted Web Vitals stack strictly a local-development concern: the
site's Docker image must start on Railway with **zero** metrics-related
environment variables (no `INGEST_PORT` guard, no `INGEST_HOST` DNS dependency,
no `/metrics` proxy in nginx), and the production frontend bundle must not
contain web-vitals/beacon code at all. Local `docker compose` behavior stays
byte-for-byte equivalent: nginx proxies `/metrics` to `metrics-ingest`, and the
SPA reports all five vitals. **Definition of done:** `docker run -p 8080:80
<site-image>` (no env vars) serves the SPA; the production `dist/` contains no
`web-vitals` code and issues no `/metrics` beacons; `make test`,
`make test-contract`, and the full local compose flow (beacon → ingest →
VictoriaMetrics) all pass unchanged; README's runtime section reflects the new
contract.

## Codebase findings & assumptions

- `Dockerfile:12` — long shell `CMD` that hard-fails on unset `INGEST_PORT`
  (`:?` guard) and defaults `INGEST_HOST=metrics-ingest`; template copied to
  `/etc/nginx/templates/default.conf.template` (`Dockerfile:10`), which is the
  nginx image's *magic* auto-envsubst directory. Today the `CMD`'s own
  `envsubst` overwrites whatever the entrypoint rendered, which is why it
  works; with two templates in that directory the entrypoint would render
  **both** into `conf.d/` and break nginx. Templates must move to a non-magic
  path (e.g. `/etc/nginx/site-templates/`).
- `nginx.conf.template:7-9` — single `location = /metrics { proxy_pass
  http://${INGEST_HOST}:${INGEST_PORT}/metrics; }` inside an otherwise plain
  SPA server block (12 lines total; duplicating it into two templates carries
  low drift risk).
- `src/main.jsx:6,12` — unconditional static import + call of
  `reportWebVitals()`; `src/lib/vitals-reporter.js` statically imports
  `web-vitals` (a `dependencies` entry, `package.json`) and beacons to
  `/metrics`. A statically-false `if (import.meta.env.VITE_ENABLE_METRICS ===
  '1')` wrapping a **dynamic** `import()` lets Rollup drop the entire chunk;
  avoid top-level `await` in `main.jsx` (use `.then()`), and avoid relying on
  tree-shaking of an unused static import.
- `docker-compose.yml:23-31` — `site` builds from root, sets
  `INGEST_PORT: "9091"`, publishes `8099:80`; `metrics-ingest` on
  `127.0.0.1:9091`; VictoriaMetrics on `8428`.
- `vite.config.js:19-25` — dev-server proxy `/metrics → 127.0.0.1:9091`;
  explicitly kept as-is.
- `Makefile` — `make test` = ingest build+unit tests, site lint+typecheck (no
  Docker); `make test-contract` = full-stack contract test. Nothing currently
  smoke-tests the site image itself; `scripts/` exists (`exercise-links.sh`) as
  a home for a new smoke script.
- `README.md:107-115` — "Supported runtime" section states standalone `docker
  run` is unsupported and documents `INGEST_PORT`/`INGEST_HOST` for Railway;
  must be rewritten.
- No `railway.json`/`railway.toml`; **assumption:** Railway builds the root
  Dockerfile with no build args (so an `ARG ENABLE_METRICS=0` default governs
  production builds) and injects `PORT` at runtime (script still defaults it to
  80 for bare `docker run`).
- **Assumption:** the nginx image `ENTRYPOINT` (`/docker-entrypoint.sh`) still
  runs its init scripts and then `exec "$@"`, so a `CMD
  ["/usr/local/bin/start-site.sh"]` script runs after entrypoint init; with
  `/etc/nginx/templates/` empty, the auto-envsubst step no-ops.

## Milestone list

### Milestone 1 — Plain-by-default site image (NEXT, fully elaborated)

**Goal:** the site image starts with zero env vars and serves the SPA; setting
`METRICS_PROXY=1` restores today's exact behavior; local compose is unchanged.
**Working state at end:** Railway-shaped `docker run` (only `PORT` set, or
nothing) boots cleanly with no `/metrics` proxy; `make start` still proxies
beacons to `metrics-ingest`; `make test` and `make test-contract` green.
Interim wart: the production bundle still beacons `/metrics` and receives 405s
(removed in Milestone 2).

**Steps:**

1. **(refactor)** Relocate the template out of the magic directory. `git mv
   nginx.conf.template nginx/metrics.conf.template`; in `Dockerfile` change
   line 10 to `COPY nginx/metrics.conf.template
   /etc/nginx/site-templates/metrics.conf.template` and update the `CMD`'s
   `envsubst` input path to match. No behavior change. *Green check:* `make
   test`; `docker compose build && docker compose up -d`, `curl -f
   http://localhost:8099/` returns the SPA, `curl -X POST
   http://localhost:8099/metrics -d '{}'` reaches ingest (non-404/405).
2. **(behavior)** Add the plain template and the config-rendering start script.
   - Create `nginx/default.conf.template`: copy of the server block with the
     `location = /metrics` stanza deleted (listen `${PORT}`, root, `try_files`
     fallback — nothing else).
   - Create `nginx/start-site.sh` (POSIX sh, `set -eu`): default
     `PORT="${PORT:-80}"`; if `METRICS_PROXY` is set to `1` → enforce `:
     "${INGEST_PORT:?INGEST_PORT is required when METRICS_PROXY=1}"`, default
     `INGEST_HOST="${INGEST_HOST:-metrics-ingest}"`, `envsubst '$PORT
     $INGEST_PORT $INGEST_HOST'` over `metrics.conf.template`; otherwise
     `envsubst '$PORT'` over `default.conf.template`; write to
     `/etc/nginx/conf.d/default.conf`; `exec nginx -g 'daemon off;'`.
   - `Dockerfile`: `COPY` both templates into `/etc/nginx/site-templates/` and
     the script to `/usr/local/bin/start-site.sh` (executable); replace the
     long shell `CMD` with `CMD ["/usr/local/bin/start-site.sh"]`.
   - *Test (part of this step):* create `scripts/verify-site-image.sh` — builds
     the image once, then asserts three cases: (a) `docker run` with **no** env
     vars → container stays up, `GET /` returns 200 with the SPA, and `POST
     /metrics` does **not** hit a proxy (405/404, not 502); (b) `docker run -e
     METRICS_PROXY=1` **without** `INGEST_PORT` → container exits non-zero and
     stderr contains `INGEST_PORT is required`; (c) `docker run -e
     METRICS_PROXY=1 -e INGEST_PORT=9091` → container stays up and the rendered
     `/etc/nginx/conf.d/default.conf` (via `docker exec cat`) contains
     `proxy_pass http://metrics-ingest:9091/metrics`. Script exits non-zero on
     any assertion failure and cleans up its containers. *Green check:* the
     script passes, plus `make test`.
3. **(behavior)** Turn the proxy on for local compose. In `docker-compose.yml`
   `site` service, add `METRICS_PROXY: "1"` alongside the existing
   `INGEST_PORT: "9091"`. *Test:* `make restart`, then `curl -X POST
   http://localhost:8099/metrics -d '<valid beacon JSON>'` and confirm the
   sample lands in VictoriaMetrics (`curl
   'http://127.0.0.1:8428/api/v1/query?query=web_vitals_lcp_ms&latency_offset=1s'`),
   or simply run `make test-contract` end-to-end. *Green check:* contract test
   passes.
4. **(refactor)** Wire the smoke script into the dev loop: add `test-image:`
   target to `Makefile` (`./scripts/verify-site-image.sh`), add it to
   `.PHONY`. *Green check:* `make test-image` passes; `make test` unaffected.

**Validation for the milestone:** `make test`, `make test-image`,
`make test-contract` all green; `docker run --rm -e PORT=8080 -p 8080:8080
<image>` (Railway simulation) serves the site with no other env vars.

### Milestone 2 — Metrics-free production bundle

**Goal:** gate the vitals reporter at build time so `web-vitals` and the beacon
code are absent from the production bundle unless `ENABLE_METRICS=1` is passed
as a Docker build arg (compose passes it; Railway doesn't).
**Working state at end:** Railway-built `dist/` contains no `web-vitals` code
and issues no `/metrics` requests (interim 405 noise from Milestone 1 gone);
compose-built site still reports all five vitals; `npm run dev` reporting
behavior decided and implemented (see open decisions).
**Risks:** Vite may not eliminate the dynamic-import chunk if the condition
isn't statically analyzable (mitigate: compare `import.meta.env.VITE_ENABLE_METRICS
=== '1'` directly — a form Vite's define-replacement folds — and assert bundle
contents in the smoke script); lint/typecheck friction with dynamic import in
`main.jsx`.
**Dependencies:** Milestone 1 (compose already carries per-service metrics
wiring; smoke script exists to extend).

### Milestone 3 — Documentation & final verification

**Goal:** rewrite `README.md`'s "Supported runtime" section (and the
"Performance metrics" intro's "In production…" phrasing at `README.md:44-45`)
to state the new contract — metrics stack is local-compose-only; the site image
runs standalone with zero env vars; `METRICS_PROXY`/`INGEST_PORT`/
`INGEST_HOST`/`ENABLE_METRICS` documented as local-compose knobs only — then
run the full verification sweep.
**Working state at end:** docs match reality; `make test`, `make test-image`,
`make test-contract`, and a Railway-simulation `docker run` all pass; feature
complete.
**Risks:** stale references to `INGEST_PORT`/Railway internal domains elsewhere
(mitigate: repo-wide grep for `INGEST_`, `metrics-ingest.railway`,
`railway.internal` before closing).
**Dependencies:** Milestones 1–2.

## Stubs & flags ledger

| Item | Kind | Introduced | Removed / resolved |
|---|---|---|---|
| Interim prod behavior: bundle still beacons `/metrics`, nginx answers 405 | temporary wart | M1 step 2 | M2 (bundle gating removes the beacon) |
| `METRICS_PROXY` runtime env var | **permanent** feature flag (local compose only) | M1 step 2 | never — documented in M3 |
| `ENABLE_METRICS` build arg → `VITE_ENABLE_METRICS` | **permanent** build flag (default 0) | M2 | never — documented in M3 |
| README `README.md:107-115` describing `INGEST_PORT` as required | stale doc | pre-existing | M3 rewrite |

## Open decisions

- **Dev-server reporting** (decide at M2 — **DECIDED at M2: keep on via
  `import.meta.env.DEV || import.meta.env.VITE_ENABLE_METRICS === '1'` in
  src/main.jsx**): should `npm run dev` keep beaconing
  vitals through the existing Vite proxy? Recommended: yes — gate on
  `import.meta.env.DEV || import.meta.env.VITE_ENABLE_METRICS === '1'` so
  current dev behavior is preserved with zero config (`DEV` is statically
  `false` in production builds, so tree-shaking is unaffected). Alternative:
  require `VITE_ENABLE_METRICS=1` in `.env.local`, making dev opt-in.
- **Flag value convention** (decide at M2 — **DECIDED at M2: `'1'`**): `'1'`
  vs `'true'` for both flags;
  recommended `'1'` to match the current compose style (`INGEST_PORT: "9091"`
  string-number idiom).
- **Railway config file** (decide at M3, likely "no"): whether to add a
  `railway.json` pinning the Dockerfile build — current default behavior
  already suffices.

## Out of scope

- Any change to `metrics-ingest/` (service code, its Dockerfile, unit/contract
  tests) or the VictoriaMetrics service/retention settings.
- `vite.config.js` — the dev `/metrics` proxy and all other settings stay
  as-is.
- Deploying the metrics stack anywhere other than local docker compose; auth
  for VictoriaMetrics; TLS.
- Frontend behavior changes beyond the reporter gate (no changes to what
  metrics are collected or their payload shape).

## Plan changelog

- **Rev 1 → 2 (M1 execution):** ExecutePlan's completion phase ran security/performance
  specialist reviews that went out of scope — they generated findings against
  `metrics-ingest/` (explicitly out of scope) and codex started implementing
  them (unbounded body size, VM write queues, deadlines), stalling the run.
  The orchestrator reverted all `metrics-ingest/` changes, deleted the transient
  FIXES.md/NOTES.md artifacts, and completed step 4 (Makefile `test-image`
  target) directly. The docs update landed M3's README rewrite early; content
  verified accurate and kept. M1's verify gate then flagged the branch as
  unshippable (milestone files untracked); committed as d2bbf9d (CHORE) and
  6dd956e (FEAT), re-verified PASS. The security/perf findings themselves are
  recorded for the user but deliberately not implemented (out of scope).
- **Rev 2 → 3 (M2 execution):** Milestone 2 was implemented directly by the
  orchestrator rather than via ExecutePlan — the tool's completion phase had
  demonstrated out-of-scope review-driven changes and a stall in M1, so the
  four M2 steps were executed by hand with the same gates (intent check,
  verify). M2 verified by the gate as content-sound (replan only for
  uncommitted files, same as M1); committed and re-verified PASS.
