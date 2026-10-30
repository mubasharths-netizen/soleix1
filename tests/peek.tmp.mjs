import { chromium } from "@playwright/test";
const BASE = "http://localhost:3111";
const browser = await chromium.launch();
const page = await browser.newPage();
page.on("response", (r) => { if (r.status() >= 400) console.log("HTTP", r.status(), r.request().method(), r.url()); });
page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE", m.text().slice(0, 200)); });
await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
await page.fill("#login-email", "manager@soleix.local");
await page.fill("#login-password", "SoleixManager!2026");
await page.press("#login-password", "Enter");
await page.waitForURL((u) => u.pathname === "/account", { timeout: 25000 }).catch(() => {});
await page.waitForTimeout(1500);
for (let i = 0; i < 3; i += 1) {
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.locator(".account-trigger").click();
  await page.locator('.account-pop a[href="/account"]').click();
  await page.waitForURL("**/account", { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(900);
  console.log("round", i, page.url());
}
await browser.close();
