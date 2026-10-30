import Link from "next/link";
import { ActiveBadge, Card, Notice, PageHead, Stat, Table } from "@/components/dashboard/Bits";
import { toggleCustomerAction } from "@/lib/dashboard-actions";
import { listCustomers, money } from "@/lib/queries.mjs";

const PROVIDER_LABEL = {
  password: "Email and password",
  google: "Google account",
  firebase: "Firebase account",
};

export default function CustomersView({ base, next, flash, params }) {
  const term = String(params.q || "").trim().toLowerCase();
  const all = listCustomers();
  const customers = term
    ? all.filter((row) => `${row.name} ${row.email} ${row.phone}`.toLowerCase().includes(term))
    : all;

  const spend = all.reduce((sum, row) => sum + row.spend, 0);
  const due = all.reduce((sum, row) => sum + row.cod_due, 0);
  const buyers = all.filter((row) => row.order_count).length;
  const plural = (count) => (count === 1 ? "" : "s");

  return (
    <>
      <PageHead
        title="Customers"
        subtitle="Shopper accounts created on the storefront. Their orders, addresses and COD balances stay private to them and to you."
      />
      {flash && <Notice kind={flash.kind} text={flash.text} />}

      <div className="stat-grid">
        <Stat label="Customer accounts" value={all.length} hint="Registered in the database" />
        <Stat label="Have ordered" value={buyers} hint={`${all.length - buyers} account${plural(all.length - buyers)} with no order yet`} />
        <Stat label="Cash collected from them" value={money(spend)} hint="Orders marked as collected" />
        <Stat label="COD they still owe" value={money(due)} hint="Open orders paid on delivery" />
      </div>

      <Card title="All customers" description={`${customers.length} account${plural(customers.length)} listed.`}>
        <form action={`${base}/customers`} className="toolbar">
          <input className="input" name="q" defaultValue={params.q || ""} placeholder="Name, email or phone" />
          <button className="btn-solid" type="submit">Search</button>
          <a className="link-quiet" href={`${base}/customers`}>Reset</a>
        </form>

        <Table
          columns={["Customer", "Contact", "Provider", "Orders", "Collected", "COD due", "Last order", "Status", "Access"]}
          rows={customers.map((row) => (
            <tr key={row.uid}>
              <td>
                <strong>{row.name || "No name yet"}</strong>
                <div className="muted" style={{ fontSize: 12.5 }}>{row.address_count} saved address{row.address_count === 1 ? "" : "es"}</div>
              </td>
              <td>
                {row.email}
                <div className="muted" style={{ fontSize: 12.5 }}>{row.phone || "No phone"}</div>
              </td>
              <td>{PROVIDER_LABEL[row.provider] || row.provider}</td>
              <td className="num">{row.order_count}</td>
              <td className="num">{money(row.spend)}</td>
              <td className="num">{money(row.cod_due)}</td>
              <td className="num">{row.last_order || "—"}</td>
              <td><ActiveBadge active={!!row.active} on="Active" off="Blocked" /></td>
              <td>
                <div className="form-actions">
                  <form action={toggleCustomerAction}>
                    <input type="hidden" name="next" value={next} />
                    <input type="hidden" name="uid" value={row.uid} />
                    <button className="link-quiet" type="submit">
                      {row.active ? "Block sign-in" : "Restore access"}
                    </button>
                  </form>
                </div>
              </td>
            </tr>
          ))}
          empty={term ? "No customer matches that search." : "No customer accounts yet."}
          emptyHint={
            term
              ? "Try part of an email address or a phone number."
              : "Customers appear here after they sign up or check out on the storefront."
          }
        />
        <p className="muted" style={{ fontSize: 13, marginTop: 14 }}>
          Blocking an account keeps its order history and removes its access to the account area — the shopper can
          contact you, and you can restore access here.{" "}
          <Link className="link-quiet" href={`${base}/orders`}>
            Open their orders
          </Link>
        </p>
      </Card>
    </>
  );
}
