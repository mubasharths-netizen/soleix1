import { Card, Notice, PageHead, Table } from "@/components/dashboard/Bits";
import { activityLog } from "@/lib/queries.mjs";

const ENTITIES = ["", "order", "product", "inventory", "shop", "user", "customer", "settings", "category"];
const ENTITY_LABEL = {
  order: "Orders",
  product: "Products",
  inventory: "Stock",
  shop: "Shops",
  user: "Accounts",
  customer: "Customers",
  settings: "Settings",
  category: "Categories",
};

export default function ActivityView({ base, flash, params }) {
  const entity = ENTITIES.includes(params.entity) ? params.entity : "";
  const term = String(params.q || "").trim().toLowerCase();
  const rows = activityLog(300).filter((row) => {
    if (entity && row.entity !== entity) return false;
    return !term || `${row.user_label} ${row.action} ${row.entity_id} ${row.detail}`.toLowerCase().includes(term);
  });

  return (
    <>
      <PageHead
        title="Activity log"
        subtitle="Every administrative action — status changes, cash collections, account and permission edits — with the person who did it."
      />
      {flash && <Notice kind={flash.kind} text={flash.text} />}

      <Card title="Recorded actions" description={`${rows.length} entr${rows.length === 1 ? "y" : "ies"}, newest first. The log is written by the server, never by the browser.`}>
        <form action={`${base}/activity`} className="toolbar">
          <input className="input" name="q" defaultValue={params.q || ""} placeholder="Person, action or order reference" />
          <select className="select" name="entity" defaultValue={entity}>
            <option value="">Any area</option>
            {ENTITIES.slice(1).map((option) => (
              <option key={option} value={option}>
                {ENTITY_LABEL[option]}
              </option>
            ))}
          </select>
          <button className="btn-solid" type="submit">Filter</button>
          <a className="link-quiet" href={`${base}/activity`}>Reset</a>
        </form>

        <Table
          columns={["When", "Who", "Role", "Action", "Record", "Detail", "Shop"]}
          rows={rows.map((row) => (
            <tr key={row.id}>
              <td className="num">{row.created_at}</td>
              <td>{row.user_label}</td>
              <td>
                <span className="badge badge-off">{row.user_role}</span>
              </td>
              <td>
                <strong style={{ fontSize: 13 }}>{row.action}</strong>
              </td>
              <td>
                {row.entity || "—"}
                {row.entity_id ? ` · ${row.entity_id}` : ""}
              </td>
              <td>{row.detail || "—"}</td>
              <td>{row.shop_name || "—"}</td>
            </tr>
          ))}
          empty="No activity matches these filters."
          emptyHint="Change an order status or a stock level and the entry shows up here immediately."
        />
      </Card>
    </>
  );
}
