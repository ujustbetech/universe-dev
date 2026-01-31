// pages/referral/[id].js
import { useRouter } from "next/router";
import { useState } from "react";
import {
  collection,
  getDocs,
  addDoc,
  doc,
  getDoc,
  query,
  where,
  setDoc,
  serverTimestamp,
  updateDoc, arrayUnion
} from "firebase/firestore";


import { db } from "../../firebaseConfig";
import { COLLECTIONS } from "../../utility_collection";

import "../../src/app/styles/referral-ui.scss";
import "../../src/app/styles/main.scss";

import useReferralDetails from "../../src/hooks/useReferralDetails";
import useReferralPayments from "../../src/hooks/useReferralPayments";
import { useUjbDistribution } from "../../src/hooks/useUjbDistribution";
import { useReferralAdjustment } from "../../src/hooks/useReferralAdjustment";

// LEFT COLUMN CARDS
import StatusCard from "../../component/referral/StatusCard";
import ReferralInfoCard from "../../component/referral/ReferralInfoCard";
import OrbiterDetailsCard from "../../component/referral/OrbiterDetailsCard";
import CosmoOrbiterDetailsCard from "../../component/referral/CosmoOrbiterDetailsCard";
import ServiceDetailsCard from "../../component/referral/ServiceDetailsCard";
import PaymentHistory from "../../component/referral/PaymentHistory";

// RIGHT STICKY COLUMN
import FollowupList from "../../component/referral/FollowupList";
import FollowupForm from "../../component/referral/FollowupForm";

// BOTTOM PAYMENT BAR + DRAWER
import PaymentSummary from "../../component/referral/PaymentSummary";
import PaymentDrawer from "../../component/referral/PaymentDrawer";
import Layout from "../../component/Layout";

export default function ReferralDetailsPage() {
  const router = useRouter();
  const { id } = router.query || {};

  const {
    loading,
    referralData,
    orbiter,
    cosmoOrbiter,
    payments,
    setPayments,
    followups,
    formState,
    setFormState,
    dealLogs,
    dealAlreadyCalculated,
    dealEverWon,
    handleStatusUpdate,
    handleSaveDealLog,
    addFollowup,
    editFollowup,
    deleteFollowup,
    uploadLeadDoc,
  } = useReferralDetails(id);

  const payment = useReferralPayments({
    id,
    referralData,
    payments,
    setPayments,
    dealLogs,
  });
const getUjbTdsRate = (isNri) => (isNri ? 0.20 : 0.05);

const calculateUjbTDS = (gross, isNri) => {
  const g = Number(gross || 0);
  const rate = getUjbTdsRate(isNri);
  const tds = Math.round(g * rate);
  const net = g - tds;
  return { gross: g, tds, net, rate };
};

  const ujb = useUjbDistribution({
    referralId: id,
    referralData,
    payments,
    onPaymentsUpdate: setPayments,
    orbiter,
    cosmoOrbiter,
  });

  // Use the primary orbiter UJB code for the preload hook (but for mentors we will pass exact UJB codes)
  const primaryOrbiterUjb =
    referralData?.orbiterUJBCode ||
    orbiter?.ujbCode ||
    orbiter?.UJBCode ||
    null;

  const adjustment = useReferralAdjustment(id, primaryOrbiterUjb);

  // Followup form state
  const defaultFollowupForm = {
    priority: "Medium",
    date: "",
    description: "",
    status: "Pending",
  };
  const [followupForm, setFollowupForm] = useState(defaultFollowupForm);
  const [isEditingFollowup, setIsEditingFollowup] = useState(false);
  const [editIndex, setEditIndex] = useState(null);

  // Payment Drawer
  const [showPaymentDrawer, setShowPaymentDrawer] = useState(false);

  // Payout modal state (manual per-slot payout)
  const [payoutModal, setPayoutModal] = useState({
    open: false,
    cosmoPaymentId: null,
    slot: "", // "Orbiter" | "OrbiterMentor" | "CosmoMentor"
    logicalAmount: 0, // how much this slot logically represents
    recipientUjb: null,
    recipientName: "",
    preview: null,
    modeOfPayment: "",
    transactionRef: "",
    paymentDate: new Date().toISOString().split("T")[0],
    processing: false,
  });
// ================= TDS DERIVED VALUES FOR MODAL =================
// ================= TDS DERIVED VALUES FOR MODAL =================
// ================= CP HELPERS =================


const ensureCpBoardUser = async (orbiter) => {
  if (!orbiter?.ujbCode) return;

  const ref = doc(db, "CPBoard", orbiter.ujbCode);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, {
      id: orbiter.ujbCode,
      name: orbiter.name,
      phoneNumber: orbiter.phone,
      role: "Orbiter",
      totals: { R: 0, H: 0, W: 0 },
      createdAt: serverTimestamp(),
    });
  }
};

