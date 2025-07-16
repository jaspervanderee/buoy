function renderAppRatings(rating) {
  if (!rating) return "N/A";
  if (rating.text) return rating.text;
  return `
    <div>iOS: ${rating.ios ?? "N/A"}</div>
    <div>Android: ${rating.android ?? "N/A"}</div>
  `;
}

function getLogoFilename(serviceName) {
  return `images/${serviceName.toLowerCase().replace(/\s+/g, "-")}.svg`;
}


document.addEventListener("DOMContentLoaded", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  let categoryTitle = urlParams.get("category") ?? "Compare Services";

// ✅ Override "Search" category with correct section if matched
if (categoryTitle === "Search") {
  const serviceName = urlParams.get("services");
  if (serviceName) {
    const name = serviceName.toLowerCase();

 const categoryMap = {
  "Buy Bitcoin": ["strike", "river", "swan", "relai", "hodlhodl", "bitonic", "peach", "bull bitcoin", "pocket"],
  "Spend Bitcoin": ["breez", "aqua", "phoenix", "muun", "fold"],
  "Store it safely": ["bitkey", "sparrow", "wasabi", "anchorwatch", "unchained"],
  "Run my own node": ["umbrel", "mynode", "start9"],
  "Merchant Tools": ["btc pay", "opennode", "lightspark"]
};

    for (const [label, services] of Object.entries(categoryMap)) {
      if (services.includes(name)) {
        categoryTitle = label;
        break;
      }
    }
  }
}

document.getElementById("category-title").textContent = categoryTitle;
const selectedServices = urlParams.get("services") ? urlParams.get("services").split(",") : [];

const isSingleServiceView = window.location.pathname.includes("service.html");

if (!isSingleServiceView && selectedServices.length < 2) {
  document.getElementById("comparison-container").innerHTML = "<p>Please select at least two services.</p>";
  return;
}

if (isSingleServiceView && selectedServices.length !== 1) {
  document.getElementById("comparison-container").innerHTML = "<p>Invalid or missing service.</p>";
  return;
}
try {
    const response = await fetch("data/services.json");
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

    const servicesData = await response.json();

    // Match selected services in the order they were chosen
    let servicesToCompare = selectedServices.map(selectedName =>
      servicesData.find(service => service.name.toLowerCase() === selectedName.toLowerCase())
    ).filter(Boolean); // Remove undefined entries

    if (servicesToCompare.length === 0) {
      document.getElementById("comparison-container").innerHTML = "<p>No matching services found.</p>";
      return;
    }

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

let countryCode = localStorage.getItem("userCountry");
if (!countryCode) {
  countryCode = await getUserLocation();
  if (countryCode) {
    localStorage.setItem("userCountry", countryCode);
  } else {
    countryCode = "WW"; // Fallback
  }
}

const categoryFeaturesMap = {
  "Buy Bitcoin": [
    "type_of_platform", "features", "fees", "dca", "payment_methods", "user_experience", "interface", "app_ratings", "profile", "description", "founded_in", "website", "availability"
  ],
  "Spend Bitcoin": [
    "type_of_platform", "features", "custody_model", "open_source", "lightning_support", "withdraw_options", "user_experience", "interface", "app_ratings", "profile", "description", "founded_in", "website", "availability"
  ],
  "Store it safely": [
    "type_of_platform", "features", "custody_model", "open_source", "multisig_support", "backup_options", "user_experience", "interface", "app_ratings", "profile", "description", "founded_in", "website", "availability"
  ],
  "Run my own node": [
    "type_of_platform", "features", "custody_model", "user_experience", "interface", "app_ratings", "profile", "description", "founded_in", "website", "availability"
  ],
  "Merchant Tools": [
    "type_of_platform", "features", "custody_model", "lightning_support", "user_experience", "interface", "app_ratings", "profile", "description", "founded_in", "website", "availability"
  ]
};

function renderFeatures(service) {
  const featuresList = getFeaturesForCountry(service, countryCode);
  if (featuresList.length === 0) {
    return `<div class="feature-item">
              <img src="images/cross.svg" alt="Cross" class="checkmark-icon" /> No specific features available
            </div>`;
  }
  return featuresList.map((f, index) => {
    const icon = f.status === 'positive' ? 'checkmark.svg' : 'cross.svg';
    let extraClass = '';
    if (f.status === 'negative' && (index === 0 || featuresList[index - 1].status === 'positive')) {
      extraClass = ' negative-group-start';
    }
    return `<div class="feature-item${extraClass}">
              <img src="images/${icon}" alt="${f.status} icon" class="checkmark-icon" /> ${f.text}
            </div>`;
  }).join("");
}

    // ✅ Generate the comparison cards only once
    const comparisonContainer = document.getElementById("comparison-container");
    const features = [
  { key: "type_of_platform", label: "Platform" },
  { key: "features", label: "Features", render: renderFeatures },
  { key: "fees", label: "Fees", render: renderFees },
  { key: "dca", label: "DCA (Dollar Cost Averaging)" },
  { key: "payment_methods", label: "Payment Methods", render: (val) => val?.join(", ") || "Not available" },
  { key: "custody_model", label: "Custody" },
  { key: "lightning_support", label: "Lightning / Liquid Support" },
  { key: "withdraw_options", label: "Withdraw to On-chain" },
  { key: "multisig_support", label: "Multisig Support" },
  { key: "backup_options", label: "Backup & Recovery" },
  { key: "open_source", label: "Open Source", render: val => val ? "Yes" : "No" },
  { key: "user_experience", label: "User Experience" },
  { key: "interface",
    label: "Interface",
    render: (val) => {
      if (!val) return "N/A";
  
      const lower = val.toLowerCase();
      let iconSrc = '';
      let altText = '';
      if (lower.includes("mobile & desktop")) {
        iconSrc = "images/mobile-desktop.svg";
        altText = "Mobile & Desktop";
      } else if (lower.includes("mobile")) {
        iconSrc = "images/mobile.svg";
        altText = "Mobile";
      } else if (lower.includes("desktop")) {
        iconSrc = "images/desktop.svg";
        altText = "Desktop";
      }
      if (iconSrc) {
        return `<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%;">
          <img src="${iconSrc}" class="platform-icon" alt="${altText}" style="margin-bottom: 8px;" />
          <span>${val}</span>
        </div>`;
      }
      return `<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%;">
        <span>${val}</span>
      </div>`; // fallback if unrecognized
    }
  },
  { key: "app_ratings", label: "App Ratings", render: renderAppRatings },
  { key: "profile", label: { main: "Profile", sub: "Founder" },
    render: (val) => {
      if (!val) return "N/A";
      const filename = val.toLowerCase().replace(/\s+/g, "-") + ".jpg";
      return `<img src="images/founders/${filename}" alt="${val}" style="width:100px; height:100px; border-radius:50%; display:block; margin:0 auto 10px auto;"> <div style="text-align:center;">${val}</div>`;
    }
  },
  { key: "description", label: "Company description", render: renderCollapsibleDescription },
  { key: "founded_in", label: "Founded in" },
  { key: "website", label: "Website", render: (val) => val ? `<a href="${val}" target="_blank">${val.replace(/https?:\/\/(www\.)?/, "")}</a>` : "N/A" },
  { key: "availability", label: "Availability", render: getAvailabilityText },
];

					
 document.getElementById("logo-row-container").innerHTML = `
  ${servicesToCompare.map(service => `
    <div class="feature-value logo-cell">
      <a href="${service.website}" target="_blank" class="service-link">
        <img src="${getLogoFilename(service.name)}" alt="${service.name} logo" class="svg-icon sticky-logo" />
        <button class="cta-button">visit</button>
      </a>
    </div>
  `).join("")}
`;


const allowedKeys = categoryFeaturesMap[categoryTitle] ?? features.map(f => f.key);
const featureRows = await Promise.all(
  allowedKeys.map(key => features.find(f => f.key === key))
    .filter(Boolean)
    .map(async (feature) => {
      const values = await Promise.all(servicesToCompare.map(async (service) => {
        const val = (feature.key === "availability" || feature.key === "features") ? service : service[feature.key];
        const content = (val === undefined || val === null || val === "") ? "" :
       (feature.render ? await feature.render(val) : val);
        return `<div class="feature-value">${content}</div>`;
      }));
      // ✅ Hide feature row if all values are empty
      const hasVisibleContent = values.some(v => !v.includes(`feature-value"></div>`));
      let labelHtml = '';
      if (typeof feature.label === 'object' && feature.label.main && feature.label.sub) {
        labelHtml = `
          <div class="label-container">
            <div class="feature-label">${feature.label.main}</div>
            <div class="feature-label sublabel">${feature.label.sub}</div>
          </div>
        `;
      } else {
        labelHtml = `<div class="feature-label${feature.key === 'dca' || feature.key === 'interface' || feature.key === 'app_ratings' || feature.key === 'founded_in' || feature.key === 'website' || feature.key === 'description' ? ' sublabel' : ''}">${feature.label}</div>`;
      }
      return hasVisibleContent ? `
        <div class="feature-row ${feature.key}">
          ${labelHtml}
          <div class="feature-values">
            ${values.join("")}
          </div>
        </div>
      ` : "";
    })
);

document.getElementById("comparison-table-wrapper").innerHTML = `
  <div class="comparison-table">
    ${featureRows.join("")}
  </div>
`;

// Initialize collapsible descriptions
initializeCollapsibleDescriptions();

document.querySelectorAll(".card").forEach(card => card.style.display = "none");

	  

    function updateCardVisibility() {
      let isSmallScreen = window.innerWidth < 900; // Hide third card below 900px
      const cards = document.querySelectorAll("#comparison-container .card");

      cards.forEach((card, index) => {
        if (index === 2) {
          card.style.display = isSmallScreen ? "none" : "flex"; // Show/hide third card only
        }
      });

      // ✅ Ensure proper spacing
      if (!isSmallScreen && servicesToCompare.length === 3) {
        comparisonContainer.classList.add("three-cards");
      } else {
        comparisonContainer.classList.remove("three-cards");
      }
    }

    // ✅ Run the function on load and resize
    updateCardVisibility();
    window.addEventListener("resize", updateCardVisibility);

  } catch (error) {
    console.error("Error loading services:", error);
    document.getElementById("comparison-container").innerHTML = `<p>Error loading comparison data: ${error.message}</p>`;
  }
});

