/* Admin Activity Master – Plain CSS Version */

import React, { useEffect, useState } from "react";
import { db } from "../../../firebaseConfig";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import "../../../src/app/styles/main.scss";

// Admin Activity Master – Predefined Activity/Sub-Activity with Auto Points

// 🔐 MASTER CONFIG (Preloaded + Admin Extendable)
// Admin CAN add new activities here via UI (stored in Firestore)

const DEFAULT_ACTIVITY_MASTER = {
  "Prospecting & Enrollment": {
    "Prospect Identification": { category: "R", points: 50 },
    "Prospect Assessment (Tool)": { category: "R", points: 100 },
    "Doorstep Invitation": { category: "R", points: 25 },
    "Hosting Doorstep (Offline)": { category: "R", points: 100 }
  },
  "Enrollment & OTC": {
    "Enrollment Initiation": { category: "R", points: 100 },
    "Enrollment Completion": { category: "R", points: 50 },
    "OTC Completion Day 15": { category: "R", points: 75 }
  },
  "Referrals & Business": {
    "Self Referral Closure": { category: "R+W", points: 150 },
    "Prospect Referral Closure": { category: "R+W", points: 200 },
    "Referral Deal > 50k": { category: "R+W", points: 300 }
  },
  "Events & Content": {
    "Event Host (Online)": { category: "R", points: 50 },
    "Event Host (Offline)": { category: "R", points: 75 },
    "Content Video Online": { category: "R", points: 100 }
  },
  "Health": {
    "Define Health Event": { category: "H", points: 75 },
    "Conduct Health Event": { category: "H", points: 100 }
  }
};

export default function ActivityMaster() {
  const [activities, setActivities] = useState([]);
  const [form, setForm] = useState({
    name: "",
    subActivity: "",
    category: "R",
    points: "",
    mode: "Online",
    approvalRequired: true,
    active: true,
  });

  const fetchActivities = async () => {
    const snap = await getDocs(collection(db, "activityMaster"));
    const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    setActivities(rows);
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  const addActivity = async () => {
    // Validate only dropdown selections
    if (!form.activityGroup || !form.subActivity) {
      alert("Please select Activity and Sub-Activity");
      return;
    }

    await addDoc(collection(db, "activityDefinitions"), {
      activityGroup: form.activityGroup,
      subActivity: form.subActivity,
      category: form.category,
      points: Number(form.points),
      active: true,
      systemDefined: true,
      createdAt: serverTimestamp(),
    });

    setForm({
      activityGroup: "",
      subActivity: "",
      category: "",
      points: "",
    });

    fetchActivities();
  };

  const toggleActive = async (id, current) => {
    await updateDoc(doc(db, "activityMaster", id), { active: !current });
    fetchActivities();
  };

  return (
    <div className="admin-wrapper">
      <h2 className="admin-title">Activity & Points Master</h2>

      {/* PREDEFINED ACTIVITIES VIEW */}
      <h3 className="section-title">Predefined Activities & Points</h3>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Activity Group</th>
            <th>Sub-Activity</th>
            <th>Category</th>
            <th>Points</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {activities.map((a) => (
            <tr key={a.id}>
              <td>{a.activityGroup}</td>
              <td>{a.subActivity}</td>
              <td>{a.category}</td>
              <td>{a.points}</td>
              <td>{a.active ? "Active" : "Inactive"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 className="section-title">Add New Activity</h3>

      <div className="form-card">
        <select
          value={form.activityGroup || ""}
          onChange={(e) => {
            setForm({ ...form, activityGroup: e.target.value, subActivity: "" });
          }}
        >
          <option value="">Select Activity Group</option>
          {Object.keys(DEFAULT_ACTIVITY_MASTER).map((group) => (
            <option key={group} value={group}>{group}</option>
          ))}
        </select>

        <select
          value={form.subActivity || ""}
          onChange={(e) => {
            const sub = e.target.value;
            const meta = DEFAULT_ACTIVITY_MASTER[form.activityGroup][sub];
            setForm({
              ...form,
              subActivity: sub,
              category: meta.category,
              points: meta.points,
            });
          }}
          disabled={!form.activityGroup}
        >
          <option value="">Select Sub-Activity</option>
          {form.activityGroup &&
            Object.keys(DEFAULT_ACTIVITY_MASTER[form.activityGroup]).map((sub) => (
              <option key={sub} value={sub}>{sub}</option>
            ))}
        </select>

        <input value={form.category} disabled />
        <input value={form.points} disabled />

        <button onClick={addActivity}>Save to Database</button>
      </div>
    </div>
  );
}
