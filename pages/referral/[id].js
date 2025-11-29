// ReferralDetails.jsx
import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import {
  doc,
  getDoc,
  updateDoc,
  Timestamp,
  arrayUnion,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";
import Layouts from "../../component/Layouts";
import "../../src/app/styles/main.scss";
import { COLLECTIONS } from "/utility_collection";
import "../../src/app/styles/user.scss";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../../firebaseConfig";
import Swal from "sweetalert2";

const TABS = [
  "Referral Info",
  "Orbiter",
  "CosmoOrbiter",
  "Service/Product",
  "Follow Up",
  "Payment History",
];

const ReferralDetails = () => {
  const router = useRouter();
  const { id } = router.query;

  // --- UI + domain states
  const [activeProfileTab, setActiveProfileTab] = useState("Orbiter");
  const [dealLogs, setDealLogs] = useState([]);
  const [dealEverWon, setDealEverWon] = useState(false); // used for showing payment section
  const [payments, setPayments] = useState([]);
  const [showDealCard, setShowDealCard] = useState(false);
  const [orbiter, setOrbiter] = useState(null);
  const [showFollowups, setShowFollowups] = useState(false);
const [adjustmentBreakdown, setAdjustmentBreakdown] = useState(null);

  const [cosmoOrbiter, setCosmoOrbiter] = useState(null);
  const [showEarned, setShowEarned] = useState(false); 
  const [adjustmentInfo, setAdjustmentInfo] = useState({
    adjustedAmount: 0,
    actualReceived: 0,
  });

  const [showPaymentSheet, setShowPaymentSheet] = useState(false);
  const [open, setOpen] = useState(false);
  const [showFollowupForm, setShowFollowupForm] = useState(false);
  const [newFollowup, setNewFollowup] = useState({
    priority: "Medium",
    date: "",
    description: "",
    status: "Pending",
  });
  const [showAddPaymentForm, setShowAddPaymentForm] = useState(false);

  // newPayment used by modal; initialize via initPaymentForModal
  const [newPayment, setNewPayment] = useState({
    paymentFrom: "CosmoOrbiter",
    paymentTo: "UJustBe",
    paymentDate: "",
    description: "",
    amountReceived: "",
    modeOfPayment: "GPay",
    transactionRef: "",
    comment: "",
    paymentInvoice: null,
    ujbShareType: "UJustBe",
    // internal helper fields:
    _targetUserDocRef: null,
    _feeType: "upfront",
  });

  const [editIndex, setEditIndex] = useState(null);

  // UJB distribution UI state
  const [showUjbDistributionForm, setShowUjbDistributionForm] = useState(false);
  const [ujbDistForm, setUjbDistForm] = useState({
    recipient: "", // "Orbiter" | "OrbiterMentor" | "CosmoMentor"
    amount: "",
    paymentDate: new Date().toISOString().split("T")[0],
    modeOfPayment: "",
    transactionRef: "",
    paymentInvoice: null,
    comment: "",
  });

  // New state: mark whether the UJB distribution form was opened from a distribution slot
  const [ujbDistributionFromSlot, setUjbDistributionFromSlot] = useState(false);
  // If from slot, store the originalSlotAmount (so we can show originalRequested)
  const [ujbDistributionOriginalSlotAmount, setUjbDistributionOriginalSlotAmount] =
    useState(0);
  // Allow optional adjust toggle
  const [ujbDistAllowAdjust, setUjbDistAllowAdjust] = useState(false);

  // NEW: store the cosmo payment id that this UJB distribution belongs to (option A)
  const [ujbDistributionBelongsToPaymentId, setUjbDistributionBelongsToPaymentId] =
    useState(null);

  // NEW: which distribution is expanded inline (paymentId) — replaces modal
  const [expandedDistributionFor, setExpandedDistributionFor] = useState(null);

  const closeForm = () => {
    setShowAddPaymentForm(false);
    setShowUjbDistributionForm(false);
    setEditIndex(null);
    setNewPayment({
      paymentFrom: "CosmoOrbiter",
      paymentTo: "UJustBe",
      ujbShareType: "UJustBe",
      modeOfPayment: "",
      transactionRef: "",
      comment: "",
      paymentDate: "",
      amountReceived: "",
      paymentInvoice: null,
      _targetUserDocRef: null,
      _feeType: "upfront",
    });
    setUjbDistForm({
      recipient: "",
      amount: "",
      paymentDate: new Date().toISOString().split("T")[0],
      modeOfPayment: "",
      transactionRef: "",
      paymentInvoice: null,
      comment: "",
    });
    setAdjustmentInfo({ adjustedAmount: 0, actualReceived: 0 });
    setUjbDistributionFromSlot(false);
    setUjbDistributionOriginalSlotAmount(0);
    setUjbDistAllowAdjust(false);
    setUjbDistributionBelongsToPaymentId(null);
    setExpandedDistributionFor(null);
  };

  // --- Referral form and supporting states
  const [formState, setFormState] = useState({
    referralType: "",
    referralSource: "",
    dealStatus: "",
    dealValue: "",
  });
  const [followups, setFollowups] = useState([]);
  const [referralData, setReferralData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Referral Info");
  const [showModal, setShowModal] = useState(false);

  // Locks & flags to prevent multi-click / multi-submit
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [dealAlreadyCalculated, setDealAlreadyCalculated] = useState(false);

  // refs to avoid stale closure problems for locks in async flows
  const isSubmittingPaymentRef = useRef(isSubmittingPayment);
  useEffect(() => {
    isSubmittingPaymentRef.current = isSubmittingPayment;
  }, [isSubmittingPayment]);

  const isUpdatingStatusRef = useRef(isUpdatingStatus);
  useEffect(() => {
    isUpdatingStatusRef.current = isUpdatingStatus;
  }, [isUpdatingStatus]);

  // mark if deal was ever won (keeps true once set)
  useEffect(() => {
    const current = formState.dealStatus;
    const paymentEligibleStatuses = [
      "Deal Won",
      "Work in Progress",
      "Work Completed",
      "Received Part Payment and Transferred to UJustBe",
      "Received Full and Final Payment",
      "Agreed % Transferred to UJustBe",
    ];

    if (paymentEligibleStatuses.includes(current)) {
      setDealEverWon(true); // once true → stays true in UI
    }
  }, [formState.dealStatus]);

  // -----------------------
  // DISTRIBUTION CALCULATION
  // -----------------------
  const calculateDistribution = () => {
    const dealValue = parseFloat(formState.dealValue) || 0;
    // get percentage from referralData if present
    const percentage = parseFloat(
      (referralData?.service?.percentage || referralData?.product?.percentage) || 0
    );
    const agreedAmount = (dealValue * percentage) / 100;

    return {
      dealValue,
      percentage,
      agreedAmount,
      orbiterShare: (agreedAmount * 50) / 100,
      orbiterMentorShare: (agreedAmount * 15) / 100,
      cosmoMentorShare: (agreedAmount * 15) / 100,
      ujustbeShare: (agreedAmount * 20) / 100,
      timestamp: new Date().toISOString(),
    };
  };

  // -------------
  // SAVE DEAL LOG
  // -------------
  const handleSaveDealLog = async () => {
    if (dealAlreadyCalculated) {
      await Swal.fire({
        icon: "info",
        title: "Already calculated",
        text: "Deal value has already been calculated for this referral.",
      });
      return;
    }

    const distribution = calculateDistribution();

    try {
      // Idempotency check: if latest log already matches, skip
      const latest = dealLogs.length > 0 ? dealLogs[dealLogs.length - 1] : null;
      if (
        latest &&
        latest.dealValue === distribution.dealValue &&
        latest.percentage === distribution.percentage
      ) {
        setDealAlreadyCalculated(true);
        setShowModal(false);
        await Swal.fire({
          icon: "info",
          title: "Already saved",
          text: "This distribution was already saved earlier.",
        });
        return;
      }

      // Save single log (lock)
      const updatedLogs = [distribution];
      const docRef = doc(db, COLLECTIONS.referral, id);

      // Also initialize per-role paid counters and ujbBalance if not present
      const payload = {
        dealLogs: updatedLogs,
        lastDealCalculatedAt: Timestamp.now(),
        agreedTotal: distribution.agreedAmount,
        // keep existing values if present, otherwise initialize
        ujbBalance: referralData?.ujbBalance ? Number(referralData.ujbBalance) : 0,
        paidToOrbiter: referralData?.paidToOrbiter ? Number(referralData.paidToOrbiter) : 0,
        paidToOrbiterMentor: referralData?.paidToOrbiterMentor
          ? Number(referralData.paidToOrbiterMentor)
          : 0,
        paidToCosmoMentor: referralData?.paidToCosmoMentor
          ? Number(referralData.paidToCosmoMentor)
          : 0,
      };

      await updateDoc(docRef, payload);

      setDealLogs(updatedLogs);
      setDealAlreadyCalculated(true);
      setShowModal(false);

      await Swal.fire({
        icon: "success",
        title: "Saved",
        text: "Deal distribution saved and locked.",
      });
    } catch (error) {
      console.error("Error saving deal log:", error);
      await Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to save deal distribution.",
      });
    }
  };

  // -------------------------
  // REAL-TIME REFERRAL SUBSCRIBER
  // -------------------------
  useEffect(() => {
    if (!id) return;

    setLoading(true);

    const refDoc = doc(db, COLLECTIONS.referral, id);
    const unsubscribe = onSnapshot(
      refDoc,
      async (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setReferralData(data);
          setDealLogs(data.dealLogs || []);
          setFollowups(data.followups || []);
          setPayments(data.payments || []);
          setFormState({
            referralType: data.referralType || "",
            referralSource: data.referralSource || "",
            dealStatus: data.dealStatus || "Pending",
            dealValue: data.dealValue || "",
          });

          // Deal calculated lock detection
          if (data.dealLogs && data.dealLogs.length > 0) {
            setDealAlreadyCalculated(true);
          } else {
            setDealAlreadyCalculated(false);
          }

          // Mark if deal was ever won
          const paymentEligibleStatuses = [
            "Deal Won",
            "Work in Progress",
            "Work Completed",
            "Received Part Payment and Transferred to UJustBe",
            "Received Full and Final Payment",
            "Agreed % Transferred to UJustBe",
          ];
          if (paymentEligibleStatuses.includes(data.dealStatus)) {
            setDealEverWon(true);
          }

          // Fetch orbiter and cosmo details gracefully
          try {
            // ORBITER by phone or ujbCode
            if (data.orbiter?.phone) {
              const orbRef = doc(db, COLLECTIONS.userDetail, data.orbiter.phone);
              const orbSnap = await getDoc(orbRef);
              if (orbSnap.exists()) {
                const orbData = orbSnap.data();
                setOrbiter({
                  ...data.orbiter,
                  ...orbData,
                  profilePic: orbData["Profile Photo URL"] || orbData["Business Logo"] || "",
                });
              } else if (data.orbiter?.ujbCode) {
                const orbRef2 = doc(db, COLLECTIONS.userDetail, data.orbiter.ujbCode);
                const orbSnap2 = await getDoc(orbRef2);
                if (orbSnap2.exists()) {
                  const orbData2 = orbSnap2.data();
                  setOrbiter({
                    ...data.orbiter,
                    ...orbData2,
                    profilePic:
                      orbData2["ProfilePhotoURL"] || orbData2["BusinessLogo"] || "",
                  });
                } else {
                  setOrbiter(data.orbiter);
                }
              } else {
                setOrbiter(data.orbiter || null);
              }
            } else if (data.orbiter?.ujbCode) {
              const orbRef = doc(db, COLLECTIONS.userDetail, data.orbiter.ujbCode);
              const orbSnap = await getDoc(orbRef);
              if (orbSnap.exists()) {
                const orbData = orbSnap.data();
                setOrbiter({
                  ...data.orbiter,
                  ...orbData,
                  profilePic: orbData["ProfilePhotoURL"] || orbData["BusinessLogo"] || "",
                });
              } else {
                setOrbiter(data.orbiter);
              }
            } else {
              setOrbiter(data.orbiter || null);
            }

            // COSMO by phone or ujbCode
            if (data.cosmoOrbiter?.phone) {
              const cosRef = doc(db, COLLECTIONS.userDetail, data.cosmoOrbiter.phone);
              const cosSnap = await getDoc(cosRef);
              if (cosSnap.exists()) {
                const cosData = cosSnap.data();
                setCosmoOrbiter({
                  ...data.cosmoOrbiter,
                  ...cosData,
                  profilePic: cosData["Profile Photo URL"] || cosData["Business Logo"] || "",
                });
              } else if (data.cosmoOrbiter?.ujbCode) {
                const cosRef2 = doc(db, COLLECTIONS.userDetail, data.cosmoOrbiter.ujbCode);
                const cosSnap2 = await getDoc(cosRef2);
                if (cosSnap2.exists()) {
                  const cosData2 = cosSnap2.data();
                  setCosmoOrbiter({
                    ...data.cosmoOrbiter,
                    ...cosData2,
                    profilePic:
                      cosData2["ProfilePhotoURL"] || cosData2["BusinessLogo"] || "",
                  });
                } else {
                  setCosmoOrbiter(data.cosmoOrbiter);
                }
              } else {
                setCosmoOrbiter(data.cosmoOrbiter || null);
              }
            } else if (data.cosmoOrbiter?.ujbCode) {
              const cosRef = doc(db, COLLECTIONS.userDetail, data.cosmoOrbiter.ujbCode);
              const cosSnap = await getDoc(cosRef);
              if (cosSnap.exists()) {
                const cosData = cosSnap.data();
                setCosmoOrbiter({
                  ...data.cosmoOrbiter,
                  ...cosData,
                  profilePic: cosData["ProfilePhotoURL"] || cosData["BusinessLogo"] || "",
                });
              } else {
                setCosmoOrbiter(data.cosmoOrbiter);
              }
            } else {
              setCosmoOrbiter(data.cosmoOrbiter || null);
            }
          } catch (err) {
            console.error("Error fetching orbiter/cosmo details in snapshot handler:", err);
          }
        } else {
          setReferralData(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error("onSnapshot error:", err);
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // -----------------------
  // PAYMENT FLOW HELPERS (NEW: partial payments + auto distribution)
  // -----------------------
// ===== UNIVERSAL WHATSAPP SENDER =====
const sendWhatsAppMessage = async (phone, parameters = []) => {
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
          parameters: parameters.map((text) => ({
            type: "text",
            text,
          })),
        },
      ],
    },
  };

  try {
    const response = await fetch("https://graph.facebook.com/v19.0/527476310441806/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization:
          "Bearer EAAHwbR1fvgsBOwUInBvR1SGmVLSZCpDZAkn9aZCDJYaT0h5cwyiLyIq7BnKmXAgNs0ZCC8C33UzhGWTlwhUarfbcVoBdkc1bhuxZBXvroCHiXNwZCZBVxXlZBdinVoVnTB7IC1OYS4lhNEQprXm5l0XZAICVYISvkfwTEju6kV4Aqzt4lPpN8D3FD7eIWXDhnA4SG6QZDZD",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("WhatsApp API Error:", data);
    }
  } catch (err) {
    console.error("WhatsApp send error:", err);
  }
};

  // get agreed amount (from latest dealLog or computed)
  const getAgreedAmount = () => {
    const deal = dealLogs && dealLogs.length > 0 ? dealLogs[dealLogs.length - 1] : null;
    if (deal && Number(deal.agreedAmount)) return Number(deal.agreedAmount);
    const calc = calculateDistribution();
    return Number(calc.agreedAmount || 0);
  };

  // sum of Cosmo -> UJustBe payments so far
  const getCosmoPaidSoFar = (paymentsArr) => {
    const arr = paymentsArr || payments || [];
    return arr.reduce((sum, p) => {
      try {
        const isCosmoToUjb =
          (p.paymentFrom === "CosmoOrbiter" ||
            (p.paymentFromName || "").toLowerCase().includes("cosmo")) &&
          (p.paymentTo === "UJustBe" ||
            (p.paymentToName || "").toLowerCase().includes("ujustbe"));
        if (isCosmoToUjb) {
          return sum + Number(p.amountReceived || 0);
        }
      } catch (err) {}
      return sum;
    }, 0);
  };

  // remaining agreed amount
  const getRemainingAgreed = (paymentsArr) => {
    const agreed = getAgreedAmount();
    const paid = getCosmoPaidSoFar(paymentsArr);
    const remaining = Math.max(0, agreed - paid);
    return remaining;
  };

  // Create proportional distribution for a partialCosmoPayment
  // uses last deal log shares as source fractions (or recomputed)
  const computeProportionalDistribution = (partialAmount) => {
    const deal =
      dealLogs && dealLogs.length > 0 ? dealLogs[dealLogs.length - 1] : calculateDistribution();
    const agreed = Number(deal.agreedAmount || 0) || 0;

    // if agreed is 0, fallback: if deal has per-party shares, compute fractions by sum
    let orbiterShare = Number(deal.orbiterShare || 0);
    let orbiterMentorShare = Number(deal.orbiterMentorShare || 0);
    let cosmoMentorShare = Number(deal.cosmoMentorShare || 0);
    let ujustbeShare = Number(deal.ujustbeShare || 0);

    // If agreed is zero but shares sum > 0, use relative fractions from shares sum
    const sharesSum = orbiterShare + orbiterMentorShare + cosmoMentorShare + ujustbeShare;
    let fractions;
    if (agreed > 0) {
      fractions = {
        orbiter: orbiterShare / agreed,
        orbiterMentor: orbiterMentorShare / agreed,
        cosmoMentor: cosmoMentorShare / agreed,
        ujustbe: ujustbeShare / agreed,
      };
    } else if (sharesSum > 0) {
      fractions = {
        orbiter: orbiterShare / sharesSum,
        orbiterMentor: orbiterMentorShare / sharesSum,
        cosmoMentor: cosmoMentorShare / sharesSum,
        ujustbe: ujustbeShare / sharesSum,
      };
    } else {
      // Default fallback fractions
      fractions = {
        orbiter: 0.5,
        orbiterMentor: 0.15,
        cosmoMentor: 0.15,
        ujustbe: 0.2,
      };
    }

    // compute distribution amounts (rounded to 2 decimals). Fix rounding difference by adjusting last party.
    const raw = {
      orbiter: partialAmount * fractions.orbiter,
      orbiterMentor: partialAmount * fractions.orbiterMentor,
      cosmoMentor: partialAmount * fractions.cosmoMentor,
      ujustbe: partialAmount * fractions.ujustbe,
    };

    // round
    const rounded = {
      orbiter: Math.round(raw.orbiter * 100) / 100,
      orbiterMentor: Math.round(raw.orbiterMentor * 100) / 100,
      cosmoMentor: Math.round(raw.cosmoMentor * 100) / 100,
      ujustbe: Math.round(raw.ujustbe * 100) / 100,
    };

    // fix tiny rounding diff
    const sumRounded =
      rounded.orbiter + rounded.orbiterMentor + rounded.cosmoMentor + rounded.ujustbe;
    const diff = Math.round((partialAmount - sumRounded) * 100) / 100;
    if (Math.abs(diff) >= 0.01) {
      // add difference to UJustBe (or orbiter as fallback)
      rounded.ujustbe = Math.round((rounded.ujustbe + diff) * 100) / 100;
    }

    return rounded;
  };

  // -----------------------
  // PAYMENT MODAL INITIALIZER (now Cosmo -> UJustBe partials)
  // -----------------------
  const initPaymentForModal = () => {
    // must have deal calculated
    if (!dealAlreadyCalculated) {
      Swal.fire({
        icon: "warning",
        title: "Deal not calculated",
        text: "Please calculate deal distribution first (Calculate Deal Value).",
      });
      return;
    }

    // default: Cosmo -> UJustBe; default amount = remaining agreed amount
    const remaining = getRemainingAgreed(payments);
    setNewPayment({
      paymentFrom: "CosmoOrbiter",
      paymentTo: "UJustBe",
      paymentDate: new Date().toISOString().split("T")[0],
      amountReceived: remaining, // default suggested amount (admin can edit for partial)
      modeOfPayment: "",
      transactionRef: "",
      comment: "",
      paymentInvoice: null,
      ujbShareType: "AgreedPartialToUJustBe",
      _targetUserDocRef: null,
      _feeType: "upfront",
    });

    setAdjustmentInfo({ adjustedAmount: 0, actualReceived: Number(remaining || 0) });
    setShowAddPaymentForm(true);
    setShowPaymentSheet(true);
  };

  // -----------------------
  // DUPLICATE CHECK
  // -----------------------
  const isDuplicatePayment = (existingPayments, candidate) => {
    if (!candidate) return false;
    return existingPayments.some((p) => {
      try {
        return (
          Number(p.amountReceived) === Number(candidate.amountReceived) &&
          p.paymentDate === candidate.paymentDate &&
          (p.paymentFrom === candidate.paymentFrom ||
            (p.paymentFromName || "") === mapToActualName(candidate.paymentFrom)) &&
          (p.paymentTo === candidate.paymentTo ||
            (p.paymentToName || "") === mapToActualName(candidate.paymentTo))
        );
      } catch {
        return false;
      }
    });
  };

  // -----------------------
  // PAYMENT ID GENERATOR
  // -----------------------
  const generatePaymentId = (roleShort = "PAY") => {
    // use referralId if available; fallback to id
    const base = referralData?.referralId || id || "REF";
    return `${base}-PAY-${roleShort}-${Date.now()}`;
  };

  // -----------------------
  // HANDLE ADD PAYMENT (NEW FLOW: Cosmo partials -> auto distribution informational)
  // -----------------------
  // ========================================================
// UPDATED: UJB → Receiver Distribution WITH ADJUSTMENT LOGIC
// ========================================================
const processAdjustmentForTarget = async (
  recipientKey,
  amountRequested,
  targetUser
) => {
  if (!targetUser?.ujbCode) return { adjustedAmount: 0, actualReceived: amountRequested };

  const targetDocRef = doc(db, COLLECTIONS.userDetail, targetUser.ujbCode);
  const snap = await getDoc(targetDocRef);

  if (!snap.exists()) return { adjustedAmount: 0, actualReceived: amountRequested };

  const data = snap.data();
  let paySection = {};

  // pick correct section
  if (recipientKey === "Orbiter") paySection = data?.payment?.orbiter || {};
  else paySection = data?.payment?.mentor || {};

  const feeType = paySection.feeType || "";
  const status = (paySection.status || "").toLowerCase();
  const currentAmount = Number(paySection.amount || 0);
  
  // Only adjustment fee type is eligible
  if (feeType !== "adjustment" || !["adjusted", "unpaid"].includes(status)) {
    return { adjustedAmount: 0, actualReceived: amountRequested };
  }

  // FULL adjustment
  if (amountRequested <= currentAmount) {
    return {
      adjustedAmount: amountRequested,
      actualReceived: 0,
      newAmountRemaining: currentAmount - amountRequested,
      targetDocRef,
      paySectionKey: recipientKey === "Orbiter" ? "payment.orbiter" : "payment.mentor"
    };
  }

  // PARTIAL adjustment
  return {
    adjustedAmount: currentAmount,
    actualReceived: amountRequested - currentAmount,
    newAmountRemaining: 0,
    targetDocRef,
    paySectionKey: recipientKey === "Orbiter" ? "payment.orbiter" : "payment.mentor"
  };
};

// ========================================================
// HANDLER 1: Normal UJB Distribution (manual selection)
// ========================================================
const handleUJBDistribution = async () => {
  if (isSubmittingPaymentRef.current) return;
  setIsSubmittingPayment(true);

  try {
    const recipient = ujbDistForm.recipient;
    const requestAmount = Number(ujbDistForm.amount || 0);

    if (!recipient || requestAmount <= 0) {
      Swal.fire({ icon: "warning", title: "Missing fields", text: "Invalid amount." });
      setIsSubmittingPayment(false);
      return;
    }

    // UJB cash balance
    const currentUjb = Number(referralData?.ujbBalance || 0);
    if (currentUjb <= 0) {
      Swal.fire({ icon: "error", title: "No balance" });
      setIsSubmittingPayment(false);
      return;
    }

    // pick correct user
    let targetUser = null;
    if (recipient === "Orbiter") targetUser = orbiter;
    if (recipient === "OrbiterMentor") targetUser = { ...orbiter, ujbCode: orbiter?.mentorUjbCode, name: orbiter?.mentorName };
    if (recipient === "CosmoMentor") targetUser = { ...cosmoOrbiter, ujbCode: cosmoOrbiter?.mentorUjbCode, name: cosmoOrbiter?.mentorName };

    // run adjustment logic
    const adj = await processAdjustmentForTarget(recipient, requestAmount, targetUser);

    const adjustedAmount = adj.adjustedAmount || 0;
    const actualReceived = adj.actualReceived || 0;

    // VALIDATE actual payment if needed
    if (actualReceived > 0) {
      if (!ujbDistForm.modeOfPayment) {
        Swal.fire({ icon: "warning", title: "Mode required" });
        setIsSubmittingPayment(false);
        return;
      }
      if (
        ujbDistForm.modeOfPayment !== "Cash" &&
        !ujbDistForm.transactionRef
      ) {
        Swal.fire({ icon: "warning", title: "Transaction Ref required" });
        setIsSubmittingPayment(false);
        return;
      }
    }

    // upload invoice (optional)
    let invoiceURL = "";
    if (ujbDistForm.paymentInvoice && actualReceived > 0) {
      const fileRef = ref(storage, `ujbDistributions/${id}/${Date.now()}_${ujbDistForm.paymentInvoice.name}`);
      await uploadBytes(fileRef, ujbDistForm.paymentInvoice);
      invoiceURL = await getDownloadURL(fileRef);
    }

    // Final amount deducted from UJB = actualReceived (NOT adjusted part)
    const ujbDeduction = actualReceived; 

    if (ujbDeduction > currentUjb) {
      Swal.fire({ icon: "error", title: "Insufficient UJB balance" });
      setIsSubmittingPayment(false);
      return;
    }

    // Prepare payment entry
    const paymentId = generatePaymentId("UJB");
    const record = {
      paymentId,
      paymentFrom: "UJustBe",
      paymentFromName: "UJustBe",
      paymentTo: recipient,
      paymentToName: mapToActualName(recipient),
      paymentDate: ujbDistForm.paymentDate,
      modeOfPayment: ujbDistForm.modeOfPayment || "",
      transactionRef: ujbDistForm.transactionRef || "",
      comment: ujbDistForm.comment,
      adjustedAmount,
      actualReceived,
      amountReceived: requestAmount, // shown as total
      paymentInvoiceURL: invoiceURL,
      feeType: "distribution",
      createdAt: Timestamp.now(),
      meta: { distributionType: "UJB_TO_PARTY" }
    };

    // update payments
    const newPayments = [...payments, record];

    const updates = {
      payments: newPayments,
      ujbBalance: Math.round((currentUjb - ujbDeduction) * 100) / 100
    };

    // update paidTo counters
    if (recipient === "Orbiter") updates.paidToOrbiter = (paidToOrbiter + requestAmount).toFixed(2);
    if (recipient === "OrbiterMentor") updates.paidToOrbiterMentor = (paidToOrbiterMentor + requestAmount).toFixed(2);
    if (recipient === "CosmoMentor") updates.paidToCosmoMentor = (paidToCosmoMentor + requestAmount).toFixed(2);

    await updateDoc(doc(db, COLLECTIONS.referral, id), updates);
    setPayments(newPayments);

    // Update User Detail (adjustment deduction)
    if (adj.targetDocRef) {
      const log = {
        date: new Date().toISOString(),
        receivedAmount: requestAmount,
        adjustedAmount,
        actualReceived,
        referralId: id,
        paymentMode: actualReceived > 0 ? ujbDistForm.modeOfPayment : "Adjusted",
        transactionRef: actualReceived > 0 ? ujbDistForm.transactionRef : "",
      };

      await updateDoc(adj.targetDocRef, {
        [`${adj.paySectionKey}.amount`]: adj.newAmountRemaining,
        [`${adj.paySectionKey}.status`]: adj.newAmountRemaining === 0 ? "paid" : "adjusted",
        [`${adj.paySectionKey}.lastUpdated`]: new Date().toISOString(),
        [`${adj.paySectionKey}.adjustmentLogs`]: arrayUnion(log)
      });
    }

    Swal.fire({ icon: "success", title: "Distributed Successfully" });

    setShowUjbDistributionForm(false);
    closeForm();
  } catch (err) {
    console.error(err);
    Swal.fire({ icon: "error", title: "Error", text: "Failed to distribute." });
  }

  setIsSubmittingPayment(false);
};

// ========================================================
// HANDLER 2: Distribution From Slot (same logic + slot linking)
// ========================================================
// ========================================================
// HANDLER 2: Distribution From Slot (slot-aware version)
// ========================================================
const handleUJBDistributionFromSlot = async () => {
  if (isSubmittingPaymentRef.current) return;
  setIsSubmittingPayment(true);

  try {
    const recipient = ujbDistForm.recipient;
    if (!recipient) {
      Swal.fire({ icon: "warning", title: "Select recipient" });
      setIsSubmittingPayment(false);
      return;
    }

    // Determine requested amount:
    const requestedFromForm = Number(ujbDistForm.amount || 0);
    const requested = ujbDistributionFromSlot
      ? ujbDistAllowAdjust
        ? requestedFromForm
        : Number(ujbDistributionOriginalSlotAmount || 0)
      : requestedFromForm;

    if (!requested || requested <= 0) {
      Swal.fire({ icon: "warning", title: "Invalid amount", text: "Enter a valid amount." });
      setIsSubmittingPayment(false);
      return;
    }

    // UJB cash balance
    const currentUjb = Number(referralData?.ujbBalance || 0);
    if (currentUjb <= 0) {
      Swal.fire({ icon: "error", title: "No UJustBe balance", text: "UJustBe has no balance to distribute." });
      setIsSubmittingPayment(false);
      return;
    }

    // Pick target user info
    let targetUser = null;
    if (recipient === "Orbiter") targetUser = orbiter;
    if (recipient === "OrbiterMentor")
      targetUser = { name: orbiter?.mentorName, ujbCode: orbiter?.mentorUjbCode };
    if (recipient === "CosmoMentor")
      targetUser = { name: cosmoOrbiter?.mentorName, ujbCode: cosmoOrbiter?.mentorUjbCode };

    // Process adjustment against userDetail
    const adj = await processAdjustmentForTarget(recipient, requested, targetUser);

    const adjustedAmount = Number(adj.adjustedAmount || 0); // amount adjusted internally (no cash)
    const actualReceived = Number(adj.actualReceived || 0); // cash that must be moved now
    const newAmountRemaining = adj.newAmountRemaining; // for userDetail update (if provided)

    // VALIDATE cash portion if any
    if (actualReceived > 0) {
      if (!ujbDistForm.modeOfPayment) {
        Swal.fire({ icon: "warning", title: "Mode Required", text: "Select mode for actual transfer." });
        setIsSubmittingPayment(false);
        return;
      }
      if (ujbDistForm.modeOfPayment !== "Cash" && !ujbDistForm.transactionRef) {
        Swal.fire({ icon: "warning", title: "Transaction Reference Required", text: "Provide a transaction reference." });
        setIsSubmittingPayment(false);
        return;
      }
    }

    // Ensure UJB has enough cash for the actualReceived portion
    if (actualReceived > currentUjb) {
      Swal.fire({ icon: "error", title: "Insufficient UJB balance", text: `UJustBe balance is ₹${currentUjb}.` });
      setIsSubmittingPayment(false);
      return;
    }

    // upload invoice only if actual cash moved
    let invoiceURL = "";
    if (ujbDistForm.paymentInvoice && actualReceived > 0) {
      const fileRef = ref(storage, `ujbDistributions/${id}/${Date.now()}_${ujbDistForm.paymentInvoice.name}`);
      await uploadBytes(fileRef, ujbDistForm.paymentInvoice);
      invoiceURL = await getDownloadURL(fileRef);
    }

    // Build payment record
    const paymentId = generatePaymentId(recipient.toUpperCase().slice(0, 3));
    const record = {
      paymentId,
      paymentFrom: "UJustBe",
      paymentFromName: "UJustBe",
      paymentTo: recipient,
      paymentToName: mapToActualName(recipient),
      paymentDate: ujbDistForm.paymentDate,
      modeOfPayment: ujbDistForm.modeOfPayment || "",
      transactionRef: ujbDistForm.transactionRef || "",
      comment: ujbDistForm.comment || "",
      // Store both the total requested (what recipient receives) and split info
      amountReceived: requested,
      adjustedAmount, // internal adjustment portion (no cash)
      actualReceived, // cash portion moved now
      paymentInvoiceURL: invoiceURL,
      feeType: "distribution",
      createdAt: Timestamp.now(),
      meta: {
        distributionType: "UJB_TO_PARTY",
        viaSlot: true,
        originalRequested: ujbDistributionOriginalSlotAmount || null,
        belongsToPaymentId: ujbDistributionBelongsToPaymentId || null,
      },
    };

    // Update payments list + ujbBalance
    const newPayments = [...payments, record];
    const newUjbBalance = Math.round((currentUjb - actualReceived) * 100) / 100;

    const updates = {
      payments: newPayments,
      ujbBalance: newUjbBalance,
    };

    // Update paidTo counters by TOTAL recipient amount (requested)
    if (recipient === "Orbiter") updates.paidToOrbiter = Math.round((paidToOrbiter + requested) * 100) / 100;
    if (recipient === "OrbiterMentor")
      updates.paidToOrbiterMentor = Math.round((paidToOrbiterMentor + requested) * 100) / 100;
    if (recipient === "CosmoMentor")
      updates.paidToCosmoMentor = Math.round((paidToCosmoMentor + requested) * 100) / 100;

    await updateDoc(doc(db, COLLECTIONS.referral, id), updates);
    setPayments(newPayments);

    // If adjustment touched userDetail, update that doc
    if (adj.targetDocRef) {
      const paySectionKey = adj.paySectionKey || (recipient === "Orbiter" ? "payment.orbiter" : "payment.mentor");
      const newStatus = Number(adj.newAmountRemaining || 0) === 0 ? "paid" : "adjusted";

      const logEntry = {
        date: new Date().toISOString(),
        requestedAmount: requested,
        adjustedAmount,
        actualReceived,
        referralId: id,
        paymentMode: actualReceived > 0 ? ujbDistForm.modeOfPayment : "Adjusted",
        transactionRef: actualReceived > 0 ? ujbDistForm.transactionRef || "" : "",
      };

      await updateDoc(adj.targetDocRef, {
        [`${paySectionKey}.amount`]: adj.newAmountRemaining,
        [`${paySectionKey}.status`]: newStatus,
        [`${paySectionKey}.lastUpdated`]: new Date().toISOString(),
        [`${paySectionKey}.adjustmentLogs`]: arrayUnion(logEntry),
      });
    }

    await Swal.fire({
      icon: "success",
      title: "Distributed",
      text: `₹${requested} processed to ${mapToActualName(recipient)} (₹${adjustedAmount} adjusted, ₹${actualReceived} transferred).`,
    });

    // Reset and close
    setShowUjbDistributionForm(false);
    setUjbDistributionFromSlot(false);
    setUjbDistributionOriginalSlotAmount(0);
    setUjbDistAllowAdjust(false);
    setUjbDistributionBelongsToPaymentId(null);
    closeForm();
  } catch (err) {
    console.error("Error in handleUJBDistributionFromSlot:", err);
    await Swal.fire({ icon: "error", title: "Error", text: "Failed to distribute payment. Please try again." });
  }

  setIsSubmittingPayment(false);
};

useEffect(() => {
  if (!referralData?.serviceName && !referralData?.productName) return;

  const fetchItemDetails = async () => {
    try {
      const userId = referralData.userId; // owner of the service/product

      const userDoc = await getDoc(doc(db, COLLECTIONS.userDetail, userId));
      if (!userDoc.exists()) return;

      const user = userDoc.data();

      // find matching service
      const foundService = user.services?.find(
        s => s.name.toLowerCase() === referralData.serviceName?.toLowerCase()
      );

      // find matching product
      const foundProduct = user.products?.find(
        p => p.name.toLowerCase() === referralData.productName?.toLowerCase()
      );

      setReferralData(prev => ({
        ...prev,
        service: foundService,
        product: foundProduct
      }));

    } catch (err) {
      console.error("Error loading service/product details:", err);
    }
  };

  fetchItemDetails();
}, [referralData?.serviceName, referralData?.productName]);

  const handleAddPayment_NewFlow = async () => {
    if (isSubmittingPaymentRef.current) return;
    setIsSubmittingPayment(true);

    try {
      // Basic required fields
      if (
        !newPayment.paymentFrom ||
        !newPayment.paymentTo ||
        !newPayment.paymentDate ||
        newPayment.amountReceived === ""
      ) {
        await Swal.fire({
          icon: "warning",
          title: "Missing Fields",
          text: "Please fill in all required fields before submitting.",
        });
        setIsSubmittingPayment(false);
        return;
      }

      const today = new Date().toISOString().split("T")[0];
      if (newPayment.paymentDate > today) {
        await Swal.fire({
          icon: "error",
          title: "Invalid date",
          text: "Payment date cannot be in the future.",
        });
        setIsSubmittingPayment(false);
        return;
      }

      const candidatePayment = { ...newPayment };
      const amount = Number(candidatePayment.amountReceived || 0);
      if (isNaN(amount) || amount <= 0) {
        await Swal.fire({
          icon: "error",
          title: "Invalid Amount",
          text: "Payment amount must be greater than zero.",
        });
        setIsSubmittingPayment(false);
        return;
      }

      // Ensure deal exists
      if (!dealAlreadyCalculated) {
        await Swal.fire({
          icon: "error",
          title: "Deal not calculated",
          text: "Please calculate the deal distribution before adding payments.",
        });
        setIsSubmittingPayment(false);
        return;
      }

      // Check remaining agreed
      const agreed = getAgreedAmount();
      const paidSoFar = getCosmoPaidSoFar(payments);
      const remaining = Math.max(0, agreed - paidSoFar);

      if (amount > remaining) {
        await Swal.fire({
          icon: "error",
          title: "Overpayment prevented",
          text: `The remaining agreed amount is ₹${remaining}. You cannot add ₹${amount}.`,
        });
        setIsSubmittingPayment(false);
        return;
      }

      // duplicate check (simple)
      if (isDuplicatePayment(payments, candidatePayment)) {
        await Swal.fire({
          icon: "info",
          title: "Duplicate Payment",
          text: "A similar payment is already present in history.",
        });
        setIsSubmittingPayment(false);
        return;
      }

      // For any actual received > 0 (Cosmo paying actual money to UJustBe) require mode/txn if not cash
      if (!candidatePayment.modeOfPayment) {
        await Swal.fire({
          icon: "warning",
          title: "Mode of Payment Required",
          text: "Please select a payment mode for this Cosmo payment.",
        });
        setIsSubmittingPayment(false);
        return;
      }
      if (candidatePayment.modeOfPayment !== "Cash" && !candidatePayment.transactionRef) {
        await Swal.fire({
          icon: "warning",
          title: "Transaction Reference Required",
          text: "Please provide transaction reference for the payment.",
        });
        setIsSubmittingPayment(false);
        return;
      }
      // NOTE: Invoice is NO LONGER mandatory -> removed validation here

      // Upload invoice (optional)
      let paymentInvoiceURL = "";
      if (candidatePayment.paymentInvoice) {
        const fileRef = ref(
          storage,
          `paymentInvoices/${id}/${Date.now()}_${candidatePayment.paymentInvoice.name}`
        );
        await uploadBytes(fileRef, candidatePayment.paymentInvoice);
        paymentInvoiceURL = await getDownloadURL(fileRef);
      }

      // Compute distribution proportional to agreed shares (informational only)
      const distribution = computeProportionalDistribution(amount);

      // Build payment record with distribution breakdown and remaining after this payment
      const newPaidSoFar = paidSoFar + amount;
      const remainingAfter = Math.max(0, agreed - newPaidSoFar);

      const paymentId = generatePaymentId("COSMO");

      const toSave = {
        paymentId,
        paymentFrom: "CosmoOrbiter",
        paymentFromName: mapToActualName("CosmoOrbiter"),
        paymentTo: "UJustBe",
        paymentToName: mapToActualName("UJustBe"),
        paymentDate: candidatePayment.paymentDate,
        modeOfPayment: candidatePayment.modeOfPayment || "",
        transactionRef: candidatePayment.transactionRef || "",
        comment: candidatePayment.comment || "",
        amountReceived: amount,
        distribution,
        adjustedAmount: 0, // adjustments not used for this flow
        actualReceived: amount,
        paymentInvoiceURL,
        feeType: "upfront",
        createdAt: Timestamp.now(),
        remainingAfter,
        meta: {
          isCosmoToUjb: true,
          isPartial: amount < agreed,
          partialRemainingBefore: remaining,
          partialRemainingAfter: remainingAfter,
        },
      };

      // Update referral document: append payment, update ujbBalance, flags
      const referralDocRef = doc(db, COLLECTIONS.referral, id);
      const updatedPayments = [...payments, toSave];
      const currentUjbBalance = Number(referralData?.ujbBalance || 0);
      // UJB receives FULL amount from Cosmo
      const newUjbBalance =
        Math.round((currentUjbBalance + amount) * 100) / 100;

      const updatePayload = {
        payments: updatedPayments,
        ujbBalance: newUjbBalance,
      };

      // If we've completed agreed amount, mark firstPaymentDone / fullyPaid
      if (newPaidSoFar >= agreed) {
        updatePayload.firstPaymentDone = true;
        updatePayload.agreedFullyPaidAt = Timestamp.now();
      } else {
        // ensure firstPaymentDone if any payment exists
        if (!referralData?.firstPaymentDone) {
          updatePayload.firstPaymentDone = true; // we received at least one cosmo payment
        }
      }

      // Optionally store remainingAgreed field for convenience
      updatePayload.agreedRemaining = remainingAfter;

      await updateDoc(referralDocRef, updatePayload);
      setPayments(updatedPayments);

      await Swal.fire({
        icon: "success",
        title: "Payment Saved",
        text: `₹${amount} received from Cosmo and added to UJustBe balance (₹${newUjbBalance}).`,
      });

      // Reset form
      setShowAddPaymentForm(false);
      setNewPayment({
        paymentFrom: "CosmoOrbiter",
        paymentTo: "UJustBe",
        paymentDate: "",
        amountReceived: "",
        modeOfPayment: "",
        transactionRef: "",
        comment: "",
        paymentInvoice: null,
        ujbShareType: "UJustBe",
        _targetUserDocRef: null,
        _feeType: "upfront",
      });
      setAdjustmentInfo({ adjustedAmount: 0, actualReceived: 0 });
      setIsSubmittingPayment(false);
    } catch (err) {
      console.error("Error in handleAddPayment_NewFlow (partial distribution):", err);
      await Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to add payment. Please try again.",
      });
      setIsSubmittingPayment(false);
    }
  };

  // -----------------------
  // HANDLE UJB -> Receiver Distribution (existing generic handler)
  // -----------------------
 

  // -----------------------
  // HANDLE UJB -> Receiver Distribution (FROM DISTRIBUTION SLOT)
  // This uses the exact slot amount shown in modal (unless admin toggles adjust)
  // -----------------------
 

  // -----------------------
  // MAP PAYMENT LABEL
  // -----------------------
  const mapToActualName = (key) => {
    switch (key) {
      case "Orbiter":
        return orbiter?.name || "Orbiter";
      case "OrbiterMentor":
        return orbiter?.mentorName || "Orbiter Mentor";
      case "CosmoOrbiter":
        return cosmoOrbiter?.name || "CosmoOrbiter";
      case "CosmoMentor":
        return cosmoOrbiter?.mentorName || "Cosmo Mentor";
      case "UJustBe":
        return "UJustBe";
      default:
        return key || "";
    }
  };
