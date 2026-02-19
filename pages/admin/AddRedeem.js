"use client";

import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  addDoc,
  doc,
  getDoc,
  serverTimestamp,
  onSnapshot,
  query,
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

  /* 🔥 SOP CC MODEL STATES */
  const [ccModel, setCcModel] = useState("");
  const [discountPercent, setDiscountPercent] = useState("");
  const [additionalPercent, setAdditionalPercent] = useState("");
  const [freeOfferType, setFreeOfferType] = useState("");

  const [redeemList, setRedeemList] = useState([]);

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

  /* REALTIME LIST */
  useEffect(() => {
    const q = query(collection(db, "ccredemption"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRedeemList(snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })));
    });
    return () => unsubscribe();
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

  /* SUBMIT */
  const handleSubmit = async () => {

    if (!selectedCosmo || !mode || !ccModel) {
      Swal.fire("Error", "Complete required fields", "error");
      return;
    }

    if (mode === "single" && !selectedItem) {
      Swal.fire("Error", "Select Product/Service", "error");
      return;
    }

    if (ccModel === "DISCOUNT" && !discountPercent) {
      Swal.fire("Error", "Enter Discount %", "error");
      return;
    }

    if (ccModel === "ADDITIONAL_PERCENT" && !additionalPercent) {
      Swal.fire("Error", "Enter Additional %", "error");
      return;
    }

    if (ccModel === "FREE_OFFER" && !freeOfferType) {
      Swal.fire("Error", "Select Free Offer Type", "error");
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

      /* 🔥 SOP MODEL STRUCTURE */
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

    setMode("");
    setSelectedItem(null);
    setCcModel("");
    setDiscountPercent("");
    setAdditionalPercent("");
    setFreeOfferType("");
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
              onChange={(e) => setMode(e.target.value)}
            >
              <option value="">Select Mode</option>
              <option value="single">Single</option>
              <option value="all">All</option>
            </select>
          </li>

          {/* ITEM */}
          {mode === "single" && (
            <li className="form-group">
              <select
                value={selectedItem?.name || ""}
                onChange={(e) => {
                  const allItems = [...services, ...products];
                  setSelectedItem(
                    allItems.find(
                      (i) => i.name === e.target.value
                    )
                  );
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
