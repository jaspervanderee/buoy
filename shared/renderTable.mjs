/* eslint-env node */
// shared/renderTable.mjs
// Exports: renderTableHTML(service, category)
// Returns a root-absolute-asset, table-based markup that mirrors compare.js rows/labels.

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

async function loadCountryNames() {
  try {
    const p = path.join(ROOT, "data", "countries.json");
    const raw = await fs.readFile(p, "utf8");
    const list = JSON.parse(raw);
    const map = {};
    for (const c of list) map[c.code] = c.name;
    return map;
  } catch {
    return {}; // fail-safe
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getLogoFilename(name) {
  return `/images/${name.toLowerCase().replace(/\s+/g, '-')}.svg`;
}

function renderAppRatings(rating) {
  if (!rating) return "N/A";
  if (rating.text) return escapeHtml(rating.text);
  const ios = rating.ios ?? "N/A";
  const android = rating.android ?? "N/A";
  return `<div>iOS: ${ios}</div><div>Android: ${android}</div>`;
}

function renderInterface(val) {
  if (!val) return "N/A";
  const lower = String(val).toLowerCase();
  let iconSrc = "";
  let altText = "";
  if (lower.includes("mobile & desktop")) {
    iconSrc = "/images/mobile-desktop.svg";
    altText = "Mobile & Desktop";
  } else if (lower.includes("mobile")) {
    iconSrc = "/images/mobile.svg";
    altText = "Mobile";
  } else if (lower.includes("desktop")) {
    iconSrc = "/images/desktop.svg";
    altText = "Desktop";
  }
  if (iconSrc) {
    return `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%"><img src="${iconSrc}" class="platform-icon" alt="${escapeHtml(altText)}" style="margin-bottom:8px"/><span>${escapeHtml(val)}</span></div>`;
  }
  return `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%"><span>${escapeHtml(val)}</span></div>`;
}

function renderFounderProfile(val) {
  if (!val) return "N/A";
  const filename = val.toLowerCase().replace(/\s+/g, "-") + ".jpg";
  return `<img src="/images/founders/${filename}" alt="${escapeHtml(val)}" style="width:100px;height:100px;border-radius:50%;display:block;margin:0 auto 10px auto"><div style="text-align:center">${escapeHtml(val)}</div>`;
}

function renderCollapsibleDescription(description) {
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
      <div class="description-full" style="display:none">${fullText}</div>
      <button class="expand-btn" aria-expanded="false">
        <span class="expand-text">Read more</span>
        <span class="expand-icon"><span class="arrow-down">↓</span></span>
      </button>
    </div>
  `;
}

function renderFeaturesWW(service) {
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

function renderFees(fees) {
  if (!fees) return "N/A";
  if (typeof fees === "string") {
    return `<div class="fee-structure">${escapeHtml(fees)}</div>`;
  }
  if (typeof fees === "object" && !fees.tiers && fees.intro) {
    return `<div class="fee-structure"><div class="fee-intro">${fees.intro}</div></div>`;
  }
  if (typeof fees === "object" && fees.tiers) {
    let html = `<div class="fee-structure">`;
    if (fees.intro) {
      html += `<div class="fee-intro">${fees.intro}</div>`;
    }
    fees.tiers.forEach(tier => {
      html += `<div class="fee-tier">${escapeHtml(tier.range)}: <strong>${escapeHtml(tier.fee)}</strong></div>`;
    });
    if (fees.notes) {
      html += `<p><em>${escapeHtml(fees.notes)}</em></p>`;
    }
    html += `</div>`;
    return html;
  }
  return `<div class="fee-structure">Not available</div>`;
}

async function renderAvailability(service) {
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

function labelHtmlFor(feature) {
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

function userExperienceHtml(service) {
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

export async function renderTableHTML(service, category, options = {}) {
  // Options API:
  // - mode: "service" | "compare" (default "compare")
  // - includeRows: string[] (explicit whitelist)
  // - excludeRows: string[] (explicit blacklist)
  const mode = options.mode || "compare";
  const includeRows = options.includeRows;
  const excludeRows = options.excludeRows;
  
  // Service-level override: if service.spec_rows is present, treat it as includeRows
  const serviceSpecRows = Array.isArray(service.spec_rows) && service.spec_rows.length > 0
    ? service.spec_rows
    : null;
  
  // Default exclusions for service pages
  const serviceExclusions = ["type_of_platform", "supported_network", "features"];
  
  const features = [
    { key: "type_of_platform", label: "Platform" },
    { key: "supported_network", label: "Supported Networks" },
    { key: "features", label: "Features", render: () => renderFeaturesWW(service) },
    { key: "price", label: "Price" },
    { key: "fees", label: { main: "Fees", sub: "Processing fees" }, render: (val) => renderFees(val) },
    { key: "subscription_fees", label: "Subscription Fees" },
    { key: "conversion_fees", label: "Conversion Fees" },
    { key: "settlement_time", label: "Settlement Time" },
    { key: "dca", label: "DCA (Dollar Cost Averaging)" },
    { key: "payment_methods", label: "Payment Methods", render: (val) => Array.isArray(val) ? val.join(", ") : (val || "Not available") },
    { key: "compatibility", label: "Integration & Compatibility" },
    { key: "pos_compatibility", label: "POS integration" },
    { key: "custody_control", label: "Custody & Control" },
    { key: "kyc_required", label: "KYC Required" },
    { key: "recovery_method", label: "Recovery Method" },
    { key: "node_connect", label: "Does it connect to your own node?" },
    { key: "open_source", label: "Open Source" },
    { key: "user_experience", label: "User Experience", render: () => userExperienceHtml(service) },
    { key: "interface", label: "Interface", render: (val) => renderInterface(val) },
    { key: "app_ratings", label: "App Ratings", render: (val) => renderAppRatings(val) },
    { key: "support", label: "Support" },
    { key: "profile", label: { main: "Profile", sub: "Founder(s)" }, render: (val) => renderFounderProfile(val) },
    { key: "description", label: "Company description", render: (val) => renderCollapsibleDescription(val) },
    { key: "founded_in", label: "Founded in" },
    { key: "website", label: "Website", render: (val) => val ? `<a href="${val}" target="_blank">${escapeHtml(String(val).replace(/https?:\/\/(www\.)?/, ""))}</a>` : "N/A" },
    { key: "availability", label: "Availability", render: async () => await renderAvailability(service) },
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

  let allowedKeys = categoryFeaturesMap[category] || features.map(f => f.key);
  
  // Apply filtering logic based on mode and options
  // Priority: serviceSpecRows > includeRows > excludeRows > mode defaults
  if (serviceSpecRows) {
    // Service-level override: only include specified rows
    allowedKeys = allowedKeys.filter(k => serviceSpecRows.includes(k));
  } else if (includeRows) {
    // Explicit include list from options
    allowedKeys = allowedKeys.filter(k => includeRows.includes(k));
  } else if (excludeRows) {
    // Explicit exclude list from options
    allowedKeys = allowedKeys.filter(k => !excludeRows.includes(k));
  } else if (mode === "service") {
    // Default service mode: exclude the three specified rows
    allowedKeys = allowedKeys.filter(k => !serviceExclusions.includes(k));
  }
  // mode === "compare" with no overrides: use all allowedKeys as-is
  const rows = [];
  for (const key of allowedKeys) {
    const feature = features.find(f => f.key === key);
    if (!feature) continue;
    const labelCell = labelHtmlFor(feature);
    let valueHtml = "";
    if (feature.key === 'availability') {
      valueHtml = await feature.render();
    } else if (feature.key === 'features' || feature.key === 'user_experience') {
      valueHtml = feature.render();
    } else {
      const raw = feature.key === 'interface' || feature.key === 'app_ratings' || feature.key === 'profile' || feature.key === 'description' || feature.key === 'website'
        ? service[feature.key]
        : service[feature.key];
      valueHtml = feature.render ? feature.render(raw) : (raw === undefined || raw === null || raw === "" ? "" : escapeHtml(raw));
    }
    const anchorId = typeof feature.label === 'object' && feature.label.main ? feature.label.main.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : '';
    const trId = anchorId ? ` id="${anchorId}"` : '';
    const svcKey = escapeHtml(String(service.name || '').toLowerCase());
    rows.push(`
      <tr class="feature-row ${feature.key}"${trId}>
        <td>${labelCell}</td>
        <td>
          <div class="feature-values">
            <div class="feature-value" data-service="${svcKey}">${valueHtml}</div>
          </div>
        </td>
      </tr>
    `);
  }

  return `
    <table class="comparison-table"><tbody>
      ${rows.join("\n")} 
    </tbody></table>
  `;
}


