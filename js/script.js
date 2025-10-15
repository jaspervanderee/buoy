// SERVICE PAGE URL NORMALIZATION (strip query params on service pages)
(function() {
  try {
    // Only run on service pages, not compare pages
    if (window.__BUOY_SINGLE__ === true && window.location.search) {
      const cleanUrl = window.location.pathname + (window.location.hash || '');
      window.history.replaceState(null, '', cleanUrl);
    }
  } catch (e) {
    // Silent fail - URL normalization is not critical
  }
})();

// BUOY ANALYTICS
(function() {
  try {
    const params = new URLSearchParams(window.location.search);
    const noAnalytics = params.get('noanalytics') === '1';
    const dnt = (navigator.doNotTrack === '1' || window.doNotTrack === '1' || navigator.msDoNotTrack === '1');
    const analyticsDisabled = noAnalytics || dnt;

    // Persist session source from utm_source or path alias
    const ALIAS_MAP = {
      hn: 'hackernews',
      producthunt: 'producthunt',
      wip: 'wip',
      x: 'twitter',
      nostr: 'nostr',
      planb: 'planb',
      stacker: 'stackernews',
      bitcointalk: 'bitcointalk',
      bitcoinse: 'bitcoinse',
      bitco_in: 'bitco.in'
    };
    let source = sessionStorage.getItem('buoy_source');
    const utmSource = params.get('utm_source');
    if (utmSource) {
      sessionStorage.setItem('buoy_source', utmSource);
    } else if (!source) {
      const seg = (location.pathname.split('/')[1] || '').toLowerCase();
      const alias = ALIAS_MAP[seg];
      if (alias) sessionStorage.setItem('buoy_source', alias);
    }

    // Strip utm_* params from URL
    if ([...params.keys()].some(k => k.toLowerCase().startsWith('utm_'))) {
      const clean = new URL(window.location.href);
      [...clean.searchParams.keys()].forEach(k => {
        if (k.toLowerCase().startsWith('utm_')) clean.searchParams.delete(k);
      });
      const newSearch = clean.searchParams.toString();
      window.history.replaceState({}, '', clean.pathname + (newSearch ? '?' + newSearch : '') + clean.hash);
    }

    // Expose buoyTrack
    window.buoyTrack = function(name, props) {
      try {
        if (analyticsDisabled) return;
        const trackFn = (window.umami && typeof window.umami.track === 'function') ? window.umami.track : null;
        if (!trackFn) return;
        let src = sessionStorage.getItem('buoy_source');
        if (!src) {
          try {
            src = document.referrer ? new URL(document.referrer).host : 'direct';
          } catch (_e) {
            src = 'direct';
          }
        }
        const payload = Object.assign({ source: src, path: window.location.pathname }, props || {});
        trackFn(name, payload);
      } catch (_e) { /* no-op */ }
    };

    // Helper: compute and sanitize channel source label for mirrored event names
    function __buoyComputeSource() {
      try {
        let src = sessionStorage.getItem('buoy_source');
        if (!src) {
          try {
            src = document.referrer ? new URL(document.referrer).host : 'direct';
          } catch (_e) {
            src = 'direct';
          }
        }
        return src || 'direct';
      } catch (_e) { return 'direct'; }
    }
    function __buoySanitizeLabel(label) {
      try {
        return String(label || 'direct').toLowerCase().replace(/[^a-z0-9._-]+/g, '');
      } catch (_e) { return 'direct'; }
    }

    // Outbound link tracking
    if (!window.__buoyOutboundBound) {
      window.__buoyOutboundBound = true;
      document.addEventListener('click', function(e) {
        const a = e.target && e.target.closest ? e.target.closest('a') : null;
        if (!a) return;
        if (a.classList && a.classList.contains('wallet-link')) return; // skip wallet links
        const href = a.getAttribute('href') || '';
        if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
        try {
          const url = new URL(href, window.location.href);
          if (url.host && url.host !== window.location.host) {
            const text = (a.textContent || '').trim().slice(0, 120);
            if (typeof window.buoyTrack === 'function') window.buoyTrack('outbound_to_service', { href: url.href, link_text: text });
            // Mirrored outbound event by channel (minimal props)
            try {
              const src = __buoyComputeSource();
              const chan = __buoySanitizeLabel(src);
              if (chan && typeof window.buoyTrack === 'function') {
                window.buoyTrack('outbound_to_service__' + chan, { href: url.href });
              }
            } catch (_e) { /* no-op */ }
          }
        } catch (_err) { /* ignore */ }
      }, true);
    }

    // Compare pageview
    document.addEventListener('DOMContentLoaded', function() {
      try {
        if (location.pathname.endsWith('compare.html')) {
          if (typeof window.buoyTrack === 'function') window.buoyTrack('view_compare');
        }
        // Pageview + mirrored by channel (once per load)
        if (!window.__buoyPageviewTracked) {
          window.__buoyPageviewTracked = true;
          if (typeof window.buoyTrack === 'function') {
            window.buoyTrack('view_page');
            try {
              const src = __buoyComputeSource();
              const chan = __buoySanitizeLabel(src);
              if (chan) window.buoyTrack('view_page__' + chan);
            } catch (_e) { /* no-op */ }
          }
        }
      } catch (_e) { /* no-op */ }
    });
  } catch (_err) {
    // Fallback no-op
    window.buoyTrack = function() {};
  }
})();

const slugify = s => s.toLowerCase().replace(/&/g," and ").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");
const canonicalVsSlug = (aName, bName) => {
  const [a, b] = [slugify(aName), slugify(bName)];
  return [a, b].sort().join("-vs-"); // canonical path slug
};

