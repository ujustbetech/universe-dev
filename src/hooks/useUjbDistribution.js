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

  const payFromSlot = async ({
    recipient,
    amount, // CASH ONLY (can be 0)
    fromPaymentId,
    modeOfPayment,
    transactionRef,
    paymentDate,
    adjustmentMeta,
  }) => {
    if (!referralId) return { error: "Referral ID missing" };

    const cashAmount = Number(amount ?? 0);
    if (cashAmount < 0) return { error: "Invalid amount" };

    if (!fieldMap[recipient]) return { error: "Invalid recipient" };
    if (isSubmitting) return { error: "Payout in progress" };

    const balance = getBalance();
    if (cashAmount > balance) {
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
        amountReceived: cashAmount,
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

      // 🔒 Remove undefined (prevents arrayUnion error)
      Object.keys(entry).forEach(
        (k) => entry[k] === undefined && delete entry[k]
      );

      await updateDoc(
        doc(db, COLLECTIONS.referral, referralId),
        {
          ujbBalance: increment(-cashAmount),
          payments: arrayUnion(entry),
          [fieldMap[recipient]]: increment(cashAmount),
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
