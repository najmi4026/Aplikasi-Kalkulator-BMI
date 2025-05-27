// public/firebase-messaging-sw.js
// PENTING: Fail ini MESTI berada di root direktori public anda.
// Contoh: jika laman anda di https://anda.web.app/, fail ini mesti boleh diakses di https://anda.web.app/firebase-messaging-sw.js

// Import skrip Firebase (gunakan versi 'compat' untuk service worker)
try {
    importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
    importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");
} catch (e) {
    console.error("Gagal mengimport skrip Firebase dalam Service Worker:", e);
}


// GANTIKAN DENGAN KONFIGURASI PROJEK FIREBASE ANDA SENDIRI
const firebaseConfig = {
  apiKey: "AIzaSyAskQeGaRwxmB9hzLTcBO5-yJqnMVjNMVk",
  authDomain: "aplikasi-ukur-bmi-c2410.firebaseapp.com",
  projectId: "aplikasi-ukur-bmi-c2410",
  storageBucket: "aplikasi-ukur-bmi-c2410.firebasestorage.app",
  messagingSenderId: "466926351699",
  appId: "1:466926351699:web:39a3c1a7b9cd3e0ab19da6"
};

let app;
try {
    app = firebase.initializeApp(firebaseConfig);
} catch (e) {
    console.error("Gagal menginisialisasi Firebase App dalam Service Worker:", e);
}

let swMessaging;
if (app && firebase.messaging.isSupported()) { // Semak sokongan sebelum menginisialisasi
    try {
        swMessaging = firebase.messaging();

        // Tangani mesej latar belakang
        swMessaging.onBackgroundMessage((payload) => {
            console.log('[firebase-messaging-sw.js] Mesej latar belakang diterima: ', payload);

            const notificationTitle = payload.notification?.title || "Pemberitahuan Baru";
            const notificationOptions = {
                body: payload.notification?.body || "Anda ada mesej baru.",
                icon: payload.notification?.icon || '/logo-192.png', // Sediakan imej logo lalai jika ada
                data: payload.data || {} // Simpan data tambahan untuk digunakan semasa klik
                // Anda boleh tambah 'image', 'badge', 'actions' dll.
            };

            // Untuk memastikan pemberitahuan dipaparkan walaupun service worker mungkin akan ditamatkan
            return self.registration.showNotification(notificationTitle, notificationOptions);
        });
    } catch (e) {
        console.error("Gagal menginisialisasi Firebase Messaging dalam Service Worker atau set onBackgroundMessage:", e);
    }
} else {
    console.log("Firebase Messaging tidak disokong dalam konteks Service Worker ini atau app tidak diinisialisasi.");
}


// Pilihan: Tangani klik pada pemberitahuan
self.addEventListener('notificationclick', (event) => {
    console.log('[firebase-messaging-sw.js] Klik pada pemberitahuan diterima.', event.notification);

    event.notification.close(); // Tutup pemberitahuan

    // Logik untuk membuka tetingkap/tab apabila pemberitahuan diklik
    // Cuba buka URL dari data payload jika ada, jika tidak, buka root
    const clickAction = event.notification.data?.click_action || '/'; // '/index.html' atau halaman spesifik

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // Semak jika ada tetingkap/tab yang sedia ada dengan URL yang sama
            for (let i = 0; i < clientList.length; i++) {
                const client = clientList[i];
                // Bandingkan URL dengan lebih fleksibel jika perlu
                if (client.url === clickAction && 'focus' in client) {
                    return client.focus();
                }
            }
            // Jika tiada tetingkap/tab yang sedia ada, buka yang baru
            if (clients.openWindow) {
                return clients.openWindow(clickAction);
            }
        })
    );
});

// Pilihan: Listener untuk event push (jika onBackgroundMessage tidak menangkap semua kes)
self.addEventListener('push', (event) => {
    console.log('[firebase-messaging-sw.js] Push event diterima:', event.data?.text());
    // Ini adalah fallback jika onBackgroundMessage tidak dipanggil.
    // Biasanya onBackgroundMessage sudah cukup.
    // Jika anda implement ini, pastikan tidak ada konflik dengan onBackgroundMessage.
});