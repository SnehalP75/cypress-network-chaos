<div align="center">

# cypress-network-chaos

**Inject slow networks, failures, dropped requests, timeouts and offline conditions into Cypress tests — one intent-level line per test.**

[![npm](https://img.shields.io/badge/npm-cypress--network--chaos-cb3837)](https://www.npmjs.com/package/cypress-network-chaos)
[![cypress](https://img.shields.io/badge/cypress-%3E%3D12-04C38E)](https://www.cypress.io/)
[![types](https://img.shields.io/badge/types-included-3178c6)](#typescript)
[![license](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)

</div>

---

## Why

In development and CI your app talks to a fast, reliable backend: every API answers in ~50 ms and never fails, so your tests only ever see the happy path. Real users are on patchy 4G, hit the occasional 500, watch a request hang for 30 s, or drop Wi-Fi mid-form.

`cypress-network-chaos` lets you assert your UI survives all of that:

- Does a spinner actually show, or does the screen look frozen?
- If a save fails, does the user see an error — or is their data silently lost?
- Does a double-click during a slow request create two orders?
- Does the app retry, or break until a refresh?
- What happens when the network dies halfway through a multi-step form?

```js
it('shows a spinner and then data on a slow network', () => {
  cy.slowNetwork('3G')              // every API call now takes ~2s
  cy.visit('/dashboard')
  cy.get('[data-cy=spinner]').should('be.visible')
  cy.get('[data-cy=table]').should('be.visible')
})
```

---

## Table of contents

- [Install](#install)
- [Quick start](#quick-start)
- [Commands](#commands)
- [Presets](#network-presets)
- [Seeded determinism](#seeded-determinism)
- [Global chaos mode](#global-chaos-mode)
- [Per-spec report](#per-spec-report)
- [True browser-level throttling (CDP)](#true-browser-level-throttling-chromium-only)
- [TypeScript](#typescript)
- [How it works](#how-it-works)
- [Limitations](#limitations)
- [Documentation](#documentation)

---

## Install

```bash
npm i -D cypress-network-chaos
```

**1. Support file** (`cypress/support/e2e.{js,ts}`) — registers the commands and automatic cleanup:

```js
import 'cypress-network-chaos'
```

**2. Config** (`cypress.config.{js,ts}`) — _optional_; enables the per-spec report and lets a raw `CHAOS=…` env reach the browser:

```js
import { defineConfig } from 'cypress'
import { setupNetworkChaos } from 'cypress-network-chaos/plugin'

export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      return setupNetworkChaos(on, config)
    },
  },
})
```

The commands work without step 2. It only adds the terminal summary and the raw-env global mode.

---

## Quick start

```js
// Slow network — spinner, then data
it('degrades gracefully on 3G', () => {
  cy.slowNetwork('3G')
  cy.visit('/dashboard')
  cy.get('[data-cy=spinner]').should('be.visible')
  cy.get('[data-cy=table]').should('be.visible')
})

// Failing save — error, not silent data loss
it('surfaces a save failure', () => {
  cy.failRequests('POST /api/orders', { status: 500 })
  cy.visit('/checkout')
  cy.get('[data-cy=pay]').click()
  cy.contains('Something went wrong, please retry').should('be.visible')
})

// Flaky API — retry logic holds
it('survives a flaky API', () => {
  cy.dropRequests('/api/*', 0.3, { seed: 42 })   // 30% fail, reproducibly
  cy.visit('/products')
  cy.get('[data-cy=product]').should('have.length.greaterThan', 0)
})

// Offline mid-flow — recoverable
it('handles going offline', () => {
  cy.visit('/checkout')
  cy.goOffline()
  cy.get('[data-cy=pay]').click()
  cy.contains('You are offline').should('be.visible')
  cy.goOnline()
})
```

---

## Commands

| Command | Description |
|---|---|
| `cy.slowNetwork(preset?, options?)` | Add latency + bandwidth throttle. Preset name or `{ delay, kbps }`. |
| `cy.failRequests(pattern, options?)` | Reply to matching requests with an error status (default 500). |
| `cy.dropRequests(pattern, probability?, options?)` | Randomly force a network error at `probability` (default 0.3). |
| `cy.timeoutRequests(pattern, options?)` | Make matching requests hang past the app's timeout. |
| `cy.goOffline()` / `cy.goOnline()` | Toggle `navigator.onLine`, fire `offline`/`online`, fail all traffic while offline. |

**Patterns** are a URL glob, optionally prefixed with an HTTP method:

```js
'/api/*'            // any method, matching URL
'POST /api/orders'  // method + URL
'**'                // everything
```

**Options at a glance** (full reference in [docs/API.md](./docs/API.md)):

- `slowNetwork(preset?, { url, engine })` — `url` scopes the slowdown (default `'**'`); `engine: 'cdp'` opts into true throttling (Chromium only).
- `failRequests(pattern, { status, body, times, headers })` — `times` fails only the first N matching requests (then they pass through).
- `dropRequests(pattern, probability?, { seed, times })` — `seed` makes the run reproducible; `times` caps how many requests are considered.
- `timeoutRequests(pattern, { ms })` — `ms` is how long the request hangs (default 60000).
- `goOffline({ engine }) / goOnline({ engine })` — `engine: 'cdp'` for true browser-level offline (Chromium only).

---

## Network presets

| Preset | Delay | Bandwidth |
|---|---|---|
| `gprs` | 3500 ms | 50 kbps |
| `slow-3G` | 2500 ms | 250 kbps |
| `3G` | 2000 ms | 400 kbps |
| `4G` | 300 ms | 3000 kbps |
| `wifi` | 50 ms | 30000 kbps |

Bandwidth is in **kilobits/second**. Or pass your own profile:

```js
cy.slowNetwork({ delay: 1000, kbps: 500 })
cy.slowNetwork({ delay: 1000 })              // latency only, no throttle
```

---

## Seeded determinism

Random failures make tests non-deterministic. A seed makes a “30% failure” run reproducible, so a red CI build can be replayed exactly:

```js
cy.dropRequests('/api/*', 0.3, { seed: 42 })
```

The seed also comes from an env var:

```bash
CHAOS_SEED=42 npx cypress run
```

Each command scopes its own PRNG stream by pattern, so two commands in one test draw independent — but reproducible — sequences.

---

## Global chaos mode

Apply chaos to a whole suite without touching a single test — a one-command resilience audit:

```bash
CHAOS=flaky npx cypress run
```

| Scenario | Effect |
|---|---|
| `slow` | 3G latency + throttle on every request |
| `flaky` | 3G + 30% random drops |
| `unreliable` | slow-3G + 50% random drops |
| `offline` | start the whole suite offline |

> Requires the [config step](#install) so the raw `CHAOS` env reaches the browser. (Alternatively, `--env CHAOS=flaky` works without it.)

---

## Per-spec report

With the plugin configured, every injected fault is collected and summarised per spec, so a failing run tells you _why_:

```
[cypress-network-chaos] cypress/e2e/checkout.cy.ts: injected 3 chaos event(s)
  — 2× dropRequests (dropped), 1× failRequests (status 500).
```

Each injection is also logged in the Cypress Command Log as a `chaos` entry.

---

## True browser-level throttling (Chromium only)

By default chaos is injected via `cy.intercept` — works in every browser, zero Node setup, and covers HTTP/fetch/XHR. For real bandwidth throttling of **all** assets (images, JS bundles), opt into the Chrome DevTools Protocol:

```js
cy.slowNetwork('3G', { engine: 'cdp' })   // Chromium only; falls back to intercept elsewhere
cy.goOffline({ engine: 'cdp' })
```

On Firefox/WebKit the `cdp` engine logs a warning once and falls back to the intercept-based version.

---

## TypeScript

Types ship with the package — no `@types/…` needed. Importing `cypress-network-chaos` augments `cy` so every command autocompletes and type-checks:

```ts
cy.slowNetwork('3G', { url: '/api/*' })        // ✓ typed
cy.failRequests('POST /api/orders', { status: 503 })
```

Works with classic `node` module resolution and `node16`/`nodenext`/`bundler`.

---

## How it works

Most commands are intent-level wrappers over `cy.intercept`:

| Command | Built on |
|---|---|
| `cy.slowNetwork` | `req.on('response', res => res.setDelay(ms).setThrottle(kbps))` — or `Network.emulateNetworkConditions` with `engine: 'cdp'` |
| `cy.failRequests` | `req.reply({ statusCode, body })` |
| `cy.dropRequests` | `req.reply({ forceNetworkError: true })` when a seeded RNG draws below the probability |
| `cy.timeoutRequests` | a response delay longer than the app's timeout |
| `cy.goOffline` / `goOnline` | override `navigator.onLine`, dispatch the window events, and fail all traffic while offline |

Chaos is reset automatically in an `afterEach` — no manual teardown. Commands **compose**: layer `slowNetwork` with `dropRequests` and both apply.

---

## Limitations

- `cy.intercept` only affects HTTP/fetch/XHR. **WebSockets** are not covered (planned for v2).
- Real bandwidth throttling of assets is only reliable through the DevTools protocol, so `engine: 'cdp'` is **Chromium-only**. Firefox and WebKit use the intercept-based version (latency + response throttle).
- Going fully offline via CDP can disconnect the Cypress runner socket in some Chromium versions; the default intercept-based `goOffline` avoids that.

---

## Documentation

- **[docs/API.md](./docs/API.md)** — complete API reference (every command, option, preset, scenario, the plugin, and exports).
- **[docs/RECIPES.md](./docs/RECIPES.md)** — a cookbook of real testing patterns.
- **[docs/CONTRIBUTING.md](./docs/CONTRIBUTING.md)** — dev setup, build, and the example app.
- **[CHANGELOG.md](./CHANGELOG.md)** — release notes.

---

## License

[MIT](./LICENSE)
