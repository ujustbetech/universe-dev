"use client";

import React, { useEffect, useState } from "react";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  getDoc,
} from "firebase/firestore";
import { app } from "../firebaseConfig";
import Headertop from "../component/Header";
import HeaderNav from "../component/HeaderNav";
import { COLLECTIONS } from "/utility_collection";
import "../src/app/styles/user.scss";

const db = getFirestore(app);

const UserPayments = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userUJB, setUserUJB] = useState("");
  const [role, setRole] = useState(""); // Orbiter / CosmoOrbiter / UJustBe
  const [totalReceived, setTotalReceived] = useState(0);

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        setLoading(true);

        // ⭐ Read logged in UJB Code
        const storedUJB =
          typeof window !== "undefined"
            ? localStorage.getItem("mmUJBCode")
            : null;

        if (!storedUJB) {
          setLoading(false);
          return;
        }

        setUserUJB(storedUJB);

        // ⭐ Determine Role (Orbiter / CosmoOrbiter / UJustBe)
        const userRef = doc(db, "usersdetail", storedUJB);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          console.warn("User not found in usersdetail:", storedUJB);
          setLoading(false);
          return;
        }

        const userData = userSnap.data();

        // We derive role based on Category
        const category = (userData?.Category || "").toLowerCase();

        let detectedRole = "";
        if (category.includes("orbiter") && !category.includes("cosmo")) {
          detectedRole = "Orbiter";
        } else if (
          category.includes("cosmo") ||
          category.includes("cosmoorbiter")
        ) {
          detectedRole = "CosmoOrbiter";
        } else if (category.includes("ujustbe") || category === "admin") {
          detectedRole = "UJustBe";
        }

        setRole(detectedRole);

        // ⭐ Fetch all referral docs (we filter in frontend)
        const referralCol = collection(db, COLLECTIONS.referral);
        const q = query(referralCol, orderBy("timestamp", "desc"));
        const snap = await getDocs(q);

        let collectedPayments = [];

        snap.forEach((docSnap) => {
          const data = docSnap.data();
          const orbiterUjb = data?.orbiter?.ujbCode;
          const cosmoUjb = data?.cosmoOrbiter?.ujbCode;

          // ⭐ Determine logged-in user's side
          const userIsOrbiter = storedUJB === orbiterUjb;
          const userIsCosmo = storedUJB === cosmoUjb;
          const userIsUJB = detectedRole === "UJustBe";

          if (!Array.isArray(data.payments)) return;

          data.payments.forEach((p) => {
            // ⭐ Convert Firestore timestamp if needed
            let formattedDate = "N/A";
            if (p.paymentDate) {
              if (p.paymentDate.toDate) {
                formattedDate = p.paymentDate.toDate().toLocaleDateString("en-GB");
              } else if (!isNaN(new Date(p.paymentDate))) {
                formattedDate = new Date(p.paymentDate).toLocaleDateString("en-GB");
              }
            }

            // ⭐ MATCH LOGIC (Option A)
            const isSender =
              (userIsOrbiter && p.paymentFrom === "Orbiter") ||
              (userIsCosmo && p.paymentFrom === "CosmoOrbiter") ||
              (userIsUJB && p.paymentFrom === "UJustBe");

            const isReceiver =
              (userIsOrbiter && p.paymentTo === "Orbiter") ||
              (userIsCosmo && p.paymentTo === "CosmoOrbiter") ||
              (userIsUJB && p.paymentTo === "UJustBe");

            if (isSender || isReceiver) {
              collectedPayments.push({
                referralId: p.referralId || docSnap.id,
                paymentFrom: p.paymentFrom || "-",
                paymentFromName: p.paymentFromName || "-",
                paymentTo: p.paymentTo || "-",
                paymentToName: p.paymentToName || "-",
                amountReceived: Number(p.amountReceived) || 0,
                adjustedAmount: Number(p.adjustedAmount) || 0,
                actualReceived: Number(p.actualReceived) || 0,
                modeOfPayment: p.modeOfPayment || "-",
                paymentDate: formattedDate,
                feeType: p.feeType || "-",
                transactionRef: p.transactionRef || "-",
              });
            }
          });
        });

        // ⭐ Calculate total amount correctly
        const total = collectedPayments.reduce(
          (sum, p) => sum + (p.actualReceived || 0),
          0
        );

        setTotalReceived(total);
        setPayments(collectedPayments);
      } catch (error) {
        console.error("Error fetching payments:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, []);

  return (
    <main className="pageContainer">
      <Headertop />

      <section className="dashBoardMain">
        <div className="sectionHeadings">
          <h2>My Payments</h2>

          {payments.length > 0 && (
            <div className="totalSummary">
              <p>
                <strong>Total Amount:</strong> ₹{totalReceived.toLocaleString()}
              </p>
            </div>
          )}
        </div>

        <div className="container eventList">
          {loading ? (
            <div className="loader">
              <span className="loader2"></span>
            </div>
          ) : payments.length === 0 ? (
            <p className="noDataText">No payment records found.</p>
          ) : (
            payments.map((pay, index) => (
              <div key={index} className="referralBox">
                <div className="boxHeader">
                  <div className="statuslabel">
                    <span className="meetingLable">{pay.feeType}</span>
                  </div>

                  <div className="referralDetails">
                    <abbr>Referral ID: {pay.referralId}</abbr>
                    <abbr>Date: {pay.paymentDate}</abbr>
                  </div>
                </div>

                <div className="cosmoCard-info">
                  <p className="cosmoCard-category">
                    From: {pay.paymentFromName} → To: {pay.paymentToName}
                  </p>
                  <h3 className="cosmoCard-owner">
                    ₹{pay.amountReceived.toLocaleString()}
                  </h3>

                  <ul className="cosmoCard-contactDetails">
                    <li>Adjusted: ₹{pay.adjustedAmount}</li>
                    <li>Actual Received: ₹{pay.actualReceived}</li>
                    <li>Mode: {pay.modeOfPayment}</li>
                    <li>Transaction Ref: {pay.transactionRef}</li>
                  </ul>
                </div>
              </div>
            ))
          )}
        </div>

        <HeaderNav />
      </section>
    </main>
  );
};

export default UserPayments;
