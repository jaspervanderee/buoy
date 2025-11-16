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
  "fees-send-lightning": "/images/illustration/pay-someone.svg",
  "fees-first-receive": "/images/illustration/receive.svg",
  "fees-receive-lightning": "/images/illustration/receive.svg",
  "fees-splice": "/images/illustration/big-receive.svg",
  "fees-onchain-send": "/images/illustration/pay-on-chain.svg",
  "fees-deposit": "/images/illustration/deposit-cash.svg",
  "fees-buy": "/images/illustration/buy-bitcoin.svg",
  "fees-withdraw": "/images/illustration/move-to-another-wallet.svg",
  // Compatibility section (legacy)
  "lnurl-pay": "/images/illustration/pay-any-lightning-qr.svg",
  "lnurl-withdraw": "/images/illustration/withdraw-from-service.svg",
  "lightning-address": "/images/illustration/lightning-address.svg",
  // Compatibility section (standardized)
  "pay-lightning": "/images/illustration/pay-any-lightning-qr.svg",
  "pay-onchain": "/images/illustration/pay-on-chain.svg",
  "receive-lightning": "/images/illustration/receive.svg",
  "receive-onchain": "/images/illustration/receive-on-chain.svg",
  // Migration section (generic IDs work across all services)
  "restore-same-wallet": "/images/illustration/restore-wallet-new-phone.svg",
  "move-from-another-wallet": "/images/illustration/move-from-another-wallet.svg",
  "move-to-onchain": "/images/illustration/wallet-to-cold-wallet.svg",
  "switch-to-another-wallet": "/images/illustration/move-to-another-wallet.svg",
  // Self-custody section (generic IDs work across all services)
  "pick-wallet": "/images/illustration/wallet-to-cold-wallet.svg",
  "make-receive-code": "/images/illustration/create-code.svg",
  "test-small": "/images/illustration/tiny-test.svg",
  "move-rest": "/images/illustration/move-the-rest.svg"
  // Add more: "item-id": "/images/illustration/filename.svg"
};

