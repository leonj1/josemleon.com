# josemleon.com

**Jose Explorer** — a personal site styled after Sysinternals Process Explorer.
The site map table is the navigation; the lower pane reads the selected page.
Pages are addressed by hash (`/#git`, `/#api-generator`, …). Paths from the
previous site (`/Blog/<slug>`, `/projects/<slug>`) are rewritten to their hash
page on load (`src/lib/legacy-route.js`).

| Path | Purpose |
|------|---------|
| `index.html` | App shell markup |
| `src/style.css` | Styles |
| `src/lib/explorer.js` | Page content and UI behaviour (vendored from the reimagined site) |
| `src/main.js` | Vite entry: legacy redirect, styles, explorer, optional Web Vitals |
| `tests/` | `node --test` unit tests and Fakes |

Local dev: `npm install && npm run dev`. Checks: `npm run lint && npm run typecheck && npm test`.

## Performance metrics (self-hosted Web Vitals)

The SPA reports Core Web Vitals from real visitors, sending one beacon per
metric to `POST /metrics`. In the local docker compose stack, nginx proxies
that endpoint to the `metrics-ingest` service, which converts each beacon into
a Prometheus exposition line and writes it to VictoriaMetrics. Everything is
self-hosted under docker compose — no third-party calls. For the ingest
service's own unit-test and contract-test workflow, see
[metrics-ingest/README.md](metrics-ingest/README.md).

### Running the stack — Make targets

| Target | What it does |
|--------|--------------|
| `make build` | `docker compose build` |
| `make start` | `docker compose up -d` — site on `http://localhost:8099`, metrics-ingest on `127.0.0.1:9091` (localhost-only), VictoriaMetrics on port `8428` (LAN-accessible; the query API has no auth, so never forward 8428 beyond the local network) |
| `make stop` | `docker compose down` — it never passes `-v`, so metrics data is kept |
| `make restart` | stop then start — data survives (see retention below) |
| `make test` | ingest build + unit tests plus site lint + typecheck; no docker needed |
| `make test-contract` | brings the compose stack up, runs the contract test against the real VictoriaMetrics, tears the stack down — **on failure the stack is deliberately left running for debugging; tear it down with `make stop`** |

### Metrics captured

| Series | Metric |
|--------|--------|
| `web_vitals_lcp_ms` | Largest Contentful Paint |
| `web_vitals_inp_ms` | Interaction to Next Paint |
| `web_vitals_cls` | Cumulative Layout Shift |
| `web_vitals_ttfb_ms` | Time to First Byte |
| `web_vitals_fcp_ms` | First Contentful Paint |

Every series carries the labels `path` (page pathname), `rating` (`good` /
`needs-improvement` / `poor`), and `nav_type` (`navigate` / `reload` /
`back-forward` / `prerender`). Note: INP only appears after real user
interaction.

### Viewing in vmui

With the stack up, open `http://localhost:8428/vmui` (or `http://<server-lan-ip>:8428/vmui`
from another machine on the network) and query any series.
Example PromQL — p75 LCP per page over the last 7 days:

```
quantile_over_time(0.75, web_vitals_lcp_ms[7d])
```

(Results are one value per label set, i.e. per `path`/`rating`/`nav_type`
combination — effectively per path.)

### Querying over HTTP

```sh
curl 'http://127.0.0.1:8428/api/v1/query?query=web_vitals_lcp_ms&latency_offset=1s'
```

VictoriaMetrics' default `-search.latencyOffset` is 30s, so instant queries
silently omit samples younger than 30 seconds unless `latency_offset=1s` is
appended (or you wait 30s).

### Retention and storage

VictoriaMetrics runs with `-retentionPeriod=12` (12 months). Data lives in the
named docker volume `vm-data` (mounted at `/victoria-metrics-data`), so it
survives `make restart` and `make stop`/`make start`. `make stop` never passes
`-v` — deleting data requires explicitly removing the `vm-data` volume.

### Supported runtime

The site image runs standalone with no environment variables; `PORT` defaults
to `80`:

```sh
docker build -t site .
docker run --rm -p 8080:80 site
```

The `/metrics` proxy is disabled by default. Set `METRICS_PROXY=1` to enable
it. When enabled, `INGEST_PORT` is required and `INGEST_HOST` defaults to
`metrics-ingest`; the container must be attached to a network where that host
resolves:

```sh
docker run --rm -p 8080:80 \
  -e METRICS_PROXY=1 \
  -e INGEST_PORT=9091 \
  -e INGEST_HOST=metrics-ingest \
  site
```

The local compose `site` service sets `METRICS_PROXY=1` and
`INGEST_PORT=9091`, preserving the `/metrics` connection to the
`metrics-ingest` service. Use the Make targets above for the supported local
metrics stack.

Metrics are a local-compose-only concern: the production frontend bundle
contains no web-vitals/beacon code unless the image is built with the
`ENABLE_METRICS=1` build arg (compose passes it; `docker build` defaults it
to `0`, so a plain build ships a metrics-free bundle).

```sh
docker build --build-arg ENABLE_METRICS=1 -t site-with-metrics .
```

In `npm run dev`, the vitals reporter stays on through the existing Vite
`/metrics` proxy regardless of the flag.
