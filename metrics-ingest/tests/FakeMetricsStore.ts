import type { MetricsStore, StoreError } from "../src/clients/MetricsStore.js";
import type { ImportLine } from "../src/models/ImportLine.js";
import { type Result, ok, err } from "../src/models/Result.js";

export class FakeMetricsStore implements MetricsStore {
  private readonly writes: ImportLine[][] = [];
  private failure: Result<void, StoreError> = ok(undefined);

  failWith(error: StoreError): FakeMetricsStore {
    this.failure = err(error);
    return this;
  }

  writtenLines(): readonly (readonly ImportLine[])[] {
    return this.writes;
  }

  writeCallCount(): number {
    return this.writes.length;
  }

  async write(lines: ImportLine[]): Promise<Result<void, StoreError>> {
    this.writes.push([...lines]);
    return this.failure;
  }
}
