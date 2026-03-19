import { useState, useEffect } from "react";
import heroPhoto from "./Landing.png";
import logoImg from "./logo.png";

// âââ Shopify Config âââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
const DOMAIN = "stb-4219.myshopify.com";
const TOKEN = "a64dd51a0b0ac5b428d9cb11c55de8cf";

const PRODUCTS_QUERY = `{
  products(first: 12) {
    edges {
      node {
        id title handle tags
        priceRange { minVariantPrice { amount currencyCode } }
        images(first: 1) { edges { node { url altText } } }
        variants(first: 20) { edges { node { id title availableForSale } } }
      }
    }
  }
}`;

const CREATE_CART_MUTATION = `mutation { cartCreate { cart { id checkoutUrl } } }`;

const ADD_LINE_MUTATION = (cartId, variantId) => `mutation {
  cartLinesAdd(cartId: "${cartId}", lines: [{ merchandiseId: "${variantId}", quantity: 1 }]) {
    cart { id totalQuantity checkoutUrl }
  }
}`;

async function shopify(query) {
  const res = await fetch(`https://${DOMAIN}/api/2024-01/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": TOKEN,
    },
    body: JSON.stringify({ query }),
  });
  const json = await res.json();
  return json.data;
}

// âââ Assets ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
const HERO_IMG = heroPhoto;
const COLLECTIONS = [
  { id: "NYC", label: "NYC Collection", sub: "Streets Never Sleep", img: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=900&q=85" },
  { id: "STB", label: "STB Collection", sub: "Strictly Thee Best", img: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=900&q=85" },
  { id: "LA", label: "LA Collection", sub: "Golden State of Mind", img: "https://images.unsplash.com/photo-1580655653885-65763b2597d0?w=900&q=85" },
];

// âââ Utilities âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
const fmtPrice = (p) => new Intl.NumberFormat("en-US", { style: "currency", currency: p.priceRange.minVariantPrice.currencyCode }).format(parseFloat(p.priceRange.minVariantPrice.amount));

// âââ Component âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
export default function STBStore() {
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [cart, setCart] = useState(null);
  const [cartQty, setCartQty] = useState(0);
  const [modal, setModal] = useState(null);
  const [variant, setVariant] = useState(null);
  const [adding, setAdding] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [accountTab, setAccountTab] = useState("signin");
  const [toast, setToast] = useState(null);
  const [navDark, setNavDark] = useState(false);

  useEffect(() => {
    const onScroll = () => setNavDark(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    shopify(PRODUCTS_QUERY)
      .then((d) => setProducts(d.products.edges.map((e) => e.node)))
      .finally(() => setLoadingProducts(false));
  }, []);

  const filtered = filter === "ALL" ? products : products.filter((p) => p.tags.includes(filter));

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const handleAddToCart = async () => {
    if (!variant) return;
    setAdding(true);
    try {
      let c = cart;
      if (!c) {
        const d = await shopify(CREATE_CART_MUTATION);
        c = d.cartCreate.cart;
        setCart(c);
      }
      const d = await shopify(ADD_LINE_MUTATION(c.id, variant.id));
      const updated = d.cartLinesAdd.cart;
      setCart(updated);
      setCartQty(updated.totalQuantity);
      setModal(null);
      setVariant(null);
      showToast("Added to cart");
    } finally {
      setAdding(false);
    }
  };

  const openCheckout = () => { if (cart?.checkoutUrl) window.open(cart.checkoutUrl, "_blank"); };
  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <>
      <style>{css}</style>
      <div className="stb">

        {/* ââ NAV ââ */}
        <nav className={`nav ${navDark ? "nav--dark" : ""}`}>
          <ul className="nav__links nav__links--left">
            {["NYC", "STB", "LA"].map((c) => (
              <li key={c}>
                <button className="nav__link" onClick={() => { setFilter(c); scrollTo("products"); }}>{c}</button>
              </li>
            ))}
            <li>
              <button className="nav__account-btn" onClick={() => setAccountOpen(true)} aria-label="Account">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="8" r="4"/>
                  <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                </svg>
              </button>
            </li>
          </ul>

          <button className="nav__logo" onClick={() => { setFilter("ALL"); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
            <img src={logoImg} className="nav__logo-img" alt="STB" />
          </button>

          <ul className="nav__links nav__links--right">
            <li><span className="nav__brand-text">Strictly Thee Best</span></li>
            <li>
              <button className="nav__link" onClick={() => scrollTo("products")}>Shop</button>
            </li>
            <li>
              <button className="nav__cart" onClick={openCheckout}>
                Bag {cartQty > 0 && <span className="nav__cart-count">{cartQty}</span>}
              </button>
            </li>
          </ul>
        </nav>

          {/* ââ HERO ââ */}
          <section className="hero">
            <img className="hero__img" src={HERO_IMG} alt="STB Editorial" />
            <div className="hero__veil" />
            <div className="hero__left">
              <div className="hero__divider-row">
                <span className="hero__line" />
                <p className="hero__for-all">For All</p>
               <span className="hero__line" />
             </div>
              <button className="hero__cta" onClick={() => scrollTo("collections")}>
               Explore the Collection
             </button>
            </div>
           <div className="hero__scroll-hint" aria-hidden="true"><span /></div>
          </section>

        {/* ââ MANIFESTO ââ */}
        <section className="manifesto">
          <div className="manifesto__left">
            <p className="label">Our Vision</p>
            <h2 className="manifesto__headline">Crafted for<br />the <em>Few</em>,<br />worn by<br />the Many.</h2>
          </div>
          <div className="manifesto__right">
            <p className="manifesto__copy">
              STB was built on one belief: excellence should be accessible. From the streets of New York to the coasts of Los Angeles, every piece is designed with intention â for those who move with purpose.
            </p>
            <button className="manifesto__link">Our Story â</button>
          </div>
        </section>

        {/* ââ COLLECTIONS ââ */}
        <section className="collections" id="collections">
          <div className="collections__head">
            <h2 className="section-title">Collections</h2>
            <div className="collections__nav">
              {COLLECTIONS.map((c) => (
                <button key={c.id} className={`collections__nav-btn ${filter === c.id ? "active" : ""}`} onClick={() => { setFilter(c.id); scrollTo("products"); }}>{c.label}</button>
              ))}
            </div>
          </div>
          <div className="collections__grid">
            {COLLECTIONS.map((c) => (
              <button key={c.id} className="coll-card" onClick={() => { setFilter(c.id); scrollTo("products"); }}>
                <img className="coll-card__img" src={c.img} alt={c.label} />
                <div className="coll-card__overlay" />
                <div className="coll-card__body">
                  <p className="coll-card__tag">{c.id}</p>
                  <p className="coll-card__name">{c.id}</p>
                  <p className="coll-card__sub">{c.sub}</p>
                  <span className="coll-card__shop">Shop Collection</span>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* ââ PRODUCTS ââ */}
        <section className="products" id="products">
          <div className="products__head">
            <h2 className="section-title">{filter === "ALL" ? "All Products" : `${filter} Collection`}</h2>
            <div className="filter-tabs">
              {["ALL", "NYC", "STB", "LA"].map((f) => (
                <button key={f} className={`filter-tab ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>{f}</button>
              ))}
            </div>
          </div>
          <div className="products__grid">
            {loadingProducts
              ? Array(3).fill(null).map((_, i) => (
                  <div key={i} className="product-card product-card--skel">
                    <div className="product-card__img-wrap skel" />
                    <div className="product-card__info">
                      <div className="skel skel--sm" /><div className="skel skel--md" /><div className="skel skel--xs" />
                    </div>
                  </div>
                ))
              : filtered.map((p) => {
                  const img = p.images.edges[0]?.node;
                  const coll = COLLECTIONS.find((c) => p.tags.includes(c.id));
                  return (
                    <button key={p.id} className="product-card" onClick={() => { setModal(p); setVariant(null); }}>
                      <div className="product-card__img-wrap">
                        {img ? <img src={img.url} alt={img.altText || p.title} /> : <div className="product-card__placeholder">STB</div>}
                        <div className="product-card__hover-label">Select Size</div>
                      </div>
                      <div className="product-card__info">
                        <p className="product-card__coll">{coll?.id ?? "STB"} Collection</p>
                        <p className="product-card__name">{p.title}</p>
                        <p className="product-card__price">{fmtPrice(p)}</p>
                      </div>
                    </button>
                  );
                })}
          </div>
        </section>

        {/* ââ FOOTER ââ */}
        <footer className="footer">
          <div className="footer__top">
            <div className="footer__brand">
              <img src={logoImg} className="footer__logo-img" alt="STB" />
              <p className="footer__for-all">For All</p>
            </div>
            <div className="footer__col">
              <p className="label">Collections</p>
              {COLLECTIONS.map((c) => (
                <button key={c.id} className="footer__link" onClick={() => { setFilter(c.id); scrollTo("products"); }}>{c.label}</button>
              ))}
            </div>
            <div className="footer__col">
              <p className="label">Company</p>
              <span className="footer__link">Our Story</span>
              <span className="footer__link">Contact</span>
            </div>
            <div className="footer__col">
              <p className="label">Support</p>
              <span className="footer__link">Shipping</span>
              <span className="footer__link">Returns</span>
              <span className="footer__link">Size Guide</span>
              <span className="footer__link">FAQ</span>
            </div>
          </div>
          <div className="footer__bottom">
            <p className="footer__copy">Â© 2025 Strictly Thee Best. All Rights Reserved.</p>
            <div className="footer__legal">
              <span className="footer__link">Privacy Policy</span>
              <span className="footer__link">Terms of Service</span>
            </div>
          </div>
        </footer>

        {/* ââ PRODUCT MODAL ââ */}
        {modal && (
          <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setModal(null)}>
            <div className="modal">
              <div className="modal__img-col">
                {modal.images.edges[0]
                  ? <img src={modal.images.edges[0].node.url} alt={modal.title} className="modal__img" />
                  : <div className="modal__img-placeholder">STB</div>}
              </div>
              <div className="modal__body">
                <button className="modal__close" onClick={() => setModal(null)}>â</button>
                <p className="modal__coll">{COLLECTIONS.find((c) => modal.tags.includes(c.id))?.id ?? "STB"} Collection</p>
                <h3 className="modal__name">{modal.title}</h3>
                <p className="modal__price">{fmtPrice(modal)}</p>
                <p className="label" style={{ marginBottom: 16 }}>Select Size</p>
                <div className="modal__sizes">
                  {modal.variants.edges.map(({ node: v }) => (
                    <button key={v.id} disabled={!v.availableForSale}
                      className={`size-btn ${variant?.id === v.id ? "size-btn--active" : ""} ${!v.availableForSale ? "size-btn--sold" : ""}`}
                      onClick={() => setVariant(v)}>{v.title}</button>
                  ))}
                </div>
                <button className="modal__add" disabled={!variant || adding} onClick={handleAddToCart}>
                  {adding ? "Addingâ¦" : variant ? "Add to Bag" : "Select a Size"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ââ TOAST ââ */}
        {toast && <div className="toast">{toast}</div>}
      </div>
    </>

      {/* ── ACCOUNT MODAL ── */}
      {accountOpen && (
        <div className="account-overlay" onClick={() => setAccountOpen(false)}>
          <div className="account-modal" onClick={e => e.stopPropagation()}>
            <button className="account-modal__close" onClick={() => setAccountOpen(false)}>✕</button>
            <div className="account-modal__tabs">
              <button
                className={"account-modal__tab" + (accountTab === "signin" ? " active" : "")}
                onClick={() => setAccountTab("signin")}>Sign In</button>
              <button
                className={"account-modal__tab" + (accountTab === "create" ? " active" : "")}
                onClick={() => setAccountTab("create")}>Create Account</button>
            </div>
            {accountTab === "signin" && (
              <div className="account-modal__form">
                <p className="account-modal__sub">Welcome back</p>
                <input className="account-modal__input" type="email" placeholder="Email address" />
                <input className="account-modal__input" type="password" placeholder="Password" />
                <button className="account-modal__cta">SIGN IN</button>
                <p className="account-modal__forgot">Forgot your password?</p>
              </div>
            )}
            {accountTab === "create" && (
              <div className="account-modal__form">
                <p className="account-modal__sub">Join STB</p>
                <input className="account-modal__input" type="text" placeholder="First name" />
                <input className="account-modal__input" type="text" placeholder="Last name" />
                <input className="account-modal__input" type="email" placeholder="Email address" />
                <input className="account-modal__input" type="password" placeholder="Password" />
                <button className="account-modal__cta">CREATE ACCOUNT</button>
                <p className="account-modal__forgot">Track orders · Save favorites · Early access</p>
              </div>
            )}
          </div>
        </div>
      )}
  );
}

