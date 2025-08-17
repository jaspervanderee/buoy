/* eslint-env node */
/* eslint-disable no-useless-escape */

// scripts/build-static.mjs
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { injectAlternatives } from "./lib/alternatives.mjs";
import { renderTableHTML } from "../shared/renderTable.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = ROOT; // site root
const OUT_SERVICES = path.join(OUT, "services"); // write service pages under /services
const DATA = path.join(ROOT, "data", "services.json");
const SERVICE_BASE = path.join(ROOT, "service.html");

// -------- helpers --------
const slugify = s =>
  s.toLowerCase().replace(/&/g," and ").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");

const clamp = (s, n=160) => {
  const txt = (s||"").replace(/\s+/g," ").trim();
  return txt.length <= n ? txt : txt.slice(0, n-1).trimEnd() + "…";
};

const setTag = (html, tag, content) =>
  html.replace(new RegExp(`<${tag}[^>]*>[\\s\\S]*?<\\/${tag}>`, "i"), `<${tag}>${content}</${tag}>`);

const setMeta = (html, name, content) =>
  html.replace(new RegExp(`(<meta[^>]+name=["']${name}["'][^>]+content=["'])[\\s\\S]*?(["'][^>]*>)`, "i"), `$1${content}$2`);

const setProp = (html, prop, content) =>
  html.replace(new RegExp(`(<meta[^>]+property=["']${prop}["'][^>]+content=["'])[\\s\\S]*?(["'][^>]*>)`, "i"), `$1${content}$2`);

const setCanonical = (html, href) =>
  html.replace(/(<link[^>]+rel=["']canonical["'][^>]+href=["'])[^\"]*(")/i, `$1${href}$2`);

// ✅ single version
const setCategoryTitle = (html, title) =>
    html.replace(/<h2 id="category-title">[\s\S]*?<\/h2>/i, `<h2 id="category-title">${title}</h2>`);
  
  

const between = (str, start, end) => {
  const a = str.indexOf(start);
  const b = str.indexOf(end, a + start.length);
  if (a === -1 || b === -1) throw new Error("BUILD markers not found");
  return {
    before: str.slice(0, a + start.length),
    inside: str.slice(a + start.length, b),
    after: str.slice(b),
  };
};

// -------- main --------
(async () => {
  const [dataRaw, baseRaw] = await Promise.all([
    fs.readFile(DATA, "utf8"),
    fs.readFile(SERVICE_BASE, "utf8"),
  ]);
  const services = JSON.parse(dataRaw);
  await fs.mkdir(OUT_SERVICES, { recursive: true });
  const serviceUrls = [];

  for (const svc of services) {
    const slug = slugify(svc.name);
    const url = `https://buoybitcoin.com/services/${slug}.html`;
    const title = `${svc.name} — Review, fees & features | Buoy Bitcoin`;
    const desc = clamp(svc.description || `Learn about ${svc.name} on Buoy Bitcoin.`);

    let html = baseRaw;

    // Update head
    html = setTag(html, "title", title);
    html = setMeta(html, "description", desc);
    html = setCanonical(html, url);
    html = setProp(html, "og:url", url);
    html = setProp(html, "og:title", title);
    html = setProp(html, "og:description", desc);
    html = setMeta(html, "twitter:title", title);
    html = setMeta(html, "twitter:description", desc);

    // --- Inject a tiny shim so runtime JS knows which service to load ---
const urlShim = `
<script>
(function(){
  try {
    var svc  = ${JSON.stringify(svc.name)};
    var slug = ${JSON.stringify(slug)};
    var p = new URLSearchParams(location.search);

    // set the common keys your JS might read
    if (!p.get('services')) p.set('services', svc);
    if (!p.get('service'))  p.set('service',  svc);
    if (!p.get('name'))     p.set('name',     svc);
    if (!p.get('slug'))     p.set('slug',     slug);

    history.replaceState(null, '', location.pathname + '?' + p.toString());
    window.__BUOY_SERVICE__ = svc;
    window.__BUOY_SLUG__ = slug;
    window.__BUOY_SINGLE__ = true;
  } catch (e) {}
})();
</script>
`;
html = html.replace('</head>', urlShim + '</head>');


    // Update H2 (category header) → use service category
    html = setCategoryTitle(html, svc.category);

    // Keep existing container markup (your JS will populate it)
    // Make sure service.html has:
    // <!-- BUILD:START --> ... #comparison-container ... <!-- BUILD:END -->
    try {
      const tableHtml = await renderTableHTML(svc, svc.category);
      const bakedBlock = `
<div id="comparison-container">
  <div class="logo-row-sticky">
    <div class="feature-values logo-row" id="logo-row-container"></div>
  </div>
  <div id="comparison-table-wrapper">
    ${tableHtml}
  </div>
</div>`;
      const { before, after } = between(html, "<!-- BUILD:START -->", "<!-- BUILD:END -->");
      html = `${before}\n${bakedBlock}\n${after}`;
    } catch (e) {
      // If BUILD markers are missing or renderer failed, keep the page unchanged.
    }

    // OPTIONAL: add JSON-LD
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": title,
      "url": url,
      "description": desc,
      "about": { "@type": "Organization", "name": svc.name, "url": svc.website || url }
    };
    html = html.replace("</head>", `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script></head>`);

    // Inject Alternatives block under comparison area
    try {
      html = injectAlternatives(html, svc, services);
    } catch (e) {
      // fail-safe: if anything goes wrong, keep the page without alternatives
    }

    // NOTE: Do NOT add data-static yet. Let the current JS render the body so design stays identical.
    await fs.writeFile(path.join(OUT_SERVICES, `${slug}.html`), html, "utf8");
    serviceUrls.push(url);
    console.log("Wrote", `services/${slug}.html`);
  }

  // Write a dedicated services sitemap without touching the main sitemap.xml
  const sitemapXml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...serviceUrls.map(u => `  <url><loc>${u}</loc></url>`),
    '</urlset>'
  ].join('\n');
  await fs.writeFile(path.join(OUT, 'sitemap-services.xml'), sitemapXml, 'utf8');
  console.log('Wrote sitemap-services.xml with', serviceUrls.length, 'URLs');
})();
