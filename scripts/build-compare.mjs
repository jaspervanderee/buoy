/* eslint-env node */
/* eslint-disable no-useless-escape */
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { ensureRobotsMeta } from "./lib/head.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA = path.join(ROOT, "data", "services.json");
const OUT_REDIRECTS = path.join(ROOT, "generated-compare-redirects.htaccess");
const VERDICTS_PATH = path.join(ROOT, "data", "verdicts.json");
let VERDICTS = {};
const FAQS_PATH = path.join(ROOT, "data", "faqs.json");
let FAQS = {};
const SELF_PATH = path.join(__dirname, "build-compare.mjs");
const COUNTRIES_PATH = path.join(ROOT, "data", "countries.json");
let COUNTRY_NAME_MAP = null;

// Known category hubs used for breadcrumb linking (if present)
const CATEGORY_HUBS = {
  "Buy Bitcoin": "/buy-bitcoin.html",
  "Spend Bitcoin": "/spend-bitcoin.html",
  "Store it safely": "/store-it-safely.html",
  "Run my own node": "/run-my-own-node.html",
  "Accept Bitcoin as a merchant": "/accept-bitcoin-as-a-merchant.html"
};

// Absolute origin for building canonical asset URLs
const SITE_ORIGIN = "https://buoybitcoin.com/";

function toAbsoluteUrl(input) {
  const url = String(input || "").trim();
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/")) return `${SITE_ORIGIN}${url}`;
  // Treat bare domains/paths as HTTPS
  return `https://${url}`;
}

function toAbsolutePath(pathOrUrl) {
  if (!pathOrUrl) return undefined;
  const s = String(pathOrUrl);
  return toAbsoluteUrl(s.startsWith("/") ? s : `/${s}`);
}

function buildBuoyPublisher() {
  // Use apple-touch-icon as compact square logo
  const logo = {
    "@type": "ImageObject",
    url: `${SITE_ORIGIN}/apple-touch-icon.png`,
    width: 112,
    height: 112
  };
  // High-quality, verified profiles surfaced in the UI/footer
  const sameAsRaw = [
    "https://x.com/jaspervanderee",
    "https://github.com/jaspervanderee/buoy",
    "https://snort.social/p/npub165w944kqt29hrt90l2ssc0rvmhf0u77dgezskknfnczr7r030v0s2g6kae"
  ];
  const seen = new Set();
  const sameAs = sameAsRaw
    .map(toAbsoluteUrl)
    .filter(u => !!u && !seen.has(u) && seen.add(u))
    .slice(0, 6);
  return {
    "@type": "Organization",
    name: "Buoy Bitcoin",
    url: SITE_ORIGIN,
    logo,
    sameAs: sameAs.length ? sameAs : undefined
  };
}

function buildServiceOrganizationJsonLd(service) {
  if (!service || !service.name) return null;
  const name = service.name;
  const url = toAbsoluteUrl(service.website);
  // Prefer explicit logo field when present; otherwise fall back to our known asset path
  const logoPath = service.logo ? (String(service.logo).startsWith("/") ? service.logo : `/${service.logo}`) : getLogoFilename(name);
  const logoUrl = toAbsolutePath(logoPath);

  // Collect optional profile links from known keys if present in services.json
  const candidateKeys = [
    "twitter", "x", "github", "wikipedia", "wikidata", "linkedin", "facebook",
    "instagram", "youtube", "app_store", "play_store", "docs", "nostr", "mastodon", "sameAs"
  ];
  const rawLinks = [];
  for (const key of candidateKeys) {
    const v = service[key];
    if (!v) continue;
    if (Array.isArray(v)) rawLinks.push(...v);
    else rawLinks.push(v);
  }
  // Deduplicate and limit to 6
  const seen = new Set();
  const sameAs = rawLinks
    .map(toAbsoluteUrl)
    .filter(u => !!u && (!url || u !== url))
    .filter(u => !seen.has(u) && seen.add(u))
    .slice(0, 6);

  const org = {
    "@type": "Organization",
    name
  };
  if (url) org.url = url;
  if (logoUrl) org.logo = { "@type": "ImageObject", url: logoUrl };
  if (sameAs.length) org.sameAs = sameAs;
  return org;
}

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

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function loadCountryNames() {
  if (COUNTRY_NAME_MAP) return COUNTRY_NAME_MAP;
  try {
    const raw = await fs.readFile(COUNTRIES_PATH, "utf8");
    const list = JSON.parse(raw);
    const map = {};
    for (const c of list) map[c.code] = c.name;
    COUNTRY_NAME_MAP = map;
    return COUNTRY_NAME_MAP;
  } catch (_e) {
    COUNTRY_NAME_MAP = {};
    return COUNTRY_NAME_MAP;
  }
}

