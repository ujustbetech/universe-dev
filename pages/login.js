import React, { useState } from "react";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";

/**
 * This component copies ALL documents from:
 *   Referraldev  ---> Referralprod
 * and keeps the same document IDs and data structure
 */
export default function ReplicateReferralDB() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  const replicateDatabase = async () => {
    try {
      setLoading(true);
      setStatus("Starting replication...");

      const sourceCollection = collection(db, "Referraldev");
      const targetCollection = collection(db, "Referralprod");

      const snapshot = await getDocs(sourceCollection);

      if (snapshot.empty) {
        setStatus("No documents found in Referraldev");
        setLoading(false);
        return;
      }

      let copiedCount = 0;

      for (const document of snapshot.docs) {
        const data = document.data();

        // Create same document ID in Referralprod
        const targetDocRef = doc(targetCollection, document.id);
        await setDoc(targetDocRef, data, { merge: true });

        copiedCount++;
        setStatus(`Copied ${copiedCount} of ${snapshot.size} documents...`);
      }

      setStatus(`✅ Replication completed. ${copiedCount} documents copied successfully.`);
    } catch (error) {
      console.error("Replication Error:", error);
      setStatus(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-lg max-w-md">
      <h2 className="text-lg font-semibold mb-4">Replicate Referral Database</h2>

      <button
        onClick={replicateDatabase}
        disabled={loading}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
      >
        {loading ? "Replicating..." : "Replicate Referraldev ➜ Referralprod"}
      </button>

      {status && (
        <p className="mt-4 text-sm text-gray-700 whitespace-pre-line">
          {status}
        </p>
      )}
    </div>
  );
}
