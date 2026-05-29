/// <reference types="cypress" />

describe('Day 3: Delivery Quote Behavior', () => {
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

  it('smoke: a live delivery quote returns numeric fee data and updates the UI', () => {
    addProduct('Canvas Tote')

    cy.intercept('POST', '**/api/delivery/quote').as('deliveryQuote')

    requestDeliveryQuote('6', '2')

    cy.wait('@deliveryQuote').then(({ request, response }) => {
      expect(request.body).to.deep.equal({ distanceKm: 6, weightKg: 2 })
      expect(response?.statusCode).to.eq(200)
      expect(response?.body.deliveryFee).to.be.a('number')
      expect(response?.body.zone).to.be.oneOf(['ZONE_1', 'ZONE_2', 'ZONE_3'])
    })

    cy.getByTestId('delivery-fee').should('be.visible')
    cy.getByTestId('shipping').should('be.visible')
  })

  it('observation mode: validates delivery request payload, response contract, and UI alignment', () => {
    addProduct('Canvas Tote')

    cy.intercept('POST', '**/api/delivery/quote').as('deliveryQuote')

    requestDeliveryQuote('10', '50')

    cy.wait('@deliveryQuote').then((interception) => {
      expect(interception.request.body).to.have.property('distanceKm', 10)
      expect(interception.request.body).to.have.property('weightKg', 50)

      expect(interception.response?.statusCode).to.eq(200)
      expect(interception.response?.body).to.have.property('deliveryFee')
      expect(interception.response?.body.deliveryFee).to.be.a('number')
    })

    cy.getByTestId('delivery-fee').should('be.visible').and('contain.text', 'Quote')
  })

  it('control mode: mocks a deterministic delivery success response', () => {
    addProduct('Coffee Beans')

    cy.intercept('POST', '**/api/delivery/quote', {
      statusCode: 200,
      body: {
        deliveryQuoteId: 'DQ-TEST-1',
        deliveryFee: 299,
        zone: 'ZONE_1',
      },
    }).as('deliveryQuote')

    requestDeliveryQuote('4', '2')

    cy.wait('@deliveryQuote')
    cy.getByTestId('delivery-fee').should('contain.text', '299')
    cy.getByTestId('shipping').should('contain.text', '299')
  })

  it('control mode: mocks delivery failure and verifies resilience and checkout refusal', () => {
    addProduct('Graphic Tee')

    cy.intercept('POST', '**/api/delivery/quote', {
      statusCode: 500,
      body: { message: 'Delivery service error' },
    }).as('deliveryQuoteFail')

    requestDeliveryQuote('12', '6')

    cy.wait('@deliveryQuoteFail')
    cy.getByTestId('delivery-error').should('be.visible')
    cy.getByTestId('btn-checkout').should('be.disabled')
  })
})
