// public/auth.js
import { auth } from './firebase-config.js';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendPasswordResetEmail,
    onAuthStateChanged,
    updateProfile // Untuk menyimpan nama pengguna
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"; // Semak versi terkini
import { db } from './firebase-config.js'; // Import db untuk simpan maklumat pengguna tambahan
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const messageArea = document.getElementById('message-area');
const forgotPasswordLink = document.getElementById('forgotPasswordLink');

// Semak status log masuk pengguna semasa halaman dimuatkan
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Pengguna sudah log masuk
        if (window.location.pathname.endsWith('loginSignup.html') || window.location.pathname.endsWith('loginSignup')) {
            console.log('User already logged in, redirecting to index.html from login page.');
            window.location.href = 'index.html';
        }
    } else {
        // Tiada pengguna log masuk.
        console.log('No user logged in.');
        // Jika pengguna berada di index.html dan tidak log masuk, alihkan ke loginSignup.html
        // Ini akan dikendalikan dalam index.html sendiri
    }
});

// Fungsi untuk memaparkan mesej
function showMessage(message, isError = false) {
    if (messageArea) {
        messageArea.textContent = message;
        messageArea.className = 'message-area'; // Reset kelas
        if (isError) {
            messageArea.classList.add('error');
        } else {
            messageArea.classList.add('success');
        }
    } else {
        console.warn("Message area not found. Message:", message);
    }
}

// Pengendali untuk Borang Pendaftaran (Signup)
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const firstName = document.getElementById('firstName').value.trim();
        const lastName = document.getElementById('lastName').value.trim();
        const email = document.getElementById('signupEmail').value.trim();
        const password = document.getElementById('signupPassword').value;

        if (!firstName || !lastName || !email || !password) {
            showMessage('Sila isi semua ruangan.', true);
            return;
        }
        if (password.length < 6) {
            showMessage('Kata laluan mesti sekurang-kurangnya 6 aksara.', true);
            return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Kemas kini profil pengguna dengan nama paparan
            await updateProfile(user, {
                displayName: `${firstName} ${lastName}`
            });

            // Simpan maklumat tambahan pengguna ke Firestore (pilihan)
            // Ini berguna jika anda mahu menyimpan lebih banyak data daripada yang dibenarkan oleh Auth profile
            await setDoc(doc(db, "users", user.uid), {
                uid: user.uid,
                firstName: firstName,
                lastName: lastName,
                email: user.email,
                displayName: `${firstName} ${lastName}`,
                createdAt: new Date().toISOString() // atau gunakan serverTimestamp() jika sesuai
            });

            showMessage('Pendaftaran berjaya! Anda akan dialihkan...', false);
            console.log('Signup successful, user:', user.uid, user.displayName);
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
        } catch (error) {
            console.error('Signup error:', error.code, error.message);
            if (error.code === 'auth/email-already-in-use') {
                showMessage('Alamat e-mel ini telah digunakan.', true);
            } else if (error.code === 'auth/weak-password') {
                showMessage('Kata laluan terlalu lemah.', true);
            } else {
                showMessage(`Ralat pendaftaran: ${error.message}`, true);
            }
        }
    });
}

// Pengendali untuk Borang Log Masuk (Login)
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;

        if (!email || !password) {
            showMessage('Sila masukkan e-mel dan kata laluan.', true);
            return;
        }

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            showMessage('Log masuk berjaya! Anda akan dialihkan...', false);
            console.log('Login successful, user:', user.uid);
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
        } catch (error) {
            console.error('Login error:', error.code, error.message);
            if (error.code === 'auth/user-not-found' ||
                error.code === 'auth/wrong-password' ||
                error.code === 'auth/invalid-credential' ||
                error.code === 'auth/invalid-email') {
                showMessage('E-mel atau kata laluan tidak sah.', true);
            } else {
                showMessage(`Ralat log masuk: ${error.message}`, true);
            }
        }
    });
}

// Pengendali untuk Lupa Kata Laluan
if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', async (e) => {
        e.preventDefault();
        const email = prompt("Sila masukkan alamat e-mel anda untuk menetapkan semula kata laluan:");
        if (email && email.trim() !== "") {
            try {
                await sendPasswordResetEmail(auth, email.trim());
                showMessage('E-mel penetapan semula kata laluan telah dihantar. Sila semak peti masuk anda (dan folder spam).', false);
            } catch (error) {
                console.error('Forgot password error:', error.code, error.message);
                 if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-email') {
                    showMessage('Alamat e-mel tidak ditemui atau tidak sah.', true);
                } else {
                    showMessage(`Ralat menghantar e-mel penetapan semula: ${error.message}`, true);
                }
            }
        } else if (email !== null) { // Jika pengguna masukkan sesuatu yang kosong
            showMessage('Alamat e-mel diperlukan untuk penetapan semula kata laluan.', true);
        }
        // Jika pengguna klik "Cancel", email akan jadi null, jadi tiada mesej.
    });
}