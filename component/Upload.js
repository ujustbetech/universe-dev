import React, { useRef } from "react";
import { db } from "../firebaseConfig";
import { doc, setDoc } from "firebase/firestore";
import * as XLSX from "xlsx";

export default function ImportUsers() {
  const fileInputRef = useRef();

  const handleFileSelect = () => {
    fileInputRef.current.click();
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

      const headers = Object.keys(jsonData[0]);
      const ujbCodeHeader = headers.find(
        (h) => h.toLowerCase().replace(/\s/g, "") === "ujbcode"
      );
      if (!ujbCodeHeader) {
        alert("❌ Cannot find a UJB Code column in Excel!");
        console.log("Headers found:", headers);
        return;
      }

      let importedCount = 0;

      for (const row of jsonData) {
        const ujbCode = row[ujbCodeHeader]?.toString().trim();
        if (!ujbCode) continue;

        const category = row["Category"]?.trim() || "";

        const services = [];
        const products = [];
        const connects = [];
        const contributionAreas = [];
        const skills = [];

        // Contribution Areas
        if (row["Contribution Area in UJustBe"]) {
          contributionAreas.push(
            ...row["Contribution Area in UJustBe"]
              .split(",")
              .map((a) => a.trim())
              .filter((a) => a)
          );
        }

        // Skills
        if (row["Skills"]) {
          skills.push(
            ...row["Skills"]
              .split(",")
              .map((s) => s.trim())
              .filter((s) => s)
          );
        }

        // Parse connects
        Object.keys(row).forEach((key) => {
          if (key.startsWith("Connect") && row[key] && row[key] !== "—") {
            const match = row[key].match(
              /Name:\s*(.*?),\s*Phone:\s*(.*?),\s*Email:\s*(.*?),\s*UJBCode:\s*(.*)?/
            );
            if (match) {
              connects.push({
                name: match[1]?.trim(),
                phone: match[2]?.trim(),
                email: match[3]?.trim(),
                ujbCode: match[4]?.trim() || "", // ujbCode may be missing
              });
            }
          }
        });

        // Parse services (with keywords)
        Object.keys(row).forEach((key) => {
          if (key.startsWith("Service") && row[key] && row[key] !== "—") {
            const match = row[key].match(
              /Name:\s*(.*?),\s*Description:\s*(.*?),\s*Keywords:\s*(.*?),\s*Image:\s*(.*?),\s*%:\s*(.*)/
            );
            if (match) {
              services.push({
                name: match[1]?.trim(),
                description: match[2]?.trim(),
                keywords: match[3]?.trim(),
                imageURL: match[4]?.trim(),
                percentage: match[5]?.trim(),
              });
            }
          }
        });

        // Parse products (with keywords)
        Object.keys(row).forEach((key) => {
          if (key.startsWith("Product") && row[key] && row[key] !== "—") {
            const match = row[key].match(
              /Name:\s*(.*?),\s*Description:\s*(.*?),\s*Keywords:\s*(.*?),\s*Image:\s*(.*?),\s*%:\s*(.*)/
            );
            if (match) {
              products.push({
                name: match[1]?.trim(),
                description: match[2]?.trim(),
                keywords: match[3]?.trim(),
                imageURL: match[4]?.trim(),
                percentage: match[5]?.trim(),
              });
            }
          }
        });

        // Base user object
        const userObj = {
          Name: row["Name"] || "",
          Address: row["Address"] || "",
          AreaOfServices: row["AreaOfServices"] || "",
          Aspirations: row["Aspirations"] || "",
          Category: category,
          Category1: row["Category1"] || "",
          Category2: row["Category2"] || "",
          City: row["City"] || "",
          ClienteleBase: row["ClienteleBase"] || "",
          ContributionAreaInUJustBe: contributionAreas,
          CurrentHealthCondition: row["CurrentHealthCondition"] || "",
          CurrentProfession: row["CurrentProfession"] || "",
          DOB: row["DOB"] || "",
          EducationalBackground: row["EducationalBackground"] || "",
          Email: row["Email"] || "",
          ExclusiveKnowledge: row["ExclusiveKnowledge"] || "",
          FamilyHistorySummary: row["FamilyHistorySummary"] || "",
          Gender: row["Gender"] || "",
          HealthParameters: row["HealthParameters"] || "",
          Hobbies: row["Hobbies"] || "",
          IDNumber: row["IDNumber"] || "",
          IDType: row["IDType"] || "",
          ImmediateDesire: row["ImmediateDesire"] || "",
          InterestArea: row["InterestArea"] || "",
          LanguagesKnown: row["LanguagesKnown"] || "",
          Locality: row["Locality"] || "",
          Location: row["Location"] || "",
          MaritalStatus: row["MaritalStatus"] || "",
          Mastery: row["Mastery"] || "",
          MentorName: row["MentorName"] || "",
          MentorPhone: row["MentorPhone"] || "",
          MentorUJBCode: row["MentorUJBCode"] || "",
          MobileNo: row["MobileNo"] || "",
          NoteworthyAchievements: row["NoteworthyAchievements"] || "",
          ProfessionalHistory: row["ProfessionalHistory"] || "",
          ProfilePhotoURL: row["ProfilePhotoURL"] || "",
          ProfileStatus: row["ProfileStatus"] || "",
          Skills: skills,
          SpecialSocialContribution: row["SpecialSocialContribution"] || "",
          State: row["State"] || "",
          TagLine: row["TagLine"] || "",
          UJBCode: ujbCode,
          USP: row["USP"] || "",
          Website: row["Website"] || "",
        };

        // Only include business/services/products/connects if not Orbiter
        if (category.toLowerCase() !== "orbiter") {
          userObj.BusinessDetails = row["BusinessDetails"] || "";
          userObj.BusinessEmailID = row["BusinessEmailID"] || "";
          userObj.BusinessHistory = row["BusinessHistory"] || "";
          userObj.BusinessLogo = row["BusinessLogo"] || "";
          userObj.BusinessName = row["BusinessName"] || "";
          userObj.BusinessSocialMediaPages = row["BusinessSocialMediaPages"] || "";
          userObj.services = services;
          userObj.products = products;
          userObj.connects = connects;
        }

        await setDoc(doc(db, "usersdetail", ujbCode), userObj);
        importedCount++;
      }

      alert(`✅ ${importedCount} Users imported successfully!`);
    } catch (error) {
      console.error("❌ Error importing users:", error);
      alert("❌ Failed to import users. Check console.");
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
