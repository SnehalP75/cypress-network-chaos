// This spec proves global chaos mode: `CHAOS=flaky npx cypress run` applies
// chaos suite-wide via the support file's beforeEach, with no per-test calls.
// Without the CHAOS env it is skipped.
// Read the setting the same way the plugin does: Cypress.expose() on 15.10+
// and 16 (Cypress 16 removed Cypress.env()), Cypress.env() on older versions.
const c = Cypress as unknown as {
  expose?: (key: string) => unknown;
  env?: (key: string) => unknown;
};
const chaos =
  typeof c.expose === 'function' ? c.expose('CHAOS') : c.env?.('CHAOS');

(chaos ? describe : describe.skip)(`global chaos mode (CHAOS=${chaos})`, () => {
  it('applies chaos suite-wide without any per-test command', () => {
    cy.visit('/dashboard');
    // Under chaos the page must still reach a terminal state — data or a
    // handled error — rather than hang. That is the resilience audit.
    cy.get('[data-cy=table],[data-cy=error]', { timeout: 15000 }).should(
      'exist'
    );
  });
});
