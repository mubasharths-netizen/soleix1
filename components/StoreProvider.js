"use client";

import { createContext, useContext, useEffect, useState, useSyncExternalStore } from "react";
import { DEFAULT_SETTINGS, decorate, indexCatalog, stockFor } from "@/lib/catalog.mjs";

const StoreContext = createContext(null);
const emptyStore = { cart: [], wishlist: [], ready: false };
const emptyCatalog = { products: [], byId: indexCatalog([]), get: () => undefined, settings: DEFAULT_SETTINGS, shops: [], categories: [], ready: false };
let cachedRaw;
let cachedStore = emptyStore;
const listeners = new Set();
// The catalogue arrives from /api/catalog after hydration, so the stored cart is kept as-is
// until it lands and only then filtered against real products and variants.
let catalogue = null;

function knownVariant(item) {
  if (!catalogue) return true;
  const product = catalogue.get(item.id);
  return Boolean(product) && product.sizes.includes(item.size) && product.colors.includes(item.color);
}

function normalize(raw) {
  const value = JSON.parse(raw || "{}");
  const cart = Array.isArray(value.cart) ? value.cart.filter((item) => {
    return item.key === `${item.id}:${item.size}:${item.color}` && Number.isInteger(item.quantity) && item.quantity > 0 && item.quantity <= 10 && knownVariant(item);
  }) : [];
  return { cart: cart.filter((item, index) => cart.findIndex((entry) => entry.key === item.key) === index), wishlist: Array.isArray(value.wishlist) ? [...new Set(value.wishlist.filter((id) => !catalogue || catalogue.get(id)))] : [], ready: true };
}

function getSnapshot() {
  try {
    const raw = localStorage.getItem("soleix-store-v1");
    if (raw !== cachedRaw || !cachedStore.ready) {
      cachedRaw = raw;
      cachedStore = normalize(raw);
    }
  } catch {
    if (!cachedStore.ready) cachedStore = { ...emptyStore, ready: true };
  }
  return cachedStore;
}

function subscribe(listener) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => { listeners.delete(listener); window.removeEventListener("storage", listener); };
}

function saveStore(value) {
  cachedStore = { ...value, ready: true };
  cachedRaw = JSON.stringify(cachedStore);
  let saved = true;
  try { localStorage.setItem("soleix-store-v1", cachedRaw); } catch { saved = false; }
  listeners.forEach((listener) => listener());
  return saved;
}

export function StoreProvider({ children }) {
  const store = useSyncExternalStore(subscribe, getSnapshot, () => emptyStore);
  const [catalog, setCatalog] = useState(emptyCatalog);
  const [cartOpen, setCartOpen] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    let alive = true;
    fetch("/api/catalog", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        if (!alive) return;
        const products = (data.products || []).map(decorate);
        catalogue = indexCatalog(products);
        setCatalog({ products, byId: catalogue, get: catalogue.get, settings: { ...DEFAULT_SETTINGS, ...data.settings }, shops: data.shops || [], categories: data.categories || [], ready: true });
        cachedRaw = undefined;
        cachedStore = emptyStore;
        listeners.forEach((listener) => listener());
      })
      .catch(() => { /* the storefront stays in its loading state until the catalogue answers */ });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(timer);
  }, [toast]);

  function persist(value) {
    if (!saveStore(value)) setToast("Browser storage is unavailable. Your bag may not survive a refresh.");
  }

  function ceilingFor(id, size, color) {
    const product = catalog.get(id);
    return product ? Math.min(10, stockFor(product, size, color)) : 10;
  }

  function addItem(id, size, color, quantity = 1) {
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) return false;
    if (catalog.ready && !catalog.get(id)) return false;
    const current = getSnapshot();
    const key = `${id}:${size}:${color}`;
    const existing = current.cart.find((item) => item.key === key);
    const ceiling = ceilingFor(id, size, color);
    if ((existing ? existing.quantity : 0) + quantity > ceiling) {
      setToast(ceiling === 0 ? "This size and colour is sold out." : ceiling < 10 ? `Only ${ceiling} left in this size and colour.` : "You can add up to 10 of each size and colour combination.");
      return false;
    }
    const cart = existing ? current.cart.map((item) => item.key === key ? { ...item, quantity: item.quantity + quantity } : item) : [...current.cart, { key, id, size, color, quantity }];
    persist({ ...current, cart });
    setCartOpen(true);
    return true;
  }

  function updateQuantity(key, quantity) {
    const current = getSnapshot();
    const item = current.cart.find((entry) => entry.key === key);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > ceilingFor(item.id, item.size, item.color)) return;
    persist({ ...current, cart: current.cart.map((entry) => entry.key === key ? { ...entry, quantity } : entry) });
  }

  function removeItem(key) {
    const current = getSnapshot();
    persist({ ...current, cart: current.cart.filter((item) => item.key !== key) });
  }

  function toggleWishlist(id) {
    if (catalog.ready && !catalog.get(id)) return;
    const current = getSnapshot();
    const exists = current.wishlist.includes(id);
    persist({ ...current, wishlist: exists ? current.wishlist.filter((item) => item !== id) : [...current.wishlist, id] });
    setToast(exists ? "Removed from your favourites." : "Saved to your favourites.");
  }

  function clearCart() {
    const current = getSnapshot();
    persist({ ...current, cart: [] });
  }

  const count = store.cart.reduce((total, item) => total + item.quantity, 0);
  const subtotal = catalog.ready ? store.cart.reduce((total, item) => total + (catalog.get(item.id)?.price || 0) * item.quantity, 0) : 0;

  return <StoreContext.Provider value={{ ...store, catalog, count, subtotal, cartOpen, setCartOpen, addItem, updateQuantity, removeItem, clearCart, toggleWishlist, notify: setToast }}>
    {children}
    {toast && <div className="toast" role="status">{toast}</div>}
  </StoreContext.Provider>;
}

export const useStore = () => useContext(StoreContext);
export const useCatalog = () => useContext(StoreContext).catalog;
