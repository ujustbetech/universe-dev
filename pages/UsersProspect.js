"use client";
import React, { useEffect, useState } from "react";
import { db } from "../firebaseConfig";
import { collection, query, where, getDocs } from "firebase/firestore";
import "../src/app/styles/user.scss";

const UserProspects = () => {
  const [prospects, setProspects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userPhone, setUserPhone] = useState("");

  useEffect(() => {
    const storedPhone = localStorage.getItem("mmOrbiter"); // ⭐ YOUR LOCAL STORAGE VARIABLE
    if (!storedPhone) return;

    setUserPhone(storedPhone.replace("+91", "").trim());

    const fetchProspects = async () => {
      try {
        const prospectRef = collection(db, "Prospects");

        const q = query(
          prospectRef,
          where("orbiterContact", "==", storedPhone.trim())
        );

        const snap = await getDocs(q);

        const data = snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setProspects(data);
      } catch (err) {
        console.log("Prospect fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProspects();
  }, []);

  return (
    <main className="pageContainer">
      {/* -------- HEADER -------- */}
      <header className="Main m-Header">
        <section className="container">
          <div className="innerLogo">
            <img src="/ujustlogo.png" alt="Logo" className="logo" />
          </div>
        </section>
      </header>

      {/* -------- LIST AREA -------- */}
      <section className="dashBoardMain">
        <div className="container">
          <div className="step-form-container">
            <h3 className="formtitle">Your Prospects</h3>
            <h2>These prospects were registered using your mobile number.</h2>

            {loading ? (
              <p className="loading-text">Loading...</p>
            ) : prospects.length === 0 ? (
              <p className="loading-text">No prospects found.</p>
            ) : (
              <div className="prospect-list">
                {prospects.map((p, index) => (
                  <div className="prospect-card" key={p.id}>
                    <div className="left-area">
                      <h3>
                        {index + 1}. {p.prospectName}
                      </h3>

                      <p>
                        <strong>Phone:</strong> {p.prospectPhone}
                      </p>

                      <p>
                        <strong>Status:</strong>{" "}
                        {p.sections?.[0]?.status || "Not Updated"}
                      </p>

                      <p>
                        <strong>Type:</strong> {p.sections?.[0]?.type || "-"}
                      </p>

                      <p>
                        <strong>Registered At:</strong>{" "}
                        {p.registeredAt?.toDate?.().toLocaleString() || "-"}
                      </p>
                    </div>

                    <div className="right-area">
                      <button
                        className="save-button"
                        onClick={() =>
                          window.location.href = `/prospectform/${p.id}`
                        }
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <h2 className="footers">Copyright @2025 | Powered by UJustBe</h2>
        </div>
      </section>
    </main>
  );
};

export default UserProspects;
