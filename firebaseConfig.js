// firebaseConfig.js   (keep this exact file)
import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth, RecaptchaVerifier } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyARJI0DZgGwH9j2Hz318ddonBd55IieUBs",
  authDomain: "monthlymeetingapp.firebaseapp.com",
  projectId: "monthlymeetingapp",
  storageBucket: "monthlymeetingapp.appspot.com",
  messagingSenderId: "139941390700",
  appId: "1:139941390700:web:ab6aa16fcd8ca71bb52b49",
  measurementId: "G-26KEDXQKK9",
};

// Initialize only once
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// This is the correct way to export RecaptchaVerifier for invisible mode
export const setupRecaptcha = () => {
  if (typeof window === "undefined") return null;

  // Clear any previous instance
  if (window.recaptchaVerifier) {
    window.recaptchaVerifier.clear();
    window.recaptchaVerifier = null;
  }

  window.recaptchaVerifier = new RecaptchaVerifier(
    auth,
    "recaptcha-container",
    {
      size: "invisible",
      callback: () => {
        // OTP sent
      },
      "expired-callback": () => {
        // Expired
      },
    },
    auth
  );

  window.recaptchaVerifier.render();
  return window.recaptchaVerifier;
};

export { app, auth, db, storage };