// ✅ Shrink logo row on scroll
window.addEventListener("scroll", () => {
  const logoRow = document.querySelector(".logo-row-sticky");
  if (!logoRow) return;

  if (window.scrollY > 80) {
    logoRow.classList.add("shrunk");
  } else {
    logoRow.classList.remove("shrunk");
  }
});


// ✅ Function to generate proper availability text and icons
let countryMapCache = null;

async function loadCountryNames() {
  if (countryMapCache) return countryMapCache; // ✅ use cached version

  const response = await fetch('data/countries.json');
  if (!response.ok) throw new Error('Failed to load countries.json');
  const countries = await response.json();

  countryMapCache = {}; // ✅ store in cache
  countries.forEach(c => { countryMapCache[c.code] = c.name; });
  return countryMapCache;
}


async function getAvailabilityText(service) {
  if (!service.countries || service.countries.length === 0) return "Availability unknown";

    if (service.countries.includes("WW")) {
    return `<div class="availability-container">
      <img src="images/global.svg" alt="Availability" class="availability-icon" />
      <span>Available globally</span>
    </div>`;
  }

  const regionNames = {
    "NA": "North America",
    "SA": "South America",
    "EU": "Europe",
    "AF": "Africa",
    "AS": "Asia",
    "OC": "Oceania"
  };

  const countryNames = await loadCountryNames(); // ✅ dynamic import

  const regions = [];
  const countries = [];

  service.countries.forEach(code => {
  if (code === "WW") {
    countries.push("globally");
  } else if (regionNames[code]) {
    regions.push(regionNames[code]);
  } else if (countryNames[code]) {
    countries.push(countryNames[code]);
  } else {
    countries.push(code); // fallback to code if unmatched
  }
});


  const availability = [...countries, ...regions].join(", ");

  const flagImage = (service.countries.length === 1 && !regionNames[service.countries[0]])
  ? `<span class="flag-icon flag-icon-${service.countries[0].toLowerCase()} availability-icon"></span>`
  : `<img src="images/global.svg" alt="Availability" class="availability-icon" />`;

return `<div class="availability-container">
  ${flagImage}
  <span>Available in ${availability}</span>
</div>`;

}


