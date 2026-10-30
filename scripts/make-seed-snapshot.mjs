// Builds the database snapshot a cold serverless boot copies into its scratch disk.
// The development database holds QA accounts, live sessions and demo staff whose passwords are
// printed in the README, none of which may ship inside a deployment, so they are pruned here.
import { DatabaseSync } from "node:sqlite";
import { existsSync, renameSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const source = process.env.SEED_SOURCE_DB || path.join(root, "data", "soleix.db");
const target = process.env.SEED_TARGET_DB || path.join(root, "seed", "soleix.db");
const staging = `${target}.staging`;

if (!existsSync(source)) {
  console.error(`Nothing to snapshot — ${source} does not exist. Run \`npm run seed:demo\` and \`npm run seed:accounts\` first.`);
  process.exit(1);
}

rmSync(staging, { force: true });
const src = new DatabaseSync(source, { readOnly: true });
src.exec(`VACUUM INTO '${staging.replace(/'/g, "''")}'`);
src.close();

const out = new DatabaseSync(staging);
const removed = [];
for (const [label, sql] of [
  ["staff accounts that are not the owner's", "DELETE FROM users WHERE email LIKE '%@soleix.local'"],
  ["sign-in tokens", "DELETE FROM sessions"],
  ["customer sign-in tokens", "DELETE FROM customer_sessions"],
]) {
  removed.push(`${label}: ${out.prepare(sql).run().changes}`);
}
out.exec("PRAGMA wal_checkpoint(TRUNCATE);");
out.exec("VACUUM;");
const counts = Object.fromEntries(
  ["users", "customers", "products", "shops", "orders"].map((table) => [table, out.prepare(`SELECT COUNT(*) c FROM ${table}`).get().c])
);
out.close();

rmSync(target, { force: true });
renameSync(staging, target);
console.log(`Pruned ${removed.join(" · ")}`);
console.log(`Snapshot ${path.relative(root, target)} → ${JSON.stringify(counts)}`);
console.log("Owner sign in at /login with the accounts from scripts/seed-accounts.mjs.");
