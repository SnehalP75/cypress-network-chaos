# Contributing

## Project layout

```
src/                 TypeScript source (compiled to dist/)
  commands.ts        the 5 chaos commands, built on cy.intercept
  offline.ts         goOffline / goOnline
  presets.ts         network presets + global-mode scenarios
  rng.ts             seeded mulberry32 PRNG
  cdp.ts             Chrome DevTools Protocol engine
  report.ts          per-spec event reporting (client queue + cy.task)
  global.ts          afterEach cleanup + global CHAOS mode
  plugin.ts          Node-side setupNetworkChaos (task + after:spec summary)
  match.ts           pattern parsing + applyIntercept
  types.ts           public option/preset types
  augment.ts         Cypress.Chainable command type augmentation
  index.ts           public entry

docs/                this documentation
example/             a self-testing example app + Cypress e2e suite
  app/               a tiny vanilla SPA that reacts to network conditions
  server.js          static + mock-API server (started by cypress.config)
  cypress/e2e/       one spec per command + determinism, composition, global
```

## Setup

```bash
npm install
npm run build        # tsc → dist/
```

## Scripts

| Script | Purpose |
|---|---|
| `npm run build` | Compile `src/` to `dist/` (JS + `.d.ts`). |
| `npm run clean` | Remove `dist/`. |
| `npm run typecheck` | Type-check without emitting. |
| `npm run test:example` | Run the example Cypress suite (`cypress run --project example`). |

## Running the example suite

The example project resolves `cypress-network-chaos` through a `node_modules` symlink to the repo root, so it uses your freshly built `dist/`.

```bash
npm run build
cd example
npx cypress run                      # all specs
npx cypress run --spec cypress/e2e/composition.cy.ts
CHAOS=flaky npx cypress run          # exercise global mode
```

> Running the browser suite needs a display (and the usual Cypress system
> dependencies). On a headless Linux box use `xvfb-run -a npx cypress run`.

## Testing the non-browser logic without a browser

Everything that doesn't touch the `Cypress` global — the PRNG, pattern parsing,
presets, the Node plugin, and the mock server — is plain Node and can be tested
directly:

```js
const { mulberry32, seededRng } = require('./dist/rng')
const { parsePattern } = require('./dist/match')
const { setupNetworkChaos } = require('./dist/plugin')
```

(The browser-only modules — `index`, `commands`, `offline`, `global`, `cdp` —
reference `Cypress` at import and will throw under Node; don't require those.)

## Adding a command

1. Implement it in `src/commands.ts` (or a new module) as a thin, well-named
   wrapper over `cy.intercept`. Pass requests through with a bare `return` when
   not acting on them, so commands still **compose** — never call
   `req.continue()` just to pass through (it skips other handlers).
2. Add its type to the `Cypress.Chainable` augmentation in `src/augment.ts`.
3. Register it in `registerCommands()` in `src/commands.ts`.
4. Document it in `README.md` and `docs/API.md`, and add an example spec.

## Conventions

- `kbps` means **kilobits/second** everywhere. The intercept engine converts to
  Cypress's kilobytes/second (`÷8`); the CDP engine converts to bytes/second.
- Never call `Math.random()` for chaos decisions — route through `src/rng.ts` so
  runs stay reproducible from a seed.
- Keep reporting best-effort: a missing plugin task must never fail a test.
