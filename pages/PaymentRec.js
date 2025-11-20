'use client';

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
import { COLLECTIONS } from "/utility_collection";
import HeaderNav from "../component/HeaderNav";
import "../src/app/styles/user.scss";

const db = getFirestore(app);

const UserPayments = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userUJB, setUserUJB] = useState("");
  const [userCategory, setUserCategory] = useState("");
  const [totalReceived, setTotalReceived] = useState(0);

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        setLoading(true);

        const storedUJB =
          typeof window !== "undefined" ? localStorage.getItem("mmUJBCode") : null;

        if (!storedUJB) {
          console.warn("⚠️ UJB code not found in localStorage");
          setLoading(false);
          return;
        }

        setUserUJB(storedUJB);

        // ✅ Fetch user category from usersdetail
        const userDocRef = doc(db, "usersdetail", storedUJB);
        const userSnap = await getDoc(userDocRef);

        if (!userSnap.exists()) {
          console.warn("⚠️ User not found in usersdetail:", storedUJB);
          setLoading(false);
          return;
        }

        const userData = userSnap.data();
        const category = userData?.Category || "";
        setUserCategory(category);

        // ✅ Fetch payments from Referraldev
        const referralCol = collection(db,COLLECTIONS.referral);
        const q = query(referralCol, orderBy("timestamp", "desc"));
        const snap = await getDocs(q);

        const userPayments = [];

        snap.forEach((docSnap) => {
          const data = docSnap.data();
          const orbiterUjb = data?.orbiter?.ujbCode;
          const cosmoUjb = data?.cosmoOrbiter?.ujbCode;

          if (storedUJB === orbiterUjb || storedUJB === cosmoUjb) {
            if (Array.isArray(data.payments)) {
              data.payments.forEach((p) => {
                const isReceiver = p.paymentTo === category;
                const isSender = p.paymentFrom === category;

                if (isReceiver || isSender) {
                  userPayments.push({
                    referralId: p.referralId || docSnap.id,
                    paymentFrom: p.paymentFrom || "-",
                    paymentFromName: p.paymentFromName || "-",
                    paymentTo: p.paymentTo || "-",
                    paymentToName: p.paymentToName || "-",
                    amountReceived: Number(p.amountReceived) || 0,
                    adjustedAmount: Number(p.adjustedAmount) || 0,
                    actualReceived: Number(p.actualReceived) || 0,
                    modeOfPayment: p.modeOfPayment || "-",
                    paymentDate:
                      p.paymentDate instanceof Date
                        ? p.paymentDate.toLocaleDateString("en-GB")
                        : p.paymentDate || "-",
                    feeType: p.feeType || "-",
                    transactionRef: p.transactionRef || "-",
                  });
                }
              });
            }
          }
        });

        // ✅ Calculate total received amount
        const totalReceivedAmt = userPayments.reduce(
          (sum, p) => sum + (p.actualReceived || 0) + (p.adjustedAmount || 0),
          0
        );

        setTotalReceived(totalReceivedAmt);
        setPayments(userPayments);
      } catch (error) {
        console.error("❌ Error fetching payments:", error);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchPayments, 300);
    return () => clearTimeout(timer);
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
          ) : (
            (() => {
              // ✅ Filter out payments with 0 amount
              const filteredPayments = payments.filter(
                (pay) => pay.amountReceived > 0 || pay.actualReceived > 0
              );

              return filteredPayments.length === 0 ? (
                <p className="noDataText">No payment records found.</p>
              ) : (
                filteredPayments.map((pay, index) => (
                  <div key={index} className="referralBox">
                    <div className="boxHeader">
                      <div className="statuslabel">
                        <span className="meetingLable">{pay.feeType}</span>
                      </div>
                      <div className="referralDetails">
                        <abbr>Referral ID: {pay.referralId}</abbr>
                     <abbr>
  Date:{" "}
  {pay.paymentDate
    ? new Date(pay.paymentDate).toLocaleDateString("en-GB") // dd/mm/yyyy
    : "N/A"}
</abbr>

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
                        <li>Adjusted: ₹{pay.adjustedAmount || 0}</li>
                        <li>Actual Received: ₹{pay.actualReceived || 0}</li>
                        <li>Mode: {pay.modeOfPayment}</li>
                        <li>Transaction Ref: {pay.transactionRef}</li>
                      </ul>
                    </div>
                  </div>
                ))
              );
            })()
          )}
        </div>

        <HeaderNav />
      </section>
    </main>
  );
};

export default UserPayments;
