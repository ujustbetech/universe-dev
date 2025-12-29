"use client";

import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  addDoc,setDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  where,
} from "firebase/firestore";
import Layout from "../../component/Layout";

import "../../src/app/styles/main.scss";

import { db } from "../../firebaseConfig";

export default function CPActivityManage() {
  /* ================= STATE ================= */
  const [activities, setActivities] = useState([]);
  const [showForm, setShowForm] = useState(false);

  const [activeTab, setActiveTab] = useState("ALL");
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("name");

  const emptyForm = {
    activityName: "",
    category: "R",
    points: "",
    purpose: "",
    automationType: "AUTO",
    status: "ACTIVE",
  };

  const [form, setForm] = useState(emptyForm);

  /* ================= FETCH ACTIVITIES + USAGE ================= */
  const fetchActivities = async () => {
    const snap = await getDocs(collection(db, "cpactivity"));

    const list = await Promise.all(
      snap.docs.map(async (d) => {
        const usageQ = query(
          collection(db, "user_activity_log"),
          where("activityId", "==", d.id)
        );
        const usageSnap = await getDocs(usageQ);

        return {
          id: d.id,
          usageCount: usageSnap.size,
          ...d.data(),
        };
      })
    );

    setActivities(list);
  };

  useEffect(() => {
    fetchActivities();
  }, []);
const saveActivity = async () => {
  if (!form.activityName || !form.points) {
    alert("Activity name and points are required");
    return;
  }

  const payload = {
    activityName: form.activityName.trim(),
    category: form.category,
    points: Number(form.points),
    purpose: form.purpose.trim(),
    automationType: form.automationType,
    status: form.status,
    updatedAt: serverTimestamp(),
  };

  if (editingId) {
    // EDIT existing
    await updateDoc(doc(db, "cpactivity", editingId), payload);
  } else {
    // ADD new with incremental ID
    const nextId = await getNextActivityId();

    await setDoc(doc(db, "cpactivity", nextId), {
      ...payload,
      activityNo: nextId,
      createdAt: serverTimestamp(),
    });
  }

 setForm(emptyForm);
setEditingId(null);
setShowForm(false); // 🔑 close form
fetchActivities();
};

  /* ================= SAVE (ADD / UPDATE) ================= */
const getNextActivityId = async () => {
  const snap = await getDocs(collection(db, "cpactivity"));

  let maxId = 0;

  snap.docs.forEach((d) => {
    if (/^\d+$/.test(d.id)) {
      maxId = Math.max(maxId, Number(d.id));
    }
  });

  return String(maxId + 1).padStart(3, "0");
};

const editActivity = (a) => {
  setEditingId(a.id);
  setForm({
    activityName: a.activityName,
    category: a.category,
    points: a.points,
    purpose: a.purpose || "",
    automationType: a.automationType,
    status: a.status || "ACTIVE",
  });
  setShowForm(true); // 🔑 open form
};

  /* ================= EDIT ================= */

  /* ================= ACTIVATE / DEACTIVATE ================= */
  const toggleStatus = async (a) => {
    await updateDoc(doc(db, "cpactivity", a.id), {
      status: a.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
      updatedAt: serverTimestamp(),
    });
    fetchActivities();
  };

  /* ================= DELETE (SAFE) ================= */
  const deleteActivity = async (a) => {
    if (a.usageCount > 0) {
      alert("❌ Cannot delete. Activity already used.");
      return;
    }

    if (!confirm("Are you sure you want to delete this activity?")) return;

    await deleteDoc(doc(db, "cpactivity", a.id));
    fetchActivities();
  };

  /* ================= SEARCH + SORT + FILTER ================= */
  const filtered = activities
    .filter((a) => {
      if (activeTab !== "ALL" && a.automationType !== activeTab) return false;
      if (
        search &&
        !a.activityName.toLowerCase().includes(search.toLowerCase())
      )
        return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "points") return b.points - a.points;
      if (sortBy === "usage") return b.usageCount - a.usageCount;
      return a.activityName.localeCompare(b.activityName);
    });

  /* ================= UI ================= */
 return (
  <Layout>
    {/* ================= CP ACTIVITY LIST ================= */}
    <section className="c-userslist box">
      <h2>CP Activity Management</h2>

      {/* ===== TABS ===== */}
      <div className="tabs">
        {["ALL", "AUTO", "SEMI", "MANUAL"].map((t) => (
          <button
            key={t}
            className={activeTab === t ? "active" : ""}
            onClick={() => setActiveTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
<div className="actions-bar">
  <button
    className="m-button"
    onClick={() => {
      setForm(emptyForm);
      setEditingId(null);
      setShowForm(true);
    }}
  >
    + Add Activity
  </button>
</div>

      {/* ===== SEARCH & SORT ===== */}
      <div className="multipleitem">
        <input
          type="text"
          placeholder="Search activity"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="name">Sort by Name</option>
          <option value="points">Sort by Points</option>
          <option value="usage">Sort by Usage</option>
        </select>
      </div>
 {showForm && (
  <section className="c-form box">

      <h2>{editingId ? "Edit Activity" : "Add Activity"}</h2>

      <ul>
        <li className="form-row">
          <h4>Activity Name<sup>*</sup></h4>
          <div className="multipleitem">
            <input
              type="text"
              value={form.activityName}
              onChange={(e) =>
                setForm({ ...form, activityName: e.target.value })
              }
            />
          </div>
        </li>

        <li className="form-row">
          <h4>Category<sup>*</sup></h4>
          <div className="multipleitem">
            <select
              value={form.category}
              onChange={(e) =>
                setForm({ ...form, category: e.target.value })
              }
            >
              <option value="R">Relationship</option>
              <option value="W">Wealth</option>
              <option value="H">Health</option>
            </select>
          </div>
        </li>

        <li className="form-row">
          <h4>Points<sup>*</sup></h4>
          <div className="multipleitem">
            <input
              type="number"
              value={form.points}
              onChange={(e) =>
                setForm({ ...form, points: e.target.value })
              }
            />
          </div>
        </li>

        <li className="form-row">
          <h4>Automation Type<sup>*</sup></h4>
          <div className="multipleitem">
            <select
              value={form.automationType}
              onChange={(e) =>
                setForm({ ...form, automationType: e.target.value })
              }
            >
              <option value="AUTO">Auto</option>
              <option value="SEMI">Semi-Auto</option>
              <option value="MANUAL">Manual</option>
            </select>
          </div>
        </li>

        <li className="form-row">
          <h4>Status</h4>
          <div className="multipleitem">
            <select
              value={form.status}
              onChange={(e) =>
                setForm({ ...form, status: e.target.value })
              }
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </li>

        <li className="form-row">
          <h4>Purpose</h4>
          <div className="multipleitem">
            <textarea
              value={form.purpose}
              onChange={(e) =>
                setForm({ ...form, purpose: e.target.value })
              }
            />
          </div>
        </li>

        <li className="form-row">
          <button className="submitbtn" onClick={saveActivity}>
            {editingId ? "Update Activity" : "Add Activity"}
          </button>
        </li>
      </ul>
     </section>
)}

      {/* ===== TABLE ===== */}
      <table className="table-class">
        <thead>
          <tr>
            <th>#</th>
            <th>Activity</th>
            <th>Cat</th>
            <th>Points</th>
            <th>Automation</th>
            <th>Status</th>
            <th>Usage</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((a, i) => (
            <tr key={a.id} className={a.status === "INACTIVE" ? "inactive" : ""}>
              <td>{i + 1}</td>
              <td>{a.activityName}</td>
              <td>{a.category}</td>
              <td>{a.points}</td>
              <td>{a.automationType}</td>
              <td>{a.status}</td>
              <td>{a.usageCount}</td>
            <td>
  <button
    className="btn-edit"
    onClick={() => editActivity(a)}
  >
    Edit
  </button>

  <button
    className={`btn-status ${
      a.status === "ACTIVE" ? "btn-deactivate" : "btn-activate"
    }`}
    onClick={() => toggleStatus(a)}
  >
    {a.status === "ACTIVE" ? "Deactivate" : "Activate"}
  </button>

  <button
    className="btn-delete"
    onClick={() => deleteActivity(a)}
  >
    Delete
  </button>
</td>

            </tr>
          ))}
        </tbody>
      </table>
    </section>

    {/* ================= ADD / EDIT FORM ================= */}


  </Layout>
);

}
