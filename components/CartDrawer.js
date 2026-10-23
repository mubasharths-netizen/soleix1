"use client";

import Modal from "./Modal";
import CartContents from "./CartContents";
import { useStore } from "./StoreProvider";

export default function CartDrawer() {
  const { cartOpen, setCartOpen, count } = useStore();
  return <Modal open={cartOpen} onClose={() => setCartOpen(false)} title={`Your bag (${count})`} drawer><CartContents compact /></Modal>;
}
