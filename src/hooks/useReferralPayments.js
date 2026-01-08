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

/* ===================== CONSTANTS ===================== */

const TDS_RESIDENT = 0.05; // 5%
const TDS_NRI = 0.20;      // 20%

const round2 = (n) => Math.round(n * 100) / 100;

/* ===================== HELPERS ===================== */

const calculateTDS = (gross, payeeType = "resident") => {
  const rate = payeeType === "nri" ? TDS_NRI : TDS_RESIDENT;
  const g = Number(gross || 0);
  const tds = Math.max(0, round2(g * rate));
  const net = round2(g - tds);

  return {
    gross: g,
    tds,
    net,
    ratePercent: rate * 100,
  };
};

/* ===================== HOOK ===================== */

export default function useReferralPayments({
  id,
  referralData,
  payments,
  setPayments,
  dealLogs,
}) {
  const [showAddPaymentForm, setShowAddPaymentForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /* ===================== SAFE PAYMENTS ===================== */

  const safePayments = useMemo(() => {
    if (Array.isArray(payments)) return payments;
    if (payments && typeof payments === "object")
      return Object.values(payments);
    return [];
  }, [payments]);

  /* ===================== AGREED & PAID ===================== */

 const agreedAmount = useMemo(() => {
  if (!Array.isArray(dealLogs) || dealLogs.length === 0) return 0;
  const lastDeal = dealLogs[dealLogs.length - 1];
  return Number(lastDeal?.agreedAmount || 0);
}, [dealLogs]);

 const cosmoPaid = safePayments
  .filter(p => p?.meta?.isCosmoToUjb)
  .reduce(
    (s, p) =>
      s + Number(p?.grossAmount ?? p?.amountReceived ?? 0),
    0
  );


  const agreedRemaining = Math.max(agreedAmount - cosmoPaid, 0);

  /* ===================== DISTRIBUTION ===================== */

  const calculateDistribution = (amount) => {
    if (!Array.isArray(dealLogs) || dealLogs.length === 0) return null;

    const deal = dealLogs[dealLogs.length - 1];
    if (!deal?.agreedAmount) return null;

    const ratio = Number(amount) / Number(deal.agreedAmount || 1);

    return {
      orbiter: round2((deal.orbiterShare || 0) * ratio),
      orbiterMentor: round2((deal.orbiterMentorShare || 0) * ratio),
      cosmoMentor: round2((deal.cosmoMentorShare || 0) * ratio),
      ujustbe: round2((deal.ujustbeShare || 0) * ratio),
    };
  };

  /* ===================== COSMO → UJB ===================== */

  const [newPayment, setNewPayment] = useState({
    amountReceived: "",
    modeOfPayment: "",
    transactionRef: "",
    paymentDate: "",

    // TDS control (admin)
    tdsDeducted: false,
    tdsRate: 10, // %
  });

  const updateNewPayment = (key, value) =>
    setNewPayment((p) => ({ ...p, [key]: value }));

  const openPaymentModal = () => setShowAddPaymentForm(true);
  const closePaymentModal = () => setShowAddPaymentForm(false);

  const handleSavePayment = async () => {
    if (!id || isSubmitting) return;

    const amount = Number(newPayment.amountReceived || 0);
    if (amount <= 0) return alert("Enter valid amount");
    if (!newPayment.paymentDate) return alert("Select payment date");

    const dist = calculateDistribution(amount);
    if (!dist) return alert("Distribution not available");

    const tdsRate = newPayment.tdsDeducted
      ? Number(newPayment.tdsRate || 0)
      : 0;

    const tdsAmount = Math.max(
      0,
      round2((amount * tdsRate) / 100)
    );
    const netAmount = round2(amount - tdsAmount);

    setIsSubmitting(true);

    try {
      const entry = {
        paymentId: `COSMO-${Date.now()}`,
        paymentFrom: "CosmoOrbiter",
        paymentTo: "UJustBe",

        grossAmount: amount,
        tdsAmount,
        tdsRate,
        amountReceived: netAmount,

        distribution: dist,
        paymentDate: newPayment.paymentDate,
        modeOfPayment: newPayment.modeOfPayment,
        transactionRef: newPayment.transactionRef,
        createdAt: Timestamp.now(),

        meta: {
          isCosmoToUjb: true,
          tdsDeducted: newPayment.tdsDeducted,
        },
      };

      await updateDoc(doc(db, COLLECTIONS.referral, id), {
        payments: arrayUnion(entry),
        ujbBalance: increment(netAmount),   // NET credited
        tdsReceivable: increment(tdsAmount),
      });

      setPayments((prev = []) => [...prev, entry]);
      closePaymentModal();
    } catch (err) {
      console.error(err);
      alert("Cosmo payment failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ===================== UJB → PEOPLE ===================== */

  const payFromUJB = async ({
    slot,                  // Orbiter | OrbiterMentor | CosmoMentor
    recipientName,
    logicalAmount,         // GROSS
    payeeType = "resident",// resident | nri
    fromPaymentId,
    modeOfPayment,
    transactionRef,
    paymentDate,
  }) => {
    if (!id) throw new Error("Invalid referral");

    const { gross, tds, net, ratePercent } =
      calculateTDS(logicalAmount, payeeType);

    const balance = Number(referralData?.ujbBalance || 0);
    if (net > balance) throw new Error("Insufficient UJB balance");

    const payoutEntry = {
      paymentId: `UJB-${slot}-${Date.now()}`,
      paymentFrom: "UJustBe",
      paymentTo: slot,
      paymentToName: recipientName,

      grossAmount: gross,
      tdsAmount: tds,
      tdsRate: ratePercent,
      amountReceived: net,

      paymentDate,
      modeOfPayment,
      transactionRef,
      createdAt: Timestamp.now(),

      meta: {
        isUjbPayout: true,
        slot,
        logicalAmount: gross,
        payeeType,
        belongsToPaymentId: fromPaymentId,
      },
    };

    await updateDoc(doc(db, COLLECTIONS.referral, id), {
      payments: arrayUnion(payoutEntry),
      ujbBalance: increment(-net), // NET only
      tdsPayable: increment(tds),
    });

    setPayments((prev = []) => [...prev, payoutEntry]);
    return payoutEntry;
  };

  /* ===================== EXPORT ===================== */

  return {
    agreedAmount,
    cosmoPaid,
    agreedRemaining,

    showAddPaymentForm,
    isSubmitting,
    newPayment,

    updateNewPayment,
    openPaymentModal,
    closePaymentModal,
    handleSavePayment,

    payFromUJB,
    payments: safePayments,
  };
}
