import { createServer } from "node:http";
import { StubMetricsStore } from "./clients/StubMetricsStore.js";
import { type ConfigError, ingestConfigFromEnv } from "./models/IngestConfig.js";
import { IngestRoute } from "./routes/IngestRoute.js";
import { MetricsService } from "./services/MetricsService.js";

function configErrorMessage(error: ConfigError): string {
  switch (error.kind) {
    case "missing-env-var":
      return `Missing required environment variable: ${error.name}`;
    case "invalid-url":
      return `Invalid URL in environment variable ${error.name}: ${error.received}`;
    case "invalid-port":
      return `Invalid port in environment variable ${error.name}: ${error.received}`;
  }
}

function main(): void {
  const config = ingestConfigFromEnv(process.env);
  if (!config.ok) {
    process.stderr.write(`${configErrorMessage(config.error)}\n`);
    process.exit(1);
  }
  const route = new IngestRoute(new MetricsService(new StubMetricsStore()));
  const server = createServer(route.listener());
  server.listen(config.value.port, () => {
    process.stdout.write(`metrics-ingest listening on port ${config.value.port}\n`);
  });
}

main();
