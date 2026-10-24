import AuthBackdrop from "@/components/AuthBackdrop";
import SetPasswordForm from "@/components/SetPasswordForm";

export const metadata = { title: "Set your password · SOLEIX" };
export const instant = false;

export default async function SetPasswordPage({ searchParams }) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token.slice(0, 80) : "";
  const error = typeof params.error === "string" ? params.error.slice(0, 240) : "";

  return (
    <div className="auth-page">
      <AuthBackdrop />
      <div className="auth-stack">
        <SetPasswordForm token={token} error={error} />
      </div>
    </div>
  );
}
