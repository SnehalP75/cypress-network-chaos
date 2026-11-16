import type { OfflineOptions } from './types';
import { cdpAvailable, cdpOffline, warnCdpFallback } from './cdp';
import { record } from './report';

/**
 * Live offline state, read by the catch-all intercept handler on every request.
 * Toggling this flips behaviour without re-registering the intercept.
 */
let offline = false;
let interceptRegistered = false;

/** Whether the AUT is currently in the simulated-offline state. */
export function isOffline(): boolean {
  return offline;
}

/** Reset offline state (called by the afterEach cleanup). */
export function resetOffline(): void {
  offline = false;
  interceptRegistered = false;
}

/**
 * Cleanup hook: if a test left the app offline, restore `navigator.onLine` and
 * fire an `online` event on the AUT window before the next test, so state never
 * leaks across tests that reuse the same window. Resets module flags too.
 */
export function cleanupOffline(): void {
  const wasOffline = offline;
  offline = false;
  interceptRegistered = false;
  if (wasOffline) {
    setBrowserOnline(true);
  }
}

/** Register the single catch-all intercept that fails traffic while offline. */
function ensureInterceptor(): void {
  if (interceptRegistered) return;
  interceptRegistered = true;
  cy.intercept('**', (req) => {
    if (offline) {
      req.destroy();
    }
    // When online we simply don't touch the request; it continues normally.
  });
}

/** Flip the AUT's navigator.onLine and dispatch the matching window event. */
function setBrowserOnline(online: boolean): Cypress.Chainable {
  return cy.window({ log: false }).then((win) => {
    try {
      Object.defineProperty(win.navigator, 'onLine', {
        configurable: true,
        get: () => online,
      });
    } catch {
      /* some browsers disallow redefining onLine — events still fire below. */
    }
    win.dispatchEvent(new win.Event(online ? 'online' : 'offline'));
  });
}

export function goOffline(options: OfflineOptions = {}): void {
  offline = true;
  ensureInterceptor();

  if (options.engine === 'cdp') {
    if (cdpAvailable()) {
      cdpOffline(true);
    } else {
      warnCdpFallback('goOffline');
    }
  }

  setBrowserOnline(false);
  record({ command: 'goOffline', pattern: '**', outcome: 'offline' });
}

export function goOnline(options: OfflineOptions = {}): void {
  offline = false;

  if (options.engine === 'cdp' && cdpAvailable()) {
    cdpOffline(false);
  }

  setBrowserOnline(true);
  record({ command: 'goOnline', pattern: '**', outcome: 'online' });
}
