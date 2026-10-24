import { Card, Notice, PageHead, Table } from "@/components/dashboard/Bits";
import { getShop, listShops } from "@/lib/queries.mjs";
import { deleteShopAction, saveShopAction } from "@/lib/dashboard-actions";
import { can, shopIdsFor } from "@/lib/session.mjs";

export default function ShopsView({ user, base, next, flash, params }) {
  const shops = listShops(user.role === "superadmin" ? null : shopIdsFor(user));
  const editing = params.edit ? getShop(Number(params.edit)) : null;
  const isNew = params.new === "1" || !editing;
  const form = editing || {};
  const allowed = can(user, "shops");

  return (
    <>
      <PageHead
        title={user.role === "superadmin" ? "Shop management" : "Assigned shops"}
        subtitle={
          user.role === "superadmin"
            ? "Every shop, its staff and its activity. Deleting a shop removes its products and stock records."
            : "Shops linked to your admin account."
        }
        actions={
          allowed && !isNew ? (
            <a className="btn-ghost" href={`${base}/shops?new=1`}>
              New shop
            </a>
          ) : null
        }
      />
      {flash && <Notice kind={flash.kind} text={flash.text} />}

      {allowed ? (
        <Card title={isNew ? "Create shop" : `Edit ${form.name}`}>
          <form action={saveShopAction} className="form-grid">
            <input type="hidden" name="next" value={next} />
            {!isNew && <input type="hidden" name="id" value={form.id} />}
            <label className="field">
              <span className="form-label">Shop name</span>
              <input className="input" name="name" defaultValue={form.name ?? ""} required />
            </label>
            <label className="field">
              <span className="form-label">Phone</span>
              <input className="input" name="phone" defaultValue={form.phone ?? ""} placeholder="+92 51 000 0000" />
            </label>
            <label className="field full">
              <span className="form-label">Address</span>
              <input className="input" name="address" defaultValue={form.address ?? ""} />
            </label>
            <label className="field full">
              <span className="form-label">Description</span>
              <textarea className="input" name="description" rows={3} defaultValue={form.description ?? ""} />
            </label>
            <div className="full check-row">
              <label className="check-field">
                <input type="checkbox" name="active" value="1" defaultChecked={isNew ? true : !!form.active} />
                Shop open (accepting orders)
              </label>
            </div>
            <div className="full form-actions">
              <button className="btn-solid" type="submit">{isNew ? "Create shop" : "Save shop"}</button>
              {!isNew && <a className="btn-ghost" href={`${base}/shops`}>Cancel</a>}
            </div>
          </form>
        </Card>
      ) : (
        <Notice kind="err" text="Your account does not have shop creation permission, so this screen is read-only for you." />
      )}

      <Card title="Shops" description={`${shops.length} shop${shops.length === 1 ? "" : "s"} in scope.`}>
        <Table
          columns={["Shop", "Assigned admins", "Products", "Orders", "Status", "Actions"]}
          rows={shops.map((shop) => (
            <tr key={shop.id}>
              <td>
                <strong>{shop.name}</strong>
                <div className="muted" style={{ fontSize: 12.5 }}>{shop.address || "No address saved"}</div>
              </td>
              <td>{shop.admins || "—"}</td>
              <td className="num">{shop.product_count}</td>
              <td className="num">{shop.order_count}</td>
              <td>
                <span className={`badge ${shop.active ? "badge-ok" : "badge-off"}`}>{shop.active ? "Open" : "Closed"}</span>
              </td>
              <td>
                <div className="form-actions">
                  {allowed && <a className="link-quiet" href={`${base}/shops?edit=${shop.id}`}>Edit</a>}
                  <a className="link-quiet" href={`${base}/products?shop=${shop.id}`}>Products</a>
                  {user.role === "superadmin" && (
                    <form action={deleteShopAction}>
                      <input type="hidden" name="next" value={next} />
                      <input type="hidden" name="id" value={shop.id} />
                      <button className="link-quiet" type="submit">
                        Delete
                      </button>
                    </form>
                  )}
                </div>
              </td>
            </tr>
          ))}
          empty="No shops yet."
          emptyHint="Create the first shop, then assign admins and products to it."
        />
      </Card>
    </>
  );
}
