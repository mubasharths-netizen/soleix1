import Link from "next/link";
import AccountProfile from "@/components/AccountProfile";
import { getCustomer, listAddresses } from "@/lib/queries.mjs";
import { requireAccountUser } from "@/lib/session.mjs";
import { db } from "@/lib/db.mjs";

export const instant = false;
export const metadata = { title: "Profile and addresses" };

export default async function AccountProfilePage() {
  const user = await requireAccountUser("/account/profile");
  const customer = user.kind === "customer" ? getCustomer(user.uid) : null;
  const staff = user.kind === "staff" ? db.prepare("SELECT name FROM users WHERE id = ?").get(user.id) : null;

  return (
    <section className="section page-shell account-page light-panel">
      <p className="eyebrow">ONE SET OF DETAILS, EVERY CHECKOUT</p>
      <h1 className="page-title">PROFILE.</h1>
      <p className="page-intro">
        {user.kind === "customer"
          ? "Keep your name and phone current and save the places you get parcels to. Checkout fills itself in from here."
          : "Your display name is what the shops see on orders you record in the dashboard."}
      </p>

      <AccountProfile
        kind={user.kind}
        initial={{
          full_name: customer?.name || staff?.name || user.name || "",
          phone: customer?.phone || "",
          email: user.email || "",
        }}
        addresses={user.kind === "customer" ? listAddresses(user.uid) : []}
      />

      <p className="order-next">
        <Link href="/account/orders" className="button button-ghost">My orders</Link>
      </p>
    </section>
  );
}
