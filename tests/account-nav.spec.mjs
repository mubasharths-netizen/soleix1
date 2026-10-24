import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL || "http://localhost:3111";
const errors = [];
const results = [];
const check = (name, ok, detail = "") => { results.push({ name, ok }); console.log(`${ok ? "PASS" : "FAIL"} · ${name}${detail ? ` — ${detail}` : ""}`); };

const browser = await chromium.launch();
const page = await browser.newPage();
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(String(e)));

// 1. A guest who asks for the protected /account is sent to sign in, with the destination kept
await page.goto(BASE + "/account", { waitUntil: "commit" });
await page.waitForTimeout(1000);
check("Guest /account → /login?next=/account", page.url().includes("/login") && decodeURIComponent(page.url()).includes("/account"), page.url());

// 2. Logging in from there lands on the intended destination
await page.fill("#login-email", "manager@soleix.local");
await page.fill("#login-password", "SoleixManager!2026");
await page.press("#login-password", "Enter");
await page.waitForURL((url) => url.pathname === "/account", { timeout: 25000 }).catch(() => {});
await page.waitForTimeout(1500);
check("Login honours next= and lands on /account", page.url().includes("/account"), page.url());
const body = await page.locator(".account-page").innerText();
check("Account streams the real profile", /Welcome back/i.test(body) && /manager@soleix\.local/.test(body));
check("Account offers logout", /Logout/i.test(body));

// 3. Client navigations into /account (the scenario that raised the InstantServer error)
for (let round = 0; round < 3; round += 1) {
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.locator(".account-trigger").click();
  await page.locator('.account-pop a[href="/account"]').click();
  await page.waitForURL("**/account", { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(900);
}
check("Account page reached by menu navigation", page.url().includes("/account"), page.url());
check("No console errors across repeated /account navigations", errors.length === 0, errors.join(" | ").slice(0, 300));

// 4. Menu logout clears the session
await page.locator(".account-trigger").click();
await page.locator(".account-pop-out").click();
await page.waitForURL(/\/login/, { timeout: 20000 }).catch(() => {});
await page.goto(BASE + "/account", { waitUntil: "commit" });
await page.waitForTimeout(900);
check("Menu logout clears the session", page.url().includes("/login"), page.url());

console.log(`\n${results.filter((r) => r.ok).length}/${results.length} checks passed`);
await browser.close();
process.exit(results.some((r) => !r.ok) ? 1 : 0);