function getLogoFilename(name) {
  return `/images/${String(name || "").toLowerCase().replace(/\s+/g, '-')}.svg`;
}

function renderAppRatingsCell(val) {
  if (!val) return "N/A";
  if (val.text) return escapeHtml(val.text);
  const ios = val.ios ?? "N/A";
  const android = val.android ?? "N/A";
  return `<div>iOS: ${ios}</div><div>Android: ${android}</div>`;
}

function renderInterfaceCell(val) {
  if (!val) return "N/A";
  const lower = String(val).toLowerCase();
  let iconSrc = "";
  let altText = "";
  if (lower.includes("mobile & desktop")) { iconSrc = "/images/mobile-desktop.svg"; altText = "Mobile & Desktop"; }
  else if (lower.includes("mobile")) { iconSrc = "/images/mobile.svg"; altText = "Mobile"; }
  else if (lower.includes("desktop")) { iconSrc = "/images/desktop.svg"; altText = "Desktop"; }
  if (iconSrc) {
    return `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%"><img src="${iconSrc}" class="platform-icon" alt="${escapeHtml(altText)}" style="margin-bottom:8px"/><span>${escapeHtml(val)}</span></div>`;
  }
  return `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%"><span>${escapeHtml(val)}</span></div>`;
}

function renderFounderProfileCell(val) {
  if (!val) return "N/A";
  const filename = String(val).toLowerCase().replace(/\s+/g, "-") + ".jpg";
  return `<img src="/images/founders/${filename}" alt="${escapeHtml(val)}" style="width:100px;height:100px;border-radius:50%;display:block;margin:0 auto 10px auto"><div style="text-align:center">${escapeHtml(val)}</div>`;
}

function renderCollapsibleDescriptionCell(description) {
  if (!description) return "";
  const normalized = String(description).replace(/\\n\\n/g, "\n\n");
  const paragraphs = normalized.split("\n\n");
  const fullText = paragraphs.map(p => `<p>${escapeHtml(p)}</p>`).join("");
  if (normalized.length < 200) return fullText;
  const mobilePreviewText = paragraphs[0].length > 200 ? paragraphs[0].substring(0, 200) + "..." : paragraphs[0];
  const desktopPreviewText = paragraphs[0];
  return `
    <div class="collapsible-description">
      <div class="description-preview">
        <p class="mobile-preview">${escapeHtml(mobilePreviewText)}</p>
        <p class="desktop-preview">${escapeHtml(desktopPreviewText)}</p>
      </div>
      <div class="description-full" style="display: none;">${fullText}</div>
      <button class="expand-btn" aria-expanded="false">
        <span class="expand-text">Read more</span>
        <span class="expand-icon"><span class="arrow-down">↓</span></span>
      </button>
    </div>
  `;
}

function renderFeaturesWWCell(service) {
  const list = (service && service.features && (service.features.WW || [])) || [];
  if (!Array.isArray(list) || list.length === 0) {
    return `<div class="feature-item"><img src="/images/cross.svg" alt="Cross" class="checkmark-icon"/> No specific features available</div>`;
  }
  return list.map((f, idx) => {
    const positive = f && f.status === 'positive';
    const icon = positive ? 'checkmark.svg' : 'cross.svg';
    let extraClass = '';
    if (!positive && (idx === 0 || (list[idx - 1] && list[idx - 1].status === 'positive'))) {
      extraClass = ' negative-group-start';
    }
    return `<div class="feature-item${extraClass}"><img src="/images/${icon}" alt="${positive ? 'positive' : 'negative'} icon" class="checkmark-icon"/> ${escapeHtml(f.text || '')}</div>`;
  }).join("");
}

