import { useState, useEffect, useRef, useCallback } from "react";
import heroPhoto from "./Landing.png";
import logoImg from "./logo.png";

// ─── Shopify Config ──────────────────────────────────────────────────────────
const DOMAIN = "stb-4219.myshopify.com";
const TOKEN  = "a64dd51a0b0ac5b428d9cb11c55de8cf";

const PRODUCTS_QUERY = `{
  products(first: 12) {
    edges { node {
      id title handle description tags
      priceRange { minVariantPrice { amount currencyCode } }
      images(first: 4) { edges { node { url altText } } }
      variants(first: 20) { edges { node { id title availableForSale } } }
    }}
  }
}`;

const CREATE_CART_MUTATION = `mutation { cartCreate { cart { id checkoutUrl } } }`;

const ADD_LINE_MUTATION = (cartId, variantId) => `mutation {
  cartLinesAdd(cartId: "${cartId}", lines: [{ merchandiseId: "${variantId}", quantity: 1 }]) {
    cart { id totalQuantity checkoutUrl lines(first:20){ edges{ node{ id quantity merchandise { ... on ProductVariant { id title price { amount currencyCode } product { title images(first:1){ edges{ node{ url } } } } } } } } } }
  }
}`;

const REMOVE_LINE_MUTATION = (cartId, lineId) => `mutation {
  cartLinesRemove(cartId: "${cartId}", lineIds: ["${lineId}"]) {
    cart { id totalQuantity checkoutUrl lines(first:20){ edges{ node{ id quantity merchandise { ... on ProductVariant { id title price { amount currencyCode } product { title images(first:1){ edges{ node{ url } } } } } } } } } }
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
  if (!res.ok) throw new Error(`Shopify API error: ${res.status}`);
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0]?.message || "GraphQL error");
  return json.data;
}

// ─── Assets & Data ───────────────────────────────────────────────────────────
const COLLECTIONS = [
  { id: "NYC", label: "NYC Collection", sub: "Streets Never Sleep",    img: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=900&q=85" },
  { id: "STB", label: "STB Collection", sub: "Strictly Thee Best",    img: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=900&q=85" },
  { id: "LA",  label: "LA Collection",  sub: "Golden State of Mind",  img: "https://images.unsplash.com/photo-1580655653885-65763b2597d0?w=900&q=85" },
];

const fmtPrice = (p) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: p.priceRange?.minVariantPrice?.currencyCode || "USD",
  }).format(parseFloat(p.priceRange?.minVariantPrice?.amount || 0));

const fmtLinePrice = (p) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: p.currencyCode || "USD",
  }).format(parseFloat(p.amount || 0));

// ─── Scroll Reveal Hook ──────────────────────────────────────────────────────
function useReveal(threshold = 0.15) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
}

function Reveal({ children, className = "", delay = 0, direction = "up" }) {
  const [ref, visible] = useReveal(0.12);
  const transforms = { up: "translateY(40px)", down: "translateY(-40px)", left: "translateX(40px)", right: "translateX(-40px)", none: "none" };
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "none" : transforms[direction],
        transition: `opacity 0.8s cubic-bezier(.16,1,.3,1) ${delay}s, transform 0.8s cubic-bezier(.16,1,.3,1) ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function STBStore() {
  const [products, setProducts]           = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadError, setLoadError]         = useState(null);
  const [filter, setFilter]               = useState("ALL");
  const [cart, setCart]                    = useState(null);
  const [cartQty, setCartQty]             = useState(0);
  const [cartLines, setCartLines]         = useState([]);
  const [cartOpen, setCartOpen]           = useState(false);
  const [modal, setModal]                 = useState(null);
  const [modalImgIdx, setModalImgIdx]     = useState(0);
  const [variant, setVariant]             = useState(null);
  const [adding, setAdding]               = useState(false);
  const [removing, setRemoving]           = useState(null);
  const [accountOpen, setAccountOpen]     = useState(false);
  const [accountTab, setAccountTab]       = useState("signin");
  const [toast, setToast]                 = useState(null);
  const [navDark, setNavDark]             = useState(false);
  const [mobileMenu, setMobileMenu]       = useState(false);
  const [page, setPage]                   = useState("home");
  const [showTop, setShowTop]             = useState(false);
  const [email, setEmail]                 = useState("");
  const [emailSent, setEmailSent]         = useState(false);

  // ── Scroll listeners ──
  useEffect(() => {
    const onScroll = () => {
      setNavDark(window.scrollY > 60);
      setShowTop(window.scrollY > 600);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ── Lock body scroll when overlays are open ──
  useEffect(() => {
    document.body.style.overflow = (cartOpen || modal || accountOpen || mobileMenu) ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [cartOpen, modal, accountOpen, mobileMenu]);

  // ── Load products ──
  useEffect(() => {
    shopify(PRODUCTS_QUERY)
      .then((d) => setProducts(d.products.edges.map((e) => e.node)))
      .catch((err) => setLoadError(err.message))
      .finally(() => setLoadingProducts(false));
  }, []);

  const filtered = filter === "ALL" ? products : products.filter((p) => p.tags.includes(filter));

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const updateCartState = (cartData) => {
    setCart(cartData);
    setCartQty(cartData.totalQuantity || 0);
    setCartLines(cartData.lines?.edges?.map((e) => e.node) || []);
  };

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
      updateCartState(d.cartLinesAdd.cart);
      setModal(null);
      setVariant(null);
      showToast("Added to bag");
      setCartOpen(true);
    } catch (err) {
      showToast("Error adding to bag — try again");
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveFromCart = async (lineId) => {
    if (!cart || removing) return;
    setRemoving(lineId);
    try {
      const d = await shopify(REMOVE_LINE_MUTATION(cart.id, lineId));
      updateCartState(d.cartLinesRemove.cart);
    } catch (err) {
      showToast("Error removing item");
    } finally {
      setRemoving(null);
    }
  };

  const openCheckout = () => {
    if (cart?.checkoutUrl) window.open(cart.checkoutUrl, "_blank");
  };

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  const goToStory = () => { setPage("story"); window.scrollTo({ top: 0 }); setMobileMenu(false); };
  const goHome = () => { setPage("home"); window.scrollTo({ top: 0 }); setMobileMenu(false); };

  const handleNewsletterSubmit = () => {
    if (!email || !email.includes("@")) return;
    setEmailSent(true);
    setEmail("");
    showToast("You're on the list");
  };

  const retryLoad = () => {
    setLoadError(null);
    setLoadingProducts(true);
    shopify(PRODUCTS_QUERY)
      .then((d) => setProducts(d.products.edges.map((e) => e.node)))
      .catch((err) => setLoadError(err.message))
      .finally(() => setLoadingProducts(false));
  };

  return (
    <>
      <style>{css}</style>
      <div className="stb">

        {/* ══════════════════ NAV ══════════════════ */}
        <nav className={`nav ${navDark ? "nav--dark" : ""}`}>
          {/* Left: Hamburger (always visible) */}
          <button className="nav__hamburger" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Menu">
            <span className={`nav__hamburger-line ${mobileMenu ? "open" : ""}`} />
            <span className={`nav__hamburger-line ${mobileMenu ? "open" : ""}`} />
          </button>

          {/* Right: Logo + Shop + Bag */}
          <div className="nav__right">
            <button className="nav__brand-logo" onClick={goHome} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
              <img src={logoImg} alt="STB" className="nav__logo-img" />
            </button>
            <button className="nav__link" onClick={() => { setPage("home"); setMobileMenu(false); setTimeout(() => scrollTo("products"), 100); }}>Shop</button>
            <button className="nav__cart" onClick={() => cartQty > 0 ? setCartOpen(true) : showToast("Your bag is empty")}>
              Bag {cartQty > 0 && <span className="nav__cart-count">{cartQty}</span>}
            </button>
          </div>
        </nav>

        {/* ── Hamburger Menu Panel ── */}
        {mobileMenu && (
          <div className="menu-backdrop" onClick={() => setMobileMenu(false)} />
        )}
        <div className={`menu-panel ${mobileMenu ? "menu-panel--open" : ""}`}>
          <div className="menu-panel__links">
            <p className="menu-panel__label">Collections</p>
            <button onClick={() => { setFilter("STB"); setPage("home"); setMobileMenu(false); setTimeout(() => scrollTo("products"), 100); }}>STB Collection</button>
            <button onClick={() => { setFilter("NYC"); setPage("home"); setMobileMenu(false); setTimeout(() => scrollTo("products"), 100); }}>NYC Collection</button>
            <button onClick={() => { setFilter("LA"); setPage("home"); setMobileMenu(false); setTimeout(() => scrollTo("products"), 100); }}>LA Collection</button>
            <div className="menu-panel__divider" />
            <button onClick={() => { setAccountOpen(true); setMobileMenu(false); setAccountTab("signin"); }}>Sign In</button>
            <button onClick={() => { setAccountOpen(true); setMobileMenu(false); setAccountTab("create"); }}>Create Account</button>
            <div className="menu-panel__divider" />
            <button onClick={() => { goToStory(); }}>Our Story</button>
            <button onClick={() => { setMobileMenu(false); showToast("Contact: hello@strictlytheebest.net"); }}>Contact Us</button>
          </div>
        </div>

        {/* ══════════════════ HOME PAGE ══════════════════ */}
        {page === "home" && (
          <>
            {/* ── HERO ── */}
            <section className="hero">
              <img className="hero__img" src={heroPhoto} alt="STB Editorial — Strictly Thee Best streetwear" />
              <div className="hero__veil" />
              <div className="hero__content">
                <p className="hero__tagline">STB</p>
                <p className="hero__tagline" style={{ marginBottom: 4 }}>For All</p>
                <button className="hero__cta" onClick={() => scrollTo("collections")}>Explore the Collection</button>
              </div>
              <div className="hero__scroll-hint" aria-hidden="true"><span /></div>
            </section>

            {/* ── COLLECTIONS ── */}
            <section className="collections" id="collections">
              <div className="collections__head">
                <Reveal><h2 className="section-title">Collections</h2></Reveal>
                <div className="collections__nav">
                  {COLLECTIONS.map((c, i) => (
                    <Reveal key={c.id} delay={i * 0.08}>
                      <button
                        className={`collections__nav-btn ${filter === c.id ? "active" : ""}`}
                        onClick={() => { setFilter(c.id); scrollTo("products"); }}
                      >{c.label}</button>
                    </Reveal>
                  ))}
                </div>
              </div>
              <div className="collections__grid">
                {COLLECTIONS.map((c, i) => (
                  <Reveal key={c.id} delay={i * 0.1}>
                    <button className="coll-card" onClick={() => { setFilter(c.id); scrollTo("products"); }}>
                      <img className="coll-card__img" src={c.img} alt={c.label} loading="lazy" />
                      <div className="coll-card__overlay" />
                      <div className="coll-card__body">
                        <p className="coll-card__tag">{c.id}</p>
                        <p className="coll-card__name">{c.id}</p>
                        <p className="coll-card__sub">{c.sub}</p>
                        <span className="coll-card__shop">Shop Collection</span>
                      </div>
                    </button>
                  </Reveal>
                ))}
              </div>
            </section>

            {/* ── PRODUCTS ── */}
            <section className="products" id="products">
              <div className="products__head">
                <h2 className="section-title">{filter === "ALL" ? "All Products" : `${filter} Collection`}</h2>
                <div className="filter-tabs">
                  {["ALL", "NYC", "STB", "LA"].map((f) => (
                    <button key={f} className={`filter-tab ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>{f}</button>
                  ))}
                </div>
              </div>

              {/* Error state */}
              {loadError && (
                <div className="products__empty">
                  <p className="products__empty-text">Couldn't load products right now.</p>
                  <button className="hero__cta" style={{ marginTop: 24, fontSize: 10, padding: "12px 36px" }} onClick={retryLoad}>Try Again</button>
                </div>
              )}

              {/* Loading skeleton */}
              {loadingProducts && !loadError && (
                <div className="products__grid">
                  {Array(3).fill(null).map((_, i) => (
                    <div key={i} className="product-card product-card--skel">
                      <div className="product-card__img-wrap" style={{ background: "none" }}><div className="skel" style={{ width: "100%", height: "100%", borderRadius: 0 }} /></div>
                      <div className="product-card__info">
                        <div className="skel skel--sm" />
                        <div className="skel skel--md" />
                        <div className="skel skel--xs" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Empty state */}
              {!loadingProducts && !loadError && filtered.length === 0 && (
                <div className="products__empty">
                  <p className="products__empty-text">No products in this collection yet.</p>
                  <button className="hero__cta" style={{ marginTop: 24, fontSize: 10, padding: "12px 36px" }} onClick={() => setFilter("ALL")}>View All Products</button>
                </div>
              )}

              {/* Product grid */}
              {!loadingProducts && !loadError && filtered.length > 0 && (
                <div className="products__grid">
                  {filtered.map((p, i) => {
                    const img = p.images.edges[0]?.node;
                    const coll = COLLECTIONS.find((c) => p.tags.includes(c.id));
                    return (
                      <Reveal key={p.id} delay={i * 0.07}>
                        <button className="product-card" onClick={() => { setModal(p); setVariant(null); setModalImgIdx(0); }}>
                          <div className="product-card__img-wrap">
                            {img ? <img src={img.url} alt={img.altText || p.title} loading="lazy" /> : <div className="product-card__placeholder">STB</div>}
                            <div className="product-card__hover-label">Quick View</div>
                          </div>
                          <div className="product-card__info">
                            <p className="product-card__coll">{coll?.id ?? "STB"} Collection</p>
                            <p className="product-card__name">{p.title}</p>
                            <p className="product-card__price">{fmtPrice(p)}</p>
                          </div>
                        </button>
                      </Reveal>
                    );
                  })}
                </div>
              )}
            </section>

            {/* ── NEWSLETTER ── */}
            <Reveal>
              <section className="newsletter">
                <p className="label">Stay Connected</p>
                <h2 className="section-title" style={{ marginBottom: 12 }}>Join the Movement</h2>
                <p className="newsletter__copy">Early access to drops, exclusive offers, and the stories behind the brand.</p>
                {emailSent ? (
                  <p className="newsletter__thanks">Welcome to STB.</p>
                ) : (
                  <div className="newsletter__form">
                    <input
                      type="email"
                      className="newsletter__input"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleNewsletterSubmit()}
                    />
                    <button className="newsletter__btn" onClick={handleNewsletterSubmit}>Subscribe</button>
                  </div>
                )}
              </section>
            </Reveal>
          </>
        )}

        {/* ══════════════════ OUR STORY PAGE ══════════════════ */}
        {page === "story" && (
          <section className="story">
            <div className="story__hero">
              <button className="story__back" onClick={goHome}>&larr; Back</button>
              <Reveal>
                <p className="label">Our Story</p>
                <h1 className="story__headline">
                  Crafted for the <em>Few</em>,<br />worn by the Many.
                </h1>
              </Reveal>
            </div>
            <div className="story__body">
              <Reveal>
                <div className="story__section">
                  <h2 className="story__subhead">The Beginning</h2>
                  <p className="story__text">
                    STB was built on one belief: excellence should be accessible. What started as a vision between New York and Los Angeles became a movement &mdash; a brand for those who refuse to settle for anything less than the best.
                  </p>
                </div>
              </Reveal>
              <Reveal delay={0.1}>
                <div className="story__section">
                  <h2 className="story__subhead">Our Vision</h2>
                  <p className="story__text">
                    From the streets of New York to the coasts of Los Angeles, every piece is designed with intention &mdash; for those who move with purpose. We don&apos;t follow trends. We set the standard.
                  </p>
                </div>
              </Reveal>
              <Reveal delay={0.2}>
                <div className="story__section">
                  <h2 className="story__subhead">For All</h2>
                  <p className="story__text">
                    Strictly Thee Best isn&apos;t just a name &mdash; it&apos;s a promise. A promise that quality, design, and craftsmanship belong to everyone. Every collection, every drop, every detail is made with one goal: to give you the best, nothing less.
                  </p>
                </div>
              </Reveal>
              <Reveal delay={0.3}>
                <div className="story__cta-row">
                  <button className="hero__cta" onClick={() => { goHome(); setTimeout(() => scrollTo("collections"), 100); }}>
                    Explore the Collections
                  </button>
                </div>
              </Reveal>
            </div>
          </section>
        )}

        {/* ══════════════════ FOOTER ══════════════════ */}
        <footer className="footer">
          <div className="footer__top">
            <div className="footer__brand">
              <button onClick={goHome} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                <img src={logoImg} className="footer__logo-img" alt="STB — Strictly Thee Best" loading="lazy" />
              </button>
              <p className="footer__for-all">For All</p>
            </div>
            <div className="footer__col">
              <p className="label">Collections</p>
              {COLLECTIONS.map((c) => (
                <button key={c.id} className="footer__link" onClick={() => { setFilter(c.id); setPage("home"); setTimeout(() => scrollTo("products"), 100); }}>{c.label}</button>
              ))}
            </div>
            <div className="footer__col">
              <p className="label">Company</p>
              <button className="footer__link" onClick={goToStory}>Our Story</button>
              <button className="footer__link" onClick={() => showToast("Contact: hello@strictlytheebest.net")}>Contact</button>
            </div>
            <div className="footer__col">
              <p className="label">Support</p>
              <button className="footer__link" onClick={() => showToast("Free shipping on orders over $150")}>Shipping</button>
              <button className="footer__link" onClick={() => showToast("Returns accepted within 30 days")}>Returns</button>
              <button className="footer__link" onClick={() => showToast("Size guide coming soon")}>Size Guide</button>
              <button className="footer__link" onClick={() => showToast("FAQ coming soon")}>FAQ</button>
            </div>
          </div>
          <div className="footer__bottom">
            <p className="footer__copy">&copy; {new Date().getFullYear()} Strictly Thee Best. All Rights Reserved.</p>
            <div className="footer__legal">
              <button className="footer__link" onClick={() => showToast("Privacy Policy coming soon")}>Privacy Policy</button>
              <button className="footer__link" onClick={() => showToast("Terms of Service coming soon")}>Terms of Service</button>
            </div>
          </div>
        </footer>

        {/* ══════════════════ PRODUCT MODAL ══════════════════ */}
        {modal && (
          <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setModal(null)}>
            <div className="modal" role="dialog" aria-label={modal.title}>
              <div className="modal__img-col">
                {modal.images.edges.length > 0 ? (
                  <>
                    <img
                      src={modal.images.edges[modalImgIdx]?.node.url || modal.images.edges[0].node.url}
                      alt={modal.title}
                      className="modal__img"
                    />
                    {modal.images.edges.length > 1 && (
                      <div className="modal__img-dots">
                        {modal.images.edges.map((_, i) => (
                          <button
                            key={i}
                            className={`modal__img-dot ${i === modalImgIdx ? "active" : ""}`}
                            onClick={() => setModalImgIdx(i)}
                            aria-label={`Image ${i + 1}`}
                          />
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="modal__img-placeholder">STB</div>
                )}
              </div>
              <div className="modal__body">
                <button className="modal__close" onClick={() => setModal(null)} aria-label="Close">&times;</button>
                <p className="modal__coll">{COLLECTIONS.find((c) => modal.tags.includes(c.id))?.id ?? "STB"} Collection</p>
                <h3 className="modal__name">{modal.title}</h3>
                <p className="modal__price">{fmtPrice(modal)}</p>
                {modal.description && (
                  <p className="modal__desc">{modal.description}</p>
                )}
                <p className="label" style={{ marginBottom: 16 }}>Select Size</p>
                <div className="modal__sizes">
                  {modal.variants.edges.map(({ node: v }) => (
                    <button
                      key={v.id}
                      disabled={!v.availableForSale}
                      className={`size-btn ${variant?.id === v.id ? "size-btn--active" : ""} ${!v.availableForSale ? "size-btn--sold" : ""}`}
                      onClick={() => setVariant(v)}
                    >{v.title}</button>
                  ))}
                </div>
                <button className="modal__add" disabled={!variant || adding} onClick={handleAddToCart}>
                  {adding ? "Adding\u2026" : variant ? "Add to Bag" : "Select a Size"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════ CART DRAWER ══════════════════ */}
        {cartOpen && (
          <div className="cart-backdrop" onClick={() => setCartOpen(false)}>
            <div className="cart-drawer" onClick={(e) => e.stopPropagation()}>
              <div className="cart-drawer__head">
                <h3 className="cart-drawer__title">Your Bag ({cartQty})</h3>
                <button className="modal__close" onClick={() => setCartOpen(false)} aria-label="Close">&times;</button>
              </div>
              <div className="cart-drawer__body">
                {cartLines.length === 0 ? (
                  <div className="cart-drawer__empty">
                    <p>Your bag is empty</p>
                    <button className="hero__cta" style={{ marginTop: 24, fontSize: 10, padding: "12px 36px" }} onClick={() => { setCartOpen(false); scrollTo("products"); }}>Continue Shopping</button>
                  </div>
                ) : (
                  cartLines.map((line) => {
                    const merch = line.merchandise;
                    const img = merch.product?.images?.edges?.[0]?.node?.url;
                    return (
                      <div key={line.id} className="cart-item">
                        <div className="cart-item__img">
                          {img ? <img src={img} alt={merch.product?.title} /> : <div className="cart-item__placeholder">STB</div>}
                        </div>
                        <div className="cart-item__info">
                          <p className="cart-item__name">{merch.product?.title}</p>
                          <p className="cart-item__variant">Size: {merch.title} &middot; Qty: {line.quantity}</p>
                          <p className="cart-item__price">{fmtLinePrice(merch.price)}</p>
                        </div>
                        <button
                          className="cart-item__remove"
                          onClick={() => handleRemoveFromCart(line.id)}
                          disabled={removing === line.id}
                          aria-label="Remove"
                        >
                          {removing === line.id ? "..." : "\u00d7"}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
              {cartLines.length > 0 && (
                <div className="cart-drawer__foot">
                  <button className="modal__add" onClick={openCheckout}>Checkout</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════ TOAST ══════════════════ */}
        {toast && <div className="toast">{toast}</div>}

        {/* ══════════════════ BACK TO TOP ══════════════════ */}
        {showTop && (
          <button className="back-to-top" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Back to top">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
          </button>
        )}
      </div>

      {/* ══════════════════ ACCOUNT MODAL ══════════════════ */}
      {accountOpen && (
        <div className="account-overlay" onClick={() => setAccountOpen(false)}>
          <div className="account-modal" onClick={(e) => e.stopPropagation()}>
            <button className="account-modal__close" onClick={() => setAccountOpen(false)}>&times;</button>
            <div className="account-modal__tabs">
              <button className={"account-modal__tab" + (accountTab === "signin" ? " active" : "")} onClick={() => setAccountTab("signin")}>Sign In</button>
              <button className={"account-modal__tab" + (accountTab === "create" ? " active" : "")} onClick={() => setAccountTab("create")}>Create Account</button>
            </div>
            {accountTab === "signin" && (
              <div>
                <p className="account-modal__sub">Welcome back</p>
                <input className="account-modal__input" type="email" placeholder="Email address" />
                <input className="account-modal__input" type="password" placeholder="Password" />
                <button className="account-modal__cta" onClick={() => showToast("Account features coming soon")}>SIGN IN</button>
                <p className="account-modal__forgot">Forgot your password?</p>
              </div>
            )}
            {accountTab === "create" && (
              <div>
                <p className="account-modal__sub">Join STB</p>
                <input className="account-modal__input" type="text" placeholder="First name" />
                <input className="account-modal__input" type="text" placeholder="Last name" />
                <input className="account-modal__input" type="email" placeholder="Email address" />
                <input className="account-modal__input" type="password" placeholder="Password" />
                <button className="account-modal__cta" onClick={() => showToast("Account features coming soon")}>CREATE ACCOUNT</button>
                <p className="account-modal__forgot">Track orders &middot; Save favorites &middot; Early access</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const css = `
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  --black: #080808;
  --cream: #F2EDE5;
  --gold: #BFA065;
  --dim: #141414;
  --grey: rgba(242,237,229,0.45);
  --divider: rgba(242,237,229,0.1);
}
html { scroll-behavior: smooth; }
.stb {
  font-family: 'Barlow Condensed', sans-serif;
  background: var(--black);
  color: var(--cream);
  min-height: 100vh;
  overflow-x: hidden;
}
.label {
  font-size: 10px; font-weight: 600; letter-spacing: 0.45em;
  text-transform: uppercase; color: var(--gold); margin-bottom: 24px;
}
.section-title {
  font-family: 'Cormorant Garamond', serif; font-weight: 300;
  font-size: clamp(36px, 4.5vw, 60px); color: var(--cream); line-height: 1;
}

/* ═══ NAV ═══ */
.nav {
  position: fixed; inset: 0 0 auto 0; z-index: 100; height: 72px;
  padding: 0 48px; display: flex; align-items: center; justify-content: space-between;
  transition: background .4s, border-color .4s; border-bottom: 1px solid transparent;
}
.nav--dark { background: rgba(8,8,8,.95); border-bottom-color: var(--divider); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); }
.nav__right { display: flex; align-items: center; gap: 32px; }
.nav__link {
  font-size: 12px; font-weight: 600; letter-spacing: 0.22em; text-transform: uppercase;
  color: var(--cream); background: none; border: none; cursor: pointer;
  opacity: .75; transition: opacity .2s; padding: 0;
}
.nav__link:hover { opacity: 1; }
.nav__brand-logo { display: flex; align-items: center; }
.nav__logo-img { height: 32px; width: auto; object-fit: contain; opacity: .9; transition: opacity .2s; }
.nav__brand-logo:hover .nav__logo-img { opacity: 1; }
.nav__cart {
  position: relative; font-size: 12px; font-weight: 600; letter-spacing: 0.22em;
  text-transform: uppercase; color: var(--cream); background: none; border: none;
  cursor: pointer; opacity: .75; transition: opacity .2s; padding: 0;
}
.nav__cart:hover { opacity: 1; }
.nav__cart-count {
  position: absolute; top: -9px; right: -14px; background: var(--gold); color: var(--black);
  width: 18px; height: 18px; border-radius: 50%; font-size: 9px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
}

/* Hamburger */
.nav__hamburger {
  background: none; border: none; cursor: pointer; padding: 8px;
  display: flex; flex-direction: column; gap: 6px; z-index: 110;
}
.nav__hamburger-line {
  display: block; width: 22px; height: 1.5px; background: var(--cream);
  transition: transform .3s, opacity .3s;
}
.nav__hamburger-line.open:first-child { transform: translateY(3.75px) rotate(45deg); }
.nav__hamburger-line.open:last-child { transform: translateY(-3.75px) rotate(-45deg); }

/* Hamburger Menu Panel */
.menu-backdrop {
  position: fixed; inset: 0; background: rgba(8,8,8,.5); z-index: 104;
  animation: fadeIn .3s ease;
}
.menu-panel {
  position: fixed; top: 72px; left: 0; width: 360px; max-width: 85vw;
  background: var(--dim); border-right: 1px solid var(--divider);
  border-bottom: 1px solid var(--divider);
  z-index: 106; padding: 40px 40px 48px;
  transform: translateY(-10px); opacity: 0; pointer-events: none;
  transition: transform .35s cubic-bezier(.16,1,.3,1), opacity .3s ease;
}
.menu-panel--open {
  transform: translateY(0); opacity: 1; pointer-events: auto;
}
.menu-panel__links { display: flex; flex-direction: column; gap: 20px; }
.menu-panel__label {
  font-size: 10px; font-weight: 600; letter-spacing: .45em; text-transform: uppercase;
  color: var(--gold); margin-bottom: -4px;
}
.menu-panel__links button {
  background: none; border: none; color: var(--cream);
  font-family: 'Barlow Condensed', sans-serif; font-size: 16px; font-weight: 400;
  letter-spacing: .15em; text-transform: uppercase; cursor: pointer;
  transition: color .2s; text-align: left; padding: 0;
}
.menu-panel__links button:hover { color: var(--gold); }
.menu-panel__divider {
  width: 100%; height: 1px; background: var(--divider); margin: 4px 0;
}

/* ═══ HERO ═══ */
.hero {
  position: relative; height: 100vh; min-height: 700px;
  display: flex; flex-direction: column; align-items: center; justify-content: flex-end;
  overflow: hidden; padding: 0 32px 100px;
}
.hero__img {
  position: absolute; inset: 0; width: 100%; height: 100%;
  object-fit: cover; object-position: center 15%;
  filter: brightness(.82) saturate(1); transform: scale(1.04);
  animation: heroZoom 9s ease forwards;
}
@keyframes heroZoom { from { transform: scale(1.04); } to { transform: scale(1.00); } }
.hero__veil {
  position: absolute; inset: 0;
  background: linear-gradient(to bottom, rgba(8,8,8,.35) 0%, transparent 25%, transparent 55%, rgba(8,8,8,.75) 100%);
}
.hero__content {
  position: relative; z-index: 2; display: flex; flex-direction: column;
  align-items: center; gap: 16px; text-align: center;
  animation: heroReveal 1.4s cubic-bezier(.16,1,.3,1) .1s both;
}
@keyframes heroReveal { from { opacity: 0; transform: translateY(28px); } to { opacity: 1; transform: translateY(0); } }
.hero__tagline {
  font-family: 'Cormorant Garamond', serif; font-size: 18px; font-weight: 300;
  letter-spacing: .45em; text-transform: uppercase; color: rgba(242,237,229,.8); margin: 0;
}
.hero__cta {
  display: inline-block; padding: 15px 56px; border: 1px solid rgba(242,237,229,.5);
  font-family: 'Barlow Condensed', sans-serif; font-size: 11px; font-weight: 700;
  letter-spacing: .45em; text-transform: uppercase; color: var(--cream);
  background: transparent; cursor: pointer; transition: background .3s, color .3s, border-color .3s;
}
.hero__cta:hover { background: var(--cream); color: var(--black); border-color: var(--cream); }
.hero__scroll-hint { position: absolute; bottom: 28px; left: 50%; transform: translateX(-50%); pointer-events: none; }
.hero__scroll-hint span {
  display: block; width: 1px; height: 48px;
  background: linear-gradient(to bottom, rgba(242,237,229,.6), transparent);
  margin: auto; animation: scrollPulse 2.5s ease infinite;
}
@keyframes scrollPulse { 0%,100% { opacity: .35; } 50% { opacity: .85; } }

/* ═══ MANIFESTO ═══ */
.manifesto {
  display: grid; grid-template-columns: 1fr 1fr;
  border-top: 1px solid var(--divider); border-bottom: 1px solid var(--divider);
}
.manifesto__left { padding: 112px 72px 112px 64px; border-right: 1px solid var(--divider); }
.manifesto__right { padding: 112px 64px 112px 72px; display: flex; flex-direction: column; justify-content: flex-end; }
.manifesto__headline {
  font-family: 'Cormorant Garamond', serif; font-weight: 300;
  font-size: clamp(44px, 5.5vw, 80px); line-height: 1.05; color: var(--cream); margin-top: 8px;
}
.manifesto__headline em { font-style: italic; color: var(--gold); }
.manifesto__copy {
  font-size: 15px; font-weight: 300; letter-spacing: .05em;
  line-height: 1.85; color: var(--grey); max-width: 420px; margin-bottom: 40px;
}
.manifesto__link {
  font-size: 11px; font-weight: 600; letter-spacing: .35em; text-transform: uppercase;
  color: var(--cream); background: none; border: none;
  border-bottom: 1px solid var(--gold); padding-bottom: 3px;
  cursor: pointer; transition: color .2s; width: fit-content;
}
.manifesto__link:hover { color: var(--gold); }

/* ═══ COLLECTIONS ═══ */
.collections__head {
  display: flex; align-items: baseline; justify-content: space-between;
  padding: 88px 64px 48px;
}
.collections__nav { display: flex; gap: 36px; }
.collections__nav-btn {
  font-size: 11px; font-weight: 600; letter-spacing: .3em; text-transform: uppercase;
  color: var(--grey); background: none; border: none; cursor: pointer;
  transition: color .2s; padding: 0;
}
.collections__nav-btn:hover, .collections__nav-btn.active { color: var(--gold); }
.collections__grid {
  display: grid; grid-template-columns: repeat(3, 1fr);
  gap: 1px; background: var(--divider);
}
.coll-card {
  position: relative; aspect-ratio: 3/4; overflow: hidden;
  background: var(--dim); border: none; cursor: pointer; display: block; width: 100%; padding: 0;
}
.coll-card__img {
  position: absolute; inset: 0; width: 100%; height: 100%;
  object-fit: cover; object-position: center top;
  filter: brightness(.75) saturate(.85);
  transition: transform .75s cubic-bezier(.25,.46,.45,.94), filter .5s;
}
.coll-card:hover .coll-card__img { transform: scale(1.06); filter: brightness(.6) saturate(.75); }
.coll-card__overlay {
  position: absolute; inset: 0;
  background: linear-gradient(to top, rgba(8,8,8,.6) 0%, transparent 50%);
}
.coll-card__body { position: absolute; bottom: 0; left: 0; right: 0; padding: 40px; text-align: left; }
.coll-card__tag { font-size: 9px; font-weight: 700; letter-spacing: .45em; text-transform: uppercase; color: var(--gold); margin-bottom: 8px; }
.coll-card__name { font-family: 'Cormorant Garamond', serif; font-weight: 300; font-size: 52px; color: var(--cream); line-height: 1; margin-bottom: 4px; }
.coll-card__sub { font-size: 11px; font-weight: 400; letter-spacing: .3em; text-transform: uppercase; color: rgba(242,237,229,.5); margin-bottom: 28px; }
.coll-card__shop {
  display: block; font-size: 10px; font-weight: 700; letter-spacing: .38em;
  text-transform: uppercase; color: var(--cream); border-bottom: 1px solid var(--gold);
  padding-bottom: 2px; width: fit-content;
  opacity: 0; transform: translateY(10px); transition: opacity .3s, transform .3s;
}
.coll-card:hover .coll-card__shop { opacity: 1; transform: translateY(0); }

/* ═══ PRODUCTS ═══ */
.products { padding: 96px 64px 112px; }
.products__head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 56px; }
.products__empty { text-align: center; padding: 80px 32px; }
.products__empty-text { font-size: 15px; color: var(--grey); letter-spacing: .1em; }
.filter-tabs { display: flex; border: 1px solid var(--divider); }
.filter-tab {
  padding: 10px 24px; font-size: 11px; font-weight: 700; letter-spacing: .28em;
  text-transform: uppercase; color: var(--grey); background: none; border: none;
  border-right: 1px solid var(--divider); cursor: pointer; transition: background .2s, color .2s;
}
.filter-tab:last-child { border-right: none; }
.filter-tab.active { background: var(--cream); color: var(--black); }
.filter-tab:hover:not(.active) { color: var(--cream); }
.products__grid {
  display: grid; grid-template-columns: repeat(3, 1fr);
  gap: 1px; background: var(--divider);
}
.product-card {
  background: var(--black); cursor: pointer; border: none;
  padding: 0; text-align: left; display: block; width: 100%;
}
.product-card__img-wrap {
  aspect-ratio: 3/4; overflow: hidden; background: var(--dim); position: relative;
}
.product-card__img-wrap img {
  width: 100%; height: 100%; object-fit: cover;
  filter: brightness(.9); transition: transform .65s ease, filter .4s;
}
.product-card:hover .product-card__img-wrap img { transform: scale(1.04); filter: brightness(.75); }
.product-card__placeholder {
  width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
  font-family: 'Cormorant Garamond', serif; font-size: 56px; font-weight: 300;
  letter-spacing: .25em; color: rgba(242,237,229,.1);
}
.product-card__hover-label {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 700; letter-spacing: .4em; text-transform: uppercase;
  color: var(--cream); background: rgba(8,8,8,.3); opacity: 0; transition: opacity .3s;
}
.product-card:hover .product-card__hover-label { opacity: 1; }
.product-card__info { padding: 20px 24px 28px; border-top: 1px solid var(--divider); }
.product-card__coll { font-size: 9px; font-weight: 700; letter-spacing: .45em; text-transform: uppercase; color: var(--gold); margin-bottom: 8px; }
.product-card__name { font-family: 'Cormorant Garamond', serif; font-weight: 400; font-size: 22px; color: var(--cream); margin-bottom: 6px; line-height: 1.1; }
.product-card__price { font-size: 13px; font-weight: 400; letter-spacing: .1em; color: var(--grey); }
.product-card--skel .product-card__img-wrap {
  animation: shimmer 1.6s ease infinite;
  background: linear-gradient(90deg, var(--dim) 25%, #1e1e1e 50%, var(--dim) 75%);
  background-size: 200% 100%;
}
.skel { border-radius: 2px; animation: shimmer 1.6s ease infinite; background: linear-gradient(90deg, var(--dim) 25%, #1e1e1e 50%, var(--dim) 75%); background-size: 200% 100%; margin-bottom: 10px; }
.skel--sm { height: 10px; width: 40%; }
.skel--md { height: 18px; width: 70%; }
.skel--xs { height: 12px; width: 25%; }
@keyframes shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }

/* ═══ NEWSLETTER ═══ */
.newsletter {
  text-align: center; padding: 96px 64px;
  border-top: 1px solid var(--divider); border-bottom: 1px solid var(--divider);
}
.newsletter__copy {
  font-size: 14px; font-weight: 300; letter-spacing: .06em;
  color: var(--grey); margin-bottom: 32px; max-width: 420px; margin-left: auto; margin-right: auto;
}
.newsletter__form {
  display: flex; gap: 0; max-width: 440px; margin: 0 auto;
  border: 1px solid var(--divider);
}
.newsletter__input {
  flex: 1; background: transparent; border: none; color: var(--cream);
  font-family: 'Barlow Condensed', sans-serif; font-size: 13px;
  padding: 14px 18px; letter-spacing: .06em; outline: none;
}
.newsletter__input::placeholder { color: rgba(242,237,229,.3); }
.newsletter__btn {
  background: var(--cream); color: var(--black); border: none;
  font-family: 'Barlow Condensed', sans-serif; font-size: 11px; font-weight: 700;
  letter-spacing: .3em; text-transform: uppercase; padding: 14px 28px;
  cursor: pointer; transition: background .2s;
}
.newsletter__btn:hover { background: var(--gold); }
.newsletter__thanks {
  font-family: 'Cormorant Garamond', serif; font-size: 22px;
  font-weight: 300; color: var(--gold); letter-spacing: .1em;
}

/* ═══ FOOTER ═══ */
.footer { border-top: 1px solid var(--divider); padding: 88px 64px 48px; }
.footer__top {
  display: grid; grid-template-columns: 1.4fr 1fr 1fr 1fr; gap: 48px;
  margin-bottom: 64px; padding-bottom: 64px; border-bottom: 1px solid var(--divider);
}
.footer__logo-img { height: 56px; width: auto; object-fit: contain; margin-bottom: 16px; display: block; }
.footer__for-all { font-size: 11px; font-weight: 300; letter-spacing: .4em; text-transform: uppercase; color: rgba(242,237,229,.3); }
.footer__col .label { margin-bottom: 20px; }
.footer__link {
  display: block; font-size: 13px; font-weight: 300; letter-spacing: .08em;
  color: var(--grey); margin-bottom: 14px; cursor: pointer;
  background: none; border: none; text-align: left; padding: 0;
  font-family: 'Barlow Condensed', sans-serif; transition: color .2s;
}
.footer__link:hover { color: var(--cream); }
.footer__bottom { display: flex; align-items: center; justify-content: space-between; }
.footer__copy { font-size: 11px; font-weight: 300; letter-spacing: .15em; color: rgba(242,237,229,.25); text-transform: uppercase; }
.footer__legal { display: flex; gap: 32px; }
.footer__legal .footer__link { margin-bottom: 0; font-size: 11px; }

/* ═══ MODAL ═══ */
.modal-backdrop {
  position: fixed; inset: 0; background: rgba(8,8,8,.82); z-index: 200;
  display: flex; align-items: center; justify-content: center; padding: 40px;
  backdrop-filter: blur(6px); animation: fadeIn .3s ease;
}
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
.modal {
  background: var(--dim); max-width: 880px; width: 100%;
  display: grid; grid-template-columns: 1fr 1fr; max-height: 90vh;
  overflow: hidden; border: 1px solid var(--divider); position: relative;
  animation: slideUp .35s cubic-bezier(.16,1,.3,1);
}
@keyframes slideUp { from { transform: translateY(24px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
.modal__img-col { overflow: hidden; background: #111; position: relative; }
.modal__img { width: 100%; height: 100%; object-fit: cover; display: block; }
.modal__img-dots {
  position: absolute; bottom: 16px; left: 50%; transform: translateX(-50%);
  display: flex; gap: 8px;
}
.modal__img-dot {
  width: 8px; height: 8px; border-radius: 50%; border: 1px solid rgba(242,237,229,.5);
  background: transparent; cursor: pointer; transition: background .2s; padding: 0;
}
.modal__img-dot.active { background: var(--cream); border-color: var(--cream); }
.modal__img-placeholder {
  width: 100%; height: 100%; min-height: 500px; display: flex;
  align-items: center; justify-content: center;
  font-family: 'Cormorant Garamond', serif; font-size: 72px;
  font-weight: 300; color: rgba(242,237,229,.08);
}
.modal__body { padding: 52px 44px; display: flex; flex-direction: column; overflow-y: auto; }
.modal__close {
  position: absolute; top: 20px; right: 20px; background: none; border: none;
  color: var(--cream); font-size: 22px; cursor: pointer; opacity: .5;
  transition: opacity .2s; line-height: 1; padding: 4px;
}
.modal__close:hover { opacity: 1; }
.modal__coll { font-size: 10px; font-weight: 700; letter-spacing: .45em; text-transform: uppercase; color: var(--gold); margin-bottom: 14px; }
.modal__name { font-family: 'Cormorant Garamond', serif; font-weight: 300; font-size: 38px; color: var(--cream); line-height: 1.05; margin-bottom: 10px; }
.modal__price { font-size: 18px; font-weight: 400; letter-spacing: .08em; color: var(--grey); margin-bottom: 24px; }
.modal__desc { font-size: 13px; font-weight: 300; letter-spacing: .04em; line-height: 1.7; color: var(--grey); margin-bottom: 32px; }
.modal__sizes { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 36px; }
.size-btn {
  width: 52px; height: 52px; border: 1px solid var(--divider); background: none;
  color: var(--cream); font-family: 'Barlow Condensed', sans-serif; font-size: 13px;
  font-weight: 500; letter-spacing: .06em; cursor: pointer;
  transition: background .2s, border-color .2s, color .2s;
}
.size-btn:hover:not(.size-btn--sold) { border-color: var(--cream); }
.size-btn--active { background: var(--cream); color: var(--black); border-color: var(--cream); }
.size-btn--sold { opacity: .3; text-decoration: line-through; cursor: not-allowed; }
.modal__add {
  margin-top: auto; padding: 17px; background: var(--cream); color: var(--black);
  border: none; font-family: 'Barlow Condensed', sans-serif; font-size: 12px;
  font-weight: 700; letter-spacing: .45em; text-transform: uppercase;
  cursor: pointer; transition: background .25s;
}
.modal__add:hover:not(:disabled) { background: var(--gold); }
.modal__add:disabled { opacity: .4; cursor: not-allowed; }

/* ═══ CART DRAWER ═══ */
.cart-backdrop {
  position: fixed; inset: 0; background: rgba(8,8,8,.7); z-index: 250;
  animation: fadeIn .25s ease;
}
.cart-drawer {
  position: fixed; top: 0; right: 0; bottom: 0; width: 420px; max-width: 100vw;
  background: var(--dim); border-left: 1px solid var(--divider);
  display: flex; flex-direction: column;
  animation: slideInRight .35s cubic-bezier(.16,1,.3,1);
}
@keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
.cart-drawer__head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 28px 28px 20px; border-bottom: 1px solid var(--divider);
}
.cart-drawer__head .modal__close { position: static; }
.cart-drawer__title {
  font-family: 'Cormorant Garamond', serif; font-weight: 300; font-size: 24px; color: var(--cream);
}
.cart-drawer__body { flex: 1; overflow-y: auto; padding: 20px 28px; }
.cart-drawer__empty { text-align: center; padding: 60px 0; color: var(--grey); font-size: 14px; }
.cart-drawer__foot { padding: 20px 28px 28px; border-top: 1px solid var(--divider); }
.cart-item {
  display: flex; gap: 16px; padding: 16px 0;
  border-bottom: 1px solid var(--divider);
}
.cart-item__img { width: 72px; height: 96px; background: #111; flex-shrink: 0; overflow: hidden; }
.cart-item__img img { width: 100%; height: 100%; object-fit: cover; }
.cart-item__placeholder {
  width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
  font-family: 'Cormorant Garamond', serif; font-size: 18px; color: rgba(242,237,229,.15);
}
.cart-item__info { flex: 1; display: flex; flex-direction: column; justify-content: center; }
.cart-item__name {
  font-family: 'Cormorant Garamond', serif; font-weight: 400; font-size: 16px;
  color: var(--cream); margin-bottom: 4px; line-height: 1.2;
}
.cart-item__variant { font-size: 11px; color: var(--grey); letter-spacing: .06em; margin-bottom: 6px; }
.cart-item__price { font-size: 13px; color: var(--cream); letter-spacing: .04em; }
.cart-item__remove {
  background: none; border: none; color: var(--grey); font-size: 18px;
  cursor: pointer; padding: 4px 8px; align-self: flex-start;
  transition: color .2s;
}
.cart-item__remove:hover { color: var(--cream); }

/* ═══ TOAST ═══ */
.toast {
  position: fixed; bottom: 44px; left: 50%; transform: translateX(-50%);
  background: var(--gold); color: var(--black); padding: 14px 36px;
  font-size: 11px; font-weight: 700; letter-spacing: .4em; text-transform: uppercase;
  z-index: 300; animation: toastIn .35s cubic-bezier(.16,1,.3,1); white-space: nowrap;
}
@keyframes toastIn { from { opacity: 0; transform: translate(-50%, 16px); } to { opacity: 1; transform: translate(-50%, 0); } }

/* ═══ BACK TO TOP ═══ */
.back-to-top {
  position: fixed; bottom: 32px; right: 32px; width: 44px; height: 44px;
  border: 1px solid var(--divider); background: rgba(8,8,8,.85); color: var(--cream);
  display: flex; align-items: center; justify-content: center; cursor: pointer;
  z-index: 50; transition: border-color .2s, background .2s;
  backdrop-filter: blur(8px); animation: fadeIn .3s ease;
}
.back-to-top:hover { border-color: var(--gold); background: rgba(8,8,8,.95); }

/* ═══ ACCOUNT MODAL ═══ */
.account-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,.72); z-index: 1200;
  display: flex; align-items: center; justify-content: center;
}
.account-modal {
  background: #0a0a0a; border: 1px solid #2a2a2a; width: 100%; max-width: 400px;
  padding: 40px 36px 44px; position: relative; color: #fff;
  animation: slideUp .35s cubic-bezier(.16,1,.3,1);
}
.account-modal__close {
  position: absolute; top: 16px; right: 20px; background: none; border: none;
  color: #888; font-size: 22px; cursor: pointer; line-height: 1;
}
.account-modal__close:hover { color: #fff; }
.account-modal__tabs { display: flex; border-bottom: 1px solid #2a2a2a; margin-bottom: 28px; }
.account-modal__tab {
  flex: 1; background: none; border: none; color: #666;
  font-family: inherit; font-size: 11px; letter-spacing: .12em;
  text-transform: uppercase; padding: 12px 0; cursor: pointer;
  border-bottom: 2px solid transparent; margin-bottom: -1px;
  transition: color .2s, border-color .2s;
}
.account-modal__tab.active { color: #c9a84c; border-bottom-color: #c9a84c; }
.account-modal__sub { font-size: 13px; color: #888; margin-bottom: 24px; letter-spacing: .04em; }
.account-modal__input {
  width: 100%; background: #111; border: 1px solid #2a2a2a; color: #fff;
  font-family: inherit; font-size: 13px; padding: 12px 14px; margin-bottom: 12px;
  outline: none; box-sizing: border-box;
}
.account-modal__input::placeholder { color: #555; }
.account-modal__input:focus { border-color: #c9a84c; }
.account-modal__cta {
  width: 100%; background: #c9a84c; color: #000; border: none;
  font-family: inherit; font-size: 11px; letter-spacing: .14em; font-weight: 600;
  padding: 14px; cursor: pointer; margin-top: 4px; transition: background .2s;
}
.account-modal__cta:hover { background: #e0b85a; }
.account-modal__forgot {
  text-align: center; font-size: 11px; color: #555; margin-top: 16px;
  cursor: pointer; letter-spacing: .06em;
}
.account-modal__forgot:hover { color: #c9a84c; }

/* ═══ OUR STORY PAGE ═══ */
.story { padding-top: 72px; }
.story__hero { padding: 120px 64px 80px; border-bottom: 1px solid var(--divider); }
.story__back {
  background: none; border: none; color: var(--grey);
  font-family: 'Barlow Condensed', sans-serif; font-size: 12px; font-weight: 600;
  letter-spacing: .2em; text-transform: uppercase; cursor: pointer;
  margin-bottom: 48px; display: block; padding: 0; transition: color .2s;
}
.story__back:hover { color: var(--cream); }
.story__headline {
  font-family: 'Cormorant Garamond', serif; font-weight: 300;
  font-size: clamp(44px, 5.5vw, 80px); line-height: 1.05;
  color: var(--cream); margin-top: 16px;
}
.story__headline em { font-style: italic; color: var(--gold); }
.story__body { max-width: 720px; padding: 96px 64px 120px; }
.story__section { margin-bottom: 64px; }
.story__subhead {
  font-family: 'Cormorant Garamond', serif; font-weight: 400;
  font-size: 28px; color: var(--cream); margin-bottom: 20px;
}
.story__text { font-size: 15px; font-weight: 300; letter-spacing: .05em; line-height: 1.85; color: var(--grey); }
.story__cta-row { padding-top: 24px; }

/* ═══ RESPONSIVE ═══ */
@media (max-width: 768px) {
  .nav { padding: 0 20px; }
  .nav__right { gap: 20px; }
  .nav__logo-img { height: 26px; }
  .hero { padding: 0 24px 80px; min-height: 600px; }
  .collections__head { flex-direction: column; gap: 24px; padding: 64px 32px 36px; }
  .collections__grid { grid-template-columns: 1fr; }
  .products { padding: 64px 24px 80px; }
  .products__head { flex-direction: column; gap: 24px; }
  .products__grid { grid-template-columns: 1fr 1fr; }
  .filter-tabs { flex-wrap: wrap; }
  .modal { grid-template-columns: 1fr; max-height: 95vh; overflow-y: auto; }
  .modal__img { max-height: 50vh; }
  .modal__body { padding: 36px 28px; }
  .cart-drawer { width: 100vw; }
  .footer { padding: 64px 24px 36px; }
  .footer__top { grid-template-columns: 1fr 1fr; gap: 36px; }
  .footer__bottom { flex-direction: column; gap: 16px; text-align: center; }
  .newsletter { padding: 64px 24px; }
  .newsletter__form { flex-direction: column; }
  .newsletter__btn { width: 100%; }
  .story__hero { padding: 100px 24px 60px; }
  .story__body { padding: 64px 24px 80px; }
  .back-to-top { bottom: 20px; right: 20px; width: 40px; height: 40px; }
}

@media (max-width: 480px) {
  .products__grid { grid-template-columns: 1fr; }
  .footer__top { grid-template-columns: 1fr; }
  .coll-card__name { font-size: 36px; }
}
`;
