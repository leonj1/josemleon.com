import type { ImportLine } from "../models/ImportLine.js";
import { err, ok, type Result } from "../models/Result.js";
import type { MetricsStore, StoreError } from "./MetricsStore.js";

export class VictoriaMetricsStore implements MetricsStore {
  private readonly importUrl: URL;

  constructor(importUrl: URL) {
    this.importUrl = importUrl;
  }

  async write(lines: ImportLine[]): Promise<Result<void, StoreError>> {
    const body = `${lines.join("\n")}\n`;
    let response: Response;
    try {
      response = await fetch(this.importUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body,
      });
    } catch (cause) {
      return err({ kind: "write-failed", message: this.describe(cause) });
    }
    if (!response.ok) {
      return err({
        kind: "write-failed",
        message: `victoria-metrics responded with status ${response.status}`,
      });
    }
    return ok(undefined);
  }

  private describe(cause: unknown): string {
    const message = cause instanceof Error ? cause.message : String(cause);
    return `victoria-metrics request failed: ${message}`;
  }
}