// âââ Styles ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
const css = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Barlow+Condensed:wght@300;400;500;600&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
:root { --black: #080808; --cream: #F2EDE5; --gold: #BFA065; --dim: #141414; --grey: rgba(242,237,229,0.45); --divider: rgba(242,237,229,0.1); }
html { scroll-behavior: smooth; }
.stb { font-family: 'Barlow Condensed', sans-serif; background: var(--black); color: var(--cream); min-height: 100vh; overflow-x: hidden; }
.label { font-size: 10px; font-weight: 600; letter-spacing: 0.45em; text-transform: uppercase; color: var(--gold); margin-bottom: 24px; }
.section-title { font-family: 'Cormorant Garamond', serif; font-weight: 300; font-size: clamp(36px, 4.5vw, 60px); color: var(--cream); line-height: 1; }

/* NAV */
.nav { position: fixed; inset: 0 0 auto 0; z-index: 100; height: 72px; padding: 0 48px; display: flex; align-items: center; justify-content: space-between; transition: background .4s, border-color .4s; border-bottom: 1px solid transparent; }
.nav--dark { background: var(--black); border-bottom-color: var(--divider); }
.nav__links { display: flex; list-style: none; gap: 32px; flex: 1; align-items: center; }
.nav__links--right { justify-content: flex-end; }
.nav__link { font-size: 12px; font-weight: 600; letter-spacing: 0.22em; text-transform: uppercase; color: var(--cream); background: none; border: none; cursor: pointer; opacity: .75; transition: opacity .2s; padding: 0; }
.nav__link:hover { opacity: 1; }
.nav__brand-text { font-family: 'Cormorant Garamond', serif; font-size: 13px; font-weight: 400; letter-spacing: 0.2em; color: var(--gold); white-space: nowrap; }
.nav__logo { background: none; border: none; cursor: pointer; display: flex; align-items: center; padding: 0; }
.nav__logo-img { height: 44px; width: auto; object-fit: contain; filter: brightness(1); }
.nav__cart { position: relative; font-size: 12px; font-weight: 600; letter-spacing: 0.22em; text-transform: uppercase; color: var(--cream); background: none; border: none; cursor: pointer; opacity: .75; transition: opacity .2s; padding: 0; }
.nav__cart:hover { opacity: 1; }
.nav__cart-count { position: absolute; top: -9px; right: -14px; background: var(--gold); color: var(--black); width: 18px; height: 18px; border-radius: 50%; font-size: 9px; font-weight: 700; display: flex; align-items: center; justify-content: center; }

/* HERO */
.hero { position: relative; height: 100vh; min-height: 700px; display: flex; flex-direction: column; align-items: center; justify-content: center; overflow: hidden; margin-top: 72px; }
.hero__img { position: absolute; inset: -72px 0 0 0; width: 100%; height: calc(100% + 72px); object-fit: cover; object-position: center 15%; filter: brightness(.55) saturate(.9); transform: scale(1.04); animation: heroZoom 9s ease forwards; }
@keyframes heroZoom { from { transform: scale(1.04); } to { transform: scale(1.00); } }
.hero__veil { position: absolute; inset: 0; background: radial-gradient(ellipse 70% 60% at 50% 50%, transparent 30%, rgba(8,8,8,.55) 100%), linear-gradient(to bottom, rgba(8,8,8,.45) 0%, transparent 30%, transparent 65%, rgba(8,8,8,.85) 100%); }
.hero__center { position: relative; text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 0; animation: heroReveal 1.4s cubic-bezier(.16,1,.3,1) .1s both; margin-right: 6vw; }
@keyframes heroReveal { from { opacity: 0; transform: translateY(28px); } to { opacity: 1; transform: translateY(0); } }
.hero__season { font-size: 10px; font-weight: 600; letter-spacing: .6em; text-transform: uppercase; color: var(--gold); margin-bottom: 28px; }
.hero__logo-img { width: clamp(220px, 30vw, 400px); height: auto; object-fit: contain; margin-bottom: 32px; mix-blend-mode: screen; animation: heroReveal 1.4s cubic-bezier(.16,1,.3,1) .35s both; }
.hero__divider-row { display: flex; align-items: center; gap: 20px; width: 100%; max-width: 400px; margin-bottom: 44px; }
.hero__line { flex: 1; height: 1px; background: rgba(242,237,229,.25); }
.hero__for-all { font-size: 11px; font-weight: 600; letter-spacing: .75em; text-transform: uppercase; color: rgba(242,237,229,.6); white-space: nowrap; }
.hero__cta { display: inline-block; padding: 15px 56px; border: 1px solid rgba(242,237,229,.5); font-family: 'Barlow Condensed', sans-serif; font-size: 11px; font-weight: 700; letter-spacing: .45em; text-transform: uppercase; color: var(--cream); background: transparent; cursor: pointer; transition: background .3s, color .3s, border-color .3s; }
.hero__cta:hover { background: var(--cream); color: var(--black); border-color: var(--cream); }
.hero__scroll-hint { position: absolute; bottom: 28px; left: 50%; transform: translateX(-50%); pointer-events: none; }
.hero__scroll-hint span { display: block; width: 1px; height: 48px; background: linear-gradient(to bottom, rgba(242,237,229,.6), transparent); margin: auto; animation: scrollPulse 2.5s ease infinite; }
@keyframes scrollPulse { 0%,100% { opacity: .35; } 50% { opacity: .85; } }

/* MANIFESTO */
.manifesto { display: grid; grid-template-columns: 1fr 1fr; border-top: 1px solid var(--divider); border-bottom: 1px solid var(--divider); }
.manifesto__left { padding: 112px 72px 112px 64px; border-right: 1px solid var(--divider); }
.manifesto__right { padding: 112px 64px 112px 72px; display: flex; flex-direction: column; justify-content: flex-end; }
.manifesto__headline { font-family: 'Cormorant Garamond', serif; font-weight: 300; font-size: clamp(44px, 5.5vw, 80px); line-height: 1.05; color: var(--cream); margin-top: 8px; }
.manifesto__headline em { font-style: italic; color: var(--gold); }
.manifesto__copy { font-size: 15px; font-weight: 300; letter-spacing: .05em; line-height: 1.85; color: var(--grey); max-width: 420px; margin-bottom: 40px; }
.manifesto__link { font-size: 11px; font-weight: 600; letter-spacing: .35em; text-transform: uppercase; color: var(--cream); background: none; border: none; border-bottom: 1px solid var(--gold); padding-bottom: 3px; cursor: pointer; transition: color .2s; width: fit-content; }
.manifesto__link:hover { color: var(--gold); }

/* COLLECTIONS */
.collections__head { display: flex; align-items: baseline; justify-content: space-between; padding: 88px 64px 48px; }
.collections__nav { display: flex; gap: 36px; }
.collections__nav-btn { font-size: 11px; font-weight: 600; letter-spacing: .3em; text-transform: uppercase; color: var(--grey); background: none; border: none; cursor: pointer; transition: color .2s; padding: 0; }
.collections__nav-btn:hover, .collections__nav-btn.active { color: var(--gold); }
.collections__grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: var(--divider); }
.coll-card { position: relative; aspect-ratio: 3/4; overflow: hidden; background: var(--dim); border: none; cursor: pointer; display: block; width: 100%; padding: 0; }
.coll-card__img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: center top; filter: brightness(.55) saturate(.7); transition: transform .75s cubic-bezier(.25,.46,.45,.94), filter .5s; }
.coll-card:hover .coll-card__img { transform: scale(1.06); filter: brightness(.45) saturate(.6); }
.coll-card__overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(8,8,8,.75) 0%, transparent 55%); }
.coll-card__body { position: absolute; bottom: 0; left: 0; right: 0; padding: 40px; text-align: left; }
.coll-card__tag { font-size: 9px; font-weight: 700; letter-spacing: .45em; text-transform: uppercase; color: var(--gold); margin-bottom: 8px; }
.coll-card__name { font-family: 'Cormorant Garamond', serif; font-weight: 300; font-size: 52px; color: var(--cream); line-height: 1; margin-bottom: 4px; }
.coll-card__sub { font-size: 11px; font-weight: 400; letter-spacing: .3em; text-transform: uppercase; color: rgba(242,237,229,.5); margin-bottom: 28px; }
.coll-card__shop { display: block; font-size: 10px; font-weight: 700; letter-spacing: .38em; text-transform: uppercase; color: var(--cream); border-bottom: 1px solid var(--gold); padding-bottom: 2px; width: fit-content; opacity: 0; transform: translateY(10px); transition: opacity .3s, transform .3s; }
.coll-card:hover .coll-card__shop { opacity: 1; transform: translateY(0); }

