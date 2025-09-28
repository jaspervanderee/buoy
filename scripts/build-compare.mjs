/* eslint-env node */
/* eslint-disable no-useless-escape */
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA = path.join(ROOT, "data", "services.json");
const OUT_REDIRECTS = path.join(ROOT, "generated-compare-redirects.htaccess");
const VERDICTS_PATH = path.join(ROOT, "data", "verdicts.json");
let VERDICTS = {};
const FAQS_PATH = path.join(ROOT, "data", "faqs.json");
let FAQS = {};
const SELF_PATH = path.join(__dirname, "build-compare.mjs");

// Known category hubs used for breadcrumb linking (if present)
const CATEGORY_HUBS = {
  "Buy Bitcoin": "/buy-bitcoin.html",
  "Spend Bitcoin": "/spend-bitcoin.html",
  "Store it safely": "/store-it-safely.html",
  "Run my own node": "/run-my-own-node.html",
  "Accept Bitcoin as a merchant": "/accept-bitcoin-as-a-merchant.html"
};

const slugify = s => String(s || "")
  .toLowerCase()
  .replace(/&/g, " and ")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "");

function canonicalPairSlug(aName, bName) {
  const a = slugify(aName);
  const b = slugify(bName);
  return [a, b].sort().join("-vs-");
}