// ---------------------------
// UNIVERSAL AGREED VALUE CALCULATOR (SLABS + SINGLE MODE)
// ---------------------------
const calculateAgreedValue = (dealAmount, item) => {
  if (!item?.agreedValue) return 0;

  const av = item.agreedValue;
  const amt = Number(dealAmount) || 0;

  // SINGLE MODE
  if (av.mode === "single") {
    const type = av.single?.type;
    const value = Number(av.single?.value || 0);

    if (type === "percentage") return (amt * value) / 100;
    if (type === "amount") return value;
    return 0;
  }

  // MULTIPLE MODE → SLABS
  if (av.mode === "multiple") {
    const slabs = av.multiple?.slabs || [];
    if (!slabs.length) return 0;

    const matching = slabs
      .map((s) => ({
        ...s,
        from: Number(s.from),
        to: Number(s.to),
        value: Number(s.value),
      }))
      .filter((s) => amt >= s.from && amt <= s.to);

    if (!matching.length) return 0;

    // Option C → best match (highest FROM)
    const best = matching.reduce((a, b) => (b.from > a.from ? b : a));

    if (best.type === "percentage") return (amt * best.value) / 100;
    if (best.type === "amount") return best.value;

    return 0;
  }

  return 0;
};
// ---------------------------
// UPDATED DISTRIBUTION USING SLABS (Single + Multiple)
// ---------------------------


  // -----------------------
  // PAYMENT SHEET UI TRIGGERS
  // Use initPaymentForModal() to open payment modal with correct defaults
