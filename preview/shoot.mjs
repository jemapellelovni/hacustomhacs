import pw from "/opt/node22/lib/node_modules/playwright/index.js";
const { chromium } = pw;
import path from "path";

const dir = path.dirname(new URL(import.meta.url).pathname);
const url = (process.env.PREVIEW_URL || "http://127.0.0.1:8799/preview/preview.html");

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 820, height: 1180 }, deviceScaleFactor: 2 });
const errs = [];
page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
page.on("pageerror", (e) => errs.push("PAGEERROR: " + e.message));

await page.goto(url, { waitUntil: "networkidle" });
await page.waitForFunction(() => window.__ready === true, { timeout: 8000 }).catch(() => {});
await page.waitForTimeout(800);

for (const lvl of ["warning", "critical", "info"]) {
  await page.evaluate((l) => window.__setLevel && window.__setLevel(l), lvl);
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(dir, `preview-${lvl}.png`), fullPage: true });
}

console.log("errors:", errs.length ? errs.join("\n") : "none");
await browser.close();
