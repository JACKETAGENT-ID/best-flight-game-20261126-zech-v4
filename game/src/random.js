// Deterministic randomness for SKYBRIDGE. Every gust, cloud and wave comes from a
// seeded generator, so the same seed always flies the same sky (screenshots, replays).

// mulberry32 — small, fast, deterministic.
export function makeRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Smooth deterministic 1-D noise from a seed: gust strength at world position x.
export function makeGustField(seed) {
  const rng = makeRng(seed * 7919 + 13);
  const knots = [];
  for (let i = 0; i < 48; i++) knots.push(rng() * 2 - 1);
  return function gustAt(x) {
    const t = (x / 12000) * (knots.length - 1);
    const i = Math.max(0, Math.min(knots.length - 2, Math.floor(t)));
    const f = t - i;
    const s = f * f * (3 - 2 * f); // smoothstep between knots
    return knots[i] * (1 - s) + knots[i + 1] * s;
  };
}

// Deterministic cloud puffs for a seed: positions across the sky.
export function makeClouds(seed, count) {
  const rng = makeRng(seed * 104729 + 7);
  const clouds = [];
  for (let i = 0; i < count; i++) {
    clouds.push({
      x: rng() * 12000,
      y: 700 + rng() * 900,
      r: 50 + rng() * 110,
      a: 0.18 + rng() * 0.3,
    });
  }
  return clouds;
}
