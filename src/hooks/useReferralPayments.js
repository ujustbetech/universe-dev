// src/hooks/useReferralPayments.js
import { useState, useMemo } from "react";
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

  /* ===================== SAFETY FIX ===================== */

  const safePayments = useMemo(() => {
    if (Array.isArray(payments)) return payments;
    if (payments && typeof payments === "object") return Object.values(payments);
    return [];
  }, [payments]);

  /* ===================== AMOUNTS ===================== */

  const agreedAmount = Number(referralData?.agreedTotal || 0);

  const cosmoPaid = safePayments
    .filter((p) => p?.paymentFrom === "CosmoOrbiter")
    .reduce((sum, p) => sum + Number(p?.amountReceived || 0), 0);

  const agreedRemaining = Math.max(agreedAmount - cosmoPaid, 0);

  const r2 = (n) => Math.round(n * 100) / 100;

  /* ===================== TDS ===================== */

  const TDS_RATE = 0.05;

  const deductTDS = (amount) => {
    const gross = Number(amount || 0);
    const tds = r2(gross * TDS_RATE);
    const net = r2(gross - tds);
    return { gross, tds, net };
  };

  /* ===================== DISTRIBUTION ===================== */

  const calculateDistribution = (amount) => {
    if (!Array.isArray(dealLogs) || dealLogs.length === 0) return null;

    const deal = dealLogs[dealLogs.length - 1];
    if (!deal?.agreedAmount) return null;

    const ratio = amount / Number(deal.agreedAmount || 1);

    return {
      orbiter: r2((deal.orbiterShare || 0) * ratio),
      orbiterMentor: r2((deal.orbiterMentorShare || 0) * ratio),
      cosmoMentor: r2((deal.cosmoMentorShare || 0) * ratio),
      ujustbe: r2((deal.ujustbeShare || 0) * ratio),
    };
  };

  /* ===================== NEW PAYMENT ===================== */

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

  /* ===================== SAVE COSMO → UJB PAYMENT ===================== */

  const handleSavePayment = async () => {
    if (!id || isSubmitting) return;

    const amount = Number(newPayment.amountReceived || 0);

    if (amount <= 0) return alert("Enter a valid amount");
    if (amount > agreedRemaining)
      return alert("Amount exceeds remaining agreed amount");
    if (!newPayment.paymentDate)
      return alert("Select a payment date");

    const dist = calculateDistribution(amount);
    if (!dist) return alert("Distribution not available");

    setIsSubmitting(true);

    try {
      const entry = {
        paymentId: `Ref-${id}-COSMO-${Date.now()}`,
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
      };

      await updateDoc(doc(db, COLLECTIONS.referral, id), {
        payments: arrayUnion(entry),
        agreedRemaining: increment(-amount),
        cosmoPaid: increment(amount),
        ujbBalance: increment(amount),
      });

      setPayments((p) => p);
      closePaymentModal();
    } catch (err) {
      console.error(err);
      alert("Payment save failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ===================== UJB PAYOUT (WITH 5% TDS) ===================== */

  const payFromUJB = async ({ to, toName, grossAmount, type }) => {
    if (!id || grossAmount <= 0) return;

    const { gross, tds, net } = deductTDS(grossAmount);

    const payoutEntry = {
      paymentId: `Ref-${id}-UJB-${type}-${Date.now()}`,
      paymentFrom: "UJustBe",
      paymentFromName: "UJustBe",
      paymentTo: to,
      paymentToName: toName || "",
      grossAmount: gross,
      tdsAmount: tds,
      tdsRate: 5,
      amountReceived: net,
      createdAt: Timestamp.now(),
      meta: {
        isTDSApplied: true,
        payoutType: type,
      },
    };

    await updateDoc(doc(db, COLLECTIONS.referral, id), {
      payments: arrayUnion(payoutEntry),
      ujbBalance: increment(-net),
      tdsPayable: increment(tds),
    });
  };

  /* ===================== EXPORT ===================== */

  return {
    agreedAmount,
    cosmoPaid,
    agreedRemaining,
    payments: safePayments,
    showAddPaymentForm,
    newPayment,
    isSubmitting,
    updateNewPayment,
    openPaymentModal,
    closePaymentModal,
    handleSavePayment,

    // TDS payout
    payFromUJB,
  };
}
