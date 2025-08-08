// === Firebase Config ===
const firebaseConfig = {
  apiKey: "AIzaSyAf6UXWFx74hNmFLvF4kDN-kR6GOJCx6nY",
  authDomain: "anilari-sakla-86407.firebaseapp.com",
  projectId: "anilari-sakla-86407",
  storageBucket: "anilari-sakla-86407.appspot.com",
  messagingSenderId: "205421038926",
  appId: "1:205421038926:web:d7e8811d5359de9365621f"
};

// Sabit etkinlik kodu
const EVENT_CODE = "MERT-MEMNUNE-2025";

// === Firebase SDK (modüler) ===
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";
import { getStorage, ref, uploadBytesResumable } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-storage.js";
import { getFirestore, addDoc, collection, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";

// Init
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
// İstersen bucket'ı zorla belirt: const storage = getStorage(app, "gs://anilari-sakla-86407.appspot.com");
const storage = getStorage(app);
const db = getFirestore(app);

console.log("Using bucket:", firebaseConfig.storageBucket);

const $ = (id)=>document.getElementById(id);
const statusEl = $("status");
const progressEl = $("progress");

// === Auth (Anonim) ===
signInAnonymously(auth).catch(err => {
  console.error("AUTH ERROR:", err.code, err.message);
  statusEl.textContent = "Giriş hatası: " + err.message;
});

// === Upload butonu ===
$("uploadBtn").addEventListener("click", async () => {
  const files = $("file").files;
  if (!files || files.length === 0) { statusEl.textContent = "Lütfen dosya seçin."; return; }
  for (const file of files) { await uploadOne(file); }
});

async function uploadOne(file) {
  const MAX = 200 * 1024 * 1024; // 200 MB
  if (file.size > MAX) {
    statusEl.textContent = "Dosya çok büyük (200 MB sınırı).";
    return;
  }

  const id = Math.random().toString(36).slice(2);
  const ext = (file.name.split(".").pop() || "bin").toLowerCase();
  const path = `events/${EVENT_CODE}/${id}.${ext}`;

  try {
    const storageRef = ref(storage, path);
    const task = uploadBytesResumable(storageRef, file, { contentType: file.type });

    progressEl.hidden = false;
    progressEl.value = 0;
    statusEl.textContent = `Yükleniyor: ${file.name}`;

    // ---- Storage yüklemesini ayrıntılı takip + HATA YAKALAMA ----
    await new Promise((resolve, reject) => {
      task.on("state_changed",
        (snap) => {
          const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
          progressEl.value = pct;
          statusEl.textContent = `Yükleniyor: ${file.name} (%${pct})`;
        },
        (error) => {
          console.error("UPLOAD ERROR:", error.code, error.message);
          statusEl.textContent = "Yükleme hatası: " + error.code;
          progressEl.hidden = true;
          reject(error);
        },
        () => resolve()
      );
    });

  } catch (err) {
    console.error("STORAGE TRY/CATCH ERROR:", err);
    statusEl.textContent = "Yükleme sırasında beklenmeyen hata: " + err.message;
    progressEl.hidden = true;
    return;
  }

  // ---- Firestore meta yazımı (ayrı try/catch) ----
  try {
    await addDoc(collection(db, "media"), {
      eventCode: EVENT_CODE,
      type: file.type.startsWith("video") ? "video" : "image",
      path,
      createdAt: serverTimestamp()
    });
    statusEl.textContent = `Tamamlandı: ${file.name}`;
  } catch (err) {
    console.error("FIRESTORE ERROR:", err.code || "", err.message);
    statusEl.textContent = "Meta kaydetme hatası: " + (err.code || err.message);
  } finally {
    setTimeout(() => { progressEl.hidden = true; }, 600);
  }
}
