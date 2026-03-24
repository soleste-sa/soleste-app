// ============================================================
// SOLESTE — Gestion des rôles utilisateurs
// ============================================================
// Hiérarchie : staff < manager < admin
// STAFF   : Inventaire + Menu engineering
// MANAGER : + Base articles
// ADMIN   : + Réglages (tout)
// ============================================================
import { db } from './firebase.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const ROLE_KEY   = 'soleste_user_role';
const ADMIN_EMAIL = 'esteban@soleste.co'; // admin par défaut

// Hiérarchie numérique
const ROLE_LEVELS = { staff: 1, manager: 2, admin: 3 };

// ── Récupérer le rôle depuis Firestore ──────────────────────
export async function fetchUserRole(user) {
  // L'email admin est toujours admin
  if (user.email === ADMIN_EMAIL) {
    sessionStorage.setItem(ROLE_KEY, 'admin');
    return 'admin';
  }
  try {
    const snap = await getDoc(doc(db, 'app_users', user.uid));
    const role = snap.exists() ? (snap.data().role || 'staff') : 'staff';
    sessionStorage.setItem(ROLE_KEY, role);
    return role;
  } catch {
    sessionStorage.setItem(ROLE_KEY, 'staff');
    return 'staff';
  }
}

// ── Lire le rôle depuis sessionStorage (rapide) ─────────────
export function getRole() {
  return sessionStorage.getItem(ROLE_KEY) || 'staff';
}

// ── Vérifier si le rôle courant >= niveau requis ─────────────
export function hasRole(requiredRole) {
  const current  = getRole();
  const cLevel   = ROLE_LEVELS[current]  || 1;
  const rLevel   = ROLE_LEVELS[requiredRole] || 1;
  return cLevel >= rLevel;
}

// ── Appliquer les restrictions sur la page ───────────────────
// Masque les éléments marqués data-role="manager|admin"
// si le rôle courant est insuffisant
export function applyRoleRestrictions() {
  const role = getRole();
  const level = ROLE_LEVELS[role] || 1;

  // Masquer les éléments dont le rôle requis est supérieur au rôle courant
  document.querySelectorAll('[data-role]').forEach(el => {
    const required = el.dataset.role;
    const reqLevel = ROLE_LEVELS[required] || 1;
    if (level < reqLevel) {
      el.style.display = 'none';
      el.setAttribute('aria-hidden', 'true');
    }
  });

  // Sidebar : masquer les liens interdits
  applySidebarRestrictions(role);

  // Badge rôle dans le topbar si présent
  const roleBadge = document.getElementById('role-badge');
  if (roleBadge) {
    const labels = { staff: 'Staff', manager: 'Manager', admin: 'Admin' };
    const colors = { staff: 'badge-neutral', manager: 'badge-beverage', admin: 'badge-food' };
    roleBadge.textContent  = labels[role] || role;
    roleBadge.className    = `badge ${colors[role] || 'badge-neutral'}`;
    roleBadge.style.display = 'inline-flex';
  }
}

// ── Restrictions de navigation dans la sidebar ──────────────
function applySidebarRestrictions(role) {
  const level = ROLE_LEVELS[role] || 1;

  // Mapping page → niveau minimum requis
  const pageRoles = {
    'database.html':  2,  // manager+
    'settings.html':  3,  // admin seulement
  };

  document.querySelectorAll('.nav-item[href]').forEach(link => {
    const href = link.getAttribute('href');
    const page = href?.split('/').pop();
    const req  = pageRoles[page];
    if (req && level < req) {
      link.style.display = 'none';
    }
  });
}

// ── Guard de page : redirige si accès interdit ───────────────
export function guardPage(requiredRole) {
  const role  = getRole();
  const level = ROLE_LEVELS[role] || 1;
  const req   = ROLE_LEVELS[requiredRole] || 1;
  if (level < req) {
    // Rediriger vers dashboard avec message
    sessionStorage.setItem('soleste_access_denied', requiredRole);
    window.location.href = 'dashboard.html';
    return false;
  }
  return true;
}

// ── Vider le rôle au logout ──────────────────────────────────
export function clearRole() {
  sessionStorage.removeItem(ROLE_KEY);
}
