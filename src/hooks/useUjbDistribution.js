import { useState } from "react";
import {
  doc,
  updateDoc,
  Timestamp,
  arrayUnion,
  increment,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { COLLECTIONS } from "../../utility_collection";

/* ===================== TDS CONFIG ===================== */

const TDS_RATE = 0.05;

const applyTDS = (grossAmount) => {
  const gross = Number(grossAmount || 0);
  const tds = Math.round(gross * TDS_RATE * 100) / 100;
  const net = Math.round((gross - tds) * 100) / 100;
  return { gross, tds, net };
};

export function useUjbDistribution({
  referralId,
  referralData,
  payments,
  onPaymentsUpdate,
  orbiter,
  cosmoOrbiter,
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const getBalance = () => Number(referralData?.ujbBalance || 0);

  const recipientNameMap = {
    Orbiter: orbiter?.name || "Orbiter",
    OrbiterMentor: orbiter?.mentorName || "Orbiter Mentor",
    CosmoMentor: cosmoOrbiter?.mentorName || "Cosmo Mentor",
  };

  const fieldMap = {
    Orbiter: "paidToOrbiter",
    OrbiterMentor: "paidToOrbiterMentor",
    CosmoMentor: "paidToCosmoMentor",
  };

  /* ===================== PAYOUT WITH TDS ===================== */

  const payFromSlot = async ({
    recipient,
    amount, // 👈 GROSS AMOUNT
    fromPaymentId,
    modeOfPayment,
    transactionRef,
    paymentDate,
    adjustmentMeta,
  }) => {
    if (!referralId) return { error: "Referral ID missing" };
    if (!fieldMap[recipient]) return { error: "Invalid recipient" };
    if (isSubmitting) return { error: "Payout in progress" };

    const grossAmount = Number(amount ?? 0);
    if (grossAmount < 0) return { error: "Invalid amount" };

    // ✅ APPLY TDS HERE
    const { gross, tds, net } = applyTDS(grossAmount);

    const balance = getBalance();
    if (net > balance) {
      return { error: "Insufficient UJB balance" };
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const paymentId = `UJB-PAYOUT-${Date.now()}`;

      const entry = {
        paymentId,
        paymentFrom: "UJustBe",
        paymentTo: recipient,
        paymentToName: recipientNameMap[recipient],
        grossAmount: gross,          // 👈 BEFORE TDS
        tdsAmount: tds,              // 👈 TDS AMOUNT
        tdsRate: 5,
        amountReceived: net,         // 👈 NET PAID (e.g. 114)
        createdAt: Timestamp.now(),
        paymentDate:
          paymentDate || new Date().toISOString().split("T")[0],
        modeOfPayment: modeOfPayment || "Internal",
        transactionRef: transactionRef || "",
        meta: {
          isUjbPayout: true,
          belongsToPaymentId: fromPaymentId || null,
          slot: recipient,
          ...(adjustmentMeta ? { adjustment: adjustmentMeta } : {}),
        },
      };

      // 🔒 Firestore safe
      Object.keys(entry).forEach(
        (k) => entry[k] === undefined && delete entry[k]
      );

      await updateDoc(
        doc(db, COLLECTIONS.referral, referralId),
        {
          // ✅ NET deducted from UJB
          ujbBalance: increment(-net),

          // ✅ TDS tracked separately
          tdsPayable: increment(tds),

          // ✅ NET added to paidTo*
          [fieldMap[recipient]]: increment(net),

          payments: arrayUnion(entry),
        }
      );

      // 🔒 SAFE local update
      onPaymentsUpdate?.((prev) =>
        Array.isArray(prev) ? [...prev, entry] : [entry]
      );

      return { success: true };
    } catch (err) {
      console.error(err);
      setError("Payout failed");
      return { error: "Payout failed" };
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isSubmitting,
    error,
    ujbBalance: getBalance(),
    payFromSlot,
  };
}
