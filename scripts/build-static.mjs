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

// Generate canonical compare page URL from two service names
const linkForPair = (a, b) => {
  const slugA = slugify(a);
  const slugB = slugify(b);
  // Sort alphabetically for canonical order
  const [first, second] = [slugA, slugB].sort();
  return `/compare/${first}-vs-${second}.html`;
};

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

// Replace the template heading with a single H1 for the service name
const setPageTitle = (html, title) =>
    html.replace(/<h1 id="page-title">[\s\S]*?<\/h1>/i, `<h1 id="page-title">${title}</h1>`);
  
  

const updatedFormatter = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" });

// Universal content detection helper
const hasContent = (value) => {
  if (value == null) return false;
  
  // String: check if non-empty after trim
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  
  // Array: check if at least one item has content
  if (Array.isArray(value)) {
    return value.some(item => hasContent(item));
  }
  
  // Object: check if at least one property has content
  if (typeof value === 'object') {
    return Object.values(value).some(prop => hasContent(prop));
  }
  
  return false;
};

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
    const title = `${svc.name} — Review, fees & features | Buoy Bitcoin`;
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


    // Update H1 (page title) → use service name
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

      const defaultOrder = ["tldr", "setup", "fees", "privacy", "compat", "migration"];
      const order = Array.isArray(svc.section_order) && svc.section_order.length
        ? svc.section_order.filter((key) => defaultOrder.includes(key))
        : defaultOrder;

      const sectionBlocks = [];

      const renderTrustChips = () => {
        const chips = Array.isArray(svc.trust_chips) ? svc.trust_chips.slice(0, 3) : [];
        if (!chips.length) return "";
        const chipItems = chips.map(chip => {
          if (!chip || !chip.text) return "";
          return `<div class="trust-chip">${chip.text}</div>`;
        }).filter(Boolean).join("");
        if (!chipItems) return "";
        return `<div class="trust-chips">${chipItems}</div>`;
      };

      const renderTlDr = () => {
        const tldr = svc.tl_dr;
        if (!tldr || typeof tldr !== "object") return "";
        const items = [];
        if (tldr.best_for) {
          items.push(`<p><img src="/images/checkmark.svg" alt="positive icon" class="checkmark-icon"/> <strong>Best for:</strong> ${tldr.best_for}</p>`);
        }
        if (tldr.consider_if) {
          items.push(`<p><strong>Consider if:</strong> ${tldr.consider_if}</p>`);
        }
        if (tldr.not_ideal_when) {
          items.push(`<p><img src="/images/cross.svg" alt="negative icon" class="checkmark-icon"/> <strong>Not ideal when:</strong> ${tldr.not_ideal_when}</p>`);
        }
        if (!items.length) return "";
        return `
<section id="tldr" class="service-section">
  <h2 class="feature-label">TL;DR</h2>
  <div class="feature-value">
    ${items.join("\n    ")}
  </div>
</section>`;
      };

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
        
        // Take first 3 scenarios with content, regardless of service name
        const validScenarios = scenarios
          .filter(s => s && (hasContent(s.scenario) || hasContent(s.expected_range) || hasContent(s.notes)))
          .slice(0, 3);
        
        if (!validScenarios.length) return "";

        const blocks = validScenarios.map((row, idx) => {
          const scenario = row.scenario || "";
          const cost = row.expected_range || "";
          const notes = row.notes || "";
          return `  <div class="feature-label sublabel">Scenario ${idx + 1}</div>
  <div class="feature-value">
    <h3>${scenario}</h3>
    <p><strong>${cost}</strong></p>
    <p>${notes}</p>
  </div>`;
        }).join("\n");

        return `
<section id="fees" class="service-section">
  <h2 class="feature-label">Fees</h2>
${blocks}
</section>`;
      };

      const renderPrivacy = () => {
        const notes = svc.privacy_notes || {};
        const labels = notes.labels || {};
        
        // Default labels
        const defaultLabels = {
          data_flows: "Data flows",
          recovery_drill: "Recovery drill",
          country: "Country caveats"
        };
        
        // Card A: Data flows only
        const dataFlowsItems = [];
        if (Array.isArray(notes.data_flows)) {
          dataFlowsItems.push(...notes.data_flows.filter(item => hasContent(item)));
        }
        
        // Card B: Recovery drill only
        const recoveryItems = [];
        if (Array.isArray(notes.recovery_drill)) {
          recoveryItems.push(...notes.recovery_drill.filter(item => hasContent(item)));
        }
        
        // Card C: Country caveats only
        const countryItems = [];
        if (Array.isArray(notes.country_caveats)) {
          countryItems.push(...notes.country_caveats.filter(item => hasContent(item)));
        }
        
        const cards = [];
        const renderedCards = [];
        
        // Render Data flows card only if it has content
        if (dataFlowsItems.length > 0) {
          const label = labels.data_flows || defaultLabels.data_flows;
          const bullets = dataFlowsItems.map(item => `<li>${item}</li>`).join("");
          cards.push(`  <div id="privacy-data">
    <div class="feature-label sublabel">${label}</div>
    <div class="feature-value">
      <ul>${bullets}</ul>
    </div>
  </div>`);
          renderedCards.push(`${label} (${dataFlowsItems.length} bullets)`);
        }
        
        // Render Recovery drill card only if it has content
        if (recoveryItems.length > 0) {
          const label = labels.recovery_drill || defaultLabels.recovery_drill;
          const bullets = recoveryItems.map(item => `<li>${item}</li>`).join("");
          cards.push(`  <div id="privacy-recovery">
    <div class="feature-label sublabel">${label}</div>
    <div class="feature-value">
      <ul>${bullets}</ul>
    </div>
  </div>`);
          renderedCards.push(`${label} (${recoveryItems.length} bullets)`);
        }
        
        // Render Country caveats card only if it has content
        if (countryItems.length > 0) {
          const label = labels.country || defaultLabels.country;
          const bullets = countryItems.map(item => `<li>${item}</li>`).join("");
          cards.push(`  <div id="privacy-region">
    <div class="feature-label sublabel">${label}</div>
    <div class="feature-value">
      <ul>${bullets}</ul>
    </div>
  </div>`);
          renderedCards.push(`${label} (${countryItems.length} bullets)`);
        }
        
        // Log rendered cards for debugging
        if (cards.length > 0) {
          console.log(`  Privacy cards for ${svc.name}: ${renderedCards.join(", ")}`);
        } else {
          console.log(`  Privacy cards for ${svc.name}: (none)`);
        }
        
        // Skip entire section only if no cards at all
        if (cards.length === 0) return "";
        
        return `
<section id="privacy" class="service-section">
  <h2 class="feature-label">Privacy &amp; Safety</h2>
${cards.join("\n")}
</section>`;
      };


      const renderMigration = () => {
        const migration = svc.migration || {};
        
        // Support legacy format (from/to arrays) for backward compatibility
        const hasLegacyFormat = Array.isArray(migration.from) || Array.isArray(migration.to);
        const hasNewFormat = Array.isArray(migration.flows) && migration.flows.length > 0;
        
        if (!hasLegacyFormat && !hasNewFormat) return "";
        
        // Legacy format rendering (keep for services that haven't migrated yet)
        if (hasLegacyFormat && !hasNewFormat) {
          const labels = migration.labels || {};
          const defaultLabels = { from: "Migrating to", to: "Migrating from" };
        const fromItems = Array.isArray(migration.from) ? migration.from : [];
        const toItems = Array.isArray(migration.to) ? migration.to : [];
          const cards = [];
          
          fromItems.forEach((item, idx) => {
            const steps = Array.isArray(item.steps) ? item.steps : [];
            if (steps.length === 0) return;
            const sourceLabel = item.source || "Another wallet";
            const label = idx === 0 ? (labels.from || defaultLabels.from) : `${labels.from || defaultLabels.from} (${idx + 1})`;
            const stepsHtml = steps.map(step => `<li>${step}</li>`).join("");
            cards.push(`  <div class="mig-card">
    <div class="feature-label sublabel">${label}</div>
    <div class="feature-value">
      <h3>From ${sourceLabel}</h3>
      <ol>${stepsHtml}</ol>
    </div>
  </div>`);
          });
          
          toItems.forEach((item, idx) => {
            const steps = Array.isArray(item.steps) ? item.steps : [];
            if (steps.length === 0) return;
            const targetLabel = item.target || "Another wallet";
            const label = idx === 0 ? (labels.to || defaultLabels.to) : `${labels.to || defaultLabels.to} (${idx + 1})`;
            const stepsHtml = steps.map(step => `<li>${step}</li>`).join("");
            cards.push(`  <div class="mig-card">
    <div class="feature-label sublabel">${label}</div>
    <div class="feature-value">
      <h3>To ${targetLabel}</h3>
      <ol>${stepsHtml}</ol>
    </div>
    </div>`);
          });
          
          if (cards.length === 0) return "";
          return `
<section id="migration" class="service-section">
  <h2 class="feature-label">Migration</h2>
${cards.join("\n")}
</section>`;
        }
        
        // New flow-based format rendering
        const title = migration.title || "Migration";
        const intro = migration.intro || "";
        const flows = migration.flows || [];
        const ariaLabelToggle = migration.aria_label_toggle || "Expand migration steps";
        
        const flowCards = flows.map(flow => {
          if (!flow || !Array.isArray(flow.steps) || flow.steps.length === 0) return "";
          
          const flowId = flow.id || "";
          const flowTitle = flow.title || "";
          const badges = Array.isArray(flow.badges) ? flow.badges : [];
          const steps = flow.steps || [];
          const tips = Array.isArray(flow.tips) ? flow.tips : [];
          const links = Array.isArray(flow.links) ? flow.links : [];
          const collapsedMobile = flow.collapsed_mobile !== false; // default true
          
          // Hook for future step images support
          const stepImages = Array.isArray(flow.step_images) ? flow.step_images : [];
          
          // Render badges
          const badgesHtml = badges.length > 0
            ? `<div class="migration-badges">${badges.map(badge => `<span class="migration-badge">${badge}</span>`).join("")}</div>`
            : "";
          
          // Render steps (with future image support)
          const stepsHtml = `<ol class="migration-steps">${steps.map((step, idx) => {
            // Hook: if stepImages[idx] exists, we can add <img> here in future
            return `<li>${step}</li>`;
          }).join("")}</ol>`;
          
          // Render tips
          const tipsHtml = tips.length > 0
            ? `<ul class="migration-tips">${tips.map(tip => `<li>${tip}</li>`).join("")}</ul>`
            : "";
          
          // Render links (support pair-based or legacy href)
          const linksHtml = links.length > 0
            ? `<div class="migration-links">${links.map(link => {
                let href, label;
                
                // New format: pair-based canonical links
                if (Array.isArray(link.pair) && link.pair.length === 2) {
                  href = linkForPair(link.pair[0], link.pair[1]);
                  label = link.label || `Compare ${link.pair[0]} vs ${link.pair[1]}`;
                }
                // Legacy format: explicit href
                else if (link.href && link.label) {
                  href = link.href;
                  label = link.label;
                  // Log warning for migration tracking
                  console.log(`  ⚠️  Legacy href in ${svc.name} migration: ${link.href} (consider using pair format)`);
                }
                else {
                  return ""; // Invalid link
                }
                
                return `<a href="${href}" data-event="migration_link_click" data-flow-id="${flowId}">${label}</a>`;
              }).filter(Boolean).join("")}</div>`
            : "";
          
          // Collapse state for mobile
          const collapseClass = collapsedMobile ? " is-collapsed" : "";
          const ariaExpanded = collapsedMobile ? "false" : "true";
          
          return `    <div class="migration-card${collapseClass}" id="${flowId}" data-flow-id="${flowId}">
      <div class="migration-header">
        <h3 class="migration-title">${flowTitle}</h3>
        <button class="migration-toggle" aria-expanded="${ariaExpanded}" aria-controls="${flowId}-content" aria-label="${ariaLabelToggle}" data-event="migration_toggle">
          <span class="migration-toggle-icon"></span>
        </button>
      </div>
      ${badgesHtml}
      <div class="migration-content" id="${flowId}-content">
        ${stepsHtml}
        ${tipsHtml}
        ${linksHtml}
      </div>
    </div>`;
        }).filter(Boolean).join("\n");
        
        if (!flowCards) return "";
        
        const introHtml = intro ? `  <p class="section-intro">${intro}</p>` : "";
        
        return `
<section id="migration" class="service-section">
  <h2 class="feature-label">${title}</h2>
${introHtml}
  <div class="migration-flows">
${flowCards}
  </div>
</section>`;
      };

      const renderCompatibility = () => {
        const tiles = Array.isArray(svc.compat_tiles) ? svc.compat_tiles.slice(0, 3) : [];
        const explainers = Array.isArray(svc.compat_explainers) ? svc.compat_explainers.slice(0, 3) : [];
        
        if (!tiles.length) return "";
        
        const heading = svc.compat_heading || "";
        const learnLabel = svc.compat_learn_label || "Learn more";
        
        // Create explainer map by id for easy lookup
        const explainerMap = {};
        explainers.forEach(exp => {
          if (exp && exp.id) {
            explainerMap[exp.id] = exp;
          }
        });
        
        // Render tiles with inline collapsibles
        const tileItems = tiles.map(tile => {
          const statusMap = {
            works: "Works",
            partial: "Partial",
            advanced: "Advanced",
            notyet: "Not yet"
          };
          const statusText = statusMap[tile.status] || tile.status;
          const statusClass = `svc-chip svc-chip--${tile.status}`;
          const noteHtml = tile.note ? `<p class="svc-compat__note">${tile.note}</p>` : "";
          
          // Find matching explainer
          const explainer = explainerMap[tile.id];
          let detailsHtml = "";
          
          if (explainer) {
            const tryList = Array.isArray(explainer.try) && explainer.try.length > 0
              ? `<p><strong>Try it:</strong></p><ol>${explainer.try.map(step => `<li>${step}</li>`).join("")}</ol>`
              : "";
            
            detailsHtml = `
        <details>
          <summary>${learnLabel}</summary>
          <div>
            <p><strong>What:</strong> ${explainer.what}</p>
            <p><strong>Why:</strong> ${explainer.why}</p>
            ${tryList}
            ${explainer.gotcha ? `<p><strong>Gotcha:</strong> ${explainer.gotcha}</p>` : ""}
          </div>
        </details>`;
          }
          
          return `
      <div class="svc-compat__tile">
        <div class="svc-compat__header">
          <h3 class="svc-compat__title">${tile.title}</h3>
          <span class="${statusClass}">${statusText}</span>
        </div>
        <p class="svc-compat__benefit">${tile.benefit}</p>
        ${noteHtml}${detailsHtml}
      </div>`;
        }).join("");
        
        return `
<section id="compat" class="service-section">
  ${heading ? `<h2 class="feature-label">${heading}</h2>` : ""}
  <div class="svc-compat__grid">
${tileItems}
  </div>
</section>`;
      };

      const renderers = {
        tldr: renderTlDr,
        setup: renderSetup,
        fees: renderFees,
        privacy: renderPrivacy,
        compat: renderCompatibility,
        migration: renderMigration,
      };

      for (const key of order) {
        const renderer = renderers[key];
        if (!renderer) continue;
        const block = renderer();
        if (block) sectionBlocks.push(block);
      }

      const trustChipsHtml = renderTrustChips();

      const sectionsHtml = sectionBlocks.length
        ? `<div class="comparison-table">
${sectionBlocks.join("\n")}
</div>`
        : "";

      // Build CTA buttons for Phoenix only
      let ctaButtonsHtml = '';
      if (slug === 'phoenix' && svc.links) {
        const buttons = [];
        
        if (svc.links.ios && svc.links.android) {
          // Both iOS and Android available
          buttons.push(`<a href="${svc.links.ios}" target="_blank" rel="noopener" class="cta-button" data-variant="ios">iPhone</a>`);
          buttons.push(`<a href="${svc.links.android}" target="_blank" rel="noopener" class="cta-button" data-variant="android">Android</a>`);
        } else if (svc.links.ios) {
          // iOS only
          buttons.push(`<a href="${svc.links.ios}" target="_blank" rel="noopener" class="cta-button" data-variant="ios">iPhone</a>`);
        } else if (svc.links.android) {
          // Android only
          buttons.push(`<a href="${svc.links.android}" target="_blank" rel="noopener" class="cta-button" data-variant="android">Android</a>`);
        } else if (svc.links.desktop) {
          // Desktop fallback
          buttons.push(`<a href="${svc.links.desktop}" target="_blank" rel="noopener" class="cta-button" data-variant="desktop">Download desktop</a>`);
        }
        
        if (buttons.length > 0) {
          ctaButtonsHtml = `\n    <div class="cta-buttons-wrapper">${buttons.join('')}</div>`;
        }
      }

      const bakedBlock = `
<div id="comparison-container">
  <div class="logo-row-sticky">
    <div class="feature-values logo-row" id="logo-row-container">${ctaButtonsHtml}
    </div>
  </div>
  <div id="comparison-table-wrapper">
    ${tableHtml}
  </div>
</div>
${trustChipsHtml}
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

    // Generate HowTo JSON-LD for migration flows if enabled
    try {
      if (svc.migration && svc.migration.howto_schema && Array.isArray(svc.migration.flows)) {
        const howToSchemas = svc.migration.flows
          .filter(flow => flow && Array.isArray(flow.steps) && flow.steps.length > 0)
          .map(flow => {
            const flowUrl = `${url}#${flow.id}`;
            const schema = {
              "@context": "https://schema.org",
              "@type": "HowTo",
              "name": flow.title || "",
              "description": (svc.migration.intro || "").replace(/\.$/, ""),
              "url": flowUrl,
              "step": flow.steps.map((stepText, idx) => ({
                "@type": "HowToStep",
                "position": idx + 1,
                "name": `Step ${idx + 1}`,
                "text": stepText
              }))
            };
            
            // Parse estimatedTime from badges like "Time ~10 min" or "Time ~1–6 hours"
            if (Array.isArray(flow.badges)) {
              const timeBadge = flow.badges.find(b => typeof b === 'string' && /^Time\s*~/i.test(b));
              if (timeBadge) {
                const duration = parseTimeToDuration(timeBadge);
                if (duration) {
                  schema.estimatedCost = { "@type": "MonetaryAmount", "currency": "USD", "value": "0" };
                  schema.totalTime = duration;
                }
              }
            }
            
            return schema;
          });
        
        howToSchemas.forEach(schema => {
          html = html.replace("</head>", `<script type="application/ld+json">${JSON.stringify(schema)}</script></head>`);
        });
      }
    } catch (e) {
      // fail-safe: skip HowTo schema on error
    }

    // Helper: Parse "Time ~10 min" or "Time ~1–6 hours" to ISO 8601 duration
    function parseTimeToDuration(badge) {
      try {
        const text = badge.toLowerCase();
        
        // Match patterns like "~10 min", "~1-6 hours", "~1–6 hours" (with en-dash)
        const minMatch = text.match(/~\s*(\d+)\s*min/);
        if (minMatch) {
          return `PT${minMatch[1]}M`;
        }
        
        const hourMatch = text.match(/~\s*(\d+)(?:\s*[-–]\s*\d+)?\s*hour/);
        if (hourMatch) {
          return `PT${hourMatch[1]}H`;
        }
        
        const dayMatch = text.match(/~\s*(\d+)\s*day/);
        if (dayMatch) {
          return `P${dayMatch[1]}D`;
        }
        
        return null;
      } catch (e) {
        return null;
      }
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