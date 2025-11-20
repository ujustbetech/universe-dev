import React, { useState } from "react";
import * as XLSX from "xlsx";
import { db } from "../firebaseConfig";
import { COLLECTIONS } from "/utility_collection";
import { collection, doc, getDoc, updateDoc } from "firebase/firestore";

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
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      setExcelData(jsonData);
      console.log("Excel Data:", jsonData);
    };

    reader.readAsArrayBuffer(file);
  };

  const updateKeywordsInArray = (existingArray, row, type) => {
    // type = "Service" or "Product"
    if (!Array.isArray(existingArray)) return existingArray;

    return existingArray.map((item, index) => {
      const keywordValue = row[`${type} ${index + 1}_Keywords`] || "";
      return {
        ...item,
        keywords: keywordValue,
      };
    });
  };

  const uploadDataToFirestore = async () => {
    if (!excelData) {
      alert("Please upload a file first.");
      return;
    }

    try {
      const collectionRef = collection(db, "userdetail");

      for (let row of excelData) {
        const mobileNumber = String(row["Mobile no"])?.trim();
        if (!mobileNumber) {
          console.error("❌ Mobile number missing in row:", row);
          continue;
        }

        const docRef = doc(collectionRef, mobileNumber);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          console.warn(`⚠️ Document not found for Mobile no: ${mobileNumber}`);
          continue;
        }

        const userData = docSnap.data();

        const updatedServices = updateKeywordsInArray(
          userData.services || [],
          row,
          "Service"
        );
        const updatedProducts = updateKeywordsInArray(
          userData.products || [],
          row,
          "Product"
        );

        await updateDoc(docRef, {
          services: updatedServices,
          products: updatedProducts,
        });

        console.log(`✅ Keywords updated for ${mobileNumber}`);
      }

      alert("✅ Keywords updated successfully for all rows!");
    } catch (error) {
      console.error("❌ Error updating keywords:", error);
      alert("Error updating keywords. Check console for details.");
    }
  };

  return (
    <>
      <section className="c-form box">
        <h2>Upload Excel (Only Keywords)</h2>
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
                Update Keywords
              </button>
            </div>
          </li>
        </ul>
      </section>
    </>
  );
};

export default UploadExcel;
