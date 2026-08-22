import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals';

const METRICS_ENDPOINT = '/metrics';
const ALLOWED_NAV_TYPES = ['navigate', 'reload', 'back-forward', 'prerender'];

function normalizeNavType(navigationType) {
  const dashed = String(navigationType ?? '').replace(/_/g, '-');
  return dashed === 'back-forward-cache' ? 'back-forward' : dashed;
}

function deliverBeacon(body) {
  if (navigator.sendBeacon) {
    navigator.sendBeacon(METRICS_ENDPOINT, body);
    return;
  }
  fetch(METRICS_ENDPOINT, { method: 'POST', body, keepalive: true }).catch(() => {});
}

function sendMetric(metric) {
  const navType = normalizeNavType(metric.navigationType);
  if (!ALLOWED_NAV_TYPES.includes(navType)) {
    return;
  }
  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    path: window.location.pathname,
    navType,
  });
  deliverBeacon(body);
}

export function reportWebVitals() {
  onLCP(sendMetric);
  onINP(sendMetric);
  onCLS(sendMetric);
  onTTFB(sendMetric);
  onFCP(sendMetric);
}
