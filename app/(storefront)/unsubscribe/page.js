import Link from "next/link";
import UnsubscribeForm from "@/components/UnsubscribeForm";

export const instant = false;

export const metadata = {
  title: "Unsubscribe",
  description: "Leave the SOLEIX newsletter list in one step.",
  robots: { index: false, follow: true },
};

export default async function UnsubscribePage({ searchParams }) {
  const params = await searchParams;
  const token = String(params.token || "").trim().slice(0, 64);

  return (
    <section className="page-shell unsubscribe-page">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Home</Link><span aria-hidden="true">/</span><span aria-current="page">Unsubscribe</span>
      </nav>
      <p className="eyebrow">NO HARD FEELINGS</p>
      <h1 className="page-title">LEAVE THE LIST.</h1>
      <p className="page-intro">
        One address, one list, kept in our own database. Use the link from an email or type your address here and the
        record is switched off immediately — no confirmation round trip.
      </p>
      <UnsubscribeForm token={token} />
      <p className="muted mt-6">
        Rather keep some emails? <Link className="text-link" href="/info/contact">Tell us on the contact form</Link> and a
        person can narrow what you receive.
      </p>
    </section>
  );
}
