"use client";

import { useEffect, useRef } from "react";

// The server renders the relative path; the browser upgrades it to a full URL so the link can be
// pasted into an email. Building it on the server would need headers(), which makes this screen
// fall back to its prerendered shell.
export default function SetupLink({ token }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.value = `${window.location.origin}/set-password?token=${token}`;
  }, [token]);

  return (
    <input
      ref={ref}
      className="input setup-link"
      readOnly
      defaultValue={`/set-password?token=${token}`}
      aria-label="One-time setup link"
      onFocus={(event) => event.target.select()}
      onClick={(event) => event.target.select()}
    />
  );
}
