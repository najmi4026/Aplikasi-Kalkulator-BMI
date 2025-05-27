// public/firestore.js
import { auth, db } from './firebase-config.js';
import {
    collection,
    addDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    serverTimestamp,
    doc,
    updateDoc,
    getDocs,
    limit
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"; // Pastikan versi SDK terkini
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const personalNotesTextarea = document.getElementById('personalNotes');
// Rujukan ini mungkin digunakan oleh autosave atau logik lain dalam fail ini, jadi dikekalkan.
const bmiResultTextElement = document.querySelector('.js-bmi_txt .back-clr-no');
const resultHeadElement = document.querySelector('.js-resultHead');

let currentUserForFirestore = null; // Guna nama yang lebih spesifik untuk skop fail ini
let currentNoteId = null;
let unsubscribeNotesListener = null;

async function loadLatestNote() {
    if (!currentUserForFirestore || !personalNotesTextarea) {
        if (personalNotesTextarea) personalNotesTextarea.disabled = true;
        return;
    }
    personalNotesTextarea.disabled = true;
    const notesCollectionRef = collection(db, "bmiNotes");
    const q = query(notesCollectionRef, where("userId", "==", currentUserForFirestore.uid), orderBy("updatedAt", "desc"), limit(1));
    try {
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            const latestNoteDoc = querySnapshot.docs[0];
            personalNotesTextarea.value = latestNoteDoc.data().text || "";
            currentNoteId = latestNoteDoc.id;
            console.log("Firestore: Nota terkini dimuatkan:", currentNoteId);
            startRealtimeNoteListener(currentNoteId);
        } else {
            personalNotesTextarea.value = "";
            personalNotesTextarea.placeholder = "Tulis catatan anda di sini...";
            currentNoteId = null;
            console.log("Firestore: Tiada nota sedia ada.");
        }
    } catch (error) {
        console.error("Firestore: Ralat memuatkan nota:", error);
        personalNotesTextarea.value = "Gagal memuatkan nota.";
    } finally {
        personalNotesTextarea.disabled = false;
    }
}

function startRealtimeNoteListener(noteId) {
    if (unsubscribeNotesListener) unsubscribeNotesListener();
    if (noteId && currentUserForFirestore) {
        const noteRef = doc(db, "bmiNotes", noteId);
        unsubscribeNotesListener = onSnapshot(noteRef, (docSnapshot) => {
            if (docSnapshot.exists()) {
                const noteData = docSnapshot.data();
                if (personalNotesTextarea && document.activeElement !== personalNotesTextarea && personalNotesTextarea.value !== noteData.text) {
                    personalNotesTextarea.value = noteData.text || "";
                }
            } else {
                currentNoteId = null;
                if (personalNotesTextarea) personalNotesTextarea.value = "";
                if (unsubscribeNotesListener) { unsubscribeNotesListener(); unsubscribeNotesListener = null; }
            }
        }, (error) => console.error("Firestore: Ralat onSnapshot nota:", error));
    }
}

export async function saveOrUpdateNote(notesText, bmiValue, bmiCategory) {
    const activeUser = auth.currentUser;
    if (!activeUser) {
        console.error("Firestore: Pengguna tidak log masuk. Operasi simpan dibatalkan.");
        alert("Sila log masuk semula untuk menyimpan nota.");
        return false; // Kembalikan false jika tiada pengguna
    }

    if (!notesText.trim() && !currentNoteId && (!bmiValue || bmiValue === '--')) {
         console.log("Firestore: Tiada data baru untuk disimpan. Melangkau simpanan.");
         return false; // Kembalikan false kerana tiada apa yang disimpan (untuk elak alert "berjaya")
    }

    const noteData = {
        userId: activeUser.uid,
        userDisplayName: activeUser.displayName || activeUser.email,
        text: notesText || "",
        updatedAt: serverTimestamp()
    };
    if (bmiValue && bmiValue !== '--') noteData.bmi = bmiValue;
    if (bmiCategory) noteData.category = bmiCategory;

    console.log("Firestore: Cuba menyimpan/mengemaskini data:", noteData);

    try {
        if (currentNoteId) {
            const noteRef = doc(db, "bmiNotes", currentNoteId);
            await updateDoc(noteRef, noteData);
            console.log("Firestore: Nota berjaya dikemaskini:", currentNoteId);
        } else {
            noteData.createdAt = serverTimestamp();
            const docRef = await addDoc(collection(db, "bmiNotes"), noteData);
            currentNoteId = docRef.id;
            console.log("Firestore: Nota baru berjaya ditambah:", docRef.id);
            startRealtimeNoteListener(currentNoteId);
        }
        return true; // PENTING: Kembalikan true jika operasi berjaya
    } catch (e) {
        console.error("Firestore: Ralat semasa menyimpan/mengemaskini nota:", e.code, e.message);
        if (e.code === 'permission-denied') {
            alert("Gagal menyimpan nota: Tiada kebenaran. Sila semak Security Rules anda dan pastikan anda telah log masuk dengan betul.");
        } else {
            alert("Gagal menyimpan nota: " + e.message);
        }
        return false; // PENTING: Kembalikan false jika operasi gagal
    }
}

// Autosave listener
let autosaveDebounceTimer;
if (personalNotesTextarea) {
    personalNotesTextarea.addEventListener('input', () => {
        if (!auth.currentUser) return;
        clearTimeout(autosaveDebounceTimer);
        autosaveDebounceTimer = setTimeout(async () => {
            const notesText = personalNotesTextarea.value;
            const bmiDisplay = document.querySelector('.js-bmi_txt .back-clr-no');
            const categoryDisplay = document.querySelector('.js-resultHead');
            const bmiToSave = (bmiDisplay && bmiDisplay.textContent !== '--') ? bmiDisplay.textContent : null;
            const categoryToSave = (categoryDisplay && categoryDisplay.textContent) ? categoryDisplay.textContent : null;

            if (notesText.trim() || currentNoteId || bmiToSave) { // Hanya autosave jika ada perubahan teks atau nota sedia ada
                 console.log("Firestore: Autosaving nota...");
                 const autosaveSuccess = await saveOrUpdateNote(notesText, bmiToSave, categoryToSave);
                 console.log("Firestore: Status Autosave - ", autosaveSuccess ? "Berjaya" : "Gagal/Dilangkau");
                 // Tidak perlu alert untuk autosave, biarkan ia senyap
            }
        }, 2500);
    });
}

onAuthStateChanged(auth, async (user) => {
    currentUserForFirestore = user;
    if (user) {
        console.log("Firestore.js: Pengguna log masuk:", user.uid);
        if (personalNotesTextarea) personalNotesTextarea.disabled = false;
        await loadLatestNote();
    } else {
        currentNoteId = null;
        if (unsubscribeNotesListener) { unsubscribeNotesListener(); unsubscribeNotesListener = null; }
        if (personalNotesTextarea) {
            personalNotesTextarea.value = '';
            personalNotesTextarea.placeholder = "Sila log masuk untuk nota.";
            personalNotesTextarea.disabled = true;
        }
        console.log("Firestore.js: Pengguna log keluar.");
    }
});