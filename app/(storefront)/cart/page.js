import CartContents from "@/components/CartContents";

export const metadata = {
  title: "Your bag",
  description: "Review the pairs in your SOLEIX bag, with live stock, delivery cost and the free-delivery threshold before checkout.",
  alternates: { canonical: "/cart" },
};
export default function CartPage() {
  return <section className="section page-shell"><p className="eyebrow">A GOOD NEXT STEP</p><h1 className="page-title">YOUR BAG.</h1><CartContents /></section>;
}
