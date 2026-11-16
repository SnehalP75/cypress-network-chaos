import type { NetworkProfile } from './types';

/** True only in Chromium-family browsers, where CDP throttling works. */
export function cdpAvailable(): boolean {
  try {
    return Cypress.browser.family === 'chromium';
  } catch {
    return false;
  }
}

/** Warn once per spec when CDP was requested but can't be used. */
let warned = false;
export function warnCdpFallback(what: string): void {
  if (warned) return;
  warned = true;
  // eslint-disable-next-line no-console
  console.warn(
    `[cypress-network-chaos] engine:'cdp' requested for ${what} but the ` +
      `browser is '${safeFamily()}'. Real throttling needs Chromium; ` +
      `falling back to intercept-based chaos.`
  );
}

function safeFamily(): string {
  try {
    return Cypress.browser.family;
  } catch {
    return 'unknown';
  }
}

/** Reset the once-per-test warning flag (called from the afterEach cleanup). */
export function resetCdpWarning(): void {
  warned = false;
}

/** Tracks whether any CDP emulation was applied, so cleanup only resets then. */
let used = false;
export function cdpWasUsed(): boolean {
  return used;
}
export function resetCdpUsed(): void {
  used = false;
}

function send(command: string, params: Record<string, unknown>): Cypress.Chainable {
  return cy.wrap(null, { log: false }).then(() =>
    Cypress.automation('remote:debugger:protocol', { command, params })
  );
}

/** Apply real browser-level throttling via Network.emulateNetworkConditions. */
export function cdpThrottle(profile: NetworkProfile): Cypress.Chainable {
  used = true;
  const kbps = profile.kbps ?? 0;
  const bytesPerSec = kbps > 0 ? (kbps * 1000) / 8 : -1;
  return send('Network.emulateNetworkConditions', {
    offline: false,
    latency: profile.delay,
    downloadThroughput: bytesPerSec,
    uploadThroughput: bytesPerSec,
  });
}

/** Toggle real browser-level offline via CDP. */
export function cdpOffline(offline: boolean): Cypress.Chainable {
  used = true;
  return send('Network.emulateNetworkConditions', {
    offline,
    latency: 0,
    downloadThroughput: -1,
    uploadThroughput: -1,
  });
}

/** Clear any CDP network emulation back to normal. */
export function cdpReset(): Cypress.Chainable {
  return send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 0,
    downloadThroughput: -1,
    uploadThroughput: -1,
  });
}
