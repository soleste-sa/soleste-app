// ============================================================
// SOLESTE — Module Inventaire v2
// ============================================================
import { db } from './firebase.js';
import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  getDocs, query, orderBy, where, serverTimestamp, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const COL_INV   = 'inventories';
const COL_LINES = 'inventory_lines';
const estId = () => (typeof window !== 'undefined' && window.__estId) || 'panoramique';
const COL_PLACES = () => `places_${estId()}`;

// ── Places ───────────────────────────────────────────────────
export async function getPlaces() {
  try {
    const snap = await getDocs(query(collection(db, COL_PLACES()), orderBy('nom')));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch {
    const snap = await getDocs(collection(db, COL_PLACES()));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a,b) => (a.nom||'').localeCompare(b.nom||'', 'fr'));
  }
}

export async function createPlace(nom) {
  return addDoc(collection(db, COL_PLACES()), {
    nom: String(nom).trim(), createdAt: serverTimestamp()
  });
}

export async function deletePlace(id) {
  await deleteDoc(doc(db, COL_PLACES(), id));
}

export function listenPlaces(callback) {
  try {
    return onSnapshot(
      query(collection(db, COL_PLACES()), orderBy('nom')),
      snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
  } catch {
    return onSnapshot(collection(db, COL_PLACES()),
      snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }
}

// ── Inventaires ──────────────────────────────────────────────
export async function createInventory({ mois, place, createdBy }) {
  const ref = await addDoc(collection(db, COL_INV), {
    estId: estId(), mois, place,
    status: 'open', createdBy,
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });
  return ref;
}

export async function getAllInventories() {
  try {
    const snap = await getDocs(query(collection(db, COL_INV),
      where('estId','==', estId()), orderBy('mois', 'desc')));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch {
    const snap = await getDocs(query(collection(db, COL_INV), where('estId','==', estId())));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a,b) => (b.mois||'').localeCompare(a.mois||''));
  }
}

export async function closeInventory(id) {
  await updateDoc(doc(db, COL_INV, id), { status:'closed', updatedAt: serverTimestamp() });
}

export async function reopenInventory(id) {
  await updateDoc(doc(db, COL_INV, id), { status:'open', updatedAt: serverTimestamp() });
}

export async function deleteInventoryFull(id) {
  const lines = await getDocs(query(collection(db, COL_LINES), where('inventoryId','==', id)));
  await Promise.all(lines.docs.map(d => deleteDoc(d.ref)));
  await deleteDoc(doc(db, COL_INV, id));
}

// ── Lignes ───────────────────────────────────────────────────
export async function getLines(inventoryId) {
  const snap = await getDocs(query(collection(db, COL_LINES), where('inventoryId','==', inventoryId)));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export function listenLines(inventoryId, callback) {
  return onSnapshot(
    query(collection(db, COL_LINES), where('inventoryId','==', inventoryId)),
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  );
}

export async function setLine(inventoryId, article, quantity) {
  const name     = article.name || article.nom || '';
  const category = article.category || article.categorie || 'FOOD';
  const us       = article.us || '';
  const priceUC  = parseFloat(article.priceUC || article.prixUc) || 0;
  const ratio    = parseFloat(article.ratio || article.ratioUsUc) || 1;
  const priceUs  = ratio > 0 ? priceUC / ratio : 0;

  const existing = await getDocs(query(collection(db, COL_LINES),
    where('inventoryId','==', inventoryId), where('articleId','==', article.id)));

  if (!existing.empty) {
    await updateDoc(existing.docs[0].ref, { quantity: parseFloat(quantity)||0, updatedAt: serverTimestamp() });
    return existing.docs[0].id;
  } else {
    const ref = await addDoc(collection(db, COL_LINES), {
      inventoryId, estId: estId(),
      articleId: article.id, articleName: name,
      articleCategory: category, articleUs: us, priceUs,
      quantity: parseFloat(quantity)||0,
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
    return ref.id;
  }
}

export async function addDelta(inventoryId, article, delta) {
  const existing = await getDocs(query(collection(db, COL_LINES),
    where('inventoryId','==', inventoryId), where('articleId','==', article.id)));
  if (!existing.empty) {
    const cur = parseFloat(existing.docs[0].data().quantity) || 0;
    await updateDoc(existing.docs[0].ref, {
      quantity: Math.max(0, cur + parseFloat(delta)), updatedAt: serverTimestamp()
    });
    return existing.docs[0].id;
  }
  return setLine(inventoryId, article, Math.max(0, parseFloat(delta)));
}

export async function updateLineQty(lineId, quantity) {
  await updateDoc(doc(db, COL_LINES, lineId), { quantity: parseFloat(quantity)||0, updatedAt: serverTimestamp() });
}

export async function deleteLine(lineId) {
  await deleteDoc(doc(db, COL_LINES, lineId));
}

// ── Calculs ──────────────────────────────────────────────────
export function calcValue(lines) {
  return lines.reduce((s, l) => s + (parseFloat(l.quantity)||0) * (parseFloat(l.priceUs)||0), 0);
}

export function calcByCategory(lines) {
  const cats = {};
  for (const l of lines) {
    const cat = l.articleCategory || 'Autre';
    if (!cats[cat]) cats[cat] = { lines: [], value: 0 };
    cats[cat].lines.push(l);
    cats[cat].value += (parseFloat(l.quantity)||0) * (parseFloat(l.priceUs)||0);
  }
  return cats;
}
