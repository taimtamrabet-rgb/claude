/* ==========================================================================
   CLOUD-SYNC.JS — optional Google sign-in + cross-device cloud sync.

   This is OFF by default and totally inert until you set it up. To enable it:

   1. Go to https://console.firebase.google.com and create a free project
      (any Google account works).
   2. In your project: Build > Authentication > Sign-in method > enable
      "Google" as a provider.
   3. In your project: Build > Firestore Database > Create database
      (production mode is fine; the default security rules that only allow
      a signed-in user to read/write their own /users/{uid}/** documents
      work with this file as-is).
   4. Project settings (gear icon) > General > "Your apps" > add a Web app.
      Copy the firebaseConfig object it gives you.
   5. Paste that object as FIREBASE_CONFIG below, replacing `null`.
   6. If you're hosting on GitHub Pages, add that domain (e.g.
      yourname.github.io) under Authentication > Settings > Authorized
      domains, or Google sign-in will be rejected.

   This only works when the page can reach the internet and load Google's
   SDK from a CDN — it will not work inside the sandboxed Claude Artifact
   viewer (its content-security-policy blocks outside connections), only
   on a normally-hosted copy of this page (e.g. GitHub Pages). If it isn't
   configured, or the SDK can't load, every function below quietly no-ops
   with a toast instead of erroring.
   ========================================================================== */

const FIREBASE_CONFIG = null; // <-- paste your Firebase config object here

const CLOUD = { enabled: false, user: null };

(function initCloud() {
  if (!FIREBASE_CONFIG) return;
  const version = "10.7.1";
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  loadScript(`https://www.gstatic.com/firebasejs/${version}/firebase-app-compat.js`)
    .then(() => loadScript(`https://www.gstatic.com/firebasejs/${version}/firebase-auth-compat.js`))
    .then(() => loadScript(`https://www.gstatic.com/firebasejs/${version}/firebase-firestore-compat.js`))
    .then(() => {
      firebase.initializeApp(FIREBASE_CONFIG);
      CLOUD.enabled = true;
      firebase.auth().onAuthStateChanged(user => {
        CLOUD.user = user;
      });
    })
    .catch(() => { CLOUD.enabled = false; });
})();

CLOUD.signIn = function () {
  if (!CLOUD.enabled) { UI.toast("Cloud sync isn't set up yet.", true); return; }
  const provider = new firebase.auth.GoogleAuthProvider();
  firebase.auth().signInWithPopup(provider)
    .then(() => {
      UI.toast("Signed in as " + firebase.auth().currentUser.displayName);
      UI.showSlotPicker({ forced: !STATE.characterCreated });
    })
    .catch(e => UI.toast("Sign-in failed: " + e.message, true));
};

CLOUD.signOut = function () {
  if (!CLOUD.enabled) return;
  firebase.auth().signOut().then(() => {
    UI.toast("Signed out.");
    UI.showSlotPicker({ forced: !STATE.characterCreated });
  });
};

CLOUD.uploadSlot = function (slot) {
  if (!CLOUD.enabled || !CLOUD.user) { UI.toast("Sign in with Google first.", true); return; }
  const raw = localStorage.getItem(slotKey(slot));
  if (!raw) { UI.toast("Nothing to upload in that slot.", true); return; }
  firebase.firestore().collection("users").doc(CLOUD.user.uid).collection("saves").doc(String(slot))
    .set({ data: raw, updatedAt: Date.now() })
    .then(() => UI.toast(`Uploaded Slot ${slot} to the cloud.`))
    .catch(e => UI.toast("Upload failed: " + e.message, true));
};

CLOUD.downloadSlot = function (slot) {
  if (!CLOUD.enabled || !CLOUD.user) { UI.toast("Sign in with Google first.", true); return; }
  firebase.firestore().collection("users").doc(CLOUD.user.uid).collection("saves").doc(String(slot)).get()
    .then(doc => {
      if (!doc.exists) { UI.toast("No cloud save for that slot yet.", true); return; }
      localStorage.setItem(slotKey(slot), doc.data().data);
      UI.toast(`Downloaded Slot ${slot} from the cloud.`);
      UI.showSlotPicker({ forced: !STATE.characterCreated });
    })
    .catch(e => UI.toast("Download failed: " + e.message, true));
};
