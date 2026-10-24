import CheckoutForm from "@/components/CheckoutForm";

export const metadata = {
  title: "Checkout",
  description: "Complete your SOLEIX order with Cash on Delivery. Review the delivery details, the shop's live prices and your total before placing the order.",
};

export default function CheckoutPage() {
  return (
    <section className="section page-shell checkout-page light-panel">
      <p className="eyebrow">ALMOST YOURS</p>
      <h1 className="page-title">CHECKOUT.</h1>
      <p className="page-intro">Cash on Delivery across Pakistan — pay the rider when your parcel arrives. Prices, delivery and stock are re-read from the shop&apos;s live records when you place the order.</p>
      <CheckoutForm />
    </section>
  );
}