function escapeAttr(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function computeDateModified() {
  const inputs = [DATA, VERDICTS_PATH, FAQS_PATH, SELF_PATH];
  try {
    const stats = await Promise.all(inputs.map(p => fs.stat(p).catch(() => null)));
    let maxMs = 0;
    for (const st of stats) {
      if (st && typeof st.mtimeMs === "number" && st.mtimeMs > maxMs) maxMs = st.mtimeMs;
    }
    if (!maxMs) return null;
    const d = new Date(maxMs);
    const iso = d.toISOString();
    const human = d.toLocaleString("en-US", { month: "long", year: "numeric" });
    return { iso, human };
  } catch (_e) {
    return null;
  }
}

function htmlForPair(a, b, categoryLabel, updated) {
  const aName = a.name;
  const bName = b.name;
  const title = `${aName} vs ${bName} — Which is better? | Buoy Bitcoin`;
  const desc = `Compare ${aName} and ${bName} (${categoryLabel}): fees, custody, features, and more.`;
  const canonicalPath = `/compare/${canonicalPairSlug(aName, bName)}.html`;
  const canonical = `https://buoybitcoin.com${canonicalPath}`;
  const categoryUrl = CATEGORY_HUBS[categoryLabel];
  const pairSlug = canonicalPairSlug(aName, bName);
  // Tiny head shim: if no query, set services=A,B and category
  const shim = `\n<script>\n(function(){\n  try {\n    var a = ${JSON.stringify(aName)};\n    var b = ${JSON.stringify(bName)};\n    var cat = ${JSON.stringify(categoryLabel)};\n    var p = new URLSearchParams(location.search);\n    if (!p.get('services')) p.set('services', a + ',' + b);\n    if (!p.get('category')) p.set('category', cat);\n    history.replaceState(null, '', location.pathname + '?' + p.toString());\n    window.__BUOY_COMPARE__ = [a,b];\n  } catch(e){}\n})();\n</script>`;

  const breadcrumbBack = categoryUrl
    ? `\n<div class="breadcrumb-back"><a href="${categoryUrl}">< Back to ${categoryLabel}</a></div>`
    : `\n<div class="breadcrumb-back"><a href="/">< Back to Home</a></div>`;

  const breadcrumbHtml = `\n<nav class="breadcrumbs" aria-label="Breadcrumb">\n  <ol>\n    <li><a href="/">Home</a></li>\n    <li>` + (categoryUrl
      ? `<a href="${categoryUrl}"><span id="breadcrumb-category-label">${categoryLabel}</span></a>`
      : `<span id="breadcrumb-category-label">${categoryLabel}</span>`) + `</li>\n    <li><span id="breadcrumb-current" aria-current="page">${aName} vs ${bName}</span></li>\n  </ol>\n</nav>`;

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, item: { "@type": "WebPage", "@id": "https://buoybitcoin.com/", name: "Home" } },
      categoryUrl
        ? { "@type": "ListItem", position: 2, item: { "@type": "WebPage", "@id": `https://buoybitcoin.com${categoryUrl}`, name: categoryLabel } }
        : { "@type": "ListItem", position: 2, item: { "@type": "Thing", name: categoryLabel } },
      { "@type": "ListItem", position: 3, item: { "@type": "WebPage", "@id": canonical, name: `${aName} vs ${bName}` } }
    ]
  };

  const v = (VERDICTS && VERDICTS[pairSlug]) || null;
  let verdictAttrs = "";
  if (v && v.p) {
    verdictAttrs += ` data-p="${escapeAttr(v.p)}"`;
  }

  // Optional FAQ block for specific compare pages (e.g., muun-vs-phoenix)
  const faqs = (FAQS && FAQS[pairSlug]) || null;
  const faqSectionHtml = Array.isArray(faqs) && faqs.length > 0
    ? `\n<section class="brand-faq" aria-labelledby="faq-heading" data-pair="${pairSlug}">\n  <h2 id="faq-heading">FAQs</h2>\n  <div class="faq-list">\n    ${faqs.map(item => {
        const q = escapeAttr(item.q);
        const a = escapeAttr(item.a);
        return `<details><summary>${q}</summary><div><p>${a}</p></div></details>`;
      }).join("\n    ")}\n  </div>\n</section>`
    : "";

  const faqLd = Array.isArray(faqs) && faqs.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(item => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a }
    }))
  } : null;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${desc}"/>
  <link rel="canonical" href="${canonical}"/>
  <meta property="og:type" content="website"/>
  <meta property="og:url" content="${canonical}"/>
  <meta property="og:title" content="${title}"/>
  <meta property="og:description" content="${desc}"/>
  <meta property="og:image" content="https://buoybitcoin.com/android-chrome-512x512.png"/>
  <meta name="robots" content="index,follow">
  <meta name="twitter:card" content="summary_large_image"/>
  <meta name="twitter:title" content="${title}"/>
  <meta name="twitter:description" content="${desc}"/>
  <meta name="twitter:image" content="https://buoybitcoin.com/android-chrome-512x512.png"/>
  <meta name="twitter:site" content="@jaspervanderee"/>
  <link rel="stylesheet" href="/css/styles.css">
  <link href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=Ubuntu+Mono:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/flag-icon-css/3.5.0/css/flag-icon.min.css">
  <script defer src="https://feedback.fish/ff.js?pid=17f299e6843396" crossorigin="anonymous"></script>
  <script defer src="https://cloud.umami.is/script.js" data-website-id="0895676a-bb0e-488d-9381-a27cf9cf5888"></script>
${shim}<script type="application/ld+json">${JSON.stringify({
    "@context":"https://schema.org",
    "@type":"WebPage",
    name: title,
    url: canonical,
    description: desc,
    dateModified: updated && updated.iso || undefined,
    about: [
      { "@type":"Organization", name: aName, url: a.website || undefined },
      { "@type":"Organization", name: bName, url: b.website || undefined }
    ]
  })}</script>
  <script type="application/ld+json">${JSON.stringify(breadcrumbLd)}</script>
  ${faqLd ? `<script type="application/ld+json">${JSON.stringify(faqLd)}</script>` : ""}
</head>
<body>
  <div class="container">
 <header>
  <div class="container">
    <div id="logo"><a href="/"><img src="/images/buoy-logo-horizontal.svg" alt="Buoy Bitcoin logo"></a></div>
    <button class="hamburger" aria-label="Toggle Menu">
      <span></span>
      <span></span>
      <span></span>
    </button>
  </div>
