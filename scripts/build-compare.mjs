/* eslint-env node */
/* eslint-disable no-useless-escape */
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA = path.join(ROOT, "data", "services.json");
const OUT_REDIRECTS = path.join(ROOT, "generated-compare-redirects.htaccess");

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

function htmlForPair(a, b, categoryLabel) {
  const aName = a.name;
  const bName = b.name;
  const title = `${aName} vs ${bName} — Which is better? | Buoy Bitcoin`;
  const desc = `Compare ${aName} and ${bName} (${categoryLabel}): fees, custody, features, and more.`;
  const canonical = `https://buoybitcoin.com/${canonicalPairSlug(aName, bName)}.html`;
  // Tiny head shim: if no query, set services=A,B and category
  const shim = `\n<script>\n(function(){\n  try {\n    var a = ${JSON.stringify(aName)};\n    var b = ${JSON.stringify(bName)};\n    var cat = ${JSON.stringify(categoryLabel)};\n    var p = new URLSearchParams(location.search);\n    if (!p.get('services')) p.set('services', a + ',' + b);\n    if (!p.get('category')) p.set('category', cat);\n    history.replaceState(null, '', location.pathname + '?' + p.toString());\n    window.__BUOY_COMPARE__ = [a,b];\n  } catch(e){}\n})();\n</script>`;

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
  <link rel="stylesheet" href="css/styles.css">
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
    about: [
      { "@type":"Organization", name: aName, url: a.website || undefined },
      { "@type":"Organization", name: bName, url: b.website || undefined }
    ]
  })}</script></head>
<body>
  <div class="container">
 <header>
  <div class="container">
    <div id="logo"><a href="/"><img src="images/buoy-logo-horizontal.svg" alt="Buoy Bitcoin logo"></a></div>
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
            <img src="images/global-white.svg" alt="Your Location" class="availability-icon" />
            <span>Your location</span>
          </div>
          <input type="text" id="country-search" placeholder="Type your country..." style="display:none;" />
          <ul class="dropdown-list"></ul>
        </div>

        <li>
          <a href="about.html">
            <img src="images/about.svg" alt="About Icon" />
            About
          </a>
        </li>
        <li>
  <a href="faq.html">
    <img src="images/faq.svg" alt="FAQ Icon" />
    FAQ
  </a>
</li>
<li>
  <a href="#donate" id="donate-link">
    <img src="images/lightning.svg" alt="Donate Icon" />
    Donate
  </a>
</li>
<li>
  <a data-feedback-fish href="javascript:void(0)">
    <img src="images/feedback.svg" alt="Feedback Icon" />
    Give us feedback
  </a>
</li>
<li>
  <a id="contact-link" href="mailto:support&#64;buoybitcoin.com">
    <img src="images/contact.svg" alt="Contact Icon"/>
    Contact
  </a>
</li>

      </ul>
    </section>
  </div>
</nav>

</header>
 <main>
  <div class="category-header">
    <h2 id="category-title">${aName} vs ${bName}</h2>
  </div>
<!-- BUILD:START -->

<div id="comparison-container">
  <div class="logo-row-sticky">
    <div class="feature-values logo-row" id="logo-row-container"></div>
  </div>
  <div id="comparison-table-wrapper"></div>
</div>

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
        <li><a href="what-is-bitcoin.html">Bitcoin</a></li>
        <li><a href="what-is-lightning.html">Lightning</a></li>
      </ul>
    </div>
    <div class="footer-column">
      <h3>Support</h3>
      <ul>
        <li><a href="mailto:support&#64;buoybitcoin.com">Contact</a></li>
        <li><a href="faq.html">FAQ</a></li>
        <li><a href="privacy.html">Privacy</a></li>
        <li><a href="terms.html">Terms of Service</a></li>
      </ul>
    </div>
    <!-- Add more columns here if needed -->
  </div>
</footer>

  <script src="js/script.js"></script>
  <script src="js/compare.js"></script>
</body>
</html>`;
}

(async () => {
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

  for (const [cat, list] of byCat.entries()) {
    // Sort by name for stable output
    const sorted = list.slice().sort((a,b) => a.name.localeCompare(b.name));
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const a = sorted[i];
        const b = sorted[j];
        const canonical = canonicalPairSlug(a.name, b.name);
        const html = htmlForPair(a, b, cat);
        await fs.writeFile(path.join(ROOT, `${canonical}.html`), html, "utf8");
        outFiles.push(`${canonical}.html`);
        // reverse rule b-vs-a (unsorted) -> a-vs-b (sorted canonical)
        const rev = `${slugify(b.name)}-vs-${slugify(a.name)}`;
        if (rev !== canonical) {
          redirectLines.push(`RewriteRule ^${rev}\.html$ /${canonical}.html [R=301,L]`);
        }
      }
    }
  }

  // Write redirects file
  const header = [
    "",
    "# BEGIN buoy compare redirects",
  ].join("\n");
  const footer = "\n# END buoy compare redirects\n";
  await fs.writeFile(OUT_REDIRECTS, header + redirectLines.join("\n") + footer, "utf8");

  console.log(`Built ${outFiles.length} compare pages`);
})();