const updateCategoryTotals = async (orbiter, categories, points) => {
  const ref = doc(db, "CPBoard", orbiter.ujbCode);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const totals = snap.data().totals || { R: 0, H: 0, W: 0 };
  const split = Math.floor(points / categories.length);

  const updated = { ...totals };
  categories.forEach((c) => {
    updated[c] = (updated[c] || 0) + split;
  });

  await updateDoc(ref, {
    totals: updated,
    lastUpdatedAt: serverTimestamp(),
  });
};

const addCpForSelfReferral = async (orbiter) => {
  await ensureCpBoardUser(orbiter);

  const q = query(
    collection(db, "CPBoard", orbiter.ujbCode, "activities"),
    where("activityNo", "==", "DIP_SELF")
  );
  const snap = await getDocs(q);
  if (!snap.empty) return;

  const points = 100;

  await addDoc(collection(db, "CPBoard", orbiter.ujbCode, "activities"), {
    activityNo: "DIP_SELF",
    activityName: "Referral Identification by Self",
    points,
    categories: ["R"],
    source: "ReferralModule",
    month: new Date().toLocaleString("default", {
      month: "short",
      year: "numeric",
    }),
    addedAt: serverTimestamp(),
  });

  await updateCategoryTotals(orbiter, ["R"], points);
};

const addCpForThirdPartyReferral = async (orbiter) => {
  await ensureCpBoardUser(orbiter);

  const q = query(
    collection(db, "CPBoard", orbiter.ujbCode, "activities"),
    where("activityNo", "==", "DIP_THIRD")
  );
  const snap = await getDocs(q);
  if (!snap.empty) return;

  const points = 75;

  await addDoc(collection(db, "CPBoard", orbiter.ujbCode, "activities"), {
    activityNo: "DIP_THIRD",
    activityName: "Referral passed for Third Party",
    points,
    categories: ["R"],
    source: "ReferralModule",
    month: new Date().toLocaleString("default", {
      month: "short",
      year: "numeric",
    }),
    addedAt: serverTimestamp(),
  });

  await updateCategoryTotals(orbiter, ["R"], points);
};



const hasAnyReferralClosure = async (ujbCode) => {
  const q = query(
    collection(db, "CPBoard", ujbCode, "activities"),
    where("activityNo", "in", [
      "CLOSE_SELF",
      "CLOSE_THIRD",
      "CLOSE_PROSPECT",
    ])
  );
  const snap = await getDocs(q);
  return !snap.empty;
};
const addCpClosure = async ({ orbiter, type }) => {
  await ensureCpBoardUser(orbiter);

  const map = {
    SELF: {
      activityNo: "CLOSE_SELF",
      name: "Referral Closure passed by Self",
      points: 150,
      purpose: "Rewards contribution in completing referral process personally.",
    },
    THIRD: {
      activityNo: "CLOSE_THIRD",
      name: "Referral Closure passed for Third Party",
      points: 125,
      purpose: "Recognizes collaborative closures creating mutual growth.",
    },
    PROSPECT: {
      activityNo: "CLOSE_PROSPECT",
      name: "Referral Closure passed by Prospect",
      points: 200,
      purpose: "Acknowledges direct business closure driven by new member’s initiative.",
    },
  };

  const cfg = map[type];
  if (!cfg) return;

  // prevent duplicate
  const q = query(
    collection(db, "CPBoard", orbiter.ujbCode, "activities"),
    where("activityNo", "==", cfg.activityNo)
  );
  const snap = await getDocs(q);
  if (!snap.empty) return;

  await addDoc(
    collection(db, "CPBoard", orbiter.ujbCode, "activities"),
    {
      activityNo: cfg.activityNo,
      activityName: cfg.name,
      points: cfg.points,
      categories: ["R"],
      purpose: cfg.purpose,
      source: "ReferralClosure",
      month: new Date().toLocaleString("default", {
        month: "short",
        year: "numeric",
      }),
      addedAt: serverTimestamp(),
    }
  );

  await updateCategoryTotals(orbiter, ["R"], cfg.points);
};


  // Helper: sanitize number
  const n = (v) => Math.max(0, Number(v || 0));
