import { useState, useEffect } from "react";

const SHOPIFY_DOMAIN = "stb-4219.myshopify.com";
const STOREFRONT_ACCESS_TOKEN = "a64dd51a0b0ac5b428d9cb11c55de8cf";
const LOGO = "https://raw.githubusercontent.com/bpichhi-star/stb-store/main/LOGO.png";

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  --black: #080808; --white: #f8f6f2; --off-white: #ede9e3;
  --gold: #b8924a; --gold-light: #d4aa6a;
  --gray: #141414; --gray-mid: #222; --gray-light: #3a3a3a;
  --text-muted: #666; --text-dim: #999; --border: rgba(255,255,255,0.08);
}
html { scroll-behavior: smooth; }
body { background: var(--black); color: var(--white); font-family: 'DM Sans', sans-serif; min-height: 100vh; -webkit-font-smoothing: antialiased; }
.stb-header {
  position: fixed; top: 0; left: 0; right: 0; z-index: 100;
  background: rgba(8,8,8,0.92); backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--border);
  padding: 0 48px; height: 68px;
  display: flex; align-items: center; justify-content: space-between;
}
.stb-logo-img { height: 40px; width: auto; cursor: pointer; display: block; opacity: 0.95; }
.stb-header-right { display: flex; align-items: center; gap: 32px; }
.stb-cart-btn {
  background: none; border: none; color: var(--text-dim);
  font-family: 'DM Sans', sans-serif; font-size: 11px; letter-spacing: 3px;
  cursor: pointer; transition: color 0.2s; text-transform: uppercase; position: relative; padding: 0;
}
.stb-cart-btn:hover { color: var(--white); }
.stb-cart-count {
  position: absolute; top: -8px; right: -12px;
  background: var(--gold); color: var(--black);
  width: 16px; height: 16px; border-radius: 50%;
  font-size: 9px; font-weight: 600; display: flex; align-items: center; justify-content: center;
}
.stb-hero {
  min-height: 100vh; display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  background: var(--black); text-align: center; padding: 80px 48px 60px;
  position: relative; overflow: hidden;
}
.stb-hero::before {
  content: ''; position: absolute; inset: 0;
  background: radial-gradient(ellipse 60% 50% at 50% 60%, rgba(184,146,74,0.06) 0%, transparent 70%);
  pointer-events: none;
}
.stb-hero-eyebrow {
  font-family: 'DM Sans', sans-serif; font-size: 10px; letter-spacing: 6px;
  color: var(--gold); text-transform: uppercase; margin-bottom: 32px; opacity: 0.8;
}
.stb-hero-title {
  font-family: 'Cormorant Garamond', serif; font-size: clamp(64px, 10vw, 130px);
  font-weight: 300; letter-spacing: 2px; line-height: 0.95; color: var(--white); margin-bottom: 28px;
}
.stb-hero-title em { font-style: italic; color: var(--gold-light); }
.stb-hero-rule { width: 40px; height: 1px; background: var(--gold); opacity: 0.5; margin: 0 auto 28px; }
.stb-hero-sub { font-family: 'Cormorant Garamond', serif; font-size: clamp(16px, 2vw, 22px);
  font-weight: 300; font-style: italic; letter-spacing: 1px; color: var(--text-dim); max-width: 400px;
}
.stb-collection-bar {
  position: sticky; top: 68px; z-index: 90;
  background: rgba(8,8,8,0.95); backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--border);
  display: flex; align-items: center; justify-content: center; gap: 0; padding: 0 48px;
}
.stb-filter-btn {
  background: none; border: none; color: var(--text-muted);
  font-family: 'DM Sans', sans-serif; font-size: 10px; letter-spacing: 4px;
  padding: 20px 28px; cursor: pointer; transition: color 0.2s;
  text-transform: uppercase; border-bottom: 1px solid transparent; margin-bottom: -1px; white-space: nowrap;
}
.stb-filter-btn:hover { color: var(--white); }
.stb-filter-btn.active { color: var(--white); border-bottom-color: var(--gold); }
.stb-grid-section { padding: 80px 48px; }
.stb-section-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 48px; padding-bottom: 20px; border-bottom: 1px solid var(--border);
}
.stb-section-title {
  font-family: 'Cormorant Garamond', serif; font-size: 13px; font-weight: 400;
  letter-spacing: 5px; text-transform: uppercase; color: var(--text-muted);
}
.stb-section-count { font-family: 'DM Sans', sans-serif; font-size: 10px; letter-spacing: 2px; color: var(--text-muted); opacity: 0.6; }
.stb-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2px; }
.stb-card { background: var(--gray); cursor: pointer; position: relative; overflow: hidden; }
.stb-card-img-wrap { position: relative; overflow: hidden; }
.stb-card-img { width: 100%; aspect-ratio: 3/4; object-fit: cover; display: block; background: var(--gray-mid); transition: transform 0.6s cubic-bezier(0.25,0.46,0.45,0.94); }
.stb-card:hover .stb-card-img { transform: scale(1.04); }
.stb-card-img-placeholder {
  width: 100%; aspect-ratio: 3/4; background: var(--gray-mid);
  display: flex; align-items: center; justify-content: center;
  font-family: 'Cormorant Garamond', serif; font-size: 36px; font-style: italic; color: var(--gray-light);
}
.stb-card-overlay {
  position: absolute; inset: 0; background: rgba(8,8,8,0.4);
  opacity: 0; transition: opacity 0.3s; display: flex; align-items: flex-end; padding: 28px;
}
.stb-card:hover .stb-card-overlay { opacity: 1; }
.stb-quick-add {
  background: var(--white); color: var(--black); border: none; padding: 14px 28px;
  font-family: 'DM Sans', sans-serif; font-size: 10px; letter-spacing: 3px; font-weight: 500;
  cursor: pointer; text-transform: uppercase; width: 100%; transition: background 0.2s;
}
.stb-quick-add:hover { background: var(--off-white); }
.stb-card-info { padding: 20px 24px 24px; }
.stb-card-name {
  font-family: 'Cormorant Garamond', serif; font-size: 17px; font-weight: 400;
  letter-spacing: 0.5px; margin-bottom: 6px; color: var(--white);
}
.stb-card-tag { font-size: 9px; color: var(--gold); letter-spacing: 3px; text-transform: uppercase; margin-bottom: 8px; }
.stb-card-price { font-family: 'DM Sans', sans-serif; font-size: 13px; letter-spacing: 1px; color: var(--text-dim); }
.stb-skeleton { background: linear-gradient(90deg, var(--gray) 25%, var(--gray-mid) 50%, var(--gray) 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
.stb-modal-bg {
  position: fixed; inset: 0; background: rgba(0,0,0,0.75); z-index: 200;
  display: flex; align-items: center; justify-content: center; padding: 24px; backdrop-filter: blur(8px);
}
.stb-modal {
  background: var(--gray); max-width: 880px; width: 100%;
  display: grid; grid-template-columns: 1fr 1fr; max-height: 92vh; overflow: auto; border: 1px solid var(--border);
}
.stb-modal-img { width: 100%; aspect-ratio: 3/4; object-fit: cover; background: var(--gray-mid); display: block; }
.stb-modal-img-placeholder {
  width: 100%; aspect-ratio: 3/4; background: var(--gray-mid);
  display: flex; align-items: center; justify-content: center;
  font-family: 'Cormorant Garamond', serif; font-size: 48px; font-style: italic; color: var(--gray-light);
}
.stb-modal-info { padding: 48px 40px; display: flex; flex-direction: column; }
.stb-modal-close {
  align-self: flex-end; background: none; border: none; color: var(--text-muted);
  font-size: 20px; cursor: pointer; line-height: 1; margin-bottom: 36px; transition: color 0.2s;
}
.stb-modal-close:hover { color: var(--white); }
.stb-modal-tag { font-size: 9px; letter-spacing: 4px; color: var(--gold); text-transform: uppercase; margin-bottom: 12px; }
.stb-modal-title {
  font-family: 'Cormorant Garamond', serif; font-size: 32px; font-weight: 300;
  letter-spacing: 1px; line-height: 1.15; margin-bottom: 16px;
}
.stb-modal-rule { width: 32px; height: 1px; background: var(--gold); opacity: 0.4; margin-bottom: 24px; }
.stb-modal-price { font-family: 'DM Sans', sans-serif; font-size: 16px; letter-spacing: 2px; color: var(--text-dim); margin-bottom: 36px; }
.stb-size-label { font-size: 9px; letter-spacing: 4px; color: var(--text-muted); margin-bottom: 14px; text-transform: uppercase; }
.stb-sizes { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 36px; }
.stb-size-btn {
  background: none; border: 1px solid var(--gray-light); color: var(--text-muted);
  width: 48px; height: 48px; font-family: 'DM Sans', sans-serif; font-size: 11px; cursor: pointer; transition: all 0.2s;
}
.stb-size-btn:hover { border-color: var(--white); color: var(--white); }
.stb-size-btn.selected { border-color: var(--gold); color: var(--gold); }
.stb-size-btn.unavailable { opacity: 0.25; cursor: not-allowed; text-decoration: line-through; }
.stb-add-btn {
  background: var(--white); color: var(--black); border: none; padding: 18px;
  font-family: 'DM Sans', sans-serif; font-size: 11px; letter-spacing: 4px; font-weight: 500;
  cursor: pointer; transition: background 0.2s; text-transform: uppercase; margin-top: auto;
}
.stb-add-btn:hover { background: var(--off-white); }
.stb-add-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.stb-cart-drawer {
  position: fixed; top: 0; right: 0; width: 400px; height: 100vh;
  background: var(--gray); z-index: 300; transform: translateX(100%);
  transition: transform 0.4s cubic-bezier(0.4,0,0.2,1);
  display: flex; flex-direction: column; border-left: 1px solid var(--border);
}
.stb-cart-drawer.open { transform: translateX(0); }
.stb-cart-header { padding: 32px 36px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); }
.stb-cart-title { font-family: 'Cormorant Garamond', serif; font-size: 20px; font-weight: 300; letter-spacing: 4px; text-transform: uppercase; }
.stb-cart-close { background: none; border: none; color: var(--text-muted); font-size: 18px; cursor: pointer; }
.stb-cart-items { flex: 1; overflow-y: auto; padding: 28px 36px; }
.stb-cart-item { display: flex; gap: 16px; padding: 20px 0; border-bottom: 1px solid var(--border); }
.stb-cart-item-name { font-family: 'Cormorant Garamond', serif; font-size: 15px; margin-bottom: 4px; }
.stb-cart-item-variant { font-size: 10px; color: var(--text-muted); letter-spacing: 2px; text-transform: uppercase; }
.stb-cart-item-price { font-size: 12px; color: var(--text-dim); margin-top: 8px; }
.stb-cart-empty { text-align: center; padding: 80px 36px; color: var(--text-muted); font-family: 'Cormorant Garamond', serif; font-size: 16px; font-style: italic; }
.stb-cart-footer { padding: 28px 36px; border-top: 1px solid var(--border); }
.stb-cart-total { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 24px; }
.stb-cart-total-label { font-size: 10px; letter-spacing: 4px; color: var(--text-muted); text-transform: uppercase; }
.stb-cart-total-amount { font-family: 'Cormorant Garamond', serif; font-size: 26px; font-weight: 300; color: var(--white); }
.stb-checkout-btn {
  width: 100%; background: var(--white); color: var(--black); border: none; padding: 18px;
  font-family: 'DM Sans', sans-serif; font-size: 11px; letter-spacing: 4px; font-weight: 500;
  cursor: pointer; transition: background 0.2s; text-transform: uppercase;
}
.stb-checkout-btn:hover { background: var(--off-white); }
.stb-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 250; }
.stb-toast {
  position: fixed; bottom: 40px; left: 50%; transform: translateX(-50%) translateY(20px);
  background: var(--white); color: var(--black); padding: 14px 32px; font-size: 10px;
  letter-spacing: 4px; font-weight: 500; z-index: 400; opacity: 0;
  transition: opacity 0.3s, transform 0.3s; text-transform: uppercase; white-space: nowrap;
}
.stb-toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
.stb-loading { display: flex; align-items: center; justify-content: center; padding: 120px; color: var(--text-muted); font-size: 10px; letter-spacing: 5px; }
@media (max-width: 900px) { .stb-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 640px) {
  .stb-header { padding: 0 24px; } .stb-hero { padding: 80px 24px 60px; }
  .stb-collection-bar { padding: 0 24px; overflow-x: auto; justify-content: flex-start; }
  .stb-grid-section { padding: 60px 24px; } .stb-grid { grid-template-columns: repeat(2, 1fr); gap: 1px; }
  .stb-modal { grid-template-columns: 1fr; } .stb-cart-drawer { width: 100%; }
}
`;

const COLLECTIONS = ["ALL", "STB", "NYC", "LA"];

const SHOPIFY_QUERY = `
  query getProducts {
    products(first: 50) {
      edges { node {
        id title tags
        priceRange { minVariantPrice { amount currencyCode } }
        images(first: 1) { edges { node { url altText } } }
        variants(first: 20) { edges { node { id title availableForSale selectedOptions { name value } } } }
      } }
    }
  }