const SERVICE_BASE = "/services"; // set to "" if brand pages live at site root



// Hamburger menu logic
const hamburger = document.querySelector('.hamburger');
const menu = document.querySelector('.menu');

hamburger.addEventListener('click', () => {
  menu.classList.toggle('active');
  hamburger.classList.toggle('active');
  document.body.classList.toggle('no-scroll');
});

// Close hamburger menu when clicking outside
document.addEventListener('click', (event) => {
  const menuIsOpen = menu.classList.contains('active');
  const clickedInsideMenu = document.querySelector(".menu-content").contains(event.target) || hamburger.contains(event.target);

  if (menuIsOpen && !clickedInsideMenu) {
    menu.classList.remove('active');
    hamburger.classList.remove('active');
    document.body.classList.remove('no-scroll');
  }
});



const regionMappings = {
  "WW": [], // Worldwide availability
  "NA": [ // North America + Caribbean + Central America
    "US", "CA", "MX", "BZ", "CR", "SV", "GT", "HN", "NI", "PA",  // Central America
    "AI", "AG", "AW", "BS", "BB", "BQ", "CU", "CW", "DM", "DO", "GD", "GP", "HT", "JM", "MQ",
    "MS", "PR", "BL", "KN", "LC", "MF", "VC", "SX", "TT", "TC", "VG", "VI"  // Caribbean
  ],
  "SA": ["AR", "BO", "BR", "CL", "CO", "EC", "GY", "PY", "PE", "SR", "UY", "VE"], // South America
  "EU": [
    "AL", "AD", "AT", "BY", "BE", "BA", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", 
    "GR", "HU", "IS", "IE", "IT", "XK", "LV", "LI", "LT", "LU", "MT", "MD", "MC", "ME", "NL", 
    "MK", "NO", "PL", "PT", "RO", "RU", "SM", "RS", "SK", "SI", "ES", "SE", "CH", "UA", "GB", "VA"
  ], // Europe
  "AF": [
    "DZ", "AO", "BJ", "BW", "BF", "BI", "CM", "CV", "CF", "TD", "KM", "CD", "CG", "CI", "DJ", 
    "EG", "GQ", "ER", "SZ", "ET", "GA", "GM", "GH", "GN", "GW", "KE", "LS", "LR", "LY", "MG", 
    "MW", "ML", "MR", "MU", "MA", "MZ", "NA", "NE", "NG", "RW", "ST", "SN", "SC", "SL", "SO", 
    "ZA", "SS", "SD", "TZ", "TG", "TN", "UG", "ZM", "ZW"
  ], // Africa
  "AS": [
    "AF", "AM", "AZ", "BH", "BD", "BT", "BN", "KH", "CN", "GE", "IN", "ID", "IR", "IQ", "IL", 
    "JP", "JO", "KZ", "KW", "KG", "LA", "LB", "MY", "MV", "MN", "MM", "NP", "KP", "OM", "PK", 
    "PH", "QA", "SA", "SG", "KR", "LK", "SY", "TW", "TJ", "TH", "TL", "TR", "TM", "AE", "UZ", 
    "VN", "YE"
  ], // Asia
  "OC": ["AU", "FJ", "KI", "MH", "FM", "NR", "NZ", "PW", "PG", "WS", "SB", "TO", "TV", "VU"], // Oceania
};

let selectedServicesMain = [];
let selectedServicesMenu = [];

// Legacy fallback map (used only if services.json isn't loaded yet)
const legacyCategoryMap = {
  "Buy Bitcoin": ["strike", "river", "swan", "relai", "hodlhodl", "bitonic", "peach", "bull bitcoin", "pocket", "bisq"],
  "Spend Bitcoin": ["breez", "aqua", "phoenix", "muun", "fold"],
  "Store it safely": ["bitkey", "sparrow", "wasabi", "unchained", "anchorwatch"],
  "Run my own node": ["umbrel", "mynode", "start9"],
  "Accept Bitcoin as a merchant": ["btc pay", "opennode", "lightspark"]
};

// Runtime mapping from services.json
let nameToCategory = new Map();
fetch("/data/services.json")
  .then(r => r.json())
  .then(list => {
    nameToCategory = new Map(
      (list || [])
        .filter(s => s && s.name && s.category)
        .map(s => [String(s.name).toLowerCase(), String(s.category)])
    );
  })
  .catch(() => {});

function getCategoryForService(name) {
  const lowerName = String(name).toLowerCase();
  // Prefer authoritative category from services.json
  if (nameToCategory && typeof nameToCategory.get === 'function') {
    const category = nameToCategory.get(lowerName);
    if (category) return category;
  }
  // Fallback to legacy map
  for (const [cat, svcs] of Object.entries(legacyCategoryMap)) {
    if (svcs.some(svc => svc.toLowerCase() === lowerName)) {
      return cat;
    }
  }
  return null;
}

function addSelected(serviceName, searchType) {
  const selected = searchType === 'main' ? selectedServicesMain : selectedServicesMenu;
  const max = window.innerWidth < 768 ? 2 : 3;
  if (selected.length >= max) {
    if (window.innerWidth < 768) {
      alert('On mobile, you can compare up to 2 services');
    } else {
      alert('You can compare up to 3 services');
    }
    return;
  }
  if (selected.length === 0) {
    selected.push(serviceName);
    // BUOY ANALYTICS
    if (typeof window.buoyTrack === 'function') {
      window.buoyTrack('select_service', {
        service: serviceName,
        category: getCategoryForService(serviceName) || 'unknown',
        place: (searchType === 'main' ? 'hero' : 'menu')
      });
    }
  } else {
    const currentCat = getCategoryForService(selected[0]);
    const newCat = getCategoryForService(serviceName);
    if (currentCat === newCat && currentCat !== null) {
      selected.push(serviceName);
      // BUOY ANALYTICS
      if (typeof window.buoyTrack === 'function') {
        window.buoyTrack('select_service', {
          service: serviceName,
          category: getCategoryForService(serviceName) || 'unknown',
          place: (searchType === 'main' ? 'hero' : 'menu')
        });
      }
    } else {
      alert('Sorry, you can only compare services from the same category!');
      return;
    }
  }
  updateSelectedUI(searchType);
  const btn = document.getElementById(`${searchType}-compare-btn`);
  if (selected.length >= 2) {
    btn.classList.add('active');
    btn.removeAttribute('disabled');
  } else {
    btn.classList.remove('active');
    btn.setAttribute('disabled', 'true');
  }
}

