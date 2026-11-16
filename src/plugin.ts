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

  // Let a raw `CHAOS=flaky npx cypress run` reach the browser via config.env.
  if (!config.env) config.env = {};
  // Signal to the browser side that the reporting task is registered.
  config.env.__chaosPlugin = true;
  if (process.env.CHAOS && !config.env.CHAOS) {
    config.env.CHAOS = process.env.CHAOS;
  }
  if (process.env.CHAOS_SEED && !config.env.CHAOS_SEED) {
    config.env.CHAOS_SEED = process.env.CHAOS_SEED;
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
