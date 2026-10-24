import { redirect } from "next/navigation";
import AuthBackdrop from "@/components/AuthBackdrop";
import LoginForm from "@/components/LoginForm";
import { googleConfigured } from "@/lib/google.mjs";
import { getSessionUser, homeFor } from "@/lib/session.mjs";

export const metadata = { title: "Sign in · SOLEIX" };
export const instant = false;

const OAUTH_ERRORS = {
  google_cancelled: "Google sign-in was cancelled. Use your email and password, or try again.",
  google_failed: "Google sign-in could not be verified. Please try again or use your email and password.",
  google_no_account: "That Google account is not linked to a SOLEIX staff account. Ask the Super Admin to register its email.",
  google_not_configured: "Google sign-in is not configured on this server yet. Use your email and password.",
};

export default async function LoginPage({ searchParams }) {
  const user = await getSessionUser();
  if (user) redirect(homeFor(user.role));

  const { error } = await searchParams;
  const authError = error ? OAUTH_ERRORS[error] : undefined;

  return (
    <div className="auth-page">
      <AuthBackdrop />
      <div className="auth-stack">
        <LoginForm authError={authError} googleEnabled={googleConfigured()} />
      </div>
    </div>
  );
}
