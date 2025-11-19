// firebaseConfig.js
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { 
  getAuth, 
  RecaptchaVerifier, 
  signInWithPhoneNumber 
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyARJI0DZgGwH9j2Hz318ddonBd55IieUBs",
  authDomain: "monthlymeetingapp.firebaseapp.com",
  projectId: "monthlymeetingapp",
  storageBucket: "monthlymeetingapp.appspot.com",
  messagingSenderId: "139941390700",
  appId: "1:139941390700:web:ab6aa16fcd8ca71bb52b49",
  measurementId: "G-26KEDXQKK9"
};

// ✅ Initialize Firebase only once (prevents duplicate-app error)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// ✅ Services
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// ✅ EXPORT EVERYTHING NEEDED FOR OTP LOGIN
export {
  app,
  auth,
  db,
  storage,
  RecaptchaVerifier,
  signInWithPhoneNumber
};
