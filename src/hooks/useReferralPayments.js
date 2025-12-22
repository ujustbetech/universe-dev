// src/hooks/useReferralPayments.js
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

export default function useReferralPayments({
  id,
  referralData,
  payments,
  setPayments,
  dealLogs,
}) {
  const [showAddPaymentForm, setShowAddPaymentForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const agreedAmount = Number(referralData?.agreedTotal || 0);

  // ✅ FIX 1: Normalize payments safely (array OR object)
  const safePayments = Array.isArray(payments)
    ? payments
    : Object.values(payments || {}).flat();

  // Total Cosmo → UJB paid so far
  const cosmoPaid = safePayments
    .filter((p) => p?.paymentFrom === "CosmoOrbiter")
    .reduce((sum, p) => sum + Number(p?.amountReceived || 0), 0);

  const agreedRemaining = Math.max(agreedAmount - cosmoPaid, 0);

  const r2 = (n) => Math.round(n * 100) / 100;

  // Use latest deal log for distribution
  const calculateDistribution = (amount) => {
    const deal = dealLogs?.[dealLogs.length - 1];
    if (!deal?.agreedAmount) return null;

    const ratio = amount / Number(deal.agreedAmount || 1);

    return {
      orbiter: r2((deal.orbiterShare || 0) * ratio),
      orbiterMentor: r2((deal.orbiterMentorShare || 0) * ratio),
      cosmoMentor: r2((deal.cosmoMentorShare || 0) * ratio),
      ujustbe: r2((deal.ujustbeShare || 0) * ratio),
    };
  };

  const [newPayment, setNewPayment] = useState({
    paymentFrom: "CosmoOrbiter",
    paymentTo: "UJustBe",
    amountReceived: "",
    modeOfPayment: "",
    transactionRef: "",
    paymentDate: "",
    comment: "",
  });

  const updateNewPayment = (key, value) =>
    setNewPayment((prev) => ({ ...prev, [key]: value }));

  const openPaymentModal = () => setShowAddPaymentForm(true);
  const closePaymentModal = () => setShowAddPaymentForm(false);

  const handleSavePayment = async () => {
    if (!id || isSubmitting) return;

    const amount = Number(newPayment.amountReceived || 0);
    if (amount <= 0) {
      alert("Enter a valid amount");
      return;
    }

    if (amount > agreedRemaining) {
      alert("Amount exceeds remaining agreed amount");
      return;
    }

    if (!newPayment.paymentDate) {
      alert("Select a payment date");
      return;
    }

    const dist = calculateDistribution(amount);
    if (!dist) {
      alert("Distribution not available. Calculate deal first.");
      return;
    }

    setIsSubmitting(true);

    try {
      const paymentId = `Ref-${id}-COSMO-${Date.now()}`;

      const entry = {
        paymentId,
        paymentFrom: "CosmoOrbiter",
        paymentFromName: referralData?.cosmoOrbiter?.name || "",
        paymentTo: "UJustBe",
        paymentToName: "UJustBe",
        amountReceived: amount,
        actualReceived: amount,
        distribution: dist,
        modeOfPayment: newPayment.modeOfPayment || "",
        transactionRef: newPayment.transactionRef || "",
        comment: newPayment.comment || "",
        paymentDate: newPayment.paymentDate,
        createdAt: Timestamp.now(),
        remainingAfter: agreedRemaining - amount,
        meta: {
          isCosmoToUjb: true,
          isPartial: amount < agreedRemaining,
          partialRemainingBefore: agreedRemaining,
          partialRemainingAfter: agreedRemaining - amount,
        },
      };

      // 🔒 Remove undefined (Firestore safe)
      Object.keys(entry).forEach((k) => {
        if (entry[k] === undefined) delete entry[k];
      });

      await updateDoc(doc(db, COLLECTIONS.referral, id), {
        payments: arrayUnion(entry),
        agreedRemaining: increment(-amount),
        cosmoPaid: increment(amount),
        ujbBalance: increment(amount),
      });

      /**
       * ✅ FIX 2: DO NOT manually reshape payments
       * Firestore snapshot will update payments correctly
       */
      setPayments((prev) => prev);

      closePaymentModal();
    } catch (err) {
      console.error("Payment save failed:", err);
      alert("Error saving payment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    agreedAmount,
    cosmoPaid,
    agreedRemaining,
    showAddPaymentForm,
    newPayment,
    isSubmitting,
    updateNewPayment,
    openPaymentModal,
    closePaymentModal,
    handleSavePayment,
  };
}
