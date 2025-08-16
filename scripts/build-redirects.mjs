/* eslint-env node */
/* eslint-disable no-useless-escape */
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA = path.join(ROOT, "data", "services.json");
const OUT = path.join(ROOT, "_htaccess.services");

const slugify = s => s.toLowerCase()
  .replace(/&/g, " and ")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "");

const RESERVED = new Set([
  "index", "about", "faq", "compare", "what-is-bitcoin", "what-is-lightning"
]);

(async () => {
  const raw = await fs.readFile(DATA, "utf8");
  const list = JSON.parse(raw);

  const lines = [];
  for (const svc of list) {
    const name = (svc && svc.name) ? String(svc.name) : null;
    if (!name) continue;
    const slug = (svc.slug && String(svc.slug)) || slugify(name);
    if (RESERVED.has(slug)) continue;
    lines.push(`Redirect 301 /${slug}.html /services/${slug}.html`);
  }

  await fs.writeFile(OUT, lines.join("\n") + (lines.length ? "\n" : ""), "utf8");
  console.log(`Wrote _htaccess.services with ${lines.length} redirects`);
})();


