import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getMessaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyD-ykyzzDcJ__WhbhOIFljrczWqj1xKwXU",
  authDomain: "loksewa-guru-94ba7.firebaseapp.com",
  projectId: "loksewa-guru-94ba7",
  storageBucket: "loksewa-guru-94ba7.appspot.com",
  messagingSenderId: "58948764913",
  appId: "1:58948764913:web:c79b6bde81f40f44f75550",
  measurementId: "G-62JHEL54T7"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
// Enable local persistence for Auth
setPersistence(auth, browserLocalPersistence)
  .catch((error) => {
    console.error("Firebase Auth persistence error:", error);
  });

export const db = getFirestore(app);
export const storage = getStorage(app);
export const messaging = getMessaging(app);

// Enable offline persistence for Firestore
enableIndexedDbPersistence(db)
  .catch((err) => {
    if (err.code == 'failed-precondition') {
      // This can happen if multiple tabs are open.
      console.warn('Firestore persistence failed: Multiple tabs open, persistence can only be enabled in one tab at a time.');
    } else if (err.code == 'unimplemented') {
      // The current browser does not support all of the features required to enable persistence.
      console.warn('Firestore persistence is not supported in this browser.');
    } else {
        console.error("An error occurred while enabling Firestore persistence: ", err);
    }
  });

export default app;