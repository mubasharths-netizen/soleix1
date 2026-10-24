import { Card, Notice, PageHead, Table } from "@/components/dashboard/Bits";
import { listCategories, db } from "@/lib/queries.mjs";
import { deleteCategoryAction, saveCategoryAction } from "@/lib/dashboard-actions";

export default function CategoriesView({ base, next, flash, params }) {
  const categories = listCategories();
  const editing = params.edit ? db.prepare("SELECT * FROM categories WHERE id = ?").get(Number(params.edit)) : null;
  const isNew = params.new === "1" || !editing;
  const form = editing || {};

  return (
    <>
      <PageHead
        title="Categories"
        subtitle="One shared catalogue structure for every shop. Deleting a category keeps its products but unclassified."
        actions={!isNew ? <a className="btn-ghost" href={`${base}/categories?new=1`}>New category</a> : null}
      />
      {flash && <Notice kind={flash.kind} text={flash.text} />}

      <Card title={isNew ? "Create category" : `Rename ${form.name}`}>
        <form action={saveCategoryAction} className="form-grid">
          <input type="hidden" name="next" value={next} />
          {!isNew && <input type="hidden" name="id" value={form.id} />}
          <label className="field">
            <span className="form-label">Name</span>
            <input className="input" name="name" defaultValue={form.name ?? ""} required placeholder="Running, Trail, Court…" />
          </label>
          <div className="full form-actions">
            <button className="btn-solid" type="submit">{isNew ? "Create category" : "Save category"}</button>
            {!isNew && <a className="btn-ghost" href={`${base}/categories`}>Cancel</a>}
          </div>
        </form>
      </Card>

      <Card title="All categories" description={`${categories.length} category${categories.length === 1 ? "" : "ies"} saved.`}>
        <Table
          columns={["Category", "Products", "Created", "Actions"]}
          rows={categories.map((category) => (
            <tr key={category.id}>
              <td><strong>{category.name}</strong></td>
              <td className="num">{category.product_count}</td>
              <td className="num">{category.created_at}</td>
              <td>
                <div className="form-actions">
                  <a className="link-quiet" href={`${base}/categories?edit=${category.id}`}>Edit</a>
                  <a className="link-quiet" href={`${base}/products?category=${category.id}`}>View products</a>
                  <form action={deleteCategoryAction}>
                    <input type="hidden" name="next" value={next} />
                    <input type="hidden" name="id" value={category.id} />
                    <button className="link-quiet" type="submit">Delete</button>
                  </form>
                </div>
              </td>
            </tr>
          ))}
          empty="No categories yet."
          emptyHint="Add the categories you want shops to file products under."
        />
      </Card>
    </>
  );
}
