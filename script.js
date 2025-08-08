// === Firebase Config ===
const firebaseConfig = {
  apiKey: "AIzaSyAf6UXWFx74hNmFLvF4kDN-kR6GOJCx6nY",
  authDomain: "anilari-sakla-86407.firebaseapp.com",
  projectId: "anilari-sakla-86407",
  storageBucket: "anilari-sakla-86407.appspot.com",
  messagingSenderId: "205421038926",
  appId: "1:205421038926:web:d7e8811d5359de9365621f"
};

const EVENT_CODE = "MERT-MEMNUNE-2025";

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";
import { getStorage, ref, uploadBytesResumable, uploadBytes } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-storage.js";
import { getFirestore, addDoc, collection, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
// Force bucket explicitly (helps if config and actual bucket ever diverge)
const storage = getStorage(app, "gs://anilari-sakla-86407.appspot.com");
const db = getFirestore(app);

console.log("[INIT] Using bucket:", firebaseConfig.storageBucket);

const $ = (id)=>document.getElementById(id);
const statusEl = $("status");
const progressEl = $("progress");

onAuthStateChanged(auth, user => {
  if (user) {
    console.log("[AUTH] Signed in anonymously. uid=", user.uid);
  } else {
    console.warn("[AUTH] Signed OUT");
  }
});

signInAnonymously(auth).catch(err => {
  console.error("[AUTH ERROR]", err.code, err.message);
  safeStatus("Giriş hatası: " + err.message);
});

// Add a quick debug button to run a tiny test upload
(function ensureDebugButton(){
  if (!document.getElementById("debugTest")) {
    const btn = document.createElement("button");
    btn.id = "debugTest";
    btn.textContent = "🧪 Hızlı Test (1KB)";
    btn.style.marginLeft = "8px";
    const row = document.querySelector(".row") || document.body;
    row.appendChild(btn);
    btn.addEventListener("click", testTinyUpload);
  }
})();

$("uploadBtn").addEventListener("click", async () => {
  const files = $("file").files;
  if (!files || files.length === 0) { safeStatus("Lütfen dosya seçin."); return; }
  for (const file of files) { await uploadOne(file); }
});

async function testTinyUpload(){
  try {
    const blob = new Blob(["hello"], { type: "text/plain" });
    const id = Math.random().toString(36).slice(2);
    const path = `events/${EVENT_CODE}/debug-${id}.txt`;
    const storageRef = ref(storage, path);
    console.log("[TEST] uploadBytes start →", path);
    await uploadBytes(storageRef, blob);
    console.log("[TEST] uploadBytes DONE");
    safeStatus("Hızlı test OK (debug txt yüklendi). Storage çalışıyor.");
  } catch (e) {
    console.error("[TEST ERROR]", e.code || "", e.message);
    safeStatus("Hızlı test hatası: " + (e.code || e.message));
  }
}

async function uploadOne(file) {
  const MAX = 200 * 1024 * 1024; // 200 MB
  if (file.size > MAX) {
    safeStatus("Dosya çok büyük (200 MB sınırı).");
    return;
  }

  const id = Math.random().toString(36).slice(2);
  const ext = (file.name.split(".").pop() || "bin").toLowerCase();
  const path = `events/${EVENT_CODE}/${id}.${ext}`;

  let resolved = false;
  try {
    const storageRef = ref(storage, path);
    const task = uploadBytesResumable(storageRef, file, { contentType: file.type });

    progressEl.hidden = false;
    progressEl.value = 0;
    safeStatus(`Yükleniyor: ${file.name}`);

    // Timeout guard (60s) to catch silent stalls
    const guard = setTimeout(() => {
      if (!resolved) {
        console.warn("[GUARD] Upload seems stuck >60s. Check rules / bucket / network.");
        safeStatus("Yükleme 60sn'dir ilerlemiyor. Kurallar/bucket/network kontrol edin.");
      }
    }, 60000);

    await new Promise((resolve, reject) => {
      task.on("state_changed",
        (snap) => {
          const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
          progressEl.value = pct;
          safeStatus(`Yükleniyor: ${file.name} (%${pct})`);
          console.log("[UPLOAD]", pct + "%", snap.state, snap.bytesTransferred, "/", snap.totalBytes);
        },
        (error) => {
          console.error("[UPLOAD ERROR]", error.code, error.message);
          safeStatus("Yükleme hatası: " + error.code);
          progressEl.hidden = true;
          clearTimeout(guard);
          reject(error);
        },
        () => {
          resolved = true;
          clearTimeout(guard);
          console.log("[UPLOAD] Completed:", path);
          resolve();
        }
      );
    });

  } catch (err) {
    console.error("[STORAGE TRY/CATCH ERROR]", err);
    safeStatus("Yükleme sırasında beklenmeyen hata: " + err.message);
    progressEl.hidden = true;
    return;
  }

  try {
    console.log("[FIRESTORE] addDoc start → media");
    await addDoc(collection(db, "media"), {
      eventCode: EVENT_CODE,
      type: file.type.startsWith("video") ? "video" : "image",
      path,
      createdAt: serverTimestamp()
    });
    console.log("[FIRESTORE] addDoc DONE");
    safeStatus(`Tamamlandı: ${file.name}`);
  } catch (err) {
    console.error("[FIRESTORE ERROR]", err.code || "", err.message);
    safeStatus("Meta kaydetme hatası: " + (err.code || err.message));
  } finally {
    setTimeout(() => { progressEl.hidden = true; }, 600);
  }
}

function safeStatus(msg){
  if (statusEl) statusEl.textContent = msg;
}
