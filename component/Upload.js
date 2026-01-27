import { useState } from "react";
import * as XLSX from "xlsx";

import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";

import { db } from "../firebaseConfig";

const TARGET_REFERRAL_ID = "Ref/25-26/00001745";

export default function ImportSinglePayment() {
  const [loading, setLoading] = useState(false);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);

    const reader = new FileReader();

    reader.onload = async (evt) => {
      try {
        /* ================= READ EXCEL ================= */
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet);

        /* ================= NORMALIZE HEADERS ================= */
        const normalizeRow = (row) => {
          const normalized = {};
          Object.keys(row).forEach((key) => {
            // remove ALL spaces from keys
            const cleanKey = key.replace(/\s+/g, "");
            normalized[cleanKey] = row[key];
          });
          return normalized;
        };

        const normalizedRows = rows.map(normalizeRow);

        /* ================= FIND EXCEL ROW ================= */
        const row = normalizedRows.find(
          (r) => r.referralId === TARGET_REFERRAL_ID
        );

        if (!row) {
          alert("Referral ID not found in Excel");
          setLoading(false);
          return;
        }

        /* ================= SOURCE OF TRUTH ================= */
        const actualReceived =
          Number(row["payment.actualReceived"]) || 0;

        if (actualReceived === 0) {
          alert("Actual received is zero. Import stopped.");
          setLoading(false);
          return;
        }

        /* ================= DISTRIBUTION ================= */
        const orbiter =
          Number(row["payments.distribution.orbiter"]) || 0;

        const orbiterMentor =
          Number(row["payments.distribution.orbiterMentor"]) || 0;

        const cosmoMentor =
          Number(row["payments.distribution.cosmoMentor"]) || 0;

        const ujustbe =
          Number(row["payments.distribution.ujustbe"]) || 0;

        /* ================= BUILD PAYMENT (MATCH FIREBASE) ================= */
        const payment = {
          actualReceived: actualReceived,
          amountReceived: actualReceived,
          comment: "Imported from Excel",
          createdAt: new Date().toISOString(),
          distribution: {
            orbiter,
            orbiterMentor,
            cosmoMentor,
            ujustbe,
          },
        };

        /* ================= FIND FIRESTORE DOC ================= */
        const q = query(
          collection(db, "Referraldev"),
          where("referralId", "==", TARGET_REFERRAL_ID)
        );

        const snap = await getDocs(q);

        if (snap.empty) {
          alert("Referral document not found in Firestore");
          setLoading(false);
          return;
        }

        const referralRef = snap.docs[0].ref;

        /* ================= UPDATE FIRESTORE ================= */
        await updateDoc(referralRef, {
          payments: arrayUnion(payment),
        });

        alert("Payment imported successfully 🎉");
      } catch (err) {
        console.error("IMPORT ERROR 👉", err);
        alert(err.message || "Import failed");
      } finally {
        setLoading(false);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  return (
    <div style={{ padding: 30 }}>
      <h2>Import Payment</h2>
      <p>
        Referral ID: <b>{TARGET_REFERRAL_ID}</b>
      </p>

      <input
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFileUpload}
      />

      {loading && <p>Processing...</p>}
    </div>
  );
}