function removeSelected(serviceName, searchType) {
  const selected = searchType === 'main' ? selectedServicesMain : selectedServicesMenu;
  const index = selected.indexOf(serviceName);
  if (index > -1) selected.splice(index, 1);
  updateSelectedUI(searchType);
  const btn = document.getElementById(`${searchType}-compare-btn`);
  if (selected.length >= 2) {
    btn.classList.add('active');
    btn.removeAttribute('disabled');
  } else {
    btn.classList.remove('active');
    btn.setAttribute('disabled', 'true');
  }
}

function updateSelectedUI(searchType) {
  const container = document.getElementById(`${searchType}-selected-services`);
  container.innerHTML = (searchType === 'main' ? selectedServicesMain : selectedServicesMenu).map(s => `
    <div class="selected-chip">${s}<span class="remove">×</span></div>
  `).join('');
  container.querySelectorAll('.remove').forEach(el => {
    el.addEventListener('click', (event) => {
      event.stopPropagation();
      const chip = el.parentElement;
      const name = chip.textContent.replace('×', '').trim();
      removeSelected(name, searchType);
    });
  });
}

function getCategory(selected) {
  if (!selected || selected.length === 0) return "Compare Services";
  const first = getCategoryForService(selected[0]);
  if (!first) return "Compare Services";
  return selected.every(s => getCategoryForService(s) === first) ? first : "Compare Services";
}


// Function to check if a service is available in a country or region
function isServiceAvailable(service, userCountry) {
  return (
    service.countries.includes("WW") || // Worldwide available
    service.countries.includes(userCountry) || // Direct match
    service.countries.some(regionOrCountry =>
      regionMappings[regionOrCountry]?.includes(userCountry) // Region match
    )
  );
}

// Geolocation logic
async function getUserLocation() {
  try {
    const response = await fetch('https://ipapi.co/json/');
    const data = await response.json();
    return data.country_code;
  } catch (error) {
    console.error("Geolocation failed:", error);
    return null;
  }
}

async function updateServiceSpans(selectedCountryCode = null) {
  const manual = localStorage.getItem("userCountryManual") === "true";
  let countryCode = localStorage.getItem("userCountry") || selectedCountryCode;

  if (!manual && !countryCode) {
    countryCode = await getUserLocation();
    if (countryCode) {
      localStorage.setItem("userCountry", countryCode);
    }
  }

  if (!countryCode) return;

  // ✅ Add explicit handling for "ALL"
  if (countryCode === "ALL") {
    await showAllServices();
    return;
  }

  // Existing logic below:
  try {
    const response = await fetch("/data/services.json");
    if (!response.ok) throw new Error(`Failed to load services.json (Status: ${response.status})`);

    const services = await response.json();

    document.querySelectorAll(".card").forEach(card => {
      const serviceName = card.querySelector("img").alt.toLowerCase();
      const service = services.find(s => s.name.toLowerCase() === serviceName);

      if (service) {
        const span = card.querySelector("span");
        const isAvailable = isServiceAvailable(service, countryCode);

        if (isAvailable) {
          card.style.display = "block";
          span.innerHTML = "";

          let featuresList = getFeaturesForCountry(service, countryCode);
          const positive = featuresList.filter(f => f.status === 'positive')[0]; // First positive
          const negative = featuresList.filter(f => f.status === 'negative')[0]; // First negative
          featuresList = [positive, negative].filter(Boolean); // Combine and remove any undefined

          if (featuresList.length > 0) {
            span.innerHTML = featuresList.map(f => {
              const icon = f.status === 'positive' ? 'checkmark.svg' : 'cross.svg';
              return `<div class="feature-item">
                        <img src="/images/${icon}" alt="Feature Icon" class="checkmark-icon" /> ${f.text}
                      </div>`;
            }).join("");
          } else {
            span.innerHTML = `<div class="feature-item">
                                <img src="/images/cross.svg" alt="Cross" class="checkmark-icon" /> No specific features available
                              </div>`;
          }
        } else {
          card.style.display = "none";
        }
      }
    });

  } catch (error) {
    console.error("Error updating service availability:", error);
  }
}




function getFeaturesForCountry(service, userCountry) {
  if (!service.features) return [];

  // Step 1: Check for exact country-specific features
  const countryFeatures = service.features[userCountry];
  if (countryFeatures && countryFeatures.length > 0) {
    return countryFeatures;
  }

  // Step 2: Check for region-specific features if no direct match
  for (const [regionCode, countries] of Object.entries(regionMappings)) {
    if (countries.includes(userCountry)) {
      const regionFeatures = service.features[regionCode];
      if (regionFeatures && regionFeatures.length > 0) {
        return regionFeatures;
      }
    }
  }

  // Step 3: Fallback to worldwide features
  const worldwideFeatures = service.features["WW"];
  return worldwideFeatures || [];
}



