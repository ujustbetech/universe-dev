import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import {
  doc,
  getDoc,
  updateDoc,
  Timestamp,
  arrayUnion,
  onSnapshot,
  getDocs,
  collection,
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
  const [cosmoOrbiter, setCosmoOrbiter] = useState(null);
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

  // newPayment used by modal; we will initialize it per flow using initPaymentForModal
  const [newPayment, setNewPayment] = useState({
    paymentFrom: "CosmoOrbiter",
    paymentTo: "Orbiter",
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

  const closeForm = () => {
    setShowAddPaymentForm(false);
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
    setAdjustmentInfo({ adjustedAmount: 0, actualReceived: 0 });
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
    // service and product come from referralData (may be undefined during calculation if data not loaded)
    const percentage = parseFloat((referralData?.service?.percentage || referralData?.product?.percentage) || 0);
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
      if (latest && latest.dealValue === distribution.dealValue && latest.percentage === distribution.percentage) {
        setDealAlreadyCalculated(true);
        setShowModal(false);
        await Swal.fire({
          icon: "info",
          title: "Already saved",
          text: "This distribution was already saved earlier.",
        });
        return;
      }

      // Save as single log (locking to one)
      const updatedLogs = [distribution];
      const docRef = doc(db, COLLECTIONS.referral, id);

      await updateDoc(docRef, {
        dealLogs: updatedLogs,
        lastDealCalculatedAt: Timestamp.now(),
      });

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
                    profilePic: orbData2["ProfilePhotoURL"] || orbData2["BusinessLogo"] || "",
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
                    profilePic: cosData2["ProfilePhotoURL"] || cosData2["BusinessLogo"] || "",
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
  // PAYMENT FLOW HELPERS
  // -----------------------

  /**
   * isFirstPaymentAlreadyDone:
   * - prefer explicit referralData.firstPaymentDone flag
   * - fallback to scanning payments array for Cosmo->UJustBe pair
   */
  const isFirstPaymentAlreadyDone = (paymentsArr, referralDataParam) => {
    if (referralDataParam?.firstPaymentDone) return true;
    const arr = paymentsArr || [];
    return arr.some(
      (p) =>
        (p.paymentFrom === "CosmoOrbiter" || (p.paymentFromName || "").toLowerCase().includes("cosmo")) &&
        (p.paymentTo === "UJustBe" || p.paymentToName === "UJustBe")
    );
  };

  /**
   * getGlobalPendingAdjustment:
   * - try userDetail/{ujbCode}.payment.* to get pending amount
   * - fallback to scanning referrals (expensive) and heuristically sum leftover
   *
   * returns { pendingAmount, source, userDocRef, section }
   */
  const getGlobalPendingAdjustment = async (ujbCode, roleKey) => {
    if (!ujbCode) return { pendingAmount: 0, source: "none" };

    try {
      // 1) try userDetail
      const userDocRef = doc(db, COLLECTIONS.userDetail, ujbCode);
      const userSnap = await getDoc(userDocRef);
      if (userSnap.exists()) {
        const data = userSnap.data();
        const section =
          roleKey === "cosmo"
            ? data?.payment?.cosmo || {}
            : roleKey === "mentor"
            ? data?.payment?.mentor || {}
            : data?.payment?.orbiter || {};

        const pendingAmount = Number(section.amount || 0);
        return { pendingAmount, source: "userDetail", userDocRef, section };
      }

      // 2) fallback: scan referral collection (warning: expensive on large DBs)
      const refSnapshot = await getDocs(collection(db, COLLECTIONS.referral));
      let pendingSum = 0;
      refSnapshot.forEach((rDoc) => {
        const r = rDoc.data();
        const pays = r.payments || [];
        for (const p of pays) {
          try {
            const targetUjb =
              p.paymentTo === "Orbiter" && r.orbiter?.ujbCode
                ? r.orbiter.ujbCode
                : p.paymentTo === "CosmoOrbiter" && r.cosmoOrbiter?.ujbCode
                ? r.cosmoOrbiter.ujbCode
                : p.paymentTo === "OrbiterMentor" && r.orbiter?.mentorUjbCode
                ? r.orbiter.mentorUjbCode
                : p.paymentTo === "CosmoMentor" && r.cosmoOrbiter?.mentorUjbCode
                ? r.cosmoOrbiter?.mentorUjbCode
                : null;

            if (!targetUjb) continue;

            if (targetUjb === ujbCode) {
              // Heuristic for leftover: prefer explicit fields if they exist
              const possibleRemaining =
                Number(p.remainingAmount || p.pendingAmount || p.outstanding || 0) ||
                Math.max(0, Number(p.expectedAmount || p.amountReceived || 0) - Number(p.adjustedAmount || 0));
              pendingSum += possibleRemaining;
            }
          } catch (err) {
            // ignore bad rows
          }
        }
      });

      return { pendingAmount: pendingSum, source: "fallback" };
    } catch (err) {
      console.error("Error computing global pending adjustment:", err);
      return { pendingAmount: 0, source: "error" };
    }
  };

  /**
   * isAddingFirstPayment - true if candidate payment is Cosmo -> UJustBe and first payment not done.
   */
  const isAddingFirstPayment = (paymentObj, paymentsArr, referralDataParam) => {
    return (
      paymentObj.paymentFrom === "CosmoOrbiter" &&
      (paymentObj.paymentTo === "UJustBe" || paymentObj.paymentToName === "UJustBe") &&
      !isFirstPaymentAlreadyDone(paymentsArr, referralDataParam)
    );
  };

  // -----------------------
  // PAYMENT MODAL INITIALIZER
  // -----------------------
  const initPaymentForModal = () => {
    const firstDone = isFirstPaymentAlreadyDone(payments, referralData);

    if (!firstDone) {
      // Force CosmoOrbiter -> UJustBe with AGREED amount (from deal log or computed)
      const deal = (dealLogs && dealLogs.length > 0 && dealLogs[dealLogs.length - 1]) || null;
      const agreedAmountFromLog = deal ? Number(deal.agreedAmount || 0) : 0;

      // If not present in log, compute using formState/referralData
      let agreedAmount = agreedAmountFromLog;
      if (!agreedAmount) {
        const calc = calculateDistribution();
        agreedAmount = Number(calc.agreedAmount || 0);
      }

      setNewPayment({
        paymentFrom: "CosmoOrbiter",
        paymentTo: "UJustBe",
        paymentDate: new Date().toISOString().split("T")[0],
        amountReceived: agreedAmount,
        modeOfPayment: "",
        transactionRef: "",
        comment: "",
        paymentInvoice: null,
        ujbShareType: "AgreedAmountToUJustBe",
        _targetUserDocRef: null,
        _feeType: "upfront",
      });

      setShowAddPaymentForm(true);
      setShowPaymentSheet(true);
      return;
    }

    // After first payment: UJustBe -> others
    setNewPayment({
      paymentFrom: "UJustBe",
      paymentTo: "",
      paymentDate: new Date().toISOString().split("T")[0],
      amountReceived: "",
      modeOfPayment: "",
      transactionRef: "",
      comment: "",
      paymentInvoice: null,
      ujbShareType: "UJustBe",
      _targetUserDocRef: null,
      _feeType: "upfront",
    });

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
          (p.paymentDate === candidate.paymentDate || p.paymentDate === candidate.paymentDate) &&
          (p.paymentFrom === candidate.paymentFrom || mapToActualName(p.paymentFrom) === mapToActualName(candidate.paymentFrom)) &&
          (p.paymentTo === candidate.paymentTo || mapToActualName(p.paymentTo) === mapToActualName(candidate.paymentTo))
        );
      } catch {
        return false;
      }
    });
  };

  // -----------------------
  // HANDLE PAYMENT TO SELECT (NEW FLOW)
  // -----------------------
  const handlePaymentToSelect_NewFlow = async (selectedValue) => {
    const firstDone = isFirstPaymentAlreadyDone(payments, referralData);
    if (!firstDone) {
      Swal.fire({
        icon: "info",
        title: "First Payment Required",
        text: "You must add the first payment (CosmoOrbiter → UJustBe) before distributing shares.",
      });
      return;
    }

    // Ensure newPayment.paymentFrom is UJustBe
    if (newPayment.paymentFrom !== "UJustBe") {
      setNewPayment((prev) => ({ ...prev, paymentFrom: "UJustBe" }));
    }

    const deal = dealLogs && dealLogs.length > 0 ? dealLogs[dealLogs.length - 1] : null;
    let autoAmount = 0;
    if (deal) {
      switch (selectedValue) {
        case "Orbiter":
          autoAmount = Number(deal.orbiterShare || 0);
          break;
        case "OrbiterMentor":
          autoAmount = Number(deal.orbiterMentorShare || 0);
          break;
        case "CosmoMentor":
          autoAmount = Number(deal.cosmoMentorShare || 0);
          break;
        case "UJustBe":
          autoAmount = Number(deal.ujustbeShare || 0);
          break;
        default:
          autoAmount = 0;
      }
    }

    setNewPayment((prev) => ({
      ...prev,
      paymentTo: selectedValue,
      amountReceived: autoAmount,
    }));

    // Compute adjustment info globally
    let targetUjbCode = null;
    let roleKey = "orbiter";
    if (selectedValue === "Orbiter") {
      targetUjbCode = orbiter?.ujbCode;
      roleKey = "orbiter";
    } else if (selectedValue === "OrbiterMentor") {
      targetUjbCode = orbiter?.mentorUjbCode;
      roleKey = "mentor";
    } else if (selectedValue === "CosmoMentor") {
      targetUjbCode = cosmoOrbiter?.mentorUjbCode;
      roleKey = "mentor";
    } else if (selectedValue === "UJustBe") {
      targetUjbCode = null;
      roleKey = "ujb";
    }

    if (targetUjbCode) {
      const { pendingAmount, source, userDocRef, section } = await getGlobalPendingAdjustment(targetUjbCode, roleKey);

      if (source === "userDetail" && section) {
        const feeType = section.feeType || "upfront";
        const requested = Number(autoAmount || 0);

        if (feeType === "adjustment" && pendingAmount > 0) {
          if (requested <= pendingAmount) {
            setAdjustmentInfo({ adjustedAmount: requested, actualReceived: 0 });
          } else {
            setAdjustmentInfo({ adjustedAmount: pendingAmount, actualReceived: requested - pendingAmount });
          }
          setNewPayment((prev) => ({ ...prev, _targetUserDocRef: userDocRef, _feeType: feeType }));
        } else {
          setAdjustmentInfo({ adjustedAmount: 0, actualReceived: Number(autoAmount || 0) });
          setNewPayment((prev) => ({ ...prev, _targetUserDocRef: userDocRef, _feeType: "upfront" }));
        }
      } else {
        setAdjustmentInfo({ adjustedAmount: 0, actualReceived: Number(autoAmount || 0) });
        await Swal.fire({
          icon: "warning",
          title: "Global Adjustment Unknown",
          text:
            "Couldn't find global pending adjustment for the receiver in userDetail. The modal will proceed using local assumptions. " +
            "Please ensure the user's payment setup exists in userDetail to enable correct adjustments.",
        });
      }
    } else {
      setAdjustmentInfo({ adjustedAmount: 0, actualReceived: Number(autoAmount || 0) });
    }
  };

  // -----------------------
  // HANDLE ADD PAYMENT (NEW FLOW)
  // -----------------------
  const handleAddPayment_NewFlow = async () => {
    if (isSubmittingPaymentRef.current) return;
    setIsSubmittingPayment(true);

    try {
      if (!newPayment.paymentFrom || !newPayment.paymentTo || !newPayment.paymentDate || !newPayment.amountReceived) {
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

      const firstDone = isFirstPaymentAlreadyDone(payments, referralData);
      const addingFirst = isAddingFirstPayment(candidatePayment, payments, referralData);

      // For addingFirst, required amount must be AGREED AMOUNT (not full deal)
      if (addingFirst) {
        const deal = (dealLogs && dealLogs.length > 0 && dealLogs[dealLogs.length - 1]) || null;
        // fallback to calculateDistribution if no log present
        const agreedAmount = deal ? Number(deal.agreedAmount || 0) : Number(calculateDistribution().agreedAmount || 0);

        if (Number(candidatePayment.amountReceived) !== agreedAmount) {
          await Swal.fire({
            icon: "error",
            title: "Invalid Amount",
            text: `First payment amount must be the AGREED Amount: ₹${agreedAmount}.`,
          });
          setIsSubmittingPayment(false);
          return;
        }
      } else {
        // After first payment, candidatePayment.amountReceived should match respective share from dealLogs
        const deal = (dealLogs && dealLogs.length > 0 && dealLogs[dealLogs.length - 1]) || null;
        if (deal) {
          const expectedFor =
            candidatePayment.paymentTo === "Orbiter"
              ? Number(deal.orbiterShare || 0)
              : candidatePayment.paymentTo === "OrbiterMentor"
              ? Number(deal.orbiterMentorShare || 0)
              : candidatePayment.paymentTo === "CosmoMentor"
              ? Number(deal.cosmoMentorShare || 0)
              : candidatePayment.paymentTo === "UJustBe"
              ? Number(deal.ujustbeShare || 0)
              : null;

          if (expectedFor !== null && Number(candidatePayment.amountReceived) !== expectedFor) {
            // If mismatch, warn but allow if user intentionally overridden? We will enforce equality to avoid mistakes.
            await Swal.fire({
              icon: "error",
              title: "Invalid Amount",
              text: `Payment amount must match the calculated share for selected receiver: ₹${expectedFor}.`,
            });
            setIsSubmittingPayment(false);
            return;
          }
        }
      }

      if (isDuplicatePayment(payments, candidatePayment)) {
        await Swal.fire({
          icon: "info",
          title: "Duplicate Payment",
          text: "A similar payment is already present in history.",
        });
        setIsSubmittingPayment(false);
        return;
      }

      // Compute adjustedAmount / actualReceived again to be safe
      let adjustedAmount = 0;
      let actualReceived = 0;
      let feeType = candidatePayment._feeType || "upfront";
      let targetUserDocRef = candidatePayment._targetUserDocRef || null;

      if (addingFirst) {
        adjustedAmount = 0;
        actualReceived = Number(candidatePayment.amountReceived);
        feeType = "upfront";
      } else {
        if (targetUserDocRef && feeType === "adjustment") {
          const role =
            candidatePayment.paymentTo === "Orbiter"
              ? "orbiter"
              : candidatePayment.paymentTo === "CosmoMentor"
              ? "mentor"
              : candidatePayment.paymentTo === "OrbiterMentor"
              ? "mentor"
              : "orbiter";

          const targetUjb =
            candidatePayment.paymentTo === "Orbiter"
              ? orbiter?.ujbCode
              : candidatePayment.paymentTo === "OrbiterMentor"
              ? orbiter?.mentorUjbCode
              : candidatePayment.paymentTo === "CosmoMentor"
              ? cosmoOrbiter?.mentorUjbCode
              : null;

          const { pendingAmount } = await getGlobalPendingAdjustment(targetUjb, role);

          const requested = Number(candidatePayment.amountReceived || 0);
          if (pendingAmount >= requested) {
            adjustedAmount = requested;
            actualReceived = 0;
          } else if (pendingAmount > 0 && pendingAmount < requested) {
            adjustedAmount = pendingAmount;
            actualReceived = requested - pendingAmount;
          } else {
            adjustedAmount = 0;
            actualReceived = requested;
          }
        } else {
          adjustedAmount = 0;
          actualReceived = Number(candidatePayment.amountReceived || 0);
        }
      }

      // VALIDATIONS when actualReceived > 0
      if (actualReceived > 0) {
        if (!candidatePayment.modeOfPayment) {
          await Swal.fire({
            icon: "warning",
            title: "Mode of Payment Required",
            text: "Please select a payment mode for the received portion.",
          });
          setIsSubmittingPayment(false);
          return;
        }
        // For non-cash payments, transactionRef is required
        if (candidatePayment.modeOfPayment !== "Cash" && !candidatePayment.transactionRef) {
          await Swal.fire({
            icon: "warning",
            title: "Transaction Reference Required",
            text: "Please provide transaction reference for the received portion.",
          });
          setIsSubmittingPayment(false);
          return;
        }
        // Invoice required for actual received amount
        if (!candidatePayment.paymentInvoice) {
          await Swal.fire({
            icon: "warning",
            title: "Invoice Required",
            text: "Please upload invoice screenshot or PDF for the received payment.",
          });
          setIsSubmittingPayment(false);
          return;
        }
      }

      // Upload invoice if actualReceived > 0
      let paymentInvoiceURL = "";
      if (candidatePayment.paymentInvoice && actualReceived > 0) {
        const fileRef = ref(storage, `paymentInvoices/${id}/${Date.now()}_${candidatePayment.paymentInvoice.name}`);
        await uploadBytes(fileRef, candidatePayment.paymentInvoice);
        paymentInvoiceURL = await getDownloadURL(fileRef);
      }

      const toSave = {
        paymentFrom: candidatePayment.paymentFrom,
        paymentFromName: mapToActualName(candidatePayment.paymentFrom),
        paymentTo: candidatePayment.paymentTo,
        paymentToName: mapToActualName(candidatePayment.paymentTo),
        paymentDate: candidatePayment.paymentDate,
        modeOfPayment: candidatePayment.modeOfPayment || "",
        transactionRef: candidatePayment.transactionRef || "",
        comment: candidatePayment.comment || "",
        amountReceived: Number(candidatePayment.amountReceived || 0),
        adjustedAmount,
        actualReceived,
        paymentInvoiceURL,
        feeType,
        createdAt: Timestamp.now(),
        meta: {
          isFirstPayment: addingFirst,
        },
      };

      const referralDocRef = doc(db, COLLECTIONS.referral, id);
      const updatedPayments = [...payments, toSave];
      const updatePayload = { payments: updatedPayments };
      if (addingFirst) {
        updatePayload.firstPaymentDone = true;
      }

      await updateDoc(referralDocRef, updatePayload);
      setPayments(updatedPayments);

      // Update target userDetail if adjusted
      if (!addingFirst && adjustedAmount > 0 && targetUserDocRef) {
        const uSnap = await getDoc(targetUserDocRef);
        if (uSnap.exists()) {
          const data = uSnap.data();
          const updates = {};
          // Try to update appropriate payment path if exists
          if (data.payment?.orbiter) {
            const curr = Number(data.payment.orbiter.amount || 0);
            const newAmt = Math.max(0, curr - adjustedAmount);
            const newStatus = newAmt === 0 ? "paid" : "adjusted";
            updates["payment.orbiter.amount"] = newAmt;
            updates["payment.orbiter.status"] = newStatus;
            updates["payment.orbiter.lastUpdated"] = new Date().toISOString();
            updates["payment.orbiter.adjustmentLogs"] = arrayUnion({
              date: new Date().toISOString(),
              adjusted: adjustedAmount,
              referralId: id,
              note: "Adjusted via UJustBe distribution",
            });
          }
          if (data.payment?.cosmo) {
            const curr = Number(data.payment.cosmo.amount || 0);
            const newAmt = Math.max(0, curr - adjustedAmount);
            const newStatus = newAmt === 0 ? "paid" : "adjusted";
            updates["payment.cosmo.amount"] = newAmt;
            updates["payment.cosmo.status"] = newStatus;
            updates["payment.cosmo.lastUpdated"] = new Date().toISOString();
            updates["payment.cosmo.adjustmentLogs"] = arrayUnion({
              date: new Date().toISOString(),
              adjusted: adjustedAmount,
              referralId: id,
              note: "Adjusted via UJustBe distribution",
            });
          }
          if (data.payment?.mentor) {
            const curr = Number(data.payment.mentor.amount || 0);
            const newAmt = Math.max(0, curr - adjustedAmount);
            const newStatus = newAmt === 0 ? "paid" : "adjusted";
            updates["payment.mentor.amount"] = newAmt;
            updates["payment.mentor.status"] = newStatus;
            updates["payment.mentor.lastUpdated"] = new Date().toISOString();
            updates["payment.mentor.adjustmentLogs"] = arrayUnion({
              date: new Date().toISOString(),
              adjusted: adjustedAmount,
              referralId: id,
              note: "Adjusted via UJustBe distribution",
            });
          }

          if (Object.keys(updates).length > 0) {
            await updateDoc(targetUserDocRef, updates);
          }
        }
      }

      await Swal.fire({
        icon: "success",
        title: "Payment Saved",
        text: "Payment added successfully.",
      });

      setShowAddPaymentForm(false);
      setNewPayment({
        paymentFrom: "UJustBe",
        paymentTo: "",
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
      console.error("Error in handleAddPayment_NewFlow:", err);
      await Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to add payment. Please try again.",
      });
      setIsSubmittingPayment(false);
    }
  };

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

  // -----------------------
  // PAYMENT SHEET UI TRIGGERS
  // -----------------------
  // Use initPaymentForModal() to open payment modal with correct defaults
  const openPaymentModal = () => {
    initPaymentForModal();
  };

  // -----------------------
  // HANDLE STATUS UPDATE (unchanged from previous)
  // -----------------------
  const handleUpdate = async (e) => {
    e.preventDefault();

    if (isUpdatingStatusRef.current) return;
    setIsUpdatingStatus(true);

    try {
      const referralRef = doc(db, COLLECTIONS.referral, id);
      const snap = await getDoc(referralRef);
      const dbStatus = snap.exists() ? snap.data().dealStatus : null;
      if (dbStatus === formState.dealStatus) {
        await Swal.fire({
          icon: "info",
          title: "No change",
          text: "Deal status is already set to the selected value.",
        });
        setIsUpdatingStatus(false);
        return;
      }

      const newLog = {
        status: formState.dealStatus,
        updatedAt: Timestamp.now(),
      };

      await updateDoc(referralRef, {
        dealStatus: formState.dealStatus,
        statusLogs: arrayUnion(newLog),
        lastUpdated: Timestamp.now(),
      });

      await Swal.fire({
        icon: "success",
        title: "Status Updated",
        text: "Referral status updated successfully.",
      });

      const paymentEligibleStatuses = [
        "Deal Won",
        "Work in Progress",
        "Work Completed",
        "Received Part Payment and Transferred to UJustBe",
        "Received Full and Final Payment",
        "Agreed % Transferred to UJustBe",
      ];
      if (paymentEligibleStatuses.includes(formState.dealStatus)) {
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
  // RENDER
  // -----------------------
  if (loading || !referralData) return <p>Loading...</p>;

  const { orbiter: referralOrbiter, cosmoOrbiter: referralCosmoOrbiter, service, product, referralId } =
    referralData;

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
                  <option value="Called but Not Answered">Called but Not Answered</option>
                  <option value="Discussion in Progress">Discussion in Progress</option>
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
                            ? new Date(log.updatedAt.seconds * 1000).toLocaleString()
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
                      <strong>Mentor Phone:</strong> {orbiter?.mentorPhone || "No Mentor Phone"}
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

                {formState.dealValue && (() => {
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
                  <button className="cancelBtn" onClick={() => setShowModal(false)}>
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
                        <strong>Percentage:</strong> {log.percentage}%
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
                        <strong>Mentor:</strong> ₹
                        {log.orbiterMentorShare.toFixed(2)}
                      </p>
                      <p>
                        <strong>Cosmo Mentor:</strong> ₹
                        {log.cosmoMentorShare.toFixed(2)}
                      </p>
                      <p>
                        <strong>UJustBe:</strong> ₹
                        {log.ujustbeShare.toFixed(2)}
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

        {/* ========================== FOLLOW UPS ============================= */}
        <div className="followupContainer">
          <h2>Follow Ups</h2>

          <button
            className="addFollowupBtn"
            onClick={() => setShowFollowupForm(!showFollowupForm)}
          >
            {showFollowupForm ? "Cancel" : "+ Add Follow Up"}
          </button>

          {showFollowupForm && (
            <div className="form-section">
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
                  name="date"
                  value={newFollowup.date}
                  onChange={(e) =>
                    setNewFollowup({ ...newFollowup, date: e.target.value })
                  }
                />
              </label>

              <label>
                Description:
                <textarea
                  name="description"
                  value={newFollowup.description}
                  onChange={(e) =>
                    setNewFollowup({ ...newFollowup, description: e.target.value })
                  }
                />
              </label>

              <label>
                Status:
                <select
                  name="status"
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

          {followups.length > 0 ? (
            followups.map((f, i) => (
              <div className="followupCard" key={i}>
                <h3>{f.priority} Priority</h3>
                <p>
                  <strong>Next Date:</strong> {f.date}
                </p>
                <p>
                  <strong>Description:</strong> {f.description}
                </p>
                <p>
                  <strong>Status:</strong> {f.status}
                </p>
              </div>
            ))
          ) : (
            <p>No follow-ups yet.</p>
          )}
        </div>

        {/* ========================== PAYMENT SUMMARY CARD ============================= */}
        {dealEverWon && (
          <div className="PaymentContainer">
            <h4>Last Payment</h4>

            {payments?.length > 0 ? (
              <p>
                {mapToActualName(payments.at(-1).paymentFrom)} →{" "}
                {mapToActualName(payments.at(-1).paymentTo)} : ₹
                {payments.at(-1).amountReceived.toLocaleString("en-IN")}
              </p>
            ) : (
              <p>No payments recorded yet</p>
            )}

            <button className="viewMoreBtn" onClick={() => setShowPaymentSheet(true)}>
              View Payment History
            </button>

            <button className="addPaymentBtn" onClick={openPaymentModal}>
              + Add Payment
            </button>
          </div>
        )}
      </section>

      {/* ========================== PAYMENT SLIDING SHEET ============================= */}
      <div className={`PaymentSheet ${showPaymentSheet ? "open" : ""}`}>
        <div className="sheetHeader">
          <h3>{showAddPaymentForm ? "Add Payment" : "Payment History"}</h3>
          <button onClick={() => setShowPaymentSheet(false)}>✕</button>
        </div>

        {/* ===================== PAYMENT HISTORY VIEW ===================== */}
        {!showAddPaymentForm && (
          <>
            {payments.length > 0 ? (
              payments.map((pay, idx) => (
                <div className="paymentCard" key={idx}>
                  <div className="paymentCardHeader">
                    <h4>₹{pay.amountReceived}</h4>
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
                    <p>
                      <strong>Adjusted Amount:</strong> ₹
                      {pay.adjustedAmount || 0}
                    </p>
                    <p>
                      <strong>Actual Received:</strong> ₹
                      {pay.actualReceived || 0}
                    </p>
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
                </div>
              ))
            ) : (
              <p>No payments yet.</p>
            )}

            <button
              className="addPaymentBtn"
              onClick={openPaymentModal}
              disabled={!dealEverWon}
            >
              + Add Payment
            </button>
          </>
        )}

        {/* ===================== ADD PAYMENT FORM (NEW FLOW) ===================== */}
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

            {/* PAYMENT TO */}
            <label>
              Payment To:
              <select
                name="paymentTo"
                value={newPayment.paymentTo}
                onChange={(e) => handlePaymentToSelect_NewFlow(e.target.value)}
                disabled={!isFirstPaymentAlreadyDone(payments, referralData)}
              >
                {!isFirstPaymentAlreadyDone(payments, referralData) ? (
                  <option value="UJustBe">UJustBe</option>
                ) : (
                  <>
                    <option value="">-- Select --</option>
                    <option value="Orbiter">{orbiter?.name || "Orbiter"}</option>
                    <option value="OrbiterMentor">{orbiter?.mentorName || "Orbiter Mentor"}</option>
                    <option value="CosmoMentor">{cosmoOrbiter?.mentorName || "Cosmo Mentor"}</option>
                  </>
                )}
              </select>
            </label>

            {/* AMOUNT (Auto-filled and locked) */}
            <label>
              Amount:
              <input type="number" value={newPayment.amountReceived} disabled />
            </label>

            {/* ADJUSTMENT INFO DISPLAY */}
            {adjustmentInfo.adjustedAmount > 0 && adjustmentInfo.actualReceived === 0 && (
              <div className="infoBox">
                <p>✔ Entire amount will be adjusted internally.</p>
              </div>
            )}

            {adjustmentInfo.adjustedAmount > 0 && adjustmentInfo.actualReceived > 0 && (
              <div className="infoBox">
                <p>✔ Partially adjusted: ₹{adjustmentInfo.adjustedAmount}</p>
                <p>✔ Actual to receive: ₹{adjustmentInfo.actualReceived}</p>
              </div>
            )}

            {/* ONLY SHOW PAYMENT MODE IF ACTUAL PAYMENT OCCURS */}
            {adjustmentInfo.actualReceived > 0 && (
              <>
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

                {/* Transaction Ref */}
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
                        setNewPayment({ ...newPayment, transactionRef: e.target.value })
                      }
                      required
                    />
                  </label>
                )}

                {/* INVOICE UPLOAD */}
                <label>
                  Upload Invoice:
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

                {/* COMMENT IF MODE = OTHER */}
                {newPayment.modeOfPayment === "Other" && (
                  <label>
                    Comment:
                    <textarea
                      value={newPayment.comment || ""}
                      onChange={(e) =>
                        setNewPayment({ ...newPayment, comment: e.target.value })
                      }
                      required
                    />
                  </label>
                )}
              </>
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
              <button onClick={handleAddPayment_NewFlow} disabled={isSubmittingPayment}>
                {isSubmittingPayment ? "Saving..." : "Save Payment"}
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
