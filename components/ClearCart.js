"use client";

import { useEffect } from "react";
import { useStore } from "@/components/StoreProvider";

// The bag belongs to the browser, so the shopper's own confirmation page is where it is emptied.
export default function ClearCart() {
  const { cart, clearCart } = useStore();
  useEffect(() => {
    sessionStorage.removeItem("soleix-checkout-intent");
    if (cart.length) clearCart();
  }, [cart.length, clearCart]);
  return null;
}
