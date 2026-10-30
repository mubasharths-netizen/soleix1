import { Card, Notice, PageHead, Table } from "@/components/dashboard/Bits";
import { getShop, listShops } from "@/lib/queries.mjs";
import { savePlatformSettingsAction, saveProfileAction, saveShopSettingsAction } from "@/lib/dashboard-actions";
import { siteSettings } from "@/lib/storefront.mjs";
import { can, shopIdsFor } from "@/lib/session.mjs";

const ROLE_LABEL = { superadmin: "Super Admin", admin: "Admin", shop: "Shop" };

export default function SettingsView({ user, next, flash, params }) {
  const ids = shopIdsFor(user);
  const shops = listShops(user.role === "superadmin" ? null : ids);
  const requested = Number(params.shop || 0);
  const shopId = shops.some((entry) => entry.id === requested) ? requested : shops[0]?.id;
  const shop = shopId ? getShop(shopId) : null;
  const editShop = can(user, "settings");
  const platform = siteSettings();

  return (
    <>
      <PageHead title="Settings" subtitle="Your own account details, the shop profile when your role allows it, and platform-wide checkout rules for the Super Admin." />
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
            ["Stock updates", user.canManageInventory ? "Allowed" : "Not allowed"],
            ["Order statuses", user.canManageOrders ? "Allowed" : "Not allowed"],
            ["Delivery updates", user.canUpdateDelivery ? "Allowed" : "Not allowed"],
            ["COD collection", user.canCollectCod ? "Allowed" : "Not allowed"],
            ["Shop settings", user.canManageSettings ? "Allowed" : "Not allowed"],
            ["Shops in scope", `${ids.length}`],
          ].map(([label, value], index) => (
            <tr key={label}>
              <td>{label}</td>
              <td className={index === 9 ? "num" : undefined}>{value}</td>
            </tr>
          ))}
        />
      </Card>

      {user.role === "superadmin" && (
        <Card title="Platform checkout rules" description="Applied by the server at checkout — browsers never receive the totals they calculate themselves.">
          <form action={savePlatformSettingsAction} className="form-grid">
            <input type="hidden" name="next" value={next} />
            <label className="field">
              <span className="form-label">Delivery fee (PKR)</span>
              <input className="input" type="number" name="delivery_fee" min="0" step="1" defaultValue={platform.deliveryFee} required />
            </label>
            <label className="field">
              <span className="form-label">Free delivery over (PKR)</span>
              <input className="input" type="number" name="free_delivery_over" min="0" step="1" defaultValue={platform.freeDeliveryOver} required />
            </label>
            <label className="field">
              <span className="form-label">Discount code</span>
              <input className="input" name="discount_code" defaultValue={platform.discountCode} placeholder="Blank disables discounts" />
            </label>
            <label className="field">
              <span className="form-label">Discount percent</span>
              <input className="input" type="number" name="discount_percent" min="0" max="100" step="0.5" defaultValue={platform.discountPercent || ""} placeholder="0" />
            </label>
            <label className="field">
              <span className="form-label">Discount flat amount (PKR)</span>
              <input className="input" type="number" name="discount_flat" min="0" step="1" defaultValue={platform.discountFlat || ""} placeholder="0" />
            </label>
            <label className="field">
              <span className="form-label">Discount minimum basket (PKR)</span>
              <input className="input" type="number" name="discount_minimum" min="0" step="1" defaultValue={platform.discountMinimum || ""} placeholder="0" />
            </label>
            <label className="field">
              <span className="form-label">Order reference prefix</span>
              <input className="input" name="order_prefix" defaultValue={platform.orderPrefix} required />
            </label>
            <p className="full muted" style={{ fontSize: 13 }}>
              The prefix only affects new references; existing order numbers are never rewritten.
            </p>
            <p className="full muted" style={{ fontSize: 13 }}>
              A discount only lives while the code field is filled in. Shoppers type that code into “Have a campaign
              code?” on the checkout summary — the browser is never told what the code is, and the server re-checks it
              (and the minimum basket) before the order is written. Percent takes priority over the flat amount; leave
              the code blank to switch discounts off.
            </p>
            <div className="full form-actions">
              <button className="btn-solid" type="submit">Save platform rules</button>
            </div>
          </form>
        </Card>
      )}

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