// Build Product JSON-LD with positiveNotes/negativeNotes from visible Features bullets
function sanitizeBulletText(text) {
  const s = String(text || "").replace(/\s+/g, " ").trim();
  return s.length > 160 ? s.slice(0, 160) : s;
}

function buildProductJsonLd(service, categoryLabel) {
  if (!service || !service.name) return null;
  const ww = (service.features && service.features.WW) || [];

  function toItemList(wantPositive) {
    const seen = new Set();
    const items = [];
    for (const feature of ww) {
      if (!feature) continue;
      const isPositive = feature.status === 'positive';
      if (wantPositive ? !isPositive : isPositive) continue;
      const clean = sanitizeBulletText(feature.text);
      if (!clean) continue;
      const key = clean.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      items.push(clean);
      if (items.length === 6) break; // cap at 6 items
    }
    if (items.length === 0) return null;
    return {
      "@type": "ItemList",
      itemListElement: items.map((name, index) => ({ "@type": "ListItem", position: index + 1, name }))
    };
  }

  const product = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: service.name,
    brand: { "@type": "Brand", name: service.name },
    category: categoryLabel
  };
  const pos = toItemList(true);
  const neg = toItemList(false);
  if (pos) product.positiveNotes = pos;
  if (neg) product.negativeNotes = neg;
  return product;
}

function renderFeesCell(fees) {
  if (!fees) return "N/A";
  if (typeof fees === "string") {
    return `<div class="fee-structure">${escapeHtml(fees)}</div>`;
  }
  if (typeof fees === "object" && !fees.tiers && fees.intro) {
    return `<div class="fee-structure"><div class="fee-intro">${fees.intro}</div></div>`;
  }
  if (typeof fees === "object" && fees.tiers) {
    let html = `<div class="fee-structure">`;
    if (fees.intro) html += `<div class="fee-intro">${fees.intro}</div>`;
    fees.tiers.forEach(tier => { html += `<div class="fee-tier">${escapeHtml(tier.range)}: <strong>${escapeHtml(tier.fee)}</strong></div>`; });
    if (fees.notes) html += `<p><em>${escapeHtml(fees.notes)}</em></p>`;
    html += `</div>`;
    return html;
  }
  return `<div class="fee-structure">Not available</div>`;
}

async function renderAvailabilityCell(service) {
  if (!service || !Array.isArray(service.countries) || service.countries.length === 0) return "Availability unknown";
  if (service.countries.includes("WW")) {
    return `<div class="availability-container"><img src="/images/global.svg" alt="Availability" class="availability-icon"/><span>Available globally</span></div>`;
  }
  const regionNames = { NA: "North America", SA: "South America", EU: "Europe", AF: "Africa", AS: "Asia", OC: "Oceania" };
  const countryNames = await loadCountryNames();
  const regions = [];
  const countries = [];
  for (const code of service.countries) {
    if (regionNames[code]) regions.push(regionNames[code]);
    else if (countryNames[code]) countries.push(countryNames[code]);
    else countries.push(code);
  }
  const availability = [...countries, ...regions].join(", ");
  const singleCountry = service.countries.length === 1 && !regionNames[service.countries[0]];
  const flagImage = singleCountry
    ? `<span class="flag-icon flag-icon-${service.countries[0].toLowerCase()} availability-icon"></span>`
    : `<img src="/images/global.svg" alt="Availability" class="availability-icon"/>`;
  return `<div class="availability-container">${flagImage}<span>Available in ${escapeHtml(availability)}</span></div>`;
}

