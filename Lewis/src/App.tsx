import { useMemo, useState } from 'react'
import './App.css'

type Product = {
  sku: string
  name: string
  category: string
  price: number
  badge: string
}

type CartItem = Product & {
  quantity: number
}

type DeliveryQuoteRequest = {
  distanceKm: number
  weightKg: number
}

type DeliveryQuoteResponse = {
  deliveryQuoteId: string
  deliveryFee: number
  zone: string
}

type PricingQuoteResponse = {
  sku: string
  unitPrice: number
}

type StockResponse = {
  sku: string
  availableQty: number
}

type TransactionResponse = {
  orderId: string
  message: string
}

type TransactionPayload = {
  customer: {
    name: string
    email: string
    notes: string
  }
  items: Array<{
    sku: string
    name: string
    unitPrice: number
    quantity: number
    lineTotal: number
    availableQty: number
  }>
  delivery: {
    quoteId: string
    fee: number
    zone: string
    distanceKm: number
    weightKg: number
  }
  summary: {
    subtotal: number
    tax: number
    shipping: number
    total: number
  }
}

const catalog: Product[] = [
  {
    sku: 'canvas-tote',
    name: 'Canvas Tote',
    category: 'Accessories',
    price: 18,
    badge: 'Popular',
  },
  {
    sku: 'coffee-beans',
    name: 'Coffee Beans',
    category: 'Grocery',
    price: 16,
    badge: 'Fresh roast',
  },
  {
    sku: 'denim-jacket',
    name: 'Denim Jacket',
    category: 'Apparel',
    price: 48,
    badge: 'New arrival',
  },
  {
    sku: 'graphic-tee',
    name: 'Graphic Tee',
    category: 'Apparel',
    price: 28,
    badge: 'Bestseller',
  },
  {
    sku: 'lavender-candle',
    name: 'Lavender Candle',
    category: 'Home',
    price: 24,
    badge: 'Giftable',
  },
  {
    sku: 'sneaker-spray',
    name: 'Sneaker Spray',
    category: 'Care',
    price: 12,
    badge: 'Last chance',
  },
]

const fallbackShippingFee = 6
const taxRate = 0.1

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

function formatMoney(amount: number) {
  return money.format(amount)
}

