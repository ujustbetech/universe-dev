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

  const [offerType, setOfferType] = useState("");
  const [discountValue, setDiscountValue] = useState("");
  const [customText, setCustomText] = useState("");

  const [redeemList, setRedeemList] = useState([]);

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

  /* ================= REALTIME LIST ================= */
  useEffect(() => {
    const q = query(collection(db, "ccredemption"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRedeemList(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
      );
    });

    return () => unsubscribe();
  }, []);

  /* ================= SELECT COSMO ================= */
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

  /* ================= PREVENT DUPLICATE ================= */
  const isDuplicate = () => {
    if (!selectedCosmo) return false;

    return redeemList.some(
      (r) =>
        r.cosmo?.ujbCode === selectedCosmo.UJBCode &&
        r.status === "Approved"
    );
  };

  /* ================= SUBMIT ================= */
  const handleSubmit = async () => {
    if (!selectedCosmo || !mode || !offerType) {
      Swal.fire("Error", "Complete required fields", "error");
      return;
    }

    if (mode === "single" && !selectedItem) {
      Swal.fire("Error", "Select product/service", "error");
      return;
    }

    if (
      (offerType === "percent" || offerType === "rs") &&
      !discountValue
    ) {
      Swal.fire("Error", "Enter discount value", "error");
      return;
    }

    if (offerType === "other" && !customText) {
      Swal.fire("Error", "Enter custom offer", "error");
      return;
    }

    if (isDuplicate()) {
      Swal.fire(
        "Duplicate Found",
        "CC Redemption already exists",
        "warning"
      );
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
      selectedItem:
        mode === "single" ? selectedItem : null,
      offerType,
      discountValue:
        offerType === "percent" || offerType === "rs"
          ? Number(discountValue)
          : null,
      customText:
        offerType === "other" ? customText : null,
      status: "Approved",
      createdAt: serverTimestamp(),
    });

    Swal.fire("Success", "CC Redemption Added", "success");

    setMode("");
    setSelectedItem(null);
    setOfferType("");
    setDiscountValue("");
    setCustomText("");
  };

  /* ================= STATUS BADGE ================= */
  const getStatusClass = (status) => {
    if (status === "Approved") return "completed";
    if (status === "Rejected") return "in-review";
    return "on-hold";
  };

  /* ================= FILTER LIST ================= */
  const filteredList = selectedCosmo
    ? redeemList.filter(
        (r) => r.cosmo?.ujbCode === selectedCosmo.UJBCode
      )
    : redeemList;

  /* ================= RENDER ================= */

  return (
    <Layout>
      <section className="admin-profile-container">
        <div className="admin-profile-header">
          <h2>Manual CC Redemption Entry</h2>
          <button
            className="btn-back"
            onClick={() => window.history.back()}
          >
            Back
          </button>
        </div>

        <ul className="admin-profile-form">
          {/* COSMO SEARCH */}
          <li className="form-group">
            <h4>Search Cosmo Orbiter</h4>
            <input
              type="text"
              value={cosmoSearch}
              onChange={(e) => setCosmoSearch(e.target.value)}
            />

            {cosmoSearch && (
              <ul className="search-results">
                {users
                  .filter((u) =>
                    u.Name?.toLowerCase().includes(
                      cosmoSearch.toLowerCase()
                    )
                  )
                  .map((user) => (
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
            <label>Mode</label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
            >
              <option value="">Select Mode</option>
              <option value="single">Single</option>
              <option value="all">All</option>
            </select>
          </li>

          {/* SINGLE ITEM */}
          {mode === "single" && (
            <li className="form-group">
              <label>Select Product/Service</label>
              <select
                value={selectedItem?.name || ""}
                onChange={(e) => {
                  const allItems = [
                    ...services,
                    ...products,
                  ];
                  setSelectedItem(
                    allItems.find(
                      (i) => i.name === e.target.value
                    )
                  );
                }}
              >
                <option value="">-- Select --</option>
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

          {/* OFFER TYPE */}
          <li className="form-group">
            <label>Offer Type</label>
            <select
              value={offerType}
              onChange={(e) =>
                setOfferType(e.target.value)
              }
            >
              <option value="">Select Offer</option>
              <option value="percent">
                X % Discount
              </option>
              <option value="rs">
                X Rs Discount
              </option>
              <option value="bogo">
                Buy 1 Get 1
              </option>
              <option value="other">Other</option>
            </select>
          </li>

          {(offerType === "percent" ||
            offerType === "rs") && (
            <li className="form-group">
              <input
                type="number"
                placeholder="Enter Value"
                value={discountValue}
                onChange={(e) =>
                  setDiscountValue(e.target.value)
                }
              />
            </li>
          )}

          {offerType === "other" && (
            <li className="form-group">
              <input
                type="text"
                placeholder="Enter Custom Offer"
                value={customText}
                onChange={(e) =>
                  setCustomText(e.target.value)
                }
              />
            </li>
          )}
        </ul>

        <button className="btn-submit" onClick={handleSubmit}>
          Add CC Redemption
        </button>

        {/* LIST */}
        <div style={{ marginTop: "30px" }}>
          <h3>Existing CC Redemptions</h3>

          {filteredList.length === 0 && (
            <p>No records found</p>
          )}

          {filteredList.map((item) => (
            <div key={item.id} className="summary-card">
              <h4>
                {item.mode === "all"
                  ? "All Products"
                  : item.selectedItem?.name}
              </h4>
              <p>Offer: {item.offerType}</p>
              {item.discountValue && (
                <p>Value: {item.discountValue}</p>
              )}
              {item.customText && (
                <p>{item.customText}</p>
              )}

              <span
                className={`status-badge ${getStatusClass(
                  item.status
                )}`}
              >
                {item.status}
              </span>
            </div>
          ))}
        </div>
      </section>
    </Layout>
  );
};

export default AddRedeemption;
