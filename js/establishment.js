// ============================================================
// SOLESTE — Module Établissement (multi-tenant)
// ============================================================
// Gère l'établissement actif pour l'utilisateur connecté.
// Stocke le choix dans localStorage pour persistance inter-sessions.
// ============================================================

import { db } from './firebase.js';
import {
  doc, getDoc, collection, getDocs,
  setDoc, updateDoc, deleteDoc, serverTimestamp, query, where
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const LS_KEY = 'soleste_active_est';

// ── Lire l'établissement actif depuis localStorage ────────────
export function getActiveEstId() {
  return localStorage.getItem(LS_KEY) || null;
}

export function setActiveEstId(estId) {
  if (estId) localStorage.setItem(LS_KEY, estId);
  else localStorage.removeItem(LS_KEY);
}

// ── Charger les établissements d'un utilisateur ───────────────
export async function getUserEstablishments(email) {
  try {
    // Chercher dans app_users par email (document ID = email)
    const snap = await getDoc(doc(db, 'app_users', email));
    if (!snap.exists()) return [];
    const data = snap.data();
    const estIds = data.establishments || [];
    if (!estIds.length) return [];

    // Charger les détails de chaque établissement
    const ests = [];
    for (const estId of estIds) {
      const estSnap = await getDoc(doc(db, 'establishments', estId));
      if (estSnap.exists()) {
        ests.push({ id: estId, ...estSnap.data() });
      }
    }
    return ests.sort((a, b) => (a.order || 99) - (b.order || 99));
  } catch (e) {
    console.error('[Establishment] getUserEstablishments error:', e);
    return [];
  }
}

// ── Initialiser l'établissement actif pour un user ────────────
// Retourne { estId, estName, establishments[], isMaster }
export async function initEstablishment(email) {
  const ests = await getUserEstablishments(email);

  if (!ests.length) {
    return { estId: null, estName: null, establishments: [], isMaster: false };
  }

  const isMaster = ests.some(e => e.id === 'master');

  // Vérifier si le localStorage pointe vers un établissement valide
  const saved = getActiveEstId();
  const validSaved = saved && ests.find(e => e.id === saved);

  let activeEst;
  if (validSaved) {
    activeEst = validSaved;
  } else {
    // Par défaut : premier établissement NON-master, ou master si c'est le seul
    activeEst = ests.find(e => e.id !== 'master') || ests[0];
    setActiveEstId(activeEst.id);
  }

  return {
    estId:          activeEst.id,
    estName:        activeEst.name,
    establishments: ests,
    isMaster,
  };
}

// ── Clé Firestore préfixée pour résultats/staffcost/foodcost ──
export function estDocKey(estId, year, month) {
  return `${estId}_${year}_${String(month + 1).padStart(2, '0')}`;
}

// ── CRUD Établissements (MASTER only) ─────────────────────────
export async function listAllEstablishments() {
  const snap = await getDocs(collection(db, 'establishments'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.order || 99) - (b.order || 99));
}

export async function createEstablishment(estId, name, order = 10) {
  await setDoc(doc(db, 'establishments', estId), {
    name,
    order,
    createdAt: serverTimestamp(),
  });
}

export async function deleteEstablishment(estId) {
  if (estId === 'master') throw new Error('Impossible de supprimer le compte MASTER');
  await deleteDoc(doc(db, 'establishments', estId));
}

// ── Gestion des membres d'un établissement ────────────────────
export async function addMemberToEst(email, estId) {
  const ref = doc(db, 'app_users', email);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    // Créer le user s'il n'existe pas
    await setDoc(ref, { email, establishments: [estId], createdAt: serverTimestamp() });
  } else {
    const current = snap.data().establishments || [];
    if (!current.includes(estId)) {
      await updateDoc(ref, { establishments: [...current, estId] });
    }
  }
}

export async function removeMemberFromEst(email, estId) {
  const ref = doc(db, 'app_users', email);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const current = snap.data().establishments || [];
  await updateDoc(ref, { establishments: current.filter(e => e !== estId) });
}

export async function getEstMembers(estId) {
  // Chercher tous les app_users qui ont cet estId dans establishments[]
  const snap = await getDocs(
    query(collection(db, 'app_users'), where('establishments', 'array-contains', estId))
  );
  return snap.docs.map(d => ({ email: d.id, ...d.data() }));
}

// ── Migration one-shot des données existantes ─────────────────
// À appeler une seule fois depuis les Réglages
export async function migrateToMultiTenant(estId) {
  let migrated = 0;
  const collections = ['articles', 'recipes', 'suppliers', 'orders', 'inventories', 'inventory_lines'];

  for (const colName of collections) {
    const snap = await getDocs(collection(db, colName));
    for (const d of snap.docs) {
      if (!d.data().estId) {
        await updateDoc(doc(db, colName, d.id), { estId });
        migrated++;
      }
    }
  }

  // Pour résultats/staffcost/foodcost : renommer les clés (copier + supprimer)
  const keyedCols = ['results', 'staffcost', 'foodcost'];
  for (const colName of keyedCols) {
    const snap = await getDocs(collection(db, colName));
    for (const d of snap.docs) {
      const key = d.id;
      // Si la clé ne commence pas déjà par estId_
      if (!key.startsWith(estId + '_')) {
        const newKey = `${estId}_${key}`;
        await setDoc(doc(db, colName, newKey), { ...d.data() });
        await deleteDoc(doc(db, colName, key));
        migrated++;
      }
    }
  }

  return migrated;
}
