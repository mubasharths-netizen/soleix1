import Icon from "./Icon";

// Average scores are drawn as a clipped overlay so a 4.3 reads as a 4.3, not as a rounded 4.
export function StarMeter({ value = 0, size = 16, max = 5 }) {
  const percent = Math.max(0, Math.min(100, (Number(value) / max) * 100));
  return (
    <span className="star-meter" style={{ "--star-size": `${size}px` }} aria-hidden="true">
      <span className="star-row is-empty">{Array.from({ length: max }, (_, index) => <Icon key={index} name="star" size={size} />)}</span>
      <span className="star-row is-filled" style={{ width: `${percent}%` }}>{Array.from({ length: max }, (_, index) => <Icon key={index} name="star" size={size} fill="currentColor" />)}</span>
    </span>
  );
}

export function StarCount({ value = 0, count = 0, size = 15, className = "" }) {
  if (!count) return <span className={`rating-empty ${className}`}>No reviews yet</span>;
  return (
    <span className={`rating-line ${className}`}>
      <StarMeter value={value} size={size} />
      <strong>{Number(value).toFixed(1)}</strong>
      <span className="muted">({count})</span>
    </span>
  );
}