<nav class="menu">
  <div class="menu-content">
    <!-- Search bar -->
    <div class="search-bar">
  <div class="search-wrapper">
    <input type="text" placeholder="Search..." id="menu-search" />
    <div id="search-suggestions" class="search-suggestions"></div>
  </div>
  <button id="menu-compare-btn" class="compare-btn">compare</button>
</div>
<div id="menu-selected-services" class="selected-services"></div>

    <!-- Menu sections -->
    <section class="menu-section">
      <ul>
        <div class="custom-dropdown">
          <div class="dropdown-label" id="dropdown-label">
            <img src="/images/global-white.svg" alt="Your Location" class="availability-icon" />
            <span>Your location</span>
          </div>
          <input type="text" id="country-search" placeholder="Type your country..." style="display:none;" />
          <ul class="dropdown-list"></ul>
        </div>

        <li>
          <a href="/about.html">
            <img src="/images/about.svg" alt="About Icon" />
            About
          </a>
        </li>
        <li>
  <a href="/faq.html">
    <img src="/images/faq.svg" alt="FAQ Icon" />
    FAQ
  </a>
</li>
<li>
  <a href="#donate" id="donate-link">
    <img src="/images/lightning.svg" alt="Donate Icon" />
    Donate
  </a>
</li>
<li>
  <a data-feedback-fish href="javascript:void(0)">
    <img src="/images/feedback.svg" alt="Feedback Icon" />
    Give us feedback
  </a>
</li>
<li>
  <a id="contact-link" href="mailto:support&#64;buoybitcoin.com">
    <img src="/images/contact.svg" alt="Contact Icon"/>
    Contact
  </a>
</li>

      </ul>
    </section>
  </div>
</nav>

</header>
 <main>
  <div class="category-header category-header--vs">
    <h1 id="page-title">${aName} vs ${bName}</h1>
    ${updated && updated.iso ? `<div class="page-updated" data-updated="${updated.iso}">Updated: ${updated.human}</div>` : ""}
    ${breadcrumbBack}
    ${breadcrumbHtml}
  </div>
<!-- BUILD:START -->

<div id="comparison-container">
  <div class="logo-row-sticky">
    <div class="feature-values logo-row" id="logo-row-container"></div>
  </div>
  <section id="vs-verdict" aria-live="polite"${verdictAttrs}>
    <h2 class="feature-label verdict-title">Quick take</h2>
  </section>
  <div id="comparison-table-wrapper"></div>
</div>

${faqSectionHtml}

<!-- BUILD:END -->



<!-- Rating Modal -->
<div id="rating-modal" class="rating-modal">
  <div class="rating-content">
    <span class="close-btn">&times;</span>
    <p>Rate this service</p>
    <div class="star-rating">
      <span data-value="1">&#9733;</span>
      <span data-value="2">&#9733;</span>
      <span data-value="3">&#9733;</span>
      <span data-value="4">&#9733;</span>
      <span data-value="5">&#9733;</span>
    </div>
  </div>
</div>

</main>

</div>  <!-- container -->
<footer>
  <div class="footer-container">
    <div class="footer-column">
      <h3>Social</h3>
      <ul>
        <li><a href="https://snort.social/p/npub165w944kqt29hrt90l2ssc0rvmhf0u77dgezskknfnczr7r030v0s2g6kae" target="_blank">Nostr</a></li>
        <li><a href="https://x.com/jaspervanderee" target="_blank">X</a></li>
        <li><a href="https://github.com/jaspervanderee/buoy" target="_blank">GitHub</a></li>
      </ul>
    </div>
    <div class="footer-column">
      <h3>Learn</h3>
      <ul>
        <li><a href="/what-is-bitcoin.html">Bitcoin</a></li>
        <li><a href="/what-is-lightning.html">Lightning</a></li>
      </ul>
    </div>
    <div class="footer-column">
      <h3>Support</h3>
      <ul>
        <li><a href="mailto:support&#64;buoybitcoin.com">Contact</a></li>
        <li><a href="/faq.html">FAQ</a></li>
        <li><a href="/privacy.html">Privacy</a></li>
        <li><a href="/terms.html">Terms of Service</a></li>
      </ul>
    </div>
    <!-- Add more columns here if needed -->
  </div>
