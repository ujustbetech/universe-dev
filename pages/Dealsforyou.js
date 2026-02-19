"use client";

import { useEffect, useState } from "react";
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  getDocs,
  addDoc,
} from "firebase/firestore";
import { app } from "../firebaseConfig";
import Headertop from "../component/Header";
import HeaderNav from "../component/HeaderNav";
import "../src/app/styles/user.scss";
import toast from "react-hot-toast";
import { COLLECTIONS } from "/utility_collection";

const db = getFirestore(app);

const DealsForYou = () => {
  const [deals, setDeals] = useState([]);
  const [activeTab, setActiveTab] = useState("R");
  const [orbiterDetails, setOrbiterDetails] = useState(null);
  const [balances, setBalances] = useState({ R: 0, H: 0, W: 0 });

  const [selectedDeal, setSelectedDeal] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [leadDescription, setLeadDescription] = useState("");

  /* ================= LOAD USER + BALANCE ================= */

  useEffect(() => {
    const stored = localStorage.getItem("mmUJBCode");
    if (!stored) return;

    const fetchUser = async () => {
      const snap = await getDoc(doc(db, COLLECTIONS.userDetail, stored));
      if (!snap.exists()) return;

      const data = snap.data();

      setOrbiterDetails({
        name: data.Name,
        phone: data.MobileNo,
        email: data.Email,
        ujbCode: data.UJBCode,
      });

      const actSnap = await getDocs(
        collection(db, "CPBoard", stored, "activities")
      );

      let R = 0,
        H = 0,
        W = 0;

      actSnap.forEach((doc) => {
        const d = doc.data();
        const pts = Number(d.points || 0);

        if (d.categories?.includes("R")) R += pts;
        if (d.categories?.includes("H")) H += pts;
        if (d.categories?.includes("W")) W += pts;
      });

      setBalances({ R, H, W });
    };

    fetchUser();
  }, []);

  /* ================= FETCH DEALS ================= */

  useEffect(() => {
    const fetchDeals = async () => {
      const snapshot = await getDocs(collection(db, "ccredemption"));
      const approved = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((d) => d.status === "Approved");

      setDeals(approved);
    };

    fetchDeals();
  }, []);

  /* ================= PASS REFERRAL ================= */

 const handlePassReferral = async () => {
  if (!selectedDeal) {
    toast.error("No deal selected");
    return;
  }

  if (!orbiterDetails) {
    toast.error("User not loaded");
    return;
  }

  if (!leadDescription.trim()) {
    toast.error("Enter lead description");
    return;
  }

  const category = selectedDeal.redemptionCategory;
  const required = Number(selectedDeal.pointsRequired || 0);
  const currentBalance = balances[category] || 0;

  if (currentBalance < required) {
    toast.error(
      `You need ${required - currentBalance} more points`
    );
    return;
  }

  try {
    /* ================= SAVE REFERRAL FIRST ================= */

  const referralData = {
  referralSource: "CCDeal",
  referralType: "CC",
  status: "Pending",
  createdAt: new Date(),

  category,
  pointsRequired: required,

  orbiter: orbiterDetails,
  cosmo: selectedDeal.cosmo || null,

  itemType: selectedDeal.mode || null,
  itemName: selectedDeal.selectedItem?.name || null,
  itemDescription: selectedDeal.selectedItem?.description || null,
  itemImage: selectedDeal.selectedItem?.imageURL || null,

  offerType: selectedDeal.offerType || null,
  discountValue: selectedDeal.discountValue || null,
  customText: selectedDeal.customText || null,

  leadDescription: leadDescription || null,
};

await addDoc(collection(db, "ccreferral"), referralData);


    await addDoc(collection(db, "ccreferral"), referralData);

    /* ================= DEDUCT CP POINTS ================= */

    await addDoc(
      collection(
        db,
        "CPBoard",
        orbiterDetails.ujbCode,
        "activities"
      ),
      {
        activityName: "Deal Redemption",
        purpose: `Redeemed for ${selectedDeal.selectedItem?.name}`,
        points: -required,
        categories: [category],
        addedAt: new Date(),
      }
    );

    /* ================= UPDATE UI ================= */

    setBalances((prev) => ({
      ...prev,
      [category]: prev[category] - required,
    }));

    toast.success("Referral Sent & Points Deducted");

    setModalOpen(false);
    setLeadDescription("");
    setSelectedDeal(null);

  } catch (err) {
    console.error("Referral Error:", err);
    toast.error("Something went wrong");
  }
};


  const filteredDeals = deals.filter(
    (d) => d.redemptionCategory === activeTab
  );

  return (
    <main className="pageContainer">
      <Headertop />

      <section className="HomepageMain">
        <div className="container pageHeading">
          <h1>🔥 Deals For You</h1>

          <div className="balance-bar">
            <span>❤️ Relation: {balances.R}</span>
            <span>💚 Health: {balances.H}</span>
            <span>💰 Wealth: {balances.W}</span>
          </div>
        </div>

        {/* CATEGORY TABS */}
        <div className="category-tabs">
          {["R", "H", "W"].map((c) => (
            <button
              key={c}
              className={activeTab === c ? "active" : ""}
              onClick={() => setActiveTab(c)}
            >
              {c === "R" ? "Relation" : c === "H" ? "Health" : "Wealth"}
            </button>
          ))}
        </div>

        {/* DEAL CARDS */}
        <section className="deals-grid">
          {filteredDeals.map((deal) => {
            const insufficient =
              balances[deal.redemptionCategory] < deal.pointsRequired;

            return (
              <div key={deal.id} className="deal-card">
                {deal.selectedItem?.imageURL && (
                  <img
                    src={deal.selectedItem.imageURL}
                    className="deal-img"
                    alt={deal.selectedItem.name}
                  />
                )}

                <div className="deal-discount">
                  {deal.offerType === "percent" &&
                    `${deal.discountValue}% OFF`}
                  {deal.offerType === "rs" &&
                    `₹${deal.discountValue} OFF`}
                  {deal.offerType === "bogo" &&
                    "Buy 1 Get 1"}
                </div>

                <h3>{deal.selectedItem?.name}</h3>

                <p className="deal-desc">
                  {deal.selectedItem?.description}
                </p>

                <p className="deal-points">
                  🎯 Required: {deal.pointsRequired} Points
                </p>

                {insufficient && (
                  <p className="need-more">
                    You need{" "}
                    {deal.pointsRequired -
                      balances[deal.redemptionCategory]}{" "}
                    more points
                  </p>
                )}

                <button
                  disabled={insufficient}
                  onClick={() => {
                    setSelectedDeal(deal);
                    setModalOpen(true);
                  }}
                >
                  Redeem
                </button>
              </div>
            );
          })}
        </section>

        <HeaderNav />
      </section>

      {/* MODAL */}
      {modalOpen && (
        <div className="ref-modal-overlay">
          <div className="ref-modal-content">
            <h3>Confirm Redemption</h3>

            <p>
              <strong>{selectedDeal?.selectedItem?.name}</strong>
            </p>

            <textarea
              placeholder="Lead description"
              value={leadDescription}
              onChange={(e) => setLeadDescription(e.target.value)}
            />

            <button onClick={handlePassReferral}>Confirm</button>
            <button onClick={() => setModalOpen(false)}>Cancel</button>
          </div>
        </div>
      )}
    </main>
  );
};

export default DealsForYou;
