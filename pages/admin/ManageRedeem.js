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

  /* ================= APPROVE ================= */

  const handleApprove = async (id) => {
    const { value: formValues } = await Swal.fire({
      title: "Approve Redemption",
      html:
        `<select id="swal-category" class="swal2-input">
            <option value="">Select Category</option>
            <option value="R">Relation</option>
            <option value="H">Health</option>
            <option value="W">Wealth</option>
        </select>` +
        `<input id="swal-points" class="swal2-input" placeholder="Points Required" type="number">`,
      showCancelButton: true,
      confirmButtonText: "Approve",
      preConfirm: () => {
        const category = document.getElementById("swal-category").value;
        const points = document.getElementById("swal-points").value;

        if (!category || !points) {
          Swal.showValidationMessage("All fields required");
          return false;
        }

        return {
          category,
          points: Number(points),
        };
      },
    });

    if (!formValues) return;

    await updateDoc(doc(db, "ccredemption", id), {
      status: "Approved",
      redemptionCategory: formValues.category,
      pointsRequired: formValues.points,
      updatedAt: new Date(),
    });

    Swal.fire("Approved!", "Redemption updated", "success");
  };

  /* ================= EDIT ================= */

  const handleEdit = async (request) => {
    const { value: formValues } = await Swal.fire({
      title: "Edit Redemption",
      html:
        `<select id="swal-category" class="swal2-input">
            <option value="R" ${
              request.redemptionCategory === "R" ? "selected" : ""
            }>Relation</option>
            <option value="H" ${
              request.redemptionCategory === "H" ? "selected" : ""
            }>Health</option>
            <option value="W" ${
              request.redemptionCategory === "W" ? "selected" : ""
            }>Wealth</option>
        </select>` +
        `<input id="swal-points" class="swal2-input" type="number" value="${
          request.pointsRequired || ""
        }" placeholder="Points Required">`,
      showCancelButton: true,
      confirmButtonText: "Update",
      preConfirm: () => {
        const category = document.getElementById("swal-category").value;
        const points = document.getElementById("swal-points").value;

        if (!category || !points) {
          Swal.showValidationMessage("All fields required");
          return false;
        }

        return {
          category,
          points: Number(points),
        };
      },
    });

    if (!formValues) return;

    await updateDoc(doc(db, "ccredemption", request.id), {
      redemptionCategory: formValues.category,
      pointsRequired: formValues.points,
      updatedAt: new Date(),
    });

    Swal.fire("Updated!", "Changes saved", "success");
  };

  /* ================= REJECT ================= */

  const handleReject = async (id) => {
    const confirm = await Swal.fire({
      title: "Reject Request?",
      icon: "warning",
      showCancelButton: true,
    });

    if (!confirm.isConfirmed) return;

    await updateDoc(doc(db, "ccredemption", id), {
      status: "Rejected",
      updatedAt: new Date(),
    });

    Swal.fire("Rejected", "Request rejected", "success");
  };

  /* ================= FILTER ================= */

  const filteredRequests = ccRequests.filter((r) => {
    const matchesSearch =
      r.cosmo?.Name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      false;

    const matchesStatus =
      filterStatus === "All" || r.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  /* ================= RENDER ================= */

  return (
    <Layout>
      <section className="admin-profile-container">
        <div className="admin-profile-header">
          <h2>CC Redemption Management</h2>
        </div>

        {/* SEARCH + FILTER */}
        <div className="admin-controls">
          <input
            type="text"
            placeholder="Search Cosmo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="All">All</option>
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
                <th>Product</th>
                <th>Category</th>
                <th>Points</th>
                <th>Status</th>
                <th>Actions</th>
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

                  <td>
                    {r.mode === "all"
                      ? "All Products"
                      : r.selectedItem?.name}
                  </td>

                  <td>
                    {r.redemptionCategory === "R" && "Relation"}
                    {r.redemptionCategory === "H" && "Health"}
                    {r.redemptionCategory === "W" && "Wealth"}
                    {!r.redemptionCategory && "-"}
                  </td>

                  <td>{r.pointsRequired || "-"}</td>

                  <td>
                    <span className={`status-badge ${r.status}`}>
                      {r.status}
                    </span>
                  </td>

                  <td className="action-group">
                    {r.status === "Requested" && (
                      <>
                        <button
                          className="btn-success"
                          onClick={() => handleApprove(r.id)}
                        >
                          Approve
                        </button>
                        <button
                          className="btn-danger"
                          onClick={() => handleReject(r.id)}
                        >
                          Reject
                        </button>
                      </>
                    )}

                    {r.status === "Approved" && (
                      <button
                        className="btn-edit"
                        onClick={() => handleEdit(r)}
                      >
                        Edit
                      </button>
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
