import { redirect } from "next/navigation";
import AuthBackdrop from "@/components/AuthBackdrop";
import AuthForm from "@/components/AuthForm";
import { accountBlocked, getAccountUser, homeFor, safeNext } from "@/lib/session.mjs";

export const metadata = { title: "Sign in · SOLEIX" };
export const instant = false;

export default async function LoginPage({ searchParams }) {
  const params = await searchParams;
  const user = await getAccountUser();
  const revoked = accountBlocked(user);
  if (user && !revoked) redirect(safeNext(params.next) || (user.kind === "staff" ? homeFor(user.role) : "/account"));

  const notice = params.signedout === "1" ? "You are signed out. Your bag and favourites stay on this device."
    : params.created === "1" ? "Account created — sign in whenever you are ready."
    : params.set === "1" ? "Password set. Sign in with your new password."
    : "";
  const problem = revoked || params.revoked === "1"
    ? "This account has been closed by the SOLEIX team, so its orders and addresses are on hold. Contact support to reopen it."
    : "";

  return (
    <div className="auth-page">
      <AuthBackdrop />
      <div className="auth-stack">
        {notice && <p className="auth-toast" role="status">{notice}</p>}
        {problem && <p className="auth-error" role="alert">{problem}</p>}
        <AuthForm mode="login" next={safeNext(params.next)} />
      </div>
    </div>
  );
}
