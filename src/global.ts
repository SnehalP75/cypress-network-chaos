import { SCENARIOS, isScenario } from './presets';
import { clearQueue, flush } from './report';
import { cleanupOffline } from './offline';
import { readSetting } from './settings';
import {
  resetCdpWarning,
  cdpReset,
  cdpAvailable,
  cdpWasUsed,
  resetCdpUsed,
} from './cdp';

/**
 * Register the afterEach cleanup that resets all chaos between tests, so no
 * command needs manual teardown. Also wires global chaos mode when the
 * `CHAOS` env names a scenario (e.g. `CHAOS=flaky npx cypress run`).
 *
 * Call this once from your support file, after importing the commands.
 */
let installed = false;

export function installNetworkChaos(): void {
  if (installed) return; // idempotent — avoid stacking duplicate hooks
  installed = true;

  const scenarioName = readChaosEnv();

  if (scenarioName) {
    beforeEach(() => {
      applyScenario(scenarioName);
    });
  }

  afterEach(() => {
    cleanup();
  });
}

function readChaosEnv(): string | undefined {
  const name = readSetting('CHAOS');
  if (!name || typeof name !== 'string') return undefined;
  if (!isScenario(name)) {
    // eslint-disable-next-line no-console
    console.warn(
      `[cypress-network-chaos] CHAOS='${name}' is not a known scenario ` +
        `(${Object.keys(SCENARIOS).join(', ')}). Global chaos not applied.`
    );
    return undefined;
  }
  return name;
}

/** Apply a named composite scenario to the whole suite (on `**`). */
function applyScenario(name: string): void {
  if (!isScenario(name)) return;
  const scenario = SCENARIOS[name];
  if (scenario.offline) {
    cy.goOffline();
    return;
  }
  if (scenario.slow) cy.slowNetwork(scenario.slow);
  if (scenario.drop) cy.dropRequests('**', scenario.drop);
}

/** Reset everything chaos-related after a test. */
function cleanup(): void {
  flush();
  clearQueue();
  cleanupOffline();
  resetCdpWarning();
  // Only touch the debugger protocol if a CDP command actually ran this test.
  if (cdpWasUsed() && cdpAvailable()) {
    cdpReset();
  }
  resetCdpUsed();
}
