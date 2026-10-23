import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.SOLEIX_DATA_DIR || path.join(path.dirname(here), "data");
mkdirSync(dataDir, { recursive: true });

export const db = new DatabaseSync(path.join(dataDir, "soleix.db"));
db.exec("PRAGMA foreign_keys = ON;");
db.exec(readFileSync(path.join(here, "schema.sql"), "utf8"));
