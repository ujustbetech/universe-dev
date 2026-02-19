"use client";

import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  addDoc,
  doc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";
import Layout from "../../component/Layout";
import { COLLECTIONS } from "/utility_collection";
import Swal from "sweetalert2";
import "../../src/app/styles/main.scss";

const AddRedeemption = () => {

  const [users, setUsers] = useState([]);
  const [cosmoSearch, setCosmoSearch] = useState("");
  const [selectedCosmo, setSelectedCosmo] = useState(null);

  const [services, setServices] = useState([]);
  const [products, setProducts] = useState([]);

  const [mode, setMode] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);
  const [multipleItems, setMultipleItems] = useState([]);

  /* CC MODEL STATES (UNTOUCHED) */
  const [ccModel, setCcModel] = useState("");
  const [discountPercent, setDiscountPercent] = useState("");
  const [additionalPercent, setAdditionalPercent] = useState("");
  const [freeOfferType, setFreeOfferType] = useState("");

  /* AGREED % STATES */
  const [originalPercent, setOriginalPercent] = useState(0);
  const [enhanceRequired, setEnhanceRequired] = useState("");
  const [enhancedPercent, setEnhancedPercent] = useState(0);
  const [finalPercent, setFinalPercent] = useState(0);

  /* GET ORIGINAL AGREED % */
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

  /* LOAD USERS */
  useEffect(() => {
    const fetchUsers = async () => {
      const snapshot = await getDocs(
        collection(db, COLLECTIONS.userDetail)
      );
      setUsers(snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })));
    };
    fetchUsers();
  }, []);

  /* SELECT COSMO */
  const handleCosmoSelect = async (user) => {

    setSelectedCosmo(user);
    setCosmoSearch(user.Name || "");

    const ref = doc(db, COLLECTIONS.userDetail, user.id);
    const snap = await getDoc(ref);

    if (snap.exists()) {
      const data = snap.data();
      setServices(data.services || []);
      setProducts(data.products || []);
    }
  };

  /* MODE CHANGE */
  const handleModeChange = (val) => {

    setMode(val);
    setSelectedItem(null);
    setMultipleItems([]);
    setOriginalPercent(0);
    setEnhancedPercent(0);
    setEnhanceRequired("");
    setFinalPercent(0);

    if (val === "all") {

      const allItems = [...services, ...products];

      let total = 0;
      let count = 0;

      allItems.forEach(item => {
        const percent = getOriginalPercent(item);
        if (percent > 0) {
          total += percent;
          count++;
        }
      });

      if (count > 0) {
        const avg = Math.round(total / count);
        setOriginalPercent(avg);
        setFinalPercent(avg);
      }
    }
  };

  /* SUBMIT */
  const handleSubmit = async () => {

    if (!selectedCosmo || !mode || !ccModel) {
      Swal.fire("Error", "Complete required fields", "error");
      return;
    }

    await addDoc(collection(db, "ccredemption"), {

      requestedBy: selectedCosmo.UJBCode,

      cosmo: {
        Name: selectedCosmo.Name,
        MobileNo: selectedCosmo.MobileNo,
        Email: selectedCosmo.Email,
        ujbCode: selectedCosmo.UJBCode,
      },

      mode,
      selectedItem: mode === "single" ? selectedItem : null,
      multipleItems: mode === "multiple" ? multipleItems : [],
      allItems: mode === "all",

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

      modelLocked: true,
      status: "Approved",
      createdAt: serverTimestamp(),
    });

    Swal.fire("Success", "CC Product Added", "success");
  };

  return (
    <Layout>
      <section className="admin-profile-container">

        <h2>Add CC Product (SOP Model)</h2>

        <ul className="admin-profile-form">

          {/* COSMO SEARCH */}
          <li className="form-group">
            <input
              type="text"
              placeholder="Search Cosmo"
              value={cosmoSearch}
              onChange={(e) => setCosmoSearch(e.target.value)}
            />
            {cosmoSearch && (
              <ul className="search-results">
                {users.filter((u) =>
                  u.Name?.toLowerCase().includes(
                    cosmoSearch.toLowerCase()
                  )
                ).map((user) => (
                  <li
                    key={user.id}
                    onClick={() => handleCosmoSelect(user)}
                  >
                    {user.Name}
                  </li>
                ))}
              </ul>
            )}
          </li>

          {/* MODE */}
          <li className="form-group">
            <select
              value={mode}
              onChange={(e) => handleModeChange(e.target.value)}
            >
              <option value="">Select Mode</option>
              <option value="single">Single</option>
              <option value="multiple">Multiple</option>
              <option value="all">All</option>
            </select>
          </li>

          {/* SINGLE */}
          {mode === "single" && (
            <li className="form-group">
              <select
                onChange={(e) => {

                  const allItems = [...services, ...products];
                  const selected = allItems.find(
                    (i) => i.name === e.target.value
                  );

                  setSelectedItem(selected);

                  const percent = getOriginalPercent(selected);
                  setOriginalPercent(percent);
                  setFinalPercent(percent);
                }}
              >
                <option value="">Select Item</option>
                {[...services, ...products].map(
                  (item, i) => (
                    <option key={i} value={item.name}>
                      {item.name}
                    </option>
                  )
                )}
              </select>
            </li>
          )}

          {/* ORIGINAL */}
          {originalPercent > 0 && (
            <li className="form-group">
              <label>Original Agreed %</label>
              <input value={originalPercent} disabled />
            </li>
          )}

          {/* ENHANCE */}
          {originalPercent > 0 && (
            <li className="form-group">
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
            </li>
          )}

          {enhanceRequired === "YES" && (
            <>
              <li className="form-group">
                <input
                  type="number"
                  placeholder="Enhanced %"
                  onChange={(e) => {
                    const extra = Number(e.target.value || 0);
                    setEnhancedPercent(extra);
                    setFinalPercent(originalPercent + extra);
                  }}
                />
              </li>

              <li className="form-group">
                <label>Final Agreed %</label>
                <input value={finalPercent} disabled />
              </li>
            </>
          )}

          {/* CC MODEL */}
          <li className="form-group">
            <select
              value={ccModel}
              onChange={(e) => setCcModel(e.target.value)}
            >
              <option value="">CC Participation Model</option>
              <option value="DISCOUNT">Discount on Cost</option>
              <option value="ADDITIONAL_PERCENT">Special Referral %</option>
              <option value="FREE_OFFER">Free Product / Service</option>
            </select>
          </li>

          {ccModel === "DISCOUNT" && (
            <li className="form-group">
              <input
                type="number"
                placeholder="Enter Discount %"
                value={discountPercent}
                onChange={(e) =>
                  setDiscountPercent(e.target.value)
                }
              />
            </li>
          )}

          {ccModel === "ADDITIONAL_PERCENT" && (
            <li className="form-group">
              <input
                type="number"
                placeholder="Enter Additional %"
                value={additionalPercent}
                onChange={(e) =>
                  setAdditionalPercent(e.target.value)
                }
              />
            </li>
          )}

          {ccModel === "FREE_OFFER" && (
            <li className="form-group">
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
            </li>
          )}

        </ul>

        <button className="btn-submit" onClick={handleSubmit}>
          Add CC Product
        </button>

      </section>
    </Layout>
  );
};

export default AddRedeemption;