// Run the function on page load
document.addEventListener("DOMContentLoaded", async () => {
  await updateServiceSpans();
});

document.addEventListener("DOMContentLoaded", async () => {
    const dropdown = document.querySelector('.custom-dropdown');
    if (!dropdown) return;

    const dropdownLabel = document.getElementById("dropdown-label");
const dropdownList = dropdown.querySelector('.dropdown-list');
const searchInput = document.getElementById("country-search");






    try {
        const response = await fetch("/data/countries.json");
        if (!response.ok) throw new Error(`Failed to load countries.json (Status: ${response.status})`);

        const countries = await response.json();

        // Add "Use my location" at the top
        const useGeoItem = document.createElement("li");
        useGeoItem.setAttribute("data-country", "__USE_GEO__");
        useGeoItem.innerHTML = `<span class="flag-icon"></span> Use my location`;
        dropdownList.appendChild(useGeoItem);

        // Add "Show All Services" next
        const showAllItem = document.createElement("li");
        showAllItem.setAttribute("data-country", "ALL");
        showAllItem.innerHTML = `<span class="flag-icon"></span> Show All Services`;
        dropdownList.appendChild(showAllItem);

        // Populate countries
        countries.forEach(country => {
            const listItem = document.createElement("li");
            listItem.setAttribute("data-country", country.code);
            listItem.innerHTML = `<span class="flag-icon flag-icon-${country.code.toLowerCase()}"></span> ${country.name}`;
            dropdownList.appendChild(listItem);
        });

searchInput.addEventListener("input", () => {
  const query = searchInput.value.toLowerCase();
  const items = dropdownList.querySelectorAll("li");

  items.forEach(item => {
    const country = item.textContent.toLowerCase();
    item.style.display = country.includes(query) ? "block" : "none";
  });
});

searchInput.addEventListener("focus", () => {
  const query = searchInput.value.toLowerCase();
  const items = dropdownList.querySelectorAll("li");

  items.forEach(item => {
    const country = item.textContent.toLowerCase();
    item.style.display = country.includes(query) ? "block" : "none";
  });

  dropdown.classList.add("active"); // ✅ show the list again
});


    } catch (error) {
        console.error("Error loading country list:", error);
    }

    dropdownLabel.addEventListener("click", (event) => {
  event.stopPropagation();
  dropdown.classList.add("active"); // always open dropdown
  dropdownLabel.style.display = "none";
  searchInput.style.display = "block";
  searchInput.focus();
});


 dropdownList.addEventListener('click', async (event) => {
    const selectedItem = event.target.closest('li');
    if (!selectedItem) return;

    const countryCode = selectedItem.dataset.country;
    const countryName = selectedItem.textContent.trim();
    const flagIcon = selectedItem.querySelector('.flag-icon')?.outerHTML || '';

    // Handle "Use my location"
    if (countryCode === "__USE_GEO__") {
      localStorage.removeItem("userCountryManual");
      localStorage.removeItem("userCountry");
      dropdown.classList.remove('active');
      await updateServiceSpans();
      return;
    }

    // Update dropdown label
    dropdownLabel.innerHTML = `${flagIcon} ${countryName}`;
    searchInput.style.display = "none";
dropdownLabel.style.display = "flex";
searchInput.value = "";

    dropdown.classList.remove('active');

    localStorage.setItem("userCountry", countryCode);
    localStorage.setItem("userCountryManual", "true");

    // Await the function to ensure features update before moving on
    if (countryCode === "ALL") {
        await showAllServices();
    } else {
        await updateServiceSpans(countryCode);
    }
});


    document.addEventListener('click', (event) => {
        if (!dropdown.contains(event.target)) {
            dropdown.classList.remove('active');
        }
    });
});

async function showAllServices() {
    try {
        const response = await fetch("/data/services.json");
        if (!response.ok) throw new Error(`Failed to load services.json (Status: ${response.status})`);

        const services = await response.json();

        document.querySelectorAll(".card").forEach(card => {
            const serviceName = card.querySelector("img").alt.toLowerCase();
            const service = services.find(s => s.name.toLowerCase() === serviceName);

            if (service) {
                card.style.display = "block"; // Show all services

                const span = card.querySelector("span");
                let featuresList = getFeaturesForCountry(service, "WW"); // Fetch WW features
                const positive = featuresList.filter(f => f.status === 'positive')[0];
                const negative = featuresList.filter(f => f.status === 'negative')[0];
                featuresList = [positive, negative].filter(Boolean);

                // Display WW features or fallback message
                span.innerHTML = featuresList.length > 0 
                    ? featuresList.map(f => `<div class="feature-item">
                        <img src="/images/${f.status === 'positive' ? 'checkmark.svg' : 'cross.svg'}" alt="Feature Icon" class="checkmark-icon" /> ${f.text}
                      </div>`).join("")
                    : `<div class="feature-item">
                        <img src="/images/cross.svg" alt="Cross" class="checkmark-icon" /> No worldwide features available
                      </div>`;
            }
        });
    } catch (error) {
        console.error("Error loading services for Show All:", error);
    }
}




