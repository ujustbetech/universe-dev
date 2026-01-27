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

  /**
   * PAY FROM UJB
   * ─────────────────────────────
   * amount        = NET paid to person
   * logicalAmount = GROSS (slot completion)
   * tdsAmount     = TDS withheld
   */
  const payFromSlot = async ({
    recipient,
    amount,          // NET
    logicalAmount,   // GROSS ✅
    tdsAmount,       // TDS ✅
    fromPaymentId,
    modeOfPayment,
    transactionRef,
    paymentDate,
    adjustmentMeta,
  }) => {
    if (!referralId) return { error: "Referral ID missing" };
    if (!fieldMap[recipient]) return { error: "Invalid recipient" };
    if (isSubmitting) return { error: "Payout already in progress" };

    const netAmount = Number(amount || 0);
    const grossAmount = Number(logicalAmount || 0);
    const tds = Number(tdsAmount || 0);

    if (netAmount < 0 || grossAmount < 0 || tds < 0) {
      return { error: "Invalid payout values" };
    }

    const balance = getBalance();
    if (netAmount > balance) {
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
        amountReceived: netAmount, // ✅ NET
        paymentDate,
        modeOfPayment,
        transactionRef,
        createdAt: Timestamp.now(),

        meta: {
          isUjbPayout: true,
          slot: recipient,
          belongsToPaymentId: fromPaymentId || null,

          // 🔥 CRITICAL FIELDS (DO NOT REMOVE)
          logicalAmount: grossAmount,
          tdsAmount: tds,

          adjustment: adjustmentMeta || null,
        },
      };

      // Remove ONLY undefined (keep 0 values)
      Object.keys(entry).forEach(
        (k) => entry[k] === undefined && delete entry[k]
      );

      await updateDoc(doc(db, COLLECTIONS.referral, referralId), {
        ujbBalance: increment(-netAmount),              // NET only
        payments: arrayUnion(entry),
        [fieldMap[recipient]]: increment(grossAmount), // ✅ GROSS credited
      });

      // Local optimistic update
      onPaymentsUpdate?.((prev = []) => [...prev, entry]);

      return { success: true };
    } catch (err) {
      console.error("UJB payout error:", err);
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