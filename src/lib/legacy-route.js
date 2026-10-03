// Maps URLs from the previous React site (e.g. /Blog/git-ten-commandments)
// onto the hash-addressed pages of the explorer, so old links and bookmarks
// keep landing on the right page.
export class LegacyRoute {
  /** @param {Readonly<Record<string, string>>} pageIds legacy path → page id */
  constructor(pageIds) {
    this.pageIds = pageIds;
  }

  /**
   * @param {string} pathname
   * @returns {string | undefined}
   */
  pageFor(pathname) {
    const key = pathname.toLowerCase().replace(/\/+$/, '');
    return this.pageIds[key];
  }

  /**
   * @param {Pick<Location, 'pathname'>} location
   * @param {Pick<History, 'replaceState'>} history
   */
  rewrite(location, history) {
    const page = this.pageFor(location.pathname);
    if (page === undefined) return;
    history.replaceState(null, '', '/#' + page);
  }
}

export const legacyPageIds = Object.freeze({
  '/home': 'home',
  '/blog': 'writing',
  '/blog/technical': 'writing',
  '/blog/managerial': 'writing',
  '/blog/personal': 'writing',
  '/blog/travel': 'writing',
  '/blog/git-ten-commandments': 'git',
  '/blog/leading-engineering-teams-at-scale': 'teams',
  '/blog/the-iterative-mindset': 'iteration',
  '/blog/let-the-event-pick-the-destination': 'travel',
  '/projects': 'workshop',
  '/projects/api-generator': 'api-generator',
});