/* PRODUCTS */
.products { padding: 96px 64px 112px; }
.products__head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 56px; }
.filter-tabs { display: flex; border: 1px solid var(--divider); }
.filter-tab { padding: 10px 24px; font-size: 11px; font-weight: 700; letter-spacing: .28em; text-transform: uppercase; color: var(--grey); background: none; border: none; border-right: 1px solid var(--divider); cursor: pointer; transition: background .2s, color .2s; }
.filter-tab:last-child { border-right: none; }
.filter-tab.active { background: var(--cream); color: var(--black); }
.filter-tab:hover:not(.active) { color: var(--cream); }
.products__grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: var(--divider); }
.product-card { background: var(--black); cursor: pointer; border: none; padding: 0; text-align: left; display: block; width: 100%; }
.product-card__img-wrap { aspect-ratio: 3/4; overflow: hidden; background: var(--dim); position: relative; }
.product-card__img-wrap img { width: 100%; height: 100%; object-fit: cover; filter: brightness(.9); transition: transform .65s ease, filter .4s; }
.product-card:hover .product-card__img-wrap img { transform: scale(1.04); filter: brightness(.75); }
.product-card__placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-family: 'Cormorant Garamond', serif; font-size: 56px; font-weight: 300; letter-spacing: .25em; color: rgba(242,237,229,.1); }
.product-card__hover-label { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; letter-spacing: .4em; text-transform: uppercase; color: var(--cream); background: rgba(8,8,8,.3); opacity: 0; transition: opacity .3s; }
.product-card:hover .product-card__hover-label { opacity: 1; }
.product-card__info { padding: 20px 24px 28px; border-top: 1px solid var(--divider); }
.product-card__coll { font-size: 9px; font-weight: 700; letter-spacing: .45em; text-transform: uppercase; color: var(--gold); margin-bottom: 8px; }
.product-card__name { font-family: 'Cormorant Garamond', serif; font-weight: 400; font-size: 22px; color: var(--cream); margin-bottom: 6px; line-height: 1.1; }
.product-card__price { font-size: 13px; font-weight: 400; letter-spacing: .1em; color: var(--grey); }
.product-card--skel .product-card__img-wrap { animation: shimmer 1.6s ease infinite; background: linear-gradient(90deg, var(--dim) 25%, #1e1e1e 50%, var(--dim) 75%); background-size: 200% 100%; }
.skel { border-radius: 2px; animation: shimmer 1.6s ease infinite; background: linear-gradient(90deg, var(--dim) 25%, #1e1e1e 50%, var(--dim) 75%); background-size: 200% 100%; margin-bottom: 10px; }
.skel--sm { height: 10px; width: 40%; } .skel--md { height: 18px; width: 70%; } .skel--xs { height: 12px; width: 25%; }
@keyframes shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }

/* FOOTER */
.footer { border-top: 1px solid var(--divider); padding: 88px 64px 48px; }
.footer__top { display: grid; grid-template-columns: 1.4fr 1fr 1fr 1fr; gap: 48px; margin-bottom: 64px; padding-bottom: 64px; border-bottom: 1px solid var(--divider); }
.footer__logo-img { height: 56px; width: auto; object-fit: contain; margin-bottom: 16px; display: block; }
.footer__for-all { font-size: 11px; font-weight: 300; letter-spacing: .4em; text-transform: uppercase; color: rgba(242,237,229,.3); }
.footer__col .label { margin-bottom: 20px; }
.footer__link { display: block; font-size: 13px; font-weight: 300; letter-spacing: .08em; color: var(--grey); margin-bottom: 14px; cursor: pointer; background: none; border: none; text-align: left; padding: 0; font-family: 'Barlow Condensed', sans-serif; transition: color .2s; }
.footer__link:hover { color: var(--cream); }
.footer__bottom { display: flex; align-items: center; justify-content: space-between; }
.footer__copy { font-size: 11px; font-weight: 300; letter-spacing: .15em; color: rgba(242,237,229,.25); text-transform: uppercase; }
.footer__legal { display: flex; gap: 32px; }
.footer__legal .footer__link { margin-bottom: 0; font-size: 11px; }

/* MODAL */
.modal-backdrop { position: fixed; inset: 0; background: rgba(8,8,8,.82); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 40px; backdrop-filter: blur(6px); animation: fadeIn .3s ease; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
.modal { background: var(--dim); max-width: 880px; width: 100%; display: grid; grid-template-columns: 1fr 1fr; max-height: 90vh; overflow: hidden; border: 1px solid var(--divider); position: relative; animation: slideUp .35s cubic-bezier(.16,1,.3,1); }
@keyframes slideUp { from { transform: translateY(24px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
.modal__img-col { overflow: hidden; background: #111; }
.modal__img { width: 100%; height: 100%; object-fit: cover; display: block; }
.modal__img-placeholder { width: 100%; height: 100%; min-height: 500px; display: flex; align-items: center; justify-content: center; font-family: 'Cormorant Garamond', serif; font-size: 72px; font-weight: 300; color: rgba(242,237,229,.08); }
.modal__body { padding: 52px 44px; display: flex; flex-direction: column; overflow-y: auto; }
.modal__close { position: absolute; top: 20px; right: 20px; background: none; border: none; color: var(--cream); font-size: 18px; cursor: pointer; opacity: .5; transition: opacity .2s; line-height: 1; padding: 4px; }
.modal__close:hover { opacity: 1; }
.modal__coll { font-size: 10px; font-weight: 700; letter-spacing: .45em; text-transform: uppercase; color: var(--gold); margin-bottom: 14px; }
.modal__name { font-family: 'Cormorant Garamond', serif; font-weight: 300; font-size: 38px; color: var(--cream); line-height: 1.05; margin-bottom: 10px; }
.modal__price { font-size: 18px; font-weight: 400; letter-spacing: .08em; color: var(--grey); margin-bottom: 44px; }
.modal__sizes { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 36px; }
.size-btn { width: 52px; height: 52px; border: 1px solid var(--divider); background: none; color: var(--cream); font-family: 'Barlow Condensed', sans-serif; font-size: 13px; font-weight: 500; letter-spacing: .06em; cursor: pointer; transition: background .2s, border-color .2s, color .2s; }
.size-btn:hover:not(.size-btn--sold) { border-color: var(--cream); }
.size-btn--active { background: var(--cream); color: var(--black); border-color: var(--cream); }
.size-btn--sold { opacity: .3; text-decoration: line-through; cursor: not-allowed; }
.modal__add { margin-top: auto; padding: 17px; background: var(--cream); color: var(--black); border: none; font-family: 'Barlow Condensed', sans-serif; font-size: 12px; font-weight: 700; letter-spacing: .45em; text-transform: uppercase; cursor: pointer; transition: background .25s; }
.modal__add:hover:not(:disabled) { background: var(--gold); }
.modal__add:disabled { opacity: .4; cursor: not-allowed; }

/* TOAST */
.toast { position: fixed; bottom: 44px; left: 50%; transform: translateX(-50%); background: var(--gold); color: var(--black); padding: 14px 36px; font-size: 11px; font-weight: 700; letter-spacing: .4em; text-transform: uppercase; z-index: 300; animation: toastIn .35s cubic-bezier(.16,1,.3,1); white-space: nowrap; }
@keyframes toastIn { from { opacity: 0; transform: translate(-50%, 16px); } to { opacity: 1; transform: translate(-50%, 0); } }

/* ── ACCOUNT BTN ── */
.nav__account-btn { background: none; border: none; cursor: pointer; color: #fff; display: flex; align-items: center; padding: 4px 8px; opacity: .85; transition: opacity .2s; }
.nav__account-btn:hover { opacity: 1; }

/* ── ACCOUNT MODAL ── */
.account-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.72); z-index: 1200; display: flex; align-items: center; justify-content: center; }
.account-modal { background: #0a0a0a; border: 1px solid #2a2a2a; width: 100%; max-width: 400px; padding: 40px 36px 44px; position: relative; color: #fff; }
.account-modal__close { position: absolute; top: 16px; right: 20px; background: none; border: none; color: #888; font-size: 18px; cursor: pointer; }
.account-modal__close:hover { color: #fff; }
.account-modal__tabs { display: flex; border-bottom: 1px solid #2a2a2a; margin-bottom: 28px; }
.account-modal__tab { flex: 1; background: none; border: none; color: #666; font-family: inherit; font-size: 11px; letter-spacing: .12em; text-transform: uppercase; padding: 12px 0; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1px; transition: color .2s, border-color .2s; }
.account-modal__tab.active { color: #c9a84c; border-bottom-color: #c9a84c; }
.account-modal__sub { font-size: 13px; color: #888; margin-bottom: 24px; letter-spacing: .04em; }
.account-modal__input { width: 100%; background: #111; border: 1px solid #2a2a2a; color: #fff; font-family: inherit; font-size: 13px; padding: 12px 14px; margin-bottom: 12px; outline: none; box-sizing: border-box; }
.account-modal__input::placeholder { color: #555; }
.account-modal__input:focus { border-color: #c9a84c; }
.account-modal__cta { width: 100%; background: #c9a84c; color: #000; border: none; font-family: inherit; font-size: 11px; letter-spacing: .14em; font-weight: 600; padding: 14px; cursor: pointer; margin-top: 4px; transition: background .2s; }
.account-modal__cta:hover { background: #e0b85a; }
.account-modal__forgot { text-align: center; font-size: 11px; color: #555; margin-top: 16px; cursor: pointer; letter-spacing: .06em; }
.account-modal__forgot:hover { color: #c9a84c; }
`;
