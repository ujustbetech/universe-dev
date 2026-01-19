import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  getDoc,setDoc,query,where,serverTimestamp
} from "firebase/firestore";
import { db } from "../firebaseConfig";
import { getAuth } from "firebase/auth";
import { COLLECTIONS } from "/utility_collection";
import "../src/app/styles/main.scss";

const ProspectFormDetails = ({ id }) => {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
const todayISO = new Date().toISOString().split("T")[0];

  useEffect(() => {
    const fetchForms = async () => {
      try {
        const subcollectionRef = collection(db, COLLECTIONS.prospect, id, "prospectform");
        const snapshot = await getDocs(subcollectionRef);

        const auth = getAuth();
        const user = auth.currentUser;

     const prospectDocRef = doc(db, COLLECTIONS.prospect, id);
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
  assessmentDate: todayISO,// You can autofill this too if needed
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
const ensureCpBoardUser = async (orbiter) => {
  if (!orbiter?.ujbcode) return;

  const ref = doc(db, "CPBoard", orbiter.ujbcode);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, {
      id: orbiter.ujbcode,
      name: orbiter.name,
      phoneNumber: orbiter.phone,
      role: orbiter.category || "CosmOrbiter",
      totals: { R: 0, H: 0, W: 0 },
      createdAt: serverTimestamp(),
    });
  }
};
const updateCategoryTotals = async (orbiter, categories, points) => {
  const ref = doc(db, "CPBoard", orbiter.ujbcode);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const totals = snap.data().totals || { R: 0, H: 0, W: 0 };
  const split = Math.floor(points / categories.length);

  const updated = { ...totals };
  categories.forEach((c) => {
    updated[c] = (updated[c] || 0) + split;
  });

  await updateDoc(ref, { totals: updated });
};
const addCpForProspectAssessment = async (orbiter, prospect) => {
  await ensureCpBoardUser(orbiter);

  const activityNo = "002";
  const points = 100;
  const categories = ["R"];

  // prevent duplicate
  const q = query(
    collection(db, "CPBoard", orbiter.ujbcode, "activities"),
    where("activityNo", "==", activityNo),
    where("prospectPhone", "==", prospect.phone)
  );

  const snap = await getDocs(q);
  if (!snap.empty) return;

  await addDoc(
    collection(db, "CPBoard", orbiter.ujbcode, "activities"),
    {
      activityNo,
      activityName: "Prospect Assessment (Tool)",
      points,
      categories,
      prospectName: prospect.name,
      prospectPhone: prospect.phone,
      source: "ProspectFormDetails",
      month: new Date().toLocaleString("default", {
        month: "short",
        year: "numeric",
      }),
      addedAt: serverTimestamp(),
    }
  );

  await updateCategoryTotals(orbiter, categories, points);
};

  const handleChange = (formIndex, field, value) => {
    const updatedForms = [...forms];
    updatedForms[formIndex][field] = value;
    setForms(updatedForms);
  };

const handleSave = async () => {
  try {
    for (const form of forms) {
      const formCopy = { ...form };

      // ===== EDIT MODE (NO CP) =====
      if (form.id) {
        const docRef = doc(
          db,
          COLLECTIONS.prospect,
          id,
          "prospectform",
          form.id
        );
        delete formCopy.id;
        await updateDoc(docRef, formCopy);
      }

      // ===== NEW FORM (ADD CP 002) =====
      else {
        await addDoc(
          collection(db, COLLECTIONS.prospect, id, "prospectform"),
          formCopy
        );

        // 🔹 FETCH PROSPECT
        const prospectSnap = await getDoc(
          doc(db, COLLECTIONS.prospect, id)
        );

        if (!prospectSnap.exists()) continue;
        const p = prospectSnap.data();

  // 🔹 FETCH ORBITER USING DOC ID (UJBCode)
if (!p.orbiterContact) {
  console.error("❌ orbiterContact missing in prospect");
  continue;
}

const qMentor = query(
  collection(db, "usersdetail"),
  where("MobileNo", "==", p.orbiterContact)
);

const mentorSnap = await getDocs(qMentor);

if (mentorSnap.empty) {
  console.error("❌ Mentor not found:", p.orbiterContact);
  continue;
}

const d = mentorSnap.docs[0].data();


const orbiter = {
  ujbcode: d.UJBCode,        // ✅ SOURCE OF TRUTH
  name: d.Name,
  phone: d.MobileNo,
  category: d.Category,
};



        // ⭐ CP ACTIVITY 002 + TOTALS
        await addCpForProspectAssessment(orbiter, {
          name: p.prospectName,
          phone: p.prospectPhone,
        });
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
    {/* SELECT FIELDS */}
    {(key === "howFound" ||
      key === "interestLevel" ||
      key === "informedStatus" ||
      key === "alignmentLevel" ||
      key === "recommendation") ? (
      <select
        value={form[key] || ""}
        disabled={!editMode}
        onChange={(e) => handleChange(index, key, e.target.value)}
      >
        <option value="">Select</option>

        {key === "howFound" &&
          ["Referral", "Networking Event", "Social Media", "Other"].map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}

        {key === "interestLevel" &&
          ["Actively involved", "Some interest", "Unfamiliar but open"].map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}

        {key === "informedStatus" &&
          ["Fully aware", "Partially aware", "Not informed"].map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}

        {key === "alignmentLevel" &&
          ["Not aligned", "Slightly aligned", "Neutral", "Mostly aligned", "Fully aligned"].map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}

        {key === "recommendation" &&
          ["Strongly recommended", "Needs alignment", "Not recommended"].map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
      </select>

    ) : isArray ? (

      /* CHECKBOX GROUP */
      <div className="checkbox-group">
        {(key === "interestAreas"
          ? [
              "Skill Sharing & Collaboration",
              "Business Growth & Referrals",
              "Learning & Personal Development",
              "Community Engagement",
              "Others (please specify)",
            ]
          : [
              "Sharing knowledge and expertise",
              "Providing business or services",
              "Connecting with fellow Orbiters",
              "Active participation in events/meetings",
              "Other (please specify)",
            ]
        ).map((option, idx) => (
          <div key={idx} className="checkbox-item">
            <input
              type="checkbox"
              checked={form[key]?.includes(option)}
              disabled={!editMode}
              onChange={() => {
                const updated = form[key] || [];
                handleChange(
                  index,
                  key,
                  updated.includes(option)
                    ? updated.filter(v => v !== option)
                    : [...updated, option]
                );
              }}
            />
            <label>{option}</label>
          </div>
        ))}
      </div>

    ) : key === "assessmentDate" ? (

      /* 📅 DATE FIELD (ONLY ONCE) */
      <input
        type="date"
        value={form[key] || todayISO}
        max={todayISO}
        disabled={!editMode}
        onChange={(e) => handleChange(index, key, e.target.value)}
      />

    ) : (

      /* NORMAL TEXT INPUT */
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
