"use client";

import React, { useState } from "react";
import * as XLSX from "xlsx";
import {
  collection,
  doc,
  setDoc,
  serverTimestamp,
  getFirestore,
} from "firebase/firestore";
import { initializeApp, getApps } from "firebase/app";
import { db } from "../../firebaseConfig"; 



export default function ImportCPActivity() {
  const [loading, setLoading] = useState(false);

  const handleExcelUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);

    const reader = new FileReader();
 reader.onload = async (evt) => {
  const workbook = XLSX.read(evt.target.result, { type: "binary" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  let counter = 1;

  for (const row of rows) {
    const docId = String(counter).padStart(3, "0");

    await setDoc(doc(db, "cpactivity", docId), {
      activityNo: docId,
      activityName: String(row["Activity & Sub-Activity"]).trim(),
      category: String(row["Cat Allocation"]).trim(),
      points: Number(row["Points (Tentative)"]) || 0,
      purpose: String(row["Purpose / Reason for Point Allocation"]).trim(),
      createdAt: serverTimestamp(),
    });

    counter++;
  }

  alert("✅ CP Activities imported successfully");
  setLoading(false);
};


    reader.readAsBinaryString(file);
  };

  return (
    <div style={{ padding: "40px" }}>
      <h2>Import CP Activities (Excel)</h2>

      <input
        type="file"
        accept=".xlsx, .xls"
        onChange={handleExcelUpload}
      />

      {loading && <p>Uploading & importing data...</p>}
    </div>
  );
}
