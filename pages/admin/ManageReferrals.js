import React, { useEffect, useState } from "react";
import { db } from "../../firebaseConfig";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { useRouter } from "next/router";
import "../../src/app/styles/main.scss";
import Layout from "../../component/Layout";
import ReferralExportButton from "./ExportReferral";


const ManageReferrals = () => {
  const [referrals, setReferrals] = useState([]);
const router = useRouter();

const handleEdit = (referralId) => {
  router.push(`/referral/${referralId}`);
};


  useEffect(() => {
    const fetchReferrals = async () => {
      try {
        const referralSnap = await getDocs(collection(db, "Referral"));
        const data = referralSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setReferrals(data);
      } catch (error) {
        console.error("Failed to fetch referrals:", error);
      }
    };

    fetchReferrals();
  }, []);

  const handleDelete = async (docId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this referral?"
    );
    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, "Referral", docId));
      alert("Referral deleted successfully.");
      setReferrals((prev) => prev.filter((ref) => ref.id !== docId));
    } catch (error) {
      console.error("Error deleting referral:", error);
      alert("Failed to delete referral.");
    }
  };



  return (
    <Layout>
   <section className="c-userslist box">
  <h2>Manage Referrals</h2>
<ReferralExportButton/>
  {referrals.length === 0 ? (
    <p>No referrals found.</p>
  ) : (
    <table className="table-class">
     <thead>
  <tr>
    <th>#</th>
    <th>Orbiter Name</th>
    <th>CosmoOrbiter Name</th>
  
    <th>Referral Type</th>

    <th>Referral ID</th>
    <th>Service/Product Name</th>
  
    <th>Updated Date</th>
    <th>Actions</th>
  </tr>
</thead>
<tbody>
  {referrals
    .sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0))
    .map((referral, index) => (
      <tr key={referral.id}>
        <td>{index + 1}</td>
        <td>{referral.orbiter?.name || "—"}</td>
        <td>{referral.cosmoOrbiter?.name || "—"}</td>
        <td>{referral.referralType}</td>
        <td>{referral.referralId || "—"}</td>

        {/* Service/Product Name */}
        <td>
          {referral.service?.name
            ? referral.product?.name
              ? `${referral.service.name} / ${referral.product.name}`
              : referral.service.name
            : referral.product?.name || "—"}
        </td>

        {/* Timestamp */}
        <td>
          {referral.timestamp?.seconds
            ? new Date(referral.timestamp.seconds * 1000).toLocaleString()
            : "—"}
        </td>

        {/* Actions */}
        <td>
          <div className="twobtn">
            <button
              className="m-button-7"
              style={{
                marginRight: "10px",
                backgroundColor: "#f16f06",
                color: "white",
              }}
              onClick={() => handleEdit(referral.id)}
            >
              ✎ Edit
            </button>
            <button
              className="m-button-7"
              style={{ backgroundColor: "#FF0000", color: "white" }}
              onClick={() => handleDelete(referral.id)}
            >
              🗑 Delete
            </button>
          </div>
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

export default ManageReferrals;
