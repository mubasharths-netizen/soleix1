import ForgotPasswordForm from "@/components/ForgotPasswordForm";
import AuthBackdrop from "@/components/AuthBackdrop";

export const metadata = { title: "Reset your password · SOLEIX" };

export default function ForgotPasswordPage() {
  return (
    <div className="auth-page">
      <AuthBackdrop />
      <div className="auth-stack">
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
