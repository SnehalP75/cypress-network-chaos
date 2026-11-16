# API Reference

Complete reference for every command, option, preset, scenario, the Node plugin, and package exports.

- [Patterns](#patterns)
- [Commands](#commands)
  - [cy.slowNetwork](#cyslownetworkpreset-options)
  - [cy.failRequests](#cyfailrequestspattern-options)
  - [cy.dropRequests](#cydroprequestspattern-probability-options)
  - [cy.timeoutRequests](#cytimeoutrequestspattern-options)
  - [cy.goOffline / cy.goOnline](#cygoofflineoptions--cygoonlineoptions)
- [Presets](#presets)
- [Scenarios (global mode)](#scenarios-global-mode)
- [Node plugin: setupNetworkChaos](#node-plugin-setupnetworkchaos)
- [Package exports](#package-exports)
- [Composition & ordering](#composition--ordering)
- [Automatic cleanup](#automatic-cleanup)

---

## Patterns

Every command targeting specific traffic takes a **pattern** — a string that is a URL glob, optionally prefixed with an HTTP method:

```
'/api/*'            → { url: '/api/*' }            (any method)
'POST /api/orders'  → { method: 'POST', url: '/api/orders' }
'**'                → everything
```

Recognised methods: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, `OPTIONS` (case-insensitive). A first token that isn't a method is treated as part of the URL. Query strings are preserved.

The URL glob uses the same matching as [`cy.intercept`](https://docs.cypress.io/api/commands/intercept) (minimatch).

---

## Commands

### `cy.slowNetwork(preset?, options?)`

Add latency and (optionally) a bandwidth throttle to matching requests.

| Param | Type | Default | Description |
|---|---|---|---|
| `preset` | `PresetName \| { delay: number; kbps?: number }` | `'3G'` | A [preset name](#presets) or a custom profile. `delay` is milliseconds; `kbps` is kilobits/second (omit for latency-only). |
| `options.url` | `string` | `'**'` | Pattern to scope the slowdown. |
| `options.engine` | `'intercept' \| 'cdp'` | `'intercept'` | `'cdp'` uses real browser-level throttling (Chromium only), falling back to intercept elsewhere. |

```js
cy.slowNetwork()                                  // 3G on everything
cy.slowNetwork('4G', { url: '/api/*' })           // 4G on the API only
cy.slowNetwork({ delay: 1000, kbps: 500 })        // custom profile
cy.slowNetwork('3G', { engine: 'cdp' })           // real throttling in Chromium
```

> **Units:** `kbps` is kilobits/second across the package. The intercept engine converts to Cypress's kilobytes/second internally; the CDP engine converts to bytes/second. A preset reads the same on both engines.

---

### `cy.failRequests(pattern, options?)`

Reply to matching requests with an error status instead of hitting the server.

| Param | Type | Default | Description |
|---|---|---|---|
| `pattern` | `string` | — | [Pattern](#patterns) to match. |
| `options.status` | `number` | `500` | HTTP status code to reply with. |
| `options.body` | `unknown` | `{ error: 'chaos: injected failure' }` | Response body. |
| `options.times` | `number` | — | Fail only the first N matching requests; subsequent ones pass through to the server. |
| `options.headers` | `Record<string, string>` | — | Extra response headers. |

```js
cy.failRequests('POST /api/orders', { status: 500 })
cy.failRequests('GET /api/user', { status: 401, body: { message: 'expired' } })
cy.failRequests('/api/*', { status: 503, times: 2 })   // first 2 fail, then recover
```

---

### `cy.dropRequests(pattern, probability?, options?)`

Randomly force a network error (connection failure) on matching requests. Models a flaky connection.

| Param | Type | Default | Description |
|---|---|---|---|
| `pattern` | `string` | — | [Pattern](#patterns) to match. |
| `probability` | `number` | `0.3` | Chance (0–1) each matching request is dropped. Clamped to `[0, 1]`. |
| `options.seed` | `number` | `CHAOS_SEED` env, else `1` | Seed for the reproducible PRNG. |
| `options.times` | `number` | — | Only consider the first N matching requests for dropping. |

```js
cy.dropRequests('/api/*')                      // 30%
cy.dropRequests('/api/*', 0.5, { seed: 42 })   // 50%, reproducible
cy.dropRequests('GET /api/products', 1.0)      // drop every one
```

A dropped request fails with a network error (`forceNetworkError`), exactly as a real connection drop would — so you can assert retry logic, error states, and that no partial data is shown.

> **Determinism:** the drop decision comes from a seeded [mulberry32](https://github.com/bryc/code/blob/master/jshash/PRNGs.md#mulberry32) PRNG scoped per pattern. The same seed reproduces the exact set of dropped requests. See [Seeded determinism](../README.md#seeded-determinism).

---

### `cy.timeoutRequests(pattern, options?)`

Make matching requests hang, so you can test timeout handling and “stuck spinner” states.

| Param | Type | Default | Description |
|---|---|---|---|
| `pattern` | `string` | — | [Pattern](#patterns) to match. |
| `options.ms` | `number` | `60000` | How long the request hangs, in milliseconds. Set longer than your app's request timeout. |

```js
cy.timeoutRequests('GET /api/dashboard')            // hang 60s
cy.timeoutRequests('/api/*', { ms: 120000 })        // hang 2 min
```

---

### `cy.goOffline(options?)` / `cy.goOnline(options?)`

Toggle the app's online state.

`goOffline`:
- sets `navigator.onLine` to `false`,
- dispatches an `offline` event on the AUT window,
- fails all subsequent requests until `goOnline`.

`goOnline` reverses all of the above.

| Param | Type | Default | Description |
|---|---|---|---|
| `options.engine` | `'intercept' \| 'cdp'` | `'intercept'` | `'cdp'` also toggles real browser-level offline (Chromium only). |

```js
cy.visit('/checkout')
cy.goOffline()
cy.get('[data-cy=pay]').click()
cy.contains('You are offline').should('be.visible')
cy.goOnline()
```

> If a test ends while offline, the automatic `afterEach` cleanup restores the online state so it never leaks into the next test.

---

## Presets

Named network profiles for `cy.slowNetwork`. `delay` is ms; `kbps` is kilobits/second.

| Preset | delay | kbps |
|---|---|---|
| `gprs` | 3500 | 50 |
| `slow-3G` | 2500 | 250 |
| `3G` | 2000 | 400 |
| `4G` | 300 | 3000 |
| `wifi` | 50 | 30000 |

Accessible programmatically:

```ts
import { PRESETS, isPreset } from 'cypress-network-chaos'
PRESETS['3G']          // { delay: 2000, kbps: 400 }
isPreset('3G')         // true
```

---

## Scenarios (global mode)

Composite scenarios applied suite-wide via `CHAOS=<name> npx cypress run`.

| Scenario | Definition |
|---|---|
| `slow` | `{ slow: '3G' }` |
| `flaky` | `{ slow: '3G', drop: 0.3 }` |
| `unreliable` | `{ slow: 'slow-3G', drop: 0.5 }` |
| `offline` | `{ offline: true }` |

```ts
import { SCENARIOS, isScenario } from 'cypress-network-chaos'
```

See [Global chaos mode](../README.md#global-chaos-mode).

---

## Node plugin: `setupNetworkChaos`

```js
import { setupNetworkChaos } from 'cypress-network-chaos/plugin'

export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      return setupNetworkChaos(on, config /*, { logSummary: true } */)
    },
  },
})
```

**Signature:** `setupNetworkChaos(on, config, options?) => config`

| Option | Type | Default | Description |
|---|---|---|---|
| `logSummary` | `boolean` | `true` | Print the per-spec chaos summary to the terminal. |

What it does:
- registers the `chaos:record` and `chaos:reset` tasks that collect injected-fault events,
- prints a one-line summary in an `after:spec` hook,
- forwards a raw `CHAOS` / `CHAOS_SEED` process env (or `CYPRESS_CHAOS` / `CYPRESS_CHAOS_SEED`) into `config.expose` on Cypress 15.10+ and 16, or `config.env` on older versions, so [global mode](../README.md#global-chaos-mode) works without `--expose` / `--env`,
- sets `__chaosPlugin = true` in that same object so the browser side knows the reporting task exists.

Returns the (mutated) `config`, so `return setupNetworkChaos(on, config)` is all you need.

---

## Package exports

```ts
// Browser side (support file) — side-effect import registers everything:
import 'cypress-network-chaos'

// Named exports (from the main entry):
import {
  registerCommands,     // register only the commands
  installNetworkChaos,  // register the afterEach cleanup + global mode
  networkChaos,         // both of the above (called automatically on import)
  setupNetworkChaos,    // re-exported Node plugin
  PRESETS, SCENARIOS, isPreset, isScenario,
  mulberry32, seededRng, hashString, resolveSeed,  // the PRNG utilities
} from 'cypress-network-chaos'

// Subpath entries:
import { setupNetworkChaos } from 'cypress-network-chaos/plugin'
import 'cypress-network-chaos/commands'   // commands only, no cleanup/global mode

// Types:
import type {
  PresetName, ScenarioName, NetworkProfile,
  SlowNetworkOptions, FailRequestsOptions, DropRequestsOptions,
  TimeoutRequestsOptions, OfflineOptions, ChaosEvent,
} from 'cypress-network-chaos'
```

---

## Composition & ordering

Chaos commands compose. Cypress runs matching intercepts **last-registered-first**, and each command passes a request through to the next handler when it isn't acting on it. So:

```js
cy.slowNetwork('3G', { url: '/api/*' })   // adds latency
cy.failRequests('/api/orders', { times: 1 })  // first order fails, then slow+passthrough
```

both apply. `dropRequests` and `failRequests` only reply when they actually inject a fault; otherwise they fall through so a layered `slowNetwork` still takes effect.

---

## Automatic cleanup

An `afterEach` hook (installed on import) resets everything between tests:

- flushes and clears the chaos-event queue,
- restores `navigator.onLine` and fires `online` if a test ended offline,
- resets CDP network emulation (only if a CDP command ran),
- clears the per-test warning and state flags.

No manual teardown is required. Intercepts themselves are cleared by Cypress between tests.