// ✅ Function to convert country codes to full country names
function getCountryName(code) {
    const countryNames = {
        "NL": "the Netherlands",
        "US": "the United States",
        "CA": "Canada",
        "DE": "Germany",
        "FR": "France",
        "UK": "the United Kingdom",
        "AU": "Australia"
        // Add more country mappings as needed
    };
    return countryNames[code.toUpperCase()] || code.toUpperCase();
}

function renderFees(fees) {
  if (!fees) return "N/A";

  // case: string-based fees
  if (typeof fees === "string") {
    return `<div class="fee-structure">${fees}</div>`;
  }

  // case: object-based, intro only
  if (typeof fees === "object" && !fees.tiers && fees.intro) {
    return `<div class="fee-structure"><div class="fee-intro">${fees.intro}</div></div>`;
  }

  // case: object with tiers
  if (typeof fees === "object" && fees.tiers) {
    let html = `<div class="fee-structure">`;

    if (fees.intro) {
      html += `<div class="fee-intro">${fees.intro}</div>`;
    }

    fees.tiers.forEach(tier => {
      html += `<div class="fee-tier">${tier.range}: <strong>${tier.fee}</strong></div>`;
    });

    if (fees.notes) {
      html += `<p><em>${fees.notes}</em></p>`;
    }

    html += `</div>`;
    return html;
  }

  return `<div class="fee-structure">Not available</div>`;
}