// Ensure compare functionality works
document.querySelectorAll(".category").forEach(category => {
  const compareButton = category.querySelector(".compare-btn");
  let selectedCards = [];
  let previousCount = 0; // track previous selection count to debounce nudges

  category.querySelectorAll(".card").forEach(card => {
    const selectCircle = document.createElement("div");
    selectCircle.classList.add("select-circle");
    card.appendChild(selectCircle);

    selectCircle.addEventListener("click", (event) => {
      event.stopPropagation();
      const serviceName = card.querySelector("img").alt;

      if (selectedCards.includes(serviceName)) {
        selectedCards = selectedCards.filter(name => name !== serviceName);
        card.classList.remove("selected");
      } else {
        const maxSelection = window.innerWidth < 768 ? 2 : 3;
        if (selectedCards.length >= maxSelection) return;

        selectedCards.push(serviceName);
        card.classList.add("selected");
        // BUOY ANALYTICS
        if (typeof window.buoyTrack === 'function') {
          window.buoyTrack('select_service', {
            service: serviceName,
            category: getCategoryForService(serviceName) || 'unknown',
            place: 'grid'
          });
        }
      }

      updateCompareButton();
      handleNudge();
    });
  });

  // Update the compare button state
  function updateCompareButton() {
    if (selectedCards.length >= 2) {
      compareButton.classList.add("active");
      compareButton.removeAttribute("disabled");
    } else {
      compareButton.classList.remove("active");
      compareButton.setAttribute("disabled", "true");
    }
  }

  // Pulse compare button and ripple other dots when entering single-selection state
  function handleNudge() {
    const count = selectedCards.length;
    if (count === 1 && previousCount !== 1) {
      compareButton.classList.add('hint');
      const circles = category.querySelectorAll('.card .select-circle');
      circles.forEach(circle => {
        const parentCard = circle.closest('.card');
        if (!parentCard.classList.contains('selected')) {
          circle.classList.add('nudge');
        }
      });
      setTimeout(() => {
        circles.forEach(circle => circle.classList.remove('nudge'));
      }, 1250);
    } else if (count === 0 || count >= 2) {
      compareButton.classList.remove('hint');
    }
    previousCount = count;
  }

  compareButton.addEventListener("click", () => {
    if (selectedCards.length < 2) return;
  
    const categoryTitle = category.querySelector("h2")?.innerText ?? "Compare Services";
  
    if (selectedCards.length === 2) {
      const left = selectedCards[0];
      const right = selectedCards[1];
      const canonical = canonicalVsSlug(left, right);
      const url = `/compare/${canonical}.html?services=${encodeURIComponent(left)},${encodeURIComponent(right)}&category=${encodeURIComponent(getCategory(selectedCards))}`;
      sessionStorage.setItem("clearSelectedAfterCompare", "true");
      window.location.href = url; // static 2-up
      return;
    }
  
    // 3 selected → keep dynamic
const compareURL = `compare.html?services=${selectedCards.join(",")}&category=${encodeURIComponent(categoryTitle)}`;
sessionStorage.setItem("clearSelectedAfterCompare", "true");
window.location.href = compareURL; 
  });  
});

// ✅ Handle clicking on a card to go to the service detail view
document.querySelectorAll(".card").forEach(card => {
  card.addEventListener("click", (e) => {
    // Don't navigate if clicking the compare select circle
    if (e.target.closest(".select-circle")) return;

    const serviceName = card.querySelector("img").alt;
    const slug = slugify(serviceName);
    window.location.href = `${SERVICE_BASE}/${slug}.html`;    
  });
});


// Search function in menu
// BUOY ANALYTICS: shared servicesCache for searches
let servicesCache = null; // shared across menu and main search

document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("menu-search");
  const searchBtn = document.getElementById("search-btn");
  const suggestionsBox = document.getElementById("search-suggestions");

  searchInput.addEventListener("input", async () => {
    const query = searchInput.value.trim().toLowerCase();
    if (!query) {
      suggestionsBox.style.display = "none";
      return;
    }

    if (!servicesCache) {
      const res = await fetch("/data/services.json");
      servicesCache = await res.json();
    }
    const matches = servicesCache
      .map(s => s.name)
      .filter(name => name.toLowerCase().includes(query));

  if (matches.length === 0) {
    suggestionsBox.style.display = "none";
    return;
  }

  suggestionsBox.innerHTML = matches.map(name => `
    <div class="suggestion-item">
      <span class="suggestion-name">${name}</span>
      <svg class="select-circle ${selectedServicesMenu.includes(name) ? 'selected' : ''}" width="28" height="28" viewBox="0 0 28 28"><circle cx="14" cy="14" r="13" stroke="lightgrey" stroke-width="2" fill="white"/></svg>
    </div>
  `).join("");
  suggestionsBox.style.display = "block";
});

// Navigate on click
suggestionsBox.addEventListener("click", (e) => {
  const item = e.target.closest(".suggestion-item");
  if (!item) return;
  const serviceName = item.querySelector(".suggestion-name").textContent;
  const circle = item.querySelector('.select-circle');
  if (e.target.closest('.select-circle')) {
    if (circle.classList.contains('selected')) {
      circle.classList.remove('selected');
      removeSelected(serviceName, 'menu');
    } else {
      circle.classList.add('selected');
      addSelected(serviceName, 'menu');
    }
    searchInput.value = '';
    setTimeout(() => { suggestionsBox.style.display = 'none'; }, 300);
  } else {
    const slug = slugify(serviceName);
    // BUOY ANALYTICS
    if (typeof window.buoyTrack === 'function') {
      const qLen = (searchInput && searchInput.value ? searchInput.value.length : 0);
      window.buoyTrack('search_used', { q_len: qLen, place: 'menu' });
    }
window.location.href = `${SERVICE_BASE}/${slug}.html`;
  }
});


  if (!searchInput || !searchBtn) return;

  searchInput.addEventListener("keypress", (e) => {
   if (e.key === "Enter") searchBtn.click();
   });

   searchBtn.addEventListener("click", async () => {
    const query = searchInput.value.trim().toLowerCase();
    if (!query) return;

    if (!servicesCache) {
      const res = await fetch("/data/services.json");
      servicesCache = await res.json();
    }

    const match = servicesCache.find(s => s.name.toLowerCase().includes(query));
    if (match) {
      // BUOY ANALYTICS
      if (typeof window.buoyTrack === 'function') {
        window.buoyTrack('search_used', { q_len: query.length, place: 'menu' });
      }
      const slug = slugify(match.name);
window.location.href = `${SERVICE_BASE}/${slug}.html`;
    } else {
      alert("Service not found. Please try another name.");
    }
  });
});

