import type { ChaosEvent } from './types';

/**
 * Node-side setup for cypress-network-chaos. Call from `setupNodeEvents` in
 * cypress.config:
 *
 *   import { setupNetworkChaos } from 'cypress-network-chaos/plugin';
 *   setupNodeEvents(on, config) {
 *     return setupNetworkChaos(on, config);
 *   }
 *
 * It registers the `chaos:record` task (so per-spec events are collected) and
 * an `after:spec` hook that prints a one-line summary of what was injected, e.g.
 * "… injected 3 chaos event(s) — 2× dropRequests (dropped), 1× failRequests (status 500)."
 */

type PluginEvents = Cypress.PluginEvents;
type PluginConfig = Cypress.PluginConfigOptions;

interface SetupOptions {
  /** Print the per-spec summary to the terminal. Default: true. */
  logSummary?: boolean;
}

export function setupNetworkChaos(
  on: PluginEvents,
  config: PluginConfig,
  options: SetupOptions = {}
): PluginConfig {
  const logSummary = options.logSummary !== false;

  // Pass our public settings to the browser. Cypress >= 15.10 has a
  // `config.expose` object (read in the browser with `Cypress.expose()`;
  // Cypress 16 removed `Cypress.env()`). Older versions only have `config.env`.
  const cfg = config as unknown as {
    env?: Record<string, unknown>;
    expose?: Record<string, unknown>;
  };
  const env: Record<string, unknown> = cfg.env ?? {};
  cfg.env = env;
  const hasExpose = cfg.expose !== undefined && cfg.expose !== null;
  const target = hasExpose ? (cfg.expose as Record<string, unknown>) : env;

  // Signal to the browser side that the reporting task is registered.
  target.__chaosPlugin = true;

  // Let a raw `CHAOS=flaky npx cypress run` (or `CYPRESS_CHAOS=flaky`, which
  // Cypress puts in config.env only) reach the browser.
  for (const key of ['CHAOS', 'CHAOS_SEED']) {
    if (target[key] !== undefined) continue;
    const value = process.env[key] ?? env[key];
    if (value !== undefined) target[key] = value;
  }

  let events: ChaosEvent[] = [];

  on('task', {
    'chaos:record'(event: ChaosEvent) {
      events.push(event);
      return null;
    },
    'chaos:reset'() {
      events = [];
      return null;
    },
  });

  on('after:spec', (spec) => {
    if (!logSummary || events.length === 0) {
      events = [];
      return;
    }
    const byOutcome = summarize(events);
    const parts = Object.entries(byOutcome).map(([k, v]) => `${v}× ${k}`);
    // eslint-disable-next-line no-console
    console.log(
      `\n[cypress-network-chaos] ${spec.relative}: injected ${events.length} ` +
        `chaos event(s) — ${parts.join(', ')}.`
    );
    events = [];
  });

  return config;
}

function summarize(events: ChaosEvent[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const e of events) {
    const key = `${e.command} (${e.outcome})`;
    out[key] = (out[key] ?? 0) + 1;
  }
  return out;
}
