import { ActiveBadge, Card, EmptyState, Notice, PageHead, Stat, Table } from "@/components/dashboard/Bits";
import { deleteEnquiryAction, deleteSubscriberAction, setEnquiryStatusAction } from "@/lib/dashboard-actions";
import { enquiryStats, listEnquiries, listSubscribers, subscriberStats } from "@/lib/queries.mjs";
import { brand } from "@/lib/site.js";

const STATUS_LABEL = { new: "Waiting for a reply", handled: "Handled" };

export default function EnquiriesView({ user, base, next, flash, params }) {
  const filters = {
    status: typeof params.show === "string" ? params.show : "",
    search: typeof params.q === "string" ? params.q : "",
  };
  const stats = enquiryStats();
  const messages = listEnquiries(filters);
  const subscribers = listSubscribers({ status: params.list === "gone" ? "gone" : "" });
  const news = subscriberStats();
  const isSuperadmin = user.role === "superadmin";

  return (
    <>
      <PageHead
        title="Inbox"
        subtitle={`Messages from the contact form and the newsletter list. Replying happens by email at ${brand.email} — closing a thread here only marks your side of the work as done.`}
      />
      {flash && <Notice kind={flash.kind} text={flash.text} />}

      <div className="stat-grid">
        <Stat label="Waiting for a reply" value={stats.open} hint="New contact messages" />
        <Stat label="Handled" value={stats.handled} hint="Closed by your team" />
        <Stat label="Arrived this week" value={stats.this_week} hint="Last 7 days" />
        <Stat label="Newsletter readers" value={news.active} hint={`${news.gone} unsubscribed or removed`} />
      </div>

      <Card title="Contact messages" description={`${messages.length} message${messages.length === 1 ? "" : "s"} listed — waiting replies first.`}>
        <form action={`${base}/enquiries`} className="toolbar">
          <input className="input" name="q" defaultValue={filters.search} placeholder="Name, email, subject or words" />
          <select className="select" name="show" defaultValue={filters.status}>
            <option value="">Waiting and handled</option>
            <option value="new">Waiting for a reply</option>
            <option value="handled">Handled</option>
          </select>
          <button className="btn-solid" type="submit">Filter</button>
          <a className="link-quiet" href={`${base}/enquiries`}>Reset</a>
        </form>

        {messages.length === 0 ? (
          <EmptyState
            label={filters.search || filters.status ? "No message matches those filters." : "The inbox is empty."}
            hint={
              filters.search || filters.status
                ? "Clear the filters to read everything the form has sent you."
                : "Messages from the contact form land here as soon as a shopper presses Send."
            }
          />
        ) : (
          <div className="enquiry-list">
            {messages.map((row) => (
              <details key={row.id} className="enquiry-item" open={row.status === "new" && messages.length <= 3}>
                <summary className="enquiry-head">
                  <ActiveBadge active={row.status === "new"} on={STATUS_LABEL.new} off={STATUS_LABEL.handled} />
                  <strong>{row.subject || "General question"}</strong>
                  <span className="enquiry-who">{row.name} · {row.email}</span>
                  <span className="enquiry-date">{row.created_at?.slice(0, 16)}</span>
                </summary>
                <div className="enquiry-body">
                  <p>{row.message}</p>
                  <p className="muted" style={{ fontSize: 13 }}>
                    {row.phone && <>Phone {row.phone} · </>}
                    {row.order_reference && <>Order {row.order_reference} · </>}
                    {row.status === "handled"
                      ? `Closed by ${row.handled_by_name || "a team member"} on ${String(row.handled_at).slice(0, 16)}`
                      : "No reply recorded yet."}
                  </p>
                  <div className="form-actions">
                    <form action={setEnquiryStatusAction}>
                      <input type="hidden" name="next" value={next} />
                      <input type="hidden" name="id" value={row.id} />
                      <input type="hidden" name="status" value={row.status === "handled" ? "new" : "handled"} />
                      <button className="btn-ghost" type="submit">{row.status === "handled" ? "Reopen" : "Mark handled"}</button>
                    </form>
                    <a className="link-quiet" href={`mailto:${row.email}?subject=${encodeURIComponent(`Re: ${row.subject || "Your message to SOLEIX"}`)}`}>
                      Reply by email
                    </a>
                    <form action={deleteEnquiryAction}>
                      <input type="hidden" name="next" value={next} />
                      <input type="hidden" name="id" value={row.id} />
                      <button className="link-quiet" type="submit">Delete</button>
                    </form>
                  </div>
                </div>
              </details>
            ))}
          </div>
        )}
      </Card>

      <Card title="Newsletter list" description="Everyone who left an email for updates. Sending is manual — this is the read-only subscriber register.">
        <div className="toolbar">
          <a className={params.list === "gone" ? "btn-solid" : "btn-ghost"} href={`${base}/enquiries?list=gone`}>Unsubscribed and removed</a>
          {params.list === "gone" && <a className="link-quiet" href={`${base}/enquiries`}>Back to active readers</a>}
          <span className="muted" style={{ fontSize: 13, marginLeft: "auto" }}>
            {news.total} total · {news.this_week} joined this week
          </span>
        </div>
        <Table
          columns={["Email", "Source", "Joined", "Status", "Record"]}
          rows={subscribers.map((row) => (
            <tr key={row.id}>
              <td>{row.email}</td>
              <td>{row.source || "storefront"}</td>
              <td className="num">{String(row.created_at).slice(0, 10)}</td>
              <td><ActiveBadge active={!!row.active} on="Subscribed" off={row.unsubscribed_at ? "Unsubscribed" : "Removed"} /></td>
              <td>
                {isSuperadmin && (
                  <form action={deleteSubscriberAction} className="form-actions">
                    <input type="hidden" name="next" value={next} />
                    <input type="hidden" name="id" value={row.id} />
                    <button className="link-quiet" type="submit">Delete record</button>
                  </form>
                )}
              </td>
            </tr>
          ))}
          empty={params.list === "gone" ? "Nobody has unsubscribed yet." : "No newsletter sign-ups yet."}
          emptyHint="The footer form on the storefront writes to this list."
        />
        <p className="muted" style={{ fontSize: 13, marginTop: 14 }}>
          Deleting a record here is what the privacy page promises when a shopper asks to be removed. Every change on
          this screen is written to the activity log.
        </p>
      </Card>
    </>
  );
}
