describe('cy.dropRequests', () => {
  it('survives transient drops thanks to the app retry logic', () => {
    // Products retries up to 3× on a network error, so even a heavy drop rate
    // resolves to a list. Seed makes the run reproducible.
    cy.dropRequests('/api/products', 0.5, { seed: 7 });
    cy.visit('/products');
    cy.get('[data-cy=product]', { timeout: 10000 }).should(
      'have.length.greaterThan',
      0
    );
  });

  it('shows an error when every attempt is dropped', () => {
    cy.dropRequests('/api/products', 1.0);
    cy.visit('/products');
    cy.get('[data-cy=error]', { timeout: 10000 }).should('be.visible');
  });

  it('is a no-op at probability 0', () => {
    cy.dropRequests('/api/products', 0);
    cy.visit('/products');
    cy.get('[data-cy=product]').should('have.length', 5);
  });
});
