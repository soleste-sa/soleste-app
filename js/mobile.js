// ============================================================
// SOLESTE — Mobile Navigation
// Drawer hamburger + bannière établissement
// ============================================================

export function initMobileNav(activePage) {
  if (window.innerWidth > 768) return;

  // ── Bannière établissement ────────────────────────────────
  const estName = document.querySelector('.est-selector-wrap select option:checked')?.textContent
    || document.querySelector('#est-selector option:checked')?.textContent
    || window.__estName || '';

  const banner = document.createElement('div');
  banner.className = 'mob-est-banner';
  banner.id = 'mob-est-banner';
  banner.textContent = estName;
  document.querySelector('.app-header').after(banner);

  // Mettre à jour la bannière quand le sélecteur change
  const sel = document.getElementById('est-selector');
  if (sel) {
    sel.addEventListener('change', () => {
      banner.textContent = sel.options[sel.selectedIndex]?.textContent || '';
      drawerEst.textContent = sel.options[sel.selectedIndex]?.textContent || '';
    });
  }

  // ── Hamburger ─────────────────────────────────────────────
  const hamburger = document.createElement('button');
  hamburger.className = 'mob-hamburger';
  hamburger.setAttribute('aria-label', 'Menu');
  hamburger.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
    <line x1="3" y1="6" x2="21" y2="6"/>
    <line x1="3" y1="12" x2="21" y2="12"/>
    <line x1="3" y1="18" x2="21" y2="18"/>
  </svg>`;
  document.querySelector('.app-header').prepend(hamburger);

  // ── Drawer ────────────────────────────────────────────────
  const navLinks = [
    { href: 'dashboard.html',  label: 'Tableau de bord', section: 'Navigation',   icon: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>' },
    { href: 'database.html',   label: 'Base articles',   section: 'Modules',      icon: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>' },
    { href: 'suppliers.html',  label: 'Fournisseurs',    section: null,           icon: '<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>' },
    { href: 'orders.html',     label: 'Commandes',       section: null,           icon: '<path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>' },
    { href: 'menu.html',       label: 'Menu engineering', section: null,          icon: '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>' },
    { href: 'inventory.html',  label: 'Inventaire',      section: null,           icon: '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>' },
    { href: 'results.html',    label: 'Résultats',        section: 'Analyse',     icon: '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>' },
    { href: 'staffcost.html',  label: 'Staff Cost',       section: null,          icon: '<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>' },
    { href: 'foodcost.html',   label: 'Food Cost',        section: null,          icon: '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2"/><path d="M7 2v20"/><path d="M21 15V2"/>' },
    { href: 'settings.html',   label: 'Réglages',         section: 'Configuration', icon: '<circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M12 2v2M12 20v2M2 12h2M20 12h2"/>' },
  ];

  let navHtml = '';
  for (const link of navLinks) {
    if (link.section) {
      navHtml += `<div class="nav-section">${link.section}</div>`;
    }
    const isActive = activePage === link.href;
    navHtml += `<a href="${link.href}" class="nav-item${isActive ? ' active' : ''}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${link.icon}</svg>
      ${link.label}
    </a>`;
  }

  const overlay = document.createElement('div');
  overlay.className = 'mob-drawer-overlay';
  overlay.id = 'mob-drawer-overlay';

  const drawer = document.createElement('div');
  drawer.className = 'mob-drawer';
  drawer.id = 'mob-drawer';
  drawer.innerHTML = `
    <div class="mob-drawer-header">
      <div class="logo">SOL<span>ESTE</span></div>
      <button class="mob-drawer-close" id="mob-drawer-close" aria-label="Fermer">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
    <div class="mob-drawer-est" id="mob-drawer-est">${estName}</div>
    <nav>${navHtml}</nav>
  `;

  document.body.appendChild(overlay);
  document.body.appendChild(drawer);

  const drawerEst = document.getElementById('mob-drawer-est');

  // Mise à jour dynamique via MutationObserver dès que le sélecteur est injecté
  const updateEstName = () => {
    const sel = document.getElementById('est-selector');
    const name = sel ? sel.options[sel.selectedIndex]?.textContent : '';
    if (name) {
      banner.textContent = name;
      drawerEst.textContent = name;
    }
  };
  // Observer l'injection du sélecteur dans le header-right
  const observer = new MutationObserver(() => {
    if (document.getElementById('est-selector-wrap')) {
      updateEstName();
      // Re-observer les changements de sélecteur
      const sel = document.getElementById('est-selector');
      if (sel) sel.addEventListener('change', updateEstName);
    }
  });
  observer.observe(document.querySelector('.header-right') || document.body, { childList: true, subtree: true });
  // Fallback
  setTimeout(updateEstName, 800);
  setTimeout(updateEstName, 2000);
  document.addEventListener('estChanged', updateEstName);

  // ── Open / Close ──────────────────────────────────────────
  function openDrawer() {
    overlay.classList.add('open');
    drawer.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeDrawer() {
    overlay.classList.remove('open');
    drawer.classList.remove('open');
    document.body.style.overflow = '';
  }

  hamburger.addEventListener('click', openDrawer);
  overlay.addEventListener('click', closeDrawer);
  document.getElementById('mob-drawer-close').addEventListener('click', closeDrawer);

  // Swipe gauche pour fermer
  let touchStartX = 0;
  drawer.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
  drawer.addEventListener('touchend', e => {
    if (touchStartX - e.changedTouches[0].clientX > 60) closeDrawer();
  }, { passive: true });
}