window.addEventListener("pageshow", () => {
  if (sessionStorage.getItem("clearSelectedAfterCompare") === "true") {
    sessionStorage.removeItem("clearSelectedAfterCompare");

    document.querySelectorAll(".card.selected").forEach(card => {
      card.classList.remove("selected");
    });

    document.querySelectorAll(".compare-btn").forEach(btn => {
      btn.classList.remove("active");
      btn.setAttribute("disabled", "true");
      btn.classList.remove("hint");
    });
  }
});

// ------------------------------
// Donate Button / Lightning Widget
// ------------------------------
document.addEventListener("DOMContentLoaded", () => {
  const donateLink = document.getElementById("donate-link");
  if (!donateLink) return;

  const isDesktop = window.innerWidth >= 1024;
  const lightningAddress = "quasarcolumba@strike.me";
  const encodedAddress = encodeURIComponent(`lightning:${lightningAddress}`);
  
  // Create the overlay and widget elements
  const overlay = document.createElement("div");
  overlay.id = "donate-widget-overlay";
  overlay.innerHTML = `
    <div id="donate-widget">
      <span class="close-widget">&times;</span>
      ${isDesktop ? `
        <p>Send sats to</p>
        <p class="lightning-address">${lightningAddress}</p>
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodedAddress}" alt="Lightning QR" />
        <p><a href="lightning:${lightningAddress}" class="wallet-link">Open in wallet</a></p>
      ` : `
        <p>Support this project</p>
        <a href="lightning:${lightningAddress}" class="mobile-donate-btn wallet-link">Open Lightning Wallet</a>
      `}
    </div>`;
  document.body.appendChild(overlay);

  // Create thank you notification element
  const notification = document.createElement("div");
  notification.className = "thank-you-notification";
  notification.textContent = "Thank you for your support! ⚡️";
  document.body.appendChild(notification);

  // Handle wallet link clicks
  document.querySelectorAll('.wallet-link').forEach(link => {
    link.addEventListener('click', () => {
      // Store timestamp when user left to wallet
      sessionStorage.setItem('donationAttempted', Date.now());
      overlay.classList.remove('show');
      // BUOY ANALYTICS
      if (typeof window.buoyTrack === 'function') {
        window.buoyTrack('donate_click', { method: 'wallet_link' });
      }
    });
  });

  // Check if user is returning from wallet
  if (document.visibilityState === 'visible' && sessionStorage.getItem('donationAttempted')) {
    const attemptTime = parseInt(sessionStorage.getItem('donationAttempted'));
    const timeElapsed = Date.now() - attemptTime;
    
    // Only show thank you if returning within 5 minutes
    if (timeElapsed < 300000) { // 5 minutes in milliseconds
      notification.classList.add('show');
      setTimeout(() => {
        notification.classList.remove('show');
      }, 3000); // Hide after 3 seconds
    }
    sessionStorage.removeItem('donationAttempted');
  }

  // Open widget on donate click
  donateLink.addEventListener("click", (e) => {
    e.preventDefault();
    // BUOY ANALYTICS
    if (typeof window.buoyTrack === 'function') {
      window.buoyTrack('donate_click', { method: 'open_widget' });
    }
    overlay.classList.add("show");
  });

  // Close handlers
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay || e.target.classList.contains("close-widget")) {
      overlay.classList.remove("show");
    }
  });

  // Listen for page visibility changes
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && sessionStorage.getItem('donationAttempted')) {
      const attemptTime = parseInt(sessionStorage.getItem('donationAttempted'));
      const timeElapsed = Date.now() - attemptTime;
      
      // Only show thank you if returning within 5 minutes
      if (timeElapsed < 300000) { // 5 minutes in milliseconds
        notification.classList.add('show');
        setTimeout(() => {
          notification.classList.remove('show');
        }, 3000); // Hide after 3 seconds
      }
      sessionStorage.removeItem('donationAttempted');
    }
  });
});

// Action buttons smooth scroll
/*
document.querySelectorAll('.action-button').forEach(button => {
  button.addEventListener('click', () => {
    const targetId = button.getAttribute('data-target');
    const targetSection = document.getElementById(targetId);
    if (targetSection) {
      // Get the h2 element within the target section
      const targetHeader = targetSection.closest('.category').querySelector('.category-header');
      
      // Calculate position accounting for fixed header
      const headerHeight = document.querySelector('header').offsetHeight;
      const buffer = 20; // Additional space above the title
      
      const elementPosition = targetHeader.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerHeight - buffer;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  });
});
*/


// Feedback Bubble Creation
document.addEventListener('DOMContentLoaded', function() {
  const bubble = document.createElement('div');
  bubble.className = 'feedback-bubble';
  bubble.setAttribute('data-feedback-fish', '');

  const img = document.createElement('img');
  img.src = '/images/feedback.svg';
  img.alt = 'Give Feedback';

  bubble.appendChild(img);
  document.body.appendChild(bubble);

  // BUOY ANALYTICS
  bubble.addEventListener('click', function() {
    if (typeof window.buoyTrack === 'function') {
      window.buoyTrack('feedback_click');
    }
  });
});







