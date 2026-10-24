const STEPS = ["pending", "confirmed", "processing", "shipped", "delivered"];
const STEP_LABEL = { pending: "Placed", confirmed: "Confirmed", processing: "Packing", shipped: "Out for delivery", delivered: "Delivered" };

export default function OrderTrack({ status }) {
  if (status === "cancelled") {
    return <p className="order-track is-cancelled">This order was cancelled. Any COD collection against it is void.</p>;
  }
  const current = STEPS.indexOf(status);
  return (
    <ol className="order-track" aria-label="Order progress">
      {STEPS.map((step, index) => (
        <li key={step} className={index < current ? "is-done" : index === current ? "is-current" : "is-todo"}>
          <span aria-hidden="true" className="order-track-dot" />
          <span>{STEP_LABEL[step]}</span>
        </li>
      ))}
    </ol>
  );
}

export function OrderEvents({ events = [] }) {
  if (!events.length) return null;
  return (
    <ol className="order-events">
      {events.map((event) => (
        <li key={event.id}>
          <span className="order-event-time">{event.created_at}</span>
          <strong>{event.type === "payment" ? "Payment" : event.type === "cancellation" ? "Cancellation" : "Status"}</strong>
          <p>{event.detail} <em>— {event.actor}</em></p>
        </li>
      ))}
    </ol>
  );
}