const getRecipientInfo = (slot) => {
  const normalize = (status) =>
    status === "Non-Resident" ? "nri" : "resident";

  switch (slot) {
    case "Orbiter":
      return {
        ujb:
          referralData?.orbiterUJBCode ||
          orbiter?.ujbCode ||
          null,
        name: orbiter?.name || "Orbiter",
        payeeType: normalize(
          referralData?.orbiter?.residentStatus ??
          orbiter?.residentStatus
        ),
      };

    case "OrbiterMentor":
      return {
        ujb:
          referralData?.orbiterMentorUJBCode ||
          orbiter?.mentorUJBCode ||
          null,
        name: orbiter?.mentorName || "Orbiter Mentor",
        payeeType: normalize(
          referralData?.orbiter?.mentorResidentStatus ??
          orbiter?.mentorResidentStatus
        ),
      };

 
case "CosmoMentor":
  return {
    ujb:
      referralData?.cosmoMentorUJBCode ||
      cosmoOrbiter?.mentorUJBCode ||
      null,

    name: cosmoOrbiter?.mentorName || "Cosmo Mentor",

    payeeType:
      cosmoOrbiter?.mentorResidentStatus === "Non-Resident"
        ? "nri"
        : "resident",
  };



    default:
      return { ujb: null, name: "", payeeType: "resident" };
  }
};



