// ============================================================
// SOLESTE — Module Base Articles (Firestore)
// ============================================================
import { db } from './firebase.js';
import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  getDocs, getDoc, query, orderBy, where,
  serverTimestamp, writeBatch, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const COL = 'articles';

// ── Créer un article ────────────────────────────────────────
export async function createArticle(data) {
  const estId = window.__estId || 'panoramique';
  return await addDoc(collection(db, COL), {
    ...sanitizeArticle(data),
    estId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

// ── Mettre à jour un article ────────────────────────────────
export async function updateArticle(id, data) {
  await updateDoc(doc(db, COL, id), {
    ...sanitizeArticle(data),
    updatedAt: serverTimestamp()
  });
}

// ── Supprimer un article ────────────────────────────────────
export async function deleteArticle(id) {
  await deleteDoc(doc(db, COL, id));
}

// ── Récupérer tous les articles (snapshot unique, dual-schema) ─
export async function getAllArticles() {
  const estId = (typeof window !== 'undefined' && window.__estId) || 'panoramique';
  // Essayer d'abord avec le champ 'name' (nouveau schéma)
  try {
    const q = query(collection(db, COL), where('estId','==',estId), orderBy('name'));
    const snap = await getDocs(q);
    if (snap.docs.length > 0) {
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }
  } catch(_) {}
  // Fallback : champ 'nom' (ancien schéma) ou sans orderBy
  try {
    const q = query(collection(db, COL), where('estId','==',estId), orderBy('nom'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch(_) {}
  // Dernier fallback : pas de tri, tri client
  const q = query(collection(db, COL), where('estId','==',estId));
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a,b) => (a.name||a.nom||'').localeCompare(b.name||b.nom||'', 'fr'));
}

// ── Récupérer un article par ID ─────────────────────────────
export async function getArticle(id) {
  const snap = await getDoc(doc(db, COL, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

// ── Écoute temps réel (dual-schema) ─────────────────────────
export function listenArticles(callback) {
  const estId = (typeof window !== 'undefined' && window.__estId) || 'panoramique';
  // Essayer name d'abord, fallback nom
  const tryListen = (field) => {
    const q = query(collection(db, COL), where('estId','==',estId), orderBy(field));
    return onSnapshot(q,
      snap => {
        const articles = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        callback(articles);
      },
      () => {
        if (field === 'name') tryListen('nom');
      }
    );
  };
  return tryListen('name');
}

// ── Import batch depuis Excel/CSV ───────────────────────────
// rows = [{ nom, uc, us, ratioUsUc, prixUc, fournisseur, codeArticle, codeBarres, categorie }]
export async function importArticles(rows) {
  const estId    = window.__estId || 'panoramique';
  const existing = await getAllArticles();
  const byName   = {};
  existing.forEach(a => { byName[a.nom?.toLowerCase().trim()] = a; });

  const results = { added: 0, updated: 0, errors: [] };
  const batch   = writeBatch(db);

  for (const row of rows) {
    try {
      const key = row.nom?.toLowerCase().trim();
      if (!key) continue;
      const exist = byName[key];
      if (exist) {
        // Mise à jour prix seulement
        batch.update(doc(db, COL, exist.id), {
          prixUc: parseFloat(row.prixUc) || exist.prixUc,
          updatedAt: serverTimestamp()
        });
        results.updated++;
      } else {
        batch.set(doc(collection(db, COL)), {
          ...sanitizeArticle(row),
          estId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        results.added++;
      }
    } catch (e) {
      results.errors.push({ row, error: e.message });
    }
  }

  await batch.commit();
  return results;
}

// ── Upsert articles depuis OCR (avec statut par ligne) ─────
export async function upsertArticlesFromOcr(validatedRows) {
  const estId    = window.__estId || 'panoramique';
  const existing = await getAllArticles();
  const byName   = {};
  existing.forEach(a => { byName[a.nom?.toLowerCase().trim()] = a; });

  const results = { added: 0, updated: 0 };
  const batch   = writeBatch(db);

  for (const row of validatedRows) {
    const key = row.nom?.toLowerCase().trim();
    if (!key) continue;
    const exist = byName[key];
    if (exist) {
      batch.update(doc(db, COL, exist.id), {
        prixUc: parseFloat(row.prixUc) || exist.prixUc,
        updatedAt: serverTimestamp()
      });
      results.updated++;
    } else {
      batch.set(doc(collection(db, COL)), {
        ...sanitizeArticle(row),
        estId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      results.added++;
    }
  }

  await batch.commit();
  return results;
}

// ── Nettoyage des données ───────────────────────────────────
function sanitizeArticle(data) {
  return {
    nom:          String(data.nom || '').trim(),
    categorie:    data.categorie || 'FOOD',
    uc:           String(data.uc || '').trim(),       // Unité commande (ex: carton 12)
    us:           String(data.us || '').trim(),       // Unité stockage (ex: bouteille)
    ratioUsUc:    parseFloat(data.ratioUsUc) || 1,   // nb US par UC
    prixUc:       parseFloat(data.prixUc)    || 0,   // Prix par UC HTVA
    fournisseur:  String(data.fournisseur || '').trim(),
    codeArticle:  String(data.codeArticle || '').trim(),
    codeBarres:   String(data.codeBarres || '').trim(),
  };
}

// ── Prix unitaire de stockage (calculé) ────────────────────
export function prixUs(article) {
  if (!article.prixUc || !article.ratioUsUc) return 0;
  return article.prixUc / article.ratioUsUc;
}

// ── Catégories disponibles ──────────────────────────────────
export const CATEGORIES = ['FOOD', 'BEVERAGE', 'CLEANING', 'ONE WAY', 'OFFICE'];

export const CAT_LABELS = {
  FOOD:     'Food',
  BEVERAGE: 'Boissons',
  CLEANING: 'Entretien',
  'ONE WAY':'One Way',
  OFFICE:   'Bureau'
};
