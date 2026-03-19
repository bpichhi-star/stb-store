import { useState, useEffect, useCallback } from 'react'

const STOREFRONT_TOKEN = 'a64dd51a0b0ac5b428d9cb11c55de8cf'
const SHOP_DOMAIN = 'stb-4219.myshopify.com'
const API_URL = `https://${SHOP_DOMAIN}/api/2024-01/graphql.json`

const PRODUCTS_QUERY = `
  query GetProducts($tag: String) {
    products(first: 50, query: $tag) {
      edges {
        node {
          id
          title
          handle
          tags
          priceRange { minVariantPrice { amount currencyCode } }
          images(first: 1) { edges { node { url altText } } }
          variants(first: 10) {
            edges {
              node {
                id
                title
                availableForSale
                price { amount currencyCode }
              }
            }
          }
        }
      }
    }
  }
`

const CREATE_CART_MUTATION = `
  mutation CreateCart($lines: [CartLineInput!]!) {
    cartCreate(input: { lines: $lines }) {
      cart {
        id
        checkoutUrl
        lines(first: 10) {
          edges {
            node {
              id
              quantity
              merchandise {
                ... on ProductVariant {
                  id
                  title
                  product { title }
                  price { amount currencyCode }
                }
              }
            }
          }
        }
        cost { totalAmount { amount currencyCode } }
      }
    }
  }
`

const ADD_CART_LINES_MUTATION = `
  mutation AddCartLines($cartId: ID!, $lines: [CartLineInput!]!) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
      cart {
        id
        checkoutUrl
        lines(first: 10) {
          edges {
            node {
              id
              quantity
              merchandise {
                ... on ProductVariant {
                  id
                  title
                  product { title }
                  price { amount currencyCode }
                }
              }
            }
          }
        }
        cost { totalAmount { amount currencyCode } }
      }
    }
  }
`

async function shopifyFetch(query, variables = {}) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': STOREFRONT_TOKEN
    },
    body: JSON.stringify({ query, variables })
  })
  const json = await res.json()
  if (json.errors) throw new Error(json.errors[0].message)
  return json.data
}

