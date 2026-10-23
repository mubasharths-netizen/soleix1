export default function Loading() {
  return <div className="section page-shell" role="status" aria-label="Loading SOLEIX"><div className="skeleton skeleton-title" /><div className="product-grid">{[1, 2, 3, 4].map((item) => <div key={item}><div className="skeleton aspect-square" /><div className="skeleton h-5 mt-5 w-2/3" /><div className="skeleton h-4 mt-3 w-1/3" /></div>)}</div><span className="sr-only">Loading your next move…</span></div>;
}
