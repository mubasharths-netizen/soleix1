import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig = {
  // lib/db.mjs reads the snapshot and the schema at run time, so bundling cannot discover them
  // and every server function needs both files.
  outputFileTracingIncludes: {
    "/*": ["./seed/**/*.db", "./lib/**/*.sql"],
  },
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    // Pinned to this folder so a stray lockfile one level up is never picked as the root.
    root: projectRoot,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
