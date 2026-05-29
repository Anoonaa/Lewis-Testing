const { defineConfig } = require("cypress");

module.exports = defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL || 'http://127.0.0.1:5174',
    specPattern: [
      'cypress/e2e/**/*.cy.js',
      '2-advanced-examples/**/*.cy.js',
    ],
    viewportWidth: 1280,
    viewportHeight: 720,
    retries: {
      runMode: 2,
      openMode: 0,
    },
  },
})

