/**
 * Public option and preset types for cypress-network-chaos.
 */

/** Which mechanism injects the chaos. */
export type Engine = 'intercept' | 'cdp';

/** Latency + bandwidth throttle preset. */
export interface NetworkProfile {
  /** Added latency per request, in milliseconds. */
  delay: number;
  /** Bandwidth cap, in kilobits per second. Omit for latency-only. */
  kbps?: number;
}

/** Names of the built-in network-speed presets. */
export type PresetName = '3G' | 'slow-3G' | '4G' | 'wifi' | 'gprs';

/** Names of the composite scenarios used by global chaos mode. */
export type ScenarioName = 'slow' | 'flaky' | 'offline' | 'unreliable';

/** A URL/method pattern, e.g. `'/api/*'` or `'POST /api/orders'`. */
export type Pattern = string;

export interface SlowNetworkOptions {
  /** Restrict the slowdown to URLs matching this glob. Default: `'**'` (everything). */
  url?: Pattern;
  /** `'intercept'` (default, cross-browser) or `'cdp'` (true throttling, Chromium only). */
  engine?: Engine;
}

export interface FailRequestsOptions {
  /** HTTP status code to reply with. Default: `500`. */
  status?: number;
  /** Response body. Default: `{ error: 'chaos: injected failure' }`. */
  body?: unknown;
  /** Only fail the first N matching requests, then let traffic through. */
  times?: number;
  /** Extra response headers. */
  headers?: Record<string, string>;
}

export interface DropRequestsOptions {
  /** Seed for reproducible "random" drops. Falls back to `CHAOS_SEED` env. */
  seed?: number;
  /** Only consider the first N matching requests for dropping. */
  times?: number;
}

export interface TimeoutRequestsOptions {
  /**
   * How long matching requests hang, in milliseconds. Default: `60000`.
   * Set longer than your app's request timeout to simulate a hang.
   */
  ms?: number;
}

export interface OfflineOptions {
  /** `'intercept'` (default) or `'cdp'` for true browser-level offline (Chromium only). */
  engine?: Engine;
}

/** A single chaos event, recorded for the per-spec report. */
export interface ChaosEvent {
  command: string;
  pattern: string;
  outcome: string;
  url?: string;
  ts: number;
}
