import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL || "http://localhost:3111";
const errors = [];

const browser = await chromium.launch();
const page = await browser.newPage();
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(String(e)));

async function gotoAccountViaLink() {
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  const link = page.locator('a[href="/account"]').first();
  if (await link.count()) {
    await link.click();
    await page.waitForURL("**/account");
  } else {
    await page.goto(BASE + "/account", { waitUntil: "networkidle" });
  }
  await page.waitForTimeout(1200);
  return page.locator(".account-page").innerText();
}

// Guest: client-side Link navigation into /account (the InstantServer scenario)
let body = await gotoAccountViaLink();
console.log(body.includes("exploring as a guest") ? "PASS · Guest sees guest intro" : "FAIL · Guest intro");
console.log(body.includes("sign in here") ? "PASS · Guest sees sign-in hint" : "FAIL · Guest hint");

// Signed-in admin: client navigation shows role + dashboard link
await page.goto(BASE + "/login", { waitUntil: "networkidle" });
await page.fill("#login-email", "manager@soleix.local");
await page.fill("#login-password", "SoleixManager!2026");
await page.press("#login-password", "Enter");
await page.waitForURL("**/admin**", { timeout: 15000 });
body = await gotoAccountViaLink();
console.log(body.includes("Signed in as") ? "PASS · Admin sees signed-in intro" : "FAIL · Admin intro");
console.log(body.includes("Open your dashboard") ? "PASS · Dashboard link present" : "FAIL · Dashboard link");
console.log(body.includes("Logout") ? "PASS · Logout button present" : "FAIL · Logout button");

console.log(errors.length ? "FAIL · Console errors:\n" + errors.join("\n") : "PASS · No console errors during /account navigations");
await browser.close();
