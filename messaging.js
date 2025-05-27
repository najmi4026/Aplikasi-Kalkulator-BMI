// public/messaging.js
import { messagingInstance as messaging, auth, db } from './firebase-config.js'; // Pastikan 'messagingInstance' dieksport dari firebase-config.js
import { getToken, onMessage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging.js"; // Semak versi terkini di laman Firebase
import { doc, updateDoc, arrayUnion, serverTimestamp, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

let currentUserForMessaging = null;
let userDocRef = null; // Rujukan ke dokumen pengguna di Firestore
let unsubscribeUserDocForMessaging = null; // Untuk listener pada dokumen pengguna

const requestNotificationPermissionButton = document.createElement('button');
requestNotificationPermissionButton.textContent = 'Benarkan Pemberitahuan';
requestNotificationPermissionButton.id = 'requestNotificationPermissionButton';
// Gaya butang boleh diubahsuai melalui CSS atau di sini
Object.assign(requestNotificationPermissionButton.style, {
    marginTop: '20px',
    marginBottom: '20px', // Tambah margin bawah
    padding: '10px 15px',
    backgroundColor: '#5cb85c', // Hijau sebagai lalai
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    display: 'none' // Sembunyikan pada mulanya, akan ditunjukkan jika disokong
});

// Fungsi untuk menambah butang ke DOM
function appendNotificationButton() {
    const notesSectionContainer = document.querySelector('.notes-section'); // Cuba letak selepas notes-section
    const existingButton = document.getElementById(requestNotificationPermissionButton.id);

    if (existingButton && existingButton.parentNode) {
        // Butang sudah ada, tidak perlu tambah lagi
    } else if (notesSectionContainer && notesSectionContainer.parentNode) {
        // Letak selepas container notes-section, tetapi masih di dalam body
        notesSectionContainer.parentNode.insertBefore(requestNotificationPermissionButton, notesSectionContainer.nextSibling);
    } else if (document.body) { // Fallback jika .notes-section tidak ditemui
        document.body.appendChild(requestNotificationPermissionButton);
    }
    checkNotificationSupportAndPermission(); // Panggil untuk set keadaan butang awal
}

// Pastikan DOM sedia sebelum menambah butang
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", appendNotificationButton);
} else {
    // DOM sudah sedia
    appendNotificationButton();
}

// Fungsi untuk mengemas kini rupa & status butang pemberitahuan
function updateButtonState(text, disabled, bgColor) {
    if (requestNotificationPermissionButton) {
        requestNotificationPermissionButton.textContent = text;
        requestNotificationPermissionButton.disabled = disabled;
        requestNotificationPermissionButton.style.backgroundColor = bgColor;
        // Hanya tunjukkan butang jika pemberitahuan disokong dan pengguna log masuk
        if (('Notification' in window) && ('serviceWorker' in navigator) && messaging && currentUserForMessaging) {
             requestNotificationPermissionButton.style.display = 'inline-block';
        } else {
            requestNotificationPermissionButton.style.display = 'none';
        }
    }
}

// Fungsi untuk memeriksa sokongan pelayar dan status kebenaran sedia ada
function checkNotificationSupportAndPermission() {
    if (!requestNotificationPermissionButton) return; // Jika butang belum ditambah ke DOM

    if (!('Notification' in window) || !('serviceWorker' in navigator) || !messaging) {
        console.warn('Pemberitahuan Web atau Service Worker tidak disokong oleh pelayar ini.');
        requestNotificationPermissionButton.style.display = 'none'; // Sembunyikan jika tidak disokong
        return;
    }
    // Jika disokong, dan pengguna log masuk, tunjukkan butang
    if (currentUserForMessaging) {
        requestNotificationPermissionButton.style.display = 'inline-block';
    } else {
        requestNotificationPermissionButton.style.display = 'none';
        return; // Jangan proses lanjut jika tiada pengguna
    }

    switch (Notification.permission) {
        case 'granted':
            updateButtonState('Pemberitahuan Diaktifkan', true, '#777'); // Kelabu
            if (currentUserForMessaging) requestTokenIfNotExists(); // Cuba dapatkan token jika sudah dibenarkan
            break;
        case 'denied':
            updateButtonState('Pemberitahuan Disekat', true, '#d9534f'); // Merah
            break;
        default: // 'default'
            updateButtonState('Benarkan Pemberitahuan', false, '#5cb85c'); // Hijau
            break;
    }
}

// Fungsi untuk meminta kebenaran dan kemudian mendapatkan token
async function requestPermissionAndGetToken() {
    if (!messaging) {
        console.warn("Firebase Messaging tidak diinisialisasi.");
        return;
    }
    console.log("Meminta kebenaran pemberitahuan...");
    try {
        const permission = await Notification.requestPermission();
        // Selepas permintaan, kemas kini status butang dan cuba dapatkan token jika dibenarkan
        checkNotificationSupportAndPermission(); // Ini akan memanggil requestTokenIfNotExists jika granted

        if (permission !== 'granted') {
            alert('Anda tidak membenarkan pemberitahuan.');
        }
    } catch (err) {
        console.error('Ralat semasa meminta kebenaran pemberitahuan:', err);
        alert('Ralat semasa meminta kebenaran: ' + err.message);
    }
}

// Fungsi untuk mendapatkan token FCM jika belum ada dan menyimpannya
async function requestTokenIfNotExists() {
    if (!currentUserForMessaging) {
        console.log("Pengguna tidak log masuk, tidak boleh mendapatkan token FCM.");
        return;
    }
    if (!messaging) {
        console.warn("Objek Firebase Messaging tidak tersedia semasa cuba mendapatkan token.");
        return;
    }

    // VAPID key dari konfigurasi anda (PASTIKAN INI BETUL)
    const vapidKey = "BAc8kVypX1cOqBqyiLLWmJcgpN3j6ImUquqt3YZv4Xd6dft76nVTyAPcTDC386vIhJ_EAAu3nzrkSL5W0Jie648";

    // BLOK 'IF' YANG MEMBERI AMARAN TENTANG PLACEHOLDER TELAH DIBUANG SEPENUHNYA DARI SINI

    console.log("Mencuba mendapatkan token FCM dengan VAPID key...");
    try {
        const currentToken = await getToken(messaging, { vapidKey: vapidKey });
        if (currentToken) {
            console.log('Token FCM semasa berjaya diperolehi:', currentToken);
            // Hantar token ke Firestore untuk pengguna semasa
            if (userDocRef) { // Pastikan userDocRef (rujukan ke dokumen pengguna) wujud
                await updateDoc(userDocRef, {
                    fcmTokens: arrayUnion(currentToken), // arrayUnion akan elak duplikasi jika token sama
                    lastTokenUpdate: serverTimestamp() // Cap masa pelayan
                });
                console.log("Token FCM disimpan/dikemaskini untuk pengguna:", currentUserForMessaging.uid);
                updateButtonState('Pemberitahuan Diaktifkan', true, '#777'); // Kemas kini butang
                // Komen atau buang alert ini untuk pengalaman pengguna yang lebih baik
                // alert("Pemberitahuan telah diaktifkan untuk peranti ini.");
            } else {
                console.warn("userDocRef tidak ditemui, tidak dapat menyimpan token FCM ke Firestore. Pastikan dokumen pengguna dicipta semasa pendaftaran.");
            }
            return currentToken;
        } else {
            // Ini sepatutnya tidak berlaku jika permission adalah 'granted' dan service worker betul
            console.warn('Tiada token pendaftaran tersedia walaupun kebenaran diberikan. Sila semak konfigurasi Service Worker atau cuba muat semula halaman.');
            updateButtonState('Cuba Aktifkan Semula', false, '#f0ad4e'); // Oren untuk cuba lagi
        }
    } catch (err) {
        console.error('Ralat semasa mendapatkan token FCM:', err.code, err.message);
        updateButtonState('Gagal Aktifkan Pemberitahuan', false, '#d9534f'); // Merah

        if (err.code === 'messaging/notifications-blocked' || err.code === 'messaging/permission-denied') {
             alert('Pemberitahuan telah disekat. Sila benarkan melalui tetapan pelayar anda.');
        } else if (err.code === 'messaging/failed-servicer-worker-registration' || err.code === 'messaging/sw-registration-expected') {
            alert('Pemberitahuan gagal didaftar. Pastikan fail firebase-messaging-sw.js ada di root direktori dan boleh diakses, dan cuba muat semula halaman.');
        } else if (err.code === 'messaging/invalid-vapid-key') {
            alert('Kunci VAPID tidak sah. Sila pastikan kunci yang betul dari Firebase Console digunakan dan disalin dengan tepat.');
        } else {
            alert('Ralat mendapatkan token FCM: ' + err.message.substring(0, 100) + "...");
        }
    }
    return null;
}

// Pantau status pengesahan pengguna
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUserForMessaging = user;
        // Sediakan rujukan ke dokumen pengguna di Firestore.
        // Dokumen ini sepatutnya telah dicipta semasa pendaftaran di auth.js
        userDocRef = doc(db, "users", currentUserForMessaging.uid);
        console.log("Messaging.js: Pengguna log masuk:", currentUserForMessaging.uid);

        // Panggil checkNotificationSupportAndPermission selepas pengguna log masuk
        checkNotificationSupportAndPermission();

        // Dengar perubahan pada dokumen pengguna (pilihan)
        if (unsubscribeUserDocForMessaging) unsubscribeUserDocForMessaging();
        unsubscribeUserDocForMessaging = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
                // const userData = docSnap.data();
                // console.log("Data pengguna (messaging) dikemaskini:", userData?.fcmTokens);
            } else {
                console.warn("Dokumen pengguna tidak ditemui di Firestore untuk UID:", currentUserForMessaging.uid);
            }
        }, (error) => {
            console.error("Ralat onSnapshot untuk dokumen pengguna (messaging):", error);
        });

    } else { // Pengguna log keluar
        currentUserForMessaging = null;
        userDocRef = null;
        console.log("Messaging.js: Tiada pengguna log masuk.");
        if (requestNotificationPermissionButton) {
            requestNotificationPermissionButton.style.display = 'none'; // Sembunyikan butang
        }
        if (unsubscribeUserDocForMessaging) {
            unsubscribeUserDocForMessaging();
            unsubscribeUserDocForMessaging = null;
        }
    }
});

