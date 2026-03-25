// ============================================================
// SOLESTE — Module Réglages (Firestore) — multi-tenant
// ============================================================
import { db } from './firebase.js';
import {
  doc, getDoc, setDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ── Clé du document config selon l'établissement actif ──────
function configDocId() {
  const estId = (typeof window !== 'undefined' && window.__estId) || 'panoramique';
  return `${estId}_global`;
}

// ── Lire les réglages ───────────────────────────────────────
export async function getSettings() {
  try {
    const snap = await getDoc(doc(db, 'config', configDocId()));
    if (snap.exists()) return snap.data();
    // Fallback sur l'ancien doc 'global' pour rétrocompatibilité
    const fallback = await getDoc(doc(db, 'config', 'global'));
    if (fallback.exists()) return fallback.data();
    return { hourlyCost: 0 };
  } catch {
    return { hourlyCost: 0 };
  }
}

// ── Enregistrer les réglages ────────────────────────────────
export async function saveSettings(data) {
  await setDoc(doc(db, 'config', configDocId()), {
    ...data,
    updatedAt: serverTimestamp()
  }, { merge: true });
}

// ── Coût horaire (raccourci) ────────────────────────────────
export async function getHourlyCost() {
  const s = await getSettings();
  return parseFloat(s.hourlyCost) || 0;
}

// ── Clé API Anthropic (localStorage) ───────────────────────
export function getApiKey() {
  return localStorage.getItem('soleste_anthropic_key') || '';
}

export function setApiKey(key) {
  localStorage.setItem('soleste_anthropic_key', key);
}
