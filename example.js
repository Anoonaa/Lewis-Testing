 it('replays a second fixture-backed scenario', () => {
    cy.fixture('retail-orders').then(({ starterOrder }) => {
      starterOrder.forEach((item) => {
        Array.from({ length: item.quantity }).forEach(() => {
          cy.contains('[data-cy="product-card"]', item.name)
            .find('[data-cy="add-to-cart"]')
            .click()
        })
      })
    })

    cy.get('[data-cy="checkout-name"]').clear().type('Amina Walker')
    cy.get('[data-cy="checkout-email"]').clear().type('amina@example.com')
    cy.get('[data-cy="checkout-notes"]').clear().type('Leave at the front desk')

    // compute expected subtotal from visible product prices, then assert total equals subtotal+tax+shipping
    cy.fixture('retail-orders').then(({ starterOrder }) => {
      let expectedSubtotal = 0

      cy.wrap(starterOrder)
        .each((item) => {
          cy.contains('[data-cy="product-card"]', item.name)
            .find('[data-cy="product-price"]')
            .invoke('text')
            .then((text) => {
              const price = Number(text.replace(/[^0-9.-]+/g, ''))
              expectedSubtotal += price * item.quantity
            })
        })
        .then(() => {
          const format = (n) =>
            new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

          cy.get('[data-cy="cart-item"]').should('have.length', 2)
          cy.get('[data-cy="subtotal"]').should('contain.text', format(expectedSubtotal))

          // read displayed numbers and validate the arithmetic in the UI
          cy.get('[data-cy="subtotal"]').invoke('text').then((s) => {
            cy.get('[data-cy="tax"]').invoke('text').then((t) => {
              cy.get('[data-cy="shipping"]').invoke('text').then((sh) => {
                const sub = Number(s.replace(/[^0-9.-]+/g, ''))
                const tax = Number(t.replace(/[^0-9.-]+/g, ''))
                const ship = Number(sh.replace(/[^0-9.-]+/g, ''))
                const expectedTotal = Number((sub + tax + ship).toFixed(2))
                const expectedTotalFormatted = format(expectedTotal)
                cy.get('[data-cy="total"]').should('contain.text', expectedTotalFormatted)
              })
            })
          })
        })
    })
  })
