/**
 * Read a public, non-sensitive plugin setting (e.g. `CHAOS`, `CHAOS_SEED`)
 * in the browser, across Cypress versions.
 *
 *  - Cypress >= 15.10 has `Cypress.expose()`, the synchronous API for public
 *    values. Cypress 16 removed `Cypress.env()`, so this is the only option
 *    there. When `expose` exists we use it exclusively, which also avoids the
 *    `Cypress.env()` deprecation warning on 15.10+.
 *  - Older Cypress (12 – 15.9) only has `Cypress.env()`.
 *
 * Never throws: a missing API or a disallowed call yields `undefined`.
 */
export function readSetting(key: string): unknown {
  if (typeof Cypress === 'undefined') return undefined;
  // `expose` is not in the typings of older Cypress versions.
  const c = Cypress as unknown as {
    expose?: (key: string) => unknown;
    env?: (key: string) => unknown;
  };
  try {
    if (typeof c.expose === 'function') return c.expose(key);
    if (typeof c.env === 'function') return c.env(key);
  } catch {
    /* e.g. allowCypressEnv: false on 15.10+ — treat as unset. */
  }
  return undefined;
}
