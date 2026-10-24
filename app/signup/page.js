import { redirect } from "next/navigation";
import AuthBackdrop from "@/components/AuthBackdrop";
import AuthForm from "@/components/AuthForm";
import { getAccountUser, homeFor, safeNext } from "@/lib/session.mjs";

export const metadata = { title: "Create your SOLEIX account" };
export const instant = false;

export default async function SignUpPage({ searchParams }) {
  const params = await searchParams;
  const user = await getAccountUser();
  if (user) redirect(safeNext(params.next) || (user.kind === "staff" ? homeFor(user.role) : "/account"));

  return (
    <div className="auth-page">
      <AuthBackdrop />
      <div className="auth-stack">
        <AuthForm mode="signup" next={safeNext(params.next)} />
      </div>
    </div>
  );
}
