// src/hooks/useUjbDistribution.js
import { useState, useCallback } from "react";
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
    Orbiter: orbiter?.name || orbiter?.Name || "Orbiter",
    OrbiterMentor:
      orbiter?.mentorName || orbiter?.MentorName || "Orbiter Mentor",
    CosmoMentor:
      cosmoOrbiter?.mentorName || cosmoOrbiter?.MentorName || "Cosmo Mentor",
  };

  /**
   * payFromSlot
   * recipient: "Orbiter" | "OrbiterMentor" | "CosmoMentor"
   * amount: cash amount UJB will pay
   * logicalAmount: how much to increment paidToX by (defaults to amount)
   * extraMeta: additional metadata (e.g. adjustment info)
   */
  const payFromSlot = useCallback(
    async ({
      recipient,
      amount,
      fromPaymentId,
      logicalAmount,
      modeOfPayment,
      transactionRef,
      paymentDate,
      extraMeta,
    }) => {
      if (!referralId) return { error: "Referral ID missing" };

      const amt = Math.max(0, Number(amount) || 0);
      const logical = Math.max(
        0,
        Number(logicalAmount !== undefined ? logicalAmount : amt) || 0
      );

      if (amt <= 0 || logical <= 0) {
        return { error: "Invalid amount" };
      }

      const currentBalance = getBalance();
      if (amt > currentBalance) {
        return { error: "Insufficient UJB balance" };
      }

      if (!recipientNameMap[recipient]) {
        return { error: "Invalid recipient" };
      }

      const todayStr = new Date().toISOString().split("T")[0];
      const safeDate =
        paymentDate && !isNaN(Date.parse(paymentDate))
          ? paymentDate
          : todayStr;

      if (isSubmitting) {
        return { error: "Payout already in progress" };
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
          amountReceived: amt,
          createdAt: Timestamp.now(),
          paymentDate: safeDate,
          modeOfPayment: modeOfPayment || "Internal",
          transactionRef: transactionRef || "",
          meta: {
            isUjbPayout: true,
            belongsToPaymentId: fromPaymentId || null,
            ...(extraMeta || {}),
          },
        };

        const updatePayload = {
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
          updatePayload[field] = increment(logical);
        }

        await updateDoc(doc(db, COLLECTIONS.referral, referralId), updatePayload);

        if (typeof onPaymentsUpdate === "function") {
          onPaymentsUpdate((prev) => {
            const arr = Array.isArray(prev) ? [...prev] : [];
            return [...arr, entry];
          });
        }

        setIsSubmitting(false);
        return { success: true };
      } catch (err) {
        console.error("UJB payout error:", err);
        setIsSubmitting(false);
        setError(err?.message || "Failed to process payout");
        return { error: "Failed to process payout" };
      }
    },
    [referralId, referralData, orbiter, cosmoOrbiter, onPaymentsUpdate]
  );

  return {
    isSubmitting,
    error,
    ujbBalance: getBalance(),
    payFromSlot,
  };
}
