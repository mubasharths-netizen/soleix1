import CartContents from "@/components/CartContents";

export const metadata = { title: "Your Bag" };
export default function CartPage() {
  return <section className="section page-shell"><p className="eyebrow">A GOOD NEXT STEP</p><h1 className="page-title">YOUR BAG.</h1><CartContents /></section>;
}
