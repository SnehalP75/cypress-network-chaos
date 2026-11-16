describe('cy.goOffline / cy.goOnline', () => {
  it('shows an offline banner and blocks actions, then recovers', () => {
    cy.visit('/checkout');
    cy.get('[data-cy=offline-banner]').should('not.be.visible');

    cy.goOffline();
    cy.get('[data-cy=offline-banner]')
      .should('be.visible')
      .and('contain', 'You are offline');

    // Attempting to pay while offline surfaces a message, not a silent failure.
    cy.get('[data-cy=pay]').click();
    cy.get('[data-cy=toast]').should('be.visible').and('contain', 'offline');

    cy.goOnline();
    cy.get('[data-cy=offline-banner]').should('not.be.visible');
  });
});
