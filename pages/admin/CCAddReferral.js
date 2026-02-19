"use client";

import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  addDoc,
  doc,
  getDoc,
  query,
  orderBy,
  limit,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";
import Layout from "../../component/Layout";
import { COLLECTIONS } from "/utility_collection";
import "../../src/app/styles/main.scss";

const Profiling = () => {
  const [users, setUsers] = useState([]);

  const [selectedOrbiter, setSelectedOrbiter] = useState(null);
  const [selectedCosmo, setSelectedCosmo] = useState(null);

  const [selectedService, setSelectedService] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [leadDescription, setLeadDescription] = useState("");

  /* ================= MODULE TYPE ================= */
  const [referralModule, setReferralModule] = useState("Normal");

  /* ================= CC FIELDS ================= */
  const [ccCategory, setCcCategory] = useState("R");
  const [pointsRequired, setPointsRequired] = useState("");
  const [autoDeduct, setAutoDeduct] = useState(false);

  /* ================= LOAD USERS ================= */
  useEffect(() => {
    const fetchUsers = async () => {
      const snapshot = await getDocs(
        collection(db, COLLECTIONS.userDetail)
      );
      setUsers(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
      );
    };
    fetchUsers();
  }, []);

  /* ===================================================== */
  /* =============== CC REFERRAL ID GENERATOR ============ */
  /* ===================================================== */

  const generateCCReferralId = async () => {
    const now = new Date();
    const year1 = now.getFullYear() % 100;
    const year2 = (now.getFullYear() + 1) % 100;

    const prefix = `CCRef/${year1}-${year2}/`;

    const q = query(
      collection(db, "ccreferral"),
      orderBy("referralId", "desc"),
      limit(1)
    );

    const snapshot = await getDocs(q);

    let lastNum = 0;

    if (!snapshot.empty) {
      const lastId = snapshot.docs[0].data().referralId;
      const match = lastId?.match(/\/(\d{4})$/);
      if (match) lastNum = parseInt(match[1], 10);
    }

    return `${prefix}${String(lastNum + 1).padStart(4, "0")}`;
  };

  /* ===================================================== */
  /* ================= AUTO DEDUCT LOGIC ================= */
  /* ===================================================== */

  const deductCP = async (orbiter, category, points) => {
    if (!orbiter?.UJBCode) return;

    await addDoc(
      collection(db, "CPBoard", orbiter.UJBCode, "activities"),
      {
        activityName: "CC Deal Redemption",
        purpose: "Admin created CC referral",
        points: -Number(points),
        categories: [category],
        addedAt: serverTimestamp(),
      }
    );
  };

  /* ===================================================== */
  /* ================= SUBMIT ============================ */
  /* ===================================================== */

  const handleSubmit = async () => {
    if (!selectedOrbiter || !selectedCosmo) {
      alert("Select Orbiter and Cosmo");
      return;
    }

    try {
      /* ================= CC MODULE ================= */

      if (referralModule === "CC") {
        if (!pointsRequired) {
          alert("Enter Points Required");
          return;
        }

        const referralId = await generateCCReferralId();

        const ccData = {
          referralId,
          referralType: "CC",
          referralSource: "Admin",

          createdAt: serverTimestamp(),
          status: "Pending",

          category: ccCategory,
          pointsRequired: Number(pointsRequired),

          orbiter: {
            name: selectedOrbiter.Name,
            phone: selectedOrbiter.MobileNo,
            email: selectedOrbiter.Email,
            ujbCode: selectedOrbiter.UJBCode,
          },

          cosmo: {
            name: selectedCosmo.Name,
            phone: selectedCosmo.MobileNo,
            email: selectedCosmo.Email,
            ujbCode: selectedCosmo.UJBCode,
          },

          itemType: selectedService ? "service" : "product",
          itemName:
            selectedService?.name ||
            selectedProduct?.name ||
            null,

          itemDescription:
            selectedService?.description ||
            selectedProduct?.description ||
            null,

          leadDescription: leadDescription || null,
        };

        await addDoc(collection(db, "ccreferral"), ccData);

        /* ===== AUTO DEDUCT ===== */
        if (autoDeduct) {
          await deductCP(
            selectedOrbiter,
            ccCategory,
            pointsRequired
          );
        }

        alert("CC Referral Created Successfully!");
        return;
      }

      /* ================= NORMAL REFERRAL ================= */

      const data = {
        referralType: "Normal",
        createdAt: serverTimestamp(),
        orbiter: selectedOrbiter,
        cosmo: selectedCosmo,
        service: selectedService || null,
        product: selectedProduct || null,
        leadDescription,
      };

      await addDoc(collection(db, COLLECTIONS.referral), data);

      alert("Normal Referral Submitted Successfully!");
    } catch (error) {
      console.error(error);
      alert("Error submitting referral");
    }
  };

  /* ===================================================== */
  /* ================= UI ================================ */
  /* ===================================================== */

  return (
    <Layout>
      <section className="admin-profile-container">
        <h2>Add Referral</h2>

        {/* MODULE SELECT */}
        <div className="form-group">
          <label>Referral Module</label>
          <select
            value={referralModule}
            onChange={(e) =>
              setReferralModule(e.target.value)
            }
          >
            <option value="Normal">Normal</option>
            <option value="CC">CC Referral</option>
          </select>
        </div>

        {/* CC EXTRA FIELDS */}
        {referralModule === "CC" && (
          <>
            <div className="form-group">
              <label>Category</label>
              <select
                value={ccCategory}
                onChange={(e) =>
                  setCcCategory(e.target.value)
                }
              >
                <option value="R">Relation</option>
                <option value="H">Health</option>
                <option value="W">Wealth</option>
              </select>
            </div>

            <div className="form-group">
              <label>Points Required</label>
              <input
                type="number"
                value={pointsRequired}
                onChange={(e) =>
                  setPointsRequired(e.target.value)
                }
              />
            </div>

            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={autoDeduct}
                  onChange={() =>
                    setAutoDeduct(!autoDeduct)
                  }
                />
                Auto Deduct CP
              </label>
            </div>
          </>
        )}

        <button className="btn-submit" onClick={handleSubmit}>
          Submit Referral
        </button>
      </section>
    </Layout>
  );
};

export default Profiling;
