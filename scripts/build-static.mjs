/* eslint-env node */
/* eslint-disable no-useless-escape */

// scripts/build-static.mjs
import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import { injectAlternatives } from "./lib/alternatives.mjs";
import { renderTableHTML } from "../shared/renderTable.mjs";
import { renderFAQBlock, renderFAQJsonLD } from "./lib/faqs.mjs";
import { ensureRobotsMeta } from "./lib/head.mjs";
import { mergeServices } from "./merge-services.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = ROOT; // site root
const OUT_SERVICES = path.join(OUT, "services"); // write service pages under /services
const DATA = path.join(ROOT, "data", "services.json");
const SERVICE_BASE = path.join(ROOT, "service.html");
const HASH_CACHE = path.join(ROOT, "data", ".service-hashes.json");

// -------- helpers --------
const slugify = s =>
  s.toLowerCase().replace(/&/g," and ").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");

const escapeHtml = s =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

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

// -------- Illustration registry (Fees, Compatibility, Migration) --------
// Maps tile/card IDs to shared illustration paths across all sections
// Services can override via item.image in services.json
// 
// TO ADD A NEW ILLUSTRATION:
// 1. Find the item's "id" in services.json (e.g., "lnurl-pay" or "restore-same-wallet")
// 2. Add: "item-id": "/images/illustration/your-image.svg"
// 3. Add matching alt text below
// 4. The same ID works across all services (shared illustrations!)
const COMPAT_ILLUSTRATIONS = {
  // Setup / Getting started section (now resolved per-slug at build time)
  // Fees section
  "fees-pay": "/images/illustration/pay-someone.svg",
  "fees-first-receive": "/images/illustration/receive.svg",
  "fees-splice": "/images/illustration/big-receive.svg",
  // Compatibility section
  "lnurl-pay": "/images/illustration/pay-any-lightning-qr.svg",
  "lnurl-withdraw": "/images/illustration/withdraw-from-service.svg",
  "lightning-address": "/images/illustration/lightning-address.svg",
  // Migration section (generic IDs work across all services)
  "restore-same-wallet": "/images/illustration/restore-wallet-new-phone.svg",
  "move-from-another-wallet": "/images/illustration/move-from-another-wallet.svg",
  "move-to-onchain": "/images/illustration/wallet-to-cold-wallet.svg",
  "switch-to-another-wallet": "/images/illustration/move-to-another-wallet.svg",
  // Add more: "item-id": "/images/illustration/filename.svg"
};

