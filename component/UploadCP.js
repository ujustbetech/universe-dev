import React, { useState } from "react";
import * as XLSX from "xlsx";
import { db } from "../firebaseConfig";
import { COLLECTIONS } from "/utility_collection";
import { doc, collection, setDoc } from "firebase/firestore";

const UploadExcel = () => {
  const [excelData, setExcelData] = useState(null);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    const reader = new FileReader();

    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false });

      // Convert Excel date serial numbers to Month-Year format
      jsonData.forEach((row) => {
        if (row["Month"] && !isNaN(row["Month"])) {
          const excelDate = Number(row["Month"]);
          const date = new Date((excelDate - 25569) * 86400000);
          const formattedMonth = date.toLocaleDateString("en-GB", {
            year: "2-digit",
            month: "short",
          });
          row["Month"] = formattedMonth.replace(" ", "-"); // e.g. "Apr 23" → "Apr-23"
        }
      });

      setExcelData(jsonData);
      console.log("Parsed Excel Data:", jsonData);
    };

    reader.readAsArrayBuffer(file);
  };

  const uploadDataToFirestore = async () => {
    if (excelData) {
      try {
        for (let row of excelData) {
          const phoneNumber = String(row["Mobile Number"] || "").trim();
          const orbiterName = String(row["Orbiter Name"] || "").trim();

          if (!phoneNumber) {
            console.error("Skipping row due to missing phone number:", row);
            continue;
          }

          // 1️⃣ Save / Update main Orbiter document with name & phone number
          const userRef = doc(db, "Orbiters", phoneNumber);
          await setDoc(
            userRef,
            {
              name: orbiterName || "",    // Save Orbiter Name
              phoneNumber: phoneNumber,
            },
            { merge: true } // so existing data isn't overwritten
          );

          // 2️⃣ Save activity data inside 'activities' subcollection
          const activitiesCollectionRef = collection(userRef, "activities");
          const activityId = String(row["Activity No"] || Date.now()).trim();

          const activityData = {
            month: row["Month"] || "",
            activityNo: activityId,
            points: row["Points"] || 0,
            activityDescription: row["Activity Discription"] || "",
            activityType: row["Activity Type"] || "",
            phoneNumber,
          };

          const activityDocRef = doc(activitiesCollectionRef, activityId);
          await setDoc(activityDocRef, activityData);
        }

        alert("✅ Data uploaded successfully including Orbiter Name!");
      } catch (error) {
        console.error("Error uploading data:", error);
        alert("❌ Error uploading data. Check console for details.");
      }
    } else {
      alert("Please upload a file first.");
    }
  };

  return (
    <>
      <section className="c-form box">
        <h2>Upload Excel</h2>
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
                style={{ backgroundColor: "#f16f06", color: "white" }}
              >
                Upload
              </button>
            </div>
          </li>
        </ul>
      </section>
    </>
  );
};

export default UploadExcel;