const COLLECTIONS = [
  { value: 'ALL', label: 'All Collection' },
  { value: 'STB', label: 'STB Collection' },
  { value: 'NYC', label: 'NYC Collection' },
  { value: 'LA', label: 'LA Collection' },
]

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --black: #0a0a0a;
    --white: #f5f5f0;
    --gold: #c9a84c;
    --gold-dim: #9a7a36;
    --gray: #1a1a1a;
    --gray-mid: #2a2a2a;
    --gray-light: #444;
    --text-muted: #888;
  }

  body {
    background: var(--black);
    color: var(--white);
    font-family: 'DM Sans', sans-serif;
    min-height: 100vh;
  }

  .stb-root {
    min-height: 100vh;
    background: var(--black);
  }

  /* HEADER */
  .stb-header {
    position: sticky;
    top: 0;
    z-index: 100;
    background: rgba(10,10,10,0.95);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(201,168,76,0.2);
    padding: 0 40px;
    height: 72px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .stb-logo {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 28px;
    letter-spacing: 4px;
    color: var(--gold);
    cursor: pointer;
  }

  .stb-logo span {
    color: var(--white);
    font-size: 11px;
    letter-spacing: 3px;
    display: block;
    margin-top: -6px;
    font-family: 'DM Sans', sans-serif;
    font-weight: 300;
  }

  .stb-cart-btn {
    background: none;
    border: 1px solid rgba(201,168,76,0.4);
    color: var(--white);
    padding: 8px 20px;
    font-family: 'DM Sans', sans-serif;
    font-size: 13px;
    letter-spacing: 2px;
    cursor: pointer;
    transition: all 0.2s;
    position: relative;
  }

  .stb-cart-btn:hover {
    background: rgba(201,168,76,0.1);
    border-color: var(--gold);
  }

  .stb-cart-count {
    position: absolute;
    top: -6px;
    right: -6px;
    background: var(--gold);
    color: var(--black);
    width: 18px;
    height: 18px;
    border-radius: 50%;
    font-size: 10px;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* HERO */
  .stb-hero {
    height: 420px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: linear-gradient(180deg, #111 0%, var(--black) 100%);
    border-bottom: 1px solid rgba(201,168,76,0.15);
    text-align: center;
    padding: 40px;
  }

  .stb-hero-title {
    font-family: 'Bebas Neue', sans-serif;
    font-size: clamp(72px, 12vw, 140px);
    letter-spacing: 8px;
    line-height: 1;
    background: linear-gradient(135deg, var(--gold) 0%, #fff 50%, var(--gold) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .stb-hero-sub {
    font-family: 'DM Sans', sans-serif;
    font-size: 12px;
    letter-spacing: 5px;
    color: var(--text-muted);
    margin-top: 12px;
    text-transform: uppercase;
  }

  /* FILTERS */
  .stb-filters {
    display: flex;
    gap: 2px;
    padding: 32px 40px 0;
    border-bottom: 1px solid var(--gray-mid);
  }

  .stb-filter-btn {
    background: none;
    border: none;
    color: var(--text-muted);
    font-family: 'DM Sans', sans-serif;
    font-size: 12px;
    letter-spacing: 3px;
    padding: 12px 24px;
    cursor: pointer;
    transition: all 0.2s;
    text-transform: uppercase;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
  }

  .stb-filter-btn:hover { color: var(--white); }
  .stb-filter-btn.active {
    color: var(--gold);
    border-bottom-color: var(--gold);
  }

  /* GRID */
  .stb-grid-section { padding: 48px 40px; }

  .stb-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 2px;
  }

  .stb-card {
    background: var(--gray);
    cursor: pointer;
    transition: transform 0.3s;
    position: relative;
    overflow: hidden;
  }

  .stb-card:hover { transform: translateY(-4px); }
  .stb-card:hover .stb-card-overlay { opacity: 1; }

  .stb-card-img {
    width: 100%;
    aspect-ratio: 3/4;
    object-fit: cover;
    display: block;
    background: var(--gray-mid);
  }

  .stb-card-img-placeholder {
    width: 100%;
    aspect-ratio: 3/4;
    background: var(--gray-mid);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Bebas Neue', sans-serif;
    font-size: 48px;
    color: var(--gray-light);
    letter-spacing: 4px;
  }

  .stb-card-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0,0,0,0.5);
    opacity: 0;
    transition: opacity 0.3s;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .stb-quick-add {
    background: var(--gold);
    color: var(--black);
    border: none;
    padding: 14px 32px;
    font-family: 'DM Sans', sans-serif;
    font-size: 12px;
    letter-spacing: 2px;
    font-weight: 500;
    cursor: pointer;
    text-transform: uppercase;
    transition: background 0.2s;
  }

  .stb-quick-add:hover { background: #e0b85a; }

  .stb-card-info {
    padding: 16px 20px;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }

  .stb-card-name {
    font-size: 14px;
    font-weight: 500;
    letter-spacing: 1px;
  }

  .stb-card-tag {
    font-size: 10px;
    color: var(--text-muted);
    letter-spacing: 2px;
    margin-top: 4px;
    text-transform: uppercase;
  }

  .stb-card-price {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 22px;
    letter-spacing: 2px;
    color: var(--gold);
  }

  /* SKELETON */
  .stb-skeleton {
    background: linear-gradient(90deg, var(--gray) 25%, var(--gray-mid) 50%, var(--gray) 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
  }

  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  /* MODAL */
  .stb-modal-bg {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.85);
    z-index: 200;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    backdrop-filter: blur(4px);
  }

  .stb-modal {
    background: var(--gray);
    max-width: 800px;
    width: 100%;
    display: grid;
    grid-template-columns: 1fr 1fr;
    max-height: 90vh;
    overflow: auto;
    border: 1px solid rgba(201,168,76,0.2);
  }

  .stb-modal-img {
    width: 100%;
    aspect-ratio: 3/4;
    object-fit: cover;
    background: var(--gray-mid);
  }

  .stb-modal-img-placeholder {
    width: 100%;
    aspect-ratio: 3/4;
    background: var(--gray-mid);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Bebas Neue', sans-serif;
    font-size: 64px;
    color: var(--gray-light);
    letter-spacing: 4px;
  }

  .stb-modal-info {
    padding: 40px 32px;
    display: flex;
    flex-direction: column;
  }

  .stb-modal-close {
    align-self: flex-end;
    background: none;
    border: none;
    color: var(--text-muted);
    font-size: 24px;
    cursor: pointer;
    line-height: 1;
    margin-bottom: 24px;
  }

  .stb-modal-close:hover { color: var(--white); }

  .stb-modal-tag {
    font-size: 10px;
    letter-spacing: 4px;
    color: var(--gold);
    text-transform: uppercase;
    margin-bottom: 8px;
  }

  .stb-modal-title {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 36px;
    letter-spacing: 3px;
    line-height: 1.1;
    margin-bottom: 16px;
  }

  .stb-modal-price {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 32px;
    color: var(--gold);
    letter-spacing: 2px;
    margin-bottom: 32px;
  }

  .stb-size-label {
    font-size: 11px;
    letter-spacing: 3px;
    color: var(--text-muted);
    margin-bottom: 12px;
    text-transform: uppercase;
  }

  .stb-sizes {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-bottom: 32px;
  }

  .stb-size-btn {
    background: none;
    border: 1px solid var(--gray-light);
    color: var(--white);
    width: 44px;
    height: 44px;
    font-family: 'DM Sans', sans-serif;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .stb-size-btn:hover, .stb-size-btn.selected {
    border-color: var(--gold);
    color: var(--gold);
  }

  .stb-size-btn.unavailable {
    opacity: 0.3;
    cursor: not-allowed;
    text-decoration: line-through;
  }

  .stb-add-btn {
    background: var(--gold);
    color: var(--black);
    border: none;
    padding: 16px;
    font-family: 'DM Sans', sans-serif;
    font-size: 13px;
    letter-spacing: 3px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
    text-transform: uppercase;
    margin-top: auto;
  }

  .stb-add-btn:hover { background: #e0b85a; }
  .stb-add-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  /* CART DRAWER */
  .stb-cart-drawer {
    position: fixed;
    top: 0;
    right: 0;
    width: 420px;
    height: 100vh;
    background: var(--gray);
    z-index: 300;
    transform: translateX(100%);
    transition: transform 0.35s cubic-bezier(0.4,0,0.2,1);
    display: flex;
    flex-direction: column;
    border-left: 1px solid rgba(201,168,76,0.2);
  }

  .stb-cart-drawer.open { transform: translateX(0); }

  .stb-cart-header {
    padding: 28px 32px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--gray-mid);
  }

  .stb-cart-title {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 24px;
    letter-spacing: 4px;
  }

  .stb-cart-close {
    background: none;
    border: none;
    color: var(--text-muted);
    font-size: 22px;
    cursor: pointer;
  }

  .stb-cart-items {
    flex: 1;
    overflow-y: auto;
    padding: 24px 32px;
  }

  .stb-cart-item {
    display: flex;
    gap: 16px;
    padding: 16px 0;
    border-bottom: 1px solid var(--gray-mid);
  }

  .stb-cart-item-name {
    font-size: 14px;
    font-weight: 500;
    margin-bottom: 4px;
  }

  .stb-cart-item-variant {
    font-size: 12px;
    color: var(--text-muted);
    letter-spacing: 1px;
  }

  .stb-cart-item-price {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 18px;
    color: var(--gold);
    margin-top: 8px;
    letter-spacing: 1px;
  }

  .stb-cart-empty {
    text-align: center;
    padding: 80px 32px;
    color: var(--text-muted);
    font-size: 14px;
    letter-spacing: 2px;
  }

  .stb-cart-footer {
    padding: 24px 32px;
    border-top: 1px solid var(--gray-mid);
  }

  .stb-cart-total {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }

  .stb-cart-total-label {
    font-size: 12px;
    letter-spacing: 3px;
    color: var(--text-muted);
    text-transform: uppercase;
  }

  .stb-cart-total-amount {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 28px;
    color: var(--gold);
    letter-spacing: 2px;
  }

  .stb-checkout-btn {
    width: 100%;
    background: var(--gold);
    color: var(--black);
    border: none;
    padding: 18px;
    font-family: 'DM Sans', sans-serif;
    font-size: 13px;
    letter-spacing: 3px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
    text-transform: uppercase;
  }

  .stb-checkout-btn:hover { background: #e0b85a; }

  .stb-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.6);
    z-index: 250;
  }

  /* TOAST */
  .stb-toast {
    position: fixed;
    bottom: 32px;
    left: 50%;
    transform: translateX(-50%) translateY(100px);
    background: var(--gold);
    color: var(--black);
    padding: 14px 28px;
    font-size: 12px;
    letter-spacing: 2px;
    font-weight: 500;
    z-index: 400;
    transition: transform 0.3s;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .stb-toast.show { transform: translateX(-50%) translateY(0); }

  /* LOADING */
  .stb-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 80px;
    color: var(--text-muted);
    font-size: 12px;
    letter-spacing: 4px;
  }

  @media (max-width: 640px) {
    .stb-header { padding: 0 20px; }
    .stb-hero { height: 300px; }
    .stb-filters { padding: 24px 20px 0; overflow-x: auto; }
    .stb-grid-section { padding: 32px 20px; }
    .stb-modal { grid-template-columns: 1fr; }
    .stb-cart-drawer { width: 100%; }
  }
`

export default function STBStore() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeCollection, setActiveCollection] = useState('ALL')
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [selectedVariant, setSelectedVariant] = useState(null)
  const [cart, setCart] = useState(null)
  const [cartOpen, setCartOpen] = useState(false)
  const [toast, setToast] = useState('')
  const [adding, setAdding] = useState(false)

  const fetchProducts = useCallback(async (collection) => {
    setLoading(true)
    try {
      const tag = collection === 'ALL' ? '' : `tag:${collection}`
      const data = await shopifyFetch(PRODUCTS_QUERY, { tag })
      setProducts(data.products.edges.map(e => e.node))
    } catch (err) {
      console.error('Fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchProducts(activeCollection) }, [activeCollection, fetchProducts])

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  const handleAddToCart = async () => {
    if (!selectedVariant || adding) return
    setAdding(true)
    try {
      let updatedCart
      if (!cart) {
        const data = await shopifyFetch(CREATE_CART_MUTATION, {
          lines: [{ merchandiseId: selectedVariant, quantity: 1 }]
        })
        updatedCart = data.cartCreate.cart
      } else {
        const data = await shopifyFetch(ADD_CART_LINES_MUTATION, {
          cartId: cart.id,
          lines: [{ merchandiseId: selectedVariant, quantity: 1 }]
        })
        updatedCart = data.cartLinesAdd.cart
      }
      setCart(updatedCart)
      setSelectedProduct(null)
      setSelectedVariant(null)
      showToast('Added to cart')
    } catch (err) {
      console.error('Cart error:', err)
      showToast('Error adding to cart')
    } finally {
      setAdding(false)
    }
  }

  const cartCount = cart?.lines?.edges?.reduce((acc, e) => acc + e.node.quantity, 0) || 0
  const cartTotal = cart?.cost?.totalAmount

  const formatPrice = (amount, currency = 'USD') =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)

  return (
    <>
      <style>{css}</style>
      <div className="stb-root">

        {/* Header */}
        <header className="stb-header">
          <div className="stb-logo" onClick={() => setActiveCollection('ALL')}>
            STB
            <span>Strictly Thee Best</span>
          </div>
          <button className="stb-cart-btn" onClick={() => setCartOpen(true)}>
            CART
            {cartCount > 0 && <span className="stb-cart-count">{cartCount}</span>}
          </button>
        </header>

        {/* Hero */}
        <section className="stb-hero">
          <h1 className="stb-hero-title">STB</h1>
          <p className="stb-hero-sub">Strictly Thee Best â Premium Apparel</p>
        </section>

        {/* Filters */}
        <nav className="stb-filters">
          {COLLECTIONS.map(col => (
            <button
              key={col}
              className={`stb-filter-btn ${activeCollection === col.value ? 'active' : ''}`}
              onClick={() => setActiveCollection(col.value)}
            >
              {col.label}
            </button>
          ))}
        </nav>

        {/* Grid */}
        <section className="stb-grid-section">
          {loading ? (
            <div className="stb-grid">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="stb-card">
                  <div className="stb-skeleton" style={{ width: '100%', aspectRatio: '3/4' }} />
                  <div style={{ padding: '16px 20px' }}>
                    <div className="stb-skeleton" style={{ height: 16, width: '60%', marginBottom: 8 }} />
                    <div className="stb-skeleton" style={{ height: 12, width: '30%' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="stb-loading">No products found</div>
          ) : (
            <div className="stb-grid">
              {products.map(product => {
                const img = product.images?.edges?.[0]?.node
                const price = product.priceRange?.minVariantPrice
                const tag = product.tags?.find(t => ['STB','NYC','LA'].includes(t)) || ''
                return (
                  <div
                    key={product.id}
                    className="stb-card"
                    onClick={() => { setSelectedProduct(product); setSelectedVariant(null) }}
                  >
                    {img
                      ? <img src={img.url} alt={img.altText || product.title} className="stb-card-img" />
                      : <div className="stb-card-img-placeholder">{tag || 'STB'}</div>
                    }
                    <div className="stb-card-overlay">
                      <button className="stb-quick-add" onClick={e => { e.stopPropagation(); setSelectedProduct(product); setSelectedVariant(null) }}>
                        Quick View
                      </button>
                    </div>
                    <div className="stb-card-info">
                      <div>
                        <div className="stb-card-name">{product.title}</div>
                        <div className="stb-card-tag">{tag} Collection</div>
                      </div>
                      <div className="stb-card-price">
                        {price ? formatPrice(price.amount, price.currencyCode) : '$â'}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Product Modal */}
        {selectedProduct && (
          <div className="stb-modal-bg" onClick={() => setSelectedProduct(null)}>
            <div className="stb-modal" onClick={e => e.stopPropagation()}>
              {(() => {
                const img = selectedProduct.images?.edges?.[0]?.node
                const price = selectedProduct.priceRange?.minVariantPrice
                const tag = selectedProduct.tags?.find(t => ['STB','NYC','LA'].includes(t)) || ''
                const variants = selectedProduct.variants?.edges?.map(e => e.node) || []
                return (
                  <>
                    {img
                      ? <img src={img.url} alt={img.altText} className="stb-modal-img" />
                      : <div className="stb-modal-img-placeholder">{tag || 'STB'}</div>
                    }
                    <div className="stb-modal-info">
                      <button className="stb-modal-close" onClick={() => setSelectedProduct(null)}>Ã</button>
                      <div className="stb-modal-tag">{tag} Collection</div>
                      <div className="stb-modal-title">{selectedProduct.title}</div>
                      <div className="stb-modal-price">
                        {price ? formatPrice(price.amount, price.currencyCode) : '$â'}
                      </div>
                      <div className="stb-size-label">Select Size</div>
                      <div className="stb-sizes">
                        {variants.map(v => (
                          <button
                            key={v.id}
                            className={`stb-size-btn ${selectedVariant === v.id ? 'selected' : ''} ${!v.availableForSale ? 'unavailable' : ''}`}
                            onClick={() => v.availableForSale && setSelectedVariant(v.id)}
                            disabled={!v.availableForSale}
                          >
                            {v.title}
                          </button>
                        ))}
                      </div>
                      <button
                        className="stb-add-btn"
                        onClick={handleAddToCart}
                        disabled={!selectedVariant || adding}
                      >
                        {adding ? 'Adding...' : selectedVariant ? 'Add to Cart' : 'Select a Size'}
                      </button>
                    </div>
                  </>
                )
              })()}
            </div>
          </div>
        )}

        {/* Cart Overlay */}
        {cartOpen && <div className="stb-overlay" onClick={() => setCartOpen(false)} />}

        {/* Cart Drawer */}
        <div className={`stb-cart-drawer ${cartOpen ? 'open' : ''}`}>
          <div className="stb-cart-header">
            <div className="stb-cart-title">Your Cart</div>
            <button className="stb-cart-close" onClick={() => setCartOpen(false)}>Ã</button>
          </div>
          <div className="stb-cart-items">
            {cartCount === 0 ? (
              <div className="stb-cart-empty">Your cart is empty</div>
            ) : (
              cart.lines.edges.map(({ node }) => (
                <div key={node.id} className="stb-cart-item">
                  <div>
                    <div className="stb-cart-item-name">{node.merchandise.product.title}</div>
                    <div className="stb-cart-item-variant">{node.merchandise.title} Â· Qty {node.quantity}</div>
                    <div className="stb-cart-item-price">
                      {formatPrice(node.merchandise.price.amount, node.merchandise.price.currencyCode)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          {cartCount > 0 && (
            <div className="stb-cart-footer">
              <div className="stb-cart-total">
                <span className="stb-cart-total-label">Total</span>
                <span className="stb-cart-total-amount">
                  {cartTotal ? formatPrice(cartTotal.amount, cartTotal.currencyCode) : 'â'}
                </span>
              </div>
              <button
                className="stb-checkout-btn"
                onClick={() => window.open(cart.checkoutUrl, '_blank')}
              >
                Checkout
              </button>
            </div>
          )}
        </div>

        {/* Toast */}
        <div className={`stb-toast ${toast ? 'show' : ''}`}>{toast}</div>

      </div>
    </>
  )
}
