import Link from "next/link";
import Icon from "@/components/Icon";
import SignOutButton from "@/components/SignOutButton";
import { readProfile } from "@/lib/firebase/admin.mjs";
import { getCustomer, listCustomerOrders } from "@/lib/queries.mjs";
import { homeFor, requireAccountUser } from "@/lib/session.mjs";

const ROLE_LABEL = { superadmin: "Super Admin", admin: "Admin", shop: "Shop panel" };
const PROVIDER_LABEL = { google: "Google", password: "Email and password" };

function memberSince(createdAt) {
  const date = createdAt?.toDate ? createdAt.toDate() : null;
  return date ? date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "";
}

export default async function AccountSession() {
  const user = await requireAccountUser("/account");
  const customer = user.kind === "customer" ? getCustomer(user.uid) : null;
  const profile = user.kind === "customer" ? await readProfile(user.uid) : null;
  const provider = PROVIDER_LABEL[customer?.provider] || PROVIDER_LABEL[user.provider] || "Email and password";
  const orders = user.kind === "customer" ? listCustomerOrders({ uid: user.uid, email: user.email || "" }) : [];

  return (
    <>
      <p className="page-intro">
        Welcome back, <strong>{customer?.name || user.name}</strong>. {user.kind === "staff"
          ? "Your storefront bag and favourites stay on this browser, and your dashboard is one click away."
          : "Your favourites, bag and order history travel with your account across every SOLEIX shop."}
      </p>

      <div className="account-details glass-field">
        <div>
          <span className="account-detail-label">Email</span>
          <strong>{user.email}</strong>
        </div>
        <div>
          <span className="account-detail-label">Signing in with</span>
          <strong>{user.kind === "staff" ? ROLE_LABEL[user.role] : provider}</strong>
        </div>
        {user.kind === "customer" ? (
          <div>
            <span className="account-detail-label">Orders</span>
            <strong>{orders.length}</strong>
          </div>
        ) : (
          <div>
            <span className="account-detail-label">Full name</span>
            <strong>{user.name}</strong>
          </div>
        )}
        {profile ? (
          <div>
            <span className="account-detail-label">Member since</span>
            <strong>{memberSince(profile.createdAt) || (customer?.created_at ? String(customer.created_at).slice(0, 10) : "This session")}</strong>
          </div>
        ) : (
          <div>
            <span className="account-detail-label">Phone</span>
            <strong>{customer?.phone || "Add it in your profile"}</strong>
          </div>
        )}
      </div>

      <div className="notice">
        <Icon name="shield" />
        {user.kind === "staff" ? (
          <p>
            <strong>{ROLE_LABEL[user.role]}</strong> ·{" "}
            <Link className="text-link" href={homeFor(user.role)}>Open your dashboard <Icon name="arrow" /></Link>{" "}
            <SignOutButton />
          </p>
        ) : (
          <p>
            Signed in with {provider.toLowerCase()}. <SignOutButton label="Logout" />
          </p>
        )}
      </div>
    </>
  );
}
