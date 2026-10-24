import { readFileSync, writeFileSync, rmSync } from "node:fs";

const target = "lib/mutations.mjs";
const source = readFileSync("scripts/tail.tmp.mjs", "utf8");
const current = readFileSync(target, "utf8");

const start = current.indexOf("export function saveUser(user, form) {");
const end = current.indexOf("export function setUserActive");
if (start < 0 || end < 0) throw new Error("anchors not found");

let next = current.slice(0, start) + source + "\n" + current.slice(end);
next = next.replace(
  'import { randomUUID } from "node:crypto";',
  'import { randomBytes, randomUUID } from "node:crypto";'
);
next = next.replace(
  'import { hashPassword, normalizeEmail } from "./password.mjs";',
  'import { hashPassword, normalizeEmail, sha256 } from "./password.mjs";'
);

writeFileSync(target, next);
rmSync("scripts/tail.tmp.mjs");
console.log("saveUser replaced;", (next.match(/export function/g) || []).length, "exports");
