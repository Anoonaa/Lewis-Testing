export const retailCheckoutPage = {
  visit() {
    cy.visit('/')
  },

  addProduct(productName) {
    cy.addProductByName(productName)
  },

  fillCheckout(details) {
    cy.fillCheckoutForm(details)
  },

  submit() {
    cy.getByCy('checkout-submit').click()
  },

  cartItems() {
    return cy.getByCy('cart-item')
  },

  status() {
    return cy.getByCy('checkout-status')
  },
}