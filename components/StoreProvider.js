"use client";

import { createContext, useContext, useEffect, useState, useSyncExternalStore } from "react";
import { getProduct } from "@/lib/products";

const StoreContext = createContext(null);
const emptyStore = { cart: [], wishlist: [], ready: false };
let cachedRaw;
let cachedStore = emptyStore;
const listeners = new Set();

function normalize(raw) {
  const value = JSON.parse(raw || "{}");
  const cart = Array.isArray(value.cart) ? value.cart.filter((item) => {
    const product = getProduct(item.id);
    return product && product.sizes.includes(item.size) && product.colors.includes(item.color) && Number.isInteger(item.quantity) && item.quantity > 0 && item.quantity <= 10 && item.key === `${item.id}:${item.size}:${item.color}`;
  }) : [];
  return { cart: cart.filter((item, index) => cart.findIndex((entry) => entry.key === item.key) === index), wishlist: Array.isArray(value.wishlist) ? [...new Set(value.wishlist.filter((id) => getProduct(id)))] : [], ready: true };
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
  const [cartOpen, setCartOpen] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(timer);
  }, [toast]);

  function persist(value) {
    if (!saveStore(value)) setToast("Browser storage is unavailable. Your bag may not survive a refresh.");
  }

  function addItem(id, size, color, quantity = 1) {
    const product = getProduct(id);
    if (!product || !product.sizes.includes(size) || !product.colors.includes(color) || !Number.isInteger(quantity) || quantity < 1 || quantity > 10) return false;
    const current = getSnapshot();
    const key = `${id}:${size}:${color}`;
    const existing = current.cart.find((item) => item.key === key);
    if (existing && existing.quantity + quantity > 10) {
      setToast("You can add up to 10 of each size and colour combination.");
      return false;
    }
    const cart = existing ? current.cart.map((item) => item.key === key ? { ...item, quantity: item.quantity + quantity } : item) : [...current.cart, { key, id, size, color, quantity }];
    persist({ ...current, cart });
    setCartOpen(true);
    return true;
  }

  function updateQuantity(key, quantity) {
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) return;
    const current = getSnapshot();
    persist({ ...current, cart: current.cart.map((item) => item.key === key ? { ...item, quantity } : item) });
  }

  function removeItem(key) {
    const current = getSnapshot();
    persist({ ...current, cart: current.cart.filter((item) => item.key !== key) });
  }

  function toggleWishlist(id) {
    if (!getProduct(id)) return;
    const current = getSnapshot();
    const exists = current.wishlist.includes(id);
    persist({ ...current, wishlist: exists ? current.wishlist.filter((item) => item !== id) : [...current.wishlist, id] });
    setToast(exists ? "Removed from your favourites." : "Saved to your favourites.");
  }

  const count = store.cart.reduce((total, item) => total + item.quantity, 0);
  const subtotal = store.cart.reduce((total, item) => total + getProduct(item.id).price * item.quantity, 0);

  return <StoreContext.Provider value={{ ...store, count, subtotal, cartOpen, setCartOpen, addItem, updateQuantity, removeItem, toggleWishlist, notify: setToast }}>
    {children}
    {toast && <div className="toast" role="status">{toast}</div>}
  </StoreContext.Provider>;
}

export const useStore = () => useContext(StoreContext);
