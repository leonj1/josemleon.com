**Welcome to your Base44 project** 

**About**

View and Edit  your app on [Base44.com](http://Base44.com) 

This project contains everything you need to run your app locally.

**Edit the code in your local development environment**

Any change pushed to the repo will also be reflected in the Base44 Builder.

**Prerequisites:** 

1. Clone the repository using the project's Git URL 
2. Navigate to the project directory
3. Install dependencies: `npm install`
4. Create an `.env.local` file and set the right environment variables

```
VITE_BASE44_APP_ID=your_app_id
VITE_BASE44_APP_BASE_URL=your_backend_url

e.g.
VITE_BASE44_APP_ID=cbef744a8545c389ef439ea6
VITE_BASE44_APP_BASE_URL=https://my-to-do-list-81bfaad7.base44.app
```

Run the app: `npm run dev`

**Publish your changes**

Open [Base44.com](http://Base44.com) and click on Publish.

**Docs & Support**

Documentation: [https://docs.base44.com/Integrations/Using-GitHub](https://docs.base44.com/Integrations/Using-GitHub)

Support: [https://app.base44.com/support](https://app.base44.com/support)

## Performance metrics (self-hosted Web Vitals)

The SPA reports Core Web Vitals from real visitors, sending one beacon per
metric to `POST /metrics`. In production, nginx proxies that endpoint to the
`metrics-ingest` service, which converts each beacon into a Prometheus
exposition line and writes it to VictoriaMetrics. Everything is self-hosted
under docker compose — no third-party calls. For the ingest service's own
unit-test and contract-test workflow, see
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

Docker compose via the Makefile is the only supported way to run the site
image. Standalone `docker run` of the site image is not supported: the image
requires `INGEST_PORT` (it exits with a clear error when unset) and a network
where the hostname `metrics-ingest` resolves. `docker build` on its own still
works.
