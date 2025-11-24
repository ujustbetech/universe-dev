import React, { useState } from "react";
import { getStorage, ref, uploadBytes, getDownloadURL, getBytes } from "firebase/storage";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";

const storage = getStorage();

/* 🔥 Disable Workbox / Service Worker */
if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then(regs => {
    regs.forEach(reg => reg.unregister());
  });
}

// ✅ FULLY ENHANCED MIGRATION WITH LIVE LOGGING
async function migrateUserAssetsWithLogs(setLogs, setProgress) {
  const usersSnapshot = await getDocs(collection(db, "usersdetail"));
  const totalUsers = usersSnapshot.docs.length;
  let userCounter = 0;

  setLogs(prev => [...prev, `📦 Total users found: ${totalUsers}`]);

  for (const userDoc of usersSnapshot.docs) {
    userCounter++;
    const userData = userDoc.data();
    const ujbCode = userDoc.id;

    setProgress(`${userCounter}/${totalUsers}`);
    setLogs(prev => [...prev, `👤 Processing user: ${ujbCode}`]);

    const services = userData.services || [];
    const products = userData.products || [];

    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, "0");
    const mobile = userData.phone || "unknown";

    const basePath = `UserAssets/${year}/${month}/${ujbCode}_${mobile}`;

    const migrateArray = async (items, type) => {
      return Promise.all(
        items.map(async (item, index) => {
          if (!item.imageURL) {
            setLogs(prev => [...prev, `⚠️ Skipped ${type}[${index}] - No imageURL`]);
            return item;
          }

          try {
            if (!item.imageURL.includes("/o/")) {
              setLogs(prev => [...prev, `❌ Invalid URL format: ${item.imageURL}`]);
              return item;
            }

            const storagePath = decodeURIComponent(
              item.imageURL.split("/o/")[1].split("?")[0]
            );

            setLogs(prev => [...prev, `⬇️ Downloading: ${storagePath}`]);

            const oldRef = ref(storage, storagePath);
            const bytes = await getBytes(oldRef);

            const newFilePath = `${basePath}/${type}_${index}.jpg`;
            const newRef = ref(storage, newFilePath);

            setLogs(prev => [...prev, `⬆️ Uploading to: ${newFilePath}`]);

            await uploadBytes(newRef, bytes);
            const newURL = await getDownloadURL(newRef);

            setLogs(prev => [...prev, `✅ Migrated ${type}[${index}] successfully`]);

            return { ...item, imageURL: newURL };
          } catch (error) {
            setLogs(prev => [...prev, `❌ FAILED ${type}[${index}] -> ${error.message}`]);
            return item;
          }
        })
      );
    };

    const updatedServices = await migrateArray(services, "service");
    const updatedProducts = await migrateArray(products, "product");

    await updateDoc(doc(db, "usersdetail", ujbCode), {
      services: updatedServices,
      products: updatedProducts,
    });

    setLogs(prev => [...prev, `✅ User ${ujbCode} completed`]);
  }
}

export default function MigrationPanel() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [logs, setLogs] = useState([]);
  const [progress, setProgress] = useState("0/0");

  const handleMigration = async () => {
    setLoading(true);
    setStatus("");
    setLogs([]);

    try {
      await migrateUserAssetsWithLogs(setLogs, setProgress);
      setStatus("✅ Migration completed successfully");
    } catch (error) {
      console.error(error);
      setStatus("❌ Migration failed. See logs below.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "40px", maxWidth: "900px", margin: "auto" }}>
      <h2>🔥 Firebase Storage Migration Tool</h2>

      <button
        onClick={handleMigration}
        disabled={loading}
        style={{
          padding: "12px 24px",
          fontSize: "16px",
          background: "#2563eb",
          color: "white",
          border: "none",
          borderRadius: "8px",
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "Migrating..." : "Start Migration"}
      </button>

      <p style={{ marginTop: "10px" }}>Progress: {progress}</p>

      {status && <h4 style={{ marginTop: "20px" }}>{status}</h4>}

      <div style={{
        marginTop: "20px",
        background: "#111",
        color: "#0f0",
        padding: "15px",
        borderRadius: "8px",
        height: "300px",
        overflowY: "auto",
        fontFamily: "monospace"
      }}>
        {logs.map((log, i) => (
          <div key={i}>{log}</div>
        ))}
      </div>
    </div>
  );
}
