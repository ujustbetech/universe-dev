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

/* ================= COMPONENT ================= */

const CCRedemption = () => {
  const [user, setUser] = useState(null);
  const [agreementAccepted, setAgreementAccepted] = useState(false);

  const [mode, setMode] = useState("");
  const [services, setServices] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);

  const [offerType, setOfferType] = useState("");
  const [discountValue, setDiscountValue] = useState("");
  const [customText, setCustomText] = useState("");

  const [myRequests, setMyRequests] = useState([]);

  /* ================= LOAD USER ================= */
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

      // Normalize services
      const normServices = (data.services || []).map((s) => ({
        ...s,
        name: normalizeName(s.name),
        agreedValue: normalizeValue(s.agreedValue),
        type: "service",
      }));

      // Normalize products
      const normProducts = (data.products || []).map((p) => ({
        ...p,
        name: normalizeName(p.name),
        agreedValue: normalizeValue(p.agreedValue),
        type: "product",
      }));

      setServices(normServices);
      setProducts(normProducts);
    };

    loadUser();
  }, []);

  /* ================= REALTIME MY REQUESTS ================= */
  useEffect(() => {
    const ujbCode = localStorage.getItem("mmUJBCode");
    if (!ujbCode) return;

    const q = query(
      collection(db, "ccredemption"),
      where("requestedBy", "==", ujbCode)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMyRequests(data);
    });

    return () => unsubscribe();
  }, []);

  /* ================= ACCEPT AGREEMENT ================= */
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

  /* ================= PREVENT DUPLICATE ================= */
  const isDuplicate = () => {
    return myRequests.some(
      (req) =>
        req.status === "Requested" &&
        req.mode === mode &&
        (mode === "all" ||
          req.selectedItem?.name === selectedItem?.name)
    );
  };

  /* ================= SUBMIT ================= */
  const submitRequest = async () => {
    if (!mode) {
      Swal.fire("Error", "Select Mode", "error");
      return;
    }

    if (mode === "single" && !selectedItem) {
      Swal.fire("Error", "Select Product/Service", "error");
      return;
    }

    if (!offerType) {
      Swal.fire("Error", "Select Offer Type", "error");
      return;
    }

    if (
      (offerType === "percent" || offerType === "rs") &&
      !discountValue
    ) {
      Swal.fire("Error", "Enter Discount Value", "error");
      return;
    }

    if (offerType === "other" && !customText) {
      Swal.fire("Error", "Enter Custom Offer", "error");
      return;
    }

    if (isDuplicate()) {
      Swal.fire(
        "Already Requested",
        "You already have a pending request",
        "warning"
      );
      return;
    }

    await addDoc(collection(db, "ccredemption"), {
      requestedBy: user.ujbCode,
      cosmo: user,
      mode,
      selectedItem: mode === "single" ? selectedItem : null,
      offerType,
      discountValue:
        offerType === "percent" || offerType === "rs"
          ? Number(discountValue)
          : null,
      customText:
        offerType === "other" ? customText : null,
      status: "Requested",
      createdAt: serverTimestamp(),
    });

    Swal.fire("Submitted", "Request sent to admin", "success");

    setMode("");
    setSelectedItem(null);
    setOfferType("");
    setDiscountValue("");
    setCustomText("");
  };

  /* ================= AGREEMENT PAGE ================= */
  if (!agreementAccepted) {
    return (
      <main className="pageContainer">
        <Headertop />
        <section className="HomepageMain">
          <div className="container pageHeading">
            <h1>CC Redemption Agreement</h1>
          </div>

          <div className="container loginInput">
            <p>
              By accepting this agreement, you agree
              to provide genuine offers and honor
              the mentioned discounts.
            </p>

            <button className="login" onClick={acceptAgreement}>
              Accept Agreement
            </button>
          </div>

          <HeaderNav />
        </section>
      </main>
    );
  }

  /* ================= MAIN ================= */
  return (
    <main className="pageContainer">
      <Headertop />
      <section className="HomepageMain">
        <div className="container pageHeading">
          <h1>CC Redemption</h1>
        </div>

        {/* MODE */}
        <div className="container loginInput">
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value)}
          >
            <option value="">Select Mode</option>
            <option value="single">Single Product</option>
            <option value="all">All Products</option>
          </select>
        </div>

        {/* SERVICE + PRODUCT LIST */}
        {mode && (
          <div className="project-summary">
            {[...services, ...products].map((item, i) => (
              <div
                key={i}
                className={`summary-card ${
                  mode === "single" &&
                  selectedItem?.name === item.name
                    ? "completed"
                    : "on-hold"
                }`}
                onClick={() =>
                  mode === "single" &&
                  setSelectedItem(item)
                }
                style={{
                  cursor:
                    mode === "single"
                      ? "pointer"
                      : "default",
                  opacity:
                    mode === "all" ? 0.6 : 1,
                }}
              >
                <h3>{item.name}</h3>
                <p>{item.type}</p>
                <p>₹ {item.agreedValue}</p>
              </div>
            ))}
          </div>
        )}

        {/* OFFER SECTION */}
        {mode && (
          <div className="container loginInput">
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

            {(offerType === "percent" ||
              offerType === "rs") && (
              <input
                type="number"
                placeholder="Enter Value"
                value={discountValue}
                onChange={(e) =>
                  setDiscountValue(e.target.value)
                }
              />
            )}

            {offerType === "other" && (
              <input
                type="text"
                placeholder="Enter Custom Offer"
                value={customText}
                onChange={(e) =>
                  setCustomText(e.target.value)
                }
              />
            )}

            <button
              className="login"
              onClick={submitRequest}
            >
              Submit
            </button>
          </div>
        )}

        {/* PREVIOUS REQUESTS */}
        <section className="container">
          <h2>My CC Requests</h2>

          {myRequests.map((req) => (
            <div key={req.id} className="summary-card on-hold">
              <h3>
                {req.mode === "all"
                  ? "All Products"
                  : req.selectedItem?.name}
              </h3>
              <p>{req.offerType}</p>
              {req.discountValue && (
                <p>{req.discountValue}</p>
              )}
              {req.customText && <p>{req.customText}</p>}
              <strong>Status: {req.status}</strong>
            </div>
          ))}
        </section>

        <HeaderNav />
      </section>
    </main>
  );
};

export default CCRedemption;
