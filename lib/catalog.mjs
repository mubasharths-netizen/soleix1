// Client-safe catalogue helpers. The product data itself comes from the database through
// /api/catalog; this module only formats it and answers questions about a product list.

export const colorValues = { Ivory: "#e6e0d2", Black: "#30322f", Sage: "#9ba88f", Blush: "#e4bbb8", White: "#fafafa", Grey: "#a4a5a3" };

export const formatPrice = (value) => `PKR ${new Intl.NumberFormat("en-PK").format(Math.round(Number(value) || 0))}`;

export const variantKey = (size, color) => `${size}:${color}`;

export const DEFAULT_SETTINGS = { deliveryFee: 250, freeDeliveryOver: 15000, orderPrefix: "SOL", discount: { active: false, percent: 0, flat: 0, minimum: 0 } };

// Delivery always comes from the saved shop settings, never from the browser.
export function shippingCost(subtotal, settings = DEFAULT_SETTINGS) {
  const fee = Number(settings.deliveryFee) || 0;
  const threshold = Number(settings.freeDeliveryOver) || 0;
  if (!subtotal) return 0;
  return threshold && subtotal >= threshold ? 0 : fee;
}

// The browser only knows that a campaign exists; the code is confirmed by the server before the
// money appears in a total, and checkout re-reads it when the order is written.
export function discountAmount(items, settings = DEFAULT_SETTINGS, coupon = "") {
  const campaign = settings.discount || {};
  if (!campaign.active || !String(coupon || "").trim()) return 0;
  const subtotal = items.reduce((total, item) => total + item.price * item.quantity, 0);
  if (campaign.minimum && subtotal < Number(campaign.minimum)) return 0;
  if (campaign.percent) return Math.round((subtotal * Number(campaign.percent)) / 100);
  return Math.min(Number(campaign.flat) || 0, subtotal);
}

export function orderTotals(items, settings = DEFAULT_SETTINGS, coupon = "") {
  const subtotal = items.reduce((total, item) => total + item.price * item.quantity, 0);
  const delivery = shippingCost(subtotal, settings);
  const discount = Math.min(discountAmount(items, settings, coupon), subtotal + delivery);
  return { subtotal, delivery, discount, total: Math.max(0, subtotal + delivery - discount) };
}

export const stockFor = (product, size, color) => Number(product?.stock?.[variantKey(size, color)] ?? 0);

export const isInStock = (product, size, color) => stockFor(product, size, color) > 0;

// Keeps the storefront layout identical to the original design: sizes that have no stock at all
// are still listed so the selector can show them as sold out.
export function decorate(product) {
  const entries = Object.entries(product?.stock || {});
  const outOfStock = [...new Set(entries.filter(([, qty]) => qty === 0).map(([key]) => Number(key.split(":")[0])))];
  return { ...product, outOfStock, lowStock: Number(product?.lowStock) || 3 };
}

export function indexCatalog(list) {
  const map = new Map((list || []).map((product) => [product.id, product]));
  return { list, map, get: (id) => map.get(id) };
}
