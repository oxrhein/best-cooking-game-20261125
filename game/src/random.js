// A tiny seeded generator (mulberry32) so the same seed always deals the same
// orders, and a screenshot run is repeatable.

export function createRandom(seed) {
  let state = (seed >>> 0) || 0x9e3779b9;
  return {
    next() {
      state = (state + 0x6d2b79f5) | 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    /** An integer from 0 (inclusive) to `count` (exclusive). */
    pick(count) {
      return Math.floor(this.next() * count);
    },
    /** A value in [min, max). */
    range(min, max) {
      return min + this.next() * (max - min);
    },
  };
}
