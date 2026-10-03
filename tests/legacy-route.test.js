import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LegacyRoute, legacyPageIds } from '../src/lib/legacy-route.js';
import { FakeHistory } from './fake-history.js';

const route = new LegacyRoute(legacyPageIds);

test('rewrites a legacy blog post path to its explorer page hash', () => {
  const history = new FakeHistory();
  route.rewrite({ pathname: '/Blog/git-ten-commandments' }, history);
  assert.deepEqual(history.replacements, [{ state: null, unused: '', url: '/#git' }]);
});

test('matches legacy paths case-insensitively and ignores trailing slashes', () => {
  const history = new FakeHistory();
  route.rewrite({ pathname: '/Projects/api-generator/' }, history);
  assert.deepEqual(history.replacements, [{ state: null, unused: '', url: '/#api-generator' }]);
});

test('maps every legacy index and post to an explorer page', () => {
  assert.deepEqual(
    ['/Blog', '/Blog/travel', '/projects', '/Blog/let-the-event-pick-the-destination', '/Blog/the-iterative-mindset', '/Blog/leading-engineering-teams-at-scale'].map((p) => route.pageFor(p)),
    ['writing', 'writing', 'workshop', 'travel', 'iteration', 'teams'],
  );
});

test('leaves the root and unknown paths untouched', () => {
  const history = new FakeHistory();
  route.rewrite({ pathname: '/' }, history);
  route.rewrite({ pathname: '/Blog/no-such-post' }, history);
  assert.deepEqual(history.replacements, []);
});

test('every mapped page id exists in the explorer site map', async () => {
  const { readFile } = await import('node:fs/promises');
  const source = await readFile(new URL('../src/lib/explorer.js', import.meta.url), 'utf8');
  const ids = new Set([...source.matchAll(/\{id:'([^']+)'/g)].map((m) => m[1]));
  for (const page of Object.values(legacyPageIds)) assert.ok(ids.has(page), `missing page ${page}`);
});
