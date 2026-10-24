import Link from "next/link";
import Icon from "@/components/Icon";

export function PageHead({ title, subtitle, actions, href, hrefLabel }) {
  return (
    <header className="app-topbar glass">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <div className="form-actions">
        {actions}
        {href && (
          <Link className="btn-solid" href={href}>
            {hrefLabel}
          </Link>
        )}
      </div>
    </header>
  );
}

export function Card({ title, description, children, actions }) {
  return (
    <section className="app-card glass">
      {(title || actions) && (
        <div className="app-row">
          <div>
            {title && <h2>{title}</h2>}
            {description && <p className="muted" style={{ fontSize: 14, marginTop: 4 }}>{description}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, hint }) {
  return (
    <div className="stat-card glass">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
      {hint && <span className="stat-hint">{hint}</span>}
    </div>
  );
}

export function Table({ columns, rows, empty, emptyHint }) {
  if (!rows.length) return <EmptyState label={empty} hint={emptyHint} />;
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </table>
    </div>
  );
}

export function EmptyState({ label = "Nothing here yet.", hint }) {
  return (
    <div className="empty-state">
      <Icon name="box" size={26} />
      <strong style={{ fontSize: 15 }}>{label}</strong>
      {hint && <span style={{ fontSize: 13.5, maxWidth: 420, lineHeight: 1.55 }}>{hint}</span>}
    </div>
  );
}

export function Notice({ kind = "ok", text }) {
  if (!text) return null;
  return <p className={kind === "ok" ? "flash flash-ok" : "flash flash-err"}>{text}</p>;
}

export function readFlash(params = {}) {
  const error = typeof params.error === "string" ? params.error : "";
  if (error) return { kind: "err", text: error };
  return typeof params.saved === "string" ? { kind: "ok", text: "Saved." } : null;
}

export function StatusBadge({ status }) {
  const map = {
    pending: ["badge-warn", "Pending"],
    confirmed: ["badge-info", "Confirmed"],
    processing: ["badge-info", "Processing"],
    shipped: ["badge-info", "Out for delivery"],
    delivered: ["badge-ok", "Delivered"],
    cancelled: ["badge-off", "Cancelled"],
  };
  const [className, label] = map[status] || ["badge-off", status];
  return <span className={`badge ${className}`}>{label}</span>;
}

// Cash-on-Delivery is never "paid online": it is pending until a person collects the notes.
export function PayBadge({ status }) {
  const map = {
    pending: ["badge-warn", "COD pending"],
    collected: ["badge-ok", "Cash collected"],
    refunded: ["badge-off", "COD refunded"],
  };
  const [className, label] = map[status] || ["badge-off", status];
  return <span className={`badge ${className}`}>{label}</span>;
}

export function ActiveBadge({ active, on = "Active", off = "Disabled" }) {
  return <span className={`badge ${active ? "badge-ok" : "badge-off"}`}>{active ? on : off}</span>;
}
