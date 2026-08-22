import { type Result, ok, err } from "./Result.js";

const METRIC_NAMES = ["LCP", "INP", "CLS", "TTFB", "FCP"] as const;
export type MetricName = (typeof METRIC_NAMES)[number];

const RATINGS = ["good", "needs-improvement", "poor"] as const;
export type Rating = (typeof RATINGS)[number];

const NAV_TYPES = ["navigate", "reload", "back-forward", "prerender"] as const;
export type NavType = (typeof NAV_TYPES)[number];

export type PagePath = string & { readonly __brand: "PagePath" };
export type MetricValue = number & { readonly __brand: "MetricValue" };

export type WebVitalBeacon = {
  readonly name: MetricName;
  readonly value: MetricValue;
  readonly rating: Rating;
  readonly path: PagePath;
  readonly navType: NavType;
};

const FIELDS = ["name", "value", "rating", "path", "navType"] as const;
export type BeaconFieldName = (typeof FIELDS)[number];

export type BeaconError =
  | { readonly kind: "malformed-json" }
  | { readonly kind: "missing-field"; readonly field: BeaconFieldName }
  | { readonly kind: "unknown-metric-name"; readonly received: unknown }
  | { readonly kind: "invalid-value"; readonly received: unknown }
  | { readonly kind: "invalid-rating"; readonly received: unknown }
  | { readonly kind: "invalid-nav-type"; readonly received: unknown };

export function webVitalBeaconFromJson(
  body: string
): Result<WebVitalBeacon, BeaconError> {
  const parsed = parseBody(body);
  if (!parsed.ok) return parsed;
  const complete = requiredFields(parsed.value);
  if (!complete.ok) return complete;
  return validatedBeacon(complete.value);
}

function parseBody(body: string): Result<Record<string, unknown>, BeaconError> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return err({ kind: "malformed-json" });
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return err({ kind: "malformed-json" });
  }
  return ok(parsed as Record<string, unknown>);
}

function requiredFields(
  record: Record<string, unknown>
): Result<Record<string, unknown>, BeaconError> {
  for (const field of FIELDS) {
    if (record[field] === undefined) return err({ kind: "missing-field", field });
  }
  return ok(record);
}

function validatedBeacon(
  record: Record<string, unknown>
): Result<WebVitalBeacon, BeaconError> {
  const { name, value, rating, path, navType } = record;
  if (!isMetricName(name)) return err({ kind: "unknown-metric-name", received: name });
  if (!isFiniteNumber(value)) return err({ kind: "invalid-value", received: value });
  if (!isRating(rating)) return err({ kind: "invalid-rating", received: rating });
  if (typeof path !== "string") return err({ kind: "missing-field", field: "path" });
  if (!isNavType(navType)) return err({ kind: "invalid-nav-type", received: navType });
  return ok({
    name,
    value: value as MetricValue,
    rating,
    path: path as PagePath,
    navType,
  });
}

function isMetricName(value: unknown): value is MetricName {
  return (
    typeof value === "string" && (METRIC_NAMES as readonly string[]).includes(value)
  );
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isRating(value: unknown): value is Rating {
  return typeof value === "string" && (RATINGS as readonly string[]).includes(value);
}

function isNavType(value: unknown): value is NavType {
  return (
    typeof value === "string" && (NAV_TYPES as readonly string[]).includes(value)
  );
}
