// ============================================================
// SOLESTE — Module KPI partagé
// Gestion des données RÉSULTATS / STAFF COST / FOOD COST
// ============================================================
import { db } from './firebase.js';
import {
  doc, getDoc, setDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export const MONTHS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
export const MONTHS_FULL = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

// ── Clé Firestore ─────────────────────────────────────────
export function docKey(year, month) {
  return `${year}_${String(month+1).padStart(2,'0')}`;
}

// ── Lire un document ──────────────────────────────────────
export async function getMonthData(collection, year, month) {
  try {
    const snap = await getDoc(doc(db, collection, docKey(year, month)));
    return snap.exists() ? snap.data() : {};
  } catch { return {}; }
}

// ── Écrire un document (merge) ────────────────────────────
export async function saveMonthData(collection, year, month, data) {
  await setDoc(doc(db, collection, docKey(year, month)), {
    ...data,
    updatedAt: serverTimestamp()
  }, { merge: true });
}

// ── Lire toute une année ──────────────────────────────────
export async function getYearData(collectionName, year) {
  const results = [];
  for (let m = 0; m < 12; m++) {
    const data = await getMonthData(collectionName, year, m);
    results.push(data);
  }
  return results; // tableau de 12 éléments [jan, fev, ...]
}

// ── Formatage ─────────────────────────────────────────────
export function fmtEur(v, decimals=0) {
  if (v === null || v === undefined || v === '' || isNaN(v)) return '—';
  return parseFloat(v).toLocaleString('fr-BE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + ' €';
}

export function fmtPct(v, decimals=1) {
  if (v === null || v === undefined || v === '' || isNaN(v)) return '—';
  return parseFloat(v).toFixed(decimals).replace('.', ',') + ' %';
}

export function fmtNum(v, decimals=0) {
  if (v === null || v === undefined || v === '' || isNaN(v)) return '—';
  return parseFloat(v).toLocaleString('fr-BE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

// ── Couleur staff cost % ──────────────────────────────────
export function staffCostColor(pct) {
  if (!pct || isNaN(pct)) return 'inherit';
  if (pct < 30) return 'var(--success)';
  if (pct < 40) return 'var(--warning)';
  return 'var(--danger)';
}

// ── Couleur food/bev cost % ───────────────────────────────
export function foodCostColor(pct, isBev=false) {
  if (!pct || isNaN(pct)) return 'inherit';
  if (isBev) return pct < 20 ? 'var(--success)' : pct <= 24 ? 'var(--warning)' : 'var(--danger)';
  return pct < 30 ? 'var(--success)' : pct <= 33 ? 'var(--warning)' : 'var(--danger)';
}

// ── Calculs ROOM ──────────────────────────────────────────
export function calcRoom(d) {
  if (!d) return {};
  const payroll = (parseFloat(d.payrollFixed)||0) + (parseFloat(d.payrollVar)||0) + (parseFloat(d.interim)||0);
  const incomes = parseFloat(d.incomes) || 0;
  const staffCostPct = incomes > 0 ? (payroll / incomes * 100) : null;
  const roomRevenue = parseFloat(d.roomRevenue) || 0;
  const roomsSold = parseFloat(d.roomsSold) || 0;
  const roomsAvail = parseFloat(d.roomsAvail) || 0;
  return {
    payroll,
    staffCostPct,
    arr:  roomsSold > 0 ? roomRevenue / roomsSold : null,
    revpar: roomsAvail > 0 ? roomRevenue / roomsAvail : null,
    occupancy: roomsAvail > 0 ? (roomsSold / roomsAvail * 100) : null,
  };
}

// ── Calculs F&B ───────────────────────────────────────────
export function calcFnb(d) {
  if (!d) return {};
  const payroll = (parseFloat(d.payrollFixed)||0) + (parseFloat(d.payrollVar)||0) + (parseFloat(d.interim)||0);
  const incomes = parseFloat(d.incomes) || 0;
  return {
    payroll,
    staffCostPct: incomes > 0 ? (payroll / incomes * 100) : null,
  };
}

// ── Calculs STAFF COST corrigé ────────────────────────────
// 7h36 = 7.6h / 6h20 = 6.333h
export function calcStaffCostCorrection(d, hourlyCost) {
  if (!d) return { totalHours: 0, deduction: 0 };
  const h = (parseFloat(d.sickDays760)||0) * 7.6
          + (parseFloat(d.sickDays620)||0) * 6.333
          + (parseFloat(d.recupDays760)||0) * 7.6
          + (parseFloat(d.recupDays620)||0) * 6.333
          + (parseFloat(d.recupHours)||0);
  const deduction = h * (parseFloat(hourlyCost)||0);
  return { totalHours: h, deduction };
}

// ── Calculs FOOD COST ─────────────────────────────────────
export function calcFoodCost(d) {
  if (!d) return {};
  const invStart = parseFloat(d.invStart) || 0;
  const purchases = parseFloat(d.purchases) || 0;
  const invEnd = parseFloat(d.invEnd) || 0;
  const sales = parseFloat(d.sales) || 0;
  const cost = invStart + purchases - invEnd;
  return {
    cost,
    costPct: sales > 0 ? (cost / sales * 100) : null,
  };
}
