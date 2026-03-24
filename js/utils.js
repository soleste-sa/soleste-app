// ============================================================
// SOLESTE — Utilitaires partagés
// ============================================================

// ── Toast Notifications ─────────────────────────────────────
export function toast(message, type = 'default', duration = 3500) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const icons = {
    success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`,
    error:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    default: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`
  };
  const el = document.createElement('div');
  el.className = `toast ${type !== 'default' ? type : ''}`;
  el.innerHTML = `${icons[type] || icons.default}<span>${message}</span>`;
  container.appendChild(el);
  setTimeout(() => {
    el.style.animation = 'toastOut .3s ease forwards';
    setTimeout(() => el.remove(), 300);
  }, duration);
}

// ── Normalisation texte (recherche insensible accents/casse) ─
export function normalize(str) {
  if (!str) return '';
  return str.toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function fuzzyMatch(str, query) {
  const ns = normalize(str);
  const nq = normalize(query);
  return ns.includes(nq);
}

// ── Formatage ───────────────────────────────────────────────
export function formatCurrency(val, decimals = 2) {
  const n = parseFloat(val) || 0;
  return n.toFixed(decimals).replace('.', ',') + ' €';
}

export function formatPercent(val, decimals = 1) {
  const n = parseFloat(val) || 0;
  return n.toFixed(decimals) + ' %';
}

export function formatDate(ts) {
  if (!ts) return '—';
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('fr-BE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatDateTime(ts) {
  if (!ts) return '—';
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('fr-BE', { day:'2-digit', month:'2-digit', year:'numeric' })
    + ' ' + d.toLocaleTimeString('fr-BE', { hour:'2-digit', minute:'2-digit' });
}

// ── Badge catégorie ─────────────────────────────────────────
const CAT_CLASSES = {
  FOOD:     'badge-food',
  BEVERAGE: 'badge-bev',
  CLEANING: 'badge-clean',
  'ONE WAY':'badge-oneway',
  OFFICE:   'badge-office',
};
const CAT_LABELS = {
  FOOD: 'Food', BEVERAGE: 'Boisson', CLEANING: 'Entretien',
  'ONE WAY': 'One Way', OFFICE: 'Bureau'
};
export function categoryBadge(cat) {
  const cls = CAT_CLASSES[cat] || 'badge-oneway';
  const lbl = CAT_LABELS[cat] || cat;
  return `<span class="badge ${cls}">${lbl}</span>`;
}

// ── TVA belge ───────────────────────────────────────────────
export const TVA_RATES = [
  { label: '6 %', value: 6 },
  { label: '12 %', value: 12 },
  { label: '21 %', value: 21 },
];

export function htva(priceTvac, tvaRate) {
  return priceTvac / (1 + tvaRate / 100);
}

// ── Modal helpers ───────────────────────────────────────────
export function openModal(id) {
  document.getElementById(id)?.classList.add('open');
}
export function closeModal(id) {
  document.getElementById(id)?.classList.remove('open');
}
export function setupModalClose(id) {
  const backdrop = document.getElementById(id);
  if (!backdrop) return;
  backdrop.addEventListener('click', e => {
    if (e.target === backdrop) closeModal(id);
  });
}

// ── Tabs ────────────────────────────────────────────────────
export function setupTabs(containerEl) {
  const btns = containerEl.querySelectorAll('.tab-btn');
  const panels = containerEl.querySelectorAll('.tab-panel');
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      btns.forEach(b => b.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const target = btn.dataset.tab;
      containerEl.querySelector(`[data-panel="${target}"]`)?.classList.add('active');
    });
  });
}

// ── Debounce ────────────────────────────────────────────────
export function debounce(fn, delay = 250) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}

// ── Generate ID ─────────────────────────────────────────────
export function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ── Loading overlay ──────────────────────────────────────────
export function showLoading(msg = 'Chargement…') {
  let el = document.getElementById('global-loading');
  if (!el) {
    el = document.createElement('div');
    el.id = 'global-loading';
    el.className = 'loading-overlay';
    el.innerHTML = `<div class="spinner"></div><p style="color:var(--forest-dk);font-size:.9rem;">${msg}</p>`;
    document.body.appendChild(el);
  } else {
    el.querySelector('p').textContent = msg;
    el.style.display = 'flex';
  }
}
export function hideLoading() {
  document.getElementById('global-loading')?.remove();
}

// ── Auth guard (à appeler sur chaque page protégée) ──────────
export async function requireAuth() {
  return new Promise((resolve) => {
    import('./firebase.js').then(({ auth }) => {
      const { onAuthStateChanged } = window.__firebaseAuth || {};
      // Fallback pour modules ES
      auth.onAuthStateChanged(user => {
        if (!user) {
          window.location.href = 'index.html';
        } else {
          resolve(user);
        }
      });
    });
  });
}
