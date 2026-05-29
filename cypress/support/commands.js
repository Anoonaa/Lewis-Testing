// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })

Cypress.Commands.add('getByCy', (selector, ...args) => {
	return cy.get(`[data-cy="${selector}"]`, ...args)
})

Cypress.Commands.add('getByTestId', (selector, ...args) => {
	return cy.get(`[data-testid="${selector}"]`, ...args)
})

Cypress.Commands.add('addProductByName', (productName) => {
	cy.contains('[data-cy="product-card"]', productName)
		.find('[data-cy="add-to-cart"]')
		.click()
})

Cypress.Commands.add('fillCheckoutForm', ({ name, email, notes }) => {
	cy.getByCy('checkout-name').clear().type(name)
	cy.getByCy('checkout-email').clear().type(email)
	cy.getByCy('checkout-notes').clear().type(notes)
})