// ================= TDS DERIVED VALUES FOR MODAL =================
let previewGross = 0;
let previewTds = 0;
let previewNet = 0;
let previewIsNri = false;
if (payoutModal.open && payoutModal.preview) {
  const deducted = Number(payoutModal.preview?.deducted || 0);
  const logical = Number(payoutModal.logicalAmount || 0);

  const adjustedGross =
    deducted > 0 ? Math.max(logical - deducted, 0) : logical;

  const recipientInfo = getRecipientInfo(payoutModal.slot);
  previewIsNri = recipientInfo.payeeType === "nri";

  const { gross, tds, net } =
    calculateUjbTDS(adjustedGross, previewIsNri);

  previewGross = gross;
  previewTds = tds;
  previewNet = net;
}



  // Map slot -> recipient info (we will use referral-level flat fields as authoritative)


  // Open payout modal for a slot (manual)
  const openPayoutModal = ({ cosmoPaymentId, slot, amount }) => {
    const logical = n(amount);
    const info = getRecipientInfo(slot);

    setPayoutModal({
      open: true,
      cosmoPaymentId: cosmoPaymentId || null,
      slot,
      logicalAmount: logical,
      recipientUjb: info.ujb,
      recipientName: info.name,
      preview: null,
      modeOfPayment: "",
      transactionRef: "",
      paymentDate: new Date().toISOString().split("T")[0],
      processing: false,
    });

    // fetch preview (non-blocking)
    (async () => {
      try {
        const lastDeal = dealLogs?.[dealLogs.length - 1];
        const dealValue = lastDeal?.dealValue || null;

        const preview = await adjustment.applyAdjustmentForRole({
          role: slot,
          requestedAmount: logical,
          dealValue,
          ujbCode: info.ujb,
          previewOnly: true,
          referral: { id },
        });

        setPayoutModal((p) => ({ ...p, preview }));
      } catch (err) {
        setPayoutModal((p) => ({ ...p, preview: { error: "Preview failed" } }));
      }
    })();
  };

  const closePayoutModal = () => {
    setPayoutModal((p) => ({ ...p, open: false, preview: null }));
  };

  // Confirm payout => commit adjustment and create UJB payout
  const confirmPayout = async () => {
    const {
      cosmoPaymentId,
      slot,
      logicalAmount,
      recipientUjb,
      modeOfPayment,
      transactionRef,
      paymentDate,
    } = payoutModal;

    if (!slot || logicalAmount <= 0) {
      alert("Invalid payout slot or amount");
      return;
    }

    if (!modeOfPayment) {
      alert("Please select mode of payment");
      return;
    }

    if (!transactionRef) {
      alert("Transaction / reference required");
      return;
    }

    // Slot cap check: ensure not paying more than slot remaining for that cosmo payment
    // compute remaining for this cosmo payment & slot from payments array
    const cosmoPayment =
      (payments || []).find(
        (p) =>
          p.paymentId === payoutModal.cosmoPaymentId ||
          p.meta?.belongsToPaymentId === payoutModal.cosmoPaymentId
      ) || null;


    // We'll rely on server-side check via remaining computed earlier in UI, but still prevent obvious overshoot:
    // For simplicity here we compute paid so far for this cosmo payment & slot:
    const paidForThisPaymentAndSlot = (payments || [])
      .filter(
        (p) =>
          p.meta?.isUjbPayout === true &&
          p.meta?.belongsToPaymentId === payoutModal.cosmoPaymentId &&
          p.meta?.slot === slot
      )
     .reduce((s, p) => {
  if (typeof p?.meta?.logicalAmount === "number") {
    return s + n(p.meta.logicalAmount);
  }
  return s + n(p.amountReceived);
}, 0);


    // Find the cosmo distribution for this cosmo payment so we know slot total
    const cosmoEntry = (payments || []).find(
      (p) => p.paymentId === payoutModal.cosmoPaymentId || p.meta?.paymentId === payoutModal.cosmoPaymentId
    );

    // If cosmoEntry available compute slotTotal
    let slotTotal = null;
    if (cosmoEntry && cosmoEntry.distribution) {
      slotTotal = n(cosmoEntry.distribution[slot === "Orbiter" ? "orbiter" : slot === "OrbiterMentor" ? "orbiterMentor" : "cosmoMentor"]);
    }

    // If slotTotal known, ensure not overpaying logicalAmount beyond remaining
    if (slotTotal != null) {
      const remaining = Math.max(slotTotal - paidForThisPaymentAndSlot, 0);
      if (logicalAmount > remaining) {
        if (!confirm(`Requested amount ₹${logicalAmount} exceeds remaining for this slot (₹${remaining}). Do you want to proceed and pay only remaining ₹${remaining}?`)) {
          return;
        }
      }
    }

    setPayoutModal((p) => ({ ...p, processing: true }));

    try {
      const lastDeal = dealLogs?.[dealLogs.length - 1];
      const dealValue = lastDeal?.dealValue || null;

      // 1) Apply adjustment (commit)
      const adjResult = await adjustment.applyAdjustmentForRole({
        role: slot,
        requestedAmount: logicalAmount,
        dealValue,
        ujbCode: recipientUjb,
        referral: { id },
      });

   const { deducted = 0, newGlobalRemaining } = adjResult || {};

// gross after adjustment
const adjustedGross = Math.max(logicalAmount - deducted, 0);

// TDS calculation
const recipientInfo = getRecipientInfo(slot);
const isNri = recipientInfo.payeeType === "nri";

const { gross, tds, net, rate } =
  calculateUjbTDS(adjustedGross, isNri);



      // ✅ EARLY UJB BALANCE CHECK (CRITICAL FIX)
      const availableBalance = Number(referralData?.ujbBalance || 0);

    if (net > 0 && net > availableBalance) {
  alert(
    `Insufficient UJB balance.\n\n` +
    `Net payable: ₹${net}\n` +
    `Available balance: ₹${availableBalance}`
  );
  setPayoutModal((p) => ({ ...p, processing: false }));
  return;
}

    
      // ✅ CASE: FULLY ADJUSTED — LOG ONLY (NO CASH PAYOUT)
  if (adjustedGross <= 0 && deducted > 0) {

        const adjustmentOnlyEntry = {
          paymentId: `ADJ-${Date.now()}`,
          paymentFrom: "UJustBe",
          paymentTo: slot,
          paymentToName: payoutModal.recipientName,
          amountReceived: 0,
          paymentDate,
          createdAt: new Date(),
          comment: "Fully adjusted against pending fees",
          meta: {
            isUjbPayout: true,
            isAdjustmentOnly: true,
            slot,
            belongsToPaymentId: payoutModal.cosmoPaymentId || null,
            adjustment: {
              deducted,
              cashPaid: 0,
              previousRemaining: newGlobalRemaining + deducted,
              newRemaining: newGlobalRemaining,
            },
          },
        };

        // 🔐 LOG ONLY — NO BALANCE CHANGE
        await updateDoc(doc(db, COLLECTIONS.referral, id), {
          payments: arrayUnion(adjustmentOnlyEntry),
        });

        // Update UI immediately
        setPayments((prev = []) => [...prev, adjustmentOnlyEntry]);

        closePayoutModal();
        return;
      }

const hasAnyReferralClosure = async (ujbCode) => {
  const q = query(
    collection(db, "CPBoard", ujbCode, "activities"),
    where("activityNo", "in", ["CLOSE_SELF", "CLOSE_THIRD", "CLOSE_PROSPECT"])
  );
  const snap = await getDocs(q);
  return !snap.empty;
};

const addCpClosure = async ({ orbiter, type }) => {
  await ensureCpBoardUser(orbiter);

  const map = {
    SELF: {
      activityNo: "CLOSE_SELF",
      name: "Referral Closure passed by Self",
      points: 150,
      purpose: "Rewards contribution in completing referral process personally.",
    },
    THIRD: {
      activityNo: "CLOSE_THIRD",
      name: "Referral Closure passed for Third Party",
      points: 125,
      purpose: "Recognizes collaborative closures creating mutual growth.",
    },
    PROSPECT: {
      activityNo: "CLOSE_PROSPECT",
      name: "Referral Closure passed by Prospect",
      points: 200,
      purpose: "Acknowledges direct business closure driven by new member’s initiative.",
    },
  };

  const cfg = map[type];
  if (!cfg) return;

  await addDoc(
    collection(db, "CPBoard", orbiter.ujbCode, "activities"),
    {
      activityNo: cfg.activityNo,
      activityName: cfg.name,
      points: cfg.points,
      categories: ["R"],
      purpose: cfg.purpose,
      source: "ReferralClosure",
      month: new Date().toLocaleString("default", {
        month: "short",
        year: "numeric",
      }),
      addedAt: serverTimestamp(),
    }
  );

  await updateCategoryTotals(orbiter, ["R"], cfg.points);
};


      // 2) Perform UJB payout (actual cash = cashToPay; logical increment = logicalAmount)
 const payRes =await ujb.payFromSlot({
  recipient: slot,

  // 💰 BANK
  amount: net,

  // 📘 ACCOUNTING (ABSOLUTELY REQUIRED)
  logicalAmount: gross,
  tdsAmount: tds,

  fromPaymentId: payoutModal.cosmoPaymentId,
  modeOfPayment,
  transactionRef,
  paymentDate,

  adjustmentMeta:
    deducted > 0
      ? {
          deducted,
          cashPaid: net,
        }
      : undefined,
});




      if (payRes?.error) {
        alert(payRes.error || "Payout failed");
        setPayoutModal((p) => ({ ...p, processing: false }));
        return;
      }

      // optional: send WhatsApp notifications (preserve earlier behavior)
      try {
        const refId = referralData?.referralId || id;
        // notify recipient (if phone exists)
        const recipientPhone =
          slot === "Orbiter" ? orbiter?.phone : slot === "OrbiterMentor" ? orbiter?.mentorPhone : cosmoOrbiter?.mentorPhone;
        if (recipientPhone) {
          const msg = `Hello ${slot === "Orbiter" ? orbiter?.name : slot === "OrbiterMentor" ? orbiter?.mentorName : cosmoOrbiter?.mentorName}, a payout of ₹${logicalAmount} (cash: ₹${cashToPay}) for referral ${refId} has been processed.`;
          await sendWhatsAppMessage(recipientPhone, [
            slot === "Orbiter" ? orbiter?.name : slot === "OrbiterMentor" ? orbiter?.mentorName : cosmoOrbiter?.mentorName,
            msg,
          ]);
        }
      } catch (err) {
        // silent per preference
      }

      // update local payments (use onPaymentsUpdate in hook already pushing entry; but ensure UI updates)
      // setPayments handled by useUjbDistribution via onPaymentsUpdate

      closePayoutModal();
    } catch (err) {
      console.error("confirmPayout error:", err);
      alert("Payout failed");
      setPayoutModal((p) => ({ ...p, processing: false }));
    }
  };

  // small helper to normalize payment id when different shapes
  const cosmoPaymentIdFrom = (pid) => pid;



  // WhatsApp sender (kept from your earlier file)
  async function sendWhatsAppMessage(phone, parameters = []) {
    try {
      const formattedPhone = String(phone || "").replace(/\s+/g, "");

      const payload = {
        messaging_product: "whatsapp",
        to: formattedPhone,
        type: "template",
        template: {
          name: "referral_module",
          language: { code: "en" },
          components: [
            {
              type: "body",
              parameters: parameters.map((param) => ({
                type: "text",
                text: param,
              })),
            },
          ],
        },
      };

      await fetch(
        "https://graph.facebook.com/v19.0/527476310441806/messages",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization:
              "Bearer EAAHwbR1fvgsBOwUInBvR1SGmVLSZCpDZAkn9aZCDJYaT0h5cwyiLyIq7BnKmXAgNs0ZCC8C33UzhGWTlwhUarfbcVoBdkc1bhuxZBXvroCHiXNwZCZBVxXlZBdinVoVnTB7IC1OYS4lhNEQprXm5l0XZAICVYISvkfwTEju6kV4Aqzt4lPpN8D3FD7eIWXDhnA4SG6QZDZD",
          },
          body: JSON.stringify(payload),
        }
      );
      // intentionally silent
    } catch (error) {
      // silent fail per preference
    }
  }

  if (!router.isReady || loading || !referralData) {
    return <p style={{ padding: 20 }}>Loading referral...</p>;
  }

  const mapName = (key) => {
    switch (key) {
      case "Orbiter":
        return orbiter?.name || orbiter?.Name || "Orbiter";
      case "OrbiterMentor":
        return orbiter?.mentorName || orbiter?.MentorName || "Orbiter Mentor";
      case "CosmoOrbiter":
        return cosmoOrbiter?.name || cosmoOrbiter?.Name || "Cosmo Orbiter";
      case "CosmoMentor":
        return cosmoOrbiter?.mentorName || cosmoOrbiter?.MentorName || "Cosmo Mentor";
      case "UJustBe":
        return "UJustBe";
      default:
        return key || "";
    }
  };

  const paidToOrbiter = Number(referralData?.paidToOrbiter || 0);
  const paidToOrbiterMentor = Number(referralData?.paidToOrbiterMentor || 0);
  const paidToCosmoMentor = Number(referralData?.paidToCosmoMentor || 0);

  const ujbBalance = Number(referralData?.ujbBalance || 0);

  const totalEarned =
    Number(payment.cosmoPaid || 0) -
    (paidToOrbiter + paidToOrbiterMentor + paidToCosmoMentor);

  return (
    <Layout>
      <div className="ReferralPage layoutA">
        {/* HEADER */}
        <header className="refHeader">
          <div>
            <h1>Referral #{referralData?.referralId}</h1>
            <p>Source: {referralData?.referralSource || "Referral"}</p>
          </div>

          <div className="refHeaderStatus">
            <span className="bigStatusTag">{formState.dealStatus}</span>
            <span className="smallBadge">
              UJB Balance: ₹{ujbBalance.toLocaleString("en-IN")}
            </span>
          </div>
        </header>

        <div className="refLayout">
          {/* LEFT COLUMN */}
          <div className="leftColumn">
            <StatusCard
              formState={formState}
              setFormState={setFormState}
              onUpdate={async () => {
                await handleStatusUpdate(formState.dealStatus)
const newStatus = formState.dealStatus;

const orbiterUjb =
  orbiter?.UJBCode ||
  referralData?.orbiter?.ujbCode ||
  referralData?.orbiterUJBCode;


const orbiterObj = {
  ujbCode: orbiterUjb,
  name: orbiter?.name || orbiter?.Name,
  phone: orbiter?.phone || orbiter?.MobileNo,
};
if (newStatus === "Discussion in Progress") {
  if (referralData?.referralType === "Self") {
    await addCpForSelfReferral(orbiterObj);
  } 
  else if (referralData?.referralType === "Third Party") {
    await addCpForThirdPartyReferral(orbiterObj);
  }
}



/* ================= CLOSURE STAGE ================= */
if (newStatus === "Agreed % Transferred to UJustBe") {
  const firstTime = !(await hasAnyReferralClosure(orbiterUjb));

  if (firstTime) {
    await addCpClosure({ orbiter: orbiterObj, type: "SELF" });
    await addCpClosure({ orbiter: orbiterObj, type: "PROSPECT" });
  }

  if (referralData?.referralType === "Others") {
    await addCpClosure({ orbiter: orbiterObj, type: "THIRD" });
  }
}

                // WHATSAPP: STATUS CHANGE (Orbiter + CosmoOrbiter)
                try {
                  const refId = referralData?.referralId || id;
                  const newStatus = formState.dealStatus;

                  const orbiterPhone = orbiter?.phone || orbiter?.MobileNo;
                  const cosmoPhone = cosmoOrbiter?.phone || cosmoOrbiter?.MobileNo;

                  if (orbiterPhone) {
                    const statusMsgOrbiter =
                      {
                        "Not Connected": `Hello ${orbiter?.name}, your referral (ID: ${refId}) is still marked Not Connected. Please check in.`,
                        "Called but Not Responded": `Hello ${orbiter?.name}, ${cosmoOrbiter?.name} tried reaching your referral (ID: ${refId}) but couldn't connect. Please help facilitate.`,
                        "Discussion in Progress": `Hello ${orbiter?.name}, discussion has started for your referral (ID: ${refId}) with ${cosmoOrbiter?.name}.`,
                        Rejected: `Hello ${orbiter?.name}, your referral (ID: ${refId}) was marked as Rejected by ${cosmoOrbiter?.name}.`,
                        "Deal Won": `🎉 Hello ${orbiter?.name}, your referral (ID: ${refId}) has been marked as Deal Won!`,
                      }[newStatus] || `Referral #${refId} status updated to ${newStatus}.`;

                    await sendWhatsAppMessage(orbiterPhone, [orbiter?.name || "Orbiter", statusMsgOrbiter]);
                  }

                  if (cosmoPhone) {
                    const statusMsgCosmo =
                      {
                        "Not Connected": `Hello ${cosmoOrbiter?.name}, referral (ID: ${refId}) is still Not Connected. Please take action.`,
                        "Called but Not Responded": `Hello ${cosmoOrbiter?.name}, thank you for trying to connect. Status updated to Called but Not Responded.`,
                        "Discussion in Progress": `Hello ${cosmoOrbiter?.name}, thank you for progressing referral (ID: ${refId}). Please continue.`,
                        Rejected: `Hello ${cosmoOrbiter?.name}, referral (ID: ${refId}) marked Rejected. Reason recorded.`,
                        "Deal Won": `🎉 Hello ${cosmoOrbiter?.name}, referral (ID: ${refId}) is Deal Won. Great job!`,
                      }[newStatus] || `Referral #${refId} updated to ${newStatus}.`;

                    await sendWhatsAppMessage(cosmoPhone, [cosmoOrbiter?.name || "CosmoOrbiter", statusMsgCosmo]);
                  }
                } catch (err) {
                  // silent
                }
              }}
              statusLogs={referralData.statusLogs || []}
            />

            <ServiceDetailsCard
              referralData={referralData}
              dealLogs={dealLogs}
              dealAlreadyCalculated={dealAlreadyCalculated}
              onSaveDealLog={handleSaveDealLog}
            />

            <ReferralInfoCard referralData={referralData} onUploadLeadDoc={uploadLeadDoc} />

            <OrbiterDetailsCard orbiter={orbiter} referralData={referralData} />
            <CosmoOrbiterDetailsCard cosmoOrbiter={cosmoOrbiter} referralData={referralData} />

            <PaymentHistory
              payments={payments}
              mapName={mapName}
              paidToOrbiter={paidToOrbiter}
              paidToOrbiterMentor={paidToOrbiterMentor}
              paidToCosmoMentor={paidToCosmoMentor}
              onRequestPayout={({ cosmoPaymentId, slot, amount }) =>
                openPayoutModal({ cosmoPaymentId, slot, amount })
              }
            />
          </div>

          {/* RIGHT COLUMN: FOLLOW UPS */}
          <div className="rightColumn">
            <FollowupList
              followups={followups}
              onEdit={(i) => {
                setEditIndex(i);
                setFollowupForm(followups[i]);
                setIsEditingFollowup(true);
              }}
              onDelete={deleteFollowup}
            />

            <FollowupForm
              form={followupForm}
              setForm={setFollowupForm}
              isEditing={isEditingFollowup}
              onSave={async () => {
                if (isEditingFollowup && editIndex !== null) {
                  await editFollowup(editIndex, followupForm);
                } else {
                  await addFollowup(followupForm);
                }
                setFollowupForm(defaultFollowupForm);
                setEditIndex(null);
                setIsEditingFollowup(false);
              }}
              onCancel={() => {
                setFollowupForm(defaultFollowupForm);
                setIsEditingFollowup(false);
                setEditIndex(null);
              }}
            />
          </div>
        </div>

        {/* BOTTOM PAYMENT SUMMARY BAR */}
        {dealEverWon && (
          <div className="bottomPaymentBar">
            <PaymentSummary
              agreedAmount={payment.agreedAmount}
              cosmoPaid={payment.cosmoPaid}
              agreedRemaining={payment.agreedRemaining}
              totalEarned={totalEarned}
              ujbBalance={ujbBalance}
              paidTo={{
                orbiter: paidToOrbiter,
                orbiterMentor: paidToOrbiterMentor,
                cosmoMentor: paidToCosmoMentor,
              }}
              referralData={referralData}
              onAddPayment={payment.openPaymentModal}
            />

            <button className="openPanelBtn" onClick={() => setShowPaymentDrawer(true)}>
              Open Payment Panel
            </button>
          </div>
        )}

        {/* PAYMENT DRAWER */}
        <PaymentDrawer
          isOpen={showPaymentDrawer}
          onClose={() => setShowPaymentDrawer(false)}
          payment={payment}
          referralData={referralData}
          ujbBalance={ujb.ujbBalance}
          paidTo={{
            orbiter: paidToOrbiter,
            orbiterMentor: paidToOrbiterMentor,
            cosmoMentor: paidToCosmoMentor,
          }}
          payments={payments}
          mapName={mapName}
          dealEverWon={dealEverWon}
          totalEarned={totalEarned}
          onRequestPayout={({ recipient, slotKey, amount, fromPaymentId }) =>
            openPayoutModal({ cosmoPaymentId: fromPaymentId || null, slot: slotKey || recipient, amount })
          }
        />

        {/* MANUAL SLOT PAYOUT MODAL */}
        {payoutModal.open && (
          <div className="ModalContainer">
            <div className="Modal">
              <h3>
                Payout — {payoutModal.slot} ({payoutModal.recipientName})
              </h3>

              <p>
                <strong>Slot logical (due):</strong> ₹{Number(payoutModal.logicalAmount || 0).toLocaleString("en-IN")}
              </p>

              <p>
                <strong>Recipient UJB:</strong> {payoutModal.recipientUjb || "—"}
              </p>

              {/* Preview (from adjustment.applyAdjustmentForRole previewOnly) */}
             {/* PREVIEW BOX */}
{payoutModal.open && (
  <div className="previewBox">
    <p><strong>Payout Breakdown</strong></p>

    <p>
      Logical Amount: ₹
      {payoutModal.logicalAmount.toLocaleString("en-IN")}
    </p>

    <p>
      Adjustment Used: ₹
      {Number(payoutModal.preview?.deducted || 0).toLocaleString("en-IN")}
    </p>

    <p>
      Gross After Adjustment: ₹
      {previewGross.toLocaleString("en-IN")}
    </p>

    <p>
      TDS ({previewIsNri ? "20%" : "5%"}): ₹
      {previewTds.toLocaleString("en-IN")}
    </p>

    <p>
      <strong>
        Net Payable: ₹{previewNet.toLocaleString("en-IN")}
      </strong>
    </p>
  </div>
)}
 

              <label>
                Mode of Payment
                <select
                  value={payoutModal.modeOfPayment}
                  onChange={(e) => setPayoutModal((p) => p.open ? { ...p, modeOfPayment: e.target.value } : p)}
                >
                  <option value="">--Select--</option>
                  <option>Bank Transfer</option>
                  <option>GPay</option>
                  <option>Razorpay</option>
                  <option>Cash</option>
                </select>
              </label>

              <label>
                Transaction / Ref ID
                <input
                  value={payoutModal.transactionRef}
                  onChange={(e) => setPayoutModal((p) => ({ ...p, transactionRef: e.target.value }))}
                />
              </label>

              <label>
                Payment Date
                <input
                  type="date"
                  value={payoutModal.paymentDate}
                  onChange={(e) => setPayoutModal((p) => ({ ...p, paymentDate: e.target.value }))}
                />
              </label>

              <div className="modalActions">
                <button
                  onClick={confirmPayout}
                  disabled={payoutModal.processing || ujb.isSubmitting || adjustment.loading}
                >
                  {payoutModal.processing || ujb.isSubmitting || adjustment.loading ? "Processing..." : "Confirm Payout"}
                </button>
                <button className="cancel" onClick={closePayoutModal}>
                  Cancel
                </button>
              </div>

              {adjustment.error && <p className="errorText">Adjustment error: {adjustment.error}</p>}
              {ujb.error && <p className="errorText">Payout error: {ujb.error}</p>}
            </div>
          </div>
        )}

        {/* COSMO → UJB PAYMENT MODAL (unchanged) */}
        {payment.showAddPaymentForm && (
          <div className="ModalContainer">
            <div className="Modal">
              <h3>Add Payment (Cosmo → UJB)</h3>

              <p className="modalHint">
                Remaining Agreed: ₹{payment.agreedRemaining.toLocaleString("en-IN")}
              </p>

              <label>
                Amount
                <input
                  type="number"
                  min="0"
                  value={payment.newPayment.amountReceived}
                  onChange={(e) => payment.updateNewPayment("amountReceived", e.target.value)}
                />
              </label>
<label>
  TDS Deducted by Cosmo?
  <select
    value={payment.newPayment.tdsDeducted ?? "no"}
    onChange={(e) =>
      payment.updateNewPayment("tdsDeducted", e.target.value)
    }
  >
    <option value="no">No</option>
    <option value="yes">Yes</option>
  </select>
</label>

{payment.newPayment.tdsDeducted === "yes" && (
  <label>
    TDS %
    <input
      type="number"
      value={payment.newPayment.tdsRate ?? 10}
      onChange={(e) =>
        payment.updateNewPayment("tdsRate", e.target.value)
      }
    />
  </label>
)}

              <label>
                Mode of Payment
                <select
                  value={payment.newPayment.modeOfPayment}
                  onChange={(e) => payment.updateNewPayment("modeOfPayment", e.target.value)}
                >
                  <option value="">--Select--</option>
                  <option>Bank Transfer</option>
                  <option>GPay</option>
                  <option>Razorpay</option>
                  <option>Cash</option>
                </select>
              </label>

              <label>
                Transaction Ref
                <input
                  value={payment.newPayment.transactionRef}
                  onChange={(e) => payment.updateNewPayment("transactionRef", e.target.value)}
                />
              </label>

              <label>
                Payment Date
                <input
                  type="date"
                  value={payment.newPayment.paymentDate}
                  onChange={(e) => payment.updateNewPayment("paymentDate", e.target.value)}
                />
              </label>

              <div className="modalActions">
                <button
                  onClick={async () => {
                    // save payment
                    await payment.handleSavePayment();

                    // WHATSAPP: Notify CosmoOrbiter only
                    try {
                      const cosmoPhone = cosmoOrbiter?.phone || cosmoOrbiter?.MobileNo;
                      const amount = payment.newPayment?.amountReceived;
                      const refId = referralData?.referralId || id;
                      if (cosmoPhone) {
                        const paymentMsg = `Hello ${cosmoOrbiter?.name}, we have received your payment of ₹${amount} for referral (ID: ${refId}). Thank you!`;
                        await sendWhatsAppMessage(cosmoPhone, [cosmoOrbiter?.name, paymentMsg]);
                      }
                    } catch (err) {
                      // silent
                    }
                  }}
                  disabled={payment.isSubmitting}
                >
                  {payment.isSubmitting ? "Saving..." : "Save"}
                </button>
                <button className="cancel" onClick={payment.closePaymentModal} disabled={payment.isSubmitting}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}