// Alt text registry for illustrations (must match keys above)
const COMPAT_ILLUSTRATION_ALTS = {
  // Setup / Getting started (now resolved per-slug at build time)
  // Fees
  "fees-pay": "Pay someone",
  "fees-send-lightning": "Pay someone",
  "fees-first-receive": "First time you receive",
  "fees-receive-lightning": "Receive on Lightning",
  "fees-splice": "Big receive",
  "fees-onchain-send": "Send Bitcoin on-chain",
  "fees-deposit": "Deposit cash",
  "fees-buy": "Buy bitcoin",
  "fees-withdraw": "Withdraw bitcoin",
  // Compatibility (legacy)
  "lnurl-pay": "Scan a Lightning QR; wallet pays",
  "lnurl-withdraw": "Tap or scan the withdrawal QR from the service",
  "lightning-address": "Ask a friend for their Lightning address",
  // Compatibility (standardized)
  "pay-lightning": "Pay with Lightning",
  "pay-onchain": "Pay on-chain",
  "receive-lightning": "Receive on Lightning",
  "receive-onchain": "Receive on-chain",
  // Migration
  "restore-same-wallet": "Restore wallet on new device",
  "move-from-another-wallet": "Move wallet from another wallet",
  "move-to-onchain": "Move wallet to cold wallet storage",
  "switch-to-another-wallet": "Move wallet to another wallet",
    // Migration
    "pick-wallet": "Pick a wallet",
    "make-receive-code": "Make a safe receive code",
    "test-small": "Send a tiny test first",
    "move-rest": "Move the rest"
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
    
    // SEO-optimized title: Add year for freshness and front-load keywords
    const currentYear = new Date().getFullYear();
    const title = `${svc.name} Review ${currentYear}: Fees, Features & Setup Guide | Buoy Bitcoin`;
    
    // Generate query-focused meta description
    const generateMetaDescription = (service) => {
      const currentYear = new Date().getFullYear();
      const type = service.type_of_platform || 'service';
      const category = service.category || 'Bitcoin';
      const custody = service.custody_control ? `${service.custody_control}.` : '';
      const kyc = service.kyc_required === 'No' ? 'No KYC required.' : '';
      
      // More compelling description with year for freshness
      let desc = `${service.name} review ${currentYear}: ${type} for ${category}. `;
      if (custody) desc += `${custody} `;
      if (kyc) desc += `${kyc} `;
      desc += 'Compare fees, features & setup guide.';
      
      return clamp(desc, 160);
    };
    
    const desc = generateMetaDescription(svc);

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


    // Update H1 (page title) → use service name with hidden SEO text
    const seoH1 = `${svc.name}<span class="visually-hidden"> Review: Fees, Features & Setup Guide</span>`;
    html = setPageTitle(html, seoH1);
    
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

    // Inject Jump to navigation after breadcrumbs (before BUILD block renders sections)
    // This will be populated based on which sections actually exist after rendering
    // Placeholder injection - actual pills will be added after section rendering
    const jumpToPlaceholder = '\n<!-- JUMP_TO_NAV -->';
    html = html.replace(/(<nav class="breadcrumbs"[^>]*>[\s\S]*?<\/nav>)/i, (m) => `${m}${jumpToPlaceholder}`);

    // Keep existing container markup (your JS will populate it)
    // Make sure service.html has:
    // <!-- BUILD:START --> ... #comparison-container ... <!-- BUILD:END -->
    try {
      // Render table for service page with mode: "service" to exclude legacy rows (Platform, Supported Networks, Features, Custody & Control block)
      const tableHtml = await renderTableHTML(svc, svc.category, { mode: "service" });

      const defaultOrder = ["tldr", "setup", "fees", "payment_methods_limits", "key_features", "compat", "recovery", "migration", "privacy", "trust", "profile"];
      let order = Array.isArray(svc.section_order) && svc.section_order.length
        ? svc.section_order.filter((key) => defaultOrder.includes(key) || key === "self_custody" || key === "payment_methods_limits" || key === "key_features" || key === "recovery")
        : defaultOrder;
      
      // For Buy Bitcoin services, replace migration with self_custody
      if (svc.category === "Buy Bitcoin") {
        order = order.map(key => key === "migration" ? "self_custody" : key);
      }
      
      // For Store it safely services, use custody-focused order
      if (svc.category === "Store it safely") {
        order = ["tldr", "setup", "fees", "key_features", "recovery", "inheritance", "compat", "costs", "privacy", "trust", "profile"];
      }

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
            icon = '<img src="/images/warning.svg" alt="neutral icon" class="trust-chip-icon"/> ';
          }
          // Add differentiator variant class if specified
          const variantClass = chip.variant === "differentiator" ? " trust-chip--differentiator" : "";
          // If chip has link_to, make it clickable with full path (due to <base href="/" /> in service pages)
          if (chip.link_to) {
            return `<a href="/services/${slug}.html#${chip.link_to}" class="trust-chip${variantClass}">${icon}${chip.text}</a>`;
          }
          return `<div class="trust-chip${variantClass}">${icon}${chip.text}</div>`;
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
          items.push(`<p><img src="/images/warning.svg" alt="neutral icon" class="checkmark-icon"/> <strong>Consider if:</strong> ${tldr.consider_if}</p>`);
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
        
        // Use custom title for "Store it safely" services, default to "Getting started" for others
        const setupHeading = (svc.category === "Store it safely" && howto.title) 
          ? howto.title 
          : "Getting started";
        
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
        
        // Render micro-FAQ (each item individually collapsible, like fees micro-FAQ)
        let microFaqHtml = "";
        if (Array.isArray(howto.micro_faqs) && howto.micro_faqs.length > 0) {
          const validFaqs = howto.micro_faqs
            .filter(faq => faq && hasContent(faq.q) && hasContent(faq.a))
            .slice(0, 3);
          
          if (validFaqs.length > 0) {
            const faqItems = validFaqs.map(faq => {
              return `    <details class="micro-faq-item">
      <summary>${faq.q}</summary>
      <div>
        <p>${faq.a}</p>
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
        
        return `
<section id="setup" class="service-section">
  <h2 class="feature-label">${setupHeading}</h2>
  <div class="svc-compat__grid">
${tileItems}
  </div>${microFaqHtml}
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
                
                // Handle learn_more: can be string or table object
                let learnHtml = "";
                if (scenario.learn_more) {
                  const learnMore = scenario.learn_more;
                  
                  if (typeof learnMore === "object" && learnMore.type === "table") {
                    // Resolve table rows - either inline or from source reference
                    let tableRows = [];
                    
                    if (learnMore.source) {
                      // Reference to another property in the service object (e.g., "fees.tiers")
                      const path = learnMore.source.split('.');
                      let sourceData = svc;
                      for (const key of path) {
                        sourceData = sourceData?.[key];
                      }
                      tableRows = Array.isArray(sourceData) ? sourceData : [];
                    } else if (Array.isArray(learnMore.rows)) {
                      // Inline rows
                      tableRows = learnMore.rows;
                    }
                    
                    if (tableRows.length > 0) {
                      // Render as table
                      const tableHeading = learnMore.heading ? `<h4 class="learn-more-table-heading">${escapeHtml(learnMore.heading)}</h4>` : "";
                      const rowsHtml = tableRows.map(row => {
                        const cells = Object.entries(row).map(([key, value]) => {
                          return `<td>${escapeHtml(value)}</td>`;
                        }).join("");
                        return `<tr>${cells}</tr>`;
                      }).join("\n            ");
                      
                      learnHtml = `
        <details class="fee-card__learn-more">
          <summary data-open-text="Hide details" data-closed-text="Learn more">Learn more</summary>
          <div>
            ${tableHeading}
            <table class="fee-tiers-table">
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
          </div>
        </details>`;
                    }
                  } else {
                    // Render as text
                    const learnText = typeof learnMore === "string" ? linkFeesGlossaryTerms(learnMore) : "";
                    if (learnText) {
                      learnHtml = `
        <details class="fee-card__learn-more">
          <summary data-open-text="Hide details" data-closed-text="Learn more">Learn more</summary>
          <div><p>${learnText}</p></div>
        </details>`;
                    }
                  }
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

      const renderInheritance = () => {
        // Only render for Store it safely category
        if (svc.category !== "Store it safely") return "";
        
        const inheritance = svc.inheritance;
        if (!inheritance || typeof inheritance !== 'object') return "";
        
        const sectionTitle = inheritance.section_title || "Inheritance: pass it on safely";
        
        // Intro as sublabel (not white tile)
        const introHtml = inheritance.intro 
          ? `  <div class="feature-label sublabel">${inheritance.intro}</div>\n` 
          : "";
        
        const tiles = [];
        
        // Render each card as a compat-style tile with status chip
        if (Array.isArray(inheritance.cards)) {
          inheritance.cards.forEach(card => {
            if (!card || !card.title) return;
            
            // Status chip mapping
            const statusMap = {
              "action": { class: "svc-chip--works", text: "Action" },
              "process": { class: "svc-chip--setup", text: "Process" },
              "emergency": { class: "svc-chip--notyet", text: "Emergency" }
            };
            const statusInfo = statusMap[card.status] || { class: "svc-chip--setup", text: card.status };
            
            // Meta chips (time, priority, etc.)
            const metaChips = [];
            if (card.chips) {
              Object.entries(card.chips).forEach(([key, value]) => {
                metaChips.push(`<span class="migration-meta-chip">${value}</span>`);
              });
            }
            const metaHtml = metaChips.length > 0 
              ? `<div class="migration-meta">${metaChips.join("")}</div>` 
              : "";
            
            // Why/mechanism explanation (visible)
            const whyHtml = card.why ? `<p class="svc-compat__why">${card.why}</p>` : "";
            
            // Prereqs (if present)
            const prereqsHtml = card.prereqs ? `<p class="inheritance-prereqs"><strong>You'll need:</strong> ${card.prereqs}</p>` : "";
            
            // Steps list (visible, no collapse)
            let stepsHtml = "";
            if (Array.isArray(card.steps) && card.steps.length > 0) {
              const stepItems = card.steps.map((step, idx) => `<li>${step}</li>`).join("");
              stepsHtml = `<ol class="inheritance-steps">${stepItems}</ol>`;
            }
            
            // Scenarios (for "If plans break" card) - issue and path on separate lines
            let scenariosHtml = "";
            if (Array.isArray(card.scenarios) && card.scenarios.length > 0) {
              const scenarioItems = card.scenarios.map(scenario => {
                return `<div class="inheritance-scenario">
        <strong>${scenario.issue}:</strong><br>
        ${scenario.path}
      </div>`;
              }).join("");
              scenariosHtml = `<div class="inheritance-scenarios">${scenarioItems}</div>`;
            }
            
            // Outcome or timeline
            const outcomeHtml = card.outcome ? `<p class="inheritance-outcome"><strong>Outcome:</strong> ${card.outcome}</p>` : "";
            const timelineHtml = card.timeline ? `<p class="inheritance-timeline">${card.timeline}</p>` : "";
            const feesHtml = card.fees ? `<p class="inheritance-fees">${card.fees}</p>` : "";
            
            // Action (for all cards now - action-first endings)
            const actionHtml = card.action 
              ? `<div class="dodont-strip"><div class="dodont-item dodont-do"><img src="/images/checkmark.svg" alt="" class="dodont-icon" aria-hidden="true" /><span>${card.action}</span></div></div>`
              : "";
            
            tiles.push(`    <div class="svc-compat__tile inheritance-tile inheritance-tile--${card.status}" id="${card.id}">
      <div class="svc-compat__header">
        <h3 class="svc-compat__title">${card.title}</h3>
        <span class="svc-chip ${statusInfo.class}">${statusInfo.text}</span>
      </div>
      ${metaHtml}
      ${whyHtml}
      ${prereqsHtml}
      ${stepsHtml}
      ${scenariosHtml}
      ${outcomeHtml}
      ${timelineHtml}
      ${feesHtml}
      ${actionHtml}
    </div>`);
          });
        }
        
        // Skip if no tiles
        if (tiles.length === 0) return "";
        
        return `
<section id="inheritance" class="service-section" aria-labelledby="inheritance-label">
  <h2 id="inheritance-label" class="feature-label">${sectionTitle}</h2>
${introHtml}  <div class="svc-compat__grid">
${tiles.join("\n")}
  </div>
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

      const renderPaymentMethods = () => {
        const paymentData = svc.payment_methods_limits;
        if (!paymentData || !Array.isArray(paymentData.methods)) return "";
        
        const heading = paymentData.heading || "Payment methods & limits";
        const methods = paymentData.methods;
        
        const methodCards = methods.map(method => {
          if (!method.available) {
            // Unavailable payment method - show disabled state with optional body text
            const bodyHtml = method.body ? `
        <p class="payment-card__body">${escapeHtml(method.body)}</p>` : "";
            
            return `
      <div class="payment-card payment-card--unavailable">
        <div class="payment-card__header">
          <h3 class="payment-card__title">${escapeHtml(method.name)}</h3>
          <span class="svc-chip svc-chip--notyet">Not available</span>
        </div>${bodyHtml}
      </div>`;
          }
          
          // Available payment method - show summary and details
          const summary = method.summary || {};
          const limits = method.limits || {};
          
          // Link fee to fees_scenarios if fee_link is provided
          // Use full path to avoid base href issues
          const feeValue = summary.fee || "N/A";
          const feeHtml = summary.fee_link 
            ? `<a href="/services/${slug}.html#${summary.fee_link}" class="stat-link">${escapeHtml(feeValue)}</a>`
            : escapeHtml(feeValue);
          
          const summaryStats = `
        <div class="payment-card__summary">
          <div class="payment-stat">
            <span class="stat-label">Fee</span>
            <span class="stat-value">${feeHtml}</span>
          </div>
          <div class="payment-stat">
            <span class="stat-label">Speed</span>
            <span class="stat-value">${escapeHtml(summary.speed || "N/A")}</span>
          </div>
          <div class="payment-stat">
            <span class="stat-label">Withdraw</span>
            <span class="stat-value">${escapeHtml(summary.withdraw || "N/A")}</span>
          </div>
        </div>`;
          
          // Best for hint (below stats)
          const bestForHtml = method.best_for ? `
        <p class="payment-card__best-for"><strong>Best for:</strong> ${escapeHtml(method.best_for)}</p>` : "";
          
          // Only render limits table if at least one meaningful limit exists
          const hasLimits = limits.min_per_tx || limits.max_per_tx || limits.max_per_day || 
                            limits.max_per_week || limits.withdraw_eligibility;
          
          let limitsDetailsHtml = "";
          if (hasLimits) {
            const limitsTable = `
        <table class="limits-table">
          <tbody>
            ${limits.min_per_tx ? `<tr><th>Min per transaction</th><td>${escapeHtml(limits.min_per_tx)}</td></tr>` : ""}
            ${limits.max_per_tx ? `<tr><th>Max per transaction</th><td>${escapeHtml(limits.max_per_tx)}</td></tr>` : ""}
            ${limits.max_per_day ? `<tr><th>Max per day</th><td>${escapeHtml(limits.max_per_day)}</td></tr>` : ""}
            ${limits.max_per_week ? `<tr><th>Max per week</th><td>${escapeHtml(limits.max_per_week)}</td></tr>` : ""}
            ${limits.withdraw_eligibility ? `<tr><th>Withdrawal eligibility</th><td>${escapeHtml(limits.withdraw_eligibility)}</td></tr>` : ""}
          </tbody>
        </table>`;
            
            limitsDetailsHtml = `
        <details class="payment-details">
          <summary>View limits & details</summary>
          <div>
            ${limitsTable}
          </div>
        </details>`;
          }
          
          return `
      <div class="payment-card">
        <div class="payment-card__header">
          <h3 class="payment-card__title">${escapeHtml(method.name)}</h3>
          <span class="svc-chip svc-chip--works">Available</span>
        </div>
        ${summaryStats}${bestForHtml}${limitsDetailsHtml}
      </div>`;
        }).join("");
        
        return `
<section id="payment-methods" class="service-section">
  <h2 class="feature-label">${heading}</h2>
  <div class="payment-cards">
${methodCards}
  </div>
</section>`;
      };

      const renderKeyFeatures = () => {
        const featuresData = svc.key_features;
        if (!featuresData || !Array.isArray(featuresData.features)) return "";
        
        const heading = featuresData.heading || "Key features";
        const features = featuresData.features;
        
        const featureTiles = features.map(feature => {
          // Render chips below title (similar to self_custody structure)
          const metaChips = [];
          if (feature.chips) {
            if (feature.chips.cost) metaChips.push(`<span class="migration-meta-chip">Cost: ${escapeHtml(feature.chips.cost)}</span>`);
          }
          const metaHtml = metaChips.length > 0 
            ? `<div class="migration-meta">${metaChips.join("")}</div>` 
            : "";
          
          // Support new bullet + footer format
          let contentHtml = "";
          if (Array.isArray(feature.bullets) && feature.bullets.length > 0) {
            // Render as bullet list
            const bulletItems = feature.bullets.map(bullet => `<li>${bullet}</li>`).join("");
            contentHtml = `<ul class="feature-tile__bullets">${bulletItems}</ul>`;
            
            // Add footer if present
            if (feature.footer) {
              contentHtml += `<p class="feature-tile__footer">${feature.footer}</p>`;
            }
          } else if (feature.description) {
            // Legacy format: paragraph description
            contentHtml = `<p class="feature-tile__description">${escapeHtml(feature.description)}</p>`;
          }
          
          // Add id attribute if present
          const idAttr = feature.id ? ` id="${escapeHtml(feature.id)}"` : "";
          
          return `
      <div class="feature-tile"${idAttr}>
        <h3 class="feature-tile__title">${escapeHtml(feature.title)}</h3>
        ${metaHtml}
        ${contentHtml}
      </div>`;
        }).join("");
        
        return `
<section id="key-features" class="service-section">
  <h2 class="feature-label">${heading}</h2>
  <div class="feature-grid">
${featureTiles}
  </div>
</section>`;
      };

      const renderCosts = () => {
        // Only render for Store it safely category
        if (svc.category !== "Store it safely") return "";
        
        const costsData = svc.costs;
        if (!costsData || typeof costsData !== 'object') return "";
        
        const sectionTitle = costsData.section_title || "Costs & ongoing obligations";
        
        // Render intro explanation (Jeff's voice: mechanism first)
        const introHtml = costsData.intro ? `<p class="costs-intro">${escapeHtml(costsData.intro)}</p>` : "";
        
        // Render summary stats box
        let summaryStatsHtml = "";
        if (costsData.summary_stats) {
          const stats = costsData.summary_stats;
          summaryStatsHtml = `
  <div class="costs-summary">
    ${stats.upfront ? `<div class="costs-summary__item">
      <span class="costs-summary__label">One-time</span>
      <span class="costs-summary__value">${escapeHtml(stats.upfront)}</span>
    </div>` : ''}
    ${stats.monthly ? `<div class="costs-summary__item costs-summary__item--highlight">
      <span class="costs-summary__label">Monthly</span>
      <span class="costs-summary__value">${escapeHtml(stats.monthly)}</span>
    </div>` : ''}
    ${stats.per_transaction ? `<div class="costs-summary__item">
      <span class="costs-summary__label">Per transaction</span>
      <span class="costs-summary__value">${escapeHtml(stats.per_transaction)}</span>
    </div>` : ''}
  </div>`;
        }
        
        let upfrontHtml = "";
        let ongoingHtml = "";
        
        // Render upfront costs block with highlights
        if (costsData.upfront && Array.isArray(costsData.upfront.items) && costsData.upfront.items.length > 0) {
          const upfrontItems = costsData.upfront.items.map(item => {
            const highlightClass = item.highlight ? ` costs-item--${item.highlight}` : "";
            const amountHtml = item.amount ? `<span class="costs-amount">${escapeHtml(item.amount)}</span>` : "";
            const noteHtml = item.note ? `<span class="costs-note">${escapeHtml(item.note)}</span>` : "";
            return `<li class="costs-item${highlightClass}">
      <div class="costs-item__main">
        <span class="costs-item__name">${escapeHtml(item.name)}</span>
        ${amountHtml}
      </div>
      ${noteHtml}
    </li>`;
          }).join("");
          
          upfrontHtml = `
    <div class="costs-card">
      <h3 class="costs-card__title">${escapeHtml(costsData.upfront.title || "What you pay once")}</h3>
      <ul class="costs-list">${upfrontItems}</ul>
    </div>`;
        }
        
        // Render ongoing costs block with highlights
        if (costsData.ongoing && Array.isArray(costsData.ongoing.items) && costsData.ongoing.items.length > 0) {
          const ongoingItems = costsData.ongoing.items.map(item => {
            const highlightClass = item.highlight ? ` costs-item--${item.highlight}` : "";
            const amountHtml = item.amount ? `<span class="costs-amount">${escapeHtml(item.amount)}</span>` : "";
            const noteHtml = item.note ? `<span class="costs-note">${escapeHtml(item.note)}</span>` : "";
            return `<li class="costs-item${highlightClass}">
      <div class="costs-item__main">
        <span class="costs-item__name">${escapeHtml(item.name)}</span>
        ${amountHtml}
      </div>
      ${noteHtml}
    </li>`;
          }).join("");
          
          ongoingHtml = `
    <div class="costs-card">
      <h3 class="costs-card__title">${escapeHtml(costsData.ongoing.title || "What you pay ongoing")}</h3>
      <ul class="costs-list">${ongoingItems}</ul>
    </div>`;
        }
        
        const costBlocksHtml = (upfrontHtml || ongoingHtml) ? `  <div class="costs-cards">
${upfrontHtml}${ongoingHtml}
  </div>\n` : "";
        
        // Render scenario cards with improved structure
        let scenariosHtml = "";
        if (Array.isArray(costsData.scenarios) && costsData.scenarios.length > 0) {
          const scenarioTiles = costsData.scenarios.map(scenario => {
            const anchorId = scenario.id || slugify(scenario.title || "");
            
            // Build scenario details
            const whatHtml = scenario.what ? `<p class="scenario-what">${escapeHtml(scenario.what)}</p>` : "";
            
            const detailsHtml = `
      <div class="scenario-details">
        ${scenario.cost ? `<div class="scenario-detail">
          <span class="scenario-detail__label">Cost</span>
          <span class="scenario-detail__value">${escapeHtml(scenario.cost)}</span>
        </div>` : ''}
        ${scenario.time ? `<div class="scenario-detail">
          <span class="scenario-detail__label">Time</span>
          <span class="scenario-detail__value">${escapeHtml(scenario.time)}</span>
        </div>` : ''}
        ${scenario.frequency ? `<div class="scenario-detail">
          <span class="scenario-detail__label">Frequency</span>
          <span class="scenario-detail__value">${escapeHtml(scenario.frequency)}</span>
        </div>` : ''}
      </div>`;
            
            return `
      <div class="scenario-card" id="${anchorId}">
        <h3 class="scenario-card__title">${escapeHtml(scenario.title)}</h3>
        ${whatHtml}
        ${detailsHtml}
      </div>`;
          }).join("");
          
          scenariosHtml = `  <div class="scenario-cards">
${scenarioTiles}
  </div>`;
        }
        
        if (!introHtml && !summaryStatsHtml && !costBlocksHtml && !scenariosHtml) return "";
        
        return `
<section id="costs" class="service-section section-costs">
  <h2 class="feature-label">${sectionTitle}</h2>
${introHtml}${summaryStatsHtml}${costBlocksHtml}${scenariosHtml}
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

      const renderSelfCustody = () => {
        const selfCustody = svc.self_custody || {};
        const tiles = Array.isArray(selfCustody.tiles) ? selfCustody.tiles : [];
        
        if (!tiles.length) return "";
        
        const heading = selfCustody.heading || "Self-custody: withdraw safely";
        const learnLabel = "Show steps";
        
        // Render tiles with same structure as Migration
        const tileItems = tiles.map(tile => {
          const tileId = tile.id || slugify(tile.title || "");
          
          // Resolve illustration: per-tile override takes precedence over registry
          let illustrationHtml = "";
          const imagePath = tile.image || COMPAT_ILLUSTRATIONS[tileId];
          if (imagePath) {
            const altText = tile.image_alt || COMPAT_ILLUSTRATION_ALTS[tileId] || tile.title;
            illustrationHtml = `
        <div class="svc-compat__illustration">
          <img src="${imagePath}" alt="${escapeHtml(altText)}" loading="lazy" />
        </div>`;
          }
          
          // Meta chips (time, cost, risk) from chips object
          const metaChips = [];
          if (tile.chips) {
            if (tile.chips.time) metaChips.push(`<span class="migration-meta-chip">Time: ${tile.chips.time}</span>`);
            if (tile.chips.cost) metaChips.push(`<span class="migration-meta-chip">Cost: ${tile.chips.cost}</span>`);
            if (tile.chips.risk) metaChips.push(`<span class="migration-meta-chip">Risk: ${tile.chips.risk}</span>`);
          }
          const metaHtml = metaChips.length > 0 
            ? `<div class="migration-meta">${metaChips.join("")}</div>` 
            : "";
          
          // Why explanation (visible above collapsible)
          const whyHtml = tile.why ? `<p class="svc-compat__why">${tile.why}</p>` : "";

          // Steps collapsible - use actions array for ordered steps
          let detailsContent = "";
          if (Array.isArray(tile.actions) && tile.actions.length > 0) {
            const stepsList = `<ol>${tile.actions.map(step => `<li>${step}</li>`).join("")}</ol>`;
            detailsContent = stepsList;

            // Append gotcha if present
            if (tile.gotcha) {
              detailsContent += `<p><strong>Gotcha:</strong> ${tile.gotcha}</p>`;
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
          <h3 class="svc-compat__title">${tile.title}</h3>
        </div>
        ${metaHtml}
        ${whyHtml}${detailsHtml}
      </div>`;
        }).join("");
        
        // Render micro-FAQ (same structure as fees_faq)
        let microFaqHtml = "";
        if (Array.isArray(selfCustody.micro_faqs) && selfCustody.micro_faqs.length > 0) {
          const validFaqs = selfCustody.micro_faqs
            .filter(faq => faq && hasContent(faq.q) && hasContent(faq.a))
            .slice(0, 4);
          
          if (validFaqs.length > 0) {
            const faqItems = validFaqs.map(faq => {
              return `    <details class="micro-faq-item">
      <summary>${faq.q}</summary>
      <div>
        <p>${faq.a}</p>
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
        
        return `
<section id="self-custody" class="service-section">
  <h2 class="feature-label">${heading}</h2>
  <div class="svc-compat__grid">
${tileItems}
  </div>${microFaqHtml}
</section>`;
      };

      // Generic tile-based section renderer (used for compat, recovery, etc.)
      const renderTileSection = (config) => {
        const tiles = Array.isArray(config.tiles) ? config.tiles : [];
        const explainers = Array.isArray(config.explainers) ? config.explainers : [];
        
        if (!tiles.length) return "";
        
        const heading = config.heading || "";
        const learnLabel = config.learnLabel || "Show steps";
        const sectionId = config.sectionId || "section";
        
        // Helper: convert Unicode symbols to HTML icons
        const renderBenefitWithIcons = (text) => {
          if (!text) return "";
          return text
            .replace(/·\s*/g, '</span> ') // Close span and remove separator
            .replace(/✓\s*/g, '<span class="icon-text-pair"><img src="/images/checkmark.svg" class="inline-icon" alt=""> ')
            .replace(/✗\s*/g, '<span class="icon-text-pair"><img src="/images/cross.svg" class="inline-icon" alt=""> ')
            .replace(/⚠\s*/g, '<span class="icon-text-pair"><img src="/images/warning.svg" class="inline-icon" alt=""> ')
            .replace(/$/, '</span>'); // Close final span
        };
        
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
            "works-caveat": "Works, with caveat",
            setup: "Needs setup",
            notyet: "Not yet",
            "not-working": "Not working"
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
          
          // Meta chips (time only for tiles)
          const metaChips = [];
          if (tile.chips && tile.chips.time) {
            metaChips.push(`<span class="migration-meta-chip">${tile.chips.time}</span>`);
          }
          const metaHtml = metaChips.length > 0 
            ? `<div class="migration-meta">${metaChips.join("")}</div>` 
            : "";
          
          // Find matching explainer
          const explainer = explainerMap[tile.id];
          
          // Pull "Why it matters" outside collapsible, keep How/Gotcha inside
          let whyHtml = "";
          let detailsContent = "";
          
          if (explainer && explainer.why) {
            whyHtml = `<p class="svc-compat__why">${explainer.why}</p>`;
            
            const howList = Array.isArray(explainer.how) && explainer.how.length > 0
              ? `<ol>${explainer.how.map(step => `<li>${step}</li>`).join("")}</ol>`
              : "";
            
            const gotchaHtml = explainer.gotcha ? `<p><strong>Gotcha:</strong> ${explainer.gotcha}</p>` : "";
            
            // Only include How/Gotcha in collapsible
            if (howList || gotchaHtml) {
              detailsContent = `${howList}${gotchaHtml}`;
            }
          }
          
          // Only render details if there's content for it
          const detailsHtml = detailsContent ? `
        <details class="compat-details">
          <summary data-open-text="Hide steps" data-closed-text="${learnLabel}">${learnLabel}</summary>
          <div>${detailsContent}
          </div>
        </details>` : "";
          
          return `
      <div class="svc-compat__tile" id="${tile.id || ''}">${illustrationHtml}
        <div class="svc-compat__header">
          <h3 class="svc-compat__title">${tile.title}</h3>
          <span class="${statusClass}">${statusText}</span>
        </div>
        ${metaHtml}
        <p class="svc-compat__benefit">${renderBenefitWithIcons(tile.benefit)}</p>
        ${whyHtml}
        ${noteHtml}${detailsHtml}
      </div>`;
        }).join("");
        
        return `
<section id="${sectionId}" class="service-section">
  ${heading ? `<h2 class="feature-label">${heading}</h2>` : ""}
  <div class="svc-compat__grid">
${tileItems}
  </div>
</section>`;
      };

      const renderCompatibility = () => {
        // New compatibility structure (hardware/OS/standards/integrations)
        const compat = svc.compatibility;
        if (compat && typeof compat === 'object') {
          const sectionTitle = compat.section_title || "Compatibility";
          const intro = compat.intro ? `<div class="feature-label sublabel">${escapeHtml(compat.intro)}</div>` : "";
          const cards = [];
          
          // A) Hardware & OS cards
          if (Array.isArray(compat.hardware_os)) {
            compat.hardware_os.forEach(card => {
              if (!card || !card.title) return;
              
              let cardContent = "";
              let statusChipHtml = "";
              
              // Device items (e.g., hardware wallet models) - with status chip in header
              if (Array.isArray(card.items) && card.items.length > 0) {
                const itemsList = card.items.map(item => {
                  // Extract status for chip in header
                  const statusClass = item.status === 'verified' ? 'works' : item.status === 'vendor-claimed' ? 'setup' : 'notyet';
                  const statusText = item.status === 'verified' ? 'Verified' : item.status === 'vendor-claimed' ? 'Vendor-claimed' : 'Unknown';
                  statusChipHtml = `<span class="svc-chip svc-chip--${statusClass}">${statusText}</span>`;
                  
                  return `<li><div class="compat-item-name">${escapeHtml(item.name)}</div>${item.notes ? `<div class="compat-item-note">${escapeHtml(item.notes)}</div>` : ''}</li>`;
                }).join("");
                cardContent = `<ul class="compat-items-list compat-items-list--devices">${itemsList}</ul>`;
              }
              
              // Platform list (e.g., iOS, Android, Desktop)
              if (Array.isArray(card.platforms) && card.platforms.length > 0) {
                const platformItems = card.platforms.map(platform => {
                  if (platform.support === 'no') {
                    return `<li><span class="compat-item-name">${escapeHtml(platform.name)}</span>${platform.notes ? ` <span class="compat-item-note">${escapeHtml(platform.notes)}</span>` : ''} <img src="/images/cross.svg" alt="" class="inline-icon compat-platform-icon" /></li>`;
                  }
                  const icon = platform.status === 'verified' ? '/images/checkmark.svg' : '/images/neutral.svg';
                  return `<li><span class="compat-item-name">${escapeHtml(platform.name)}</span> <span class="compat-version">${escapeHtml(platform.version || '')}</span> <img src="${icon}" alt="" class="inline-icon compat-platform-icon" /></li>`;
                }).join("");
                cardContent = `<ul class="compat-items-list compat-items-list--platforms">${platformItems}</ul>`;
              }
              
              // Connection methods (e.g., NFC, USB, QR) - with status chip
              if (Array.isArray(card.methods) && card.methods.length > 0) {
                // Find first verified method for status chip
                const verifiedMethod = card.methods.find(m => m.status === 'verified');
                if (verifiedMethod) {
                  const statusClass = 'works';
                  statusChipHtml = `<span class="svc-chip svc-chip--${statusClass}">Verified</span>`;
                }
                
                const methodItems = card.methods.filter(m => m.status !== 'not-supported').map(method => {
                  return `<li><strong>${escapeHtml(method.type)}</strong>${method.constraint ? `<br><span class="compat-item-note">${escapeHtml(method.constraint)}</span>` : ''}</li>`;
                }).join("");
                cardContent = `<ul class="compat-items-list">${methodItems}</ul>`;
              }
              
              if (cardContent) {
                // Use header structure with chip for device cards
                if (statusChipHtml) {
                  cards.push(`    <div class="payment-card" id="${card.id || ''}">
      <div class="payment-card__header">
        <h3 class="payment-card__title">${escapeHtml(card.title)}</h3>
        ${statusChipHtml}
      </div>
      ${cardContent}
    </div>`);
                } else {
                  cards.push(`    <div class="payment-card" id="${card.id || ''}">
      <h3 class="payment-card__title">${escapeHtml(card.title)}</h3>
      ${cardContent}
    </div>`);
                }
              }
            });
          }
          
          const hardwareOsHtml = cards.length > 0 ? `  <div class="payment-cards">
${cards.join("\n")}
  </div>\n` : "";
          
          // B) Standards & keys table
          let standardsHtml = "";
          if (compat.standards && Array.isArray(compat.standards.table)) {
            const rows = compat.standards.table.map(row => {
              const supportClass = row.support === 'Yes' ? 'yes' : row.support === 'Partial' ? 'partial' : 'no';
              const supportIcon = row.support === 'Yes' ? '/images/checkmark.svg' : row.support === 'Partial' ? '/images/neutral.svg' : '/images/cross.svg';
              return `        <tr>
          <td class="compat-table-standard">${escapeHtml(row.standard)}</td>
          <td class="compat-table-support compat-support--${supportClass}"><img src="${supportIcon}" alt="" class="inline-icon" /> ${escapeHtml(row.support)}</td>
          <td class="compat-table-notes">${escapeHtml(row.notes || '')}</td>
        </tr>`;
            }).join("\n");
            
            standardsHtml = `  <div class="compat-standards">
    <h3 class="compat-subsection-title">Bitcoin standards & keys</h3>
    <table class="compat-table">
      <thead>
        <tr>
          <th class="stat-label">Standard</th>
          <th class="stat-label">Support</th>
          <th class="stat-label">Notes</th>
        </tr>
      </thead>
      <tbody>
${rows}
      </tbody>
    </table>
  </div>\n`;
            
            // Advanced section (collapsible)
            if (compat.standards.advanced) {
              const adv = compat.standards.advanced;
              const advItems = [];
              if (adv.descriptors) {
                advItems.push(`<dt>Descriptors</dt><dd><span class="compat-support--${adv.descriptors.support === 'Yes' ? 'yes' : adv.descriptors.support === 'Partial' ? 'partial' : 'no'}">${escapeHtml(adv.descriptors.support)}</span> — ${escapeHtml(adv.descriptors.notes || '')}</dd>`);
              }
              if (adv.psbt) {
                advItems.push(`<dt>PSBT</dt><dd><span class="compat-support--${adv.psbt.support === 'Yes' ? 'yes' : adv.psbt.support === 'Partial' ? 'partial' : 'no'}">${escapeHtml(adv.psbt.support)}</span> — ${escapeHtml(adv.psbt.notes || '')}</dd>`);
              }
              if (adv.derivation_paths) {
                advItems.push(`<dt>Derivation paths</dt><dd><span class="compat-support--${adv.derivation_paths.support === 'Yes' || adv.derivation_paths.support === 'Standard' ? 'yes' : adv.derivation_paths.support === 'Partial' ? 'partial' : 'no'}">${escapeHtml(adv.derivation_paths.support)}</span> — ${escapeHtml(adv.derivation_paths.notes || '')}</dd>`);
              }
              if (adv.output_descriptors) {
                advItems.push(`<dt>Output descriptors</dt><dd><span class="compat-support--${adv.output_descriptors.support === 'Yes' ? 'yes' : adv.output_descriptors.support === 'Partial' ? 'partial' : 'no'}">${escapeHtml(adv.output_descriptors.support)}</span> — ${escapeHtml(adv.output_descriptors.notes || '')}</dd>`);
              }
              
              if (advItems.length > 0) {
                standardsHtml += `  <details class="compat-advanced">
    <summary>Show advanced</summary>
    <dl class="compat-advanced-list">
${advItems.join("\n")}
    </dl>
  </details>\n`;
              }
            }
          }
          
          // C) Works with (integrations)
          let integrationsHtml = "";
          if (compat.integrations && Array.isArray(compat.integrations.items) && compat.integrations.items.length > 0) {
            const heading = compat.integrations.heading || "Works with…";
            const intro = compat.integrations.intro ? `<div class="feature-label sublabel">${escapeHtml(compat.integrations.intro)}</div>` : "";
            
            const integrationCards = compat.integrations.items.map(item => {
              const statusClass = item.status === 'verified' ? 'works' : item.status === 'vendor-claimed' ? 'setup' : 'notyet';
              const statusText = item.status === 'verified' ? 'Verified' : item.status === 'vendor-claimed' ? 'Vendor-claimed' : 'Unknown';
              return `      <div class="payment-card">
        <div class="payment-card__header">
          <h3 class="payment-card__title">${escapeHtml(item.name)}</h3>
          <span class="svc-chip svc-chip--${statusClass}">${statusText}</span>
        </div>
        <p class="compat-integration-mode">${escapeHtml(item.mode)}</p>
        ${item.caveat ? `<p class="compat-integration-caveat">${escapeHtml(item.caveat)}</p>` : ''}
      </div>`;
            }).join("\n");
            
            integrationsHtml = `  <div class="compat-integrations">
    <h3 class="compat-subsection-title">${heading}</h3>
    ${intro}
    <div class="payment-cards">
${integrationCards}
    </div>
  </div>\n`;
          }
          
          // Skip entire section if no content
          if (!hardwareOsHtml && !standardsHtml && !integrationsHtml) return "";
          
          return `
<section id="compatibility" class="service-section" aria-labelledby="compatibility-label">
  <h2 id="compatibility-label" class="feature-label">${sectionTitle}</h2>
  ${intro}
${hardwareOsHtml}${standardsHtml}${integrationsHtml}
</section>`;
        }
        
        // Fallback to old tile-based compatibility (for services not yet migrated)
        return renderTileSection({
          tiles: svc.compat_tiles,
          explainers: svc.compat_explainers,
          heading: svc.compat_heading,
          learnLabel: svc.compat_learn_label,
          sectionId: "compat"
        });
      };

      const renderRecovery = () => renderTileSection({
        tiles: svc.recovery_tiles,
        explainers: svc.recovery_explainers,
        heading: svc.recovery_heading,
        learnLabel: svc.recovery_learn_label,
        sectionId: "recovery"
      });

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
        // CRITICAL: When adding trust cards to services, use ONLY these IDs
        // This registry ensures consistent icons and labels across all service pages
        const cardTypeMap = {
          "update": {
            label: "Last update",
            icon: "/images/update.svg"
          },
          "publisher": {
            label: "Publisher",
            icon: "/images/publisher.svg"
          },
          "source": {
            label: "Open source",
            icon: "/images/opensource.svg"
          },
          "activity": {
            label: "Development activity",
            icon: "/images/activity.svg"
          },
          "audit": {
            label: "Security audit",
            icon: "/images/audit.svg"
          },
          "custody": {
            label: "Custody & safeguarding",
            icon: "/images/insurance.svg"
          },
          "licenses": {
            label: "Licenses & registrations",
            icon: "/images/license.svg"
          },
          "security": {
            label: "Security & compliance",
            icon: "/images/security.svg"
          },
          "privacy": {
            label: "Privacy policy",
            icon: "/images/privacy.svg"
          },
          "terms": {
            label: "Terms & conditions",
            icon: "/images/license.svg"
          },
          "financials": {
            label: "Financials",
            icon: "/images/bitcoin-backed-loan.svg"
          },
          "proof-of-reserves": {
            label: "Proof of reserves",
            icon: "/images/proof-of-reserve.svg"
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
        payment_methods_limits: renderPaymentMethods,
        key_features: renderKeyFeatures,
        costs: renderCosts,
        privacy: renderPrivacy,
        inheritance: renderInheritance,
        compat: renderCompatibility,
        recovery: renderRecovery,
        migration: renderMigration,
        self_custody: renderSelfCustody,
        trust: renderTrustSection,
        profile: renderProfileSection,
      };

      // Track which sections actually rendered for Jump to navigation
      const renderedSections = [];
      
      // Section titles for mobile accordions
      const sectionTitles = {
        profile: "Profile",
        setup: (svc.category === "Store it safely" && svc.howto?.title) ? svc.howto.title : "Getting started",
        fees: "Fees: what you pay and when",
        payment_methods_limits: "Payment methods & limits",
        key_features: "Key features",
        costs: svc.costs?.section_title || "Costs & ongoing obligations",
        compat: (svc.compatibility && svc.compatibility.section_title) ? svc.compatibility.section_title : (svc.compat_heading || "Features"),
        recovery: svc.recovery_heading || "Recovery",
        self_custody: svc.self_custody?.heading || "Self-custody: withdraw safely",
        migration: `Move your ${svc.name} wallet or funds`,
        privacy: svc.privacy?.section_title || "Privacy & Safety",
        inheritance: svc.inheritance?.section_title || "Inheritance: pass it on safely",
        trust: "Release & Trust"
      };
      
      // Sections that should NOT be wrapped in accordions
      const excludeFromAccordion = new Set(['tldr']);
      
      for (const key of order) {
        const renderer = renderers[key];
        if (!renderer) continue;
        const block = renderer();
        if (block) {
          // Wrap in mobile accordion unless excluded
          if (!excludeFromAccordion.has(key) && sectionTitles[key]) {
            const wrappedBlock = `<details class="section-accordion">
  <summary>${sectionTitles[key]}</summary>
${block}
</details>`;
            sectionBlocks.push(wrappedBlock);
          } else {
            sectionBlocks.push(block);
          }
          renderedSections.push(key);
        }
      }

      // Build Jump to navigation based on rendered sections
      const jumpToMap = {
        setup: { id: 'setup', label: 'Setup' },
        fees: { id: 'fees', label: 'Fees' },
        payment_methods_limits: { id: 'payment-methods', label: 'Methods' },
        key_features: { id: 'key-features', label: 'Features' },
        costs: { id: 'costs', label: 'Costs' },
        compat: { id: (svc.compatibility && typeof svc.compatibility === 'object') ? 'compatibility' : 'compat', label: 'Compatibility' },
        recovery: { id: 'recovery', label: 'Recovery' },
        self_custody: { id: 'self-custody', label: 'Self-custody' },
        privacy: { id: 'privacy-safety', label: 'Privacy' },
        inheritance: { id: 'inheritance', label: 'Inheritance' },
        migration: { id: 'migration', label: 'Migration' },
        trust: { id: 'trust', label: 'Trust' }
      };
      
      // Build full path for hash links to avoid <base href> issues
      const pagePath = `/services/${slug}.html`;
      
      const jumpToPills = renderedSections
        .filter(key => jumpToMap[key])
        .map(key => {
          const { id, label } = jumpToMap[key];
          return `<a href="${pagePath}#${id}">${label}</a>`;
        });
      
      // Always add FAQs link (rendered outside BUILD block)
      if (Array.isArray(svc.faqs) && svc.faqs.length > 0) {
        jumpToPills.push(`<a href="${pagePath}#faq-heading">FAQs</a>`);
      }
      
      const jumpToHtml = jumpToPills.length > 0
        ? `\n<nav class="jump-nav" aria-label="Jump to">\n  ${jumpToPills.join(' • ')}\n</nav>`
        : '';

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
      
      // Replace Jump to navigation placeholder with actual nav
      html = html.replace('<!-- JUMP_TO_NAV -->', jumpToHtml);
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

    // Define the Service/SoftwareApplication as its own node with enriched fields
    // Use SoftwareApplication for wallets and apps, Service for exchanges/processors
    const isApp = ['Hot Wallet', 'Desktop wallet', 'Physical device (hardware wallet) + mobile app'].includes(svc.type_of_platform);
    
    const serviceJson = {
      "@context": "https://schema.org",
      "@type": isApp ? "SoftwareApplication" : "Service",
      "@id": url + "#service",
      "name": svc.name,
      "url": svc.website || url,
      "mainEntityOfPage": url + "#webpage"
    };
    
    // Add description (short version for better snippets)
    if (svc.description) {
      serviceJson.description = clamp(svc.description, 200);
    }
    
    // Add logo/image
    const logoPath = `/images/${svc.name.toLowerCase().replace(/\s+/g, '-')}.svg`;
    serviceJson.image = `https://buoybitcoin.com${logoPath}`;
    
    // Add category/serviceType
    if (svc.category) {
      if (isApp) {
        serviceJson.applicationCategory = svc.category;
      } else {
        serviceJson.serviceType = svc.category;
      }
    }
    
    // Add area served (countries)
    if (Array.isArray(svc.countries) && svc.countries.length > 0) {
      if (svc.countries.includes('WW')) {
        serviceJson.areaServed = "Worldwide";
      } else {
        serviceJson.areaServed = svc.countries.map(code => ({ "@type": "Country", "identifier": code }));
      }
    }
    
    // For apps: add operating system and download URLs
    if (isApp && svc.links) {
      const os = [];
      if (svc.links.ios) {
        os.push("iOS");
        serviceJson.downloadUrl = svc.links.ios; // Primary download
      }
      if (svc.links.android) {
        os.push("Android");
        if (!serviceJson.downloadUrl) serviceJson.downloadUrl = svc.links.android;
      }
      if (svc.links.desktop) {
        os.push("Windows");
        os.push("macOS");
        os.push("Linux");
      }
      if (os.length > 0) {
        serviceJson.operatingSystem = os.join(", ");
      }
    }
    
    // Add price/offers
    if (svc.price) {
      serviceJson.offers = {
        "@type": "Offer",
        "price": svc.price.includes('Free') || svc.price.includes('$0') ? "0" : svc.price.match(/\d+/)?.[0] || "0",
        "priceCurrency": "USD"
      };
    } else {
      // Most Bitcoin services are free to use
      serviceJson.offers = {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD"
      };
    }
    
    // Note: aggregateRating removed - only include when ratings are visibly displayed on page
    // Google requires on-page rating UI + review count to include aggregateRating in structured data
    
    // Add provider organization
    serviceJson.provider = {
      "@type": "Organization",
      "name": svc.name,
      "url": svc.website || url
    };
    
    // Add datePublished if we have founded_in
    if (svc.founded_in) {
      serviceJson.datePublished = `${svc.founded_in}-01-01`;
    }
    
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

    // Generate HowTo JSON-LD for "Getting started" section
    try {
      if (svc.howto && Array.isArray(svc.howto.steps) && svc.howto.steps.length > 0) {
        const howtoTitle = svc.howto.title || `Getting started with ${svc.name}`;
        const howtoUrl = `${url}#setup`;
        
        const howtoSchema = {
          "@context": "https://schema.org",
          "@type": "HowTo",
          "name": howtoTitle,
          "description": `Step-by-step guide to set up and start using ${svc.name}.`,
          "url": howtoUrl,
          "step": svc.howto.steps.map((step, idx) => {
            const stepSchema = {
              "@type": "HowToStep",
              "position": idx + 1,
              "name": step.title || `Step ${idx + 1}`,
              "text": Array.isArray(step.actions) ? step.actions.join(' ') : step.title
            };
            
            // Add time estimate if available
            if (step.chips && step.chips.time) {
              stepSchema.description = `Time: ${step.chips.time}`;
            }
            
            // Add step image if screenshot exists (e.g., /images/screenshots/phoenix-install.webp)
            if (step.id) {
              const stepName = step.id.replace(/^setup-/, '');
              const imagePath = `/images/screenshots/${slug}-${stepName}.webp`;
              const fullImagePath = path.join(ROOT, imagePath);
              
              try {
                fsSync.accessSync(fullImagePath);
                stepSchema.image = {
                  "@type": "ImageObject",
                  "url": `https://buoybitcoin.com${imagePath}`
                };
              } catch (err) {
                // Screenshot doesn't exist, skip image
              }
            }
            
            return stepSchema;
          })
        };
        
        // Add total time if available
        if (svc.howto.totalTime) {
          howtoSchema.totalTime = svc.howto.totalTime;
        }
        
        // Add estimated cost (most are free to start)
        howtoSchema.estimatedCost = {
          "@type": "MonetaryAmount",
          "currency": "USD",
          "value": "0"
        };
        
        html = html.replace("</head>", `<script type="application/ld+json">${JSON.stringify(howtoSchema)}</script></head>`);
      }
    } catch (e) {
      // fail-safe: skip HowTo schema on error
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
<!-- Mobile Section Accordions -->
<script>
(function() {
  // Desktop: force all accordions open
  if (window.innerWidth >= 768) {
    document.addEventListener('DOMContentLoaded', function() {
      document.querySelectorAll('.section-accordion').forEach(function(acc) {
        acc.setAttribute('open', '');
      });
    });
    return;
  }
  
  // Mobile: open accordion if hash points to element inside it
  function openAccordionForHash() {
    const hash = window.location.hash;
    if (!hash) return;
    
    try {
      const target = document.querySelector(hash);
      if (!target) return;
      
      // Find parent accordion
      const accordion = target.closest('.section-accordion');
      if (accordion && !accordion.open) {
        accordion.open = true;
      }
    } catch (e) {
      // Invalid selector, ignore
    }
  }
  
  // Run on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', openAccordionForHash);
  } else {
    openAccordionForHash();
  }
  
  // Run when hash changes (clicking jump links, back/forward)
  window.addEventListener('hashchange', openAccordionForHash);
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