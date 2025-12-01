// src/hooks/useUjbDistribution.js
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

  const getBalance = () => Number(referralData?.ujbBalance || 0);

  const recipientNameMap = {
    Orbiter: orbiter?.name || "Orbiter",
    OrbiterMentor: orbiter?.mentorName || "Orbiter Mentor",
    CosmoMentor: cosmoOrbiter?.mentorName || "Cosmo Mentor",
  };

  /**
   * payFromSlot
   * recipient: "Orbiter" | "OrbiterMentor" | "CosmoMentor"
   * amount: cash amount UJB will pay
   * logicalAmount: how much to increment paidToX by (defaults to amount)
   * modeOfPayment, transactionRef, paymentDate: extra payment details
   * extraMeta: extra info added to entry.meta (e.g. adjustment details)
   */
  const payFromSlot = async ({
    recipient,
    amount,
    fromPaymentId,
    logicalAmount,
    modeOfPayment,
    transactionRef,
    paymentDate,
    extraMeta,
  }) => {
    const amt = Number(amount || 0);
    const logical = Number(
      logicalAmount !== undefined ? logicalAmount : amount || 0
    );

    if (!referralId) return { error: "Referral ID missing" };
    if (amt <= 0 || logical <= 0) return { error: "Invalid amount" };

    const currentBalance = getBalance();
    if (amt > currentBalance) {
      return { error: "Insufficient UJB balance" };
    }

    if (!recipientNameMap[recipient]) {
      return { error: "Invalid recipient" };
    }

    const paymentId = `UJB-PAYOUT-${Date.now()}`;

    const entry = {
      paymentId,
      paymentFrom: "UJustBe",
      paymentTo: recipient,
      paymentToName: recipientNameMap[recipient],
      amountReceived: amt,
      createdAt: Timestamp.now(),
      paymentDate:
        paymentDate || new Date().toISOString().split("T")[0],
      modeOfPayment: modeOfPayment || "Internal",
      transactionRef: transactionRef || "",
      meta: {
        isUjbPayout: true,
        belongsToPaymentId: fromPaymentId,
        ...(extraMeta || {}),
      },
    };

    setIsSubmitting(true);

    try {
      const ref = doc(db, COLLECTIONS.referral, referralId);

      const updateObj = {
        ujbBalance: increment(-amt),
        payments: arrayUnion(entry),
      };

      const fieldMap = {
        Orbiter: "paidToOrbiter",
        OrbiterMentor: "paidToOrbiterMentor",
        CosmoMentor: "paidToCosmoMentor",
      };

      const field = fieldMap[recipient];
      if (field) {
        updateObj[field] = increment(logical);
      }

      await updateDoc(ref, updateObj);

      onPaymentsUpdate([...(payments || []), entry]);
      setIsSubmitting(false);
      return { success: true };
    } catch (err) {
      console.error("UJB payout error:", err);
      setIsSubmitting(false);
      return { error: "Failed to process payout" };
    }
  };

  return {
    isSubmitting,
    ujbBalance: getBalance(),
    payFromSlot,
  };
}
