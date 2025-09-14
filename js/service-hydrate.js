// Minimal client-side hydrator to sync static service pages with latest data/services.json
// Assumes each service page sets window.__BUOY_SERVICE__ to the service name
// and that the table contains rows with class names matching keys in services.json
(function(){
  try {
    if (!window.__BUOY_SERVICE__) return;
    const serviceName = String(window.__BUOY_SERVICE__);

    function setText(selector, text){
      const el = document.querySelector(selector);
      if (el) el.textContent = text;
    }

    function safeHTML(el, html){
      if (!el) return;
      el.innerHTML = html;
    }

    function renderFeatures(features){
      try {
        if (!features) return '';
        const ww = features.WW || [];
        return ww.map((f, idx) => {
          const isNegative = String(f.status).toLowerCase() === 'negative';
          const icon = isNegative ? 'cross.svg' : 'checkmark.svg';
          const negClass = isNegative && idx === 0 ? ' negative-group-start' : '';
          return `<div class="feature-item${negClass}"><img src="/images/${icon}" alt="${isNegative ? 'negative' : 'positive'} icon" class="checkmark-icon"/> ${f.text}</div>`;
        }).join('');
      } catch(_) { return ''; }
    }

    function renderInterface(interfaceVal){
      if (!interfaceVal) return '';
      const lower = String(interfaceVal).toLowerCase();
      let icon = 'mobile.svg';
      let label = interfaceVal;
      if (lower.includes('desktop') && !lower.includes('mobile')) {
        icon = 'desktop.svg';
      } else if (lower.includes('mobile & desktop') || (lower.includes('mobile') && lower.includes('desktop'))) {
        icon = 'devices.svg';
      }
      return `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%"><img src="/images/${icon}" class="platform-icon" alt="Platform" style="margin-bottom:8px"/><span>${interfaceVal}</span></div>`;
    }

    function renderRatings(ratings){
      if (!ratings) return '';
      const ios = ratings.ios ?? (ratings.text ? '' : '');
      const android = ratings.android ?? '';
      const parts = [];
      if (ios !== undefined && ios !== '') parts.push(`<div>iOS: ${ios}</div>`);
      if (android !== undefined && android !== '') parts.push(`<div>Android: ${android}</div>`);
      if (parts.length === 0 && ratings.text) parts.push(`<div>${ratings.text}</div>`);
      return parts.join('');
    }

    function renderFaqs(faqs){
      if (!Array.isArray(faqs)) return '';
      return faqs.map(f => {
        const q = f.q || '';
        const a = f.a || '';
        return `<details>\n  <summary>${q}</summary>\n  <div><p>${a}</p></div>\n</details>`;
      }).join('\n\n');
    }

    function updateFaqStructuredData(faqs){
      try {
        const script = Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
          .find(s => /"@type"\s*:\s*"FAQPage"/.test(s.textContent || ''));
        if (!script || !Array.isArray(faqs)) return;
        const data = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map(f => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a }
        })) };
        script.textContent = JSON.stringify(data);
      } catch(_) {}
    }

    function updateWebpageAndServiceLD(svc){
      try {
        const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
        const webPage = scripts.find(s => /"@type"\s*:\s*"WebPage"/.test(s.textContent || ''));
        const service = scripts.find(s => /"@type"\s*:\s*"Service"/.test(s.textContent || ''));
        if (webPage) {
          const j = JSON.parse(webPage.textContent || '{}');
          if (svc.description) j.description = svc.description.slice(0, 300) + (svc.description.length > 300 ? '…' : '');
          webPage.textContent = JSON.stringify(j);
        }
        if (service) {
          const j = JSON.parse(service.textContent || '{}');
          if (svc.name) j.name = svc.name;
          if (svc.website) j.url = svc.website;
          if (j.provider && typeof j.provider === 'object') {
            if (svc.name) j.provider.name = svc.name;
            if (svc.website) j.provider.url = svc.website;
          }
          service.textContent = JSON.stringify(j);
        }
      } catch(_) {}
    }

    fetch('/data/services.json')
      .then(r => r.json())
      .then(list => {
        const svc = (list || []).find(s => String(s.name).toLowerCase() === serviceName.toLowerCase());
        if (!svc) return;

        // Update title/headers where present
        setText('h2#category-title', svc.category || document.querySelector('h2#category-title')?.textContent || '');

        // Update type_of_platform
        const typeCell = document.querySelector('.feature-row.type_of_platform [data-service]');
        if (typeCell && svc.type_of_platform) typeCell.textContent = svc.type_of_platform;

        // supported_network
        const netCell = document.querySelector('.feature-row.supported_network [data-service]');
        if (netCell && svc.supported_network) netCell.textContent = svc.supported_network;

        // features (WW)
        const featCell = document.querySelector('.feature-row.features [data-service]');
        if (featCell && svc.features) safeHTML(featCell, renderFeatures(svc.features));

        // custody_control
        const custodyCell = document.querySelector('.feature-row.custody_control [data-service]');
        if (custodyCell && svc.custody_control) custodyCell.textContent = svc.custody_control;

        // kyc_required
        const kycCell = document.querySelector('.feature-row.kyc_required [data-service]');
        if (kycCell && svc.kyc_required) kycCell.textContent = svc.kyc_required;

        // recovery_method
        const recCell = document.querySelector('.feature-row.recovery_method [data-service]');
        if (recCell && svc.recovery_method) recCell.textContent = svc.recovery_method;

        // open_source
        const osCell = document.querySelector('.feature-row.open_source [data-service]');
        if (osCell && svc.open_source) osCell.textContent = svc.open_source;

        // interface
        const uiCell = document.querySelector('.feature-row.interface [data-service]');
        if (uiCell && svc.interface) safeHTML(uiCell, renderInterface(svc.interface));

        // app_ratings
        const ratingsCell = document.querySelector('.feature-row.app_ratings [data-service]');
        if (ratingsCell && svc.app_ratings) safeHTML(ratingsCell, renderRatings(svc.app_ratings));

        // profile image/name if available (optional best-effort)
        if (svc.profile) {
          const profCell = document.querySelector('.feature-row.profile [data-service]');
          if (profCell) {
            // Try to just set the caption text beneath the image if present
            const caption = profCell.querySelector('div[style*="text-align:center"]');
            if (caption) caption.textContent = svc.profile;
          }
        }

        // description (collapsible)
        if (svc.description) {
          const full = document.querySelector('.feature-row.description .description-full');
          const prev = document.querySelector('.feature-row.description .desktop-preview');
          const mob = document.querySelector('.feature-row.description .mobile-preview');
          if (full) safeHTML(full, svc.description.split(/\n\n/).map(p => `<p>${p}</p>`).join(''));
          const short = svc.description.replace(/\n/g,' ').slice(0, 280).trim();
          if (prev) prev.textContent = short;
          if (mob) mob.textContent = short.slice(0, 180);
        }

        // founded_in
        const foundedCell = document.querySelector('.feature-row.founded_in [data-service]');
        if (foundedCell && svc.founded_in) foundedCell.textContent = svc.founded_in;

        // website link
        const siteCell = document.querySelector('.feature-row.website [data-service]');
        if (siteCell && svc.website) {
          const a = siteCell.querySelector('a');
          try {
            const url = new URL(svc.website);
            const host = url.host.replace(/^www\./,'');
            if (a) {
              a.href = svc.website;
              a.textContent = host;
            } else {
              safeHTML(siteCell, `<a href="${svc.website}" target="_blank">${host}</a>`);
            }
          } catch(_) {
            // fallback to plain text
            siteCell.textContent = svc.website;
          }
        }

        // FAQs block
        if (Array.isArray(svc.faqs)) {
          const faqSection = document.querySelector('.brand-faq .faq-list');
          if (faqSection) safeHTML(faqSection, renderFaqs(svc.faqs));
          updateFaqStructuredData(svc.faqs);
        }

        // Update LD for WebPage and Service
        updateWebpageAndServiceLD(svc);
      })
      .catch(()=>{});
  } catch(_) {}
})();