function featureLabelHtml(feature) {
  if (typeof feature.label === 'object' && feature.label.main && feature.label.sub) {
    return `
      <div class="label-container">
        <div class="feature-label">${escapeHtml(feature.label.main)}</div>
        <div class="feature-label sublabel">${escapeHtml(feature.label.sub)}</div>
      </div>
    `;
  }
  const key = feature.key;
  const needsSub = ['features','supported_network','price','subscription_fees','conversion_fees','settlement_time','kyc_required','recovery_method','open_source','node_connect','dca','pos_compatibility','interface','app_ratings','support','founded_in','website','description'].includes(key);
  return `<div class="feature-label${needsSub ? ' sublabel' : ''}">${escapeHtml(feature.label)}</div>`;
}

function userExperienceCell(service) {
  const raw = service && service.user_experience;
  const parsed = parseFloat(raw);
  const rating = isNaN(parsed) ? null : parsed;
  if (rating === null) return "N/A";
  const svcName = String(service.name || '').toLowerCase();
  return `
    <div class="ux-container">
      <div class="ux-rating-wrapper">
        <span class="ux-rating">${rating.toFixed(1)}</span><span class="ux-outof"> out of 5</span>
      </div>
      <a href="#" class="review-link" data-service="${svcName}">rate <span class="rating-count">(0)</span></a>
    </div>
  `;
}

