import { headers } from "next/headers";
import { Card, Notice, PageHead, Table } from "@/components/dashboard/Bits";
import Icon from "@/components/Icon";
import { listShops, listUsers, listAdminShops, db } from "@/lib/queries.mjs";
import { pendingInvitations } from "@/lib/mutations.mjs";
import { revokeInvitationAction, saveUserAction, toggleUserAction } from "@/lib/dashboard-actions";

const ROLE_LABEL = { superadmin: "Super Admin", admin: "Admin", shop: "Shop" };

// Read from the users table on every request; the browser can only tick these boxes, never set
// them for itself.
export const PERMISSIONS = [
  { key: "can_create_shops", label: "Create shop accounts", roles: ["admin"] },
  { key: "can_manage_products", label: "Products & pricing", roles: ["admin", "shop"] },
  { key: "can_manage_inventory", label: "Stock levels", roles: ["admin", "shop"] },
  { key: "can_manage_orders", label: "Order manager (statuses, cancellations)", roles: ["admin", "shop"] },
  { key: "can_update_delivery", label: "Delivery operations (mark delivered)", roles: ["shop"] },
  { key: "can_collect_cod", label: "Cash collection (confirm COD received)", roles: ["shop"] },
  { key: "can_manage_settings", label: "Edit shop settings", roles: ["admin"] },
];

