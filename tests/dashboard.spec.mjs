import { chromium } from "@playwright/test";

const BASE = process.env.BASE || "http://localhost:3111";
const SUPER = { email: process.env.SOLEIX_SUPERADMIN_EMAIL, password: process.env.SOLEIX_SUPERADMIN_PASSWORD };
const results = [];
const errors = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"} · ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) process.exitCode = 1;
};

const browser = await chromium.launch();

async function open(email, password) {
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 950 } })).newPage();
  page.on("pageerror", (error) => errors.push(`pageerror ${page.url()}: ${String(error).slice(0, 160)}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`console ${page.url()}: ${msg.text().slice(0, 160)}`);
  });
  page.on("response", (res) => {
    if (res.status() >= 500) errors.push(`http ${res.status()} ${res.url()}`);
  });
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#login-email", { timeout: 20000 });
  await page.fill("#login-email", email);
  await page.fill("#login-password", password);
  await page.keyboard.press("Enter");
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 30000 }).catch(() => {});
  await ready(page);
  return page;
}

// Pages stream their data in after the prerendered shell, so every read waits for real content.
const ready = (page) =>
  page.waitForFunction(() => {
    const main = document.querySelector("main");
    return Boolean(main && main.innerText.trim().length > 40);
  }, null, { timeout: 20000 }).catch(() => {});
const text = async (page) => {
  await ready(page);
  const main = page.locator("main");
  return (await main.count()) ? main.innerText() : page.locator("body").innerText();
};
const navLabels = async (page) => {
  await page.waitForSelector(".app-nav a", { timeout: 20000 }).catch(() => {});
  return page.locator(".app-nav a").allInnerTexts();
};
// CSS text-transform upper-cases headings and labels, so comparisons are case-insensitive.
const hasText = (haystack, needle) => haystack.toLowerCase().includes(needle.toLowerCase());

// ---------- Super Admin ----------
if (!SUPER.email || !SUPER.password) {
  console.log("SKIP · super admin screens — SOLEIX_SUPERADMIN_EMAIL/PASSWORD not present in the environment");
  process.exitCode = 1;
} else {
  const super1 = await open(SUPER.email, SUPER.password);
  check("Super Admin lands on /superadmin", super1.url().endsWith("/superadmin"), super1.url());

  const dash = await text(super1);
  for (const label of [
    "Shops on the platform",
    "Sales booked",
    "Orders",
    "Cash collected",
    "COD outstanding",
    "Products",
    "Customer accounts",
    "Staff accounts",
    "Needs your attention",
    "Latest orders",
  ]) {
    check(`dashboard shows ${label}`, hasText(dash, label));
  }
  check("dashboard has no placeholder lorem", !/lorem|ipsum|TODO/i.test(dash));
  await super1.screenshot({ path: "tests/artifacts/dash-superadmin.png", fullPage: true });

  const nav = (await navLabels(super1)).join(" | ");
  for (const item of ["Dashboard", "Staff & admins", "Customers", "Cash collection", "Delivery", "Activity log", "Reports", "Settings"]) {
    check(`super admin nav shows ${item}`, hasText(nav, item), nav.slice(0, 180));
  }

  // New screens render real content, not error boundaries.
  const screens = [
    ["/superadmin/customers", "Customers"],
    ["/superadmin/cod", "Cash on delivery"],
    ["/superadmin/delivery", "Delivery tasks"],
    ["/superadmin/activity", "Activity log"],
    ["/superadmin/admins", "Admin management"],
    ["/superadmin/settings", "Platform checkout rules"],
  ];
  for (const [path, marker] of screens) {
    await super1.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
    const body = await text(super1);
    check(`${path} renders “${marker}”`, hasText(body, marker), body.slice(0, 90).replace(/\s+/g, " "));
    check(`${path} free of framework errors`, !/Application error|This page could not be found|Internal Server Error/i.test(body));
  }

  // Platform rules really persist and feed checkout maths.
  const readFee = async () => {
    await super1.goto(`${BASE}/superadmin/settings`, { waitUntil: "networkidle" });
    return super1.locator('input[name="delivery_fee"]').inputValue();
  };
  const saveFee = async (value) => {
    await super1.locator('input[name="delivery_fee"]').fill(String(value));
    await super1.locator('form:has(input[name="delivery_fee"])').locator('button[type="submit"]').first().click();
    await super1.waitForURL(/saved=1/, { timeout: 25000 }).catch(() => {});
    return readFee();
  };
  const before = await readFee();
  const probe = Number(before) === 250 ? 300 : 250;
  check("delivery fee change is stored", (await saveFee(probe)) === String(probe), `${before} → ${probe}`);
  check("delivery fee restored", (await saveFee(before)) === before);

  // Order lifecycle: pending → confirmed through the orders screen.
  await super1.goto(`${BASE}/superadmin/orders?status=pending`, { waitUntil: "networkidle" });
  const pendingRow = super1.locator("tbody tr").first();
  const hasPending = (await super1.locator("tbody tr").count()) > 0;
  if (hasPending) {
    const reference = await pendingRow.locator("a").first().innerText();
    await pendingRow.locator('select[name="status"]').selectOption("confirmed");
    await pendingRow.locator('button[type="submit"]').first().click();
    await super1.waitForLoadState("networkidle");
    await super1.goto(`${BASE}/superadmin/orders?status=pending`, { waitUntil: "networkidle" });
    check("pending order left the pending filter", !(await super1.locator(`tbody tr:has-text("${reference}")`).count()), reference);
    await super1.goto(`${BASE}/superadmin/orders?status=confirmed`, { waitUntil: "networkidle" });
    check("the same order is now confirmed", (await super1.locator(`tbody tr:has-text("${reference}")`).count()) > 0, reference);
    await super1.goto(`${BASE}/superadmin/activity`, { waitUntil: "networkidle" });
    const log = await text(super1);
    check("status change written to the activity log", /order\.status/.test(log), log.slice(0, 120).replace(/\s+/g, " "));
    const topRow = (await super1.locator("tbody tr").first().innerText().catch(() => "")).replace(/\s+/g, " ");
    check("activity log names the actor and the order", /head office/i.test(log) || log.includes(reference), `top row: ${topRow}`);
  } else {
    check("pending order left the pending filter", false, "no pending orders left to move");
  }

  // A delivered parcel has nowhere forward to go, and cash cannot be "paid online".
  await super1.goto(`${BASE}/superadmin/orders?status=delivered`, { waitUntil: "networkidle" });
  const deliveredRow = super1.locator("tbody tr").filter({ has: super1.locator("td:nth-child(8) >> text=Delivered") }).first();
  if (await deliveredRow.count()) {
    const update = await deliveredRow.innerText();
    check("delivered orders offer no forward move", /No next step/i.test(update), update.split("\n").slice(-1)[0]);
  } else {
    check("delivered orders offer no forward move", false, "no delivered orders found");
  }

  // COD collection.
  await super1.goto(`${BASE}/superadmin/cod`, { waitUntil: "networkidle" });
  const statValue = (index) => super1.locator(".stat-card").nth(index).locator(".stat-value").innerText();
  const collectedBefore = await statValue(0);
  const collectRow = super1.locator("tbody tr").filter({ has: super1.locator('button[type="submit"]') }).first();
  if (await collectRow.count()) {
    const reference = await collectRow.locator("a").first().innerText();
    await collectRow.locator('button[type="submit"]').first().click();
    await super1.waitForURL(/saved=1/, { timeout: 25000 }).catch(() => {});
    check("collection shows a confirmation flash", (await super1.locator(".flash").allInnerTexts()).join(" ").toLowerCase().includes("saved"));
    await super1.goto(`${BASE}/superadmin/cod`, { waitUntil: "networkidle" });
    const stillListed = await super1.locator(`tbody tr:has-text("${reference}")`).count();
    check("recording cash removes the order from the queue", stillListed === 0, reference);
    const collectedAfter = await statValue(0);
    check("cash collected total moves", collectedBefore !== collectedAfter, `${collectedBefore} → ${collectedAfter}`);
    await super1.goto(`${BASE}/superadmin/orders?status=cod_awaiting`, { waitUntil: "networkidle" });
    check("collected order leaves the COD orders filter", !(await text(super1)).includes(reference), reference);
  } else {
    check("recording cash removes the order from the queue", false, "no collectable COD rows available");
  }

  // Delivery board: hand a parcel to staff, then confirm it arrived.
  await super1.goto(`${BASE}/superadmin/delivery`, { waitUntil: "networkidle" });
  if (await super1.locator("tbody tr").count()) {
    const row = super1.locator("tbody tr").first();
    const reference = await row.locator("a").first().innerText();
    const staffNames = await row.locator('select[name="staff_id"] option').allInnerTexts();
    check("delivery board offers same-shop staff", staffNames.length > 1, staffNames.join(", "));
    await row.locator('select[name="staff_id"]').selectOption({ index: 1 });
    await row.locator('form:has(select[name="staff_id"]) button[type="submit"]').first().click();
    await super1.waitForURL(/saved=1/, { timeout: 25000 }).catch(() => {});
    await super1.goto(`${BASE}/superadmin/delivery`, { waitUntil: "networkidle" });
    const assignedRow = super1.locator(`tbody tr:has-text("${reference}")`).first();
    const chosen = await assignedRow.locator('select[name="staff_id"]').inputValue();
    const rider = await assignedRow.locator(`select[name="staff_id"] option[value="${chosen}"]`).innerText();
    const assignedCell = await assignedRow.locator("td").nth(5).innerText();
    check("the parcel now carries a rider", chosen !== "" && assignedCell.includes(rider.trim()), `${rider} → ${assignedCell}`);
    await assignedRow.locator('button:has-text("Mark delivered")').click();
    await super1.waitForURL(/saved=1/, { timeout: 25000 }).catch(() => {});
    await super1.goto(`${BASE}/superadmin/delivery`, { waitUntil: "networkidle" });
    check("delivered parcel leaves the delivery board", (await super1.locator(`tbody tr:has-text("${reference}")`).count()) === 0, reference);
    await super1.goto(`${BASE}/superadmin/activity`, { waitUntil: "networkidle" });
    check("delivery actions are logged", hasText(await text(super1), "order.assigned"));
  } else {
    check("delivery board offers same-shop staff", false, "nothing is out for delivery");
  }

  // Setup link flow: blank password creates an invitation, never a stored plaintext password.
  await super1.goto(`${BASE}/superadmin/admins?new=1`, { waitUntil: "networkidle" });
  const inviteEmail = `qa.setup.${Date.now()}@soleix.local`;
  await super1.locator('input[name="name"]').first().fill("QA Setup Link");
  await super1.locator('input[name="email"]').first().fill(inviteEmail);
  await super1.locator('select[name="role"]').first().selectOption("shop");
  await super1.locator('form:has(input[name="email"])').locator('button[type="submit"]').first().click();
  await super1.waitForURL(/invitation=/, { timeout: 25000 }).catch(() => {});
  const adminsText = await text(super1);
  check("blank password issues a setup link", hasText(adminsText, "One-time setup link"), adminsText.slice(0, 80).replace(/\s+/g, " "));
  check("setup link is offered instead of a password", hasText(adminsText, "never in plain text"));
  check("new account waits for setup", hasText(adminsText, "Waiting for setup"));
  check("create form never stores a typed password", !(await super1.locator('input[name="password"]').first().inputValue()));

  await super1.waitForFunction(() => {
    const field = document.querySelector(".setup-link");
    return Boolean(field && /^https?:\/\/[^\s]+\/set-password\?token=[a-f0-9]{20,}/.test(field.value));
  }, null, { timeout: 10000 }).catch(() => {});
  const setupLink = await super1.locator(".setup-link").first().inputValue().catch(() => "");
  const token = new URL(setupLink || "http://x/").searchParams.get("token") || "";
  check("setup link carries a token", token.length > 20, `${token.length} chars`);
  check("setup link is a full URL", setupLink.startsWith(`${BASE}/set-password?token=`), setupLink.slice(0, 48));
  if (token) {
    await super1.goto(`${BASE}/set-password?token=${token}`, { waitUntil: "networkidle" });
    const setError = await text(super1);
    check("setup page asks for a new password", /choose a password|create a password|new password/i.test(setError), setError.slice(0, 90).replace(/\s+/g, " "));
    await super1.locator('input[name="password"]').first().fill("QaSetup!2026pass");
    await super1.locator('input[name="confirm"]').first().fill("QaSetup!2026pass");
    await super1.locator('button[type="submit"]').first().click();
    await super1.waitForURL((url) => url.pathname !== "/set-password", { timeout: 20000 });
    check("setup link completes and lands on login", super1.url().includes("/login"), super1.url());

    // The link is single-use: replaying it must fail instead of resetting the password again.
    await super1.goto(`${BASE}/set-password?token=${token}`, { waitUntil: "networkidle" });
    await super1.locator('input[name="password"]').first().fill("QaReplay!2026pass");
    await super1.locator('input[name="confirm"]').first().fill("QaReplay!2026pass");
    await super1.locator('button[type="submit"]').first().click();
    await super1.waitForURL((url) => url.searchParams.has("error"), { timeout: 20000 }).catch(() => {});
    const replay = await text(super1);
    check("used setup link cannot be replayed", /already been used|not valid|expired/i.test(replay), replay.slice(0, 90).replace(/\s+/g, " "));

    const page2 = await open(inviteEmail, "QaSetup!2026pass");
    check("invited account can sign in", /\/(panel|admin|superadmin)/.test(page2.url()), page2.url());
    await page2.close();
    await super1.goto(`${BASE}/superadmin/admins`, { waitUntil: "networkidle" });
    const row = super1.locator(`tbody tr:has-text("${inviteEmail}")`).first();
    check("activated account now shows Active", /Active/i.test(await row.innerText().catch(() => "")));
  } else {
    check("setup page asks for a new password", false, "setup token not found on screen");
  }

  // Cross-role isolation: the same URLs must not leak to other roles.
  const shopUser = await open("store.harbour@soleix.local", "SoleixStore!2026");
  check("shop account lands in its own panel", shopUser.url().startsWith(`${BASE}/panel`), shopUser.url());
  const shopNav = (await navLabels(shopUser)).join(" | ").toLowerCase();
  check("shop nav hides staff & admin screens", !shopNav.includes("staff & admins") && !shopNav.includes("customers") && !shopNav.includes("activity log"), shopNav);
  for (const path of ["/superadmin", "/superadmin/customers", "/superadmin/admins", "/superadmin/activity", "/admin/orders"]) {
    await shopUser.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
    check(`shop user blocked from ${path}`, !shopUser.url().includes(path), `ended on ${shopUser.url()}`);
    const body = await text(shopUser);
    check(`${path} shows no other-store data to shop user`, !/Soleix Downtown/i.test(body) || path.includes("panel"));
  }
  const shopDash = await text(shopUser);
  check("shop dashboard stays in its own scope", hasText(shopDash, "Your shop"), shopDash.slice(0, 60).replace(/\s+/g, " "));
  await shopUser.close();

  const adminUser = await open("manager@soleix.local", "SoleixManager!2026");
  const adminNav = (await navLabels(adminUser)).join(" | ").toLowerCase();
  check("admin nav hides super-admin-only screens", !adminNav.includes("staff & admins") && !adminNav.includes("customers") && !adminNav.includes("activity log"), adminNav);
  await adminUser.goto(`${BASE}/superadmin/customers`, { waitUntil: "networkidle" });
  check("admin blocked from /superadmin/customers", !adminUser.url().includes("/superadmin"), adminUser.url());
  await adminUser.goto(`${BASE}/admin/settings`, { waitUntil: "networkidle" });
  check("admin sees no platform rules editor", !(await text(adminUser)).includes("Platform checkout rules"));
  await adminUser.close();

  await super1.close();
}

const failed = results.filter((row) => !row.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
const realErrors = errors.filter((line) => !/favicon|404|Failed to load resource|net::/i.test(line));
console.log(`runtime errors: ${realErrors.length}`);
for (const line of [...new Set(realErrors)].slice(0, 12)) console.log(`  ${line}`);
if (realErrors.length) process.exitCode = 1;
await browser.close();
