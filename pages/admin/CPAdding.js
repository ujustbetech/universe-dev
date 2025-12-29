"use client";

import { useState, useEffect } from "react";
import { db } from "../../firebaseConfig";
import {
  collection,
  getDocs,
  doc,
  addDoc,
  query,
  where,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import Layout from "../../component/Layout";
import "../../src/app/styles/main.scss";

export default function AddActivity() {
  const [cpActivities, setCpActivities] = useState([]);
  const [selectedActivity, setSelectedActivity] = useState(null);

  const [phoneNumber, setPhoneNumber] = useState("");
  const [activityNo, setActivityNo] = useState("");
  const [points, setPoints] = useState("");
  const [activityDescription, setActivityDescription] = useState("");

  const [searchName, setSearchName] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedMemberData, setSelectedMemberData] = useState(null);

  /* ================= FETCH CP ACTIVITIES ================= */
  useEffect(() => {
    const fetchActivities = async () => {
      const snap = await getDocs(
        query(collection(db, "cpactivity"), where("status", "==", "ACTIVE"))
      );

      const list = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      setCpActivities(list);
    };

    fetchActivities();
  }, []);

  /* ================= SEARCH MEMBER ================= */
  const handleSearchChange = async (e) => {
    const value = e.target.value;
    setSearchName(value);

    if (value.length < 2) {
      setSearchResults([]);
      return;
    }

    const snap = await getDocs(collection(db, "usersdetail"));

    const users = snap.docs
      .map((doc) => {
        const d = doc.data();
        const name = d["Name"]?.trim();
        if (!name) return null;

        return {
          id: doc.id,
          name,
          phoneNumber: d["MobileNo"]?.trim(),
          ujbcode: d["UJBCode"],
          role: d["Category"]?.trim() || "CosmOrbiter",
        };
      })
      .filter(Boolean)
      .filter((u) =>
        u.name.toLowerCase().includes(value.toLowerCase())
      );

    setSearchResults(users);
  };

  /* ================= SELECT MEMBER ================= */
  const handleSelectMember = async (member) => {
    if (!member.ujbcode) {
      alert("UJB Code missing");
      return;
    }

    await setDoc(
      doc(db, "CPBoard", member.ujbcode),
      {
        id: member.ujbcode,
        name: member.name,
        phoneNumber: member.phoneNumber,
        role: member.role,
      },
      { merge: true }
    );

    setSelectedMemberData({
      id: member.ujbcode,
      name: member.name,
      phoneNumber: member.phoneNumber,
    });

    setPhoneNumber(member.phoneNumber || "");
    setSearchName(member.name);
    setSearchResults([]);
  };

  /* ================= SELECT ACTIVITY ================= */
  const handleActivityChange = (e) => {
    const id = e.target.value;
    const activity = cpActivities.find((a) => a.id === id);

    if (!activity) return;

    setSelectedActivity(activity);
    setActivityNo(activity.activityNo || activity.id);
    setPoints(activity.points || 0);
    setActivityDescription(activity.purpose || ""); // ✅ AUTO
  };

  /* ================= SUBMIT ================= */
const handleSubmit = async (e) => {
  e.preventDefault();

  if (!selectedMemberData || !selectedActivity) {
    return alert("Please select member and activity");
  }

  const activitiesRef = collection(
    db,
    "CPBoard",                    // ✅ FIXED
    selectedMemberData.id,        // UJB CODE
    "activities"
  );

  await addDoc(activitiesRef, {
    activityNo: selectedActivity.activityNo || selectedActivity.id,
    activityName: selectedActivity.activityName,
    points: selectedActivity.points,
    purpose: selectedActivity.purpose || "",
    activityDescription: selectedActivity.purpose || "",
    name: selectedMemberData.name,
    phoneNumber: selectedMemberData.phoneNumber,
    month: new Date().toLocaleString("default", {
      month: "short",
      year: "numeric",
    }),
    addedAt: serverTimestamp(),
  });

  alert("Activity added successfully");

  setSelectedActivity(null);
  setActivityNo("");
  setPoints("");
  setActivityDescription("");
};


  return (
    <Layout>
      <section className="c-form box">
        <h2>Add Activity</h2>

        <form onSubmit={handleSubmit}>
          <ul>
            <li className="form-row">
              <h4>Search Member</h4>
              <div className="autosuggest">
                <input
                  type="text"
                  value={searchName}
                  onChange={handleSearchChange}
                  placeholder="Type member name"
                />
                {searchResults.length > 0 && (
                  <ul className="dropdown">
                    {searchResults.map((u) => (
                      <li key={u.id} onClick={() => handleSelectMember(u)}>
                        {u.name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </li>

            <li className="form-row">
              <h4>Phone Number</h4>
              <div className="multipleitem">
                <input type="text" value={phoneNumber} readOnly />
              </div>
            </li>

            <li className="form-row">
              <h4>Select Activity</h4>
              <div className="multipleitem">
                <select
                  value={selectedActivity?.id || ""}
                  onChange={handleActivityChange}
                >
                  <option value="">Select Activity</option>
                  {cpActivities.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.activityName}
                    </option>
                  ))}
                </select>
              </div>
            </li>

            <li className="form-row">
              <h4>Activity No</h4>
              <div className="multipleitem">
                <input type="text" value={activityNo} readOnly />
              </div>
            </li>

            <li className="form-row">
              <h4>Points</h4>
              <div className="multipleitem">
                <input type="text" value={points} readOnly />
              </div>
            </li>

            <li className="form-row">
              <h4>Activity Description</h4>
              <div className="multipleitem">
                <input type="text" value={activityDescription} readOnly />
              </div>
            </li>

            <li className="form-row">
              <button className="submitbtn" type="submit">
                Add Activity
              </button>
            </li>
          </ul>
        </form>
      </section>
    </Layout>
  );
}
