/* eslint-env node */
/* eslint-disable no-useless-escape */
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = ROOT;
const DATA = path.join(ROOT, "data", "services.json");
const COMPARE_BASE = path.join(ROOT, "compare.html");

// -------- helpers --------
const slugify = s =>
  s.toLowerCase().replace(/&/g," and ").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");

const clamp = (s, n=160) => {
  const t = (s||"").replace(/\s+/g," ").trim();
  return t.length <= n ? t : t.slice(0, n-1).trimEnd() + "…";
};

const setTag = (html, tag, content) =>
  html.replace(new RegExp(`<${tag}[^>]*>[\\s\\S]*?<\\/${tag}>`, "i"), `<${tag}>${content}</${tag}>`);

const setMeta = (html, name, content) =>
  html.replace(new RegExp(`(<meta[^>]+name=["']${name}["'][^>]+content=["'])[\\s\\S]*?(["'][^>]*>)`, "i"), `$1${content}$2`);

const ensureRobots = (html, value) => {
  if (new RegExp(`name=["']robots["']`, "i").test(html)) return setMeta(html, "robots", value);
  return html.replace("</head>", `<meta name="robots" content="${value}"></head>`);
};

const setProp = (html, prop, content) =>
  html.replace(new RegExp(`(<meta[^>]+property=["']${prop}["'][^>]+content=["'])[\\s\\S]*?(["'][^>]*>)`, "i"), `$1${content}$2`);

const setCanonical = (html, href) =>
  html.replace(/(<link[^>]+rel=["']canonical["'][^>]+href=["'])[^\"]*(")/i, `$1${href}$2`);

const setCategoryTitle = (html, title) =>
  html.replace(/<h2 id="category-title">[\s\S]*?<\/h2>/i, `<h2 id="category-title">${title}</h2>`);

const between = (str, start, end) => {
  const a = str.indexOf(start);
  const b = str.indexOf(end, a + start.length);
  if (a === -1 || b === -1) throw new Error("BUILD markers not found");
  return { before: str.slice(0, a + start.length), inside: str.slice(a + start.length, b), after: str.slice(b) };
};

const pairsWithin = list => {
  const out = [];
  for (let i=0;i<list.length;i++) for (let j=i+1;j<list.length;j++) out.push([list[i], list[j]]);
  return out;
};

// -------- main --------
(async () => {
  const [raw, baseRaw] = await Promise.all([
    fs.readFile(DATA, "utf8"),
    fs.readFile(COMPARE_BASE, "utf8"),
  ]);
  const services = JSON.parse(raw).map(s => ({ ...s, slug: slugify(s.name), type: s.type_of_platform || "Other" }));

  // group by category
  const byType = services.reduce((m, s) => {
    (m[s.type] ||= []).push(s);
    return m;
  }, {});

  const redirects = ["# BEGIN buoy compare redirects"];
  const pages = [];

  for (const [type, list] of Object.entries(byType)) {
    const pairs = pairsWithin(list);
    for (const [A, B] of pairs) {
      // canonical path = sorted slugs
      const [L, R] = [A, B].sort((x,y) => x.slug.localeCompare(y.slug));
      const pathSlug = `${L.slug}-vs-${R.slug}`;
      const url = `https://buoybitcoin.com/${pathSlug}.html`;

      let html = baseRaw;

      // SEO
      const title = `${A.name} vs ${B.name} — Which is better? | Buoy Bitcoin`;
      const desc  = clamp(`Compare ${A.name} and ${B.name} (${type}): fees, custody, features, and more.`);
      html = setTag(html, "title", title);
      html = setMeta(html, "description", desc);
      html = setCanonical(html, url);
      html = setProp(html, "og:url", url);
      html = setProp(html, "og:title", title);
      html = setProp(html, "og:description", desc);
      html = setMeta(html, "twitter:title", title);
      html = setMeta(html, "twitter:description", desc);
      html = ensureRobots(html, "index,follow"); // override template's noindex for static pages
      html = setCategoryTitle(html, `${A.name} vs ${B.name}`);

      // Head shim: preserve user-chosen order via ?services=
      const shim = `
<script>
(function(){
  try {
    var a = ${JSON.stringify(A.name)};
    var b = ${JSON.stringify(B.name)};
    var cat = ${JSON.stringify(type)};
    var p = new URLSearchParams(location.search);
    if (!p.get('services')) p.set('services', a + ',' + b);
    if (!p.get('category')) p.set('category', cat);
    history.replaceState(null, '', location.pathname + '?' + p.toString());
    window.__BUOY_COMPARE__ = [a,b];
  } catch(e){}
})();
</script>`;
      html = html.replace("</head>", shim + "</head>");

      // keep existing container markup; runtime JS will render
      try {
        const { before, inside, after } = between(html, "<!-- BUILD:START -->", "<!-- BUILD:END -->");
        html = `${before}\n${inside}\n${after}`;
      } catch {}

      // JSON-LD
      const jsonLd = {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "name": title, "url": url, "description": desc,
        "about": [
          {"@type":"Organization","name":A.name,"url":A.website||url},
          {"@type":"Organization","name":B.name,"url":B.website||url}
        ]
      };
      html = html.replace("</head>", `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script></head>`);

      await fs.writeFile(path.join(OUT, `${pathSlug}.html`), html, "utf8");
      pages.push(`/${pathSlug}.html`);

      // reverse URL → canonical (301)
      const rev = `${R.slug}-vs-${L.slug}.html`;
      if (rev !== `${pathSlug}.html`) {
        redirects.push(`RewriteRule ^${rev.replace(/\./g,"\\.").replace(/-/g,"-")}$ /${pathSlug}.html [R=301,L]`);
      }
    }
  }

  redirects.push("# END buoy compare redirects\n");
  await fs.writeFile(path.join(OUT, "generated-compare-redirects.htaccess"), redirects.join("\n"), "utf8");
  console.log("Built", pages.length, "compare pages");
})();