const openPaymentModal = () => {
  initPaymentForModal();

  setShowPaymentSheet(true);      // ensure sheet is open
  setShowUjbDistributionForm(false);
  setShowAddPaymentForm(true);    // THIS SHOWS THE PAYMENT MODAL
};

  // -----------------------
  // HANDLE STATUS UPDATE
  // -----------------------
 const handleUpdate = async (e) => {
  e.preventDefault();

  if (isUpdatingStatusRef.current) return;
  setIsUpdatingStatus(true);

  try {
    const referralRef = doc(db, COLLECTIONS.referral, id);
    const snap = await getDoc(referralRef);
    const oldStatus = snap.exists() ? snap.data().dealStatus : null;

    if (oldStatus === formState.dealStatus) {
      await Swal.fire({
        icon: "info",
        title: "No change",
        text: "Deal status is already set to the selected value.",
      });
      setIsUpdatingStatus(false);
      return;
    }

    const newStatus = formState.dealStatus;

    const newLog = {
      status: newStatus,
      updatedAt: Timestamp.now(),
    };

    // === UPDATE Firestore ===
    await updateDoc(referralRef, {
      dealStatus: newStatus,
      statusLogs: arrayUnion(newLog),
      lastUpdated: Timestamp.now(),
    });

    await Swal.fire({
      icon: "success",
      title: "Status Updated",
      text: "Referral status updated successfully.",
    });

    // ============================================================
    // 🚀 SEND WHATSAPP MESSAGES
    // ============================================================
    const serviceOrProductName =
      referralData?.service?.name || referralData?.product?.name || "the service";

    // 👤 Orbiter
    if (referralData?.orbiter?.phone) {
      await sendWhatsAppMessage(
        referralData.orbiter.phone,
        [
          referralData.orbiter.name,
          `Status for your referral of *${serviceOrProductName}* is updated to *${newStatus}*.`,
        ],
        "deal_status_update"
      );
    }

    // 👤 Cosmo Orbiter
    if (referralData?.cosmoOrbiter?.phone) {
      await sendWhatsAppMessage(
        referralData.cosmoOrbiter.phone,
        [
          referralData.cosmoOrbiter.name,
          `The referral you received for *${serviceOrProductName}* is now *${newStatus}*.`,
        ],
        "deal_status_update"
      );
    }

    // ⭐ Mentors get messages ONLY on important statuses
    if (
      ["Deal Won", "Deal Lost", "Agreed % Transferred to UJustBe"].includes(newStatus)
    ) {
      // Orbiter Mentor
      if (referralData.orbiter?.mentorPhone) {
        await sendWhatsAppMessage(
          referralData.orbiter.mentorPhone,
          [
            referralData.orbiter.mentorName,
            `Your mentee *${referralData.orbiter.name}* has a referral update: *${newStatus}* for *${serviceOrProductName}*.`,
          ],
          "deal_status_update"
        );
      }

      // Cosmo Mentor
      if (referralData.cosmoOrbiter?.mentorPhone) {
        await sendWhatsAppMessage(
          referralData.cosmoOrbiter.mentorPhone,
          [
            referralData.cosmoOrbiter.mentorName,
            `Your mentee *${referralData.cosmoOrbiter.name}* has an update: *${newStatus}* for *${serviceOrProductName}*.`,
          ],
          "deal_status_update"
        );
      }
    }
    // ============================================================

    // update UI flags
    const paymentEligibleStatuses = [
      "Deal Won",
      "Work in Progress",
      "Work Completed",
      "Received Part Payment and Transferred to UJustBe",
      "Received Full and Final Payment",
      "Agreed % Transferred to UJustBe",
    ];
    if (paymentEligibleStatuses.includes(newStatus)) {
      setDealEverWon(true);
    }
  } catch (error) {
    console.error("Error updating referral:", error);
    await Swal.fire({
      icon: "error",
      title: "Failed",
      text: "Failed to update referral status.",
    });
  } finally {
    setIsUpdatingStatus(false);
  }
};

  // -----------------------
  // New helpers for inline distribution
  // -----------------------

  // returns array of payments that belong to a given cosmo payment id
  const paymentsBelongingTo = (paymentId) => {
    if (!paymentId) return [];
    return (payments || []).filter((p) => p?.meta?.belongsToPaymentId === paymentId);
  };

  // returns how much of 'recipient' has already been paid from a particular cosmo payment slot
  const slotPaidAmount = (paymentId, recipientKey) => {
    const related = paymentsBelongingTo(paymentId);
    return related.reduce((s, r) => {
      try {
        if (r.paymentTo === recipientKey) return s + Number(r.amountReceived || 0);
      } catch (e) {}
      return s;
    }, 0);
  };

  // whether a slot (slotAmount) is fully paid for recipient
  const isSlotFullyPaid = (paymentId, recipientKey, slotAmount) => {
    const paid = slotPaidAmount(paymentId, recipientKey);
    // treat small rounding differences as paid
    return Math.round(paid * 100) / 100 >= Math.round(slotAmount * 100) / 100 - 0.01;
  };

  // open inline distribution expansion toggle
  const toggleExpandDistribution = (paymentId) => {
    if (expandedDistributionFor === paymentId) setExpandedDistributionFor(null);
    else setExpandedDistributionFor(paymentId);
  };

  // -----------------------
  // New: Open UJB Distribution form directly from distribution inline slot
  // recipientKey is "Orbiter" | "OrbiterMentor" | "CosmoMentor"
  // slotAmount is the exact amount shown in distribution inline
  // paymentId is the originating cosmo payment id
  // -----------------------
  const openPayFromDistribution = (recipientKey, slotAmount, paymentId = null) => {
    // open UJB distribution form and pre-fill recipient + amount
    setUjbDistributionFromSlot(true);
    setUjbDistributionOriginalSlotAmount(slotAmount);
    setUjbDistributionBelongsToPaymentId(paymentId || null);
    setUjbDistForm((prev) => ({
      ...prev,
      recipient: recipientKey,
      amount: slotAmount,
      paymentDate: new Date().toISOString().split("T")[0],
      modeOfPayment: "",
      transactionRef: "",
      paymentInvoice: null,
      comment: "",
    }));
    // default: no adjust allowed (amount read-only). Admin may toggle Adjust.
    setUjbDistAllowAdjust(false);
    setShowUjbDistributionForm(true);
    setShowPaymentSheet(true);
  };

  // -----------------------
  // Derived earned shares & remaining (phase-wise based on cosmo payments)
  // -----------------------
  const totalCosmoPaid = getCosmoPaidSoFar(payments);
  const agreedAmount = getAgreedAmount();

  // earned shares unlocked so far (based only on actual Cosmo payments)
  const earnedShares = {
    orbiter: Math.round(totalCosmoPaid * 0.5 * 100) / 100,
    orbiterMentor: Math.round(totalCosmoPaid * 0.15 * 100) / 100,
    cosmoMentor: Math.round(totalCosmoPaid * 0.15 * 100) / 100,
    ujb: Math.round(totalCosmoPaid * 0.2 * 100) / 100,
  };

  // already paid to parties
  const paidToOrbiter = Number(referralData?.paidToOrbiter || 0);
  const paidToOrbiterMentor = Number(referralData?.paidToOrbiterMentor || 0);
  const paidToCosmoMentor = Number(referralData?.paidToCosmoMentor || 0);

  const orbiterRemaining = Math.max(0, earnedShares.orbiter - paidToOrbiter);
  const orbiterMentorRemaining = Math.max(
    0,
    earnedShares.orbiterMentor - paidToOrbiterMentor
  );
  const cosmoMentorRemaining = Math.max(
    0,
    earnedShares.cosmoMentor - paidToCosmoMentor
  );

  // UJB current balance from Firestore (full collected amount)
  const currentUjbBalance = Number(referralData?.ujbBalance || 0);

  // percentage progress toward agreed amount (based on cosmo paid so far)
  const progressPct =
    agreedAmount > 0
      ? Math.min(100, Math.round((totalCosmoPaid / agreedAmount) * 10000) / 100)
      : 0;

  // convenience display remaining agreed & agreed
  const cosmoPaid = totalCosmoPaid;
  const agreedRemaining = Math.max(0, agreedAmount - cosmoPaid);

  // -----------------------
  // RENDER
  // -----------------------
  if (loading || !referralData) return <p>Loading...</p>;

  const { service, product, referralId } = referralData;

  return (
    <Layouts>
      {/* ========================== HEADER ============================= */}
      <div className="profileHeaderOneLine">
        <img
          src="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD..."
          alt="Profile"
          className="profilePhoto"
        />
        <span className="name">
          <p>
            <strong>Referral Type:</strong> {formState.referralType || "—"}
          </p>
        </span>
        <span className="company">
          <p>
            <strong>Referral ID:</strong> {referralId || "—"}
          </p>
        </span>

        <div className="actions">
          <button onClick={() => setShowDealCard(!showDealCard)}>Deal Value</button>

          <span
            className={`statusBadge ${formState.dealStatus
              ?.toLowerCase()
              .replace(/\s/g, "-")}`}
          >
            {formState.dealStatus || "Pending"}
          </span>
        </div>
      </div>

      {/* ========================== MAIN ============================= */}
      <section className="ReferralDetailMain">
        <div className="ReferralInfo">
          {/* ========================== STATUS CARD ============================= */}
          <div className="card ReferralStatusCard">
            <div className="cardHeader">
              <h2>Referral Details</h2>
              <span
                className={`statusBadge ${formState.dealStatus
                  ?.toLowerCase()
                  .replace(/\s/g, "-")}`}
              >
                {formState.dealStatus || "Pending"}
              </span>
            </div>

            {/* STATUS UPDATE */}
            <div className="cardSection">
              <label>
                Deal Status:
                <select
                  name="dealStatus"
                  value={formState.dealStatus}
                  onChange={(e) =>
                    setFormState({ ...formState, dealStatus: e.target.value })
                  }
                >
                  <option value="Pending">Pending</option>
                  <option value="Reject">Reject</option>
                  <option value="Not Connected">Not Connected</option>
                  <option value="Called but Not Answered">
                    Called but Not Answered
                  </option>
                  <option value="Discussion in Progress">
                    Discussion in Progress
                  </option>
                  <option value="Hold">Hold</option>
                  <option value="Deal Won">Deal Won</option>
                  <option value="Deal Lost">Deal Lost</option>
                  <option value="Work in Progress">Work in Progress</option>
                  <option value="Work Completed">Work Completed</option>
                  <option value="Received Part Payment and Transferred to UJustBe">
                    Received Part Payment and Transferred to UJustBe
                  </option>
                  <option value="Received Full and Final Payment">
                    Received Full and Final Payment
                  </option>
                  <option value="Agreed % Transferred to UJustBe">
                    Agreed % Transferred to UJustBe
                  </option>
                </select>
              </label>
              <button onClick={handleUpdate} disabled={isUpdatingStatus}>
                {isUpdatingStatus ? "Updating..." : "Update Status"}
              </button>
            </div>

            {/* STATUS HISTORY */}
            {referralData?.statusLogs && referralData.statusLogs.length > 0 && (
              <div className="statusHistory">
                <h4>Status History</h4>
                <ul>
                  {referralData.statusLogs.map((log, i) => (
                    <li key={i}>
                      <div className="timelineDot"></div>
                      <div className="timelineContent">
                        <span className="statusLabel">{log.status}</span>
                        <span className="statusDate">
                          {log.updatedAt && log.updatedAt.seconds
                            ? new Date(
                                log.updatedAt.seconds * 1000
                              ).toLocaleString()
                            : new Date(log.updatedAt || "").toLocaleString()}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* ========================== ORBITER/ COSMO PROFILE TABS ============================= */}
          <div className="card OrbiterProfileCard">
            <div className="profileTabs">
              <button
                className={activeProfileTab === "Orbiter" ? "active" : ""}
                onClick={() => setActiveProfileTab("Orbiter")}
              >
                Orbiter
              </button>
              <button
                className={activeProfileTab === "Cosmo" ? "active" : ""}
                onClick={() => setActiveProfileTab("Cosmo")}
              >
                CosmoOrbiter
              </button>
            </div>

            {/* ORBITER PROFILE */}
            {activeProfileTab === "Orbiter" && orbiter && (
              <div className="profileCard">
                <div className="profileHeader">
                  <img
                    src={
                      orbiter?.profilePic ||
                      "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD..."
                    }
                    alt={orbiter?.name || "Profile"}
                    className="profileImage"
                  />
                  <h2>{orbiter?.name || "No Name"}</h2>
                  <p className="profileSubtitle">Orbiter</p>
                </div>

                <div className="profileDetails">
                  <h3>Contact Details</h3>
                  <div className="detailsGrid">
                    <p>
                      <strong>Email:</strong> {orbiter?.email || "No Email"}
                    </p>
                    <p>
                      <strong>Phone:</strong> {orbiter?.phone || "No Phone"}
                    </p>
                    <p>
                      <strong>Mentor:</strong> {orbiter?.mentorName || "No Mentor"}
                    </p>
                    <p>
                      <strong>Mentor Phone:</strong>{" "}
                      {orbiter?.mentorPhone || "No Mentor Phone"}
                    </p>
                    <p>
                      <strong>UJB Code:</strong> {orbiter?.ujbCode || "No UJB Code"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* COSMO PROFILE */}
            {activeProfileTab === "Cosmo" && cosmoOrbiter && (
              <div className="profileCard">
                <div className="profileHeader">
                  <img
                    src={
                      cosmoOrbiter?.profilePic ||
                      "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD..."
                    }
                    alt={cosmoOrbiter?.name || "Profile"}
                    className="profileImage"
                  />
                  <h2>{cosmoOrbiter?.name || "No Name"}</h2>
                  <p className="profileSubtitle">CosmoOrbiter</p>
                </div>

                <div className="profileDetails">
                  <h3>Contact Details</h3>
                  <div className="detailsGrid">
                    <p>
                      <strong>Email:</strong> {cosmoOrbiter?.email || "No Email"}
                    </p>
                    <p>
                      <strong>Phone:</strong> {cosmoOrbiter?.phone || "No Phone"}
                    </p>
                    <p>
                      <strong>Mentor:</strong> {cosmoOrbiter?.mentorName || "No Mentor"}
                    </p>
                    <p>
                      <strong>Mentor Phone:</strong> {cosmoOrbiter?.mentorPhone || "No Mentor Phone"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ========================== SERVICE / PRODUCT CARD ============================= */}
          <div className="card serviceCard">
            <h2>{service ? "Service" : "Product"} Card</h2>

            <div className="serviceImg">
              <img
                src={
                  service?.imageURL ||
                  product?.imageURL ||
                  "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/No-Image-Placeholder-landscape.svg/1280px-No-Image-Placeholder-landscape.svg.png"
                }
                alt="Service/Product"
              />
            </div>

            <h3>{service?.name || product?.name || "No Name"}</h3>

            {service?.percentage ? (
              <p>
                <strong>Percentage:</strong> {service.percentage}%
              </p>
            ) : product?.percentage ? (
              <p>
                <strong>Percentage:</strong> {product.percentage}%
              </p>
            ) : null}

            <button
              className="calcDealBtn"
              onClick={() => setShowModal(true)}
              disabled={dealAlreadyCalculated}
            >
              {dealAlreadyCalculated ? "Deal Already Calculated" : "Calculate Deal Value"}
            </button>
          </div>

          {/* ========================== DEAL MODAL ============================= */}
          {showModal && (
            <div className="modalOverlay">
              <div className="modalContent">
                <h3>Enter Deal Value</h3>
                <label>
                  Deal Value:
                  <input
                    type="number"
                    name="dealValue"
                    value={formState.dealValue}
                    onChange={(e) =>
                      setFormState({ ...formState, dealValue: e.target.value })
                    }
                    placeholder="Enter deal value"
                  />
                </label>

                {formState.dealValue &&
                  (() => {
                    const d = calculateDistribution();
                    return (
                      <div className="distribution-box">
                        <h4>Distribution Breakdown</h4>
                        <p>
                          <strong>Total Agreed Amount:</strong> ₹
                          {d.agreedAmount.toFixed(2)}
                        </p>
                        <p>
                          <strong>Orbiter:</strong> ₹{d.orbiterShare.toFixed(2)}
                        </p>
                        <p>
                          <strong>Orbiter Mentor:</strong> ₹
                          {d.orbiterMentorShare.toFixed(2)}
                        </p>
                        <p>
                          <strong>Cosmo Mentor:</strong> ₹
                          {d.cosmoMentorShare.toFixed(2)}
                        </p>
                        <p>
                          <strong>UJustBe:</strong> ₹{d.ujustbeShare.toFixed(2)}
                        </p>
                      </div>
                    );
                  })()}

                <div className="modalActions">
                  <button onClick={handleSaveDealLog}>Save</button>
                  <button
                    className="cancelBtn"
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================== DEAL LOG POPUP CARD ============================= */}
          {showDealCard && (
            <div className="dealPopupCard">
              {dealLogs.length > 0 ? (
                <div className="dealCardsGrid">
                  {dealLogs.map((log, i) => (
                    <div className="dealCard" key={i}>
                      <p>
                        <strong>Date:</strong>{" "}
                        {new Date(log.timestamp).toLocaleString()}
                      </p>
                      <p>
                        <strong>Deal Value:</strong> ₹{log.dealValue}
                      </p>
                     
                      <p>
                        <strong>Agreed Amount:</strong> ₹
                        {log.agreedAmount.toFixed(2)}
                      </p>
                      <p>
                        <strong>Orbiter:</strong> ₹
                        {log.orbiterShare.toFixed(2)}
                      </p>
                      <p>
                        <strong>Mentor:</strong> ₹{log.orbiterMentorShare.toFixed(2)}
                      </p>
                      <p>
                        <strong>Cosmo Mentor:</strong> ₹
                        {log.cosmoMentorShare.toFixed(2)}
                      </p>
                      <p>
                        <strong>UJustBe:</strong> ₹{log.ujustbeShare.toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p>No deal logs yet.</p>
              )}
            </div>
          )}
        </div>
        {/* ========================== PAYMENT SUMMARY CARD ============================= */}
{dealEverWon && (
  <div className="paymentSummaryCard">

    <div className="headerRow">
      <h4 className="sectionTitle">Payments & Distribution</h4>
    </div>

    {/* ==== SUMMARY GRID ==== */}
    <div className="summaryGrid">
      <div className="summaryItem">
        <span>Agreed</span>
        <strong>₹{agreedAmount.toLocaleString("en-IN")}</strong>
      </div>

      <div className="summaryItem">
        <span>Paid</span>
        <strong>₹{cosmoPaid.toLocaleString("en-IN")}</strong>
      </div>

      <div className="summaryItem">
        <span>Remaining</span>
        <strong>₹{agreedRemaining.toLocaleString("en-IN")}</strong>
      </div>

      <div className="summaryItem">
        <span>Progress</span>
        <strong>{progressPct}%</strong>
      </div>
    </div>

    {/* Progress Bar */}
    <div className="progressBarContainer">
      <div className="progressTrack">
        <div className="progressFill" style={{ width: `${progressPct}%` }} />
      </div>
      <small>{progressPct}% received</small>
    </div>

    {/* COLLAPSIBLE BREAKDOWN */}
    <div
      className="accordionHeader"
      onClick={() => setShowEarned(!showEarned)}
    >
      <strong>Earnings Breakdown</strong>
      <span>{showEarned ? "▲" : "▼"}</span>
    </div>

    {showEarned && (
      <div className="accordionContent">
        <div className="breakdownRow">
          <span>Orbiter</span>
          <strong>
            ₹{earnedShares.orbiter.toLocaleString("en-IN")}
            <em> (Rem: ₹{orbiterRemaining.toLocaleString("en-IN")})</em>
          </strong>
        </div>

        <div className="breakdownRow">
          <span>Orbiter Mentor</span>
          <strong>
            ₹{earnedShares.orbiterMentor.toLocaleString("en-IN")}
            <em> (Rem: ₹{orbiterMentorRemaining.toLocaleString("en-IN")})</em>
          </strong>
        </div>

        <div className="breakdownRow">
          <span>Cosmo Mentor</span>
          <strong>
            ₹{earnedShares.cosmoMentor.toLocaleString("en-IN")}
            <em> (Rem: ₹{cosmoMentorRemaining.toLocaleString("en-IN")})</em>
          </strong>
        </div>

        <div className="breakdownRow">
          <span>UJustBe (20%)</span>
          <strong>₹{earnedShares.ujb.toLocaleString("en-IN")}</strong>
        </div>

        <div className="breakdownRow">
          <span>UJB Balance</span>
          <strong>₹{currentUjbBalance.toLocaleString("en-IN")}</strong>
        </div>
      </div>
    )}

    {/* LAST PAYMENT */}
    <div className="lastPayment">
      {payments?.length > 0 ? (
        <span>
          Last: <strong>{mapToActualName(payments.at(-1).paymentFrom)}</strong> →
          <strong>{mapToActualName(payments.at(-1).paymentTo)}</strong> : ₹
          {payments.at(-1).amountReceived.toLocaleString("en-IN")}
        </span>
      ) : (
        <span>No payments yet</span>
      )}
    </div>

    {/* ACTION BUTTONS */}
    <div className="paymentActions">
      <button className="viewHistoryBtn" onClick={() => setShowPaymentSheet(true)}>
        View History
      </button>

      <button
        className="addPaymentBtn"
        onClick={openPaymentModal}
        disabled={!dealAlreadyCalculated || agreedRemaining <= 0}
        title={
          !dealAlreadyCalculated
            ? "Calculate deal first"
            : agreedRemaining <= 0
            ? "No remaining agreed amount"
            : ""
        }
      >
        + Add Cosmo Payment
      </button>
    </div>
  </div>
)}

        {/* ========================== FOLLOW UPS ============================= */}
       <div className="followupContainer">

  {/* === HEADER === */}
  <div
    className="followupHeader"
    onClick={() => setShowFollowups(!showFollowups)}
  >
    <h2>Follow Ups</h2>
    <span>{showFollowups ? "▲" : "▼"}</span>
  </div>

  {/* COLLAPSIBLE CONTENT */}
  {showFollowups && (
    <div className="followupContent">

      {/* ADD BUTTON */}
      <button
        className="addFollowupBtn"
        onClick={() => setShowFollowupForm(!showFollowupForm)}
      >
        {showFollowupForm ? "Cancel" : "+ Add Follow Up"}
      </button>

      {/* === ADD FORM === */}
      {showFollowupForm && (
        <div className="followupForm">
          <h4>Add Follow Up</h4>

          <label>
            Priority:
            <select
              name="priority"
              value={newFollowup.priority}
              onChange={(e) =>
                setNewFollowup({ ...newFollowup, priority: e.target.value })
              }
            >
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>
          </label>

          <label>
            Next Date:
            <input
              type="date"
              value={newFollowup.date}
              onChange={(e) =>
                setNewFollowup({ ...newFollowup, date: e.target.value })
              }
            />
          </label>

          <label>
            Description:
            <textarea
              value={newFollowup.description}
              onChange={(e) =>
                setNewFollowup({ ...newFollowup, description: e.target.value })
              }
            />
          </label>

          <label>
            Status:
            <select
              value={newFollowup.status}
              onChange={(e) =>
                setNewFollowup({ ...newFollowup, status: e.target.value })
              }
            >
              <option>Pending</option>
              <option>Completed</option>
            </select>
          </label>

          <div className="formButtons">
            <button
              type="button"
              onClick={async () => {
                try {
                  const updatedFollowups = [...followups, newFollowup];
                  const d = doc(db, COLLECTIONS.referral, id);
                  await updateDoc(d, { followups: updatedFollowups });

                  setFollowups(updatedFollowups);

                  setNewFollowup({
                    priority: "Medium",
                    date: "",
                    description: "",
                    status: "Pending",
                  });

                  Swal.fire({
                    icon: "success",
                    title: "Added",
                    text: "Follow-up added successfully.",
                  });
                } catch (err) {
                  Swal.fire({
                    icon: "error",
                    title: "Error",
                    text: "Failed to add follow-up.",
                  });
                }
              }}
            >
              Save Follow Up
            </button>

            <button
              type="button"
              className="cancelBtn"
              onClick={() => setShowFollowupForm(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* === LIST === */}
      {followups.length > 0 ? (
        followups.map((f, i) => (
          <div className="followupCard" key={i}>
            <div className="followupCardHeader">
              <span className={`priorityBadge ${f.priority.toLowerCase()}`}>
                {f.priority}
              </span>
              <span className="statusTag">{f.status}</span>
            </div>

            <p><strong>Date:</strong> {f.date}</p>
            <p><strong>Description:</strong> {f.description}</p>
          </div>
        ))
      ) : (
        <p className="noFollowupText">No follow-ups yet.</p>
      )}

    </div>
  )}
</div>




      </section>

      {/* ========================== PAYMENT SLIDING SHEET ============================= */}
      <div className={`PaymentSheet ${showPaymentSheet ? "open" : ""}`}>
        <div className="sheetHeader">
          <h3>
            {showAddPaymentForm
              ? "Add Payment (Cosmo → UJustBe)"
              : showUjbDistributionForm
              ? "Distribute from UJustBe"
              : "Payment History"}
          </h3>
          <button onClick={() => setShowPaymentSheet(false)}>✕</button>
        </div>

        {/* ===================== PAYMENT HISTORY VIEW ===================== */}
        {!showAddPaymentForm && !showUjbDistributionForm && (
          <>
            {payments.length > 0 ? (
              payments.map((pay, idx) => (
                <div className="paymentCard" key={idx}>
                  <div className="paymentCardHeader">
                    <h4>₹{pay.amountReceived}</h4>
                    <small>{pay.paymentId ? `ID: ${pay.paymentId}` : ""}</small>
                  </div>

                  <p>
                    <strong>From:</strong> {mapToActualName(pay.paymentFrom)}
                  </p>
                  <p>
                    <strong>To:</strong> {mapToActualName(pay.paymentTo)}
                  </p>
                  <p>
                    <strong>Mode:</strong> {pay.modeOfPayment || "—"}
                  </p>
                  <p>
                    <strong>Date:</strong> {pay.paymentDate}
                  </p>

                  <div className="paymentAmounts">
                    <p>
                      <strong>Total Amount Received:</strong> ₹
                      {pay.amountReceived || 0}
                    </p>

                    {/* Informational distribution (only stored for Cosmo → UJB payments) */}
                    {pay.distribution && (
                      <>
                        <p>
                          <strong>Distributed (informational):</strong>
                        </p>
                        <ul>
                          <li>
                            Orbiter: ₹
                            {(pay.distribution.orbiter || 0).toLocaleString(
                              "en-IN"
                            )}
                          </li>
                          <li>
                            Orbiter Mentor: ₹
                            {(
                              pay.distribution.orbiterMentor || 0
                            ).toLocaleString("en-IN")}
                          </li>
                          <li>
                            Cosmo Mentor: ₹
                            {(pay.distribution.cosmoMentor || 0).toLocaleString(
                              "en-IN"
                            )}
                          </li>
                          <li>
                            UJustBe: ₹
                            {(pay.distribution.ujustbe || 0).toLocaleString(
                              "en-IN"
                            )}
                          </li>
                        </ul>
                      </>
                    )}

                    {pay.remainingAfter !== undefined && (
                      <p>
                        <strong>Remaining Agreed After:</strong> ₹
                        {(pay.remainingAfter || 0).toLocaleString("en-IN")}
                      </p>
                    )}
                  </div>

                  {pay.transactionRef && (
                    <p>
                      <strong>Reference:</strong> {pay.transactionRef}
                    </p>
                  )}

                  {pay.comment && (
                    <p>
                      <strong>Comment:</strong> {pay.comment}
                    </p>
                  )}

                  {/* Show distribution controls ONLY for Cosmo → UJustBe payments */}
                  {pay.meta?.isCosmoToUjb && (
                    <div style={{ marginTop: 8 }}>
                      {/* Toggle inline distribution instead of modal */}
                      <button
                        className="viewDistributionBtn"
                        onClick={() => toggleExpandDistribution(pay.paymentId)}
                        style={{
                          background: "#007bff",
                          color: "#fff",
                          border: "none",
                          padding: "6px 10px",
                          borderRadius: 6,
                          cursor: "pointer",
                        }}
                      >
                        {expandedDistributionFor === pay.paymentId ? "Hide Distribution" : "View Distribution"}
                      </button>

                      {/* ====== GROUPED DISTRIBUTIONS BOX: show payouts that belong to this cosmo payment ====== */}
                      <div
                        className="groupedDistributionBox"
                        style={{
                          marginTop: 8,
                          padding: 8,
                          border: "1px dashed #ddd",
                          borderRadius: 6,
                          background: "#fafafa",
                        }}
                      >
                        <h5>Transaction breakdown for ₹{pay.amountReceived}</h5>

                        {/* filter distributions that belong to this cosmo payment */}
                        {(() => {
                          const related = payments.filter(
                            (p) => p.meta?.belongsToPaymentId === pay.paymentId
                          );

                          // sum distributions to compute how much UJB already forwarded for this cosmo payment
                          const sumDistributed = related.reduce(
                            (s, r) => s + Number(r.amountReceived || 0),
                            0
                          );

                          return (
                            <>
                              <p>
                                <strong>Cosmo → UJustBe:</strong> ₹
                                {pay.amountReceived.toLocaleString("en-IN")}
                              </p>

                              {related.length > 0 ? (
                                related.map((r, i) => (
                                  <p key={i}>
                                    <strong>{mapToActualName(r.paymentTo)}:</strong> ₹
                                    {Number(r.amountReceived).toLocaleString("en-IN")}
                                  </p>
                                ))
                              ) : (
                                <p style={{ fontStyle: "italic", color: "#666" }}>
                                  No payouts made from this Cosmo payment yet.
                                </p>
                              )}

                              <p style={{ marginTop: 6 }}>
                                <strong>UJustBe kept (this payment):</strong> ₹
                                {(
                                  (pay.distribution?.ujustbe || 0) - sumDistributed
                                ).toLocaleString("en-IN")}
                              </p>
                            </>
                          );
                        })()}
                      </div>

                      {/* ================= inline distribution expanded area ================= */}
                      {expandedDistributionFor === pay.paymentId && (
                        <div
                          className="inlineDistribution"
                          style={{
                            marginTop: 12,
                            padding: 10,
                            border: "1px solid #e6e6e6",
                            borderRadius: 6,
                            background: "#fff",
                          }}
                        >
                          <h4 style={{ marginTop: 0 }}>
                            Distribution slots (from this Cosmo payment)
                          </h4>

                          {/* show slot row for each recipient with Pay / PAID badge */}
                          {/* Orbiter slot */}
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              padding: "8px 0",
                              borderBottom: "1px solid #f0f0f0",
                            }}
                          >
                            <div>
                              <strong>Orbiter:</strong>{" "}
                              ₹{(pay.distribution?.orbiter || 0).toFixed(2)}
                              <div style={{ fontSize: 12, color: "#666" }}>
                                Remaining to Orbiter overall: ₹{orbiterRemaining.toLocaleString("en-IN")}
                              </div>
                            </div>

                            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                              {/* compute if slot fully paid */}
                              {isSlotFullyPaid(pay.paymentId, "Orbiter", Number(pay.distribution?.orbiter || 0)) ? (
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <span
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: 6,
                                      background: "#e8f8ed",
                                      color: "#2e7d32",
                                      padding: "4px 8px",
                                      borderRadius: 20,
                                      fontWeight: 600,
                                      fontSize: 13,
                                    }}
                                  >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                      <path d="M20 6L9 17L4 12" stroke="#2e7d32" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                    PAID
                                  </span>
                                </div>
                              ) : (
                                <button
                                  onClick={() =>
                                    openPayFromDistribution(
                                      "Orbiter",
                                      Number(pay.distribution?.orbiter || 0),
                                      pay.paymentId
                                    )
                                  }
                                  style={{
                                    background: "#ff7a00",
                                    color: "#fff",
                                    border: "none",
                                    padding: "6px 12px",
                                    borderRadius: 6,
                                    cursor: "pointer",
                                  }}
                                >
                                  Pay Orbiter ₹{Number(pay.distribution?.orbiter || 0).toFixed(2)}
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Orbiter Mentor slot */}
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              padding: "8px 0",
                              borderBottom: "1px solid #f0f0f0",
                            }}
                          >
                            <div>
                              <strong>Orbiter Mentor:</strong>{" "}
                              ₹{(pay.distribution?.orbiterMentor || 0).toFixed(2)}
                              <div style={{ fontSize: 12, color: "#666" }}>
                                Remaining to Orbiter Mentor overall: ₹{orbiterMentorRemaining.toLocaleString("en-IN")}
                              </div>
                            </div>

                            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                              {isSlotFullyPaid(pay.paymentId, "OrbiterMentor", Number(pay.distribution?.orbiterMentor || 0)) ? (
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <span
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: 6,
                                      background: "#e8f8ed",
                                      color: "#2e7d32",
                                      padding: "4px 8px",
                                      borderRadius: 20,
                                      fontWeight: 600,
                                      fontSize: 13,
                                    }}
                                  >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                      <path d="M20 6L9 17L4 12" stroke="#2e7d32" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                    PAID
                                  </span>
                                </div>
                              ) : (
                                <button
                                  onClick={() =>
                                    openPayFromDistribution(
                                      "OrbiterMentor",
                                      Number(pay.distribution?.orbiterMentor || 0),
                                      pay.paymentId
                                    )
                                  }
                                  style={{
                                    background: "#ff7a00",
                                    color: "#fff",
                                    border: "none",
                                    padding: "6px 12px",
                                    borderRadius: 6,
                                    cursor: "pointer",
                                  }}
                                >
                                  Pay Orbiter Mentor ₹{Number(pay.distribution?.orbiterMentor || 0).toFixed(2)}
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Cosmo Mentor slot */}
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              padding: "8px 0",
                              borderBottom: "1px solid #f0f0f0",
                            }}
                          >
                            <div>
                              <strong>Cosmo Mentor:</strong>{" "}
                              ₹{(pay.distribution?.cosmoMentor || 0).toFixed(2)}
                              <div style={{ fontSize: 12, color: "#666" }}>
                                Remaining to Cosmo Mentor overall: ₹{cosmoMentorRemaining.toLocaleString("en-IN")}
                              </div>
                            </div>

                            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                              {isSlotFullyPaid(pay.paymentId, "CosmoMentor", Number(pay.distribution?.cosmoMentor || 0)) ? (
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <span
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: 6,
                                      background: "#e8f8ed",
                                      color: "#2e7d32",
                                      padding: "4px 8px",
                                      borderRadius: 20,
                                      fontWeight: 600,
                                      fontSize: 13,
                                    }}
                                  >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                      <path d="M20 6L9 17L4 12" stroke="#2e7d32" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                    PAID
                                  </span>
                                </div>
                              ) : (
                                <button
                                  onClick={() =>
                                    openPayFromDistribution(
                                      "CosmoMentor",
                                      Number(pay.distribution?.cosmoMentor || 0),
                                      pay.paymentId
                                    )
                                  }
                                  style={{
                                    background: "#ff7a00",
                                    color: "#fff",
                                    border: "none",
                                    padding: "6px 12px",
                                    borderRadius: 6,
                                    cursor: "pointer",
                                  }}
                                >
                                  Pay Cosmo Mentor ₹{Number(pay.distribution?.cosmoMentor || 0).toFixed(2)}
                                </button>
                              )}
                            </div>
                          </div>

                          {/* UJustBe slot (informational only) */}
                          <div style={{ paddingTop: 8 }}>
                            <strong>UJustBe (keeps):</strong> ₹{(pay.distribution?.ujustbe || 0).toFixed(2)}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p>No payments yet.</p>
            )}

            <div style={{ marginTop: 16 }}>
              <button
                className="addPaymentBtn"
                onClick={openPaymentModal}
                disabled={!dealAlreadyCalculated || agreedRemaining <= 0}
              >
                + Add Cosmo Payment
              </button>
            </div>
          </>
        )}

        {/* ===================== ADD PAYMENT FORM (Cosmo partials) ===================== */}
        {showAddPaymentForm && (
          <div className="addPaymentForm">
            {/* PAYMENT FROM */}
            <label>
              Payment From:
              <input
                type="text"
                value={mapToActualName(newPayment.paymentFrom)}
                disabled
              />
            </label>

            {/* PAYMENT TO (always UJustBe in this flow) */}
            <label>
              Payment To:
              <input
                type="text"
                value={mapToActualName(newPayment.paymentTo)}
                disabled
              />
            </label>

            {/* AMOUNT (Editable: admin can enter partial amount up to remaining) */}
            <label>
              Amount (enter partial/full amount Cosmo is paying now):
              <input
                type="number"
                value={newPayment.amountReceived}
                onChange={(e) => {
                  const val = e.target.value;
                  setNewPayment((prev) => ({
                    ...prev,
                    amountReceived: val,
                  }));
                }}
                min="0"
                max={agreedRemaining}
                placeholder={`Max ₹${agreedRemaining}`}
                required
              />
            </label>

            {/* helper info */}
            <div className="infoBox">
              <p>✔ Agreed total: ₹{agreedAmount}</p>
              <p>✔ Paid so far by Cosmo: ₹{cosmoPaid}</p>
              <p>✔ Remaining agreed: ₹{agreedRemaining}</p>
              <p>
                ✔ Distribution will be proportional to agreed shares for the
                entered amount (informational only).
              </p>
            </div>

            {/* ONLY SHOW PAYMENT MODE & txn & invoice for Cosmo payments */}
            <label>
              Mode of Payment:
              <select
                name="modeOfPayment"
                value={newPayment.modeOfPayment}
                onChange={(e) =>
                  setNewPayment({ ...newPayment, modeOfPayment: e.target.value })
                }
                required
              >
                <option value="">-- Select Mode --</option>
                <option value="GPay">GPay</option>
                <option value="Razorpay">Razorpay</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cash">Cash</option>
                <option value="Other">Other</option>
              </select>
            </label>

            {(newPayment.modeOfPayment === "GPay" ||
              newPayment.modeOfPayment === "Razorpay" ||
              newPayment.modeOfPayment === "Bank Transfer" ||
              newPayment.modeOfPayment === "Other") && (
              <label>
                Transaction Reference:
                <input
                  type="text"
                  value={newPayment.transactionRef || ""}
                  onChange={(e) =>
                    setNewPayment({
                      ...newPayment,
                      transactionRef: e.target.value,
                    })
                  }
                  required
                />
              </label>
            )}

            <label>
              Upload Invoice (optional):
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) =>
                  setNewPayment({
                    ...newPayment,
                    paymentInvoice: e.target.files[0],
                  })
                }
              />
            </label>

            {newPayment.modeOfPayment === "Other" && (
              <label>
                Comment:
                <textarea
                  value={newPayment.comment || ""}
                  onChange={(e) =>
                    setNewPayment({
                      ...newPayment,
                      comment: e.target.value,
                    })
                  }
                />
              </label>
            )}

            {/* DATE */}
            <label>
              Payment Date:
              <input
                type="date"
                name="paymentDate"
                value={newPayment.paymentDate}
                onChange={(e) =>
                  setNewPayment({ ...newPayment, paymentDate: e.target.value })
                }
                max={new Date().toISOString().split("T")[0]}
                required
              />
            </label>

            {/* SAVE / CANCEL */}
            <div className="formButtons">
              <button
                onClick={handleAddPayment_NewFlow}
                disabled={isSubmittingPayment}
              >
                {isSubmittingPayment
                  ? "Saving..."
                  : "Save Payment & Add to UJustBe Balance"}
              </button>
              <button className="cancelBtn" onClick={closeForm}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ===================== UJB DISTRIBUTION FORM ===================== */}
     {showUjbDistributionForm && (
  <div className="addPaymentForm">
    <h4>Distribute from UJustBe Balance</h4>
    <p>
      <strong>UJustBe balance (cash pool):</strong>{" "}
      ₹{currentUjbBalance.toLocaleString("en-IN")}
    </p>

    {/* Receiver */}
    <label>
      Select Receiver:
      <select
        value={ujbDistForm.recipient}
        disabled={ujbDistributionFromSlot}
        onChange={(e) => {
          if (ujbDistributionFromSlot) return;

          const value = e.target.value;

          setUjbDistributionFromSlot(false);
          setUjbDistributionOriginalSlotAmount(0);
          setUjbDistributionBelongsToPaymentId(null);

          setAdjustmentBreakdown(null);

          setUjbDistForm((prev) => ({
            ...prev,
            recipient: value,
            amount: "",
          }));
        }}
      >
        <option value="">-- Select --</option>
        <option value="Orbiter">{orbiter?.name || "Orbiter"}</option>
        <option value="OrbiterMentor">{orbiter?.mentorName || "Orbiter Mentor"}</option>
        <option value="CosmoMentor">{cosmoOrbiter?.mentorName || "Cosmo Mentor"}</option>
      </select>
    </label>

    {/* Amount */}
  <label>
  Amount to Pay (₹):
  <input
    type="number"
    value={ujbDistForm.amount}
    readOnly={ujbDistributionFromSlot}
    onChange={async (e) => {
      if (ujbDistributionFromSlot) return;

      const amount = Number(e.target.value || 0);

      setUjbDistForm((prev) => ({
        ...prev,
        amount: e.target.value,
      }));

      const recipient = ujbDistForm.recipient;

      if (!recipient || amount <= 0) {
        setAdjustmentBreakdown(null);
        return;
      }

      let targetUser = null;
      if (recipient === "Orbiter") targetUser = orbiter;
      if (recipient === "OrbiterMentor")
        targetUser = {
          name: orbiter?.mentorName,
          ujbCode: orbiter?.mentorUjbCode,
        };
      if (recipient === "CosmoMentor")
        targetUser = {
          name: cosmoOrbiter?.mentorName,
          ujbCode: cosmoOrbiter?.mentorUjbCode,
        };

      const adj = await processAdjustmentForTarget(
        recipient,
        amount,
        targetUser
      );

      setAdjustmentBreakdown({
        requested: amount,
        adjustedAmount: adj.adjustedAmount || 0,
        actualReceived: adj.actualReceived || 0,
        remainingAfterAdjustment:
          typeof adj.newAmountRemaining === "number"
            ? adj.newAmountRemaining
            : null,
      });
    }}
    min="0"
    max={currentUjbBalance}
    placeholder={`Max ₹${currentUjbBalance}`}
  />
</label>


    {/* 🔍 Adjustment Breakdown UI */}
    {adjustmentBreakdown && (
      <div
        style={{
          marginTop: "10px",
          padding: "12px",
          borderRadius: "8px",
          background: "#f1f5f9",
          border: "1px solid #d6dbe1",
        }}
      >
        <strong
          style={{
            display: "block",
            marginBottom: "6px",
            color: "#334155",
            fontSize: "14px",
          }}
        >
          Payment Breakdown
        </strong>

        <div>
          <span style={{ fontWeight: 600 }}>Requested:</span>{" "}
          ₹{adjustmentBreakdown.requested}
        </div>

        <div>
          <span style={{ fontWeight: 600, color: "#2563eb" }}>Adjusted:</span>{" "}
          ₹{adjustmentBreakdown.adjustedAmount}
          {adjustmentBreakdown.adjustedAmount > 0 && (
            <small style={{ color: "#475569" }}>
              {" "}
              (internal adjustment — no cash movement)
            </small>
          )}
        </div>

        <div>
          <span style={{ fontWeight: 600, color: "#16a34a" }}>
            Cash Payable:
          </span>{" "}
          ₹{adjustmentBreakdown.actualReceived}
        </div>

        {adjustmentBreakdown.remainingAfterAdjustment !== null && (
          <div style={{ marginTop: "4px", color: "#475569" }}>
            <span style={{ fontWeight: 600 }}>
              Remaining Adjustment Balance:
            </span>{" "}
            ₹{adjustmentBreakdown.remainingAfterAdjustment}
          </div>
        )}
      </div>
    )}

    {/* Slot info section */}
    {ujbDistributionFromSlot && (
      <div className="infoBox" style={{ marginTop: 8 }}>
        <p>
          <strong>Opened from Distribution Slot.</strong>
        </p>
        <p>Original slot amount: ₹{ujbDistributionOriginalSlotAmount}</p>
        <p>
          <strong>Belongs to Cosmo Payment ID:</strong>{" "}
          {ujbDistributionBelongsToPaymentId || "—"}
        </p>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <input
            type="checkbox"
            checked={ujbDistAllowAdjust}
            onChange={(e) => {
              setUjbDistAllowAdjust(e.target.checked);

              if (!e.target.checked) {
                setUjbDistForm((prev) => ({
                  ...prev,
                  amount: ujbDistributionOriginalSlotAmount,
                }));
                setAdjustmentBreakdown(null);
              }
            }}
          />
          Allow Adjust Amount
        </label>
      </div>
    )}

    {/* Remaining balances */}
    <div className="infoBox">
      <p>Remaining to Orbiter: ₹{orbiterRemaining.toLocaleString("en-IN")}</p>
      <p>
        Remaining to Orbiter Mentor: ₹
        {orbiterMentorRemaining.toLocaleString("en-IN")}
      </p>
      <p>
        Remaining to Cosmo Mentor: ₹
        {cosmoMentorRemaining.toLocaleString("en-IN")}
      </p>
    </div>

    {/* Mode of Payment */}
    <label>
      Mode of Payment:
      <select
        name="modeOfPayment"
        value={ujbDistForm.modeOfPayment}
        onChange={(e) =>
          setUjbDistForm({
            ...ujbDistForm,
            modeOfPayment: e.target.value,
          })
        }
        required
      >
        <option value="">-- Select Mode --</option>
        <option value="GPay">GPay</option>
        <option value="Razorpay">Razorpay</option>
        <option value="Bank Transfer">Bank Transfer</option>
        <option value="Cash">Cash</option>
        <option value="Other">Other</option>
      </select>
    </label>

    {(ujbDistForm.modeOfPayment === "GPay" ||
      ujbDistForm.modeOfPayment === "Razorpay" ||
      ujbDistForm.modeOfPayment === "Bank Transfer" ||
      ujbDistForm.modeOfPayment === "Other") && (
      <label>
        Transaction Reference:
        <input
          type="text"
          value={ujbDistForm.transactionRef || ""}
          onChange={(e) =>
            setUjbDistForm({
              ...ujbDistForm,
              transactionRef: e.target.value,
            })
          }
          required
        />
      </label>
    )}

    <label>
      Upload Invoice / Proof (optional):
      <input
        type="file"
        accept="image/*,application/pdf"
        onChange={(e) =>
          setUjbDistForm({
            ...ujbDistForm,
            paymentInvoice: e.target.files[0],
          })
        }
      />
    </label>

    <label>
      Payment Date:
      <input
        type="date"
        name="paymentDate"
        value={ujbDistForm.paymentDate}
        onChange={(e) =>
          setUjbDistForm({
            ...ujbDistForm,
            paymentDate: e.target.value,
          })
        }
        max={new Date().toISOString().split("T")[0]}
        required
      />
    </label>

    <div className="formButtons">
      <button
        onClick={
          ujbDistributionFromSlot
            ? handleUJBDistributionFromSlot
            : handleUJBDistribution
        }
        disabled={isSubmittingPayment}
      >
        {isSubmittingPayment ? "Processing..." : "Distribute from UJustBe"}
      </button>
      <button className="cancelBtn" onClick={closeForm}>
        Cancel
      </button>
    </div>
  </div>
)}

      </div>
    </Layouts>
  );
};

export default ReferralDetails;