// Main search functionality
const mainSearchInput = document.getElementById('main-search');
const mainSearchBtn = document.getElementById('main-search-btn');
const mainSearchSuggestions = document.getElementById('main-search-suggestions');

if (mainSearchInput && mainSearchBtn && mainSearchSuggestions) {
  mainSearchInput.addEventListener('input', async function(e) {
    const query = e.target.value.trim().toLowerCase();
    if (!query) {
      mainSearchSuggestions.style.display = 'none';
      return;
    }

    if (!servicesCache) {
      const res = await fetch("/data/services.json");
      servicesCache = await res.json();
    }

    const suggestions = servicesCache
      .filter(service => 
        service.name.toLowerCase().includes(query)
      )
      .sort((a, b) => {
        // If one name starts with query and the other doesn't, prioritize the one that does
        const aStartsWith = a.name.toLowerCase().startsWith(query);
        const bStartsWith = b.name.toLowerCase().startsWith(query);
        if (aStartsWith && !bStartsWith) return -1;
        if (!aStartsWith && bStartsWith) return 1;
        return a.name.localeCompare(b.name); // Alphabetical order for equal priority
      })
      .slice(0, 2); // Limit to 2 suggestions

    mainSearchSuggestions.innerHTML = '';
    if (suggestions.length > 0) {
      suggestions.forEach(service => {
        const div = document.createElement('div');
        div.className = 'suggestion-item';
        div.innerHTML = `
          <span class="suggestion-name">${service.name}</span>
          <svg class="select-circle ${selectedServicesMain.includes(service.name) ? 'selected' : ''}" width="28" height="28" viewBox="0 0 28 28"><circle cx="14" cy="14" r="13" stroke="lightgrey" stroke-width="2" fill="white"/></svg>
        `;
        div.addEventListener('click', (e) => {
          const circle = div.querySelector('.select-circle');
          if (e.target.closest('.select-circle')) {
            if (circle.classList.contains('selected')) {
              circle.classList.remove('selected');
              removeSelected(service.name, 'main');
            } else {
              circle.classList.add('selected');
              addSelected(service.name, 'main');
            }
            mainSearchInput.value = '';
            setTimeout(() => { mainSearchSuggestions.style.display = 'none'; }, 300);
          } else {
            const slug = slugify(service.name);
            // BUOY ANALYTICS
            if (typeof window.buoyTrack === 'function') {
              const qLen = (mainSearchInput && mainSearchInput.value ? mainSearchInput.value.length : 0);
              window.buoyTrack('search_used', { q_len: qLen, place: 'main' });
            }
            window.location.href = `${SERVICE_BASE}/${slug}.html`;
          }
        });
        mainSearchSuggestions.appendChild(div);
      });
      mainSearchSuggestions.style.display = 'block';
    } else {
      mainSearchSuggestions.style.display = 'none';
    }
  });

  mainSearchBtn.addEventListener('click', async function() {
    const query = mainSearchInput.value.trim().toLowerCase();
    if (!query) return;

    if (!servicesCache) {
      const res = await fetch("/data/services.json");
      servicesCache = await res.json();
    }

    const match = servicesCache.find(s => s.name.toLowerCase().includes(query));
    if (match) {
      // BUOY ANALYTICS
      if (typeof window.buoyTrack === 'function') {
        window.buoyTrack('search_used', { q_len: query.length, place: 'main' });
      }
      const slug = slugify(match.name);
      window.location.href = `${SERVICE_BASE}/${slug}.html`;
    } else {
      alert("Service not found.");
    }
  });

  // Close suggestions when clicking outside
  document.addEventListener('click', function(e) {
    if (!mainSearchInput.contains(e.target) && !mainSearchBtn.contains(e.target)) {
      mainSearchSuggestions.style.display = 'none';
    }
  });

  // Handle keyboard navigation
  mainSearchInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      const firstSuggestion = mainSearchSuggestions.firstChild;
      if (firstSuggestion) {
        firstSuggestion.click();
      }
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const mainBtn = document.getElementById('main-compare-btn');
  if (mainBtn) {
    mainBtn.addEventListener('click', () => {
      if (selectedServicesMain.length < 2) return;
      const category = getCategory(selectedServicesMain);
    
      if (selectedServicesMain.length === 2) {
        const left = selectedServicesMain[0];
        const right = selectedServicesMain[1];
        const canonical = canonicalVsSlug(left, right);
        const url = `/compare/${canonical}.html?services=${encodeURIComponent(left)},${encodeURIComponent(right)}&category=${encodeURIComponent(category)}`;
        sessionStorage.setItem("clearSelectedAfterCompare", "true");
        window.location.href = url; // static 2-up
        return;
      }

      const url = `compare.html?services=${selectedServicesMain.join(",")}&category=${encodeURIComponent(category)}`;
      sessionStorage.setItem("clearSelectedAfterCompare", "true");
      window.location.href = url; // dynamic compare (3)
    });
    
    
  }
  const menuBtn = document.getElementById('menu-compare-btn');
  if (menuBtn) {
    menuBtn.addEventListener('click', () => {
      if (selectedServicesMenu.length < 2) return;
      const category = getCategory(selectedServicesMenu);
    
      if (selectedServicesMenu.length === 2) {
        const left = selectedServicesMenu[0];
        const right = selectedServicesMenu[1];
        const canonical = canonicalVsSlug(left, right);
        const url = `/compare/${canonical}.html?services=${encodeURIComponent(left)},${encodeURIComponent(right)}&category=${encodeURIComponent(category)}`;
        sessionStorage.setItem("clearSelectedAfterCompare", "true");
        window.location.href = url; // static 2-up
        return;
      }

      const url = `compare.html?services=${selectedServicesMenu.join(",")}&category=${encodeURIComponent(category)}`;
      sessionStorage.setItem("clearSelectedAfterCompare", "true");
      window.location.href = url; // dynamic compare (3)
    });    
    
  }
});


  // Newsletter Form Email Submission
