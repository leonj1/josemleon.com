// Must run before the explorer reads location.hash on load.
import './lib/legacy-redirect.js';
import './style.css';
import './lib/explorer.js';

// Vitals reporting is a local-development concern: enabled in `npm run dev`
// (DEV) or when the Docker build passes ENABLE_METRICS=1 (compose). The
// condition is statically false in default production builds, so the dynamic
// import is tree-shaken out of the bundle entirely.
if (import.meta.env.DEV || import.meta.env.VITE_ENABLE_METRICS === '1') {
  import('./lib/vitals-reporter.js').then((m) => m.reportWebVitals());
}
