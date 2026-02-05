"use client";

import { useEffect, useState } from "react";
import { db } from "../firebaseConfig";
import {
  doc,
  getDoc,
  addDoc,
  collection,
  serverTimestamp,
  query,
  where,
  getDocs
} from "firebase/firestore";
import Headertop from "../component/Header";
import HeaderNav from "../component/HeaderNav";
import "../src/app/styles/user.scss";
import Swal from "sweetalert2";
import { COLLECTIONS } from "/utility_collection";

/* ================= NORMALIZERS ================= */

const normalizeName = (name) => {
  if (!name) return "Unnamed";
  if (typeof name === "string") return name;
  if (typeof name === "object") {
    return name.single || name.multiple?.[0] || "Unnamed";
  }
  return "Unnamed";
};

const normalizeValue = (value) => {
  if (!value) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value) || 0;
  if (typeof value === "object") {
    return Number(value.amount || value.value || 0);
  }
  return 0;
};

const normalizeItems = (items = []) => {
  return items.map((item) => ({
    name: normalizeName(item.name),
    agreedValue: normalizeValue(item.agreedValue),
  }));
};

/* ================= COMPONENT ================= */

const RequestRedeemption = () => {
  const [user, setUser] = useState(null);
  const [services, setServices] = useState([]);
  const [products, setProducts] = useState([]);

  const [selectedItem, setSelectedItem] = useState(null);
  const [itemType, setItemType] = useState("");
  const [redeemPercentage, setRedeemPercentage] = useState("");

  const [myRequests, setMyRequests] = useState([]);

  /* ============ LOAD USER + NORMALIZE DATA ============ */
  useEffect(() => {
    const loadUser = async () => {
      const ujbCode = localStorage.getItem("mmUJBCode");
      if (!ujbCode) {
        Swal.fire("Error", "UJB Code not found", "error");
        return;
      }

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

      // ✅ NORMALIZATION HAPPENS HERE (ONCE)
      setServices(normalizeItems(data.services));
      setProducts(normalizeItems(data.products));
    };

    loadUser();
  }, []);

  /* ============ LOAD MY REQUESTS ============ */
  useEffect(() => {
    const fetchRequests = async () => {
      const ujbCode = localStorage.getItem("mmUJBCode");
      if (!ujbCode) return;

      const q = query(
        collection(db, "redeemption"),
        where("requestedBy", "==", ujbCode)
      );

      const snap = await getDocs(q);
      setMyRequests(
        snap.docs.map(d => ({ id: d.id, ...d.data() }))
      );
    };

    fetchRequests();
  }, []);

  /* ============ SUBMIT REQUEST ============ */
  const submitRequest = async () => {
    if (!selectedItem || !redeemPercentage) {
      Swal.fire("Error", "Select item & percentage", "error");
      return;
    }

    const agreedValue = selectedItem.agreedValue;
    const redeemAmount =
      (agreedValue * Number(redeemPercentage)) / 100;

    await addDoc(collection(db, "redeemption"), {
      requestedBy: user.ujbCode,
      cosmo: {
        name: user.Name,
        phone: user.MobileNo,
        email: user.Email,
        ujbCode: user.ujbCode
      },
      itemType,
      item: {
        name: selectedItem.name,
        agreedValue
      },
      redeemPercentage: Number(redeemPercentage),
      redeemAmount,
      status: "Requested",
      createdAt: serverTimestamp()
    });

    Swal.fire(
      "Requested",
      "Your redemption request has been sent",
      "success"
    );

    setSelectedItem(null);
    setRedeemPercentage("");
  };

  /* ============ RENDER ============ */
  return (
    <main className="pageContainer">
      <Headertop />

      <section className="HomepageMain">
        <div className="container pageHeading">
          <h1>Redemption</h1>
          <p>Request & track your redemption</p>
        </div>

        {/* ===== SERVICES & PRODUCTS ===== */}
        <section className="project-summary">
          {services.map((s, i) => (
            <div
              key={`service-${i}`}
              className={`summary-card ${
                selectedItem?.name === s.name ? "completed" : "on-hold"
              }`}
              onClick={() => {
                setSelectedItem(s);
                setItemType("service");
              }}
            >
              <h3>{s.name}</h3>
              <p>Agreed: ₹{s.agreedValue}</p>
            </div>
          ))}

          {products.map((p, i) => (
            <div
              key={`product-${i}`}
              className={`summary-card ${
                selectedItem?.name === p.name ? "completed" : "on-hold"
              }`}
              onClick={() => {
                setSelectedItem(p);
                setItemType("product");
              }}
            >
              <h3>{p.name}</h3>
              <p>Agreed: ₹{p.agreedValue}</p>
            </div>
          ))}
        </section>

        {/* ===== REQUEST FORM ===== */}
        {selectedItem && (
          <section className="container">
            <div className="loginInput">
              <input
                type="number"
                placeholder="Enter Redeem Percentage"
                value={redeemPercentage}
                onChange={(e) =>
                  setRedeemPercentage(e.target.value)
                }
              />
              <button className="login" onClick={submitRequest}>
                Request Redemption
              </button>
            </div>
          </section>
        )}

        {/* ===== STATUS LIST ===== */}
        <section className="container">
          <h2 style={{ marginBottom: "10px" }}>My Requests</h2>

          {myRequests.map(req => (
            <div key={req.id} className="summary-card on-hold">
              <h3>{req.item?.name}</h3>
              <p>{req.itemType}</p>
              <p>{req.redeemPercentage}%</p>
              <p>₹{req.redeemAmount}</p>
              <strong>Status: {req.status}</strong>
            </div>
          ))}
        </section>

        <HeaderNav />
      </section>
    </main>
  );
};

export default RequestRedeemption;