const newsletterForm = document.getElementById('newsletter-form');
if (newsletterForm) {
  newsletterForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('newsletter-email').value;
    const message = document.getElementById('newsletter-message');
    const sending = document.getElementById('newsletter-sending');
    sending.style.display = 'block';
    message.style.display = 'none';

    try {
      // Replace with actual Formspree or email service URL
      const response = await fetch('https://formspree.io/f/xqalbjgg', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });

      if (response.ok) {
        sending.style.display = 'none';
        message.textContent = 'Subscribed!';
        message.style.display = 'block';
        newsletterForm.reset();
        setTimeout(() => { message.style.display = 'none'; }, 3000);
      } else {
        throw new Error('Subscription failed');
      }
    } catch (error) {
      sending.style.display = 'none';
      message.textContent = 'Error subscribing. Please try again.';
      message.style.display = 'block';
      setTimeout(() => { message.style.display = 'none'; }, 3000);
    }
  });
}

// Device-aware CTA button handler for service pages
(function() {
  // Detect user platform
  function detectPlatform() {
    const ua = navigator.userAgent || navigator.vendor || window.opera;
    if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) return 'ios';
    if (/android/i.test(ua)) return 'android';
    return 'desktop';
  }

  // Handle CTA button clicks with device detection
  document.addEventListener('click', function(e) {
    const btn = e.target.closest('.cta-button--primary');
    if (!btn) return;

    e.preventDefault();
    
    const platform = detectPlatform();
    const serviceName = btn.dataset.service || '';
    const iosUrl = btn.dataset.ios;
    const androidUrl = btn.dataset.android;
    const desktopUrl = btn.dataset.desktop;
    
    // Track event
    if (window.umami) {
      umami.track('cta_primary_click', { 
        service: serviceName, 
        platform: platform,
        auto_detected: true
      });
    }

    // Route based on platform
    if (platform === 'ios' && iosUrl) {
      window.location.href = `/go?service=${encodeURIComponent(serviceName)}&target=ios&url=${encodeURIComponent(iosUrl)}`;
    } else if (platform === 'android' && androidUrl) {
      window.location.href = `/go?service=${encodeURIComponent(serviceName)}&target=android&url=${encodeURIComponent(androidUrl)}`;
    } else if (platform === 'desktop' && (iosUrl || androidUrl)) {
      // Desktop: show inline chooser
      showPlatformChooser(btn, serviceName, iosUrl, androidUrl, desktopUrl);
    } else if (desktopUrl) {
      window.location.href = `/go?service=${encodeURIComponent(serviceName)}&target=desktop&url=${encodeURIComponent(desktopUrl)}`;
    } else {
      // Fallback: website
      window.location.href = `/go?service=${encodeURIComponent(serviceName)}&target=website`;
    }
  });

  // Show minimal platform chooser for desktop users
  function showPlatformChooser(btn, serviceName, iosUrl, androidUrl, desktopUrl) {
    // Remove existing chooser if any
    const existing = document.querySelector('.platform-chooser');
    if (existing) existing.remove();

    const chooser = document.createElement('div');
    chooser.className = 'platform-chooser';
    chooser.innerHTML = `
      <div class="platform-chooser__content">
        <div class="platform-chooser__title">Choose platform</div>
        <div class="platform-chooser__buttons">
          ${iosUrl ? `<a href="/go?service=${encodeURIComponent(serviceName)}&target=ios&url=${encodeURIComponent(iosUrl)}" class="platform-chooser__btn" data-platform="ios">iOS</a>` : ''}
          ${androidUrl ? `<a href="/go?service=${encodeURIComponent(serviceName)}&target=android&url=${encodeURIComponent(androidUrl)}" class="platform-chooser__btn" data-platform="android">Android</a>` : ''}
          ${desktopUrl ? `<a href="/go?service=${encodeURIComponent(serviceName)}&target=desktop&url=${encodeURIComponent(desktopUrl)}" class="platform-chooser__btn" data-platform="desktop">Desktop</a>` : ''}
        </div>
        <button class="platform-chooser__close">&times;</button>
      </div>
    `;

    // Position near button
    const rect = btn.getBoundingClientRect();
    chooser.style.position = 'absolute';
    chooser.style.top = (rect.bottom + window.scrollY + 8) + 'px';
    chooser.style.left = (rect.left + window.scrollX) + 'px';
    chooser.style.zIndex = '1000';

    document.body.appendChild(chooser);

    // Track platform choice
    chooser.querySelectorAll('.platform-chooser__btn').forEach(link => {
      link.addEventListener('click', function() {
        if (window.umami) {
          umami.track('cta_platform_override', { 
            service: serviceName, 
            chosen_platform: this.dataset.platform 
          });
        }
      });
    });

    // Close button
    chooser.querySelector('.platform-chooser__close').addEventListener('click', function() {
      chooser.remove();
    });

    // Close on outside click
    setTimeout(() => {
      document.addEventListener('click', function closeChooser(e) {
        if (!chooser.contains(e.target) && e.target !== btn) {
          chooser.remove();
          document.removeEventListener('click', closeChooser);
        }
      });
    }, 100);
  }

  // Handle website link clicks (track analytics)
  document.addEventListener('click', function(e) {
    const link = e.target.closest('.cta-link-secondary');
    if (!link) return;

    const serviceName = link.dataset.service || '';
    
    if (window.umami) {
      umami.track('cta_website_click', { service: serviceName });
    }
  });
})();