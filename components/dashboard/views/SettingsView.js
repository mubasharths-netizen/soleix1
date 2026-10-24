import { Card, Notice, PageHead, Table } from "@/components/dashboard/Bits";
import { getShop, listShops } from "@/lib/queries.mjs";
import { saveProfileAction, saveShopSettingsAction } from "@/lib/dashboard-actions";
import { can, shopIdsFor } from "@/lib/session.mjs";

const ROLE_LABEL = { superadmin: "Super Admin", admin: "Admin", shop: "Shop" };

export default function SettingsView({ user, next, flash, params }) {
  const ids = shopIdsFor(user);
  const shops = listShops(user.role === "superadmin" ? null : ids);
  const requested = Number(params.shop || 0);
  const shopId = shops.some((entry) => entry.id === requested) ? requested : shops[0]?.id;
  const shop = shopId ? getShop(shopId) : null;
  const editShop = can(user, "settings");

  return (
    <>
      <PageHead title="Settings" subtitle="Your own account details, plus the shop profile when your role allows it." />
      {flash && <Notice kind={flash.kind} text={flash.text} />}

      <Card title="My account">
        <form action={saveProfileAction} className="form-grid">
          <input type="hidden" name="next" value={next} />
          <label className="field">
            <span className="form-label">Display name</span>
            <input className="input" name="name" defaultValue={user.name} required />
          </label>
          <label className="field">
            <span className="form-label">New password (leave blank to keep)</span>
            <input className="input" type="password" name="password" minLength={8} placeholder="Minimum 8 characters" />
          </label>
          <div className="full form-actions">
            <button className="btn-solid" type="submit">Save account</button>
          </div>
        </form>
      </Card>

      <Card title="Access on this account" description="Read from the database — these cannot be changed from the browser.">
        <Table
          columns={["Attribute", "Value"]}
          rows={[
            ["Role", ROLE_LABEL[user.role]],
            ["Email", user.email],
            ["Shop creation", can(user, "shops") ? "Allowed" : "Not allowed"],
            ["Product management", user.canManageProducts ? "Allowed" : "Not allowed"],
            ["Order statuses", user.canManageOrders ? "Allowed" : "Not allowed"],
            ["Shop settings", user.canManageSettings ? "Allowed" : "Not allowed"],
            ["Shops in scope", `${ids.length}`],
          ].map(([label, value], index) => (
            <tr key={label}>
              <td>{label}</td>
              <td className={index === 6 ? "num" : undefined}>{value}</td>
            </tr>
          ))}
        />
      </Card>

      {editShop ? (
        <Card title="Shop profile">
          {shop ? (
            <>
              <div className="form-actions">
                <span className="form-label" style={{ margin: 0 }}>Editing</span>
                {shops.map((entry) => (
                  <a key={entry.id} className={`link-quiet ${entry.id === shop?.id ? "is-active" : ""}`} href={`${next}?shop=${entry.id}`}>
                    {entry.name}
                  </a>
                ))}
              </div>
              <form action={saveShopSettingsAction} className="form-grid">
                <input type="hidden" name="next" value={next} />
                <input type="hidden" name="id" value={shop.id} />
                <label className="field">
                  <span className="form-label">Shop name</span>
                  <input className="input" name="name" defaultValue={shop.name} required />
                </label>
                <label className="field">
                  <span className="form-label">Phone</span>
                  <input className="input" name="phone" defaultValue={shop.phone} />
                </label>
                <label className="field full">
                  <span className="form-label">Address</span>
                  <input className="input" name="address" defaultValue={shop.address} />
                </label>
                <label className="field full">
                  <span className="form-label">Description</span>
                  <textarea className="input" name="description" rows={3} defaultValue={shop.description} />
                </label>
                <div className="full check-row">
                  <label className="check-field">
                    <input type="checkbox" name="active" value="1" defaultChecked={!!shop.active} />
                    Shop open (accepting orders)
                  </label>
                </div>
                <div className="full form-actions">
                  <button className="btn-solid" type="submit">Save shop profile</button>
                </div>
              </form>
            </>
          ) : (
            <Notice kind="err" text="No shop is assigned to your account yet." />
          )}
        </Card>
      ) : (
        <Card title="Shop profile">
          {shop ? (
            <p className="muted" style={{ fontSize: 14 }}>
              {shop.name} — {shop.address || "No address"} {shop.phone ? `· ${shop.phone}` : ""}. Editing shop settings is not permitted for your account.
            </p>
          ) : (
            <Notice kind="err" text="No shop is assigned to your account yet." />
          )}
        </Card>
      )}
    </>
  );
}
