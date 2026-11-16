import type {
  DropRequestsOptions,
  Engine,
  FailRequestsOptions,
  PresetName,
  SlowNetworkOptions,
  TimeoutRequestsOptions,
} from './types';
import { PRESETS, isPreset } from './presets';
import { parsePattern, applyIntercept } from './match';
import { seededRng, resolveSeed } from './rng';
import { emit, recordSetup } from './report';
import { cdpAvailable, cdpThrottle, warnCdpFallback } from './cdp';
import { goOffline, goOnline } from './offline';

const DEFAULT_URL = '**';

function resolveProfile(preset: PresetName | NetworkProfileLike): NetworkProfileLike {
  if (typeof preset === 'string') {
    if (!isPreset(preset)) {
      throw new Error(
        `[cypress-network-chaos] unknown preset '${preset}'. ` +
          `Known presets: ${Object.keys(PRESETS).join(', ')}.`
      );
    }
    return PRESETS[preset];
  }
  return preset;
}

type NetworkProfileLike = { delay: number; kbps?: number };

/** cy.slowNetwork — add latency + bandwidth throttle to matching requests. */
function slowNetwork(
  preset: PresetName | NetworkProfileLike = '3G',
  options: SlowNetworkOptions = {}
): void {
  const profile = resolveProfile(preset);
  const url = options.url ?? DEFAULT_URL;
  const engine: Engine = options.engine ?? 'intercept';
  const label = typeof preset === 'string' ? preset : `${profile.delay}ms`;

  if (engine === 'cdp') {
    if (cdpAvailable()) {
      cdpThrottle(profile);
      recordSetup({ command: 'slowNetwork', pattern: url, outcome: `cdp ${label}` });
      return;
    }
    warnCdpFallback('slowNetwork');
  }

  const parsed = parsePattern(url);
  applyIntercept(parsed, (req) => {
    req.on('response', (res) => {
      res.setDelay(profile.delay);
      // Our kbps is kilobits/s; Cypress's setThrottle wants kilobytes/s, so ÷8.
      if (profile.kbps && profile.kbps > 0) res.setThrottle(profile.kbps / 8);
    });
  });
  recordSetup({ command: 'slowNetwork', pattern: url, outcome: label });
}

/** cy.failRequests — reply to matching requests with an error status. */
function failRequests(pattern: string, options: FailRequestsOptions = {}): void {
  const status = options.status ?? 500;
  const body = options.body ?? { error: 'chaos: injected failure' };
  const limit = options.times;
  const parsed = parsePattern(pattern);
  let count = 0;

  applyIntercept(parsed, (req) => {
    // Budget spent: return without replying so the request falls through to any
    // other matching intercept (e.g. slowNetwork) and then the server. Calling
    // req.continue() here would SKIP other handlers — breaking composition.
    if (limit !== undefined && count >= limit) return;
    count += 1;
    emit({
      command: 'failRequests',
      pattern,
      outcome: `status ${status}`,
      url: req.url,
    });
    req.reply({ statusCode: status, body: body as object, headers: options.headers });
  });
  recordSetup({
    command: 'failRequests',
    pattern,
    outcome: limit ? `status ${status} ×${limit}` : `status ${status}`,
  });
}

/** cy.dropRequests — randomly force a network error at `probability`. */
function dropRequests(
  pattern: string,
  probability = 0.3,
  options: DropRequestsOptions = {}
): void {
  const p = Math.min(1, Math.max(0, probability));
  const limit = options.times;
  const seed = resolveSeed(options.seed);
  const rng = seededRng(seed, pattern);
  const parsed = parsePattern(pattern);
  let seen = 0;

  applyIntercept(parsed, (req) => {
    // Return (don't continue) on passthrough so other matching intercepts still
    // run — req.continue() would skip them and break composition.
    if (limit !== undefined && seen >= limit) return;
    seen += 1;
    if (rng() < p) {
      emit({ command: 'dropRequests', pattern, outcome: 'dropped', url: req.url });
      req.reply({ forceNetworkError: true });
    }
    // else: not dropped — fall through to other handlers / the server.
  });
  recordSetup({
    command: 'dropRequests',
    pattern,
    outcome: `${Math.round(p * 100)}% (seed ${seed})`,
  });
}

/** cy.timeoutRequests — make matching requests hang past the app's timeout. */
function timeoutRequests(pattern: string, options: TimeoutRequestsOptions = {}): void {
  const ms = options.ms ?? 60000;
  const parsed = parsePattern(pattern);
  applyIntercept(parsed, (req) => {
    emit({ command: 'timeoutRequests', pattern, outcome: `hang ${ms}ms`, url: req.url });
    req.on('response', (res) => {
      res.setDelay(ms);
    });
  });
  recordSetup({ command: 'timeoutRequests', pattern, outcome: `hang ${ms}ms` });
}

let registered = false;

/**
 * Register all cypress-network-chaos commands. Safe to call more than once.
 * Normally invoked for you by importing `cypress-network-chaos/commands`.
 */
export function registerCommands(): void {
  if (registered) return;
  registered = true;

  Cypress.Commands.add('slowNetwork', slowNetwork as Cypress.CommandFn<never>);
  Cypress.Commands.add('failRequests', failRequests as Cypress.CommandFn<never>);
  Cypress.Commands.add('dropRequests', dropRequests as Cypress.CommandFn<never>);
  Cypress.Commands.add('timeoutRequests', timeoutRequests as Cypress.CommandFn<never>);
  Cypress.Commands.add('goOffline', goOffline as Cypress.CommandFn<never>);
  Cypress.Commands.add('goOnline', goOnline as Cypress.CommandFn<never>);
}

// Importing this module for its side effects registers the commands.
registerCommands();
