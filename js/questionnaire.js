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
        { 
          id: "kyc", 
          text: "Do you prefer no KYC for privacy or KYC for easier access?", 
          options: ["No KYC", "With KYC", "No preference"],
          explanation: "KYC (Know Your Customer) is a legal obligation required by governments, where a service asks for your personal info, like your name and ID, to verify who you are."
        },
        { 
          id: "interface", 
          text: "Do you prefer mobile or desktop?", 
          options: ["Mobile", "Desktop", "No preference"],
          explanation: "Mobile apps are convenient for on-the-go use, while desktop platforms offer more features and control."
        }
      ],
      filter: (service, answers) => {
        if (answers.kyc !== undefined && answers.kyc !== "2") {
          if (answers.kyc === "0" && service.kyc_required !== "No") return false;
          if (answers.kyc === "1" && service.kyc_required === "No") return false;
        }
        if (answers.interface !== undefined && answers.interface !== "2") {
          if (answers.interface === "0" && !service.interface.includes("Mobile")) return false;
          if (answers.interface === "1" && !service.interface.includes("Desktop")) return false;
        }
        return true;
      }
    },
    "pay-receive-bitcoin": {
      title: "Spend Bitcoin",
      questions: [
        { 
          id: "network", 
          text: "Which network do you prefer to spend with?", 
          options: ["Bitcoin", "Lightning", "No preference"],
          explanation: "Bitcoin on-chain transactions are more secure but slower and more expensive. Lightning transactions are instant and cheap but require channel setup."
        },
        { 
          id: "automation", 
          text: "Do you want automatic network selection?", 
          options: ["Yes", "No", "No preference"],
          explanation: "Some wallets automatically choose the best network (Lightning or on-chain) for your transaction. Others require manual selection."
        }
      ],
      filter: (service, answers) => {
        if (answers.network !== undefined && answers.network !== "2") {
          if (answers.network === "0" && !service.supported_network.includes("Bitcoin")) return false;
          if (answers.network === "1" && !service.supported_network.includes("Lightning")) return false;
        }
        if (answers.automation !== undefined && answers.automation !== "2") {
          const hasAutoSelection = service.features?.WW?.some(f => 
            f.text.toLowerCase().includes("auto") || 
            f.text.toLowerCase().includes("automatic") ||
            service.description?.toLowerCase().includes("automatically")
          );
          if (answers.automation === "0" && !hasAutoSelection) return false;
          if (answers.automation === "1" && hasAutoSelection) return false;
        }
        return true;
      }
    },
    "store-bitcoin": {
      title: "Store Bitcoin Safely",
      questions: [
        { 
          id: "support_level", 
          text: "Do you want professional support or self-service?", 
          options: ["Professional support", "Self-service", "No preference"],
          explanation: "Professional services offer concierge support, insurance, and expert guidance. Self-service options give you full control but require more technical knowledge."
        },
        { 
          id: "experience", 
          text: "Are you a beginner or advanced user?", 
          options: ["Beginner", "Advanced", "No preference"],
          explanation: "Beginner-friendly wallets are easier to use but may have fewer features. Advanced wallets offer more control but require more technical knowledge."
        }
      ],
      filter: (service, answers) => {
        if (answers.support_level !== undefined && answers.support_level !== "2") {
          // Check for professional service indicators
          const isProfessionalService = service.description?.toLowerCase().includes("concierge") ||
                                      service.description?.toLowerCase().includes("professional") ||
                                      service.description?.toLowerCase().includes("insurance") ||
                                      service.custody_control?.includes("Collaborative custody") ||
                                      service.type_of_platform?.includes("Collaborative custody");
          
          if (answers.support_level === "0" && !isProfessionalService) return false;
          if (answers.support_level === "1" && isProfessionalService) return false;
        }
        if (answers.experience !== undefined && answers.experience !== "2") {
          // For self-service options, automatically categorize based on complexity
          const isBitkey = service.name === "Bitkey";
          const isAdvancedWallet = service.name === "Wasabi" || service.name === "Sparrow";
          
          if (answers.experience === "0" && !isBitkey) return false; // Beginner: only Bitkey
          if (answers.experience === "1" && !isAdvancedWallet) return false; // Advanced: only Wasabi/Sparrow
        }
        return true;
      }
    },
    "node-section": {
      title: "Run Your Own Node",
      questions: [
        { 
          id: "approach", 
          text: "What's your priority for running a node?", 
          options: ["Ease of use", "Privacy & security", "Full control", "No preference"],
          explanation: "Ease of use focuses on user-friendly interfaces. Privacy & security prioritizes open-source and privacy features. Full control offers maximum customization and technical autonomy."
        }
      ],
      filter: (service, answers) => {
        if (answers.approach !== undefined && answers.approach !== "3") {
          // Umbrel: Ease of use - polished interface, app store, user-friendly
          // myNode: Full control - open-source, many apps, technical features
          // Start9: Privacy & security - open-source, privacy-focused, community-driven
          
          if (answers.approach === "0" && service.name !== "Umbrel") return false; // Ease of use: Umbrel
          if (answers.approach === "1" && service.name !== "Start9") return false; // Privacy & security: Start9
          if (answers.approach === "2" && service.name !== "myNode") return false; // Full control: myNode
        }
        return true;
      }
    },
    "merchant-section": {
      title: "Accept Bitcoin as a Merchant",
      questions: [
        { 
          id: "business_size", 
          text: "What size is your business?", 
          options: ["Small business/Individual", "Medium to large business", "Enterprise", "No preference"],
          explanation: "Small businesses prefer self-hosted solutions. Medium businesses need turnkey services. Enterprises require compliance-ready infrastructure with high transaction volumes."
        }
      ],
      filter: (service, answers) => {
        if (answers.business_size !== undefined && answers.business_size !== "3") {
          // BTC Pay: Small business/Individual - self-hosted, open-source, DIY
          // OpenNode: Medium to large business - turnkey, mid-sized enterprises
          // Lightspark: Enterprise - enterprise-grade, $300k+ minimum, compliance-ready
          
          if (answers.business_size === "0" && service.name !== "BTC Pay") return false; // Small: BTC Pay
          if (answers.business_size === "1" && service.name !== "OpenNode") return false; // Medium: OpenNode
          if (answers.business_size === "2" && service.name !== "Lightspark") return false; // Enterprise: Lightspark
        }
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
      
      // Scroll to the Buy Bitcoin category header to position it at the top
      const buyBitcoinHeader = document.querySelector('.category-header h2 a[href="buy-bitcoin.html"]');
      if (buyBitcoinHeader) {
        buyBitcoinHeader.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
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

      // Check if only one service is left after current filtering
      const visibleServices = countVisibleServices(categoryId);
      if (visibleServices <= 2) {
        // Skip remaining questions and complete questionnaire
        currentQuestionIndex = qData.questions.length;
      }

      if (currentQuestionIndex >= qData.questions.length) {
        // Update h2 tag when questionnaire is completed
        const actionGridH2 = document.querySelector(".action-grid h2");
        if (actionGridH2) {
          actionGridH2.textContent = "These options might be worth exploring:";
        }
        
        // Add reset button for completed questionnaire
        const resetDiv = document.createElement("div");
        resetDiv.className = "questionnaire-reset";
        resetDiv.innerHTML = `<a href="javascript:void(0)">reset</a>`;
        questionnaireDiv.appendChild(resetDiv);
        console.log('Created reset button for completed questionnaire');
        
        // Add reset handler
        const resetLink = resetDiv.querySelector("a");
        resetLink.addEventListener("click", (e) => {
          e.preventDefault();
          resetQuestionnaire();
        });
        
        return;
      }

      const q = qData.questions[currentQuestionIndex];
      
      // Update the h2 tag with the current question
      const actionGridH2 = document.querySelector(".action-grid h2");
      if (actionGridH2) {
        actionGridH2.textContent = q.text;
      }
      
      const qDiv = document.createElement("div");
      qDiv.className = "question";
      qDiv.innerHTML = `
        ${q.options.map((opt, i) => `<div class="option" data-value="${i}"><div class="select-circle ${userAnswers[q.id] == i ? 'selected' : ''}"></div><label>${opt}</label></div>`).join("")}
        <span class="left-arrow">←</span>
        <span class="right-arrow">→</span>
      `;
      questionnaireDiv.appendChild(qDiv);

      // Add explanatory text outside the questionnaire field
      if (q.explanation) {
        const explanationDiv = document.createElement("div");
        explanationDiv.className = "questionnaire-explanation";
        explanationDiv.textContent = q.explanation;
        questionnaireDiv.appendChild(explanationDiv);
      }

      // Add reset button outside the questionnaire field
      const resetDiv = document.createElement("div");
      resetDiv.className = "questionnaire-reset";
      resetDiv.innerHTML = `<a href="javascript:void(0)">reset</a>`;
      questionnaireDiv.appendChild(resetDiv);

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
        } else {
          // On the last question, finish the questionnaire regardless of input
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
      const resetLink = resetDiv.querySelector("a");
      resetLink.addEventListener("click", (e) => {
        e.preventDefault();
        resetQuestionnaire();
      });
    }

    showCurrentQuestion();
  }

  // Function to count visible services in a category
  function countVisibleServices(categoryId) {
    const container = document.getElementById(categoryId);
    if (!container) return 0;
    
    const cards = container.querySelectorAll(".card");
    let visibleCount = 0;
    
    cards.forEach(card => {
      if (card.style.display !== "none") {
        visibleCount++;
      }
    });
    
    return visibleCount;
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
    
    // Restore the original h2 text
    const actionGridH2 = document.querySelector(".action-grid h2");
    if (actionGridH2) {
      actionGridH2.textContent = "What do you want to do with Bitcoin?";
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