/// <reference types="cypress" />

describe('Practical Assessment: UI -> API -> UI Integrity Proof', () => {
  beforeEach(() => {
    cy.visit('/')
    cy.getByTestId('product-grid').should('be.visible')
  })

  it('submits checkout only after proving delivery, pricing, and stock contracts', () => {
    cy.contains('[data-testid="product-card"]', 'Canvas Tote')
      .find('[data-testid="add-to-cart"]')
      .click()

    cy.intercept('POST', '**/api/delivery/quote').as('deliveryQuote')
    cy.intercept('GET', '**/api/pricing/quote*').as('priceQuote')
    cy.intercept('GET', '**/api/stock*').as('stockCheck')
    cy.intercept('POST', '**/api/transaction').as('createTx')

    cy.getByTestId('distance-input').clear().type('7')
    cy.getByTestId('weight-input').clear().type('3')
    cy.getByTestId('btn-delivery-quote').click()

    cy.wait('@deliveryQuote').then(({ request, response }) => {
      expect(request.body.distanceKm).to.eq(7)
      expect(request.body.weightKg).to.eq(3)
      expect(response?.statusCode).to.eq(200)
      expect(response?.body.deliveryFee).to.be.a('number')
    })

    cy.getByTestId('btn-checkout').click()

    cy.wait('@priceQuote').its('response.statusCode').should('eq', 200)
    cy.wait('@stockCheck').its('response.statusCode').should('eq', 200)

    cy.wait('@createTx').then(({ request, response }) => {
      expect([200, 201]).to.include(response?.statusCode)
      expect(request.body.summary.total).to.be.a('number')
    })

    cy.getByTestId('checkout-success').should('contain.text', 'Transaction')
  })
})
