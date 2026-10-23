import CartContents from "@/components/CartContents";

export const metadata = { title: "Checkout Preview" };
export default function CheckoutPage() {
  return <section className="section page-shell"><p className="eyebrow">ONE LAST LOOK</p><h1 className="page-title">CHECKOUT PREVIEW.</h1><p className="page-intro">Review your selection below. This is a frontend demo — checkout and payments are not available.</p><CartContents checkout /></section>;
}
