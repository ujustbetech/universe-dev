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
  query
} from "firebase/firestore";
import { db } from "../../firebaseConfig";
import Layout from "../../component/Layout";
import { COLLECTIONS } from "/utility_collection";
import "../../src/app/styles/main.scss";

const AddRedeemption = () => {
  const [users, setUsers] = useState([]);
  const [cosmoSearch, setCosmoSearch] = useState("");
  const [selectedCosmo, setSelectedCosmo] = useState(null);

  const [services, setServices] = useState([]);
  const [products, setProducts] = useState([]);

  const [selectedService, setSelectedService] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [redeemPercentage, setRedeemPercentage] = useState("");

  const [redeemList, setRedeemList] = useState([]);

  // ================= LOAD USERS =================
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

  // ================= REALTIME REDEMPTION LIST =================
  useEffect(() => {
    const q = query(collection(db, "redeemption"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setRedeemList(data);
    });

    return () => unsubscribe();
  }, []);

  // ================= SELECT COSMO =================
  const handleCosmoSelect = async (user) => {
    setSelectedCosmo(user);
    setCosmoSearch(user.Name || "");

    setSelectedService(null);
    setSelectedProduct(null);
    setServices([]);
    setProducts([]);

    const ref = doc(db, COLLECTIONS.userDetail, user.id);
    const snap = await getDoc(ref);

    if (snap.exists()) {
      const data = snap.data();
      setServices(Array.isArray(data.services) ? data.services : []);
      setProducts(Array.isArray(data.products) ? data.products : []);
    }
  };

  // ================= SUBMIT =================
  const handleSubmit = async () => {
    if (
      !selectedCosmo ||
      (!selectedService && !selectedProduct) ||
      !redeemPercentage
    ) {
      alert("Please select Cosmo, Service/Product and Redeem Percentage");
      return;
    }

    const item = selectedService || selectedProduct;
    const itemType = selectedService ? "service" : "product";

    const agreedValue = Number(item.agreedValue || 0);
    const redeemAmount =
      (agreedValue * Number(redeemPercentage)) / 100;

    const data = {
      cosmo: {
        name: selectedCosmo.Name || "",
        phone: selectedCosmo.MobileNo || "",
        email: selectedCosmo.Email || "",
        ujbCode: selectedCosmo.UJBCode || "",
      },
      itemType,
      item: {
        name: item.name,
        agreedValue,
      },
      redeemPercentage: Number(redeemPercentage),
      redeemAmount,
      status: "Pending",
      createdAt: serverTimestamp(),
    };

    await addDoc(collection(db, "redeemption"), data);

    alert("Redeemption added successfully!");

    setSelectedService(null);
    setSelectedProduct(null);
    setRedeemPercentage("");
  };

  // ================= FILTER LIST BY SELECTED COSMO =================
  const filteredList = selectedCosmo
    ? redeemList.filter(
        (r) => r.cosmo?.ujbCode === selectedCosmo.UJBCode
      )
    : redeemList;

  // ================= RENDER =================
  return (
    <Layout>
      <section className="admin-profile-container">
        <div className="admin-profile-header">
          <h2>Add Redemption</h2>
          <button
            className="btn-back"
            onClick={() => window.history.back()}
          >
            Back
          </button>
        </div>

        <ul className="admin-profile-form">
          <li className="form-group">
            <h4>Search Cosmo Orbiter</h4>
            <input
              type="text"
              value={cosmoSearch}
              onChange={(e) => setCosmoSearch(e.target.value)}
            />

            <ul className="search-results">
              {users
                .filter((u) => {
                  const name = String(u.Name || "").toLowerCase();
                  const category = String(u.Category || "").toLowerCase();
                  return (
                    category.includes("cosmo") &&
                    name.includes(cosmoSearch.toLowerCase())
                  );
                })
                .map((user) => (
                  <li
                    key={user.id}
                    onClick={() => handleCosmoSelect(user)}
                  >
                    {user.Name}
                  </li>
                ))}
            </ul>
          </li>

          {services.length > 0 && (
            <li className="form-group">
              <label>Select Service</label>
              <select
                value={selectedService?.name || ""}
                onChange={(e) => {
                  setSelectedService(
                    services.find((s) => s.name === e.target.value)
                  );
                  setSelectedProduct(null);
                }}
              >
                <option value="">-- Select Service --</option>
                {services.map((service, i) => (
                  <option key={i} value={service.name}>
                    {service.name}
                  </option>
                ))}
              </select>
            </li>
          )}

          {products.length > 0 && (
            <li className="form-group">
              <label>Select Product</label>
              <select
                value={selectedProduct?.name || ""}
                onChange={(e) => {
                  setSelectedProduct(
                    products.find((p) => p.name === e.target.value)
                  );
                  setSelectedService(null);
                }}
              >
                <option value="">-- Select Product --</option>
                {products.map((product, i) => (
                  <option key={i} value={product.name}>
                    {product.name}
                  </option>
                ))}
              </select>
            </li>
          )}

          {(selectedService || selectedProduct) && (
            <li className="form-group">
              <label>Redeem Percentage (%)</label>
              <input
                type="number"
                value={redeemPercentage}
                onChange={(e) => setRedeemPercentage(e.target.value)}
              />
            </li>
          )}
        </ul>

        <button className="btn-submit" onClick={handleSubmit}>
          Submit Redeemption
        </button>

        {/* ================= ADDED LIST BELOW ================= */}
        <div className="redeem-list-section">
          <h3 style={{ marginTop: "30px" }}>
            Added Redemptions
          </h3>

          {filteredList.map((item) => (
            <div key={item.id} className="summary-card">
              <h4>{item.item?.name}</h4>
              <p>Type: {item.itemType}</p>
              <p>Redeem %: {item.redeemPercentage}%</p>
              <p>Amount: ₹{item.redeemAmount}</p>
              <strong>Status: {item.status}</strong>
            </div>
          ))}
        </div>
      </section>
    </Layout>
  );
};

export default AddRedeemption;
