/* eslint-env node */

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normalizeFaqs(service) {
  const list = Array.isArray(service?.faqs) ? service.faqs : [];
  const items = [];
  for (const it of list) {
    if (!it || typeof it !== 'object') continue;
    let q = typeof it.q === 'string' ? it.q.trim() : '';
    let a = typeof it.a === 'string' ? it.a.trim() : '';
    if (!q || !a) continue;
    // Keep answers to a single short paragraph: collapse newlines and extra spaces
    a = a.replace(/\s+/g, ' ').trim();
    items.push({ q, a });
    if (items.length >= 10) break;
  }
  return items;
}

export function renderFAQBlock(service) {
  const items = normalizeFaqs(service);
  if (items.length === 0) return '';
  const details = items
    .map(({ q, a }) => {
      return `
<details>
  <summary>${escapeHtml(q)}</summary>
  <div><p>${escapeHtml(a)}</p></div>
</details>`;
    })
    .join('\n');

  return `
<section class="brand-faq" aria-labelledby="faq-heading">
  <h2 id="faq-heading">FAQs</h2>
  <div class="faq-list">${details}</div>
</section>`;
}

export function renderFAQJsonLD(service) {
  const items = normalizeFaqs(service);
  if (items.length === 0) return '';
  const json = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: a,
      },
    })),
  };
  return `<script type="application/ld+json">${JSON.stringify(json)}</script>`;
}


