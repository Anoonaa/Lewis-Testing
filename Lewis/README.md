# Retail QE Teaching App

This app now supports two teaching tracks:

- Day 2: Fixtures and data-driven testing (`cypress/e2e/02-day-2-architecture/retail-architecture.cy.js`)
- Day 3: Network intercepts and UI->API->UI proof (`cypress/e2e/03-day-3-network/`)

## Teaching Pack (Obsidian)

Use the masterclass slides in:

- `../obsidian-vault/topic-3-network-intercepts/00-Masterclass-Index.md`

## Runtime

`npm run dev` starts both:

- Vite app on `http://127.0.0.1:5174`
- Mock retail API on `http://127.0.0.1:4000`

## Cypress

From repository root:

```bash
npx cypress open
```

or run focused suites:

```bash
npx cypress run --spec "cypress/e2e/02-day-2-architecture/retail-architecture.cy.js"
npx cypress run --spec "cypress/e2e/03-day-3-network/retail-network.cy.js"
```
