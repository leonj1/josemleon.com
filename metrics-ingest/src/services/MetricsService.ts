import type { MetricsStore, StoreError } from "../clients/MetricsStore.js";
import type { ImportLine } from "../models/ImportLine.js";
import { type Result, ok, err } from "../models/Result.js";
import {
  type BeaconError,
  type MetricName,
  type WebVitalBeacon,
  webVitalBeaconFromJson,
} from "../models/WebVitalBeacon.js";

export type { ImportLine } from "../models/ImportLine.js";

export type RecordError =
  | { readonly kind: "validation"; readonly error: BeaconError }
  | { readonly kind: "store"; readonly error: StoreError };

const METRIC_LINE_NAMES: Readonly<Record<MetricName, string>> = {
  LCP: "web_vitals_lcp_ms",
  INP: "web_vitals_inp_ms",
  CLS: "web_vitals_cls",
  TTFB: "web_vitals_ttfb_ms",
  FCP: "web_vitals_fcp_ms",
};

export class MetricsService {
  constructor(private readonly store: MetricsStore) {}

  async record(body: string): Promise<Result<void, RecordError>> {
    const beacon = webVitalBeaconFromJson(body);
    if (!beacon.ok) return err({ kind: "validation", error: beacon.error });
    const written = await this.store.write([this.importLine(beacon.value)]);
    if (!written.ok) return err({ kind: "store", error: written.error });
    return ok(undefined);
  }

  importLine(beacon: WebVitalBeacon): ImportLine {
    const name = METRIC_LINE_NAMES[beacon.name];
    const labels = [
      `path="${escapeLabelValue(beacon.path)}"`,
      `rating="${escapeLabelValue(beacon.rating)}"`,
      `nav_type="${escapeLabelValue(beacon.navType)}"`,
    ].join(",");
    return `${name}{${labels}} ${beacon.value}` as ImportLine;
  }
}

function escapeLabelValue(value: string): string {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll('"', '\\"')
    .replaceAll("\n", "\\n");
}
