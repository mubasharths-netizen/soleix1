import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";

export default function StorefrontLayout({ children }) {
  return <>
    <Header />
    <main id="main-content">{children}</main>
    <Footer />
    <CartDrawer />
  </>;
}
