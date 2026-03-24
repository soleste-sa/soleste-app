// ============================================================
// SOLESTE — Authentification Firebase
// ============================================================
import { auth } from './firebase.js';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// ── Guard : redirige vers login si non connecté ─────────────
export function requireAuth(callback) {
  return onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = '/index.html';
    } else {
      if (callback) callback(user);
    }
  });
}

// ── Guard : redirige vers dashboard si déjà connecté ───────
export function redirectIfAuth() {
  return onAuthStateChanged(auth, (user) => {
    if (user) window.location.href = '/dashboard.html';
  });
}

// ── Login ───────────────────────────────────────────────────
export async function login(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

// ── Logout ──────────────────────────────────────────────────
export async function logout() {
  await signOut(auth);
  window.location.href = '/index.html';
}

// ── Utilisateur courant ─────────────────────────────────────
export function currentUser() {
  return auth.currentUser;
}

// ── Afficher infos utilisateur dans le topbar ───────────────
export function renderUserInfo(user) {
  const nameEl   = document.getElementById('user-name');
  const emailEl  = document.getElementById('user-email');
  const avatarEl = document.getElementById('user-avatar');

  const displayName = user.displayName || user.email.split('@')[0];
  const initials    = displayName.substring(0, 2).toUpperCase();

  if (nameEl)   nameEl.textContent  = displayName;
  if (emailEl)  emailEl.textContent = user.email;
  if (avatarEl) avatarEl.textContent = initials;
}

// ── Écouter le bouton logout ────────────────────────────────
export function bindLogout() {
  const btn = document.getElementById('btn-logout');
  if (btn) btn.addEventListener('click', logout);
}
