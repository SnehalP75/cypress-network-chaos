import type { NetworkProfile, PresetName, ScenarioName } from './types';

/**
 * Network-speed presets. Delays are per request (ms); kbps is the bandwidth cap.
 * Numbers approximate common real-world conditions, not exact device profiles.
 */
export const PRESETS: Record<PresetName, NetworkProfile> = {
  gprs: { delay: 3500, kbps: 50 },
  'slow-3G': { delay: 2500, kbps: 250 },
  '3G': { delay: 2000, kbps: 400 },
  '4G': { delay: 300, kbps: 3000 },
  wifi: { delay: 50, kbps: 30000 },
};

/** True when `name` is a known network-speed preset. */
export function isPreset(name: string): name is PresetName {
  return Object.prototype.hasOwnProperty.call(PRESETS, name);
}

/**
 * Composite scenarios applied suite-wide by global chaos mode
 * (`CHAOS=flaky npx cypress run`). Each describes what to inject on `**`.
 */
export interface Scenario {
  slow?: PresetName;
  /** Probability (0..1) of randomly dropping a matching request. */
  drop?: number;
  /** Start the whole suite offline. */
  offline?: boolean;
}

export const SCENARIOS: Record<ScenarioName, Scenario> = {
  slow: { slow: '3G' },
  flaky: { slow: '3G', drop: 0.3 },
  unreliable: { slow: 'slow-3G', drop: 0.5 },
  offline: { offline: true },
};

/** True when `name` is a known global-mode scenario. */
export function isScenario(name: string): name is ScenarioName {
  return Object.prototype.hasOwnProperty.call(SCENARIOS, name);
}
