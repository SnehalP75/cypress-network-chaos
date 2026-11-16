describe('cy.failRequests', () => {
  it('shows an error when a GET fails', () => {
    cy.failRequests('GET /api/dashboard', { status: 500 });
    cy.visit('/dashboard');
    cy.get('[data-cy=error]')
      .should('be.visible')
      .and('contain', 'Something went wrong');
  });

  it('shows an error toast when saving an order fails', () => {
    cy.failRequests('POST /api/orders', { status: 500 });
    cy.visit('/checkout');
    cy.get('[data-cy=pay]').click();
    cy.get('[data-cy=toast]')
      .should('be.visible')
      .and('contain', 'Something went wrong, please retry');
  });

  it('only fails the first N requests when times is set', () => {
    // First POST fails; once the single-failure budget is spent the next POST
    // passes through to the server. Two sequential clicks on one page — no
    // reload — so the passthrough path is exercised directly.
    cy.failRequests('POST /api/orders', { status: 500, times: 1 });
    cy.visit('/checkout');

    cy.get('[data-cy=pay]').click();
    cy.get('[data-cy=toast]')
      .should('be.visible')
      .and('contain', 'Something went wrong, please retry');

    cy.get('[data-cy=pay]').click();
    cy.get('[data-cy=order-status]', { timeout: 10000 }).should(
      'contain',
      'Order placed'
    );
  });
});