export default async function AdminsView({ user, base, next, flash, params }) {
  const users = listUsers();
  const shops = listShops();
  const invites = pendingInvitations();
  const host = await headers().then((store) => store.get("x-forwarded-host") || store.get("host") || "localhost:3000");
  const protocol = host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https";
  const editing = params.edit ? db.prepare("SELECT * FROM users WHERE id = ?").get(Number(params.edit)) : null;
  const isNew = params.new === "1" || !editing;
  const form = editing || {};
  const assignedShops = editing ? listAdminShops(editing.id) : shops.map((shop) => shop.id);
  const setupLink = typeof params.invitation === "string" && params.invitation ? `${protocol}://${host}/set-password?token=${params.invitation}` : "";

  return (
    <>
      <PageHead
        title="Admin management"
        subtitle="Accounts, roles, shop assignments and permissions. Only this Super Admin screen can create other Super Admins."
        actions={
          !isNew && (
            <a className="btn-ghost" href={`${base}/admins?new=1`}>
              <Icon name="plus" size={16} /> New account
            </a>
          )
        }
      />
      {flash && <Notice kind={flash.kind} text={flash.text} />}

      {setupLink && (
        <Card title="One-time setup link" description="Send this to the new team member. It works once, expires in 3 days, and the password is stored hashed — never in plain text.">
          <ol className="setup-steps">
            <li>
              <span className="form-label">Share this link</span>
              <input className="input" readOnly value={setupLink} onFocus={(event) => event.target.select()} />
            </li>
            <li>The account cannot sign in until the link is used.</li>
          </ol>
        </Card>
      )}

      <Card title={isNew ? "Create account" : `Edit ${form.name}`}>
        <form action={saveUserAction} className="form-grid">
          <input type="hidden" name="next" value={next} />
          {!isNew && <input type="hidden" name="id" value={form.id} />}

          <label className="field">
            <span className="form-label">Name</span>
            <input className="input" name="name" defaultValue={form.name ?? ""} required />
          </label>
          <label className="field">
            <span className="form-label">Email</span>
            <input className="input" type="email" name="email" defaultValue={form.email ?? ""} required />
          </label>
          <label className="field">
            <span className="form-label">Role</span>
            <select className="select" name="role" defaultValue={form.role ?? "admin"}>
              <option value="admin">Admin — manages assigned shops</option>
              <option value="shop">Shop — single store account</option>
              <option value="superadmin">Super Admin — full control</option>
            </select>
          </label>
          <label className="field">
            <span className="form-label">{isNew ? "Password (blank sends a setup link)" : "New password (blank keeps current)"}</span>
            <input className="input" type="password" name="password" minLength={isNew ? 0 : 8} placeholder={isNew ? "Leave blank for a one-time link" : "Minimum 8 characters"} />
          </label>

          <div className="full">
            <span className="form-label">Permissions</span>
            <div className="check-row">
              {PERMISSIONS.map((permission) => (
                <label key={permission.key} className="check-field">
                  <input
                    type="checkbox"
                    name={permission.key}
                    value="1"
                    defaultChecked={isNew ? permission.key === "can_manage_products" : !!form[permission.key]}
                  />
                  {permission.label}
                </label>
              ))}
              <label className="check-field">
                <input type="checkbox" name="active" value="1" defaultChecked={isNew ? true : !!form.active} />
                Account active
              </label>
            </div>
            <p className="muted" style={{ fontSize: 13 }}>Super Admins always hold every permission. Deactivating an account signs it out at once.</p>
          </div>

          <div className="full">
            <span className="form-label">Shops this admin can manage</span>
            {shops.length ? (
              <div className="check-row">
                {shops.map((shop) => (
                  <label key={shop.id} className="check-field">
                    <input type="checkbox" name="shops" value={shop.id} defaultChecked={assignedShops.includes(shop.id)} />
                    {shop.name}
                  </label>
                ))}
              </div>
            ) : (
              <p className="muted" style={{ fontSize: 13.5 }}>Create a shop first, then assign admins to it.</p>
            )}
          </div>

          <div className="full">
            <span className="form-label">Shop account belongs to</span>
            <select className="select" name="shop_id" defaultValue={form.shop_id ?? ""}>
              <option value="">Not a shop account</option>
              {shops.map((shop) => (
                <option key={shop.id} value={shop.id}>
                  {shop.name}
                </option>
              ))}
            </select>
          </div>

          <div className="full form-actions">
            <button className="btn-solid" type="submit">
              {isNew ? "Create account" : "Save account"}
            </button>
            {!isNew && <a className="btn-ghost" href={`${base}/admins`}>Cancel</a>}
          </div>
        </form>
      </Card>

      <Card title="All accounts" description={`${users.length} row${users.length === 1 ? "" : "s"} in the users table.`}>
        <Table
          columns={["Name", "Email", "Role", "Shops", "Permissions", "Status", "Actions"]}
          rows={users.map((row) => {
            const linked = row.role === "admin" ? listAdminShops(row.id).length : row.shop_id ? 1 : 0;
            const granted = PERMISSIONS.filter((permission) => row[permission.key] || row.role === "superadmin");
            return (
              <tr key={row.id}>
                <td>{row.name}</td>
                <td>{row.email}</td>
                <td>
                  <span className={`badge ${row.role === "superadmin" ? "badge-info" : "badge-off"}`}>{ROLE_LABEL[row.role]}</span>
                </td>
                <td className="num">{linked}</td>
                <td>{granted.length ? granted.map((permission) => permission.label).join(", ") : "—"}</td>
                <td>
                  <span className={`badge ${row.active && row.has_password ? "badge-ok" : row.active ? "badge-warn" : "badge-off"}`}>
                    {row.active ? (row.has_password ? "Active" : "Waiting for setup") : "Disabled"}
                  </span>
                </td>
                <td>
                  <div className="form-actions">
                    <a className="link-quiet" href={`${base}/admins?edit=${row.id}`}>Edit</a>
                    <form action={toggleUserAction}>
                      <input type="hidden" name="next" value={next} />
                      <input type="hidden" name="id" value={row.id} />
                      <button className="link-quiet" type="submit" disabled={row.id === user.id}>
                        {row.active ? "Deactivate" : "Activate"}
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            );
          })}
          empty="No accounts found."
          emptyHint="Run npm run setup:admin to create the first Super Admin."
        />
      </Card>

      <Card title="Open setup links" description="Invitations that have not been used yet. Revoking one stops the account from being created until a new link is sent.">
        <Table
          columns={["Account", "Role", "Shop", "Expires", "Actions"]}
          rows={invites.map((invite) => (
            <tr key={invite.id}>
              <td>{invite.name}<div className="muted" style={{ fontSize: 12.5 }}>{invite.email}</div></td>
              <td>{ROLE_LABEL[invite.role]}</td>
              <td>{invite.shop_name || "—"}</td>
              <td className="num">{new Date(invite.expires_at).toLocaleString("en-GB")}</td>
              <td>
                <form action={revokeInvitationAction}>
                  <input type="hidden" name="next" value={next} />
                  <input type="hidden" name="id" value={invite.id} />
                  <button className="link-quiet" type="submit">Revoke link</button>
                </form>
              </td>
            </tr>
          ))}
          empty="No setup links are waiting."
          emptyHint="Leaving the password field blank when you create an account sends it here."
        />
      </Card>
    </>
  );
}
