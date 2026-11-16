# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/), and this project adheres to
[Semantic Versioning](https://semver.org/).

## [1.1.0] — 2026-11-16

### Fixed
- Cypress 16 support. Cypress 16 removed `Cypress.env()`, which broke seeded
  drops (`CHAOS_SEED`), global chaos mode (`CHAOS`) and the per-spec report.
  Settings are now read with `Cypress.expose()` on Cypress 15.10+ and 16, with
  `Cypress.env()` kept only for older versions. This also removes the
  `Cypress.env()` deprecation warning on Cypress 15.10+.
- `setupNetworkChaos` now writes its settings to `config.expose` when available,
  and also forwards `CYPRESS_CHAOS` / `CYPRESS_CHAOS_SEED`.

### Changed
- Without the config step, global mode on Cypress 15.10+ and 16 is enabled
  with `--expose CHAOS=<scenario>` instead of `--env`.

## [1.0.0] — 2026-11-13

Initial release.

### Added
- Five intent-level commands: `cy.slowNetwork`, `cy.failRequests`,
  `cy.dropRequests`, `cy.timeoutRequests`, and `cy.goOffline` / `cy.goOnline`.
- Network presets: `gprs`, `slow-3G`, `3G`, `4G`, `wifi`, plus custom
  `{ delay, kbps }` profiles.
- Seeded determinism (mulberry32 PRNG, per-pattern scoped) so random drops are
  reproducible; seed via `{ seed }` or the `CHAOS_SEED` env.
- Global chaos mode — `CHAOS=flaky|slow|unreliable|offline npx cypress run` —
  applies chaos suite-wide with no per-test changes.
- Node plugin `setupNetworkChaos` with a per-spec terminal summary of injected
  faults.
- Optional CDP engine (`engine: 'cdp'`) for true browser-level throttling and
  offline on Chromium, with graceful fallback elsewhere.
- Automatic `afterEach` cleanup (including restoring the online state).
- Full TypeScript types and command autocompletion; resolves under classic
  `node` and `node16`/`nodenext`/`bundler`.
- A self-testing example app and Cypress e2e suite.