async function renderCompareTableHTML(a, b, category) {
  // Generate stable, de-duplicated kebab-case ids for each feature row
  const usedRowIds = new Set();
  const normalizeId = (input) => String(input || "")
    .toLowerCase()
    .trim()
    .replace(/[ _]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  const uniqueId = (base) => {
    let id = base || "section";
    let attempt = id;
    let n = 2;
    while (usedRowIds.has(attempt)) {
      attempt = `${id}-${n++}`;
    }
    usedRowIds.add(attempt);
    return attempt;
  };
  const features = [
    { key: "type_of_platform", label: "Platform" },
    { key: "supported_network", label: "Supported Networks" },
    { key: "features", label: "Features" },
    { key: "price", label: "Price" },
    { key: "fees", label: { main: "Fees", sub: "Processing fees" } },
    { key: "subscription_fees", label: "Subscription Fees" },
    { key: "conversion_fees", label: "Conversion Fees" },
    { key: "settlement_time", label: "Settlement Time" },
    { key: "dca", label: "DCA (Dollar Cost Averaging)" },
    { key: "payment_methods", label: "Payment Methods" },
    { key: "compatibility", label: "Integration & Compatibility" },
    { key: "pos_compatibility", label: "POS integration" },
    { key: "custody_control", label: "Custody & Control" },
    { key: "kyc_required", label: "KYC Required" },
    { key: "recovery_method", label: "Recovery Method" },
    { key: "node_connect", label: "Does it connect to your own node?" },
    { key: "open_source", label: "Open Source" },
    { key: "user_experience", label: "User Experience" },
    { key: "interface", label: "Interface" },
    { key: "app_ratings", label: "App Ratings" },
    { key: "support", label: "Support" },
    { key: "profile", label: { main: "Profile", sub: "Founder(s)" } },
    { key: "description", label: "Company description" },
    { key: "founded_in", label: "Founded in" },
    { key: "website", label: "Website" },
    { key: "availability", label: "Availability" }
  ];

  const categoryFeaturesMap = {
    "Buy Bitcoin": [
      "type_of_platform", "features", "fees", "dca", "payment_methods", "custody_control", "kyc_required", "open_source", "user_experience", "interface", "app_ratings", "profile", "description", "founded_in", "website", "availability"
    ],
    "Spend Bitcoin": [
      "type_of_platform", "supported_network", "features", "custody_control", "kyc_required", "recovery_method", "open_source", "user_experience", "interface", "app_ratings", "profile", "description", "founded_in", "website", "availability"
    ],
    "Store it safely": [
      "type_of_platform", "supported_network", "features", "price", "custody_control", "recovery_method", "open_source", "node_connect", "user_experience", "interface", "app_ratings", "profile", "description", "founded_in", "website", "availability"
    ],
    "Run my own node": [
      "type_of_platform", "features", "price", "user_experience", "interface", "support", "profile", "description", "founded_in", "website", "availability"
    ],
    "Accept Bitcoin as a merchant": [
      "type_of_platform", "supported_network", "features", "fees", "subscription_fees", "conversion_fees", "settlement_time", "compatibility", "pos_compatibility", "custody_control", "kyc_required", "open_source", "user_experience", "profile", "description", "founded_in", "website", "availability"
    ]
  };

  const allowedKeys = categoryFeaturesMap[category] || features.map(f => f.key);
  const rows = [];
  for (const key of allowedKeys) {
    const feature = features.find(f => f.key === key);
    if (!feature) continue;
    const labelCell = featureLabelHtml(feature);
    const leftSvcKey = escapeHtml(String(a.name || '').toLowerCase());
    const rightSvcKey = escapeHtml(String(b.name || '').toLowerCase());

    async function valueFor(service) {
      switch (feature.key) {
        case 'features':
          return renderFeaturesWWCell(service);
        case 'fees':
          return renderFeesCell(service.fees);
        case 'user_experience':
          return userExperienceCell(service);
        case 'interface':
          return renderInterfaceCell(service.interface);
        case 'app_ratings':
          return renderAppRatingsCell(service.app_ratings);
        case 'profile':
          return renderFounderProfileCell(service.profile);
        case 'description':
          return renderCollapsibleDescriptionCell(service.description);
        case 'website': {
          const v = service.website;
          return v ? `<a href="${v}" target="_blank">${escapeHtml(String(v).replace(/https?:\/\/(www\.)?/, ""))}</a>` : "N/A";
        }
        case 'availability':
          return await renderAvailabilityCell(service);
        default: {
          const v = service[feature.key];
          if (feature.key === 'payment_methods' && Array.isArray(v)) return escapeHtml(v.join(", "));
          return (v === undefined || v === null || v === "") ? "" : escapeHtml(String(v));
        }
      }
    }

    const leftVal = await valueFor(a);
    const rightVal = await valueFor(b);
    const baseId = normalizeId(feature.key);
    const rowId = uniqueId(baseId);
    rows.push(`
      <tr class="feature-row ${feature.key}" id="${rowId}" tabindex="-1">
        <th scope="row" class="feature-label">${labelCell}</th>
        <td>
          <div class="feature-values">
            <div class="feature-value" data-service="${leftSvcKey}">${leftVal}</div>
            <div class="feature-value" data-service="${rightSvcKey}">${rightVal}</div>
          </div>
        </td>
      </tr>
    `);
  }

  return `
    <table class="comparison-table"><caption class="sr-only">${escapeHtml(String(a.name))} vs ${escapeHtml(String(b.name))} — full comparison (${escapeHtml(String(category))})</caption><tbody>
      ${rows.join("\n")} 
    </tbody></table>
  `;
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

async function htmlForPair(a, b, categoryLabel, updated) {
  const aName = a.name;
  const bName = b.name;
  const title = `${aName} vs ${bName} — Which is better? | Buoy Bitcoin`;
  const desc = `Compare ${aName} and ${bName} (${categoryLabel}): fees, custody, features, and more.`;
  const canonicalPath = `/compare/${canonicalPairSlug(aName, bName)}.html`;
  const canonical = `https://buoybitcoin.com${canonicalPath}`;
  const categoryUrl = CATEGORY_HUBS[categoryLabel];
  const pairSlug = canonicalPairSlug(aName, bName);
  // URL mutation is now handled in client with deferred timing, controlled by body[data-url-mutate]

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
  // Compute final verdict text at build-time using same token mapping as client:
  // - {LEFT}/{RIGHT} map to visual order: aName (left) and bName (right)
  // - {A}/{B} map to alphabetical order of slugified names
  let verdictText = null;
  if (v && v.p) {
    const left = aName;
    const right = bName;
    const aSlug = slugify(left);
    const bSlug = slugify(right);
    const leftIsA = aSlug <= bSlug;
    const alphaAName = leftIsA ? left : right;
    const alphaBName = leftIsA ? right : left;
    verdictText = v.p
      .replaceAll('{LEFT}', left)
      .replaceAll('{RIGHT}', right)
      .replaceAll('{A}', alphaAName)
      .replaceAll('{B}', alphaBName);
  }

  // Build baked logo row
  const logoRowHtml = `
    <div class="feature-value logo-cell">
      <a href="${a.website || '#'}" target="_blank" class="service-link">
        <img src="${getLogoFilename(aName)}" alt="${escapeHtml(aName)} logo" class="svg-icon sticky-logo" />
        <button class="cta-button">visit</button>
      </a>
    </div>
    <div class="feature-value logo-cell">
      <a href="${b.website || '#'}" target="_blank" class="service-link">
        <img src="${getLogoFilename(bName)}" alt="${escapeHtml(bName)} logo" class="svg-icon sticky-logo" />
        <button class="cta-button">visit</button>
      </a>
    </div>`;

  // Build baked comparison table for the pair
  const tableHtml = await renderCompareTableHTML(a, b, categoryLabel);

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

  // Build Product JSON-LD blocks (one per service) using visible Features bullets
  const productLdA = buildProductJsonLd(a, categoryLabel);
  const productLdB = buildProductJsonLd(b, categoryLabel);

  // Build enriched Organization JSON-LD for the compared services and publisher
  const orgA = buildServiceOrganizationJsonLd(a);
  const orgB = buildServiceOrganizationJsonLd(b);
  const publisher = buildBuoyPublisher();

  let page = `<!DOCTYPE html>
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
  <meta name="twitter:card" content="summary_large_image"/>
  <meta name="twitter:title" content="${title}"/>
  <meta name="twitter:description" content="${desc}"/>
  <meta name="twitter:image" content="https://buoybitcoin.com/android-chrome-512x512.png"/>
  <meta name="twitter:site" content="@jaspervanderee"/>
  <link rel="stylesheet" href="/css/styles.css">
  <link href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=Ubuntu+Mono:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/flag-icon-css/3.5.0/css/flag-icon.min.css">
  <script defer src="https://feedback.fish/ff.js?pid=17f299e6843396" crossorigin="anonymous"></script>
  <script defer src="https://cloud.umami.is/script.js" data-website-id="0895676a-bb0e-488d-9381-a27cf9cf5888" data-domains="buoybitcoin.com,www.buoybitcoin.com"></script>
<script type="application/ld+json">${JSON.stringify({
    "@context":"https://schema.org",
    "@type":"WebPage",
    name: title,
    url: canonical,
    description: desc,
    dateModified: updated && updated.iso || undefined,
    publisher,
    about: [orgA, orgB].filter(Boolean)
  })}</script>
  <script type="application/ld+json">${JSON.stringify(breadcrumbLd)}</script>
  ${faqLd ? `<script type="application/ld+json">${JSON.stringify(faqLd)}</script>` : ""}
  ${productLdA ? `<script type="application/ld+json">${JSON.stringify(productLdA)}</script>` : ""}
  ${productLdB ? `<script type="application/ld+json">${JSON.stringify(productLdB)}</script>` : ""}
</head>
<body data-url-mutate="off">
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
    <div class="feature-values logo-row" id="logo-row-container">${logoRowHtml}</div>
  </div>
  <section id="vs-verdict" aria-live="polite"${verdictAttrs}>
    <h2 class="feature-label verdict-title">Quick take</h2>
    ${verdictText ? `<p class="vs-verdict-p">${escapeAttr(verdictText)}</p>` : ""}
  </section>
  <div id="comparison-table-wrapper">${tableHtml}</div>
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
  // Ensure single, rich robots meta for indexable compare pages
  page = ensureRobotsMeta(page, { indexable: true });
  return page;
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
        const html = await htmlForPair(a, b, cat, updated);
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
