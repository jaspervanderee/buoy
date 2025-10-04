/* eslint-env node */
/* eslint-disable no-useless-escape */

// scripts/build-static.mjs
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { injectAlternatives } from "./lib/alternatives.mjs";
import { renderTableHTML } from "../shared/renderTable.mjs";
import { renderFAQBlock, renderFAQJsonLD } from "./lib/faqs.mjs";
import { ensureRobotsMeta } from "./lib/head.mjs";

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
  return txt.length <= n ? txt : txt.slice(0, n-1).trimEnd() + "â€¦";
};

const setTag = (html, tag, content) =>
  html.replace(new RegExp(`<${tag}[^>]*>[\\s\\S]*?<\\/${tag}>`, "i"), `<${tag}>${content}</${tag}>`);

const setMeta = (html, name, content) =>
  html.replace(new RegExp(`(<meta[^>]+name=["']${name}["'][^>]+content=["'])[\\s\\S]*?(["'][^>]*>)`, "i"), `$1${content}$2`);

const setProp = (html, prop, content) =>
  html.replace(new RegExp(`(<meta[^>]+property=["']${prop}["'][^>]+content=["'])[\\s\\S]*?(["'][^>]*>)`, "i"), `$1${content}$2`);

const setCanonical = (html, href) =>
  html.replace(/(<link[^>]+rel=["']canonical["'][^>]+href=["'])[^\"]*(")/i, `$1${href}$2`);

// Replace the template heading with a single H1 for the service name
const setPageTitle = (html, title) =>
    html.replace(/<h1 id="page-title">[\s\S]*?<\/h1>/i, `<h1 id="page-title">${title}</h1>`);
  
  

const updatedFormatter = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" });

