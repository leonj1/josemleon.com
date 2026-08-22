import type { ImportLine } from "../models/ImportLine.js";
import type { Result } from "../models/Result.js";

export type StoreError = {
  readonly kind: "write-failed";
  readonly message: string;
};

export interface MetricsStore {
  write(lines: ImportLine[]): Promise<Result<void, StoreError>>;
}
