// public/firebase-config.js

// Import fungsi initializeApp dari Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js"; // Semak versi terkini di laman Firebase
// Import perkhidmatan Firebase yang anda perlukan
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getMessaging } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging.js";

// Konfigurasi Firebase projek anda
// GANTIKAN DENGAN KONFIGURASI PROJEK FIREBASE ANDA SENDIRI
const firebaseConfig = {
  apiKey: "AIzaSyAskQeGaRwxmB9hzLTcBO5-yJqnMVjNMVk",
  authDomain: "aplikasi-ukur-bmi-c2410.firebaseapp.com",
  projectId: "aplikasi-ukur-bmi-c2410",
  storageBucket: "aplikasi-ukur-bmi-c2410.firebasestorage.app",
  messagingSenderId: "466926351699",
  appId: "1:466926351699:web:39a3c1a7b9cd3e0ab19da6"
};

// Inisialisasikan Firebase
const app = initializeApp(firebaseConfig);

// Eksport perkhidmatan Firebase untuk digunakan dalam fail lain
export const auth = getAuth(app);
export const db = getFirestore(app);
export const messaging = getMessaging(app); // Hanya akan berfungsi jika disokong oleh pelayar dan dalam konteks selamat (HTTPS)