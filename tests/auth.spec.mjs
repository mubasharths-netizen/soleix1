import { chromium } from "@playwright/test";

const base = "http://localhost:3111";
const results = [];
const check = (name, ok, detail = "") => { results.push({ name, ok }); console.log(`${ok ? "PASS" : "FAIL"} · ${name}${detail ? ` — ${detail}` : ""}`); };

async function login(page, email, password) {
  await page.goto(`${base}/login`, { waitUntil: "domcontentloaded" });
  await page.fill("#login-email", email);
  await page.fill("#login-password", password);
  await page.keyboard.press("Enter");
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 20000 });
}

async function expectRedirectAway(page, path) {
  await page.goto(`${base}${path}`, { waitUntil: "commit" });
  await page.waitForURL((url) => !url.pathname.startsWith(path), { timeout: 15000 }).catch(() => {});
  return !page.url().includes(path);
}

const browser = await chromium.launch();
try {
  // 1. Super Admin login (Enter key) + dashboard stats
  const pageA = await (await browser.newContext()).newPage();
  await login(pageA, process.env.SOLEIX_SUPERADMIN_EMAIL, process.env.SOLEIX_SUPERADMIN_PASSWORD);
  check("Super Admin lands on /superadmin", pageA.url().endsWith("/superadmin"));
  await pageA.waitForLoadState("networkidle");
  const dashText = await pageA.locator("body").innerText();
  check("Dashboard shows real stats", /admin/i.test(dashText) && /shop/i.test(dashText) && /order/i.test(dashText));

  // 2. Create an Admin through the Super Admin UI
  await pageA.goto(`${base}/superadmin/admins`, { waitUntil: "domcontentloaded" });
  await pageA.waitForTimeout(1200);
  const newEmail = `qa.admin.${Date.now()}@soleix.local`;
  await pageA.locator('input[name="name"]').first().fill("QA Generated Admin");
  await pageA.locator('input[name="email"]').first().fill(newEmail);
  await pageA.locator('input[name="password"]').first().fill("QaSeeded!2026#");
  await pageA.locator('select[name="role"]').first().selectOption("admin");
  await pageA.locator("form").filter({ has: pageA.locator('input[name="email"]') }).locator('button[type="submit"]').first().click();
  await pageA.waitForURL(/saved=1|admins/, { timeout: 15000 }).catch(() => {});
  await pageA.waitForTimeout(1500);
  check("Admin creation stays authenticated", !pageA.url().startsWith(`${base}/login`), pageA.url());
  await pageA.goto(`${base}/superadmin/admins`, { waitUntil: "domcontentloaded" });
  check("Created admin appears in Admin Management", (await pageA.locator(`text=${newEmail}`).count()) > 0);

  // 3. Admin login, scope and blocks
  const pageB = await (await browser.newContext()).newPage();
  await login(pageB, "manager@soleix.local", "SoleixManager!2026");
  check("Admin lands on /admin", pageB.url().endsWith("/admin"));
  check("Admin blocked from /superadmin", await expectRedirectAway(pageB, "/superadmin"), pageB.url());

  // 4. Shop login, blocks, cross-shop isolation
  const pageC = await (await browser.newContext()).newPage();
  await login(pageC, "store.downtown@soleix.local", "SoleixStore!2026");
  check("Shop lands on /panel", pageC.url().endsWith("/panel"));
  check("Shop blocked from /superadmin", await expectRedirectAway(pageC, "/superadmin"), pageC.url());
  check("Shop blocked from /admin", await expectRedirectAway(pageC, "/admin"), pageC.url());
  await pageC.goto(`${base}/panel/products`, { waitUntil: "domcontentloaded" });
  await pageC.waitForTimeout(800);
  const productsText = await pageC.locator("main").first().innerText();
  check("Shop sees only its own shop's products", /Downtown/.test(productsText) && !/Harbour|Trail House/.test(productsText));
  await pageC.goto(`${base}/panel/orders`, { waitUntil: "domcontentloaded" });
  await pageC.waitForTimeout(800);
  const ordersText = await pageC.locator("main").first().innerText();
  check("Shop sees only its own shop's orders", ordersText.length > 80 && !/Harbour|Trail House/.test(ordersText));

  const pageD = await (await browser.newContext()).newPage();
  await login(pageD, "store.harbour@soleix.local", "SoleixStore!2026");
  await pageD.goto(`${base}/panel/products`, { waitUntil: "domcontentloaded" });
  await pageD.waitForTimeout(800);
  const harbourText = await pageD.locator("main").first().innerText();
  check("Second shop sees its own data, not Downtown's", /Harbour/.test(harbourText) && !/Downtown|Trail House/.test(harbourText));

  // 5. Invalid credentials
  const pageE = await (await browser.newContext()).newPage();
  await pageE.goto(`${base}/login`, { waitUntil: "domcontentloaded" });
  await pageE.fill("#login-email", "manager@soleix.local");
  await pageE.fill("#login-password", "wrong-password-123");
  await pageE.click('button[type="submit"]');
  await pageE.waitForTimeout(2500);
  const errCount = await pageE.locator("text=/incorrect|invalid|wrong|do not match|records|try again/i").count();
  check("Invalid password rejected with visible error", pageE.url().includes("/login") && errCount > 0);

  // 6. Protected pages without a session (middleware 307)
  const pageF = await (await browser.newContext()).newPage();
  await pageF.goto(`${base}/superadmin`, { waitUntil: "commit" });
  check("Unauthenticated /superadmin → /login", pageF.url().includes("/login"), pageF.url());
  await pageF.goto(`${base}/panel/orders`, { waitUntil: "commit" });
  check("Unauthenticated /panel → /login", pageF.url().includes("/login"), pageF.url());

  // 7. Logout ends the session
  await pageB.goto(`${base}/admin`, { waitUntil: "domcontentloaded" });
  await pageB.waitForTimeout(1200);
  await pageB.locator('form button:has-text("Logout")').first().click();
  await pageB.waitForURL(/\/login/, { timeout: 15000 }).catch(() => {});
  await pageB.goto(`${base}/admin`, { waitUntil: "commit" });
  check("Logout clears Admin session", pageB.url().includes("/login"), pageB.url());

  // 8. Storefront intact + login page minimal
  const pageG = await (await browser.newContext()).newPage();
  const consoleErrors = [];
  pageG.on("console", (msg) => msg.type() === "error" && consoleErrors.push(msg.text()));
  await pageG.goto(`${base}/`, { waitUntil: "domcontentloaded" });
  await pageG.waitForTimeout(1500);
  check("Homepage hero renders", (await pageG.locator("body").innerText()).toUpperCase().includes("NEXT MOVE"));
  await pageG.goto(`${base}/shop`, { waitUntil: "domcontentloaded" });
  check("Catalog renders products", (await pageG.locator(".product-card").count()) > 0);
  await pageG.goto(`${base}/login`, { waitUntil: "domcontentloaded" });
  const loginText = (await pageG.locator("body").innerText()).toLowerCase();
  const googleButtons = await pageG.locator('a.auth-google').count();
  check("Login page has no signup/forgot extras", !/sign up|forgot|facebook|register/.test(loginText) && googleButtons === 0, `google buttons: ${googleButtons}`);
  check("No console errors on storefront pages", consoleErrors.length === 0, consoleErrors.join(" | ").slice(0, 300));
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