// Alt text registry for illustrations (must match keys above)
const COMPAT_ILLUSTRATION_ALTS = {
  // Setup / Getting started (now resolved per-slug at build time)
  // Fees
  "fees-pay": "Pay someone",
  "fees-first-receive": "First time you receive",
  "fees-splice": "Big receive",
  // Compatibility
  "lnurl-pay": "Scan a Lightning QR; wallet pays",
  "lnurl-withdraw": "Tap or scan the withdrawal QR from the service",
  "lightning-address": "Ask a friend for their Lightning address",
  // Migration
  "restore-same-wallet": "Restore wallet on new device",
  "move-from-another-wallet": "Move wallet from another wallet",
  "move-to-onchain": "Move wallet to cold wallet storage",
  "switch-to-another-wallet": "Move wallet to another wallet"
  // Add more: "item-id": "Short action-focused description"
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

// -------- content hashing for auto-dating --------
const getTodayUTC = () => new Date().toISOString().split("T")[0];

const normalizeMainContent = (html) => {
  try {
    // Extract main content between BUILD markers
    const { inside } = between(html, "<!-- BUILD:START -->", "<!-- BUILD:END -->");
    
    // Remove the "Updated" chip to prevent self-triggering
    let normalized = inside.replace(/<div class="page-updated"[^>]*>[\s\S]*?<\/div>/gi, "");
    
    // Remove dynamic attributes that might change without content changes
    normalized = normalized.replace(/data-updated="[^"]*"/gi, "");
    normalized = normalized.replace(/\sid="[^"]*"/gi, ""); // Remove dynamic IDs
    
    // Collapse whitespace
    normalized = normalized.replace(/\s+/g, " ").trim();
    
    return normalized;
  } catch (e) {
    console.warn("  ⚠️  Could not normalize content for hashing:", e.message);
    return "";
  }
};

const hashContent = (content) => {
  return crypto.createHash("sha256").update(content, "utf8").digest("hex");
};

const loadHashCache = async () => {
  try {
    const data = await fs.readFile(HASH_CACHE, "utf8");
    return JSON.parse(data);
  } catch (e) {
    // Cache doesn't exist yet or is invalid
    return {};
  }
};

const saveHashCache = async (cache) => {
  await fs.writeFile(HASH_CACHE, JSON.stringify(cache, null, 2), "utf8");
};

// -------- main --------
(async () => {
  // Merge individual service files into services.json before building
  console.log('Merging individual service files...');
  mergeServices();
  
  const [dataRaw, baseRaw] = await Promise.all([
    fs.readFile(DATA, "utf8"),
    fs.readFile(SERVICE_BASE, "utf8"),
  ]);
  const services = JSON.parse(dataRaw);
  await fs.mkdir(OUT_SERVICES, { recursive: true });
  const serviceUrls = [];
  const serviceSitemapEntries = [];
  
  // Load content hash cache for auto-dating
  const hashCache = await loadHashCache();
  const newHashCache = {};

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

    // --- Inject globals for runtime JS (no query params on service pages) ---
const urlShim = `
<script>
(function(){
  try {
    var svc  = ${JSON.stringify(svc.name)};
    var slug = ${JSON.stringify(slug)};

    // Set globals for runtime code to discover the current service
    window.__BUOY_SERVICE__ = svc;
    window.__BUOY_SLUG__ = slug;
    window.__BUOY_SINGLE__ = true;

    // Strip query parameters on service pages (preserve hash if present)
    if (location.search) {
      var cleanUrl = location.pathname + (location.hash || '');
      history.replaceState(null, '', cleanUrl);
    }
  } catch (e) {}
})();
</script>
`;

html = html.replace('</head>', urlShim + '</head>');


    // Update H1 (page title) → use service name
    html = setPageTitle(html, svc.name);
    
    // Placeholder: effectiveUpdated will be determined after content hash
    let effectiveUpdated = null;

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
      // Render table for service page with mode: "service" to exclude legacy rows (Platform, Supported Networks, Features, Custody & Control block)
      const tableHtml = await renderTableHTML(svc, svc.category, { mode: "service" });

      const defaultOrder = ["tldr", "setup", "fees", "privacy", "compat", "migration", "trust", "profile"];
      const order = Array.isArray(svc.section_order) && svc.section_order.length
        ? svc.section_order.filter((key) => defaultOrder.includes(key))
        : defaultOrder;

      const sectionBlocks = [];

      const renderTrustChips = () => {
        const chips = Array.isArray(svc.trust_chips) ? svc.trust_chips.slice(0, 3) : [];
        if (!chips.length) return "";
        const chipItems = chips.map(chip => {
          if (!chip || !chip.text) return "";
          // Map status to icon
          let icon = "";
          if (chip.status === "positive") {
            icon = '<img src="/images/checkmark.svg" alt="positive icon" class="trust-chip-icon"/> ';
          } else if (chip.status === "negative") {
            icon = '<img src="/images/cross.svg" alt="negative icon" class="trust-chip-icon"/> ';
          } else if (chip.status === "neutral") {
            icon = '<img src="/images/neutral.svg" alt="neutral icon" class="trust-chip-icon"/> ';
          }
          return `<div class="trust-chip">${icon}${chip.text}</div>`;
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
          items.push(`<p><img src="/images/neutral.svg" alt="neutral icon" class="checkmark-icon"/> <strong>Consider if:</strong> ${tldr.consider_if}</p>`);
        }
        if (tldr.not_ideal_when) {
          items.push(`<p><img src="/images/cross.svg" alt="negative icon" class="checkmark-icon"/> <strong>Not ideal when:</strong> ${tldr.not_ideal_when}</p>`);
        }
        if (!items.length) return "";
        return `
<section id="tldr" class="service-section">
  <h2 class="feature-label">Quick verdict</h2>
  <div class="feature-value">
    ${items.join("\n    ")}
  </div>
</section>`;
      };

      const renderSetup = () => {
        const howto = svc.howto;
        if (!howto || !Array.isArray(howto.steps) || howto.steps.length === 0) return "";
        
        const tileItems = howto.steps.map((step) => {
          const tileId = step.id || slugify(step.title || "");
          
          // Resolve illustration: per-slug screenshot takes precedence
          let illustrationHtml = "";
          
          // Extract step name for per-service screenshots (e.g., "setup-install" → "install")
          const stepName = tileId.replace(/^setup-/, '');
          const bannerPath = `/images/screenshots/${slug}-${stepName}.webp`;
          const fullPath = `/images/screenshots/${slug}-${stepName}-full.webp`;
          
          // Check if per-service screenshot exists at build time
          const bannerExists = (() => {
            try {
              fsSync.accessSync(path.join(ROOT, bannerPath));
              return true;
            } catch { return false; }
          })();
          
          const fullExists = bannerExists && (() => {
            try {
              fsSync.accessSync(path.join(ROOT, fullPath));
              return true;
            } catch { return false; }
          })();
          
          // Priority: per-service screenshot → per-step override → registry fallback
          let imagePath = null;
          let isScreenshot = false;
          
          if (bannerExists) {
            imagePath = bannerPath;
            isScreenshot = true;
          } else if (step.image) {
            imagePath = step.image;
          } else if (COMPAT_ILLUSTRATIONS[tileId]) {
            imagePath = COMPAT_ILLUSTRATIONS[tileId];
          }
          
          if (imagePath) {
            const altText = step.image_alt || COMPAT_ILLUSTRATION_ALTS[tileId] || step.title;
            const interactiveClass = (isScreenshot && fullExists) ? ' screenshot-trigger' : '';
            const dataAttrs = (isScreenshot && fullExists) ? ` data-full="${fullPath}" data-alt="${escapeHtml(altText)}"` : '';
            
            illustrationHtml = `
        <div class="svc-compat__illustration${interactiveClass}"${dataAttrs}>
          <img src="${imagePath}" alt="${escapeHtml(altText)}" loading="lazy" />
        </div>`;
          }
          
          // Meta chips (time, cost, risk)
          const metaChips = [];
          if (step.chips) {
            if (step.chips.time) metaChips.push(`<span class="migration-meta-chip">Time: ${step.chips.time}</span>`);
            if (step.chips.cost) metaChips.push(`<span class="migration-meta-chip">Cost: ${step.chips.cost}</span>`);
            if (step.chips.risk) metaChips.push(`<span class="migration-meta-chip">Risk: ${step.chips.risk}</span>`);
          }
          const metaHtml = metaChips.length > 0 
            ? `<div class="migration-meta">${metaChips.join("")}</div>` 
            : "";
          
          // Actions list (visible, max 3 items)
          let actionsHtml = "";
          if (Array.isArray(step.actions) && step.actions.length > 0) {
            const actionItems = step.actions.slice(0, 3).map(action => `<li>${action}</li>`).join("");
            actionsHtml = `<ol>${actionItems}</ol>`;
          }
          
          // Gotcha (one line)
          const gotchaHtml = step.gotcha ? `<p><strong>Gotcha:</strong> ${step.gotcha}</p>` : "";
          
          return `
      <div class="svc-compat__tile" id="${tileId}">${illustrationHtml}
        <div class="svc-compat__header">
          <h3 class="svc-compat__title">${step.title}</h3>
        </div>
        ${metaHtml}
        ${actionsHtml}
        ${gotchaHtml}
      </div>`;
        }).join("");
        
        return `
<section id="setup" class="service-section">
  <h2 class="feature-label">Getting started</h2>
  <div class="svc-compat__grid">
${tileItems}
  </div>
</section>`;
      };

      const renderFees = () => {
        // Check for new fees structure first
        const hasNewFeesData = svc.fees_faq || svc.key_terms;
        
        if (hasNewFeesData) {
          // New fees structure: scenarios → FAQ → key terms
          
          // Build glossary term map for auto-linking in fees section
          const feesGlossaryMap = new Map();
          if (Array.isArray(svc.key_terms)) {
            svc.key_terms.forEach(term => {
              if (term && term.id && term.term) {
                feesGlossaryMap.set(term.term, term.id);
              }
            });
          }
          
          // Helper to auto-link glossary terms in text
          const linkFeesGlossaryTerms = (text) => {
            if (feesGlossaryMap.size === 0 || !text) return text;
            
            let result = text;
            // Sort terms by length (longest first) to avoid partial matches
            const terms = Array.from(feesGlossaryMap.keys()).sort((a, b) => b.length - a.length);
            
            terms.forEach(term => {
              const anchor = feesGlossaryMap.get(term);
              // Match whole words only, case-insensitive
              const regex = new RegExp(`\\b(${term})\\b`, 'gi');
              let matched = false;
              result = result.replace(regex, (match) => {
                // Only link the first occurrence in each text block
                if (!matched) {
                  matched = true;
                  return `<a href="#${anchor}" class="glossary-link" data-term="${escapeHtml(term)}">${match}</a>`;
                }
                return match;
              });
            });
            
            return result;
          };
          
          // Determine effective fees date for section heading
          let feesDateLabel = "";
          if (svc.fees_updated) {
            const feesDate = new Date(svc.fees_updated);
            if (!Number.isNaN(feesDate.getTime())) {
              const year = feesDate.getFullYear();
              feesDateLabel = ` (${year})`;
            }
          }
          
          // Render scenarios (all three visible, equal size)
          let scenariosHtml = "";
          if (Array.isArray(svc.fees_scenarios) && svc.fees_scenarios.length > 0) {
            const validScenarios = svc.fees_scenarios
              .filter(s => s && hasContent(s.title))
              .slice(0, 3);
            
            if (validScenarios.length > 0) {
              const scenarioCards = validScenarios.map((scenario) => {
                const id = scenario.id || "";
                const title = scenario.title || "";
                const cost = linkFeesGlossaryTerms(scenario.cost_today || "");
                const what = linkFeesGlossaryTerms(scenario.what_happens || "");
                const how = linkFeesGlossaryTerms(scenario.how_to_minimize || "");
                const learn = linkFeesGlossaryTerms(scenario.learn_more || "");
                
                // Resolve illustration: per-scenario override takes precedence over registry
                let illustrationHtml = "";
                const imagePath = scenario.image || COMPAT_ILLUSTRATIONS[id];
                if (imagePath) {
                  const altText = scenario.image_alt || COMPAT_ILLUSTRATION_ALTS[id] || title;
                  illustrationHtml = `
      <div class="svc-compat__illustration">
        <img src="${imagePath}" alt="${escapeHtml(altText)}" loading="lazy" />
      </div>`;
                }
                
                let learnHtml = "";
                if (learn) {
                  learnHtml = `
        <details class="fee-card__learn-more">
          <summary data-open-text="Hide details" data-closed-text="Learn more">Learn more</summary>
          <div><p>${learn}</p></div>
        </details>`;
                }
                
                return `    <article class="fee-card" id="${id}">${illustrationHtml}
      <h3 class="fee-card__title">${title}</h3>
      ${cost ? `<p class="fee-card__cost"><strong>${cost}</strong></p>` : ""}
      ${what ? `<p class="fee-card__what">What happens:<br>${what}</p>` : ""}
      ${how ? `<p class="fee-card__how">Save money:<br>${how}</p>` : ""}${learnHtml}
    </article>`;
              }).join("\n");
              
              scenariosHtml = `  <div class="fee-scenarios">
${scenarioCards}
  </div>\n`;
            }
          }
          
          // Render micro-FAQ (each item individually collapsible, like brand FAQ)
          let microFaqHtml = "";
          if (Array.isArray(svc.fees_faq) && svc.fees_faq.length > 0) {
            const validFaqs = svc.fees_faq
              .filter(faq => faq && hasContent(faq.q) && hasContent(faq.a))
              .slice(0, 3);
            
            if (validFaqs.length > 0) {
              const faqItems = validFaqs.map(faq => {
                return `    <details class="micro-faq-item">
      <summary>${faq.q}</summary>
      <div>
        <p>${linkFeesGlossaryTerms(faq.a)}</p>
      </div>
    </details>`;
              }).join("\n");
              
              microFaqHtml = `  <div class="fee-quick-answers">
    <h3 class="fee-quick-answers__title">Quick answers</h3>
    <div class="fee-quick-answers__list">
${faqItems}
    </div>
  </div>\n`;
            }
          }
          
          // Render key terms (collapsible glossary)
          let keyTermsHtml = "";
          if (Array.isArray(svc.key_terms) && svc.key_terms.length > 0) {
            const validTerms = svc.key_terms
              .filter(term => term && hasContent(term.term) && hasContent(term.definition))
              .slice(0, 5);
            
            if (validTerms.length > 0) {
              const termItems = validTerms.map(term => {
                const id = term.id || "";
                return `      <dt id="${id}">${term.term}</dt>
      <dd>${term.definition}</dd>`;
              }).join("\n");
              
              keyTermsHtml = `  <details class="key-terms" id="fees-key-terms">
    <summary>Key terms</summary>
    <dl>
${termItems}
    </dl>
  </details>\n`;
            }
          }
          
          // Skip entire section if no content at all
          if (!scenariosHtml && !microFaqHtml && !keyTermsHtml) return "";
          
          return `
<section id="fees" class="service-section section-fees">
  <h2 class="fees-title">Fees${feesDateLabel}: what you pay and when</h2>
${scenariosHtml}${microFaqHtml}${keyTermsHtml}
</section>`;
        }
        
        // LEGACY: Fall back to old fees_scenarios format for services not yet migrated
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
        // Helper: slugify for anchor IDs
        const slugifyAnchor = (text) => {
          return text.toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim()
            .slice(0, 50);
        };
        
        // Check for new privacy object structure first
        if (svc.privacy && typeof svc.privacy === 'object') {
          const privacy = svc.privacy;
          
          // Build glossary term map for auto-linking
          const glossaryMap = new Map();
          if (Array.isArray(privacy.glossary)) {
            privacy.glossary.forEach(entry => {
              const anchor = slugifyAnchor(entry.term);
              glossaryMap.set(entry.term, anchor);
            });
          }
          
          // Helper to auto-link glossary terms in text
          const linkGlossaryTerms = (text) => {
            if (glossaryMap.size === 0) return text;
            
            let result = text;
            // Sort terms by length (longest first) to avoid partial matches
            const terms = Array.from(glossaryMap.keys()).sort((a, b) => b.length - a.length);
            
            terms.forEach(term => {
              const anchor = glossaryMap.get(term);
              // Match whole words only, case-insensitive
              const regex = new RegExp(`\\b(${term})\\b`, 'gi');
              let matched = false;
              result = result.replace(regex, (match) => {
                // Only link the first occurrence in each text block
                if (!matched) {
                  matched = true;
                  return `<a href="#${anchor}" class="glossary-link" data-term="${escapeHtml(term)}">${match}</a>`;
                }
                return match;
              });
            });
            
            return result;
          };
          
          const cards = [];
          
          // Card 1: Data flows
          if (Array.isArray(privacy.data_flows) && privacy.data_flows.length > 0) {
            const bullets = privacy.data_flows.slice(0, 4).map(item => `<li>${linkGlossaryTerms(item)}</li>`).join("");
            let dodonts = "";
            if (privacy.data_flows_do || privacy.data_flows_dont) {
              const doItem = privacy.data_flows_do ? `<div class="dodont-item dodont-do"><img src="/images/checkmark.svg" alt="" class="dodont-icon" aria-hidden="true" /><span><strong>Do:</strong> ${linkGlossaryTerms(privacy.data_flows_do)}</span></div>` : "";
              const dontItem = privacy.data_flows_dont ? `<div class="dodont-item dodont-dont"><img src="/images/cross.svg" alt="" class="dodont-icon" aria-hidden="true" /><span><strong>Don't:</strong> ${linkGlossaryTerms(privacy.data_flows_dont)}</span></div>` : "";
              dodonts = `<div class="dodont-strip">${doItem}${dontItem}</div>`;
            }
            cards.push(`    <div class="privacy-card" id="data-flows">
      <h3>Who can see what when you use ${svc.name}</h3>
      <ul>${bullets}</ul>
      ${dodonts}
    </div>`);
          }
          
          // Card 2: Recovery
          if (Array.isArray(privacy.recovery) && privacy.recovery.length > 0) {
            const bullets = privacy.recovery.slice(0, 4).map(item => `<li>${linkGlossaryTerms(item)}</li>`).join("");
            let dodonts = "";
            if (privacy.recovery_do || privacy.recovery_dont) {
              const doItem = privacy.recovery_do ? `<div class="dodont-item dodont-do"><img src="/images/checkmark.svg" alt="" class="dodont-icon" aria-hidden="true" /><span><strong>Do:</strong> ${linkGlossaryTerms(privacy.recovery_do)}</span></div>` : "";
              const dontItem = privacy.recovery_dont ? `<div class="dodont-item dodont-dont"><img src="/images/cross.svg" alt="" class="dodont-icon" aria-hidden="true" /><span><strong>Don't:</strong> ${linkGlossaryTerms(privacy.recovery_dont)}</span></div>` : "";
              dodonts = `<div class="dodont-strip">${doItem}${dontItem}</div>`;
            }
            cards.push(`    <div class="privacy-card" id="recovery">
      <h3>Lost your phone? How ${svc.name} recovery works</h3>
      <ul>${bullets}</ul>
      ${dodonts}
    </div>`);
          }
          
          // Card 3: Availability / Region
          if (Array.isArray(privacy.region) && privacy.region.length > 0) {
            const bullets = privacy.region.slice(0, 4).map(item => `<li>${linkGlossaryTerms(item)}</li>`).join("");
            cards.push(`    <div class="privacy-card" id="availability">
      <h3>Availability &amp; safe installs</h3>
      <ul>${bullets}</ul>
    </div>`);
          }
          
          // Micro-FAQs (each item individually collapsible, like brand FAQ)
          let microFaqsHtml = "";
          if (Array.isArray(privacy.micro_faqs) && privacy.micro_faqs.length > 0) {
            const faqItems = privacy.micro_faqs.map(faq => {
              const anchor = slugifyAnchor(faq.q);
              return `      <details class="micro-faq-item" id="${anchor}">
        <summary>${faq.q}</summary>
        <div>
          <p>${faq.a}</p>
        </div>
      </details>`;
            }).join("\n");
            microFaqsHtml = `
    <div class="micro-faqs">
      <h3 class="micro-faqs__title">Quick answers</h3>
      <div class="micro-faqs__list">
${faqItems}
      </div>
    </div>`;
          }
          
          // Mini-glossary (collapsible)
          let glossaryHtml = "";
          if (Array.isArray(privacy.glossary) && privacy.glossary.length > 0) {
            const glossaryItems = privacy.glossary.map(entry => {
              const anchor = slugifyAnchor(entry.term);
              return `      <dt id="${anchor}">${entry.term}</dt>
      <dd>${entry.def}</dd>`;
            }).join("\n");
            glossaryHtml = `
    <details class="mini-glossary">
      <summary>Key terms</summary>
      <dl>
${glossaryItems}
      </dl>
    </details>`;
          }
          
          // Skip if no content at all
          if (cards.length === 0 && !microFaqsHtml && !glossaryHtml) return "";
          
          const sectionTitle = privacy.section_title || "Privacy & Safety";
          
          return `
<section id="privacy-safety" class="service-section" aria-labelledby="privacy-safety-label">
  <h2 id="privacy-safety-label" class="feature-label">${sectionTitle}</h2>
  <div class="privacy-cards">
${cards.join("\n")}
  </div>${microFaqsHtml}${glossaryHtml}
</section>`;
        }
        
        // LEGACY: Fall back to old privacy_notes format for services not yet migrated
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
        const items = Array.isArray(svc.migration) ? svc.migration : [];
        
        if (!items.length) return "";
        
        const heading = `Move your ${svc.name} wallet or funds`;
        const learnLabel = "Show steps";
        
        // Render tiles similar to compatibility but without status pills
        const tileItems = items.map(item => {
          const tileId = item.id || slugify(item.title || "");
          
          // Resolve illustration: per-item override takes precedence over registry
          let illustrationHtml = "";
          const imagePath = item.image || COMPAT_ILLUSTRATIONS[tileId];
          if (imagePath) {
            const altText = item.image_alt || COMPAT_ILLUSTRATION_ALTS[tileId] || item.title;
            illustrationHtml = `
        <div class="svc-compat__illustration">
          <img src="${imagePath}" alt="${escapeHtml(altText)}" loading="lazy" />
        </div>`;
          }
          
          // Meta chips (time, cost, risk)
          const metaChips = [];
          if (item.time) metaChips.push(`<span class="migration-meta-chip">Time: ${item.time}</span>`);
          if (item.cost) metaChips.push(`<span class="migration-meta-chip">Cost: ${item.cost}</span>`);
          if (item.risk) metaChips.push(`<span class="migration-meta-chip">Risk: ${item.risk}</span>`);
          const metaHtml = metaChips.length > 0 
            ? `<div class="migration-meta">${metaChips.join("")}</div>` 
            : "";
          
          // Choose (formerly benefit)
          const chooseHtml = item.choose ? `<p class="svc-compat__benefit"><strong>Choose:</strong> ${item.choose}</p>` : "";
          
          // Steps collapsible
          let detailsContent = "";
          if (Array.isArray(item.steps) && item.steps.length > 0) {
            const stepsList = `<ol>${item.steps.map(step => `<li>${step}</li>`).join("")}</ol>`;
            detailsContent = stepsList;
            
            // Append tips if present
            if (item.tips) {
              detailsContent += `<p><strong>Tips:</strong> ${item.tips}</p>`;
            }
            
            // Append gotcha if present
            if (item.gotcha) {
              detailsContent += `<p><strong>Gotcha:</strong> ${item.gotcha}</p>`;
            }
          } else {
            detailsContent = `<p>Additional details coming soon.</p>`;
          }
          
          const detailsHtml = `
        <details class="compat-details">
          <summary data-open-text="Hide steps" data-closed-text="${learnLabel}">${learnLabel}</summary>
          <div>${detailsContent}
          </div>
        </details>`;
          
          return `
      <div class="svc-compat__tile" id="${tileId}">${illustrationHtml}
        <div class="svc-compat__header">
          <h3 class="svc-compat__title">${item.title}</h3>
        </div>
        ${metaHtml}
        ${chooseHtml}${detailsHtml}
      </div>`;
        }).join("");
        
        return `
<section id="migration" class="service-section">
  <h2 class="feature-label">${heading}</h2>
  <div class="svc-compat__grid">
${tileItems}
  </div>
</section>`;
      };

      const renderCompatibility = () => {
        const tiles = Array.isArray(svc.compat_tiles) ? svc.compat_tiles : [];
        const explainers = Array.isArray(svc.compat_explainers) ? svc.compat_explainers : [];
        
        if (!tiles.length) return "";
        
        const heading = svc.compat_heading || "";
        const learnLabel = svc.compat_learn_label || "Show steps";
        
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
            setup: "Needs setup",
            notyet: "Not yet"
          };
          const statusText = statusMap[tile.status] || tile.status;
          const statusClass = `svc-chip svc-chip--${tile.status}`;
          const noteHtml = tile.note ? `<p class="svc-compat__note">${tile.note}</p>` : "";
          
          // Resolve illustration: per-tile override takes precedence over registry
          let illustrationHtml = "";
          const imagePath = tile.image || COMPAT_ILLUSTRATIONS[tile.id];
          if (imagePath) {
            const altText = tile.image_alt || COMPAT_ILLUSTRATION_ALTS[tile.id] || tile.title;
            illustrationHtml = `
        <div class="svc-compat__illustration">
          <img src="${imagePath}" alt="${escapeHtml(altText)}" loading="lazy" />
        </div>`;
          }
          
          // Find matching explainer
          const explainer = explainerMap[tile.id];
          
          // Always render details element for consistent template
          let detailsContent = "";
          if (explainer && explainer.why) {
            const tryList = Array.isArray(explainer.try) && explainer.try.length > 0
              ? `<p><strong>Try it:</strong></p><ol>${explainer.try.map(step => `<li>${step}</li>`).join("")}</ol>`
              : "";
            
            detailsContent = `
            <p><strong>Why it matters:</strong> ${explainer.why}</p>
            ${tryList}
            ${explainer.gotcha ? `<p><strong>Gotcha:</strong> ${explainer.gotcha}</p>` : ""}`;
          } else {
            // Default content when no explainer exists
            detailsContent = `
            <p>Additional details coming soon.</p>`;
          }
          
          const detailsHtml = `
        <details class="compat-details">
          <summary data-open-text="Hide steps" data-closed-text="${learnLabel}">${learnLabel}</summary>
          <div>${detailsContent}
          </div>
        </details>`;
          
          return `
      <div class="svc-compat__tile">${illustrationHtml}
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

      // Render dedicated sticky bar for service pages (not used on compare pages)
      const renderServiceStickyCTA = (service) => {
        const logoSrc = `/images/${service.name.toLowerCase().replace(/\s+/g, '-')}.svg`;
        const websiteUrl = service.website || url;
        
        // Build device-aware CTA button (routes via /go for analytics)
        let ctaButtonHtml = '';
        if (service.links && (service.links.ios || service.links.android || service.links.desktop)) {
          // Store platform links as data attributes for client-side device detection
          const dataAttrs = [];
          if (service.links.ios) dataAttrs.push(`data-ios="${service.links.ios}"`);
          if (service.links.android) dataAttrs.push(`data-android="${service.links.android}"`);
          if (service.links.desktop) dataAttrs.push(`data-desktop="${service.links.desktop}"`);
          
          ctaButtonHtml = `<a href="/go?service=${encodeURIComponent(service.name)}&target=auto" class="cta-button cta-button--primary" ${dataAttrs.join(' ')} data-service="${service.name}">Get ${service.name}</a>`;
        } else {
          // Fallback: direct website link
          ctaButtonHtml = `<a href="/go?service=${encodeURIComponent(service.name)}&target=website" class="cta-button cta-button--primary" data-service="${service.name}">Get ${service.name}</a>`;
        }
        
        const websiteLinkHtml = `<a href="/go?service=${encodeURIComponent(service.name)}&target=website" class="cta-link-secondary" data-service="${service.name}">Visit official website</a>`;
        
        return `<div class="service-sticky-cta">
  <div class="feature-values logo-row">
    <div class="feature-value logo-cell" data-service="${service.name.toLowerCase()}">
      <a href="${websiteUrl}" target="_blank" class="service-link">
        <img src="${logoSrc}" alt="${service.name} logo" class="svg-icon sticky-logo" />
      </a>
      <div class="cta-row">
        ${ctaButtonHtml}
        ${websiteLinkHtml}
      </div>
    </div>
  </div>
</div>`;
      };

      const renderTrustSection = () => {
        const trust = svc.trust;
        if (!trust || !Array.isArray(trust.cards) || trust.cards.length === 0) return "";
        
        // Predefined card type mapping (icon paths and labels)
        const cardTypeMap = {
          update: {
            label: "Last update",
            icon: "/images/update.svg"
          },
          publisher: {
            label: "Publisher",
            icon: "/images/publisher.svg"
          },
          source: {
            label: "Open source",
            icon: "/images/opensource.svg"
          },
          activity: {
            label: "Development activity",
            icon: "/images/activity.svg"
          },
          audit: {
            label: "Security audit",
            icon: "/images/audit.svg"
          }
        };
        
        // Take up to 5 cards
        const cards = trust.cards.slice(0, 5);
        
        const tileItems = cards.map(card => {
          if (!card || !hasContent(card.fact)) return "";
          
          const cardId = card.id ? `trust-${card.id}` : "";
          const cardType = cardTypeMap[card.id] || {};
          const label = escapeHtml(cardType.label || "");
          const icon = cardType.icon || "";
          const fact = escapeHtml(card.fact || "No data yet");
          const linkText = escapeHtml(card.link_text || "learn more");
          const linkUrl = card.link_url || "#";
          
          // Icon (decorative)
          const iconHtml = icon 
            ? `<img src="${icon}" alt="" class="trust-card-icon" aria-hidden="true" />`
            : "";
          
          return `    <div>
      <div class="feature-label sublabel">${label}</div>
      <div class="svc-compat__tile" id="${cardId}">
        <div class="trust-card-body">
          ${iconHtml}
          <p class="trust-card-fact">${fact}</p>
          <a href="${linkUrl}" target="_blank" class="trust-card-link">${linkText}</a>
        </div>
      </div>
    </div>`;
        }).filter(Boolean).join("\n");
        
        if (!tileItems) return "";
        
        return `
<section id="trust" class="service-section">
  <h2 class="feature-label">Release &amp; Trust</h2>
  <div class="svc-compat__grid">
${tileItems}
  </div>
</section>`;
      };

      const renderProfileSection = () => {
        const profile = svc.profile;
        const description = svc.description;
        const foundedIn = svc.founded_in;
        const website = svc.website;
        
        // Only render if at least one field has content
        if (!profile && !description && !foundedIn && !website) return "";
        
        const cards = [];
        
        // Founder(s) card
        if (profile) {
          const filename = profile.toLowerCase().replace(/\s+/g, "-") + ".jpg";
          const founderHtml = `<img src="/images/founders/${filename}" alt="${escapeHtml(profile)}" style="width:100px;height:100px;border-radius:50%;display:block;margin:0 auto 10px auto"><div style="text-align:center">${escapeHtml(profile)}</div>`;
          cards.push(`  <div>
    <div class="feature-label sublabel">Founder(s)</div>
    <div class="feature-value">
      ${founderHtml}
    </div>
  </div>`);
        }
        
        // Company description card
        if (description) {
          const normalized = String(description).replace(/\\n\\n/g, "\n\n");
          const paragraphs = normalized.split("\n\n");
          const fullText = paragraphs.map(p => `<p>${escapeHtml(p)}</p>`).join("");
          let descHtml;
          if (normalized.length < 200) {
            descHtml = fullText;
          } else {
            const mobilePreviewText = paragraphs[0].length > 200 ? paragraphs[0].substring(0, 200) + "..." : paragraphs[0];
            const desktopPreviewText = paragraphs[0];
            descHtml = `
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
    </div>`;
          }
          cards.push(`  <div>
    <div class="feature-label sublabel">Company description</div>
    <div class="feature-value">
      ${descHtml}
    </div>
  </div>`);
        }
        
        // Founded in card
        if (foundedIn) {
          cards.push(`  <div>
    <div class="feature-label sublabel">Founded in</div>
    <div class="feature-value">
      ${escapeHtml(foundedIn)}
    </div>
  </div>`);
        }
        
        // Website card
        if (website) {
          const displayDomain = String(website).replace(/https?:\/\/(www\.)?/, "");
          cards.push(`  <div>
    <div class="feature-label sublabel">Website</div>
    <div class="feature-value">
      <a href="${website}" target="_blank">${escapeHtml(displayDomain)}</a>
    </div>
  </div>`);
        }
        
        if (cards.length === 0) return "";
        
        return `
<section id="profile" class="service-section">
  <h2 class="feature-label">Profile</h2>
${cards.join("\n")}
</section>`;
      };

      const renderers = {
        tldr: renderTlDr,
        setup: renderSetup,
        fees: renderFees,
        privacy: renderPrivacy,
        compat: renderCompatibility,
        migration: renderMigration,
        trust: renderTrustSection,
        profile: renderProfileSection,
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

      // Build the service page content (no comparison-container wrapper)
      const stickyBarHtml = renderServiceStickyCTA(svc);

      const bakedBlock = `${stickyBarHtml}
${trustChipsHtml}
${sectionsHtml}`;

      const { before, after } = between(html, "<!-- BUILD:START -->", "<!-- BUILD:END -->");
      html = `${before}\n${bakedBlock}\n${after}`;
    } catch (e) {
      // If BUILD markers are missing or renderer failed, keep the page unchanged.
    }

    // -------- Determine effective date from content hash --------
    // Hash the main BUILD content (body only, not head/meta)
    const normalizedContent = normalizeMainContent(html);
    const contentHash = hashContent(normalizedContent);
    const cached = hashCache[slug];
    const today = getTodayUTC();
    
    // Determine effective date:
    // 1. Manual override from services.json takes precedence
    // 2. If hash unchanged, reuse cached date
    // 3. If hash changed or no cache, use today
    if (svc.updated) {
      effectiveUpdated = svc.updated;
      console.log(`  ${slug}: manual override → ${effectiveUpdated}`);
    } else if (cached && cached.hash === contentHash) {
      effectiveUpdated = cached.date;
      console.log(`  ${slug}: content unchanged → ${effectiveUpdated}`);
    } else {
      effectiveUpdated = today;
      console.log(`  ${slug}: content changed → ${effectiveUpdated}`);
    }
    
    // Store in new cache
    newHashCache[slug] = {
      hash: contentHash,
      date: effectiveUpdated
    };
    
    // Inject the updated chip with the effective date
    html = injectUpdatedChip(html, effectiveUpdated);

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
    
    // Add dateModified using effective date
    if (effectiveUpdated) {
      jsonLd.dateModified = effectiveUpdated;
    }
    
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
            
            // Add totalTime if present in flow data
            if (flow.totalTime) {
              schema.totalTime = flow.totalTime;
              schema.estimatedCost = { "@type": "MonetaryAmount", "currency": "USD", "value": "0" };
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

    // Inject Alternatives block under comparison area
    try {
      html = injectAlternatives(html, svc, services);
    } catch (e) {
      // fail-safe: if anything goes wrong, keep the page without alternatives
    }

    // Inject screenshot lightbox overlay (for Getting started screenshots)
    const lightboxHtml = `
<!-- Screenshot Lightbox -->
<div id="screenshot-lightbox" class="screenshot-lightbox" aria-hidden="true" role="dialog" aria-modal="true" aria-label="Screenshot viewer">
  <button class="screenshot-lightbox__close" aria-label="Close screenshot viewer">&times;</button>
  <div class="screenshot-lightbox__content">
    <img class="screenshot-lightbox__image" src="" alt="" />
  </div>
</div>
<script>
(function() {
  const lightbox = document.getElementById('screenshot-lightbox');
  if (!lightbox) return;
  
  const img = lightbox.querySelector('.screenshot-lightbox__image');
  const closeBtn = lightbox.querySelector('.screenshot-lightbox__close');
  
  function openLightbox(fullPath, altText) {
    img.src = fullPath;
    img.alt = altText;
    lightbox.setAttribute('aria-hidden', 'false');
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
    closeBtn.focus();
  }
  
  function closeLightbox() {
    lightbox.setAttribute('aria-hidden', 'true');
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
    img.src = '';
  }
  
  // Attach click handlers to all screenshot triggers
  document.addEventListener('click', function(e) {
    const trigger = e.target.closest('.screenshot-trigger');
    if (trigger) {
      e.preventDefault();
      const fullPath = trigger.getAttribute('data-full');
      const altText = trigger.getAttribute('data-alt') || '';
      if (fullPath) openLightbox(fullPath, altText);
    }
  });
  
  // Close on overlay click
  lightbox.addEventListener('click', function(e) {
    if (e.target === lightbox) closeLightbox();
  });
  
  // Close button
  closeBtn.addEventListener('click', closeLightbox);
  
  // Keyboard: Esc to close
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && lightbox.classList.contains('active')) {
      closeLightbox();
    }
  });
})();
</script>
`;
    html = html.replace('</body>', lightboxHtml + '</body>');

    // NOTE: Do NOT add data-static yet. Let the current JS render the body so design stays identical.
    await fs.writeFile(path.join(OUT_SERVICES, `${slug}.html`), html, "utf8");
    serviceUrls.push(url);
    
    // Store sitemap entry with lastmod using effective date
    const sitemapEntry = { url };
    if (effectiveUpdated) {
      sitemapEntry.lastmod = effectiveUpdated;
    }
    serviceSitemapEntries.push(sitemapEntry);
    
    console.log("Wrote", `services/${slug}.html`);
  }

  // Write a dedicated services sitemap without touching the main sitemap.xml
  const sitemapXml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...serviceSitemapEntries.map(entry => {
      if (entry.lastmod) {
        return `  <url><loc>${entry.url}</loc><lastmod>${entry.lastmod}</lastmod></url>`;
      }
      return `  <url><loc>${entry.url}</loc></url>`;
    }),
    '</urlset>'
  ].join('\n');
  await fs.writeFile(path.join(OUT, 'sitemap-services.xml'), sitemapXml, 'utf8');
  console.log('Wrote sitemap-services.xml with', serviceUrls.length, 'URLs');
  
  // Save the updated hash cache
  await saveHashCache(newHashCache);
  console.log('Saved content hash cache to', HASH_CACHE);
})();