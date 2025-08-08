const firebaseConfig = {
  "apiKey": "AIzaSyAf6UXWFx74hNmFLvF4kDN-kR6GOJCx6nY",
  "authDomain": "anilari-sakla-86407.firebaseapp.com",
  "projectId": "anilari-sakla-86407",
  "storageBucket": "anilari-sakla-86407.appspot.com",
  "messagingSenderId": "205421038926",
  "appId": "1:205421038926:web:d7e8811d5359de9365621f"
};
const EVENT_CODE = "MERT-MEMNUNE-2025";

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";
import { getStorage, ref, uploadBytesResumable } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-storage.js";
import { getFirestore, addDoc, collection, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const storage = getStorage(app);
const db = getFirestore(app);

const $ = (id)=>document.getElementById(id);
const statusEl = $("status");
const progressEl = $("progress");

signInAnonymously(auth).catch(err => {
  console.error(err);
  statusEl.textContent = "Giriş hatası: " + err.message;
});

$("uploadBtn").addEventListener("click", async () => {
  const files = $("file").files;
  if (!files || files.length === 0) { statusEl.textContent = "Lütfen dosya seçin."; return; }
  for (const file of files) { await uploadOne(file); }
});

async function uploadOne(file) {
  try {
    const MAX = 200 * 1024 * 1024;
    if (file.size > MAX) throw new Error("Dosya çok büyük (200 MB sınırı).");

    const id = Math.random().toString(36).slice(2);
    const ext = (file.name.split(".").pop() || "bin").toLowerCase();
    const path = `events/${EVENT_CODE}/${id}.${ext}`;

    const storageRef = ref(storage, path);
    const task = uploadBytesResumable(storageRef, file, { contentType: file.type });

    progressEl.hidden = false;
    statusEl.textContent = `Yükleniyor: ${file.name}`;

    await new Promise((resolve, reject) => {
      task.on("state_changed", (snap) => {
        const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
        progressEl.value = pct;
      }, reject, resolve);
    });

    await addDoc(collection(db, "media"), {
      eventCode: EVENT_CODE,
      type: file.type.startsWith("video") ? "video" : "image",
      path,
      createdAt: serverTimestamp()
    });

    statusEl.textContent = `Tamamlandı: ${file.name}`;
    progressEl.hidden = true;
  } catch (err) {
    console.error(err);
    statusEl.textContent = "Hata: " + err.message;
    progressEl.hidden = true;
  }
}
