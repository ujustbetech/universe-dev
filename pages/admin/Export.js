import React from "react";
import { db } from "../../firebaseConfig";
import { collection, getDocs } from "firebase/firestore";
import * as XLSX from "xlsx";

export default function ExportAllUsers() {
  const handleExport = async () => {
    try {
      const snapshot = await getDocs(collection(db, "userdetail"));

      if (snapshot.empty) {
        alert("No users found!");
        return;
      }

      const MAX_SERVICES = 5;
      const MAX_PRODUCTS = 5;
      const MAX_CONNECTS = 10;

      // Step 1: Collect all users
      const usersData = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        data: docSnap.data(),
      }));

      // Step 2: Build a map of mentors -> mentees
      const mentorMap = {};
      usersData.forEach(({ data }) => {
        if (data["Mentor UJB Code"]) {
          const mentorCode = data["Mentor UJB Code"];
          if (!mentorMap[mentorCode]) mentorMap[mentorCode] = [];
          mentorMap[mentorCode].push({
            Name: data[" Name"] || "—",
            Phone: data["Mobile no"] || "—",
            Email: data.Email || "—",
            UJBCode: data["UJB Code"] || "—",
          });
        }
      });

      // Step 3: Prepare export data
      const allUsers = usersData.map(({ id, data }) => {
        const userObj = {
          ID: id,
          Name: data[" Name"] || "—",
          Address: data["Address (City, State)"] || "—",
          AreaOfServices: data["Area of Services"] || "—",
          Aspirations: data.Aspirations || "—",
          BusinessDetails: data["Business Details (Nature & Type)"] || "—",
          BusinessEmailID: data["Business Email ID"] || "—",
          BusinessHistory: data["Business History"] || "—",
          BusinessLogo: data["Business Logo"] || "—",
          BusinessName: data["Business Name"] || "—",
          BusinessSocialMediaPages: data["Business Social Media Pages"] || "—",
          Category: data.Category || "—",
          Category1: data["Category 1"] || "—",
          Category2: data["Category 2"] || "—",
          City: data.City || "—",
          ClienteleBase: data["Clientele Base"] || "—",
          ContributionAreas: data["Contribution Area in UJustBe"]
            ? data["Contribution Area in UJustBe"].join(", ")
            : "—",
          CurrentHealthCondition: data["Current Health Condition"] || "—",
          CurrentProfession: data["Current Profession"] || "—",
          DOB: data.DOB || "—",
          EducationalBackground: data["Educational Background"] || "—",
          Email: data.Email || "—",
          ExclusiveKnowledge: data["Exclusive Knowledge"] || "—",
          FamilyHistorySummary: data["Family History Summary"] || "—",
          Gender: data.Gender || "—",
          HealthParameters: data["Health Parameters"] || "—",
          Hobbies: data.Hobbies || "—",
          IDNumber: data["ID Number"] || "—",
          IDType: data["ID Type"] || "—",
          ImmediateDesire: data["Immediate Desire"] || "—",
          InterestArea: data["Interest Area"] || "—",
          LanguagesKnown: data["Languages Known"] || "—",
          Locality: data.Locality || "—",
          Location: data.Location || "—",
          MaritalStatus: data["Marital Status"] || "—",
          Mastery: data.Mastery || "—",
          MentorName: data["Mentor Name"] || "—",
          MentorPhone: data["Mentor Phone"] || "—",
          MentorUJBCode: data["Mentor UJB Code"] || "—",
          MobileNo: data["Mobile no"] || "—",
          NoteworthyAchievements: data["Noteworthy Achievements"] || "—",
          ProfessionalHistory: data["Professional History"] || "—",
          ProfilePhotoURL: data["Profile Photo URL"] || "—",
          ProfileStatus: data["Profile Status"] || "—",
          Skills: data.Skills ? data.Skills.join(", ") : "—",
          SpecialSocialContribution: data["Special Social Contribution"] || "—",
          State: data.State || "—",
          TagLine: data["Tag Line"] || "—",
          UJBCode: data["UJB Code"] || "—",
          USP: data.USP || "—",
          Website: data.Website || "—",
        };

        // ✅ Services (with keywords)
        for (let i = 0; i < MAX_SERVICES; i++) {
          const s = data.services && data.services[i];
          userObj[`Service ${i + 1}`] = s
            ? `Name: ${s.name || "—"}, Description: ${s.description || "—"}, Keywords: ${s.keywords || "—"}, Image: ${s.imageURL || "—"}, %: ${s.percentage || "—"}`
            : "—";
        }

        // ✅ Products (with keywords)
        for (let i = 0; i < MAX_PRODUCTS; i++) {
          const p = data.products && data.products[i];
          userObj[`Product ${i + 1}`] = p
            ? `Name: ${p.name || "—"}, Description: ${p.description || "—"}, Keywords: ${p.keywords || "—"}, Image: ${p.imageURL || "—"}, %: ${p.percentage || "—"}`
            : "—";
        }

        // ✅ Connects (mentees)
        const mentees = mentorMap[data["UJB Code"]] || [];
        for (let i = 0; i < MAX_CONNECTS; i++) {
          const c = mentees[i];
          userObj[`Connect ${i + 1}`] = c
            ? `Name: ${c.Name}, Phone: ${c.Phone}, Email: ${c.Email}, UJBCode: ${c.UJBCode}`
            : "—";
        }

        return userObj;
      });

      const worksheet = XLSX.utils.json_to_sheet(allUsers);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Users");

      XLSX.writeFile(workbook, "AllUsersExport.xlsx");
      alert("✅ All users exported successfully!");
    } catch (error) {
      console.error("Error exporting users:", error);
      alert("❌ Failed to export users. Check console for details.");
    }
  };

  return (
    <button onClick={handleExport} className="m-button-5">
      Export All Users
    </button>
  );
}
