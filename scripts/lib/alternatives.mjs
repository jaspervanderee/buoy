import { readFile } from "node:fs/promises";

const slugify = (s) =>
  s.toLowerCase()
   .replace(/&/g, " and ")
   .replace(/[^a-z0-9]+/g, "-")
   .replace(/^-+|-+$/g, "");

export function pickAlternatives(all, current, limit = 10) {
  if (!current?.category) return [];
  return all
    .filter(s => s.category === current.category && s.name !== current.name)
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, limit);
}

function renderHTML(current, alts) {
  const currentSlug = slugify(current.name);
  const list = alts.map(alt => {
    const altSlug = slugify(alt.name);
    const logo = `/images/${altSlug}.svg`;
    const brandUrl = `/services/${altSlug}.html`;
    const a = slugify(current.name);
    const b = slugify(alt.name);
    const canonical = [a, b].sort().join("-vs-");
    const compareUrl = `/${canonical}.html?services=${encodeURIComponent(current.name)},${encodeURIComponent(alt.name)}&category=${encodeURIComponent(current.category || '')}`;
    return `
      <li class="alt-item">
        <div class="logo-cell">
          <a class="service-link" href="${brandUrl}" aria-label="${alt.name}">
            <img src="${logo}" alt="${alt.name}" class="svg-icon" />
            <span class="visually-hidden">${alt.name}</span>
          </a>
          <a class="cta-button" href="${compareUrl}">Compare with ${current.name}</a>
        </div>
      </li>`;
  }).join("");

  const jsonld = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": `Alternatives to ${current.name}`,
    "itemListElement": alts.map((alt, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "item": {
        "@type": "Service",
        "@id": `https://buoybitcoin.com/services/${slugify(alt.name)}.html#service`,
        "name": alt.name,
        "url": `https://buoybitcoin.com/services/${slugify(alt.name)}.html`
      }
    }))
  };

  return `
<section class="alt-block" aria-labelledby="alt-heading">
  <h2 id="alt-heading">Alternatives to ${current.name}</h2>
  <ul class="alt-grid">${list}</ul>
</section>
<script type="application/ld+json">${JSON.stringify(jsonld)}</script>
<script>
(function(){
  try {
    const grid = document.querySelector('.alt-grid');
    if (!grid) return;
    function fetchUserCountry(){
      const cached = localStorage.getItem('userCountry');
      if (cached && cached !== 'ALL') return Promise.resolve(cached);
      return fetch('https://ipapi.co/json/').then(r=>r.json()).then(j=>{
        if (j && j.country_code) {
          localStorage.setItem('userCountry', j.country_code);
          return j.country_code;
        }
        return 'ALL';
      }).catch(()=> 'ALL');
    }

    fetchUserCountry().then(function(userCountry){
      return fetch('/data/services.json').then(r => r.json()).then(list => ({ list, userCountry }));
    }).then(({ list, userCountry }) => {
      const regionMappings = {
        "WW": [],
        "NA": ["US","CA","MX","BZ","CR","SV","GT","HN","NI","PA","AI","AG","AW","BS","BB","BQ","CU","CW","DM","DO","GD","GP","HT","JM","MQ","MS","PR","BL","KN","LC","MF","VC","SX","TT","TC","VG","VI"],
        "SA": ["AR","BO","BR","CL","CO","EC","GY","PY","PE","SR","UY","VE"],
        "EU": ["AL","AD","AT","BY","BE","BA","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IS","IE","IT","XK","LV","LI","LT","LU","MT","MD","MC","ME","NL","MK","NO","PL","PT","RO","RU","SM","RS","SK","SI","ES","SE","CH","UA","GB","VA"],
        "AF": ["DZ","AO","BJ","BW","BF","BI","CM","CV","CF","TD","KM","CD","CG","CI","DJ","EG","GQ","ER","SZ","ET","GA","GM","GH","GN","GW","KE","LS","LR","LY","MG","MW","ML","MR","MU","MA","MZ","NA","NE","NG","RW","ST","SN","SC","SL","SO","ZA","SS","SD","TZ","TG","TN","UG","ZM","ZW"],
        "AS": ["AF","AM","AZ","BH","BD","BT","BN","KH","CN","GE","IN","ID","IR","IQ","IL","JP","JO","KZ","KW","KG","LA","LB","MY","MV","MN","MM","NP","KP","OM","PK","PH","QA","SA","SG","KR","LK","SY","TW","TJ","TH","TL","TR","TM","AE","UZ","VN","YE"],
        "OC": ["AU","FJ","KI","MH","FM","NR","NZ","PW","PG","WS","SB","TO","TV","VU"]
      };
      function isServiceAvailable(service, country) {
        if (country === 'ALL') return true;
        const countries = service.countries || [];
        return countries.includes('WW') || countries.includes(country) || countries.some(code => (regionMappings[code] || []).includes(country));
      }
      function toNum(x){ const n = (typeof x === 'number') ? x : parseFloat(x); return Number.isFinite(n) ? n : NaN; }
      function ratingScore(svc){ if (!svc || !svc.app_ratings) return 0; const ios = toNum(svc.app_ratings.ios); const android = toNum(svc.app_ratings.android); const vals = [ios, android].filter(v => Number.isFinite(v)); if (vals.length === 0) return 0; return vals.reduce((a,b)=>a+b,0)/vals.length; }
      const nameToSvc = new Map((list || []).map(s => [String(s.name), s]));
      let items = Array.from(grid.querySelectorAll('li')).map(li => {
        const a = li.querySelector('.service-link');
        const name = a?.getAttribute('aria-label') || a?.textContent?.trim() || '';
        const svc = nameToSvc.get(name) || null;
        const r = ratingScore(svc);
        const avail = svc ? isServiceAvailable(svc, userCountry) : false;
        return { li, score: r, avail };
      });
      // Filter to available only (unless userCountry is ALL)
      if (userCountry !== 'ALL') {
        items = items.filter(it => it.avail);
      }
      // Sort by highest rating score
      items.sort((a,b) => b.score - a.score);
      // Rebuild list with top 5 only to guarantee hard cap
      const top = items.slice(0, 5);
      const frag = document.createDocumentFragment();
      top.forEach(it => { it.li.style.display = ''; frag.appendChild(it.li); });
      // Remove everything and append only top 5
      while (grid.firstChild) grid.removeChild(grid.firstChild);
      grid.appendChild(frag);
    }).catch(() => {});
  } catch (_) {}
})();
</script>`;
}

export function injectAlternatives(html, current, all) {
  const alts = pickAlternatives(all, current, 10);
  const block = (alts.length >= 2) ? renderHTML(current, alts) : "";
  return html.replace("<!-- ALTERNATIVES_BLOCK -->", block);
}


