/// <reference types="cypress" />

describe('Day 2: Fixtures and Data-Driven Testing', () => {
  beforeEach(() => {
    cy.visit('/')
    cy.getByCy('product-grid').should('be.visible')
  })

  function addOrderFromFixture(order) {
    order.forEach((item) => {
      Array.from({ length: item.quantity }).forEach(() => {
        cy.contains('[data-cy="product-card"]', item.name)
          .find('[data-cy="add-to-cart"]')
          .click()
      })
    })
  }

  function assertSubtotalMatchesCartLines() {
    let lineSum = 0

    cy.getByCy('cart-item').each(($row) => {
      cy.wrap($row)
        .find('[data-cy="cart-item-total"]')
        .invoke('text')
        .then((text) => {
          lineSum += Number(text.replace(/[^0-9.-]+/g, ''))
        })
    })

    cy.then(() => {
      const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(Number(lineSum.toFixed(2)))

      cy.getByCy('subtotal').should('contain.text', formatted)
    })
  }

  it('drives checkout coverage from fixture data', () => {
    cy.fixture('retail-orders').then(({ starterOrder }) => {
      addOrderFromFixture(starterOrder)
    })

    cy.getByCy('cart-item').should('have.length', 2)
    assertSubtotalMatchesCartLines()
  })

  it('replays a second fixture-backed scenario', () => {
    cy.fixture('retail-orders').then(({ bundleOrder }) => {
      addOrderFromFixture(bundleOrder)
    })

    cy.getByCy('cart-item').should('have.length', 3)
    assertSubtotalMatchesCartLines()
  })
})