const injectUpdatedChip = (html, isoDate) => {
  if (!isoDate) return html;
  const dt = new Date(isoDate);
  if (Number.isNaN(dt.getTime())) return html;
  const label = updatedFormatter.format(dt);
  const chip = `<div class="page-updated" data-updated="${isoDate}">Updated: ${label}</div>`;
  const categoryHeaderRegex = /(<div class="category-header(?: [^"]+)?">[\s\S]*?<h1 id="page-title">[\s\S]*?<\/h1>)/i;
  if (!categoryHeaderRegex.test(html)) return html;
  return html.replace(categoryHeaderRegex, (match) => {
    if (match.includes("page-updated")) return match;
    return `${match}\n${chip}`;
  });
};

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
    const title = `${svc.name} â€” Review, fees & features | Buoy Bitcoin`;
    const desc = clamp(svc.description || `Learn about ${svc.name} on Buoy Bitcoin.`);

    let html = baseRaw;

    if (html.includes('<div class="category-header">')) {
      html = html.replace('<div class="category-header">', '<div class="category-header category-header--vs">');
    }

    // Update head
    html = setTag(html, "title", title);
    html = setMeta(html, "description", desc);
    html = setCanonical(html, url);
    html = setProp(html, "og:url", url);
    html = setProp(html, "og:title", title);
    html = setProp(html, "og:description", desc);
    html = setMeta(html, "twitter:title", title);
    html = setMeta(html, "twitter:description", desc);
    // Ensure single, rich robots meta for indexable service pages
    html = ensureRobotsMeta(html, { indexable: true });

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


    // Update H1 (page title) â†’ use service name
    html = setPageTitle(html, svc.name);
    html = injectUpdatedChip(html, svc.updated);

    // Inject Breadcrumb (back link + full trail) under the category header
    try {
      const categoryUrlMap = new Map([
        ["Buy Bitcoin", "/buy-bitcoin.html"],
        ["Spend Bitcoin", "/spend-bitcoin.html"],
        ["Store it safely", "/store-it-safely.html"],
        ["Run my own node", "/run-my-own-node.html"],
        ["Accept Bitcoin as a merchant", "/accept-bitcoin-as-a-merchant.html"],
      ]);
      const categoryName = svc.category || "Services";
      const categoryPath = categoryUrlMap.get(categoryName) || "/";
      const breadcrumbBack = `\n<div class=\"breadcrumb-back\"><a href=\"${categoryPath}\">< Back to ${categoryName}</a></div>`;
      const breadcrumbHtml = `\n<nav class=\"breadcrumbs\" aria-label=\"Breadcrumb\">\n  <ol>\n    <li><a href=\"/\">Home</a></li>\n    <li><a href=\"${categoryPath}\">${categoryName}</a></li>\n    <li><span aria-current=\"page\">${svc.name}</span></li>\n  </ol>\n</nav>`;
      html = html.replace(/<div class=\"category-header(?: [^\"]+)?\">[\s\S]*?<\/div>/i, (m) => `${m}${breadcrumbBack}${breadcrumbHtml}`);
    } catch (_) {
      // fail-safe: skip breadcrumb injection on error
    }

    // Keep existing container markup (your JS will populate it)
    // Make sure service.html has:
    // <!-- BUILD:START --> ... #comparison-container ... <!-- BUILD:END -->
    try {
      const tableHtml = await renderTableHTML(svc, svc.category);

      const defaultOrder = ["setup", "fees", "privacy", "interop", "migration"];
      const order = Array.isArray(svc.section_order) && svc.section_order.length
        ? svc.section_order.filter((key) => defaultOrder.includes(key))
        : defaultOrder;

      const sectionBlocks = [];

      const renderSetup = () => {
        const howto = svc.howto;
        if (!howto || !Array.isArray(howto.steps) || howto.steps.length === 0) return "";
        const steps = howto.steps.map((step) => {
          const title = step.title ? `<h3>${step.title}</h3>` : "";
          let image = "";
          if (step.image && typeof step.image === "string" && step.image.trim()) {
            image = `<img src="${step.image}" alt="${step.alt || ""}">`;
          }
          const text = step.text ? `<p>${step.text}</p>` : "";
          return `<li>${title}${image}${text}</li>`;
        }).join("");
        return `
<section id="setup" class="service-section">
  <h2 class="feature-label">Getting started</h2>
  <div class="feature-value">
    <ol>${steps}</ol>
  </div>
</section>`;
      };

      const renderFees = () => {
        const scenarios = Array.isArray(svc.fees_scenarios) ? svc.fees_scenarios : [];
        if (!scenarios.length) return "";
        const rows = scenarios.map((row) => {
          const scenario = row.scenario || "";
          const cost = row.expected_range || "";
          const notes = row.notes || "";
          return `<tr><td>${scenario}</td><td>${cost}</td><td>${notes}</td></tr>`;
        }).join("");
        return `
<section id="fees" class="service-section">
  <h2 class="feature-label">Fees</h2>
  <div class="feature-value">
    <table>
      <thead>
        <tr>
          <th>Scenario</th>
          <th>What you pay</th>
          <th>Notes</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>
</section>`;
      };

      const renderPrivacy = () => {
        const notes = svc.privacy_notes || {};
        const bullets = [];
        const addList = (items) => {
          if (!Array.isArray(items)) return;
          for (const item of items) {
            if (item) bullets.push(`<li>${item}</li>`);
          }
        };
        addList(notes.data_flows);
        addList(notes.backups);
        addList(notes.recovery_drill);
        addList(notes.own_node);
        if (!bullets.length) return "";
        return `
<section id="privacy" class="service-section">
  <h2 class="feature-label">Privacy &amp; Recovery</h2>
  <div class="feature-value">
    <ul>${bullets.join("")}</ul>
  </div>
</section>`;
      };

      const renderInterop = () => {
        const interop = svc.interop || {};
        const checklist = [];
        const advancedRows = [];

        const pushChecklist = (label, value) => {
          if (!value) return;
          checklist.push(`<li>${label} â€” ${value}</li>`);
        };

        if (interop.basic) {
          const basicItems = Array.isArray(interop.basic) ? interop.basic : [];
          for (const item of basicItems) {
            if (item && item.label && item.value) {
              pushChecklist(item.label, item.value);
            }
          }
        }

        const addRow = (feature, status, notes) => {
          advancedRows.push(`<tr><td>${feature}</td><td>${status || ""}</td><td>${notes || ""}</td></tr>`);
        };

        if (interop.matrix) {
          const matrixItems = Array.isArray(interop.matrix) ? interop.matrix : [];
          for (const item of matrixItems) {
            if (!item || !item.feature) continue;
            addRow(item.feature, item.status, item.notes);
          }
        }

        const hasData = checklist.length || advancedRows.length;
        const hasInteropNeedsReview = Array.isArray(svc.needs_review) && svc.needs_review.some((key) => key.startsWith("interop"));

        if (!hasData && !hasInteropNeedsReview) return "";

        const checklistHtml = checklist.length ? `<ul>${checklist.join("")}</ul>` : "";
        const advancedHtml = advancedRows.length ? `
    <details>
      <summary>Advanced</summary>
      <table>
        <thead>
          <tr>
            <th>Feature</th>
            <th>Status</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>${advancedRows.join("")}</tbody>
      </table>
    </details>` : "";
        const needsReviewComment = hasInteropNeedsReview ? "\n    <!-- TODO: needs_review: interop -->" : "";

        return `
<section id="interop" class="service-section">
  <h2 class="feature-label">Interoperability</h2>
  <div class="feature-value">
    ${checklistHtml || advancedHtml ? `${checklistHtml}${advancedHtml}` : ""}${needsReviewComment}
  </div>
</section>`;
      };

      const renderMigration = () => {
        const migration = svc.migration || {};
        const fromItems = Array.isArray(migration.from) ? migration.from : [];
        const toItems = Array.isArray(migration.to) ? migration.to : [];
        const flows = [];

        if (fromItems.length) {
          const first = fromItems[0];
          const steps = Array.isArray(first.steps) ? first.steps : [];
        const sourceLabel = first.source || "Another wallet";
        flows.push(`
    <div>
      <h3>From ${sourceLabel} â†’ ${svc.name}</h3>
      <ol>${steps.map(step => `<li>${step}</li>`).join("")}</ol>
    </div>`);
        }

        if (toItems.length) {
          const first = toItems[0];
          const steps = Array.isArray(first.steps) ? first.steps : [];
          const targetLabel = first.target || "Another wallet";
          flows.push(`
    <div>
      <h3>From ${svc.name} â†’ ${targetLabel}</h3>
      <ol>${steps.map(step => `<li>${step}</li>`).join("")}</ol>
    </div>`);
        }

        if (!flows.length) return "";
        return `
<section id="migration" class="service-section">
  <h2 class="feature-label">Migration</h2>
  <div class="feature-value">
    ${flows.join("\n")}
  </div>
</section>`;
      };

      const renderers = {
        setup: renderSetup,
        fees: renderFees,
        privacy: renderPrivacy,
        interop: renderInterop,
        migration: renderMigration,
      };

      for (const key of order) {
        const renderer = renderers[key];
        if (!renderer) continue;
        const block = renderer();
        if (block) sectionBlocks.push(block);
      }

      const sectionsHtml = sectionBlocks.length
        ? `<div class="comparison-table">
${sectionBlocks.join("\n")}
</div>`
        : "";

      const bakedBlock = `
<div id="comparison-container">
  <div class="logo-row-sticky">
    <div class="feature-values logo-row" id="logo-row-container"></div>
  </div>
  <div id="comparison-table-wrapper">
    ${tableHtml}
  </div>
</div>
${sectionsHtml}`;

      const { before, after } = between(html, "<!-- BUILD:START -->", "<!-- BUILD:END -->");
      html = `${before}\n${bakedBlock}\n${after}`;
    } catch (e) {
      // If BUILD markers are missing or renderer failed, keep the page unchanged.
    }

    // OPTIONAL: add JSON-LD for page (enriched)
    const ORG_ID = "https://buoybitcoin.com/#organization";
    const WEBSITE_ID = "https://buoybitcoin.com/#website";
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": url + "#webpage",
      "name": title,
      "url": url,
      "inLanguage": "en",
      "description": desc,
      "isPartOf": { "@id": WEBSITE_ID },
      "publisher": { "@id": ORG_ID },
      "primaryImageOfPage": {
        "@type": "ImageObject",
        "url": "https://buoybitcoin.com/android-chrome-512x512.png",
        "width": 512,
        "height": 512
      },
      "mainEntity": { "@id": url + "#service" }
    };
    html = html.replace("</head>", `<script type=\"application/ld+json\">${JSON.stringify(jsonLd)}</script></head>`);

    // Define the Service as its own node with our @id and point back to this page's WebPage
    const serviceJson = {
      "@context": "https://schema.org",
      "@type": "Service",
      "@id": url + "#service",
      "name": svc.name,
      "url": svc.website || url,
      "mainEntityOfPage": url + "#webpage",
      "provider": {
        "@type": "Organization",
        "name": svc.name,
        "url": svc.website || url
      }
    };
    html = html.replace("</head>", `<script type=\"application/ld+json\">${JSON.stringify(serviceJson)}</script></head>`);

    // Inject Organization and WebSite JSON-LD so references by @id resolve on this page
    const orgJson = {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": ORG_ID,
      "name": "Buoy Bitcoin",
      "url": "https://buoybitcoin.com/",
      "logo": { "@type": "ImageObject", "url": "https://buoybitcoin.com/android-chrome-512x512.png", "width": 512, "height": 512 },
      "sameAs": [
        "https://x.com/jaspervanderee",
        "https://github.com/jaspervanderee/buoy"
      ]
    };
    const siteJson = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": WEBSITE_ID,
      "url": "https://buoybitcoin.com/",
      "name": "Buoy Bitcoin",
      "inLanguage": "en",
      "potentialAction": {
        "@type": "SearchAction",
        "target": "https://buoybitcoin.com/search.html?q={search_term_string}",
        "query-input": "required name=search_term_string"
      }
    };
    html = html.replace("</head>", `<script type=\"application/ld+json\">${JSON.stringify(orgJson)}</script>\n<script type=\"application/ld+json\">${JSON.stringify(siteJson)}</script></head>`);

    // Add BreadcrumbList JSON-LD
    const categoryUrlMap = new Map([
      ["Buy Bitcoin", "https://buoybitcoin.com/buy-bitcoin.html"],
      ["Spend Bitcoin", "https://buoybitcoin.com/spend-bitcoin.html"],
      ["Store it safely", "https://buoybitcoin.com/store-it-safely.html"],
      ["Run my own node", "https://buoybitcoin.com/run-my-own-node.html"],
      ["Accept Bitcoin as a merchant", "https://buoybitcoin.com/accept-bitcoin-as-a-merchant.html"]
    ]);
    const categoryName = svc.category || "Services";
    const categoryUrl = categoryUrlMap.get(categoryName) || "https://buoybitcoin.com/";
    const breadcrumbs = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://buoybitcoin.com/" },
        { "@type": "ListItem", "position": 2, "name": categoryName, "item": categoryUrl },
        { "@type": "ListItem", "position": 3, "name": svc.name, "item": url }
      ]
    };
    html = html.replace("</head>", `<script type=\"application/ld+json\">${JSON.stringify(breadcrumbs)}</script></head>`);

    // Inject FAQ block (HTML + JSON-LD) right after baked table and before alternatives
    try {
      const svcForFaq = Array.isArray(svc.faq)
        ? { ...svc, faq: svc.faq.slice(0, 5) }
        : svc;
      const faqHtml = renderFAQBlock(svcForFaq);
      const faqJson = renderFAQJsonLD(svcForFaq);
      const faqBundle = faqHtml ? `${faqHtml}\n${faqJson}` : '';
      html = html.replace("<!-- FAQ_BLOCK -->", faqBundle);
    } catch (e) {
      // fail-safe: skip FAQ injection on error
    }

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