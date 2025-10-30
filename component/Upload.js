import React, { useRef } from "react";
import { db } from "../firebaseConfig";
import { collection, doc, setDoc, Timestamp } from "firebase/firestore";
import * as XLSX from "xlsx";

export default function ImportReferrals() {
  const fileInputRef = useRef();

  const handleFileSelect = () => fileInputRef.current.click();

  // 🕒 Helper to handle Excel date conversion
  const parseExcelDate = (value) => {
    if (!value) return Timestamp.now();
    if (value instanceof Date && !isNaN(value)) return Timestamp.fromDate(value);
    if (typeof value === "number") {
      const excelEpoch = new Date(1899, 11, 30);
      return Timestamp.fromDate(new Date(excelEpoch.getTime() + value * 86400000));
    }
    const parsed = new Date(value);
    return !isNaN(parsed) ? Timestamp.fromDate(parsed) : Timestamp.now();
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

      if (!jsonData.length) {
        alert("⚠️ Excel sheet is empty!");
        return;
      }

      let importedCount = 0;

      for (const row of jsonData) {
        const referralGivenDate = parseExcelDate(row["Referral Given date"]);
        const statusUpdatedDate = parseExcelDate(row["Status Updated Date"]);

        // ✅ CosmoOrbiter map
        const cosmoOrbiter = {
          name: row["CosmOrbiter Name"] || "",
          email: row["CosmOrbiter personal  Email"] || "",
          businessEmail: row["CosmOrbiter bussiness  Email"] || "",
          phone: (row["CosmOrbiter  Mobile number"] || "").toString().replace("+91", "").trim(),
          ujbCode: row["CosmOrbiter UJB Code"] || "",
          mentorName: row["CosmOrbiter mentorbiter Name "] || null,
          mentorEmail: row["CosmOrbiter MentOrbiter Email ID"] || null,
          mentorPhone: row["CosmOrbiter MentOrbiter Contact No "] || null,
          dealStatus: row["Referral/Deal Status"] || "Pending",
          lastUpdated: statusUpdatedDate,
        };

        // ✅ Orbiter map
        const orbiter = {
          name: row["Orbiter Name"] || "",
          email: row["Orbiter Email"] || "",
          phone: (row["Orbiter Mobile number"] || "").toString().replace("+91", "").trim(),
          ujbCode: row["Orbiter_ujbCode"] || "",
          mentorName: row["Orbiter MentOrbiter Name"] || null,
          mentorEmail: row["Orbiter MentOrbiter Email"] || null,
          mentorPhone: row["Orbiter MentOrbiter Mobile number"] || null,
          orbitersInfo: null,
        };

        // ✅ Product map
        const product = {
          name: row["Product/Service Name"] || "",
          description: row["Referral Description"] || "",
          percentage: row["Agreed Percentage/ amount "]?.toString() || "",
        };

        // ✅ Payments map (array)
        const payments = [
          // 1️⃣ Amount received by CosmOrbiter
          {
            paymentFrom: "CosmoOrbiter",
            paymentFromName: cosmoOrbiter.name || "",
            paymentTo: "UJustBe",
            paymentToName: "UJustBe",
            paymentDate: row["Payment Date"] || "",
            modeOfPayment: row["Payment Mode"] || "",
            amountReceived: row["Amount Recieved by CosmOrbiter"]?.toString() || "0",
            comment: "",
            ujbShareType: "UJustBe",
            createdAt: Timestamp.now(),
            paymentInvoiceURL: "",
            transactionRef: "",
          },
          // 2️⃣ Amount transferred to UJB for this deal
          {
            paymentFrom: "CosmoOrbiter",
            paymentFromName: cosmoOrbiter.name || "",
            paymentTo: "UJustBe",
            paymentToName: "UJustBe",
            paymentDate: row["Payment Date"] || "",
            modeOfPayment: row["Payment Mode"] || "",
            amountReceived: row["Amount Transfered to ujb for this deal"]?.toString() || "0",
            comment: "",
            ujbShareType: "UJustBe",
            createdAt: Timestamp.now(),
            paymentInvoiceURL: "",
            transactionRef: "",
          },
          // 3️⃣ UJB transferred to Orbiter
          {
            paymentFrom: "UJustBe",
            paymentFromName: "UJustBe",
            paymentTo: "Orbiter",
            paymentToName: orbiter.name || "",
            paymentDate: row["Orbiter Payment Date"] || "",
            modeOfPayment: row["Orbiter Payment Mode"] || "",
            amountReceived: row["Amount UJb transfered to Orbiter"]?.toString() || "0",
            comment: "",
            ujbShareType: "Orbiter",
            createdAt: Timestamp.now(),
            paymentInvoiceURL: "",
            transactionRef: "",
          },
          // 4️⃣ UJB transferred to Orbiter mentor
          {
            paymentFrom: "UJustBe",
            paymentFromName: "UJustBe",
            paymentTo: "Orbiter Mentor",
            paymentToName: orbiter.mentorName || "",
            paymentDate: row["Orbiter mentor Payment Date"] || "",
            modeOfPayment: row["Orbiter mentor Payment Mode"] || "",
            amountReceived: row["Amount Ujb transfered to Orbiter mentor"]?.toString() || "0",
            comment: "",
            ujbShareType: "Orbiter Mentor",
            createdAt: Timestamp.now(),
            paymentInvoiceURL: "",
            transactionRef: "",
          },
          // 5️⃣ UJB transferred to CosmoOrbiter mentor
          {
            paymentFrom: "UJustBe",
            paymentFromName: "UJustBe",
            paymentTo: "CosmoOrbiter Mentor",
            paymentToName: cosmoOrbiter.mentorName || "",
            paymentDate: row["CosmOrbiter mentor Payment Date"] || "",
            modeOfPayment: row["CosmOrbiter mentor Payment Mode"] || "",
            amountReceived: row["Amount ujb transfered to CosmOrbiter mentor"]?.toString() || "0",
            comment: "",
            ujbShareType: "CosmoOrbiter Mentor",
            createdAt: Timestamp.now(),
            paymentInvoiceURL: "",
            transactionRef: "",
          },
        ];

        // ✅ Main referral document
        const referralDoc = {
          referralId: row["Referral Id"] || "",
          referralSource: row["Referral Source"] || "",
          referralType: row["Referred for (Self/Third Party) Name"] ? "Third Party" : "Self",
          timestamp: referralGivenDate,
          referredForName: row["Referred for (Self/Third Party) Name"] || "",
          referredForEmail: row["Referred for (Self/Third Party) Email"] || "",
          referredForPhone: (row["Referred for (Self/Third Party) Mobile number"] || "").toString(),
          cosmoOrbiter,
          orbiter,
          product,
          payments, // 💰 Added payment details here
          balanceRemainingWithUJB: row["Balance remaining with UJB"]?.toString() || "0",
        };

        const docRef = doc(collection(db, "Referraldev"));
        await setDoc(docRef, referralDoc);
        importedCount++;
      }

      alert(`✅ ${importedCount} referrals imported successfully with payments!`);
    } catch (error) {
      console.error("❌ Error importing referrals:", error);
      alert("❌ Failed to import referrals. Check console for details.");
    }
  };

  return (
    <div>
      <button onClick={handleFileSelect} className="m-button-5">
        Choose Excel File to Import
      </button>
      <input
        type="file"
        accept=".xlsx, .xls"
        ref={fileInputRef}
        onChange={handleImport}
        style={{ display: "none" }}
      />
    </div>
  );
}
