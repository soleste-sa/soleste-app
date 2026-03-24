// ============================================================
// SOLESTE — Configuration Firebase
// ============================================================
// INSTRUCTIONS :
// 1. Aller sur https://console.firebase.google.com
// 2. Créer un nouveau projet "soleste"
// 3. Activer Authentication > Email/Mot de passe
// 4. Activer Firestore Database (mode production)
// 5. Aller dans Paramètres du projet > Vos applications > Web
// 6. Copier l'objet firebaseConfig et remplacer ci-dessous
// ============================================================

const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyDSSIvbAWCXE1AfXwoKtERt3bewWrQhr40",
  authDomain:        "soleste-7ef0f.firebaseapp.com",
  projectId:         "soleste-7ef0f",
  storageBucket:     "soleste-7ef0f.firebasestorage.app",
  messagingSenderId: "72345297145",
  appId:             "1:72345297145:web:ab5a0a9e729858db41c228"
};

// ── Règles Firestore recommandées ──────────────────────────
// Copier dans Firebase Console > Firestore > Règles :
/*
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
*/

// ── Initialisation ─────────────────────────────────────────
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const app = initializeApp(FIREBASE_CONFIG);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
