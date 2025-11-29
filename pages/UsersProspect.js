"use client";
import React, { useEffect, useState } from "react";
import { db } from "../firebaseConfig";
import Link from 'next/link'
import { COLLECTIONS } from "/utility_collection";
import { useRouter } from "next/router";
import { collection, query, where, getDocs } from "firebase/firestore";
import "../src/app/styles/user.scss";
import HeaderNav from "../component/HeaderNav";
import Headertop from "../component/Header";

const UserProspects = () => {
  const router = useRouter();
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
      <Headertop />

      {/* -------- LIST AREA -------- */}
      <section className="dashBoardMain">


        <div className='sectionHeadings'>
          <h2>Your Prospects</h2>

          <button
            className="m-button"
            onClick={() => router.push('/IntroProspect')}
          >
            + Add Prospect
          </button>
        </div>




        {loading ? (
          <div className="loader">
            <span className="loader2"></span>
          </div>
        ) : prospects.length === 0 ? (
          <p className="loading-text">No prospects found.</p>
        ) : (
          <div className="container eventList">
            {prospects.map((p, index) => {
              const status = p.sections?.[0]?.status || "Not Updated";
              const type = p.sections?.[0]?.type || "-";
              const regDate = p.registeredAt?.toDate?.().toLocaleString("en-GB") || "-";

              return (
                <Link
                  href={`/prospectform/${p.id}`}
                  key={p.id}
                  className="meetingBoxLink"
                >
                  <div className="meetingBox">

                    {/* ---- TOP LABEL (STATUS) ---- */}
                    <div className="suggestionDetails">
                      <span className="meetingLable3">{status}</span>

                      <span className="suggestionTime">{regDate}</span>
                    </div>

                    {/* ---- MAIN NAME ---- */}
                    <div className="meetingDetails">
                      <h3 className="eventName">
                        {index + 1}. {p.prospectName}
                      </h3>
                    </div>

                    {/* ---- FOOTER ---- */}
                    <div className="meetingBoxFooter">
                      <div className="viewDetails">
                        <Link href={`/prospectform/${p.id}`}>View Details</Link>
                      </div>

                      <button
                        className="register-now-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.location.href = `/prospectform/${p.id}`;
                        }}
                      >

                      </button>
                    </div>

                  </div>
                </Link>
              );
            })}
          </div>

        )}




        <HeaderNav />
      </section>
    </main>
  );
};

export default UserProspects;
