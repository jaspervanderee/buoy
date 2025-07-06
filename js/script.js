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
  let countryCode = localStorage.getItem("userCountry");

  if (!countryCode) {
    countryCode = selectedCountryCode || await getUserLocation();
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
    const response = await fetch("data/services.json");
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

          if (featuresList.length > 0) {
            span.innerHTML = featuresList.map(f => {
              const icon = f.status === 'positive' ? 'checkmark.svg' : 'cross.svg';
              return `<div class="feature-item">
                        <img src="images/${icon}" alt="Feature Icon" class="checkmark-icon" /> ${f.text}
                      </div>`;
            }).join("");
          } else {
            span.innerHTML = `<div class="feature-item">
                                <img src="images/cross.svg" alt="Cross" class="checkmark-icon" /> No specific features available
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
        const response = await fetch("data/countries.json");
        if (!response.ok) throw new Error(`Failed to load countries.json (Status: ${response.status})`);

        const countries = await response.json();

        // Add "Show All Services" at the top
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
        const response = await fetch("data/services.json");
        if (!response.ok) throw new Error(`Failed to load services.json (Status: ${response.status})`);

        const services = await response.json();

        document.querySelectorAll(".card").forEach(card => {
            const serviceName = card.querySelector("img").alt.toLowerCase();
            const service = services.find(s => s.name.toLowerCase() === serviceName);

            if (service) {
                card.style.display = "block"; // Show all services

                const span = card.querySelector("span");
                let featuresList = getFeaturesForCountry(service, "WW"); // Fetch WW features

                // Display WW features or fallback message
                span.innerHTML = featuresList.length > 0 
                    ? featuresList.map(f => `<div class="feature-item">
                        <img src="images/${f.status === 'positive' ? 'checkmark.svg' : 'cross.svg'}" alt="Feature Icon" class="checkmark-icon" /> ${f.text}
                      </div>`).join("")
                    : `<div class="feature-item">
                        <img src="images/cross.svg" alt="Cross" class="checkmark-icon" /> No worldwide features available
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
      }

      updateCompareButton();
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

 compareButton.addEventListener("click", () => {
  if (selectedCards.length < 2) return;

  const categoryTitle = category.querySelector("h2")?.innerText ?? "Compare Services";
  const compareURL = `compare.html?services=${selectedCards.join(",")}&category=${encodeURIComponent(categoryTitle)}`;

  // Save selected services in sessionStorage to clear them later
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
    const category = card.closest(".category")?.querySelector("h2")?.innerText ?? "Service Overview";
    const url = `service.html?services=${encodeURIComponent(serviceName)}&category=${encodeURIComponent(category)}`;
    window.location.href = url;
  });
});


// Search function in menu
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

  const res = await fetch("data/services.json");
  const services = await res.json();
  const matches = services
    .map(s => s.name)
    .filter(name => name.toLowerCase().includes(query));

  if (matches.length === 0) {
    suggestionsBox.style.display = "none";
    return;
  }

  suggestionsBox.innerHTML = matches.map(name => `<div>${name}</div>`).join("");
  suggestionsBox.style.display = "block";
});

// Navigate on click
suggestionsBox.addEventListener("click", (e) => {
  if (e.target.tagName === "DIV") {
    const serviceName = e.target.textContent;
    const url = `service.html?services=${encodeURIComponent(serviceName)}&category=Search`;
    window.location.href = url;
  }
});


  if (!searchInput || !searchBtn) return;

  searchInput.addEventListener("keypress", (e) => {
   if (e.key === "Enter") searchBtn.click();
   });

  searchBtn.addEventListener("click", () => {
    const query = searchInput.value.trim().toLowerCase();
    if (!query) return;

    // Try to match service from services.json
    fetch("data/services.json")
      .then(res => res.json())
      .then(services => {
        const match = services.find(s => s.name.toLowerCase().includes(query));
        if (match) {
          // Redirect to service.html with service and dummy category
          const url = `service.html?services=${encodeURIComponent(match.name)}&category=Search`;
          window.location.href = url;
        } else {
          alert("Service not found. Please try another name.");
        }
      });
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
    });
  }
});









