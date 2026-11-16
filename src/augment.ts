import type {
  DropRequestsOptions,
  FailRequestsOptions,
  OfflineOptions,
  PresetName,
  SlowNetworkOptions,
  TimeoutRequestsOptions,
} from './types';

export {};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /**
       * Slow matching requests to a preset (or custom `{ delay, kbps }`).
       * @example cy.slowNetwork('3G')
       * @example cy.slowNetwork('4G', { url: '/api/*' })
       * @example cy.slowNetwork({ delay: 1000, kbps: 500 }, { engine: 'cdp' })
       */
      slowNetwork(
        preset?: PresetName | { delay: number; kbps?: number },
        options?: SlowNetworkOptions
      ): Chainable<void>;

      /**
       * Reply to matching requests with an error status.
       * @example cy.failRequests('POST /api/orders', { status: 500 })
       */
      failRequests(
        pattern: string,
        options?: FailRequestsOptions
      ): Chainable<void>;

      /**
       * Randomly force a network error on matching requests. Pass `{ seed }`
       * for a reproducible run.
       * @example cy.dropRequests('/api/*', 0.3, { seed: 42 })
       */
      dropRequests(
        pattern: string,
        probability?: number,
        options?: DropRequestsOptions
      ): Chainable<void>;

      /**
       * Make matching requests hang past the app's timeout.
       * @example cy.timeoutRequests('/api/slow')
       */
      timeoutRequests(
        pattern: string,
        options?: TimeoutRequestsOptions
      ): Chainable<void>;

      /**
       * Take the app offline: navigator.onLine is false, an `offline` event
       * fires, and all requests fail until `cy.goOnline()`.
       */
      goOffline(options?: OfflineOptions): Chainable<void>;

      /** Bring the app back online. */
      goOnline(options?: OfflineOptions): Chainable<void>;
    }
  }
}
