// Kept out of lib/reviews.mjs on purpose: that module opens the SQLite database, and
// these options are rendered by a client component, which must never pull the database
// into the browser bundle.
export const FIT_OPTIONS = [
  { value: "small", label: "Runs small" },
  { value: "true", label: "True to size" },
  { value: "large", label: "Runs large" },
];

export const fitLabel = (value) => FIT_OPTIONS.find((option) => option.value === value)?.label || "";
