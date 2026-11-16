/**
 * cypress-network-chaos — inject network chaos into Cypress tests.
 *
 * Browser side (support file):
 *   import 'cypress-network-chaos';        // registers commands + cleanup
 * Node side (cypress.config):
 *   import { setupNetworkChaos } from 'cypress-network-chaos/plugin';
 */
import './augment';
import { registerCommands } from './commands';
import { installNetworkChaos } from './global';

export { registerCommands } from './commands';
export { installNetworkChaos } from './global';
export { setupNetworkChaos } from './plugin';
export { PRESETS, SCENARIOS, isPreset, isScenario } from './presets';
export { mulberry32, seededRng, hashString, resolveSeed } from './rng';
export * from './types';

/**
 * Convenience bootstrap for a support file: registers the commands and the
 * afterEach cleanup / global chaos mode in one call.
 */
export function networkChaos(): void {
  registerCommands();
  installNetworkChaos();
}

// Importing the package for its side effects wires everything up.
networkChaos();
