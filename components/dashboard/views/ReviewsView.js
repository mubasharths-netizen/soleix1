import Link from "next/link";
import { StarMeter } from "@/components/StarRating";
import { ActiveBadge, Card, Notice, PageHead, Stat, Table } from "@/components/dashboard/Bits";
import { deleteReviewAction, toggleReviewVisibilityAction } from "@/lib/dashboard-actions";
import { listReviews, reviewStats } from "@/lib/queries.mjs";
import { fitLabel } from "@/lib/reviews.mjs";
import { shopIdsFor } from "@/lib/session.mjs";

export default function ReviewsView({ user, base, next, flash, params }) {
  const ids = shopIdsFor(user);
  const filters = {
    search: typeof params.q === "string" ? params.q : "",
    visibility: typeof params.show === "string" ? params.show : "",
    rating: typeof params.stars === "string" ? params.stars : "",
    sort: typeof params.sort === "string" ? params.sort : "recent",
  };
  const stats = reviewStats(ids);
  const reviews = listReviews(ids, filters);
  const plural = (count, word) => `${count} ${word}${count === 1 ? "" : "s"}`;

  return (
    <>
      <PageHead
        title="Reviews"
        subtitle="Shoppers post a review as soon as it is written. Hide anything that is abusive or off-topic — hiding keeps the words on file instead of deleting them."
      />
      {flash && <Notice kind={flash.kind} text={flash.text} />}

      <div className="stat-grid">
        <Stat label="Reviews on file" value={stats.total} hint={plural(stats.products, "product")} />
        <Stat label="Published" value={stats.visible} hint="Shown on the product page" />
        <Stat label="Hidden by staff" value={stats.hidden} hint="Kept on file, not shown" />
        <Stat label="Average rating" value={stats.total ? Number(stats.average).toFixed(1) : "—"} hint={plural(stats.verified, "verified purchase")} />
      </div>

      {stats.total > 0 && (
        <Card title="Rating spread" description="How the published and hidden reviews fall across the five stars.">
          <div className="rating-bars">
            {[5, 4, 3, 2, 1].map((stars) => {
              const count = stats.distribution[stars] || 0;
              const percent = Math.round((count / stats.total) * 100);
              return (
                <div key={stars} className="rating-bar-row">
                  <span className="rating-bar-label">{stars}★</span>
                  <span className="rating-bar-track"><span className="rating-bar-fill" style={{ width: `${percent}%` }} /></span>
                  <span className="rating-bar-count">{count}</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Card title="All reviews" description={`${plural(reviews.length, "review")} listed${reviews.length === 300 ? " (newest 300)" : ""}.`}>
        <form action={`${base}/reviews`} className="toolbar">
          <input className="input" name="q" defaultValue={filters.search} placeholder="Reviewer, email, product or words" />
          <select className="select" name="show" defaultValue={filters.visibility}>
            <option value="">Visible and hidden</option>
            <option value="visible">Published only</option>
            <option value="hidden">Hidden only</option>
            <option value="verified">Verified purchases only</option>
          </select>
          <select className="select" name="stars" defaultValue={filters.rating}>
            <option value="">Any rating</option>
            {[5, 4, 3, 2, 1].map((stars) => (
              <option key={stars} value={stars}>{stars} star{stars === 1 ? "" : "s"}</option>
            ))}
          </select>
          <select className="select" name="sort" defaultValue={filters.sort}>
            <option value="recent">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="rating">Highest rating</option>
          </select>
          <button className="btn-solid" type="submit">Filter</button>
          <a className="link-quiet" href={`${base}/reviews`}>Reset</a>
        </form>

        <Table
          columns={["Reviewer", "Product", "Rating", "Fit", "What they said", "Purchase", "Posted", "Status", "Actions"]}
          rows={reviews.map((row) => (
            <tr key={row.id}>
              <td>
                <strong>{row.author}</strong>
                <div className="muted" style={{ fontSize: 12.5 }}>{row.email || "No email"}</div>
              </td>
              <td>
                <Link className="link-quiet" href={`/product/${row.product_slug || row.product_id}`}>{row.product_name}</Link>
                <div className="muted" style={{ fontSize: 12.5 }}>{row.shop_name}</div>
              </td>
              <td>
                <span className="rating-line"><StarMeter value={row.rating} size={14} /></span>
              </td>
              <td>{fitLabel(row.fit) || "—"}</td>
              <td style={{ maxWidth: 320 }}>
                {row.title && <strong style={{ fontSize: 13.5 }}>{row.title}</strong>}
                <div className="muted" style={{ fontSize: 13, lineHeight: 1.5 }}>{row.body}</div>
              </td>
              <td><ActiveBadge active={!!row.verified} on="Verified" off="Unverified" /></td>
              <td className="num">{row.created_at?.slice(0, 10)}</td>
              <td><ActiveBadge active={!!row.visible} on="Published" off="Hidden" /></td>
              <td>
                <div className="form-actions">
                  <form action={toggleReviewVisibilityAction}>
                    <input type="hidden" name="next" value={next} />
                    <input type="hidden" name="id" value={row.id} />
                    <button className="link-quiet" type="submit">{row.visible ? "Hide" : "Publish"}</button>
                  </form>
                  <form action={deleteReviewAction}>
                    <input type="hidden" name="next" value={next} />
                    <input type="hidden" name="id" value={row.id} />
                    <button className="link-quiet" type="submit">Delete</button>
                  </form>
                  {row.order_reference && <span className="muted" style={{ fontSize: 12.5 }}>{row.order_reference}</span>}
                </div>
              </td>
            </tr>
          ))}
          empty={filters.search || filters.visibility || filters.rating ? "No review matches those filters." : "No reviews yet."}
          emptyHint={
            filters.search || filters.visibility || filters.rating
              ? "Widen the filters — hidden reviews stay on this screen so nothing is lost."
              : "Reviews appear here the moment a shopper writes one on a product page."
          }
        />
        <p className="muted" style={{ fontSize: 13, marginTop: 14 }}>
          A review is marked verified when the same email address has a delivered order for that product. Hiding a
          review removes it from the product page and from the rating shown to shoppers.
        </p>
      </Card>
    </>
  );
}