// Tambah event listener pada butang
if (requestNotificationPermissionButton) {
    requestNotificationPermissionButton.addEventListener('click', requestPermissionAndGetToken);
}

// Tangani mesej yang diterima semasa aplikasi berada di latar depan (foreground)
if (messaging) {
    onMessage(messaging, (payload) => {
        console.log('Mesej diterima semasa aplikasi di foreground (messaging.js):', payload);
        const notificationTitle = payload.notification?.title || "Notifikasi Aplikasi BMI";
        const notificationOptions = {
            body: payload.notification?.body || "Anda ada mesej baru.",
            icon: payload.notification?.icon || './night.jpg', // Guna imej night.jpg sebagai ikon lalai
            data: payload.data // Data tambahan dari payload
        };

        if (Notification.permission === "granted") {
            try {
                const notification = new Notification(notificationTitle, notificationOptions);
                notification.onclick = (event) => {
                    console.log("Pemberitahuan foreground diklik", event);
                    const clickAction = payload.data?.click_action || payload.fcmOptions?.link;
                    if (clickAction) {
                        window.open(clickAction, '_blank'); // Buka dalam tab baru
                    }
                };
            } catch (e) {
                console.error("Gagal memaparkan pemberitahuan foreground (messaging.js):", e);
                alert(`Pemberitahuan (fallback): ${notificationTitle}\n${notificationOptions.body}`);
            }
        }
    });
}


// Pendaftaran Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        if (messaging) {
            navigator.serviceWorker.register('./firebase-messaging-sw.js', { scope: '/' })
                .then((registration) => {
                    console.log('Service Worker untuk Firebase Messaging berjaya didaftarkan dengan skop:', registration.scope);
                }).catch((err) => {
                    console.error('Pendaftaran Service Worker untuk Firebase Messaging gagal:', err);
                });
        } else {
            console.warn("Firebase Messaging tidak diinisialisasi, service worker tidak akan didaftar oleh messaging.js.");
        }
    });
} else {
    console.warn("Service Worker tidak disokong oleh pelayar ini. Pemberitahuan Web tidak akan berfungsi.");
    if(requestNotificationPermissionButton) requestNotificationPermissionButton.style.display = 'none';
}