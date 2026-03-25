// ============================================================
// SOLESTE — Module Menu Engineering (Firestore)
// ============================================================
import { db } from './firebase.js';
import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  getDocs, getDoc, query, orderBy, serverTimestamp, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const COL = 'recipes';

// ── Catégories de plats ─────────────────────────────────────
export const RECIPE_CATEGORIES = [
  'À partager',
  'Entrées',
  'Plats',
  'Desserts',
  'Boissons'
];

// ── Taux TVA belge ──────────────────────────────────────────
export const TVA_RATES = [
  { label: '6%',  value: 6  },
  { label: '12%', value: 12 },
  { label: '21%', value: 21 },
];

// ── CRUD Recettes ───────────────────────────────────────────
export async function createRecipe(data) {
  const estId = (typeof window !== 'undefined' && window.__estId) || 'panoramique';
  return await addDoc(collection(db, COL), {
    ...sanitizeRecipe(data),
    estId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function updateRecipe(id, data) {
  await updateDoc(doc(db, COL, id), {
    ...sanitizeRecipe(data),
    updatedAt: serverTimestamp()
  });
}

export async function deleteRecipe(id) {
  await deleteDoc(doc(db, COL, id));
}

export async function getAllRecipes() {
  const q = query(collection(db, COL), orderBy('nom'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getRecipe(id) {
  const snap = await getDoc(doc(db, COL, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export function listenRecipes(callback) {
  const q = query(collection(db, COL), orderBy('nom'));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

// ── Calculs Food Cost ───────────────────────────────────────

// Coût total des ingrédients (en €)
// ingredients = [{ articleId, quantiteUs, prixUs }]
export function calculCoutMatiere(ingredients) {
  return ingredients.reduce((sum, ing) => {
    const qty  = parseFloat(ing.quantiteUs) || 0;
    const prix = parseFloat(ing.prixUs)     || 0;
    return sum + (qty * prix);
  }, 0);
}

// Prix HTVA depuis prix TVAC
export function prixHtva(prixTvac, tauxTva) {
  const tvac = parseFloat(prixTvac) || 0;
  const tva  = parseFloat(tauxTva)  || 0;
  return tvac / (1 + tva / 100);
}

// Food cost en %
export function foodCostPct(coutMatiere, prixHtvaVal) {
  if (!prixHtvaVal) return 0;
  return (coutMatiere / prixHtvaVal) * 100;
}

// Marge brute (PV HTVA - coût matières)
export function margeBrute(prixHtvaVal, coutMatiere) {
  return prixHtvaVal - coutMatiere;
}

// Coût de préparation (temps × coût horaire)
export function coutPreparation(tempsMinutes, coutHoraire) {
  return (parseFloat(tempsMinutes) / 60) * parseFloat(coutHoraire);
}

// Marge nette (PV HTVA - coût matières - coût préparation)
export function margeNette(prixHtvaVal, coutMatiere, coutPrep) {
  return prixHtvaVal - coutMatiere - coutPrep;
}

// Indicateur food cost
export function foodCostIndicator(pct) {
  if (pct <= 28) return { label: 'Excellent', cls: 'fc-excellent' };
  if (pct <= 32) return { label: 'Bon',       cls: 'fc-good'      };
  if (pct <= 38) return { label: 'Moyen',     cls: 'fc-average'   };
  return              { label: 'Élevé',       cls: 'fc-bad'       };
}

// ── Calculs complets pour une recette ───────────────────────
export function calcRecipe(recipe, coutHoraire = 0) {
  const cout     = calculCoutMatiere(recipe.ingredients || []);
  const htva     = prixHtva(recipe.prixTvac, recipe.tauxTva);
  const fc       = foodCostPct(cout, htva);
  const coutPrep = coutPreparation(recipe.tempsPrep || 0, coutHoraire);
  return {
    coutMatiere:     cout,
    prixHtva:        htva,
    foodCostPct:     fc,
    coutPreparation: coutPrep,
    margeBrute:      margeBrute(htva, cout),
    margeNette:      margeNette(htva, cout, coutPrep),
    indicator:       foodCostIndicator(fc),
  };
}

// ── Nettoyage données recette ───────────────────────────────
function sanitizeRecipe(data) {
  return {
    nom:          String(data.nom || '').trim(),
    categorie:    data.categorie   || 'Plats',
    prixTvac:     parseFloat(data.prixTvac) || 0,
    tauxTva:      parseFloat(data.tauxTva)  || 6,
    tempsPrep:    parseFloat(data.tempsPrep) || 0,
    methodPrep:   String(data.methodPrep || '').trim(),
    ingredients:  (data.ingredients || []).map(ing => ({
      articleId:   ing.articleId   || '',
      articleNom:  ing.articleNom  || '',
      quantiteUs:  parseFloat(ing.quantiteUs) || 0,
      unitUs:      ing.unitUs      || '',
      prixUs:      parseFloat(ing.prixUs)     || 0,
    })),
    notes: String(data.notes || '').trim(),
  };
}
