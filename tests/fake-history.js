// Hand-written Fake of the browser History API: records replaceState calls.
export class FakeHistory {
  constructor() {
    this.replacements = [];
  }

  replaceState(state, unused, url) {
    this.replacements.push({ state, unused, url });
  }
}