// Add this new function for rendering collapsible descriptions
function renderCollapsibleDescription(description) {
  if (!description) return "";
  
  const paragraphs = description.split("\\n\\n");
  const fullText = paragraphs.map(p => `<p>${p}</p>`).join("");
  
  // For desktop or short descriptions, return full text without collapsible behavior
  if (description.length < 200) {
    return fullText;
  }
  
  // Create preview text - first paragraph capped at 200 chars for mobile, full first paragraph for desktop
  const mobilePreviewText = paragraphs[0].length > 200 ? paragraphs[0].substring(0, 200) + "..." : paragraphs[0];
  const desktopPreviewText = paragraphs[0];
  
  return `
    <div class="collapsible-description">
      <div class="description-preview">
        <p class="mobile-preview">${mobilePreviewText}</p>
        <p class="desktop-preview">${desktopPreviewText}</p>
      </div>
      <div class="description-full" style="display: none;">
        ${fullText}
      </div>
      <button class="expand-btn" aria-expanded="false">
        <span class="expand-text">Read more</span>
        <span class="expand-icon">▼</span>
      </button>
    </div>
  `;
}

// Add this new function
function initializeCollapsibleDescriptions() {
  document.querySelectorAll('.expand-btn').forEach(button => {
    button.addEventListener('click', function() {
      const container = this.closest('.collapsible-description');
      const preview = container.querySelector('.description-preview');
      const full = container.querySelector('.description-full');
      const expandText = this.querySelector('.expand-text');
      const expandIcon = this.querySelector('.expand-icon');
      
      const isExpanded = this.getAttribute('aria-expanded') === 'true';
      
      if (isExpanded) {
        // Collapse
        preview.style.display = 'block';
        full.style.display = 'none';
        expandText.textContent = 'Read more';
        expandIcon.textContent = '▼';
        this.setAttribute('aria-expanded', 'false');
      } else {
        // Expand
        preview.style.display = 'none';
        full.style.display = 'block';
        expandText.textContent = 'Show less';
        expandIcon.textContent = '▼';
        this.setAttribute('aria-expanded', 'true');
      }
    });
  });
}

window.addEventListener("load", () => {
    const modal = document.getElementById("rating-modal");

    if (!modal) {
        console.error("❌ Error: Rating modal not found in DOM.");
        return;
    }

    const stars = modal.querySelectorAll(".star-rating span");
    const closeBtn = modal.querySelector(".close-btn");
    let currentService = null;

    document.querySelectorAll(".review-link").forEach(link => {
        link.style.cursor = "pointer";
        link.addEventListener("click", (e) => {
            e.stopPropagation();
            currentService = link.dataset.service;

            console.log("✅ Opening modal for service:", currentService);
            modal.classList.add("show");
            modal.style.display = "flex"; // ✅ Ensure it becomes visible
            modal.style.opacity = "1";  // ✅ Ensure full visibility
        });
    });

    stars.forEach(star => {
        star.addEventListener("click", (e) => {
            const rating = e.target.dataset.value;
            localStorage.setItem(`rating_${currentService}`, rating);
            const ratingDisplay = document.querySelector(`.rating-display[data-service="${currentService}"]`);
            ratingDisplay.innerHTML = `<span class="rating-large">${rating}</span> out of 5`;
            modal.classList.remove("show");
            setTimeout(() => { 
                modal.style.display = "none"; 
                modal.style.opacity = "0"; 
            }, 300);
        });
    });

    closeBtn.addEventListener("click", () => {
        console.log("❌ Closing modal...");
        modal.classList.remove("show");
        setTimeout(() => { 
            modal.style.display = "none"; 
            modal.style.opacity = "0"; 
        }, 300);
    });

    modal.addEventListener("click", (e) => {
        if (e.target === modal) {
            console.log("❌ Clicked outside, closing modal...");
            modal.classList.remove("show");
            setTimeout(() => { 
                modal.style.display = "none"; 
                modal.style.opacity = "0"; 
            }, 300);
        }
    });
});


function equalizeFeatureRowHeights() {
    const cards = document.querySelectorAll("#comparison-container .card");

    if (cards.length === 0) return;

    const featureRows = [];

    // Collect all `.service-info` elements grouped by their index
    cards.forEach(card => {
        const features = card.querySelectorAll(".service-info");
        features.forEach((feature, index) => {
            if (!featureRows[index]) {
                featureRows[index] = [];
            }
            featureRows[index].push(feature);
        });
    });

    // Reset and find max height for each row
    featureRows.forEach(row => {
        let maxHeight = 0;

        // Reset height first to avoid stacking issues on resize
        row.forEach(feature => {
            feature.style.height = "auto";
        });

        // Determine the max height in this row
        row.forEach(feature => {
            maxHeight = Math.max(maxHeight, feature.clientHeight);
        });

        // Apply the max height to all elements in the row
        row.forEach(feature => {
            feature.style.height = maxHeight + "px";
        });
    });
}

// Run on page load and on window resize
window.addEventListener("load", equalizeFeatureRowHeights);
window.addEventListener("resize", equalizeFeatureRowHeights);
