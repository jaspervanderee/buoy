// Questionnaire Module
document.addEventListener("DOMContentLoaded", () => {
  let servicesData = [];
  let activeCategory = null;
  let userAnswers = {};
  let currentQuestionIndex = 0;
  let isProcessingSelection = false;
 
  const questionnaires = {
    "purchase-bitcoin": {
      title: "Buy Bitcoin",
      questions: [
        { id: "kyc", text: "Do you prefer a privacy-focused purchase without identity verification (no KYC), or are you okay with standard verification for easier access?", options: ["No KYC", "With KYC"] },
        { id: "recurring", text: "Do you want to set up automatic recurring buys?", options: ["Yes", "No"] }
      ],
      filter: (service, answers) => {
        if (answers.kyc !== undefined) {
          if (answers.kyc === "0" && service.kyc_required !== "No") return false;
          if (answers.kyc === "1" && service.kyc_required === "No") return false;
        }
        if (answers.recurring !== undefined && answers.recurring === "0" && service.dca !== "Yes") return false;
        return true;
      }
    },
    "pay-receive-bitcoin": {
      title: "Spend Bitcoin",
      questions: [
        { id: "lightning", text: "Do you need Lightning support?", options: ["Yes", "No"] },
        { id: "custody", text: "Full self-custody or managed?", options: ["Self-custody", "Managed"] },
        { id: "spending", text: "Direct or indirect spending?", options: ["Direct", "Indirect"] }
      ],
      filter: (service, answers) => {
        if (answers.lightning !== undefined && answers.lightning === "0" && !service.supported_network.includes("Lightning")) return false;
        if (answers.custody !== undefined && answers.custody === "0" && service.custody_control !== "Non-custodial") return false;
        if (answers.spending !== undefined && answers.spending === "0" && service.name === "Fold") return false;
        return true;
      }
    }
  };

  // Region mappings for service availability
  const regionMappings = {
    "WW": [],
    "NA": ["US", "CA", "MX", "BZ", "CR", "SV", "GT", "HN", "NI", "PA", "AI", "AG", "AW", "BS", "BB", "BQ", "CU", "CW", "DM", "DO", "GD", "GP", "HT", "JM", "MQ", "MS", "PR", "BL", "KN", "LC", "MF", "VC", "SX", "TT", "TC", "VG", "VI"],
    "SA": ["AR", "BO", "BR", "CL", "CO", "EC", "GY", "PY", "PE", "SR", "UY", "VE"],
    "EU": ["AL", "AD", "AT", "BY", "BE", "BA", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IS", "IE", "IT", "XK", "LV", "LI", "LT", "LU", "MT", "MD", "MC", "ME", "NL", "MK", "NO", "PL", "PT", "RO", "RU", "SM", "RS", "SK", "SI", "ES", "SE", "CH", "UA", "GB", "VA"],
    "AF": ["DZ", "AO", "BJ", "BW", "BF", "BI", "CM", "CV", "CF", "TD", "KM", "CD", "CG", "CI", "DJ", "EG", "GQ", "ER", "SZ", "ET", "GA", "GM", "GH", "GN", "GW", "KE", "LS", "LR", "LY", "MG", "MW", "ML", "MR", "MU", "MA", "MZ", "NA", "NE", "NG", "RW", "ST", "SN", "SC", "SL", "SO", "ZA", "SS", "SD", "TZ", "TG", "TN", "UG", "ZM", "ZW"],
    "AS": ["AF", "AM", "AZ", "BH", "BD", "BT", "BN", "KH", "CN", "GE", "IN", "ID", "IR", "IQ", "IL", "JP", "JO", "KZ", "KW", "KG", "LA", "LB", "MY", "MV", "MN", "MM", "NP", "KP", "OM", "PK", "PH", "QA", "SA", "SG", "KR", "LK", "SY", "TW", "TJ", "TH", "TL", "TR", "TM", "AE", "UZ", "VN", "YE"],
    "OC": ["AU", "FJ", "KI", "MH", "FM", "NR", "NZ", "PW", "PG", "WS", "SB", "TO", "TV", "VU"]
  };

  // Function to check if a service is available in a country or region
  function isServiceAvailable(service, userCountry) {
    return (
      service.countries.includes("WW") ||
      service.countries.includes(userCountry) ||
      service.countries.some(regionOrCountry =>
        regionMappings[regionOrCountry]?.includes(userCountry)
      )
    );
  }
 
  async function loadServices() {
    if (servicesData.length) return;
    const res = await fetch("data/services.json");
    servicesData = await res.json();
  }
 
  document.querySelectorAll(".action-button").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      const categoryId = btn.dataset.target;
      activeCategory = categoryId;
      userAnswers = {};
      await loadServices();
      const actionButtons = document.querySelector(".action-buttons");
      actionButtons.style.display = "none";
      // Hide other categories
      document.querySelectorAll(".category").forEach(cat => {
        const container = cat.querySelector(".scrollable-container");
        cat.style.transition = "opacity 0.3s";
        cat.style.opacity = (container.id === categoryId) ? "1" : "0";
        setTimeout(() => { cat.style.display = (container.id === categoryId) ? "block" : "none"; }, 300);
      });
      injectQuestionnaire(categoryId);
      filterCards(categoryId);
    });
  });
 
  function injectQuestionnaire(categoryId) {
    console.log('injectQuestionnaire called for categoryId:', categoryId);
    
    // Check if questionnaire already exists
    const existingQuestionnaire = document.querySelector(".questionnaire");
    if (existingQuestionnaire) {
      console.log('Questionnaire already exists, removing old one');
      existingQuestionnaire.remove();
    }
    
    // Add "see more services" element
    const existingSeeMore = document.querySelector(".see-more-services");
    if (existingSeeMore) {
      existingSeeMore.remove();
    }
    
    const seeMoreDiv = document.createElement("div");
    seeMoreDiv.className = "see-more-services";
    seeMoreDiv.innerHTML = `
      <a href="javascript:void(0)">
        <span>see more services</span>
        <span class="arrow-down">↓</span>
      </a>
    `;
    
    // Insert before footer
    const footer = document.querySelector("footer");
    if (footer) {
      footer.parentNode.insertBefore(seeMoreDiv, footer);
    }
    
    // Add click handler to reset questionnaire
    const seeMoreLink = seeMoreDiv.querySelector("a");
    seeMoreLink.addEventListener("click", (e) => {
      e.preventDefault();
      resetQuestionnaire();
    });
    
    // Show the element with animation
    setTimeout(() => {
      seeMoreDiv.classList.add("show");
    }, 100);
    
    const grid = document.querySelector(".action-grid");
    const questionnaireDiv = document.createElement("div");
    questionnaireDiv.className = "questionnaire";
    questionnaireDiv.id = "questionnaire-" + categoryId;
    grid.appendChild(questionnaireDiv);

    const qData = questionnaires[categoryId];
    currentQuestionIndex = 0;
    console.log('Reset currentQuestionIndex to 0 for new questionnaire');

    function showCurrentQuestion() {
      console.log('showCurrentQuestion called, currentQuestionIndex:', currentQuestionIndex);
      questionnaireDiv.innerHTML = "";

      if (currentQuestionIndex >= qData.questions.length) {
        return;
      }

      const q = qData.questions[currentQuestionIndex];
      const qDiv = document.createElement("div");
      qDiv.className = "question";
      qDiv.innerHTML = `
        <label>${q.text}</label>
        ${q.options.map((opt, i) => `<div class="option" data-value="${i}"><div class="select-circle ${userAnswers[q.id] == i ? 'selected' : ''}"></div><label>${opt}</label></div>`).join("")}
        <span class="left-arrow">←</span>
        <span class="right-arrow">→</span>
        <div class="questionnaire-reset">
          <a href="javascript:void(0)">reset</a>
        </div>
      `;
      questionnaireDiv.appendChild(qDiv);

      // Left arrow handler
      const leftArrow = qDiv.querySelector(".left-arrow");
      leftArrow.style.visibility = 'visible';
      leftArrow.addEventListener("click", () => {
        if (currentQuestionIndex > 0) {
          currentQuestionIndex--;
          showCurrentQuestion();
          filterCards(categoryId);
        } else {
          resetQuestionnaire();
        }
      });

      // Right arrow handler
      const rightArrow = qDiv.querySelector(".right-arrow");
      rightArrow.addEventListener("click", () => {
        if (currentQuestionIndex < qData.questions.length - 1) {
          currentQuestionIndex++;
          showCurrentQuestion();
          filterCards(categoryId);
        }
      });

      // Select circle handlers
      qDiv.querySelectorAll(".option").forEach(optDiv => {
        const circle = optDiv.querySelector(".select-circle");
        const value = optDiv.dataset.value;
        
        optDiv.addEventListener("click", (event) => {
          event.stopPropagation();
        });
        
        circle.addEventListener("click", (event) => {
          event.stopPropagation();
          event.preventDefault();
          isProcessingSelection = true;
          qDiv.querySelectorAll(".select-circle").forEach(c => c.classList.remove("selected"));
          circle.classList.add("selected");
          userAnswers[q.id] = value;
          filterCards(categoryId);
          console.log('Select circle clicked, incrementing from:', currentQuestionIndex);
          currentQuestionIndex++;
          console.log('New currentQuestionIndex:', currentQuestionIndex);
          showCurrentQuestion();
          setTimeout(() => { isProcessingSelection = false; }, 100);
        });
      });

      // Add reset handler
      const resetLink = qDiv.querySelector(".questionnaire-reset a");
      resetLink.addEventListener("click", (e) => {
        e.preventDefault();
        resetQuestionnaire();
      });

      if (currentQuestionIndex >= qData.questions.length) {
        questionnaireDiv.innerHTML = '';
      }
    }

    showCurrentQuestion();
  }
 
  function filterCards(categoryId) {
    const container = document.getElementById(categoryId);
    const cards = container.querySelectorAll(".card");
    const qData = questionnaires[categoryId];
    const country = localStorage.getItem("userCountry") || "WW";
    cards.forEach(card => {
      const serviceName = card.querySelector("img").alt.toLowerCase();
      const service = servicesData.find(s => s.name.toLowerCase() === serviceName);
      if (!service) return;
      let show = qData.filter(service, userAnswers);
      if (country !== "ALL") show = show && isServiceAvailable(service, country);
      card.style.display = show ? "block" : "none";
    });
  }
 
  function resetQuestionnaire() {
    const questionnaire = document.querySelector(".questionnaire");
    if (questionnaire) questionnaire.remove();
    
    // Remove "see more services" element
    const seeMoreElement = document.querySelector(".see-more-services");
    if (seeMoreElement) {
      seeMoreElement.classList.remove("show");
      setTimeout(() => {
        seeMoreElement.remove();
      }, 300);
    }
    
    document.querySelector(".action-buttons").style.display = "grid";
    activeCategory = null;
    userAnswers = {};
    // Show all categories
    document.querySelectorAll(".category").forEach(cat => {
      cat.style.transition = "opacity 0.3s";
      cat.style.display = "block";
      setTimeout(() => { cat.style.opacity = "1"; }, 10);
    });
    // Reset all cards to visible (respecting location)
    document.querySelectorAll(".scrollable-container .card").forEach(card => card.style.display = "block");
    
    // Call the updateServiceSpans function if it exists (from main script)
    if (typeof updateServiceSpans === 'function') {
      updateServiceSpans(localStorage.getItem("userCountry"));
    }
  }
}); 