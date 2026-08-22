import type { ImportLine } from "../models/ImportLine.js";
import { type Result, ok } from "../models/Result.js";
import type { MetricsStore, StoreError } from "./MetricsStore.js";

/**
 * Temporary stand-in for the real store: accepts every write and stores
 * nothing. Tracked in the plan's stubs ledger; removed in milestone 2 when
 * VictoriaMetricsStore lands.
 */
export class StubMetricsStore implements MetricsStore {
  async write(_lines: ImportLine[]): Promise<Result<void, StoreError>> {
    return ok(undefined);
  }
}
