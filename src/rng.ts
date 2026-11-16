/**
 * Deterministic pseudo-random generator so "random" chaos is reproducible.
 *
 * We never call Math.random() for chaos decisions: a run is fully replayable
 * from its seed, which is logged each spec so a failing CI run can be rerun.
 */

/** mulberry32 — tiny, fast, good-enough PRNG for test determinism. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Hash a string into a 32-bit int, so a URL/pattern can key its own stream. */
export function hashString(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Resolve the effective seed: explicit option wins, else `CHAOS_SEED` env,
 * else a fixed default (so the default run is still reproducible).
 */
export function resolveSeed(explicit?: number): number {
  if (typeof explicit === 'number') return explicit >>> 0;
  const env =
    typeof Cypress !== 'undefined' ? Cypress.env('CHAOS_SEED') : undefined;
  if (env !== undefined && env !== null && !Number.isNaN(Number(env))) {
    return Number(env) >>> 0;
  }
  return 1;
}

/**
 * Build a seeded RNG scoped to a pattern. Mixing the pattern hash into the
 * seed means two commands in one test draw independent-but-reproducible
 * streams instead of sharing one global sequence.
 */
export function seededRng(seed: number, scope: string): () => number {
  return mulberry32((seed ^ hashString(scope)) >>> 0);
}
