import { Card, Notice, PageHead, Table } from "@/components/dashboard/Bits";
import { listInventory, listProducts, money } from "@/lib/queries.mjs";
import { deleteStockAction, saveStockAction } from "@/lib/dashboard-actions";
import { can, shopIdsFor } from "@/lib/session.mjs";

export default function InventoryView({ user, base, next, flash, params }) {
  const ids = shopIdsFor(user);
  const editable = can(user, "products");
  const only = params.product ? Number(params.product) : "";
  const products = listProducts(ids).filter((product) => !only || product.id === only);
  const rows = listInventory(ids).filter((row) => !only || row.product_id === only);
  const selected = products.find((product) => product.id === only);

  return (
    <>
      <PageHead
        title="Inventory"
        subtitle={
          editable
            ? "Stock is stored per size and colour. Saving the same combination updates the quantity instead of duplicating it."
            : "Read-only: your account does not have the manage-products permission."
        }
      />
      {flash && <Notice kind={flash.kind} text={flash.text} />}
      {!editable && <Notice kind="err" text="You can view stock levels but not change them." />}

      {editable && (
        <Card title="Add or update a stock line">
          <form action={saveStockAction} className="form-grid">
            <input type="hidden" name="next" value={next} />
            <label className="field">
              <span className="form-label">Product</span>
              <select className="select" name="product_id" defaultValue={selected?.id ?? ""} required>
                <option value="">Choose a product</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} — {product.shop_name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="form-label">Size</span>
              <input className="input" name="size" placeholder="42" required />
            </label>
            <label className="field">
              <span className="form-label">Colour</span>
              <input className="input" name="color" placeholder="Ivory" required />
            </label>
            <label className="field">
              <span className="form-label">Quantity</span>
              <input className="input" type="number" name="qty" min="0" step="1" defaultValue="0" required />
            </label>
            <div className="full form-actions">
              <button className="btn-solid" type="submit">Save stock line</button>
            </div>
          </form>
        </Card>
      )}

      <Card title="Stock lines" description={`${rows.length} row${rows.length === 1 ? "" : "s"} in scope.`}>
        {only && (
          <div className="form-actions">
            <a className="link-quiet" href={`${base}/inventory`}>Clear product filter</a>
          </div>
        )}
        <Table
          columns={["Product", "Shop", "Size", "Colour", "In stock", "Value", "Actions"]}
          rows={rows.map((row) => (
            <tr key={row.id}>
              <td>{row.product_name}</td>
              <td>{row.shop_name || "—"}</td>
              <td className="num">{row.size}</td>
              <td>{row.color}</td>
              <td className="num">
                <span className={`badge ${row.qty === 0 ? "badge-off" : row.qty <= 3 ? "badge-warn" : "badge-ok"}`}>{row.qty}</span>
              </td>
              <td className="num">{money(row.qty * (row.price ?? 0))}</td>
              <td>
                {editable ? (
                  <div className="form-actions">
                    <form action={saveStockAction} className="inline-form">
                      <input type="hidden" name="next" value={next} />
                      <input type="hidden" name="product_id" value={row.product_id} />
                      <input type="hidden" name="size" value={row.size} />
                      <input type="hidden" name="color" value={row.color} />
                      <input className="input qty-input" type="number" name="qty" min="0" step="1" defaultValue={row.qty} required />
                      <button className="link-quiet" type="submit">Update</button>
                    </form>
                    <form action={deleteStockAction}>
                      <input type="hidden" name="next" value={next} />
                      <input type="hidden" name="id" value={row.id} />
                      <button className="link-quiet" type="submit">Remove</button>
                    </form>
                  </div>
                ) : (
                  <span className="muted" style={{ fontSize: 12.5 }}>No permission</span>
                )}
              </td>
            </tr>
          ))}
          empty={products.length ? "No stock lines for these products yet." : "No products in your scope yet."}
          emptyHint={products.length ? "Add the first size and colour combination above." : "Create a product before recording stock."}
        />
      </Card>
    </>
  );
}