</footer>

  <script src="/js/script.js"></script>
  <script src="/js/compare.js"></script>
</body>
</html>`;
}

(async () => {
  // Load verdicts once
  try {
    const vr = await fs.readFile(VERDICTS_PATH, "utf8");
    VERDICTS = JSON.parse(vr);
  } catch (_e) {
    VERDICTS = {};
  }

  // Load FAQs once
  try {
    const fq = await fs.readFile(FAQS_PATH, "utf8");
    FAQS = JSON.parse(fq);
  } catch (_e) {
    FAQS = {};
  }

  const raw = await fs.readFile(DATA, "utf8");
  const all = JSON.parse(raw).filter(s => s && s.name);

  // Group by runtime-enforced category label
  const labelFor = s => s.category || "Services";
  const byCat = new Map();
  for (const s of all) {
    const k = labelFor(s);
    if (!byCat.has(k)) byCat.set(k, []);
    byCat.get(k).push(s);
  }

  const outFiles = [];
  const redirectLines = [];
  await fs.mkdir(path.join(ROOT, "compare"), { recursive: true });

  for (const [cat, list] of byCat.entries()) {
    // Sort by name for stable output
    const sorted = list.slice().sort((a,b) => a.name.localeCompare(b.name));
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const a = sorted[i];
        const b = sorted[j];
        const slug = canonicalPairSlug(a.name, b.name);
        const updated = await computeDateModified();
        const html = htmlForPair(a, b, cat, updated);
        await fs.writeFile(path.join(ROOT, "compare", `${slug}.html`), html, "utf8");
        outFiles.push(`compare/${slug}.html`);
        // Redirect rules: root canonical and reversed -> /compare/canonical
        redirectLines.push(`RewriteRule ^${slug}\.html$ /compare/${slug}.html [R=301,L]`);
        const rev = `${slugify(b.name)}-vs-${slugify(a.name)}`;
        if (rev !== slug) {
          redirectLines.push(`RewriteRule ^${rev}\.html$ /compare/${slug}.html [R=301,L]`);
          redirectLines.push(`RewriteRule ^compare/${rev}\.html$ /compare/${slug}.html [R=301,L]`);
        }
      }
    }
  }

  // Write redirects block into .htaccess between markers
  const htaccessPath = path.join(ROOT, ".htaccess");
  const blockHeader = "# BEGIN compare-redirects (auto)";
  const blockFooter = "# END compare-redirects (auto)";
  const block = `${blockHeader}\n${redirectLines.join("\n")}\n${blockFooter}`;
  let ht = "";
  try {
    ht = await fs.readFile(htaccessPath, "utf8");
  } catch (_e) {
    // no existing .htaccess, create new
  }
  if (ht.includes(blockHeader)) {
    const re = new RegExp(`${blockHeader}[\n\r\s\S]*?${blockFooter}`);
    ht = ht.replace(re, block);
  } else {
    // Insert after RewriteEngine On if present, else append
    const marker = "RewriteEngine On";
    const idx = ht.indexOf(marker);
    if (idx !== -1) {
      const endOfLine = ht.indexOf("\n", idx);
      const before = ht.slice(0, endOfLine + 1);
      const after = ht.slice(endOfLine + 1);
      ht = `${before}\n${block}\n${after}`;
    } else {
      ht = `${block}\n\n${ht}`;
    }
  }
  await fs.writeFile(htaccessPath, ht, "utf8");

  console.log(`Built ${outFiles.length} compare pages and updated .htaccess redirects`);
})();
