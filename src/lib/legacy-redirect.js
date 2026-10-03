import { LegacyRoute, legacyPageIds } from './legacy-route.js';

new LegacyRoute(legacyPageIds).rewrite(window.location, window.history);
