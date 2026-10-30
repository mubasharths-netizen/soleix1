import { chromium } from "@playwright/test";

const browser = await chromium.launch();
const page = await (await browser.newContext()).newPage();
page.on("pageerror", (e) => console.log("[pageerror]", String(e).slice(0, 180)));
page.on("console", (m) => m.type() === "error" && console.log("[console]", m.text().slice(0, 180)));

await page.goto("http://localhost:3210/product/velocity-01", { waitUntil: "domcontentloaded", timeout: 90000 });
await page.waitForSelector("#reviews", { timeout: 90000 }).catch(async () => {
  console.log("[warn] #reviews not found; body length:", (await page.content()).length);
});
await page.click("#reviews button[aria-controls='review-form']", { timeout: 90000 });
await page.waitForSelector("#review-form", { timeout: 90000 });
await page.waitForTimeout(800);

console.log("button now:", (await page.locator("#reviews button[aria-controls='review-form']").innerText()).trim());
console.log("form open:", await page.locator("#review-form").count());
console.log("selects:", await page.locator("select").count());
const options = await page.$$eval("select option", (els) => els.map((e) => e.textContent));
console.log("fit options:", JSON.stringify(options));
console.log("terms link:", await page.locator("a[href='/info/terms']").count());
console.log("star buttons:", await page.locator("[aria-label*='star']").count());
await browser.close();
