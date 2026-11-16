describe('cy.slowNetwork', () => {
  it('shows a spinner, then the data, on a slow network', () => {
    cy.slowNetwork('3G', { url: '/api/*' });
    cy.visit('/dashboard');
    cy.get('[data-cy=spinner]').should('be.visible');
    cy.get('[data-cy=table]', { timeout: 10000 }).should('be.visible');
  });

  it('accepts a custom profile', () => {
    cy.slowNetwork({ delay: 500, kbps: 1000 }, { url: '/api/*' });
    cy.visit('/dashboard');
    cy.get('[data-cy=table]', { timeout: 10000 }).should('be.visible');
  });
});
