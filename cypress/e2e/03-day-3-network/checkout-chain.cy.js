/// <reference types="cypress" />

describe('Day 3: Checkout Chain Integrity', () => {
  beforeEach(() => {
    cy.visit('/')
    cy.getByTestId('product-grid').should('be.visible')
  })

  function addProduct(name) {
    cy.contains('[data-testid="product-card"]', name)
      .find('[data-testid="add-to-cart"]')
      .click()
  }

  function requestDeliveryQuote(distanceKm = '10', weightKg = '5') {
    cy.getByTestId('distance-input').clear().type(distanceKm)
    cy.getByTestId('weight-input').clear().type(weightKg)
    cy.getByTestId('btn-delivery-quote').click()
  }

  it('control mode: transaction rejection is surfaced after pricing and stock checks', () => {
    addProduct('Denim Jacket')

    cy.intercept('POST', '**/api/delivery/quote', {
      statusCode: 200,
      body: {
        deliveryQuoteId: 'DQ-FAIL-1',
        deliveryFee: 18,
        zone: 'ZONE_2',
      },
    }).as('deliveryQuote')

    cy.intercept('GET', '**/api/pricing/quote*').as('price')
    cy.intercept('GET', '**/api/stock*').as('stock')
    cy.intercept('POST', '**/api/transaction', {
      statusCode: 409,
      body: { message: 'Insufficient stock for one or more items' },
    }).as('txFail')

    requestDeliveryQuote('8', '4')

    cy.wait('@deliveryQuote')
    cy.getByTestId('btn-checkout').click()

    cy.wait('@price').its('response.statusCode').should('eq', 200)
    cy.wait('@stock').its('response.statusCode').should('eq', 200)

    cy.wait('@txFail').then(({ response }) => {
      expect(response?.statusCode).to.eq(409)
    })

    cy.getByTestId('checkout-success').should(
      'contain.text',
      'Checkout failed. Validate stock, pricing, and delivery dependencies.',
    )
  })

  it('async anchors: synchronizes on pricing, stock, and transaction calls without hard waits', () => {
    addProduct('Canvas Tote')

    cy.intercept('POST', '**/api/delivery/quote', {
      statusCode: 200,
      body: {
        deliveryQuoteId: 'DQ-ASYNC-1',
        deliveryFee: 19.5,
        zone: 'ZONE_2',
      },
    }).as('deliveryQuote')

    requestDeliveryQuote('9', '4')
    cy.wait('@deliveryQuote')

    cy.intercept('GET', '**/api/pricing/quote*').as('price')
    cy.intercept('GET', '**/api/stock*').as('stock')
    cy.intercept('POST', '**/api/transaction').as('tx')

    cy.getByTestId('btn-checkout').click()

    cy.wait('@price').then(({ response }) => {
      expect(response?.statusCode).to.eq(200)
      expect(response?.body).to.have.property('unitPrice')
    })

    cy.wait('@stock').then(({ response }) => {
      expect(response?.statusCode).to.eq(200)
      expect(response?.body).to.have.property('availableQty')
    })

    cy.wait('@tx').then(({ response }) => {
      expect([200, 201]).to.include(response?.statusCode)
    })

    cy.getByTestId('checkout-success').should('contain.text', 'Transaction')
  })

  it('worked chain: proves UI->pricing->stock->delivery->transaction integrity end to end', () => {
    addProduct('Denim Jacket')
    addProduct('Graphic Tee')

    cy.intercept('GET', '**/api/pricing/quote*').as('price')
    cy.intercept('GET', '**/api/stock*').as('stock')
    cy.intercept('POST', '**/api/delivery/quote').as('delivery')
    cy.intercept('POST', '**/api/transaction').as('tx')

    requestDeliveryQuote('14', '8')

    cy.wait('@delivery').then(({ response }) => {
      expect(response?.statusCode).to.eq(200)
      expect(response?.body).to.have.property('deliveryFee')
    })

    cy.getByTestId('btn-checkout').click()

    cy.wait('@price')
    cy.wait('@stock')

    cy.wait('@tx').then(({ request, response }) => {
      expect([200, 201]).to.include(response?.statusCode)
      expect(request.body).to.have.property('summary')
      expect(request.body.summary).to.have.property('total')
    })

    cy.getByTestId('total-amount').should('be.visible')
    cy.getByTestId('checkout-success').should('be.visible')
  })
})
