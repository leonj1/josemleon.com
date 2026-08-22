# metrics-ingest

HTTP service that accepts web-vitals beacons on `POST /metrics` and writes them
to VictoriaMetrics via its Prometheus import endpoint.

## Unit tests

No docker required:

```sh
npm test
```

## Contract test (real VictoriaMetrics)

The contract test in `tests/contract/` exercises the full path
(ingest service -> VictoriaMetrics query API) against the docker compose stack
defined at the repo root. It is deliberately outside the `npm test` glob.

```sh
npm run compose:up && npm run test:contract
npm run compose:down
```

`compose:up` builds and starts VictoriaMetrics on `127.0.0.1:8428` and this
service on `127.0.0.1:9091`. The test waits up to ~30s for both health
endpoints before failing with a hint to run `npm run compose:up`.
