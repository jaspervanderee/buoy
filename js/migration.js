/**
 * Migration section interactions
 * Handles collapsible flow cards on mobile with deep-link support
 */
(function() {
  'use strict';

  function init() {
    // Handle migration flow card toggles
    var toggles = document.querySelectorAll('.migration-toggle');
    
    toggles.forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        var card = btn.closest('.migration-card');
        var isCollapsed = card.classList.contains('is-collapsed');
        var flowId = card.getAttribute('data-flow-id');
        
        // Toggle state
        card.classList.toggle('is-collapsed');
        btn.setAttribute('aria-expanded', isCollapsed ? 'true' : 'false');
        
        // Analytics event
        if (window.umami && flowId) {
          window.umami.track(isCollapsed ? 'migration_expand' : 'migration_collapse', {
            flow_id: flowId,
            service: window.__BUOY_SERVICE__ || ''
          });
        }
      });
    });
    
    // Track migration link clicks
    var migrationLinks = document.querySelectorAll('.migration-links a[data-event="migration_link_click"]');
    migrationLinks.forEach(function(link) {
      link.addEventListener('click', function() {
        var flowId = link.getAttribute('data-flow-id');
        var href = link.getAttribute('href');
        if (window.umami && flowId) {
          window.umami.track('migration_link_click', {
            flow_id: flowId,
            href: href,
            service: window.__BUOY_SERVICE__ || ''
          });
        }
      });
    });

    // Auto-expand on deep link
    if (window.location.hash) {
      var hash = window.location.hash.substring(1); // Remove #
      var targetCard = document.getElementById(hash);
      
      if (targetCard && targetCard.classList.contains('migration-card')) {
        // Expand the card
        targetCard.classList.remove('is-collapsed');
        
        // Update toggle button aria-expanded
        var toggle = targetCard.querySelector('.migration-toggle');
        if (toggle) {
          toggle.setAttribute('aria-expanded', 'true');
        }
        
        // Scroll into view with smooth behavior
        setTimeout(function() {
          targetCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    }
    
    // Handle glossary term links (prevent base href redirect)
    var glossaryLinks = document.querySelectorAll('.glossary-link');
    glossaryLinks.forEach(function(link) {
      link.addEventListener('click', function(e) {
        e.preventDefault();
        
        var href = link.getAttribute('href');
        if (!href || !href.startsWith('#')) return;
        
        var targetId = href.substring(1);
        var targetTerm = document.getElementById(targetId);
        
        if (targetTerm) {
          // Find and open the glossary details element
          var glossaryDetails = document.querySelector('.mini-glossary');
          if (glossaryDetails && !glossaryDetails.open) {
            glossaryDetails.open = true;
          }
          
          // Wait for details to expand, then scroll
          setTimeout(function() {
            targetTerm.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Add temporary highlight
            targetTerm.classList.add('glossary-highlight');
            setTimeout(function() {
              targetTerm.classList.remove('glossary-highlight');
            }, 2000);
          }, glossaryDetails && !glossaryDetails.open ? 150 : 0);
        }
      });
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

