import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  getDoc,
} from "firebase/firestore";
import { db } from "../firebaseConfig";
import { getAuth } from "firebase/auth";
import { COLLECTIONS } from "/utility_collection";
import "../src/app/styles/main.scss";

const ProspectFormDetails = ({ id }) => {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    const fetchForms = async () => {
      try {
        const subcollectionRef = collection(db, "Prospects", id, "prospectform");
        const snapshot = await getDocs(subcollectionRef);

        const auth = getAuth();
        const user = auth.currentUser;

     const prospectDocRef = doc(db, "Prospects", id);
const prospectSnap = await getDoc(prospectDocRef);

const prospectData = prospectSnap.exists() ? prospectSnap.data() : {};

const defaultMentor = {
  mentorName: prospectData.orbiterName || "",
  mentorPhone: prospectData.orbiterContact || "",
  mentorEmail: prospectData.orbiterEmail || "",
};

const defaultProspect = {
  fullName: prospectData.prospectName || "",
  email: prospectData.email || "",
  phoneNumber: prospectData.prospectPhone || "",
};

        if (snapshot.empty) {
          setForms([
            {
               ...defaultMentor,
    ...defaultProspect,
    assessmentDate: "", // You can autofill this too if needed
    country: "",
    city: "",
    profession: prospectData.occupation || "",
    companyName: "",
    industry: "",
    socialProfile: "",
    howFound: "",
    interestLevel: "",
    interestAreas: prospectData.hobbies ? [prospectData.hobbies] : [],
    contributionWays: [],
    informedStatus: "",
    alignmentLevel: "",
    recommendation: "",
    additionalComments: "",
            },
          ]);
          setEditMode(true);
        } else {
          const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
          setForms(data);
        }

        setLoading(false);
      } catch (error) {
        console.error("Error fetching prospect forms:", error);
      }
    };

    fetchForms();
  }, [id]);

  const handleChange = (formIndex, field, value) => {
    const updatedForms = [...forms];
    updatedForms[formIndex][field] = value;
    setForms(updatedForms);
  };

  const handleSave = async () => {
    try {
      for (const form of forms) {
        const formCopy = { ...form };

        if (form.id) {
          const docRef = doc(db, "Prospects", id, "prospectform", form.id);
          delete formCopy.id;
          await updateDoc(docRef, formCopy);
        } else {
          await addDoc(collection(db, "Prospects", id, "prospectform"), formCopy);
        }
      }
      alert("Forms saved successfully!");
      setEditMode(false);
    } catch (err) {
      console.error("Error saving forms:", err);
      alert("Failed to save changes.");
    }
  };

  const handleAddForm = () => {
    // You may want to re-fetch mentor and prospect data again if needed
    setEditMode(true);
  };

  if (loading) return <p>Loading...</p>;

  if (forms.length === 0) {
    return (
      <div>
        <h2>Prospects Assessment Form</h2>
        <p>No prospect forms found.</p>
        <button className="save-button" onClick={handleAddForm}>
          Add New Form
        </button>
      </div>
    );
  }

  return (
    <div>
      <h2>Prospects Assessment Form</h2>

     {forms.map((form, index) => (
  <div key={form.id || index}>
    <ul>
      {[
        { label: "Mentor Name", key: "mentorName" },
        { label: "Mentor Phone", key: "mentorPhone" },
        { label: "Mentor Email", key: "mentorEmail" },
        { label: "Assessment Date", key: "assessmentDate" },
        { label: "Prospect Name", key: "fullName" },
        { label: "Phone", key: "phoneNumber" },
        { label: "Email", key: "email" },
        { label: "Country", key: "country" },
        { label: "City", key: "city" },
        { label: "Profession", key: "profession" },
        { label: "Company", key: "companyName" },
        { label: "Industry", key: "industry" },
        { label: "Social Profile", key: "socialProfile" },
        { label: "Found How", key: "howFound" },
        { label: "Interest Level", key: "interestLevel" },
        {
          label: "Interest Areas",
          key: "interestAreas",
          isArray: true,
        },
        {
          label: "Contribution Ways",
          key: "contributionWays",
          isArray: true,
        },
        { label: "Informed Status", key: "informedStatus" },
        { label: "Alignment Level", key: "alignmentLevel" },
        { label: "Recommendation", key: "recommendation" },
        { label: "Comments", key: "additionalComments" },
      ].map(({ label, key, isArray }) => (
        <li className="form-row" key={key}>
          <h4>
            {label}:<sup>*</sup>
          </h4>
          <div className="multipleitem">
            {(key === "howFound" ||
              key === "interestLevel" ||
              key === "informedStatus" ||
              key === "alignmentLevel" ||
              key === "recommendation") ? (
              <select
                name={key}
                value={form[key] || ""}
                disabled={!editMode}
                onChange={(e) => handleChange(index, key, e.target.value)}
              >
                <option value="">Select</option>
                {key === "howFound" &&
                  ["Referral", "Networking Event", "Social Media", "Other"].map(
                    (option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    )
                  )}
                {key === "interestLevel" &&
                  [
                    "Actively involved",
                    "Some interest",
                    "Unfamiliar but open",
                  ].map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                {key === "informedStatus" &&
                  [
                    "Fully aware",
                    "Partially aware",
                    "Not informed",
                  ].map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                {key === "alignmentLevel" &&
                  [
                    "Not aligned",
                    "Slightly aligned",
                    "Neutral",
                    "Mostly aligned",
                    "Fully aligned",
                  ].map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                {key === "recommendation" &&
                  [
                    "Strongly recommended",
                    "Needs alignment",
                    "Not recommended",
                  ].map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
              </select>
            ) : isArray &&
              (key === "interestAreas" || key === "contributionWays") ? (
              <div className="checkbox-group">
                {(key === "interestAreas"
                  ? [  "Skill Sharing & Collaboration",
  "Business Growth & Referrals",
  "Learning & Personal Development",
  "Community Engagement",
  "Others (please specify)"]
                  : [  "Sharing knowledge and expertise",
  "Providing business or services",
  "Connecting with fellow Orbiters",
  "Active participation in events/meetings",
  "Other (please specify)"]
                ).map((option, idx) => (
                  <div key={idx} className="checkbox-item">
                    <input
                      type="checkbox"
                      id={`${key}-${idx}`}
                      value={option}
                      checked={form[key]?.includes(option)}
                      disabled={!editMode}
                      onChange={(e) => {
                        const updated = form[key] || [];
                        const valueIndex = updated.indexOf(option);
                        if (e.target.checked && valueIndex === -1) {
                          updated.push(option);
                        } else if (!e.target.checked && valueIndex !== -1) {
                          updated.splice(valueIndex, 1);
                        }
                        handleChange(index, key, [...updated]);
                      }}
                    />
                    <label htmlFor={`${key}-${idx}`}>{option}</label>
                  </div>
                ))}
              </div>
            ) : (
              <input
                type="text"
                value={form[key] || ""}
                disabled={!editMode}
                onChange={(e) => handleChange(index, key, e.target.value)}
              />
            )}
          </div>
        </li>
      ))}
    </ul>
  </div>
))}

      <div style={{ marginTop: "20px" }}>
    

        {!editMode ? (
          <button className="save-button" onClick={() => setEditMode(true)}>
            Edit
          </button>
        ) : (
          <button className="save-button" onClick={handleSave}>
            Save
          </button>
        )}
      </div>
    </div>
  );
};

export default ProspectFormDetails;
