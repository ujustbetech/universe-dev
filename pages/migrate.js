import { useState } from "react";
import { db } from "../firebaseConfig";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";

export default function ConvertReferralDev() {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState([]);
  const [updatedCount, setUpdatedCount] = useState(0);

  const log = (msg) => {
    setProgress((prev) => [...prev, msg]);
  };

  const cleanPercentage = (value) => {
    if (!value) return "0";
    return value.toString().replace("%", "").trim();
  };

  const convertSingleProduct = (p) => {
    if (!p) return null;

    return {
      name: p.name || p.productName || "",
      keywords: p.keywords || "",
      description: p.description || "",
      imageURL: p.imageURL || "",
      agreedValue: {
        mode: "single",
        single: {
          type: "percentage",
          value: cleanPercentage(p.percentage),
        },
        multiple: {
          slabs: [],
          itemSlabs: [],
        },
      },
    };
  };

  const convertServices = (raw) => {
    if (!raw) return [];

    const arr = Array.isArray(raw) ? raw : Object.values(raw);

    return arr.map((s) => ({
      name: s.name || s.serviceName || "",
      keywords: s.keywords || "",
      description: s.description || "",
      imageURL: s.imageURL || "",
      agreedValue: {
        mode: "single",
        single: {
          type: "percentage",
          value: cleanPercentage(s.percentage),
        },
        multiple: {
          slabs: [],
          itemSlabs: [],
        },
      },
    }));
  };

  const runConversion = async () => {
    setLoading(true);
    setProgress([]);
    setUpdatedCount(0);

    try {
      log("Fetching Referraldev collection...");
      const referralSnap = await getDocs(collection(db, "Referraldev"));

      for (const refDoc of referralSnap.docs) {
        const refId = refDoc.id;
        log(`Processing ReferralDev doc → ${refId}`);

        const ref = doc(db, "Referraldev", refId);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
          log(`⚠️ Skipped ${refId} (no document)`);
          continue;
        }

        const data = snap.data();

        // Convert product (single map)
        const newProduct = convertSingleProduct(data.product);

        // Convert services (map OR array)
        const newServices = convertServices(data.services);

        await updateDoc(ref, {
          product: newProduct,
          services: newServices,
        });

        setUpdatedCount((prev) => prev + 1);
        log(`✔ Updated ${refId}`);
      }

      log("🎉 Conversion Completed!");
    } catch (e) {
      console.error(e);
      log(`❌ ERROR: ${e.message}`);
      alert("ERROR: " + e.message);
    }

    setLoading(false);
  };

  return (
    <div style={{ padding: 50 }}>
      <h1>Convert ReferralDev (Direct Documents)</h1>

      <button
        onClick={runConversion}
        disabled={loading}
        style={{
          padding: "14px 24px",
          fontSize: "18px",
          background: "#007bff",
          color: "#fff",
          borderRadius: 8,
          border: "none",
        }}
      >
        {loading ? "Converting…" : "Start Conversion"}
      </button>

      <div
        style={{
          marginTop: 20,
          padding: 15,
          maxHeight: 400,
          overflowY: "auto",
          background: "#f1f1f1",
          borderRadius: 8,
          border: "1px solid #ccc",
          fontFamily: "monospace",
        }}
      >
        <h3>Progress:</h3>
        {progress.map((p, i) => (
          <div key={i}>• {p}</div>
        ))}
        <div style={{ marginTop: 10, fontWeight: "bold" }}>
          Total Updated: {updatedCount}
        </div>
      </div>
    </div>
  );
}
