// ============================================================
// SOLESTE — Module Inventaire (Firestore)
// ============================================================
import { db } from './firebase.js';
import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  getDocs, getDoc, query, orderBy, where,
  serverTimestamp, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Collections
const COL_INV   = 'inventories';
const COL_LINES = 'inventory_lines';
const COL_PLACES = () => `places_${(typeof window !== 'undefined' && window.__estId) || 'panoramique'}`;

// ──────────────────────────────────────────────────────────────
// PLACES (emplacements de stock)
// ──────────────────────────────────────────────────────────────
export async function getPlaces() {
  const snap = await getDocs(query(collection(db, COL_PLACES()), orderBy('nom')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function createPlace(nom) {
  return await addDoc(collection(db, COL_PLACES()), {
    nom: String(nom).trim(),
    createdAt: serverTimestamp()
  });
}

export async function deletePlace(id) {
  await deleteDoc(doc(db, COL_PLACES(), id));
}

export function listenPlaces(callback) {
  return onSnapshot(
    query(collection(db, COL_PLACES()), orderBy('nom')),
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  );
}

// ──────────────────────────────────────────────────────────────
// INVENTAIRES
// ──────────────────────────────────────────────────────────────

// Créer un nouvel inventaire (en cours)
export async function createInventory(data) {
  const ref = await addDoc(collection(db, COL_INV), {
    estId: (typeof window !== 'undefined' && window.__estId) || 'panoramique',
    date:       data.date || new Date().toISOString().slice(0, 10),
    places:     data.places || [],
    createdBy:  data.createdBy || '',
    createdByEmail: data.createdByEmail || '',
    status:     'draft',   // draft | confirmed
    createdAt:  serverTimestamp(),
    updatedAt:  serverTimestamp(),
  });
  return ref;
}

// Confirmer un inventaire (figer les quantités)
export async function confirmInventory(id) {
  await updateDoc(doc(db, COL_INV, id), {
    status:    'confirmed',
    confirmedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

// Supprimer un inventaire et ses lignes
export async function deleteInventory(id) {
  // Supprimer les lignes
  const linesSnap = await getDocs(
    query(collection(db, COL_LINES), where('inventoryId', '==', id))
  );
  const promises = linesSnap.docs.map(d => deleteDoc(d.ref));
  await Promise.all(promises);
  await deleteDoc(doc(db, COL_INV, id));
}

// Récupérer tous les inventaires (historique)
export async function getAllInventories() {
  const snap = await getDocs(
    query(collection(db, COL_INV), where('estId','==', (typeof window !== 'undefined' && window.__estId) || 'panoramique'), orderBy('createdAt', 'desc'))
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// Écoute temps réel inventaires
export function listenInventories(callback) {
  return onSnapshot(
    query(collection(db, COL_INV), where('estId','==', (typeof window !== 'undefined' && window.__estId) || 'panoramique'), orderBy('createdAt', 'desc')),
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  );
}

// ──────────────────────────────────────────────────────────────
// LIGNES D'INVENTAIRE
// ──────────────────────────────────────────────────────────────

// Récupérer les lignes d'un inventaire
export async function getInventoryLines(inventoryId) {
  const snap = await getDocs(
    query(collection(db, COL_LINES), where('inventoryId', '==', inventoryId))
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// Écouter les lignes en temps réel
export function listenInventoryLines(inventoryId, callback) {
  return onSnapshot(
    query(collection(db, COL_LINES), where('inventoryId', '==', inventoryId)),
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  );
}

// Ajouter ou mettre à jour une quantité pour un article dans un inventaire
// Mode additif : chaque scan ou saisie AJOUTE à la quantité existante
export async function addQuantity(inventoryId, article, quantite, place) {
  // Chercher si une ligne existe déjà pour cet article + place
  const existing = await getDocs(query(
    collection(db, COL_LINES),
    where('inventoryId', '==', inventoryId),
    where('articleId', '==', article.id),
    where('place', '==', place || '')
  ));

  if (!existing.empty) {
    const lineDoc  = existing.docs[0];
    const oldQty   = parseFloat(lineDoc.data().quantite) || 0;
    await updateDoc(lineDoc.ref, {
      quantite:  oldQty + parseFloat(quantite),
      updatedAt: serverTimestamp(),
    });
    return lineDoc.id;
  } else {
    const ref = await addDoc(collection(db, COL_LINES), {
      inventoryId,
      articleId:   article.id,
      articleNom:  article.nom,
      articleUs:   article.us,
      categorie:   article.categorie,
      place:       place || '',
      prixUs:      article.prixUc / (article.ratioUsUc || 1),
      quantite:    parseFloat(quantite),
      createdAt:   serverTimestamp(),
      updatedAt:   serverTimestamp(),
    });
    return ref.id;
  }
}

// Modifier directement la quantité d'une ligne
export async function setQuantity(lineId, quantite) {
  await updateDoc(doc(db, COL_LINES, lineId), {
    quantite:  parseFloat(quantite),
    updatedAt: serverTimestamp(),
  });
}

// Supprimer une ligne
export async function deleteLine(lineId) {
  await deleteDoc(doc(db, COL_LINES, lineId));
}

// ──────────────────────────────────────────────────────────────
// CALCULS INVENTAIRE
// ──────────────────────────────────────────────────────────────

// Valeur totale de l'inventaire
export function calcInventoryValue(lines) {
  return lines.reduce((sum, l) => {
    return sum + (parseFloat(l.quantite) || 0) * (parseFloat(l.prixUs) || 0);
  }, 0);
}

// Grouper les lignes par catégorie
export function groupByCategory(lines) {
  const groups = {};
  lines.forEach(l => {
    const cat = l.categorie || 'Autre';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(l);
  });
  return groups;
}

// Grouper les lignes par place
export function groupByPlace(lines) {
  const groups = {};
  lines.forEach(l => {
    const place = l.place || 'Sans lieu';
    if (!groups[place]) groups[place] = [];
    groups[place].push(l);
  });
  return groups;
}

// ──────────────────────────────────────────────────────────────
// CACHE LOCAL (inventaire en cours — avant confirmation)
// ──────────────────────────────────────────────────────────────
const CACHE_KEY = 'soleste_inventory_draft';

export function saveDraftCache(inventoryId, lines) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ inventoryId, lines, ts: Date.now() }));
  } catch {}
}

export function loadDraftCache() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

export function clearDraftCache() {
  sessionStorage.removeItem(CACHE_KEY);
}
