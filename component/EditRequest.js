import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  getDoc,
  query,
  where,
  Timestamp
} from "firebase/firestore";
import { db } from "../firebaseConfig";
import Headertop from "../component/Header";
import HeaderNav from "../component/HeaderNav";
import "../src/app/styles/user.scss";

const ProfileApprovals = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectReason, setRejectReason] = useState("");
  const [selectedRejectId, setSelectedRejectId] = useState(null);

  /* ---------------- FETCH PENDING REQUESTS ---------------- */

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    const q = query(
      collection(db, "profileChangeRequests"),
      where("status", "==", "PENDING")
    );

    const snap = await getDocs(q);
    setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    setLoading(false);
  };

  /* ---------------- APPLY APPROVAL ---------------- */

  const applyApproval = async (req) => {
    const userRef = doc(db, "usersdetail", req.ujbCode);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      alert("User not found");
      return;
    }

    const userData = userSnap.data();

    // Handle different request types
    switch (req.type) {
      case "BASIC_INFO":
        await updateDoc(userRef, {
          Name: req.newData.name,
          Email: req.newData.email,
          Gender: req.newData.gender,
          DOB: req.newData.dob,
        });
        break;

      case "PROFILE_PHOTO":
        await updateDoc(userRef, {
          ProfilePhotoURL: req.newData,
        });
        break;

      case "SERVICES":
        await updateDoc(userRef, {
          services: req.newData,
        });
        break;

      case "PRODUCTS":
        await updateDoc(userRef, {
          products: req.newData,
        });
        break;

      default:
        alert("Unknown request type");
        return;
    }

    // Update request status
    await updateDoc(doc(db, "profileChangeRequests", req.id), {
      status: "APPROVED",
      reviewedAt: Timestamp.now(),
    });

    // Optional audit log
    await updateDoc(doc(db, "profileAuditLogs", req.id), {
      ...req,
      status: "APPROVED",
      reviewedAt: Timestamp.now(),
    }).catch(() => {});

    fetchRequests();
  };

  /* ---------------- REJECT ---------------- */

  const rejectRequest = async () => {
    if (!rejectReason || !selectedRejectId) return;

    await updateDoc(doc(db, "profileChangeRequests", selectedRejectId), {
      status: "REJECTED",
      rejectReason,
      reviewedAt: Timestamp.now(),
    });

    setRejectReason("");
    setSelectedRejectId(null);
    fetchRequests();
  };

  /* ---------------- UI ---------------- */

  return (
   
    

     <section className='c-form box'>
        <h2 className="page-title">Profile Change Approvals</h2>

        {loading ? (
          <p>Loading requests...</p>
        ) : requests.length === 0 ? (
          <p>No pending approvals 🎉</p>
        ) : (
          <div className="approval-list">
            {requests.map(req => (
              <div key={req.id} className="approval-card">
                <h4>
                  {req.type.replace("_", " ")} — {req.ujbCode}
                </h4>

                <div className="compare-box">
                  <div>
                    <strong>Old Data</strong>
                    <pre>{JSON.stringify(req.oldData, null, 2)}</pre>
                  </div>
                  <div>
                    <strong>New Data</strong>
                    <pre>{JSON.stringify(req.newData, null, 2)}</pre>
                  </div>
                </div>

                <div className="approval-actions">
                  <button
                    className="approve-btn"
                    onClick={() => applyApproval(req)}
                  >
                    Approve
                  </button>

                  <button
                    className="reject-btn"
                    onClick={() => setSelectedRejectId(req.id)}
                  >
                    Reject
                  </button>
                </div>

                {selectedRejectId === req.id && (
                  <div className="reject-box">
                    <textarea
                      placeholder="Reason for rejection"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                    />
                    <button onClick={rejectRequest}>Confirm Reject</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

     
      </section>
 
  );
};

export default ProfileApprovals;
