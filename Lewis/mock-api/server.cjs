const express = require('express')

const app = express()
app.use(express.json())

const catalog = {
  'canvas-tote': 18,
  'coffee-beans': 16,
  'denim-jacket': 48,
  'graphic-tee': 28,
  'lavender-candle': 24,
  'sneaker-spray': 12,
}

const stockBook = {
  'canvas-tote': 15,
  'coffee-beans': 42,
  'denim-jacket': 8,
  'graphic-tee': 26,
  'lavender-candle': 17,
  'sneaker-spray': 31,
}

function roundMoney(value) {
  return Number(value.toFixed(2))
}

function quoteZone(distanceKm) {
  if (distanceKm <= 8) return 'ZONE_1'
  if (distanceKm <= 20) return 'ZONE_2'
  return 'ZONE_3'
}

app.post('/api/delivery/quote', (req, res) => {
  const distanceKm = Number(req.body?.distanceKm)
  const weightKg = Number(req.body?.weightKg)

  if (!Number.isFinite(distanceKm) || !Number.isFinite(weightKg) || distanceKm < 0 || weightKg < 0) {
    return res.status(400).json({ message: 'distanceKm and weightKg must be non-negative numbers' })
  }

  const base = 8
  const distanceFee = distanceKm * 1.8
  const weightFee = weightKg * 0.7
  const deliveryFee = roundMoney(base + distanceFee + weightFee)

  return res.status(200).json({
    deliveryQuoteId: `DQ-${Date.now()}`,
    deliveryFee,
    zone: quoteZone(distanceKm),
  })
})

app.get('/api/pricing/quote', (req, res) => {
  const sku = String(req.query.sku || '')
  const unitPrice = catalog[sku]

  if (!unitPrice) {
    return res.status(404).json({ message: `Unknown sku: ${sku}` })
  }

  return res.status(200).json({ sku, unitPrice })
})

app.get('/api/stock', (req, res) => {
  const sku = String(req.query.sku || '')
  const availableQty = stockBook[sku]

  if (availableQty === undefined) {
    return res.status(404).json({ message: `Unknown sku: ${sku}` })
  }

  return res.status(200).json({ sku, availableQty })
})

app.post('/api/transaction', (req, res) => {
  const items = Array.isArray(req.body?.items) ? req.body.items : []

  if (items.length === 0) {
    return res.status(400).json({ message: 'Transaction requires at least one item' })
  }

  const hasUnavailable = items.some((item) => Number(item.quantity) > Number(item.availableQty))
  if (hasUnavailable) {
    return res.status(409).json({ message: 'Insufficient stock for one or more items' })
  }

  return res.status(201).json({
    orderId: `TX-${Math.floor(Math.random() * 100000)}`,
    message: 'Checkout complete. Transaction committed.',
  })
})

const port = Number(process.env.MOCK_API_PORT || 4000)
app.listen(port, '127.0.0.1', () => {
  console.log(`Mock retail API listening on http://127.0.0.1:${port}`)
})