`;

async function shopifyFetch(query) {
  const res = await fetch(`https://${SHOPIFY_DOMAIN}/api/2024-01/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Storefront-Access-Token": STOREFRONT_ACCESS_TOKEN },
    body: JSON.stringify({ query }),
  });
  return res.json();
}

function formatPrice(amount) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

function getTag(tags) {
  if (!tags) return "";
  if (tags.includes("STB")) return "STB";
  if (tags.includes("NYC")) return "NYC";
  if (tags.includes("LA")) return "LA";
  return "";
}

export default function STBStore() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [collection, setCollection] = useState("ALL");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [toastVisible, setToastVisible] = useState(false);

  useEffect(() => {
    const el = document.createElement("style");
    el.textContent = STYLES;
    document.head.appendChild(el);
    let link = document.querySelector("link[rel~='icon']");
    if (!link) { link = document.createElement("link"); link.rel = "icon"; document.head.appendChild(link); }
    link.href = LOGO;
    return () => document.head.removeChild(el);
  }, []);

  useEffect(() => {
    shopifyFetch(SHOPIFY_QUERY).then(data => {
      setProducts(data?.data?.products?.edges?.map(e => e.node) || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filtered = collection === "ALL" ? products : products.filter(p => p.tags?.includes(collection));

  function showToast(msg) { setToast(msg); setToastVisible(true); setTimeout(() => setToastVisible(false), 2200); }

  function addToCart(product, variantId, size) {
    const price = parseFloat(product.priceRange.minVariantPrice.amount);
    setCart(prev => {
      const ex = prev.find(i => i.variantId === variantId);
      if (ex) return prev.map(i => i.variantId === variantId ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { id: product.id, variantId, title: product.title, size, price, qty: 1 }];
    });
    showToast("Added to bag");
  }

  function removeFromCart(variantId) { setCart(prev => prev.filter(i => i.variantId !== variantId)); }

  const cartTotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  async function checkout() {
    if (!cart.length) return;
    const lineItems = cart.map(i => `{ variantId: "${i.variantId}", quantity: ${i.qty} }`).join(", ");
    const data = await shopifyFetch(`mutation { checkoutCreate(input: { lineItems: [${lineItems}] }) { checkout { webUrl } } }`);
    const url = data?.data?.checkoutCreate?.checkout?.webUrl;
    if (url) window.location.href = url;
  }

  const sizeVariants = selectedProduct
    ? selectedProduct.variants.edges.map(e => ({
        id: e.node.id,
        size: e.node.selectedOptions.find(o => o.name === "Size")?.value || e.node.title,
        available: e.node.availableForSale,
      }))
    : [];

  const labels = { ALL: "All Pieces", STB: "STB Collection", NYC: "New York City", LA: "Los Angeles" };

  return (
    <div className="stb-root">
      <header className="stb-header">
        <img src={LOGO} alt="STB" className="stb-logo-img" onClick={() => setCollection("ALL")} />
        <div className="stb-header-right">
          <button className="stb-cart-btn" onClick={() => setCartOpen(true)}>
            Bag {cartCount > 0 && <span className="stb-cart-count">{cartCount}</span>}
          </button>
        </div>
      </header>

      <section className="stb-hero">
        <div className="stb-hero-eyebrow">Est. 2024 — New York</div>
        <h1 className="stb-hero-title">Strictly<br /><em>Thee Best</em></h1>
        <div className="stb-hero-rule"></div>
        <p className="stb-hero-sub">Dressed for those who never settle</p>
      </section>

      <div className="stb-collection-bar">
        {COLLECTIONS.map(c => (
          <button key={c} className={`stb-filter-btn${collection === c ? " active" : ""}`} onClick={() => setCollection(c)}>
            {c === "ALL" ? "All" : c}
          </button>
        ))}
      </div>

      <section className="stb-grid-section">
        <div className="stb-section-header">
          <span className="stb-section-title">{labels[collection]}</span>
          <span className="stb-section-count">{loading ? "" : `${filtered.length} pieces`}</span>
        </div>
        {loading ? <div className="stb-loading">Loading</div> : (
          <div className="stb-grid">
            {filtered.map(p => {
              const img = p.images.edges[0]?.node;
              const tag = getTag(p.tags);
              return (
                <div key={p.id} className="stb-card" onClick={() => { setSelectedProduct(p); setSelectedSize(null); }}>
                  <div className="stb-card-img-wrap">
                    {img ? <img src={img.url} alt={img.altText || p.title} className="stb-card-img" />
                         : <div className="stb-card-img-placeholder stb-skeleton">{p.title[0]}</div>}
                    <div className="stb-card-overlay">
                      <button className="stb-quick-add" onClick={e => { e.stopPropagation(); setSelectedProduct(p); setSelectedSize(null); }}>View Piece</button>
                    </div>
                  </div>
                  <div className="stb-card-info">
                    {tag && <div className="stb-card-tag">{tag}</div>}
                    <div className="stb-card-name">{p.title}</div>
                    <div className="stb-card-price">{formatPrice(p.priceRange.minVariantPrice.amount)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {selectedProduct && (
        <div className="stb-modal-bg" onClick={() => setSelectedProduct(null)}>
          <div className="stb-modal" onClick={e => e.stopPropagation()}>
            {selectedProduct.images.edges[0]?.node
              ? <img src={selectedProduct.images.edges[0].node.url} alt={selectedProduct.title} className="stb-modal-img" />
              : <div className="stb-modal-img-placeholder">{selectedProduct.title[0]}</div>}
            <div className="stb-modal-info">
              <button className="stb-modal-close" onClick={() => setSelectedProduct(null)}>✕</button>
              {getTag(selectedProduct.tags) && <div className="stb-modal-tag">{getTag(selectedProduct.tags)} Collection</div>}
              <h2 className="stb-modal-title">{selectedProduct.title}</h2>
              <div className="stb-modal-rule"></div>
              <div className="stb-modal-price">{formatPrice(selectedProduct.priceRange.minVariantPrice.amount)}</div>
              <div className="stb-size-label">Select Size</div>
              <div className="stb-sizes">
                {sizeVariants.map(v => (
                  <button key={v.id}
                    className={`stb-size-btn${selectedSize?.id === v.id ? " selected" : ""}${!v.available ? " unavailable" : ""}`}
                    disabled={!v.available} onClick={() => setSelectedSize(v)}>{v.size}</button>
                ))}
              </div>
              <button className="stb-add-btn" disabled={!selectedSize}
                onClick={() => { addToCart(selectedProduct, selectedSize.id, selectedSize.size); setSelectedProduct(null); }}>
                {selectedSize ? "Add to Bag" : "Select a Size"}
              </button>
            </div>
          </div>
        </div>
      )}

      {cartOpen && <div className="stb-overlay" onClick={() => setCartOpen(false)} />}
      <div className={`stb-cart-drawer${cartOpen ? " open" : ""}`}>
        <div className="stb-cart-header">
          <span className="stb-cart-title">Your Bag</span>
          <button className="stb-cart-close" onClick={() => setCartOpen(false)}>✕</button>
        </div>
        <div className="stb-cart-items">
          {cart.length === 0 ? <div className="stb-cart-empty">Your bag is empty</div>
            : cart.map(item => (
              <div key={item.variantId} className="stb-cart-item">
                <div style={{ flex: 1 }}>
                  <div className="stb-cart-item-name">{item.title}</div>
                  <div className="stb-cart-item-variant">Size: {item.size} · Qty: {item.qty}</div>
                  <div className="stb-cart-item-price">{formatPrice(item.price * item.qty)}</div>
                </div>
                <button onClick={() => removeFromCart(item.variantId)} style={{ background:"none",border:"none",color:"var(--text-muted)",cursor:"pointer",fontSize:"16px",alignSelf:"flex-start" }}>✕</button>
              </div>
            ))}
        </div>
        {cart.length > 0 && (
          <div className="stb-cart-footer">
            <div className="stb-cart-total">
              <span className="stb-cart-total-label">Total</span>
              <span className="stb-cart-total-amount">{formatPrice(cartTotal)}</span>
            </div>
            <button className="stb-checkout-btn" onClick={checkout}>Proceed to Checkout</button>
          </div>
        )}
      </div>

      <div className={`stb-toast${toastVisible ? " show" : ""}`}>{toast}</div>
    </div>
  );
}
