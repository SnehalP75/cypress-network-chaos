import { defineConfig } from 'cypress';
import { setupNetworkChaos } from 'cypress-network-chaos/plugin';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { start } = require('./server');

export default defineConfig({
  e2e: {
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    video: false,
    async setupNodeEvents(on, config) {
      // Start the static + mock-API server and point Cypress at it, so the
      // whole suite runs with a single `cypress run`.
      const { baseUrl } = await start();
      config.baseUrl = baseUrl;
      return setupNetworkChaos(on, config);
    },
  },
});
