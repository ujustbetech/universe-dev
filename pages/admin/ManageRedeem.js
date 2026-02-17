"use client";

import React, { useEffect, useState } from "react";
import {
  collection,
  updateDoc,
  doc,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";
import Layout from "../../component/Layout";
import Swal from "sweetalert2";
import "../../src/app/styles/main.scss";

const RedemptionRequests = () => {
  const [ccRequests, setCcRequests] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");

  /* ================= REALTIME FETCH ================= */

  useEffect(() => {
    const q = query(
      collection(db, "ccredemption"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      setCcRequests(
        snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
      );
    });

    return () => unsubscribe();
  }, []);

  /* ================= UPDATE STATUS ================= */

  const updateStatus = async (id, status) => {
    const confirm = await Swal.fire({
      title: `Confirm ${status}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes",
    });

    if (!confirm.isConfirmed) return;

    await updateDoc(doc(db, "ccredemption", id), {
      status,
      updatedAt: new Date(),
    });

    Swal.fire("Updated", `Marked as ${status}`, "success");
  };

  /* ================= STATUS BADGE ================= */

  const getStatusClass = (status) => {
    if (status === "Approved") return "completed";
    if (status === "Rejected") return "in-review";
    return "on-hold";
  };

  /* ================= FILTER LOGIC ================= */

  const filteredRequests = ccRequests.filter((r) => {
    const matchesSearch =
      r.cosmo?.Name?.toLowerCase().includes(
        searchTerm.toLowerCase()
      ) || false;

    const matchesStatus =
      filterStatus === "All" ||
      r.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  /* ================= RENDER ================= */

  return (
    <Layout>
      <section className="admin-profile-container">
        <div className="admin-profile-header">
          <h2>CC Redemption Management</h2>
          <button className="btn-back" onClick={() => window.history.back()}>
            Back
          </button>
        </div>

        {/* SEARCH + FILTER */}
        <div style={{ display: "flex", gap: "15px", marginBottom: "20px" }}>
          <input
            type="text"
            placeholder="Search by Cosmo Name"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ padding: "8px", width: "250px" }}
          />

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ padding: "8px" }}
          >
            <option value="All">All Status</option>
            <option value="Requested">Requested</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>

        {/* TABLE */}
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Cosmo</th>
                <th>Mode</th>
                <th>Product</th>
                <th>Offer</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredRequests.length === 0 && (
                <tr>
                  <td colSpan="6">No Requests Found</td>
                </tr>
              )}

              {filteredRequests.map((r) => (
                <tr key={r.id}>
                  <td>{r.cosmo?.Name}</td>

                  <td>{r.mode}</td>

                  <td>
                    {r.mode === "all"
                      ? "All Products"
                      : r.selectedItem?.name}
                  </td>

                  <td>
                    {r.offerType === "percent" &&
                      `${r.discountValue}% Discount`}
                    {r.offerType === "rs" &&
                      `₹${r.discountValue} Discount`}
                    {r.offerType === "bogo" &&
                      "Buy 1 Get 1"}
                    {r.offerType === "other" &&
                      r.customText}
                  </td>

                  <td>
                    <span className={`status-badge ${getStatusClass(r.status)}`}>
                      {r.status}
                    </span>
                  </td>

                  <td>
                    {r.status === "Requested" && (
                      <>
                        <button
                          className="btn-submit"
                          onClick={() =>
                            updateStatus(r.id, "Approved")
                          }
                        >
                          Approve
                        </button>

                        <button
                          className="btn-back"
                          style={{ marginLeft: "6px" }}
                          onClick={() =>
                            updateStatus(r.id, "Rejected")
                          }
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </Layout>
  );
};

export default RedemptionRequests;
