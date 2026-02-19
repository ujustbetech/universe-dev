"use client";

import { useEffect, useState } from "react";
import { db } from "../firebaseConfig";
import {
  doc,
  getDoc,
  updateDoc,
  addDoc,
  collection,
  serverTimestamp,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import Headertop from "../component/Header";
import HeaderNav from "../component/HeaderNav";
import "../src/app/styles/user.scss";
import Swal from "sweetalert2";
import { COLLECTIONS } from "/utility_collection";

const CCRedemption = () => {

  const [user, setUser] = useState(null);
  const [agreementAccepted, setAgreementAccepted] = useState(false);

  const [mode, setMode] = useState("");
  const [services, setServices] = useState([]);
  const [products, setProducts] = useState([]);

  const [selectedItem, setSelectedItem] = useState(null);
  const [multipleItems, setMultipleItems] = useState([]);

  /* CC MODEL */
  const [ccModel, setCcModel] = useState("");
  const [discountPercent, setDiscountPercent] = useState("");
  const [additionalPercent, setAdditionalPercent] = useState("");
  const [freeOfferType, setFreeOfferType] = useState("");

  /* AGREED % */
  const [originalPercent, setOriginalPercent] = useState(0);
  const [enhanceRequired, setEnhanceRequired] = useState("");
  const [enhancedPercent, setEnhancedPercent] = useState(0);
  const [finalPercent, setFinalPercent] = useState(0);

  /* GET ORIGINAL % */
  const getOriginalPercent = (item) => {

    if (!item?.agreedValue) return 0;

    if (
      item.agreedValue.mode === "single" &&
      item.agreedValue.single?.type === "percentage"
    ) {
      return Number(item.agreedValue.single.value || 0);
    }

    if (
      item.agreedValue.mode === "multiple" &&
      item.agreedValue.multiple?.slabs?.length
    ) {
      return Number(
        item.agreedValue.multiple.slabs[0]?.value || 0
      );
    }

    return 0;
  };

  /* LOAD USER */
  useEffect(() => {

    const loadUser = async () => {

      const ujbCode = localStorage.getItem("mmUJBCode");
      if (!ujbCode) return;

      const snap = await getDoc(
        doc(db, COLLECTIONS.userDetail, ujbCode)
      );

      if (!snap.exists()) return;

      const data = snap.data();

      setUser({
        ujbCode,
        Name: data.Name,
        MobileNo: data.MobileNo,
        Email: data.Email,
      });

      setAgreementAccepted(
        data.ccRedemptionAgreementAccepted === true
      );

      setServices(data.services || []);
      setProducts(data.products || []);

    };

    loadUser();

  }, []);

  /* ACCEPT AGREEMENT */
  const acceptAgreement = async () => {

    const ujbCode = localStorage.getItem("mmUJBCode");

    await updateDoc(
      doc(db, COLLECTIONS.userDetail, ujbCode),
      {
        ccRedemptionAgreementAccepted: true,
        ccRedemptionAgreementAcceptedAt: serverTimestamp(),
      }
    );

    setAgreementAccepted(true);
    Swal.fire("Accepted", "Agreement accepted", "success");

  };

  /* SUBMIT */
  const submitRequest = async () => {

    if (!mode) {
      Swal.fire("Error", "Select Mode", "error");
      return;
    }

    if (
      (mode === "single" && !selectedItem) ||
      (mode === "multiple" && multipleItems.length === 0)
    ) {
      Swal.fire("Error", "Select Product / Service", "error");
      return;
    }

    if (!ccModel) {
      Swal.fire("Error", "Select CC Model", "error");
      return;
    }

    await addDoc(collection(db, "CCRedemption"), {

      requestedBy: user.ujbCode,
      cosmo: user,

      mode,
      selectedItem: mode === "single" ? selectedItem : null,
      multipleItems: mode === "multiple" ? multipleItems : [],
      allItems: mode === "all",

      /* AGREED BLOCK */
      agreedPercentage: {
        originalPercent: Number(originalPercent),
        enhancementApplied: enhanceRequired,
        enhancedPercent:
          enhanceRequired === "YES"
            ? Number(enhancedPercent)
            : 0,
        finalAgreedPercent:
          enhanceRequired === "YES"
            ? Number(finalPercent)
            : Number(originalPercent),
      },

      /* CC MODEL BLOCK */
      ccModel: {
        type: ccModel,

        discountPercent:
          ccModel === "DISCOUNT"
            ? Number(discountPercent)
            : null,

        additionalPercent:
          ccModel === "ADDITIONAL_PERCENT"
            ? Number(additionalPercent)
            : null,

        freeOfferType:
          ccModel === "FREE_OFFER"
            ? freeOfferType
            : null,

        appliesOnPaidOnly:
          ccModel === "FREE_OFFER",
      },

      status: "Requested",
      createdAt: serverTimestamp(),

    });

    Swal.fire("Submitted", "Request sent to admin", "success");

  };

  if (!agreementAccepted) {
    return (
      <main className="pageContainer">
        <Headertop />
        <section className="HomepageMain">
          <div className="container pageHeading">
            <h1>CC Redemption Agreement</h1>
          </div>
          <div className="container loginInput">
            <button className="login" onClick={acceptAgreement}>
              Accept Agreement
            </button>
          </div>
          <HeaderNav />
        </section>
      </main>
    );
  }

  return (
    <main className="pageContainer">

      <Headertop />

      <section className="HomepageMain">

        <div className="container pageHeading">
          <h1>CC Redemption</h1>
        </div>

        <div className="container loginInput">
          <select
            value={mode}
            onChange={(e) => {
              setMode(e.target.value);
              setSelectedItem(null);
              setMultipleItems([]);
              setOriginalPercent(0);
              setEnhancedPercent(0);
              setEnhanceRequired("");
              setFinalPercent(0);
            }}
          >
            <option value="">Select Mode</option>
            <option value="single">Single</option>
            <option value="multiple">Multiple</option>
            <option value="all">All</option>
          </select>
        </div>

        {mode && (
          <div className="project-summary">

            {[...services, ...products].map((item, i) => (

              <div
                key={i}
                className="summary-card"
                onClick={() => {

                  if (mode === "single") {
                    setSelectedItem(item);
                    const percent = getOriginalPercent(item);
                    setOriginalPercent(percent);
                    setFinalPercent(percent);
                  }

                  if (mode === "multiple") {

                    if (multipleItems.some(m => m.name === item.name)) {
                      setMultipleItems(prev =>
                        prev.filter(m => m.name !== item.name)
                      );
                    } else {
                      setMultipleItems(prev => [...prev, item]);
                    }

                    const percent = getOriginalPercent(item);
                    setOriginalPercent(percent);
                    setFinalPercent(percent);
                  }

                }}
              >
                <h3>{item.name}</h3>
              </div>

            ))}

          </div>
        )}

        {originalPercent > 0 && (
          <div className="container loginInput">
            <label>Original Agreed %</label>
            <input value={originalPercent} disabled />
          </div>
        )}

        {originalPercent > 0 && (
          <div className="container loginInput">
            <label>Enhancement Required?</label>
            <select
              value={enhanceRequired}
              onChange={(e) => {
                const val = e.target.value;
                setEnhanceRequired(val);
                if (val === "NO") {
                  setEnhancedPercent(0);
                  setFinalPercent(originalPercent);
                }
              }}
            >
              <option value="">Select</option>
              <option value="YES">YES</option>
              <option value="NO">NO</option>
            </select>
          </div>
        )}

        {enhanceRequired === "YES" && (
          <div className="container loginInput">
            <input
              type="number"
              placeholder="Enhanced %"
              value={enhancedPercent}
              onChange={(e) => {
                const extra = Number(e.target.value || 0);
                setEnhancedPercent(extra);
                setFinalPercent(originalPercent + extra);
              }}
            />
            <label>Final Agreed %</label>
            <input value={finalPercent} disabled />
          </div>
        )}

        <div className="container loginInput">

          <select
            value={ccModel}
            onChange={(e) => setCcModel(e.target.value)}
          >
            <option value="">CC Participation Model</option>
            <option value="DISCOUNT">Discount on Cost</option>
            <option value="ADDITIONAL_PERCENT">Special Referral %</option>
            <option value="FREE_OFFER">Free Product / Service</option>
          </select>

        </div>

        {ccModel === "DISCOUNT" && (
          <div className="container loginInput">
            <input
              type="number"
              placeholder="Enter Discount %"
              value={discountPercent}
              onChange={(e) =>
                setDiscountPercent(e.target.value)
              }
            />
          </div>
        )}

        {ccModel === "ADDITIONAL_PERCENT" && (
          <div className="container loginInput">
            <input
              type="number"
              placeholder="Enter Additional %"
              value={additionalPercent}
              onChange={(e) =>
                setAdditionalPercent(e.target.value)
              }
            />
          </div>
        )}

        {ccModel === "FREE_OFFER" && (
          <div className="container loginInput">
            <select
              value={freeOfferType}
              onChange={(e) =>
                setFreeOfferType(e.target.value)
              }
            >
              <option value="">Select Free Model</option>
              <option value="BOGO">Buy 1 Get 1</option>
              <option value="COMBO">Combo Offer</option>
              <option value="DEMO">Free Demo</option>
              <option value="ADDON">Add-on Service</option>
            </select>
          </div>
        )}

        <div className="container loginInput">
          <button className="login" onClick={submitRequest}>
            Submit
          </button>
        </div>

        <HeaderNav />

      </section>

    </main>
  );
};

export default CCRedemption;
