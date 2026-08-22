// This site is statically hosted with no base44 backend (appId is null), so the
// SDK's analytics batches (POST /api/apps/null/analytics/track/batch) can only
// ever 405 against nginx. createClient exposes no option to turn analytics off;
// the module reads its config from window.base44SharedInstances at import time,
// so this must be imported before anything that imports @base44/sdk.
if (typeof window !== 'undefined') {
	window.base44SharedInstances = window.base44SharedInstances || {};
	window.base44SharedInstances.analytics = window.base44SharedInstances.analytics || {
		instance: { config: { enabled: false } },
	};
}
