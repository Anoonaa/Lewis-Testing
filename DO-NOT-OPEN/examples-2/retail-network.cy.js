/// <reference types="cypress" />

import { retailCheckoutPage } from '../../support/pageObjects/retailCheckout'

describe('Day 3: Network Intercepts', () => {
  beforeEach(() => {
    retailCheckoutPage.visit()
  })

  it('spies on the checkout payload and mocks the response', () => {
    retailCheckoutPage.addProduct('Canvas Tote')
    retailCheckoutPage.addProduct('Coffee Beans')
    retailCheckoutPage.fillCheckout({
      name: 'Amina Walker',
      email: 'amina@example.com',
      notes: 'Leave at the front desk',
    })

    cy.intercept('POST', '**/api/checkout', (req) => {
      expect(req.body.customer).to.deep.equal({
        name: 'Amina Walker',
        email: 'amina@example.com',
        notes: 'Leave at the front desk',
      })
      expect(req.body.items).to.have.length(2)
      expect(req.body.summary).to.deep.include({
        subtotal: 34,
        tax: 3.4,
        shipping: 6,
        total: 43.4,
      })

      req.reply({
        statusCode: 201,
        fixture: 'checkout-success.json',
        delay: 250,
      })
    }).as('checkout')

    retailCheckoutPage.submit()

    cy.getByCy('checkout-status').should('contain.text', 'Processing order')
    cy.wait('@checkout').its('response.statusCode').should('eq', 201)
    cy.getByCy('checkout-status').should(
      'contain.text',
      'Order confirmed and queued for pickup.',
    )
  })

  it('shows a slow-network loading state', () => {
    retailCheckoutPage.addProduct('Denim Jacket')
    retailCheckoutPage.fillCheckout({
      name: 'Jordan Brown',
      email: 'jordan@example.com',
      notes: 'Call on arrival',
    })

    cy.intercept('POST', '**/api/checkout', {
      statusCode: 201,
      fixture: 'checkout-success.json',
      delay: 1200,
    }).as('slowCheckout')

    retailCheckoutPage.submit()

    cy.getByCy('checkout-submit').should('be.disabled')
    cy.getByCy('checkout-status').should('contain.text', 'Processing order')
    cy.wait('@slowCheckout')
    cy.getByCy('checkout-status').should('contain.text', 'Order confirmed')
  })
})