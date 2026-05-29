/// <reference types="cypress" />

describe('Day 1: retail smoke tests', () => {
  beforeEach(() => {
    cy.visit('/')
  })

  it('renders the retail training app', () => {
    cy.getByCy('store-title').should('contain.text', 'Retail Checkout Lab')
    cy.getByCy('product-card').should('have.length', 6)
    cy.getByCy('cart-empty').should('be.visible')
  })

  it('adds items to the cart', () => {
    cy.addProductByName('Canvas Tote')
    cy.addProductByName('Coffee Beans')

    cy.getByCy('cart-item').should('have.length', 2)
    cy.getByCy('cart-total').should('not.contain.text', '$0.00')
  })
});


