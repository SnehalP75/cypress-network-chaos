# Recipes

A cookbook of real-world resilience tests you can write with `cypress-network-chaos`.

- [Loading states](#loading-states)
- [Error handling](#error-handling)
- [Retry logic](#retry-logic)
- [Double-submit protection](#double-submit-protection)
- [Offline & recovery](#offline--recovery)
- [Timeouts & stuck spinners](#timeouts--stuck-spinners)
- [Reproducing a flaky failure](#reproducing-a-flaky-failure)
- [Auditing a whole app](#auditing-a-whole-app)
- [Combining conditions](#combining-conditions)

---

## Loading states

Prove the spinner shows and then resolves to content.

```js
it('shows a spinner, then the data', () => {
  cy.slowNetwork('3G', { url: '/api/*' })
  cy.visit('/dashboard')
  cy.get('[data-cy=spinner]').should('be.visible')
  cy.get('[data-cy=table]', { timeout: 10000 }).should('be.visible')
})
```

> Scope to `/api/*` so page assets load fast and the spinner is clearly tied to the API call.

---

## Error handling

Prove a failed request produces a visible, recoverable error — not a silent loss or a blank screen.

```js
it('shows an error when the dashboard fails to load', () => {
  cy.failRequests('GET /api/dashboard', { status: 500 })
  cy.visit('/dashboard')
  cy.get('[data-cy=error]').should('be.visible')
})

it('shows a toast when saving fails', () => {
  cy.failRequests('POST /api/orders', { status: 500 })
  cy.visit('/checkout')
  cy.get('[data-cy=pay]').click()
  cy.contains('Something went wrong, please retry').should('be.visible')
})
```

Assert specific statuses your app treats differently:

```js
cy.failRequests('GET /api/me', { status: 401 })   // should redirect to login
cy.failRequests('GET /api/me', { status: 503 })   // should show "try again later"
```

---

## Retry logic

If your app retries on transient failures, prove it recovers. `times` fails the first N requests, then lets them through.

```js
it('recovers after transient failures', () => {
  cy.failRequests('GET /api/products', { status: 503, times: 2 })
  cy.visit('/products')
  // The 3rd attempt succeeds — retry logic worked.
  cy.get('[data-cy=product]').should('have.length.greaterThan', 0)
})
```

Or model a genuinely flaky connection with random drops:

```js
it('survives a 30% drop rate', () => {
  cy.dropRequests('/api/*', 0.3, { seed: 42 })
  cy.visit('/products')
  cy.get('[data-cy=product]').should('have.length.greaterThan', 0)
})
```

---

## Double-submit protection

Slow the save, click twice, assert only one request was sent.

```js
it('does not double-submit on a slow network', () => {
  cy.intercept('POST', '/api/orders').as('order')
  cy.slowNetwork('3G', { url: '/api/orders' })
  cy.visit('/checkout')

  cy.get('[data-cy=pay]').click()
  cy.get('[data-cy=pay]').click()        // impatient double-click

  cy.get('@order.all').should('have.length', 1)
})
```

---

## Offline & recovery

```js
it('blocks actions while offline and recovers', () => {
  cy.visit('/checkout')

  cy.goOffline()
  cy.get('[data-cy=offline-banner]').should('be.visible')
  cy.get('[data-cy=pay]').click()
  cy.contains('You are offline').should('be.visible')

  cy.goOnline()
  cy.get('[data-cy=offline-banner]').should('not.be.visible')
})
```

Dropping offline mid-flow:

```js
it('preserves form state when the network drops mid-form', () => {
  cy.visit('/signup')
  cy.get('[data-cy=email]').type('user@example.com')
  cy.goOffline()
  cy.get('[data-cy=next]').click()
  cy.contains('You are offline').should('be.visible')
  cy.goOnline()
  cy.get('[data-cy=email]').should('have.value', 'user@example.com')  // not lost
})
```

---

## Timeouts & stuck spinners

```js
it('does not leave the spinner stuck forever', () => {
  cy.timeoutRequests('GET /api/dashboard', { ms: 60000 })
  cy.visit('/dashboard')
  cy.get('[data-cy=spinner]').should('be.visible')
  // If your app has a client-side timeout, assert it surfaces one:
  // cy.get('[data-cy=timeout-message]', { timeout: 35000 }).should('be.visible')
})
```

---

## Reproducing a flaky failure

When a drop-based test fails in CI, reproduce it exactly with the same seed:

```bash
# CI logs the seed; replay it locally
CHAOS_SEED=1337 npx cypress run --spec cypress/e2e/products.cy.ts
```

Or pin a seed in the test itself so it never flakes:

```js
cy.dropRequests('/api/*', 0.3, { seed: 1 })   // same drops every run
```

---

## Auditing a whole app

Run your entire suite under chaos without editing any test — a quick resilience audit:

```bash
CHAOS=flaky npx cypress run         # 3G + 30% drops, everywhere
CHAOS=unreliable npx cypress run    # slow-3G + 50% drops
CHAOS=offline npx cypress run       # every test starts offline
```

Tests that assume a perfect network will surface here. Combine with the [per-spec report](../README.md#per-spec-report) to see exactly what was injected.

---

## Combining conditions

Commands compose — layer them to model realistic conditions:

```js
it('a slow AND flaky connection', () => {
  cy.slowNetwork('3G', { url: '/api/*' })
  cy.dropRequests('/api/*', 0.2, { seed: 7 })
  cy.visit('/products')
  cy.get('[data-cy=product]', { timeout: 15000 }).should('have.length.greaterThan', 0)
})

it('one endpoint down while the rest is just slow', () => {
  cy.slowNetwork('3G', { url: '/api/*' })
  cy.failRequests('GET /api/recommendations', { status: 500 })
  cy.visit('/home')
  cy.get('[data-cy=feed]').should('be.visible')                 // core loads (slow)
  cy.get('[data-cy=recommendations-error]').should('be.visible') // one widget degrades
})
```
