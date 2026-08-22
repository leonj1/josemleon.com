import type { MetricName, WebVitalBeacon } from "../models/WebVitalBeacon.js";

export type ImportLine = string & { readonly __brand: "ImportLine" };

const METRIC_LINE_NAMES: Readonly<Record<MetricName, string>> = {
  LCP: "web_vitals_lcp_ms",
  INP: "web_vitals_inp_ms",
  CLS: "web_vitals_cls",
  TTFB: "web_vitals_ttfb_ms",
  FCP: "web_vitals_fcp_ms",
};

export class MetricsService {
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
