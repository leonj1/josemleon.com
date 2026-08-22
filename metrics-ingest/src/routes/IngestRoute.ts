import type {
  IncomingMessage,
  RequestListener,
  ServerResponse,
} from "node:http";
import type { MetricsService, RecordError } from "../services/MetricsService.js";

export class IngestRoute {
  constructor(private readonly service: MetricsService) {}

  listener(): RequestListener {
    return (request, response) => {
      void this.route(request, response);
    };
  }

  private async route(
    request: IncomingMessage,
    response: ServerResponse
  ): Promise<void> {
    if (request.method === "POST" && request.url === "/metrics") {
      return this.ingest(request, response);
    }
    if (request.method === "GET" && request.url === "/healthz") {
      response.statusCode = 200;
      response.end();
      return;
    }
    response.statusCode = 404;
    response.end();
  }

  private async ingest(
    request: IncomingMessage,
    response: ServerResponse
  ): Promise<void> {
    const body = await this.body(request);
    const recorded = await this.service.record(body);
    if (recorded.ok) {
      response.statusCode = 204;
      response.end();
      return;
    }
    this.respondWithError(response, recorded.error);
  }

  private respondWithError(response: ServerResponse, error: RecordError): void {
    response.statusCode = error.kind === "validation" ? 400 : 502;
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify({ error }));
  }

  private body(request: IncomingMessage): Promise<string> {
    return new Promise((resolve) => {
      const chunks: Buffer[] = [];
      request.on("data", (chunk: Buffer) => chunks.push(chunk));
      request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    });
  }
}
