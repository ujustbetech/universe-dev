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
  const [orbiterDetails, setOrbiterDetails] = useState(null);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [leadDescription, setLeadDescription] = useState("");

  /* ================= LOAD LOGGED ORBITER ================= */

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
    };

    fetchUser();
  }, []);

  /* ================= FETCH APPROVED DEALS ================= */

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

  /* ================= ID GENERATOR ================= */
  /* FORMAT: ccref/26-27/000001 */

  const generateReferralId = async () => {
    const now = new Date();
    const year1 = String(now.getFullYear()).slice(-2);
    const year2 = String(now.getFullYear() + 1).slice(-2);

    const prefix = `ccref/${year1}-${year2}/`;

    const snap = await getDocs(collection(db, "ccreferral"));

    let last = 0;

    snap.forEach((doc) => {
      const id = doc.data().referralId;
      if (id?.startsWith(prefix)) {
        const match = id.match(/\/(\d+)$/);
        if (match) {
          const num = parseInt(match[1]);
          if (num > last) last = num;
        }
      }
    });

    return `${prefix}${String(last + 1).padStart(6, "0")}`;
  };

  /* ================= NORMALIZE AGREED VALUE ================= */

  const normalizeItem = (item) => {
    if (!item) return null;

    const it = JSON.parse(JSON.stringify(item));

    if (!it.agreedValue && it.percentage != null) {
      it.agreedValue = {
        mode: "single",
        single: { type: "percentage", value: String(it.percentage) },
        multiple: { slabs: [], itemSlabs: [] },
      };
    }

    return it;
  };

  /* ================= PASS REFERRAL ================= */

  const handlePassReferral = async () => {
    if (!selectedDeal) return;

    if (!orbiterDetails) {
      toast.error("User not loaded");
      return;
    }

    if (!leadDescription.trim()) {
      toast.error("Enter lead description");
      return;
    }

    const cosmoCode = selectedDeal.cosmo?.ujbCode;

    if (cosmoCode === orbiterDetails.ujbCode) {
      toast.error("You cannot refer your own deal");
      return;
    }

    try {
      const referralId = await generateReferralId();

      const cosmoSnap = await getDoc(
        doc(db, COLLECTIONS.userDetail, cosmoCode)
      );

      if (!cosmoSnap.exists()) {
        toast.error("Cosmo not found");
        return;
      }

      const cosmoData = cosmoSnap.data();

      const selectedItem =
        selectedDeal.mode === "all"
          ? { type: "all", label: "All Products" }
          : selectedDeal.selectedItem;

      const finalItem = normalizeItem(selectedItem);

      const data = {
        referralId,
        referralSource: "CCDeal",
        referralType: "CC",

        dealStatus: "Pending",
        timestamp: new Date(),
        lastUpdated: new Date(),

        cosmoUjbCode: cosmoCode,

        cosmoOrbiter: {
          name: cosmoData.Name,
          phone: cosmoData.MobileNo,
          email: cosmoData.Email,
          ujbCode: cosmoData.UJBCode,
        },

        orbiter: orbiterDetails,

        service:
          selectedDeal.itemType === "service" ? finalItem : null,

        product:
          selectedDeal.itemType === "product" ? finalItem : null,

        offerType: selectedDeal.offerType || null,
        discountValue: selectedDeal.discountValue || null,
        customText: selectedDeal.customText || null,

        leadDescription,

        dealLogs: [],
        followups: [],
        statusLogs: [],
      };

      await addDoc(collection(db, "ccreferral"), data);

      toast.success("CC Referral Sent Successfully!");

      setLeadDescription("");
      setModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to send referral");
    }
  };

  const formatOffer = (deal) => {
    if (deal.offerType === "percent")
      return `${deal.discountValue}% OFF`;

    if (deal.offerType === "rs")
      return `₹${deal.discountValue} OFF`;

    if (deal.offerType === "bogo")
      return "Buy 1 Get 1 Free";

    if (deal.offerType === "other")
      return deal.customText;

    return "";
  };

  return (
    <main className="pageContainer">
      <Headertop />

      <section className="HomepageMain">
        <div className="container pageHeading">
          <h1>🔥 Deals For You</h1>
        </div>

        <section className="deals-grid">
          {deals.map((deal) => (
            <div key={deal.id} className="deal-card">

              {deal.mode !== "all" &&
                deal.selectedItem?.imageURL && (
                  <div className="deal-image-wrapper">
                    <img
                      src={deal.selectedItem.imageURL}
                      alt={deal.selectedItem?.name}
                    />
                    <div className="deal-badge">
                      {formatOffer(deal)}
                    </div>
                  </div>
                )}

              <h3 className="deal-title">
                {deal.mode === "all"
                  ? "All Products"
                  : deal.selectedItem?.name}
              </h3>

              {deal.selectedItem?.description && (
                <p className="deal-description">
                  {deal.selectedItem.description}
                </p>
              )}

              <p className="deal-business">
                Offered by:{" "}
                {deal.cosmo?.Name || deal.cosmo?.name}
              </p>

              <button
                className="deal-btn"
                onClick={() => {
                  setSelectedDeal(deal);
                  setModalOpen(true);
                }}
              >
                🚀 Pass Referral
              </button>
            </div>
          ))}
        </section>

        <HeaderNav />
      </section>

      {modalOpen && (
        <div className="ref-modal-overlay">
          <div className="ref-modal-content">
            <h3>Pass CC Referral</h3>

            <textarea
              placeholder="Short description of lead"
              value={leadDescription}
              onChange={(e) => setLeadDescription(e.target.value)}
            />

            <button onClick={handlePassReferral}>
              Send Referral
            </button>

            <button onClick={() => setModalOpen(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </main>
  );
};

export default DealsForYou;
