// ============================================================
// SOLESTE — Sélecteur établissement dans le header
// À importer dans chaque page après initEstablishment()
// ============================================================
import { getActiveEstId, setActiveEstId } from './establishment.js';

// Injecte le sélecteur d'établissement dans le header
export function renderEstSelector(establishments, currentEstId, onSwitch) {
  const existing = document.getElementById('est-selector-wrap');
  if (existing) existing.remove();

  if (establishments.length <= 1) return; // Pas de sélecteur si 1 seul établissement

  const nonMaster = establishments.filter(e => e.id !== 'master');
  if (nonMaster.length <= 1 && !establishments.find(e=>e.id==='master')) return;

  const wrap = document.createElement('div');
  wrap.id = 'est-selector-wrap';
  wrap.style.cssText = 'display:flex;align-items:center;gap:8px;margin-right:4px;';

  const label = document.createElement('span');
  label.style.cssText = 'font-size:.7rem;color:rgba(245,240,232,.5);text-transform:uppercase;letter-spacing:.08em;';
  label.textContent = 'Établissement';

  const sel = document.createElement('select');
  sel.id = 'est-selector';
  sel.style.cssText = [
    'padding:4px 10px',
    'border:1.5px solid rgba(245,240,232,.25)',
    'border-radius:6px',
    'background:rgba(255,255,255,.1)',
    'color:var(--cream)',
    'font-size:.8rem',
    'cursor:pointer',
    'font-family:var(--font-body)',
    'outline:none',
    'backdrop-filter:blur(4px)',
  ].join(';');

  establishments
    .filter(e => e.id !== 'master')
    .forEach(e => {
      const opt = document.createElement('option');
      opt.value = e.id;
      opt.textContent = e.name;
      if (e.id === currentEstId) opt.selected = true;
      sel.appendChild(opt);
    });

  // Ajouter MASTER si disponible
  if (establishments.find(e => e.id === 'master')) {
    const sep = document.createElement('option');
    sep.disabled = true;
    sep.textContent = '──────────';
    sel.appendChild(sep);
    const mOpt = document.createElement('option');
    mOpt.value = 'master';
    mOpt.textContent = '⚙ MASTER';
    if (currentEstId === 'master') mOpt.selected = true;
    sel.appendChild(mOpt);
  }

  sel.addEventListener('change', () => {
    setActiveEstId(sel.value);
    if (onSwitch) onSwitch(sel.value);
    else window.location.reload();
  });

  wrap.appendChild(label);
  wrap.appendChild(sel);

  // Insérer avant le user-badge dans le header-right
  const headerRight = document.querySelector('.header-right');
  if (headerRight) headerRight.prepend(wrap);
}
