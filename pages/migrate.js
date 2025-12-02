"use client";

import React, { useState } from "react";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  updateDoc,
  doc,
} from "firebase/firestore";

const firebaseConfig = {
  // your firebase config
   apiKey: "AIzaSyARJI0DZgGwH9j2Hz318ddonBd55IieUBs",
  authDomain: "monthlymeetingapp.firebaseapp.com",
  projectId: "monthlymeetingapp",
  storageBucket: "monthlymeetingapp.appspot.com",
  messagingSenderId: "139941390700",
  appId: "1:139941390700:web:ab6aa16fcd8ca71bb52b49",
  measurementId: "G-26KEDXQKK9"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export default function RestoreAllPage() {
  const [status, setStatus] = useState("");

  const restoreAll = async () => {
    try {
      setStatus("Restoring all users... Please wait.");

      const usersSnap = await getDocs(collection(db, "userdetail_dev"));

      for (const user of usersSnap.docs) {
        const uid = user.id;
        const userRef = doc(db, "userdetail_dev", uid);

        console.log("Restoring user:", uid);

        // SUBCOLLECTIONS
        const productsSnap = await getDocs(collection(userRef, "products"));
        const servicesSnap = await getDocs(collection(userRef, "services"));

        const restoredProducts = productsSnap.docs.map((d) => d.data());
        const restoredServices = servicesSnap.docs.map((d) => d.data());

        await updateDoc(userRef, {
          products: restoredProducts,
          services: restoredServices,
        });
      }

      setStatus("✅ All users restored successfully!");
    } catch (err) {
      console.error(err);
      setStatus("❌ Error occurred. Check console.");
    }
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>Restore ALL Users' Products & Services</h1>

      <button
        onClick={restoreAll}
        style={{
          padding: "12px 20px",
          fontSize: "18px",
          background: "green",
          color: "white",
          borderRadius: "8px",
          cursor: "pointer",
          border: "none",
        }}
      >
        Restore All Users
      </button>

      <p style={{ marginTop: 20, fontSize: 18 }}>{status}</p>
    </div>
  );
}
