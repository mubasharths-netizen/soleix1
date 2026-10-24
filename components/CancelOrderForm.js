"use client";

import { useActionState, useState } from "react";
import { requestCancellation } from "@/lib/storefront-actions";
import Icon from "@/components/Icon";

export default function CancelOrderForm({ reference }) {
  const [reason, setReason] = useState("");
  const [state, submit, pending] = useActionState(async (_previous, form) => {
    const result = await requestCancellation(form);
    if (result?.ok) window.location.reload();
    return result || {};
  }, {});

  return (
    <form className="order-cancel" action={submit}>
      <input type="hidden" name="reference" value={reference} />
      <label className="auth-label" htmlFor={`cancel-${reference}`}>Reason for cancelling (optional)</label>
      <input
        id={`cancel-${reference}`}
        className="auth-input"
        name="reason"
        maxLength={280}
        placeholder="Changed my mind, ordered the wrong size…"
        value={reason}
        onChange={(event) => setReason(event.target.value)}
      />
      {state.error && <p className="auth-error" role="alert">{state.error}</p>}
      <button type="submit" className="order-cancel-button" disabled={pending}>
        {pending ? "Sending request…" : <><Icon name="close" size={16} /> Request cancellation</>}
      </button>
      <p className="sample-note">The shop confirms the request before the order is cancelled.</p>
    </form>
  );
}
