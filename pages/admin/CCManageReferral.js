import React, { useEffect, useState } from "react";
import { db } from "../../firebaseConfig";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { useRouter } from "next/router";
import "../../src/app/styles/main.scss";
import Layout from "../../component/Layout";

const ManageCCReferral = () => {
  const [referrals, setReferrals] = useState([]);
  const router = useRouter();

  /* ================= FETCH ================= */

  useEffect(() => {
    fetchReferrals();
  }, []);

  const fetchReferrals = async () => {
    const referralSnap = await getDocs(
      collection(db, "ccreferral")
    );

    const data = referralSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    setReferrals(data);
  };

  /* ================= DELETE ================= */

  const handleDelete = async (docId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this CC referral?"
    );
    if (!confirmed) return;

    await deleteDoc(doc(db, "ccreferral", docId));
    fetchReferrals();
  };

  /* ================= EDIT REDIRECT ================= */

  const handleEdit = (id) => {
    router.push(`/ccreferral/${id}`);
  };

  return (
    <Layout>
      <section className="c-userslist box">
        <h2>Manage CC Referrals</h2>

        {referrals.length === 0 ? (
          <p>No CC referrals found.</p>
        ) : (
          <table className="table-class">
            <thead>
              <tr>
                <th>#</th>
                <th>Orbiter</th>
                <th>Cosmo</th>
                <th>Category</th>
                <th>Item</th>
                <th>Points</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {referrals
                .sort(
                  (a, b) =>
                    (b.createdAt?.seconds || 0) -
                    (a.createdAt?.seconds || 0)
                )
                .map((ref, index) => (
                  <tr key={ref.id}>
                    <td>{index + 1}</td>
                    <td>{ref.orbiter?.name || "—"}</td>
                    <td>{ref.cosmo?.name || "—"}</td>

                    <td>
                      {ref.category === "R"
                        ? "Relation"
                        : ref.category === "H"
                        ? "Health"
                        : ref.category === "W"
                        ? "Wealth"
                        : "—"}
                    </td>

                    <td>{ref.itemName || "—"}</td>
                    <td>{ref.pointsRequired || 0}</td>

                    <td>
                      <span
                        className={`status-badge ${
                          ref.status === "Approved"
                            ? "completed"
                            : ref.status === "Rejected"
                            ? "in-review"
                            : "on-hold"
                        }`}
                      >
                        {ref.status}
                      </span>
                    </td>

                    <td>
                      {ref.createdAt?.seconds
                        ? new Date(
                            ref.createdAt.seconds * 1000
                          ).toLocaleString()
                        : "—"}
                    </td>

                    <td>
                      <button
                        className="m-button-7"
                        style={{
                          marginRight: "6px",
                          backgroundColor: "#f16f06",
                          color: "white",
                        }}
                        onClick={() =>
                          handleEdit(ref.id)
                        }
                      >
                        ✏ Edit
                      </button>

                      <button
                        className="m-button-7"
                        style={{
                          backgroundColor: "#FF0000",
                          color: "white",
                        }}
                        onClick={() =>
                          handleDelete(ref.id)
                        }
                      >
                        🗑 Delete
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </section>
    </Layout>
  );
};

export default ManageCCReferral;
