"use client";

import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  query,
  orderBy
} from "firebase/firestore";
import { db } from "../../firebaseConfig";
import Layout from "../../component/Layout";
import "../../src/app/styles/main.scss";

const RedemptionRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // ================= LOAD REQUESTS =================
  const fetchRequests = async () => {
    setLoading(true);

    const q = query(
      collection(db, "redeemption"),
      orderBy("createdAt", "desc")
    );

    const snap = await getDocs(q);
    setRequests(
      snap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data()
      }))
    );

    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  // ================= UPDATE STATUS =================
  const updateStatus = async (id, status) => {
    await updateDoc(doc(db, "redeemption", id), {
      status,
      updatedAt: new Date()
    });

    fetchRequests();
  };

  // ================= FILTERS =================
  const requested = requests.filter(r => r.status === "Requested");
  const approved = requests.filter(r => r.status === "Approved");
  const rejected = requests.filter(r => r.status === "Rejected");

  // ================= RENDER TABLE =================
  const renderTable = (data, showActions = false) => (
    <table className="admin-table">
      <thead>
        <tr>
          <th>Cosmo</th>
          <th>Item</th>
          <th>Type</th>
          <th>%</th>
          <th>Amount</th>
          <th>Status</th>
          {showActions && <th>Action</th>}
        </tr>
      </thead>
      <tbody>
        {data.map((r) => (
          <tr key={r.id}>
            <td>{r.cosmo?.name}</td>
            <td>{r.item?.name}</td>
            <td>{r.itemType}</td>
            <td>{r.redeemPercentage}%</td>
            <td>₹{r.redeemAmount}</td>
            <td>{r.status}</td>

            {showActions && (
              <td>
                <button
                  className="btn-submit"
                  onClick={() => updateStatus(r.id, "Approved")}
                >
                  Approve
                </button>
                <button
                  className="btn-back"
                  style={{ marginLeft: "8px" }}
                  onClick={() => updateStatus(r.id, "Rejected")}
                >
                  Reject
                </button>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );

  // ================= RENDER =================
  return (
    <Layout>
      <section className="admin-profile-container">
        <div className="admin-profile-header">
          <h2>Redemption Requests</h2>
          <button className="btn-back" onClick={() => window.history.back()}>
            Back
          </button>
        </div>

        {loading && <p>Loading...</p>}

        {/* REQUESTED */}
        <h3 style={{ marginTop: "20px" }}>Requested</h3>
        {requested.length > 0
          ? renderTable(requested, true)
          : <p>No pending requests</p>}

        {/* APPROVED */}
        <h3 style={{ marginTop: "30px" }}>Approved</h3>
        {approved.length > 0
          ? renderTable(approved)
          : <p>No approved requests</p>}

        {/* REJECTED */}
        <h3 style={{ marginTop: "30px" }}>Rejected</h3>
        {rejected.length > 0
          ? renderTable(rejected)
          : <p>No rejected requests</p>}
      </section>
    </Layout>
  );
};

export default RedemptionRequests;
