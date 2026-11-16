// Regression guard: chaos commands must COMPOSE. dropRequests is registered
// last, so Cypress runs it first; on a non-dropped request it must fall through
// to the slowNetwork handler (registered first) so the latency still applies.
// If dropRequests called req.continue() on passthrough it would SKIP slowNetwork
// and this test would fail (products would load with no delay).
describe('command composition', () => {
  it('lets latency apply through a layered dropRequests (0%)', () => {
    cy.slowNetwork({ delay: 2000 }, { url: '/api/*' }); // registered first → runs second
    cy.dropRequests('/api/*', 0); //                        registered last  → runs first
    cy.visit('/products');

    cy.get('[data-cy=spinner]').should('be.visible');
    // Still inside the 2s delay window: products must not have loaded yet.
    cy.wait(800);
    cy.get('[data-cy=product]').should('not.exist');
    // Then they arrive — proving the request passed through both handlers.
    cy.get('[data-cy=product]', { timeout: 10000 }).should('have.length', 5);
  });

  it('a layered failRequests still errors while slowNetwork is active', () => {
    cy.slowNetwork('4G', { url: '/api/*' });
    cy.failRequests('GET /api/dashboard', { status: 500 });
    cy.visit('/dashboard');
    cy.get('[data-cy=error]', { timeout: 10000 }).should('be.visible');
  });
});