async function parseJsonOrThrow<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}`)
  }

  return (await response.json()) as T
}

function App() {
  const [cart, setCart] = useState<CartItem[]>([])
  const [customerName, setCustomerName] = useState('Amina Walker')
  const [customerEmail, setCustomerEmail] = useState('amina@example.com')
  const [deliveryNotes, setDeliveryNotes] = useState('Leave at the front desk')

  const [distanceKm, setDistanceKm] = useState('10')
  const [weightKg, setWeightKg] = useState('5')
  const [deliveryQuote, setDeliveryQuote] = useState<DeliveryQuoteResponse | null>(null)
  const [deliveryError, setDeliveryError] = useState('')

  const [checkoutStatus, setCheckoutStatus] = useState(
    'Build a cart, request delivery quote, then submit checkout.',
  )
  const [isRequestingQuote, setIsRequestingQuote] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart],
  )

  const tax = Number((subtotal * taxRate).toFixed(2))
  const shipping = deliveryQuote?.deliveryFee ?? (cart.length > 0 ? fallbackShippingFee : 0)
  const total = Number((subtotal + tax + shipping).toFixed(2))

  const canCheckout =
    cart.length > 0 && !isSubmitting && !deliveryError && deliveryQuote?.deliveryFee !== undefined

  function addToCart(product: Product) {
    setCart((currentCart) => {
      const existingItem = currentCart.find(({ sku }) => sku === product.sku)

      if (existingItem) {
        return currentCart.map((item) =>
          item.sku === product.sku
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        )
      }

      return [...currentCart, { ...product, quantity: 1 }]
    })

    setDeliveryError('')
  }

  function removeFromCart(sku: string) {
    setCart((currentCart) =>
      currentCart
        .map((item) =>
          item.sku === sku ? { ...item, quantity: item.quantity - 1 } : item,
        )
        .filter((item) => item.quantity > 0),
    )
  }

  async function requestDeliveryQuote() {
    if (cart.length === 0) {
      setDeliveryError('Add at least one item before requesting a quote.')
      return
    }

    const payload: DeliveryQuoteRequest = {
      distanceKm: Number(distanceKm),
      weightKg: Number(weightKg),
    }

    if (!Number.isFinite(payload.distanceKm) || !Number.isFinite(payload.weightKg)) {
      setDeliveryError('Distance and weight must be valid numbers.')
      return
    }

    setIsRequestingQuote(true)
    setDeliveryError('')

    try {
      const response = await fetch('/api/delivery/quote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const body = await parseJsonOrThrow<DeliveryQuoteResponse>(response)
      setDeliveryQuote(body)
      setCheckoutStatus(`Delivery quote ${body.deliveryQuoteId} ready for zone ${body.zone}.`)
    } catch {
      setDeliveryQuote(null)
      setDeliveryError('Delivery quote failed. Checkout is blocked until quote succeeds.')
    } finally {
      setIsRequestingQuote(false)
    }
  }

  async function collectPricingAndStockEvidence() {
    const records = await Promise.all(
      cart.map(async (item) => {
        const pricingResponse = await fetch(`/api/pricing/quote?sku=${item.sku}`)
        const stockResponse = await fetch(`/api/stock?sku=${item.sku}`)

        const pricing = await parseJsonOrThrow<PricingQuoteResponse>(pricingResponse)
        const stock = await parseJsonOrThrow<StockResponse>(stockResponse)

        return {
          sku: item.sku,
          name: item.name,
          unitPrice: pricing.unitPrice,
          quantity: item.quantity,
          lineTotal: Number((pricing.unitPrice * item.quantity).toFixed(2)),
          availableQty: stock.availableQty,
        }
      }),
    )

    return records
  }

  async function handleCheckout(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!canCheckout || !deliveryQuote) {
      setCheckoutStatus('Request a valid delivery quote before checkout.')
      return
    }

    setIsSubmitting(true)
    setCheckoutStatus('Creating transaction...')

    try {
      const reconciledItems = await collectPricingAndStockEvidence()

      const payload: TransactionPayload = {
        customer: {
          name: customerName,
          email: customerEmail,
          notes: deliveryNotes,
        },
        items: reconciledItems,
        delivery: {
          quoteId: deliveryQuote.deliveryQuoteId,
          fee: deliveryQuote.deliveryFee,
          zone: deliveryQuote.zone,
          distanceKm: Number(distanceKm),
          weightKg: Number(weightKg),
        },
        summary: {
          subtotal,
          tax,
          shipping,
          total,
        },
      }

      const response = await fetch('/api/transaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const body = await parseJsonOrThrow<TransactionResponse>(response)
      setCheckoutStatus(body.message ?? `Order ${body.orderId} created.`)
    } catch {
      setCheckoutStatus('Checkout failed. Validate stock, pricing, and delivery dependencies.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="retail-app" data-cy="retail-app" data-testid="retail-app">
      <section className="hero-panel">
        <div className="hero-copy">
          <span className="eyebrow" data-cy="workshop-label" data-testid="workshop-label">
            Network integrity teaching app
          </span>
          <h1 data-cy="store-title" data-testid="store-title">Retail Checkout Lab</h1>
          <p className="hero-text">
            Teach UI - API - UI evidence with delivery quotes, stock checks, pricing checks, and
            transaction commits.
          </p>
        </div>

        <div className="hero-stat">
          <span className="hero-stat-label">Live cart total</span>
          <strong data-cy="cart-total" data-testid="total-amount">{formatMoney(total)}</strong>
        </div>
      </section>

      <section className="workspace-grid">
        <section className="catalog-panel">
          <div className="section-heading">
            <h2>Catalog</h2>
            <p>Product cards drive deterministic test data and UI interactions.</p>
          </div>

          <div className="catalog-grid" data-cy="product-grid" data-testid="product-grid">
            {catalog.map((product) => (
              <article
                key={product.sku}
                className="product-card"
                data-cy="product-card"
                data-testid="product-card"
              >
                <div className="product-topline">
                  <span className="product-badge">{product.badge}</span>
                  <span className="product-category">{product.category}</span>
                </div>

                <h3 data-cy="product-name" data-testid="product-name">{product.name}</h3>
                <p data-cy="product-price" data-testid="product-price">{formatMoney(product.price)}</p>

                <button
                  type="button"
                  className="action-button"
                  data-cy="add-to-cart"
                  data-testid="add-to-cart"
                  onClick={() => addToCart(product)}
                >
                  Add to cart
                </button>
              </article>
            ))}
          </div>
        </section>

        <aside className="checkout-panel">
          <div className="section-heading">
            <h2>Delivery, Cart, and checkout</h2>
            <p>Observe and control each API boundary while validating UI behavior.</p>
          </div>

          <div className="summary" aria-label="Delivery quote settings">
            <div className="summary-row">
              <label htmlFor="distance-input">Distance (km)</label>
              <input
                id="distance-input"
                data-cy="distance-input"
                data-testid="distance-input"
                type="number"
                min="0"
                step="0.1"
                value={distanceKm}
                onChange={(event) => setDistanceKm(event.target.value)}
              />
            </div>
            <div className="summary-row">
              <label htmlFor="weight-input">Weight (kg)</label>
              <input
                id="weight-input"
                data-cy="weight-input"
                data-testid="weight-input"
                type="number"
                min="0"
                step="0.1"
                value={weightKg}
                onChange={(event) => setWeightKg(event.target.value)}
              />
            </div>
            <button
              type="button"
              className="action-button"
              data-cy="btn-delivery-quote"
              data-testid="btn-delivery-quote"
              disabled={isRequestingQuote || cart.length === 0}
              onClick={requestDeliveryQuote}
            >
              {isRequestingQuote ? 'Requesting quote...' : 'Request delivery quote'}
            </button>

            {deliveryQuote ? (
              <p
                className="status-banner"
                data-cy="delivery-fee"
                data-testid="delivery-fee"
                aria-live="polite"
              >
                {`Quote ${deliveryQuote.deliveryQuoteId}: ${formatMoney(deliveryQuote.deliveryFee)} (${deliveryQuote.zone})`}
              </p>
            ) : null}

            {deliveryError ? (
              <p className="status-banner" data-cy="delivery-error" data-testid="delivery-error">
                {deliveryError}
              </p>
            ) : null}
          </div>

          <div className="cart-list" data-cy="cart-list" data-testid="cart-list">
            {cart.length === 0 ? (
              <p className="empty-state" data-cy="cart-empty" data-testid="cart-empty">
                Your cart is empty.
              </p>
            ) : (
              cart.map((item) => (
                <div key={item.sku} className="cart-item" data-cy="cart-item" data-testid="cart-item">
                  <div>
                    <strong data-cy="cart-item-name" data-testid="cart-item-name">{item.name}</strong>
                    <p>
                      {item.quantity} x {formatMoney(item.price)}
                    </p>
                  </div>

                  <div className="cart-actions">
                    <span data-cy="cart-item-total" data-testid="cart-item-total">
                      {formatMoney(item.price * item.quantity)}
                    </span>
                    <button
                      type="button"
                      className="link-button"
                      data-cy="remove-from-cart"
                      data-testid="remove-from-cart"
                      onClick={() => removeFromCart(item.sku)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="summary" aria-label="Order summary">
            <div className="summary-row">
              <span>Subtotal</span>
              <strong data-cy="subtotal" data-testid="subtotal">{formatMoney(subtotal)}</strong>
            </div>
            <div className="summary-row">
              <span>Tax</span>
              <strong data-cy="tax" data-testid="tax">{formatMoney(tax)}</strong>
            </div>
            <div className="summary-row">
              <span>Shipping</span>
              <strong data-cy="shipping" data-testid="shipping">{formatMoney(shipping)}</strong>
            </div>
            <div className="summary-row total-row">
              <span>Total</span>
              <strong data-cy="total" data-testid="total">{formatMoney(total)}</strong>
            </div>
          </div>

          <form
            className="checkout-form"
            data-cy="checkout-form"
            data-testid="checkout-form"
            onSubmit={handleCheckout}
          >
            <label>
              Customer name
              <input
                data-cy="checkout-name"
                data-testid="checkout-name"
                type="text"
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                placeholder="Amina Walker"
              />
            </label>

            <label>
              Email
              <input
                data-cy="checkout-email"
                data-testid="checkout-email"
                type="email"
                value={customerEmail}
                onChange={(event) => setCustomerEmail(event.target.value)}
                placeholder="amina@example.com"
              />
            </label>

            <label>
              Delivery notes
              <textarea
                data-cy="checkout-notes"
                data-testid="checkout-notes"
                value={deliveryNotes}
                onChange={(event) => setDeliveryNotes(event.target.value)}
                placeholder="Leave at the front desk"
                rows={3}
              />
            </label>

            <button
              type="submit"
              className="action-button primary"
              data-cy="checkout-submit"
              data-testid="btn-checkout"
              disabled={!canCheckout}
            >
              {isSubmitting ? 'Submitting...' : 'Submit checkout'}
            </button>

            <p
              className="status-banner"
              data-cy="checkout-status"
              data-testid="checkout-success"
              aria-live="polite"
            >
              {checkoutStatus}
            </p>
          </form>
        </aside>
      </section>
    </main>
  )
}

export default App
