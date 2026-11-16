describe('cy.timeoutRequests', () => {
  it('leaves a request hanging so the spinner never resolves', () => {
    cy.timeoutRequests('GET /api/dashboard', { ms: 60000 });
    cy.visit('/dashboard');
    cy.get('[data-cy=spinner]').should('be.visible');
    // The response is held, so the table should not appear.
    cy.wait(1000);
    cy.get('[data-cy=table]').should('not.exist');
    cy.get('[data-cy=spinner]').should('be.visible');
  });
});
