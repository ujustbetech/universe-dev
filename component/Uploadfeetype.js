import React, { useState } from "react";
import * as XLSX from "xlsx";
import { db } from "../firebaseConfig";
import { doc, setDoc } from "firebase/firestore";

const UploadUserDetails = () => {
  const [excelData, setExcelData] = useState(null);

  // ✅ Handle Excel File Upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    const reader = new FileReader();

    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false });

      console.log("Parsed Excel Data:", jsonData);
      setExcelData(jsonData);
    };

    reader.readAsArrayBuffer(file);
  };

  // ✅ Upload Parsed Data to Firestore
  const uploadDataToFirestore = async () => {
    if (!excelData) {
      alert("⚠️ Please upload a file first.");
      return;
    }

    try {
      for (const row of excelData) {
        const ujbCode = String(row["UJB Code"] || "").trim();
        const orbiterName = String(row["Orbiter Name"] || "").trim();
        const mobileNumber = String(row["Mobile Number"] || "").trim();
        const oneTimeFee = Number(row["One time enrollment fees"] || 0);
        const balanceAmount = Number(row["Balance Amount"] || 0);
        const adjustedAmount = Number(row["Adjusted Amount"] || 0);

        if (!ujbCode) {
          console.warn("Skipping row due to missing UJB Code:", row);
          continue;
        }

        const docRef = doc(db, "userdetail_dev", ujbCode);
        const now = new Date().toISOString();
        const paidDate = now.split("T")[0];

        // Firestore data structure
        const userData = {
          ujbCode,
          orbiterName,
          mobileNumber,
          oneTimeEnrollmentFee: oneTimeFee,
          balanceAmount,
          payment: {
            orbiter: [
              {
                amount: adjustedAmount,
                feeType: "adjustment",
                lastUpdated: now,
                paidDate,
                paymentId: "",
                paymentMode: "",
                screenshotURL: "",
                status: "adjusted",
              },
            ],
          },
        };

        await setDoc(docRef, userData, { merge: true });
        console.log(`✅ Uploaded: ${ujbCode}`);
      }

      alert("🎉 Data uploaded successfully!");
    } catch (error) {
      console.error("❌ Error uploading data:", error);
      alert("Error uploading data. Check console for details.");
    }
  };

  return (
    <section className="c-form box">
      <h2>Upload User Details (UJB Data)</h2>
      <button className="m-button-5" onClick={() => window.history.back()}>
        Back
      </button>
      <ul>
        <div className="upload-container">
          <input
            type="file"
            id="fileUpload"
            className="file-input"
            onChange={handleFileUpload}
            accept=".xlsx, .xls"
          />
        </div>

        <li className="form-row">
          <div>
            <button
              className="m-button-7"
              onClick={uploadDataToFirestore}
              style={{ backgroundColor: "#007bff", color: "white" }}
            >
              Upload to Firestore
            </button>
          </div>
        </li>
      </ul>
    </section>
  );
};

export default UploadUserDetails;
