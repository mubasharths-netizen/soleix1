import { readFile } from "node:fs/promises";
import { extname, join, sep } from "node:path";
import { UPLOAD_DIR } from "@/lib/mutations.mjs";

const TYPES = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".avif": "image/avif" };

export async function GET(_request, { params }) {
  const { key } = await params;
  const name = Array.isArray(key) ? key.join("/") : String(key);
  if (!/^[A-Za-z0-9._-]+$/i.test(name) || name.includes("..")) return new Response("Not found", { status: 404 });

  const file = join(UPLOAD_DIR, name);
  if (!file.startsWith(UPLOAD_DIR + sep)) return new Response("Not found", { status: 404 });

  try {
    const body = await readFile(file);
    return new Response(new Uint8Array(body), {
      headers: {
        "content-type": TYPES[extname(name).toLowerCase()] || "application/octet-stream",
        "cache-control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
