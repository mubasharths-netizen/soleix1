import { redirect } from "next/navigation";
import AuthBackdrop from "@/components/AuthBackdrop";
import LoginForm from "@/components/LoginForm";
import { getSessionUser, homeFor } from "@/lib/session.mjs";

export const metadata = { title: "Sign in · SOLEIX" };

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect(homeFor(user.role));

  return (
    <div className="auth-page">
      <AuthBackdrop />
      <div className="auth-stack">
        <LoginForm />
        <a className="auth-back" href="/">
          Back to the SOLEIX store
        </a>
      </div>
    </div>
  );
}
