import { Card, Notice, PageHead, Table } from "@/components/dashboard/Bits";
import { getProduct, listCategories, listProducts, listShops, money } from "@/lib/queries.mjs";
import { deleteProductAction, saveProductAction } from "@/lib/dashboard-actions";
import { can, shopIdsFor } from "@/lib/session.mjs";

export default function ProductsView({ user, base, next, flash, params }) {
  const ids = shopIdsFor(user);
  const shops = listShops(user.role === "superadmin" ? null : ids);
  const categories = listCategories();
  const editable = can(user, "products");
  const editing = params.edit ? getProduct(Number(params.edit)) : null;
  const isNew = params.new === "1" || !editing;
  const form = editing || {};

  const filters = {
    search: typeof params.q === "string" ? params.q : "",
    categoryId: typeof params.category === "string" ? params.category : "",
    status: typeof params.status === "string" ? params.status : "",
  };
  const scopedShop = params.shop && ids.includes(Number(params.shop)) ? [Number(params.shop)] : ids;
  const products = listProducts(scopedShop, filters);

  return (
    <>
      <PageHead
        title="Products"
        subtitle={
          editable
            ? "Prices are stored in PKR. Stock comes from the inventory rows of each product."
            : "Read-only: your account does not have the manage-products permission."
        }
        actions={editable && !isNew ? <a className="btn-ghost" href={`${base}/products?new=1`}>New product</a> : null}
      />
      {flash && <Notice kind={flash.kind} text={flash.text} />}
      {!editable && <Notice kind="err" text="Product editing is disabled for your account. The Super Admin can grant it under Admin management → Permissions." />}

      {editable && (
        <Card title={isNew ? "Add product" : `Edit ${form.name}`}>
          <form action={saveProductAction} className="form-grid">
            <input type="hidden" name="next" value={next} />
            {!isNew && <input type="hidden" name="id" value={form.id} />}
            <label className="field">
              <span className="form-label">Shop</span>
              <select className="select" name="shop_id" defaultValue={form.shop_id ?? (shops[0]?.id ?? "")} required>
                {shops.map((shop) => (
                  <option key={shop.id} value={shop.id}>{shop.name}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="form-label">Name</span>
              <input className="input" name="name" defaultValue={form.name ?? ""} required />
            </label>
            <label className="field">
              <span className="form-label">Price (PKR)</span>
              <input className="input" type="number" name="price" min="0" step="1" defaultValue={form.price ?? ""} required />
            </label>
            <label className="field">
              <span className="form-label">Category</span>
              <select className="select" name="category_id" defaultValue={form.category_id ?? ""}>
                <option value="">Uncategorised</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </label>
            <label className="field full">
              <span className="form-label">Description</span>
              <textarea className="input" name="description" rows={3} defaultValue={form.description ?? ""} />
            </label>
            <label className="field">
              <span className="form-label">Image upload</span>
              <input className="input" type="file" name="image_file" accept="image/png,image/jpeg,image/webp,image/avif" />
            </label>
            <label className="field">
              <span className="form-label">Or keep current image path</span>
              <input className="input" name="image" defaultValue={form.image ?? ""} placeholder="/uploads/… or /images/…" />
            </label>
            {form.image && (
              <div className="full">
                <span className="form-label">Current image</span>
                <img className="thumb" src={form.image} alt="" />
              </div>
            )}
            <div className="full check-row">
              <label className="check-field">
                <input type="checkbox" name="active" value="1" defaultChecked={isNew ? true : !!form.active} />
                Visible in catalogue
              </label>
            </div>
            <div className="full form-actions">
              <button className="btn-solid" type="submit">{isNew ? "Create product" : "Save product"}</button>
              {!isNew && <a className="btn-ghost" href={`${base}/products`}>Cancel</a>}
            </div>
          </form>
          {!isNew && (
            <form action={deleteProductAction} className="form-actions">
              <input type="hidden" name="next" value={next} />
              <input type="hidden" name="id" value={form.id} />
              <button className="link-quiet" type="submit">Delete this product</button>
            </form>
          )}
        </Card>
      )}

      <Card title="Catalogue">
        <form action={`${base}/products`} className="toolbar">
          <input className="input" name="q" defaultValue={filters.search} placeholder="Search by name" />
          <select className="select" name="category" defaultValue={filters.categoryId}>
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
          <select className="select" name="status" defaultValue={filters.status}>
            <option value="">Any status</option>
            <option value="active">Visible only</option>
            <option value="inactive">Hidden only</option>
            <option value="low">Low stock</option>
          </select>
          <button className="btn-solid" type="submit">Filter</button>
          <a className="link-quiet" href={`${base}/products`}>Reset</a>
        </form>

        <Table
          columns={["Product", "Shop", "Category", "Price", "Stock", "Status", "Actions"]}
          rows={products.map((product) => (
            <tr key={product.id}>
              <td>
                <div className="prod-cell">
                  {product.image ? <img className="thumb" src={product.image} alt="" /> : <span className="thumb" aria-hidden="true" />}
                  <div>
                    <strong>{product.name}</strong>
                    <div className="muted word-wrap" style={{ fontSize: 12.5 }}>{product.description || "No description"}</div>
                  </div>
                </div>
              </td>
              <td>{product.shop_name || "—"}</td>
              <td>{product.category_name || "Uncategorised"}</td>
              <td className="num">{money(product.price)}</td>
              <td className="num">
                {product.stock}
                {product.stock > 0 && product.stock <= 3 ? <span className="badge badge-warn" style={{ marginLeft: 8 }}>Low</span> : null}
                {product.stock === 0 ? <span className="badge badge-off" style={{ marginLeft: 8 }}>Out</span> : null}
              </td>
              <td>
                <span className={`badge ${product.active ? "badge-ok" : "badge-off"}`}>{product.active ? "Visible" : "Hidden"}</span>
              </td>
              <td>
                <div className="form-actions">
                  {editable && <a className="link-quiet" href={`${base}/products?edit=${product.id}`}>Edit</a>}
                  <a className="link-quiet" href={`${base}/inventory?product=${product.id}`}>Stock</a>
                </div>
              </td>
            </tr>
          ))}
          empty={ids.length ? "No products match these filters." : "No shop is assigned to your account yet."}
          emptyHint={ids.length ? "Adjust the filters, or add the first product above." : "Ask the Super Admin to assign a shop to your account."}
        />
      </Card>
    </>
  );
}
