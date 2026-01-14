import React from "react";
import { db } from "../../firebaseConfig";
import { collection, getDocs } from "firebase/firestore";

export default function ExportReferralJSON() {

  const exportAsJSON = async () => {
    try {
      const colRef = collection(db, "MonthlyMeeting");
      const snapshot = await getDocs(colRef);

      let result = [];
      snapshot.forEach((doc) => {
        result.push({ id: doc.id, ...doc.data() });
      });

      // Convert to JSON string
      const jsonString = JSON.stringify(result, null, 2);

      // Create downloadable file
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      // Create a temporary download link
      const link = document.createElement("a");
      link.href = url;
      link.download = "mm.json";
      link.click();

      URL.revokeObjectURL(url);

      alert("Referral data exported successfully!");
    } catch (error) {
      console.error("Export failed:", error);
      alert("Error exporting data");
    }
  };

  return (
    <div>
      <button 
        onClick={exportAsJSON} 
        style={{
          background: "#005bbb",
          padding: "10px 20px",
          borderRadius: "8px",
          border: "none",
          color: "#fff",
          cursor: "pointer",
          fontSize: "16px",
          marginTop: "20px"
        }}
      >
        Download Referral Collection JSON
      </button>
    </div>
  );
}
