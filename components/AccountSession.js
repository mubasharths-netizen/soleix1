import Link from "next/link";
import Icon from "@/components/Icon";
import { logoutAction } from "@/lib/dashboard-actions";
import { getSessionUser, homeFor } from "@/lib/session.mjs";

const ROLE_LABEL = { superadmin: "Super Admin", admin: "Admin", shop: "Shop panel" };

export default async function AccountSession() {
  const user = await getSessionUser();

  return (
    <>
      <p className="page-intro">
        {user
          ? `Signed in as ${user.name}. Your storefront bag and favourites stay on this browser.`
          : "You're exploring as a guest. Your bag and favourites stay with you on this browser — no account needed."}
      </p>
      <div className="notice">
        <Icon name="shield" />
        {user ? (
          <p>
            <strong>{ROLE_LABEL[user.role]}</strong> ·{" "}
            <Link className="text-link" href={homeFor(user.role)}>Open your dashboard <Icon name="arrow" /></Link>{" "}
            <form action={logoutAction} className="inline-form">
              <button type="submit" className="text-link">Logout</button>
            </form>
          </p>
        ) : (
          <p>
            Customers check out as guests — we never ask for a password. SOLEIX team members can{" "}
            <Link className="text-link" href="/login">sign in here <Icon name="arrow" /></Link>.
          </p>
        )}
      </div>
    </>
  );
}
