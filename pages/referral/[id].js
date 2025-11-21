// pages/referral/[id].js
"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import {
  doc,
  getDoc,
  updateDoc,
  Timestamp,
  arrayUnion,
  onSnapshot,
  runTransaction,
  getDocs
} from "firebase/firestore";
import { db } from "../../firebaseConfig";
import Layouts from "../../component/Layouts";
import "../../src/app/styles/main.scss";
import { COLLECTIONS } from "/utility_collection";
import "../../src/app/styles/user.scss";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../../firebaseConfig";
import Swal from "sweetalert2";

const TABS = ["Referral Info", "Orbiter", "CosmoOrbiter", "Service/Product", "Follow Up", "Payment History"];

const ReferralDetails = () => {
  const router = useRouter();
  const { id } = router.query;

  // --- Original states preserved ---
  const [activeProfileTab, setActiveProfileTab] = useState("Orbiter");
  const [dealLogs, setDealLogs] = useState([]);
  const [dealEverWon, setDealEverWon] = useState(false);
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
  });

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
    });
  };

  const [formState, setFormState] = useState({
    referralType: "",
    referralSource: "",
    dealStatus: "",
    dealValue: "",
  });
  const [followups, setFollowups] = useState([]);
  const [editIndex, setEditIndex] = useState(null);
  const [referralData, setReferralData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Referral Info");
  const [showModal, setShowModal] = useState(false);

  // --- New states for realtime & idempotency ---
  const [dealStatus, setDealStatus] = useState("");
  const [dealValue, setDealValue] = useState(0);
  const [paymentDone, setPaymentDone] = useState(false);
  const [dealCalculated, setDealCalculated] = useState(false);
  const [statusHistory, setStatusHistory] = useState([]);

  // local guards for double-clicks
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [calculatingDeal, setCalculatingDeal] = useState(false);

  // keep original listener derived boolean
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
      setDealEverWon(true);
    }
  }, [formState.dealStatus]);

  // Calculate distribution - keep original behavior
  const calculateDistribution = () => {
    const dealValueNum = parseFloat(formState.dealValue);
    const percentage = parseFloat(service?.percentage || product?.percentage);
    const agreedAmount = (dealValueNum * percentage) / 100;

    return {
      dealValue: dealValueNum,
      percentage,
      agreedAmount,
      orbiterShare: (agreedAmount * 50) / 100,
      orbiterMentorShare: (agreedAmount * 15) / 100,
      cosmoMentorShare: (agreedAmount * 15) / 100,
      ujustbeShare: (agreedAmount * 20) / 100,
      timestamp: new Date().toISOString(),
    };
  };

  const handleSaveDealLog = async () => {
    const distribution = calculateDistribution();
    try {
      const updatedLogs = [...dealLogs, distribution];
      const docRef = doc(db, COLLECTIONS.referral, id);
      await updateDoc(docRef, { dealLogs: updatedLogs });
      setDealLogs(updatedLogs);
      setShowModal(false);
    } catch (error) {
      console.error("Error saving deal log:", error);
      alert("Failed to save deal distribution.");
    }
  };

  // --- Fetch referral + populate data (preserved) ---
  useEffect(() => {
    if (!id) return;

    const fetchReferral = async () => {
      try {
        const docRef = doc(db, COLLECTIONS.referral, id);
        const docSnap = await getDoc(docRef);

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

          // ORBITER fetch by phone or ujbCode (kept)
          if (data.orbiter?.phone) {
            const orbiterSnap = await getDoc(doc(db, COLLECTIONS.userDetail, data.orbiter.phone));
            if (orbiterSnap.exists()) {
              const orbiterData = orbiterSnap.data();
              setOrbiter({
                ...data.orbiter,
                ...orbiterData,
                profilePic: orbiterData["Profile Photo URL"] || orbiterData["Business Logo"] || "",
              });
            }
          }

          if (data.orbiter?.ujbCode) {
            const orbiterRef = doc(db, COLLECTIONS.userDetail, data.orbiter.ujbCode);
            const orbiterSnap = await getDoc(orbiterRef);

            if (orbiterSnap.exists()) {
              const orbiterData = orbiterSnap.data();
              setOrbiter({
                ...data.orbiter,
                ...orbiterData,
                profilePic:
                  orbiterData["ProfilePhotoURL"] ||
                  orbiterData["BusinessLogo"] ||
                  "",
              });
            }
          }

          // COSMO fetch (kept)
          if (data.cosmoOrbiter?.ujbCode) {
            const cosmoRef = doc(db, COLLECTIONS.userDetail, data.cosmoOrbiter.ujbCode);
            const cosmoSnap = await getDoc(cosmoRef);

            if (cosmoSnap.exists()) {
              const cosmoData = cosmoSnap.data();
              setCosmoOrbiter({
                ...data.cosmoOrbiter,
                ...cosmoData,
                profilePic:
                  cosmoData["ProfilePhotoURL"] ||
                  cosmoData["BusinessLogo"] ||
                  "",
              });
            }
          }

          if (data.cosmoOrbiter?.phone) {
            const cosmoSnap = await getDoc(doc(db, COLLECTIONS.userDetail, data.cosmoOrbiter.phone));
            if (cosmoSnap.exists()) {
              const cosmoData = cosmoSnap.data();
              setCosmoOrbiter({
                ...data.cosmoOrbiter,
                ...cosmoData,
                profilePic: cosmoData["Profile Photo URL"] || cosmoData["Business Logo"] || "",
              });
            }
          }
        } else {
          alert("Referral not found.");
        }
      } catch (error) {
        console.error("Error fetching referral:", error);
        alert("Error loading referral.");
      } finally {
        setLoading(false);
      }
    };

    fetchReferral();
  }, [id]);

  // --- REALTIME snapshot listener (deal status, payments, history) ---
  useEffect(() => {
    if (!id) return;

    const refDoc = doc(db, "Referraldev", id);

    const unsubscribe = onSnapshot(refDoc, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();

      // realtime updates
      setDealStatus(data.dealStatus || "");
      setDealValue(data.dealValue ?? 0);
      setPaymentDone(Boolean(data.paymentSubmitted));
      setDealCalculated(Boolean(data.dealCalculated));
      setStatusHistory(data.statusHistory || []);
      // Also update payments & dealLogs if they exist (to keep UI consistent)
      setPayments(data.payments || []);
      setDealLogs(data.dealLogs || []);
    }, (err) => {
      console.error("Realtime listener error:", err);
    });

    return () => unsubscribe();
  }, [id]);

  // --- helpers ---
  const handlePaymentChange = (e) => {
    setNewPayment({ ...newPayment, [e.target.name]: e.target.value });
  };

  const handlePaymentToSelect = (selectedValue) => {
    // same checks as original
    if (!formState.dealStatus || formState.dealStatus.toLowerCase() !== "deal won") {
      Swal.fire({
        icon: "warning",
        title: "Deal Not Closed",
        text: "Please mark the Deal Status as 'Deal Won' and calculate deal distribution before adding payment.",
        backdrop: true,
      });
      return;
    }

    if (!dealLogs || dealLogs.length === 0) {
      Swal.fire({
        icon: "info",
        title: "Deal Calculation Required",
        text: "Deal calculation is not done yet. Please click 'Calculate Deal' to generate shares.",
        backdrop: true,
      });
      return;
    }

    const deal = dealLogs[dealLogs.length - 1]; // latest log
    let autoAmount = 0;

    switch (selectedValue) {
      case "Orbiter":
        autoAmount = deal.orbiterShare;
        break;
      case "OrbiterMentor":
        autoAmount = deal.orbiterMentorShare;
        break;
      case "CosmoMentor":
        autoAmount = deal.cosmoMentorShare;
        break;
      case "UJustBe":
        autoAmount = deal.ujustbeShare;
        break;
      default:
        autoAmount = 0;
    }

    setNewPayment({
      ...newPayment,
      paymentTo: selectedValue,
      paymentFrom: "CosmoOrbiter",
      amountReceived: autoAmount || "",
    });
  };

  // Edit / Delete payment preserved (but we keep UI-level actions)
  const handleEditPayment = async (index, updatedPayment) => {
    try {
      const referralDocRef = doc(db, COLLECTIONS.referral, id);
      const updatedPayments = [...payments];
      updatedPayments[index] = {
        ...updatedPayments[index],
        ...updatedPayment,
        updatedAt: Timestamp.now(),
      };

      await updateDoc(referralDocRef, { payments: updatedPayments });
      setPayments(updatedPayments);

      Swal.fire({
        icon: "success",
        title: "Payment Updated",
        text: "Payment details have been successfully updated.",
      });
    } catch (err) {
      console.error("Error updating payment:", err);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to update payment. Please try again later.",
      });
    }
  };

  const handleDeletePayment = async (index) => {
    try {
      const confirm = await Swal.fire({
        icon: "warning",
        title: "Delete this payment?",
        text: "This action cannot be undone.",
        showCancelButton: true,
        confirmButtonText: "Delete",
        cancelButtonText: "Cancel",
      });

      if (!confirm.isConfirmed) return;

      const referralDocRef = doc(db, COLLECTIONS.referral, id);
      const updatedPayments = payments.filter((_, i) => i !== index);

      await updateDoc(referralDocRef, { payments: updatedPayments });
      setPayments(updatedPayments);

      Swal.fire({
        icon: "success",
        title: "Deleted",
        text: "Payment entry has been deleted.",
      });
    } catch (err) {
      console.error("Error deleting payment:", err);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to delete payment. Please try again later.",
      });
    }
  };

  const handleEditClick = (index, payment) => {
    setEditIndex(index);
    setNewPayment({
      ...payment,
      paymentInvoice: null, // optional - reset invoice file upload
    });
    setShowAddPaymentForm(true);
  };

  // --- TRANSACTIONAL / IDEMPOTENT ADD PAYMENT ---
  // We'll compute a simple hash for a payment
  const computePaymentHash = (p) => {
    // Use properties likely to uniquely identify a payment submission attempt.
    return `${p.paymentFrom}|${p.paymentTo}|${p.paymentDate}|${p.amountReceived}|${p.transactionRef || ""}`;
  };

  const handleAddPayment = async () => {
    try {
      // Basic UI-level validation
      if (
        !newPayment.paymentFrom ||
        !newPayment.paymentTo ||
        !newPayment.paymentDate ||
        !newPayment.amountReceived
      ) {
        await Swal.fire({
          icon: "warning",
          title: "Missing Fields",
          text: "Please fill in all required fields before submitting.",
          backdrop: true,
        });
        return;
      }

      // Prevent future date
      const today = new Date().toISOString().split("T")[0];
      if (newPayment.paymentDate > today) {
        await Swal.fire({
          icon: "error",
          title: "Invalid Date",
          text: "Payment date cannot be in the future.",
          backdrop: true,
        });
        return;
      }

      const received = Number(newPayment.amountReceived);
      if (isNaN(received) || received <= 0) {
        await Swal.fire({
          icon: "error",
          title: "Invalid Amount",
          text: "Please enter a valid positive amount.",
          backdrop: true,
        });
        return;
      }

      // COMPUTE HASH
      const paymentHash = computePaymentHash(newPayment);

      // Local guard: prevent double local clicks
      if (submittingPayment) return;
      setSubmittingPayment(true);

      // Transaction: ensure we don't add duplicate payment (same hash) and update payments atomically
      const refDoc = doc(db, "Referraldev", id);

      await runTransaction(db, async (tx) => {
        const snap = await tx.get(refDoc);
        if (!snap.exists()) throw new Error("Referral not found");

        const data = snap.data();

        const existingPayments = Array.isArray(data.payments) ? data.payments : [];

        // If exact payment hash already exists — treat as duplicate click and abort
        const found = existingPayments.some((p) => p.paymentHash === paymentHash);
        if (found) {
          // already recorded (duplicate click) — abort
          return;
        }

        // Now determine adjustment logic from target user payment data in their profile
        // This section mirrors original logic — but note: we cannot call getDoc inside nested transactional logic easily for different docs.
        // We'll keep user-profile update outside the transaction in this implementation for simplicity,
        // but ensure payments array update + paymentSubmitted flag are transactional and idempotent.

        // Upload invoice only if needed BEFORE transaction (since storage upload is not transactional)
      });

      // ---- Upload invoice if needed (outside transaction) ----
      let paymentInvoiceURL = "";
      if (newPayment.paymentInvoice) {
        const fileRef = ref(storage, `paymentInvoices/${id}/${Date.now()}_${newPayment.paymentInvoice.name}`);
        await uploadBytes(fileRef, newPayment.paymentInvoice);
        paymentInvoiceURL = await getDownloadURL(fileRef);
      }

      // Prepare payment object to add (include paymentHash)
      const paymentData = {
        ...newPayment,
        paymentFromName: mapToActualName(newPayment.paymentFrom),
        paymentToName: mapToActualName(newPayment.paymentTo),
        paymentInvoiceURL,
        createdAt: Timestamp.now(),
        adjustedAmount: adjustmentInfo.adjustedAmount || 0,
        actualReceived: adjustmentInfo.actualReceived || newPayment.amountReceived,
        feeType: "", // will keep empty; advanced logic can update this based on user profile
        paymentHash,
      };

      // Final transaction to push payment if not present (we ran one earlier to check — but to be safe do it atomically here)
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(refDoc);
        if (!snap.exists()) throw new Error("Referral not found");
        const data = snap.data();
        const existingPayments = Array.isArray(data.payments) ? data.payments : [];

        // check again (race-safe)
        const found = existingPayments.some((p) => p.paymentHash === paymentHash);
        if (found) {
          return;
        }

        const newHistory = Array.isArray(data.statusHistory)
          ? [...data.statusHistory, { status: "Payment Done", updatedAt: Timestamp.now() }]
          : [{ status: "Payment Done", updatedAt: Timestamp.now() }];

        // push payment and mark paymentSubmitted true
        const updatedPayments = [...existingPayments, paymentData];

        tx.update(refDoc, {
          payments: updatedPayments,
          paymentSubmitted: true,
          paymentSubmittedAt: Timestamp.now(),
          dealStatus: "Payment Done",
          statusHistory: newHistory,
        });
      });

      // Update local state (optimistic)
      setPayments((prev) => [...prev, paymentData]);
      setShowAddPaymentForm(false);
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
      });

      await Swal.fire({
        icon: "success",
        title: "Payment Added!",
        text: "Payment has been added and adjustments updated successfully.",
        confirmButtonColor: "#3085d6",
        backdrop: true,
      });
    } catch (err) {
      console.error("🔥 Error adding payment:", err);
      await Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to add payment. Please try again later.",
        backdrop: true,
      });
    } finally {
      setSubmittingPayment(false);
    }
  };

  // --- Update deal status transactionally and append statusHistory (no duplicates) ---
  const updateDealStatus = async (newStatus) => {
    if (!id || updatingStatus) return;
    setUpdatingStatus(true);

    const refDoc = doc(db, "Referraldev", id);

    try {
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(refDoc);
        if (!snap.exists()) throw new Error("Referral not found");
        const data = snap.data();

        const current = data.dealStatus;
        if (current === newStatus) {
          // Already set — nothing to do
          return;
        }

        const updatedHistory = Array.isArray(data.statusHistory)
          ? [...data.statusHistory, { status: newStatus, updatedAt: Timestamp.now() }]
          : [{ status: newStatus, updatedAt: Timestamp.now() }];

        tx.update(refDoc, {
          dealStatus: newStatus,
          statusHistory: updatedHistory,
          lastUpdated: Timestamp.now(),
        });
      });

      // Optionally show success toast
      Swal.fire({
        icon: "success",
        title: "Status Updated",
        text: `Deal status set to "${newStatus}".`,
        timer: 1200,
        showConfirmButton: false,
      });
    } catch (err) {
      console.error("Status update failed:", err);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to update status. Try again.",
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  // --- Calculate deal value and persist (disable button for everyone) ---
  const calculateDealValue = async () => {
    if (!id || calculatingDeal || dealCalculated) return;
    setCalculatingDeal(true);

    try {
      // Use your existing calculation logic
      const calculated = (function () {
        const d = calculateDistribution();
        return d.dealValue || Number(formState.dealValue) || 0;
      })();

      await updateDoc(doc(db, "Referraldev", id), {
        dealValue: calculated,
        dealCalculated: true,
        dealCalculatedAt: Timestamp.now(),
      });

      setDealCalculated(true);
      Swal.fire({
        icon: "success",
        title: "Deal Calculated",
        text: `Deal value saved: ₹${calculated}`,
        timer: 1200,
        showConfirmButton: false,
      });
    } catch (err) {
      console.error("Calculate failed:", err);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to calculate deal value.",
      });
    } finally {
      setCalculatingDeal(false);
    }
  };

  // --- mapToActualName unchanged ---
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

  // --- followups unchanged ---
  const handleChange = (e) => {
    setFormState({ ...formState, [e.target.name]: e.target.value });
  };
  const handleFollowupChange = (e) => {
    setNewFollowup({ ...newFollowup, [e.target.name]: e.target.value });
  };
  const handleAddFollowup = async () => {
    try {
      const updatedFollowups = [...followups, newFollowup];

      const docRef = doc(db, COLLECTIONS.referral, id);
      await updateDoc(docRef, {
        followups: updatedFollowups,
      });

      setFollowups(updatedFollowups);
      setNewFollowup({
        priority: "Medium",
        date: "",
        description: "",
        status: "Pending",
      });
      alert("Follow-up added successfully.");
    } catch (err) {
      console.error("Error adding follow-up:", err);
      alert("Failed to add follow-up.");
    }
  };

  const mapPaymentLabel = (key) => {
    switch (key) {
      case "Orbiter":
        return orbiter?.name || "Orbiter";
      case "OrbiterMentor":
        return orbiter?.mentorName || "Orbiter Mentor";
      case "CosmoMentor":
        return cosmoOrbiter?.mentorName || "Cosmo Mentor";
      case "CosmoOrbiter":
        return cosmoOrbiter?.name || "CosmoOrbiter";
      case "UJustBe":
        return "UJustBe";
      default:
        return key;
    }
  };

  // --- Update referral status logs (this kept but replaced with transactional update above as main) ---
  const handleUpdate = async (e) => {
    e.preventDefault();

    try {
      const docRef = doc(db, COLLECTIONS.referral, id);

      const newLog = {
        status: formState.dealStatus,
        updatedAt: Timestamp.now(),
      };

      await updateDoc(docRef, {
        dealStatus: formState.dealStatus,
        statusLogs: arrayUnion(newLog), // push instead of replace
        lastUpdated: Timestamp.now(),
      });

      alert("Referral status updated successfully.");
    } catch (error) {
      console.error("Error updating referral:", error);
      alert("Failed to update referral.");
    }
  };

  if (loading || !referralData) return <p>Loading...</p>;

  const { orbiter: referralOrbiter, cosmoOrbiter: referralCosmoOrbiter, service, product, referralId } = referralData;

  return (
    <Layouts>
      <div className="profileHeaderOneLine">
        <img
          src="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBw4ODg4NDg4ODhAPEA0NDw0NDRAQDg0NFhIXFhURExUYHCggGBolHRMTITEhJSkrLi4uFx8zODMsNygtLisBCgoKDg0NEA4PDy0ZFRkrKystKzctNy0rKysrKystKysrKysrKysrNysrKysrKysrKysrKysrKysrKysrKysrK//AABEIAOEA4QMBIgACEQEDEQH/xAAbAAEAAgMBAQAAAAAAAAAAAAAAAQQCBQYDB//EADMQAQEAAQEFAwoGAwEAAAAAAAABAgMEBREhMRJBURUiM1JhcYGSocEycoKxstETI5Hh/8QAFgEBAQEAAAAAAAAAAAAAAAAAAAEC/8QAFhEBAQEAAAAAAAAAAAAAAAAAAAER/9oADAMBAAIRAxEAPwD6KgG2QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAZdqgMQAAAAAAAAAAAARxFSI4pAAEAAAAAAAAAAAAAAAAAAAAAAJzvBsdk3VllzzvCeE62PfdOwzGf5cudvSXujaM2qq6W79LHpjxvjbViaeM7p/xkIrzy2fC9cZz9iptG69PL8M7F9nHg2CDRzW07Hnp8e1OM7rOjwdVqYTKXG9LOFc9t2zXSy4dZeeN9jUqKwlCoAAAAAAAAAAAAAAAAAALm69nmpnznGY86p1vNy6fDT7XDrUqthIkGVQJQACQQrbds81MLy5znL4VaRQcn38BZ3jpzHVyk7+as3qAAgAAAAAAAAAAAAAAABXS7FjJp4d3KVzVdPsvo8Py4/slV7CIllQAAABFSig0u+5wzxvjLx+jWtpv3rp+7L7NYsRADSAAAAAAAAAAAAAAAAFdHu7U7WlhfZw/wCcnONtuTXnnad6/inuSq24hLKgAAACKljnlJLb3A0e+tXjqTH1Z+6g9Nr1O3nll422ce6PLFqIkBUAAAAAAAAAAAAAAAAGejqXDKZTrKwCjqNn1pnjMpZ/Verm9g2z/Flz49m9Z93Q6WpMpLLxlYaZgAAANTvfa+V0p7OP7rO8NtmnjZOeV4ycO6+NaDLK223nbeNWREWANIAAAAAAAAAAAAAAAAAAAkGNe2zbVnp/hvwvOPNCK2uz749fH4xZm9tH1rP05f00PEiYN5lvfT58OOXws/dR1d66uXThjPdzUacVwZZ5XK2222sQVAAAAAAAAAAAAAAAAAABlp4ZZXhjLfgvbDu25+dnxmPKzxrc6WhjhJMcZOCarT6G6c7zyvZ9i5jujTnW5X4z7RsBNXFLyXo+rfmp5L0fVvzVdEFLyXo+rfmqPJej6t+arwCj5K0fVvzU8laPq35qvAKPkrR9W/NWOW6NK9LnPdlPvGwAanPc3q6l/Viqa27dXHu7U8cbx+nV0Iujk8pZeFll8LyqHUa+z4ak4ZYy+3vnurSbdsGWl5087Dx7571lTFIBUAAAAAAAAAAS2u7t3cfPz+EeG6dn7eXavTH61vZGbVJEgigAAAAAAAAAAACLOPKpAaHeew/4728Z5l6z1b/Sg6vUwmUuNnGWcLPY5ra9C6edwvd0vjO5qVK8QFQAAAAAAZYY22SdbZIxX9zaPa1O13YTj8b0+5VbjZNnmlhMZ77fG99ewMKAAAAAAAAAAAAAAAANdvrQ7WHbnXDr+Wtiw1sO1jlj4yz6A5UINsgAAAAADd7jx8zK+OX0k/8AWkb/AHNP9M9tyv14fZKsXgGVAAAAAAAAAAAAAAAAAAcrrY8M854ZZT6sHttfpNT8+f8AKvFtAAQAAAAdDun0OH6/5VzzoN0ehx9+X8qlWLoDKgAAAAAAAAAAAAAAAAAOZ26f7dT82TwWd4zhranvl+kVm4gAIAAAAOg3R6HH35fyoJVi6AyoAAAAAAAAAAAAAAACKQAc9vT02f6f4xUBuIACAAP/2Q=="
          alt="Profile"
          className="profilePhoto"
        />
        <span className="name">  <p><strong>Referral Type:</strong> {formState.referralType || "—"}</p></span>
        <span className="company">    <p><strong>Referral ID:</strong> {referralId || "—"}</p></span>

        <div className="actions">
          <button onClick={() => setShowDealCard(!showDealCard)}>
            Deal Value
          </button>

          <span className={`statusBadge ${formState.dealStatus?.toLowerCase().replace(/\s/g, "-")}`}>
            {formState.dealStatus || "Pending"}
          </span>
        </div>
      </div>

      <section className="ReferralDetailMain">
        <div className="ReferralInfo">
          <div className="card ReferralStatusCard">
            <div className="cardHeader">
              <h2>Referral Details</h2>
              <span className={`statusBadge ${formState.dealStatus?.toLowerCase().replace(/\s/g, "-")}`}>
                {formState.dealStatus || "Pending"}
              </span>
            </div>

            <div className="cardSection">
              <label>
                Deal Status:
                <select
                  name="dealStatus"
                  value={formState.dealStatus}
                  onChange={handleChange}
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
              <button
                onClick={() => updateDealStatus(formState.dealStatus)}
                disabled={updatingStatus}
              >
                {updatingStatus ? "Updating..." : "Update Status"}
              </button>
            </div>

            {/* STATUS HISTORY (realtime) */}
            {statusHistory && statusHistory.length > 0 && (
              <div className="statusHistory">
                <h4>Status History</h4>
                <ul>
                  {statusHistory.map((log, i) => (
                    <li key={i}>
                      <div className="timelineDot"></div>
                      <div className="timelineContent">
                        <span className="statusLabel">{log.status}</span>
                        <span className="statusDate">
                          {log.updatedAt?.seconds
                            ? new Date(log.updatedAt.seconds * 1000).toLocaleString()
                            : new Date(log.updatedAt).toLocaleString()}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Orbiter profile card */}
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
                CosmOrbiter
              </button>
            </div>

            {/* Orbiter Profile */}
            {activeProfileTab === "Orbiter" && orbiter && (
              <div className="profileCard">
                <div className="profileHeader">
                  <img
                    src={
                      orbiter?.profilePic ||
                      "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBw4ODg4NDg4ODhAPEA0NDw0NDRAQDg0NFhIXFhURExUYHCggGBolHRMTITEhJSkrLi4uFx8zODMsNygtLisBCgoKDg0NEA4PDy0ZFRkrKystKzctNy0rKysrKystKysrKysrKysrNysrKysrKysrKysrKysrKysrKysrKysrK//AABEIAOEA4QMBIgACEQEDEQH/xAAbAAEAAgMBAQAAAAAAAAAAAAAAAQQCBQYDB//EADMQAQEAAQEFAwoGAwEAAAAAAAABAgMEBREhMRJBURUiM1JhcYGSocEycoKxstETI5Hh/8QAFgEBAQEAAAAAAAAAAAAAAAAAAAEC/8QAFhEBAQEAAAAAAAAAAAAAAAAAAAER/9oADAMBAAIRAxEAPwD6KgG2QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAZdqgMQAAAAAAAAAAAARxFSI4pAAEAAAAAAAAAAAAAAAAAAAAAAJzvBsdk3VllzzvCeE62PfdOwzGf5cudvSXujaM2qq6W79LHpjxvjbViaeM7p/xkIrzy2fC9cZz9iptG69PL8M7F9nHg2CDRzW07Hnp8e1OM7rOjwdVqYTKXG9LOFc9t2zXSy4dZeeN9jUqKwlCoAAAAAAAAAAAAAAAAAALm69nmpnznGY86p1vNy6fDT7XDrUqthIkGVQJQACQQrbds81MLy5znL4VaRQcn38BZ3jpzHVyk7+as3qAAgAAAAAAAAAAAAAAABXS7FjJp4d3KVzVdPsvo8Py4/slV7CIllQAAABFSig0u+5wzxvjLx+jWtpv3rp+7L7NYsRADSAAAAAAAAAAAAAAAAFdHu7U7WlhfZw/wCcnONtuTXnnad6/inuSq24hLKgAAACKljnlJLb3A0e+tXjqTH1Z+6g9Nr1O3nll422ce6PLFqIkBUAAAAAAAAAAAAAAAAGejqXDKZTrKwCjqNn1pnjMpZ/Verm9g2z/Flz49m9Z93Q6WpMpLLxlYaZgAAANTvfa+V0p7OP7rO8NtmnjZOeV4ycO6+NaDLK223nbeNWREWANIAAAAAAAAAAAAAAAAAAAkGNe2zbVnp/hvwvOPNCK2uz749fH4xZm9tH1rP05f00PEiYN5lvfT58OOXws/dR1d66uXThjPdzUacVwZZ5XK2222sQVAAAAAAAAAAAAAAAAAABlp4ZZXhjLfgvbDu25+dnxmPKzxrc6WhjhJMcZOCarT6G6c7zyvZ9i5jujTnW5X4z7RsBNXFLyXo+rfmp5L0fVvzVdEFLyXo+rfmqPJej6t+arwCj5K0fVvzU8laPq35qvAKPkrR9W/NWOW6NK9LnPdlPvGwAanPc3q6l/Viqa27dXHu7U8cbx+nV0Iujk8pZeFll8LyqHUa+z4ak4ZYy+3vnurSbdsGWl5087Dx7571lTFIBUAAAAAAAAAAS2u7t3cfPz+EeG6dn7eXavTH61vZGbVJEgigAAAAAAAAAAACLOPKpAaHeew/4728Z5l6z1b/Sg6vUwmUuNnGWcLPY5ra9C6edwvd0vjO5qVK8QFQAAAAAAZYY22SdbZIxX9zaPa1O13YTj8b0+5VbjZNnmlhMZ77fG99ewMKAAAAAAAAAAAAAAAANdvrQ7WHbnXDr+Wtiw1sO1jlj4yz6A5UINsgAAAAADd7jx8zK+OX0k/8AWkb/AHNP9M9tyv14fZKsXgGVAAAAAAAAAAAAAAAAAAcrrY8M854ZZT6sHttfpNT8+f8AKvFtAAQAAAAdDun0OH6/5VzzoN0ehx9+X8qlWLoDKgAAAAAAAAAAAAAAAAAOZ26f7dT82TwWd4zhranvl+kVm4gAIAAAAOg3R6HH35fyoJVi6AyoAAAAAAAAAAAAAAACKQAc9vT02f6f4xUBuIACAAP/2Q=="
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
                    <p><strong>Email:</strong> {orbiter?.email || "No Email"}</p>
                    <p><strong>Phone:</strong> {orbiter?.phone || "No Phone"}</p>
                    <p><strong>MentOrbiter:</strong> {orbiter?.mentorName || "No Mentor"}</p>
                    <p><strong>MentOrbiter Phone:</strong> {orbiter?.mentorPhone || "No Mentor Phone"}</p>
                    <p><strong>UJB Code:</strong> {orbiter?.ujbCode || "No UJB Code"}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Cosmo Profile */}
            {activeProfileTab === "Cosmo" && cosmoOrbiter && (
              <div className="profileCard">
                <div className="profileHeader">
                  <img
                    src={
                      cosmoOrbiter?.profilePic ||
                      "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBw4ODg4NDg4ODhAPEA0NDw0NDRAQDg0NFhIXFhURExUYHCggGBolHRMTITEhJSkrLi4uFx8zODMsNygtLisBCgoKDg0NEA4PDy0ZFRkrKystKzctNy0rKysrKystKysrKysrKysrNysrKysrKysrKysrKysrKysrKysrKysrK//AABEIAOEA4QMBIgACEQEDEQH/xAAbAAEAAgMBAQAAAAAAAAAAAAAAAQQCBQYDB//EADMQAQEAAQEFAwoGAwEAAAAAAAABAgMEBREhMRJBURUiM1JhcYGSocEycoKxstETI5Hh/8QAFgEBAQEAAAAAAAAAAAAAAAAAAAEC/8QAFhEBAQEAAAAAAAAAAAAAAAAAAAER/9oADAMBAAIRAxEAPwD6KgG2QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAZdqgMQAAAAAAAAAAAARxFSI4pAAEAAAAAAAAAAAAAAAAAAAAAAJzvBsdk3VllzzvCeE62PfdOwzGf5cudvSXujaM2qq6W79LHpjxvjbViaeM7p/xkIrzy2fC9cZz9iptG69PL8M7F9nHg2CDRzW07Hnp8e1OM7rOjwdVqYTKXG9LOFc9t2zXSy4dZeeN9jUqKwlCoAAAAAAAAAAAAAAAAAALm69nmpnznGY86p1vNy6fDT7XDrUqthIkGVQJQACQQrbds81MLy5znL4VaRQcn38BZ3jpzHVyk7+as3qAAgAAAAAAAAAAAAAAABXS7FjJp4d3KVzVdPsvo8Py4/slV7CIllQAAABFSig0u+5wzxvjLx+jWtpv3rp+7L7NYsRADSAAAAAAAAAAAAAAAAFdHu7U7WlhfZw/wCcnONtuTXnnad6/inuSq24hLKgAAACKljnlJLb3A0e+tXjqTH1Z+6g9Nr1O3nll422ce6PLFqIkBUAAAAAAAAAAAAAAAAGejqXDKZTrKwCjqNn1pnjMpZ/Verm9g2z/Flz49m9Z93Q6WpMpLLxlYaZgAAANTvfa+V0p7OP7rO8NtmnjZOeV4ycO6+NaDLK223nbeNWREWANIAAAAAAAAAAAAAAAAAAAkGNe2zbVnp/hvwvOPNCK2uz749fH4xZm9tH1rP05f00PEiYN5lvfT58OOXws/dR1d66uXThjPdzUacVwZZ5XK2222sQVAAAAAAAAAAAAAAAAAABlp4ZZXhjLfgvbDu25+dnxmPKzxrc6WhjhJMcZOCarT6G6c7zyvZ9i5jujTnW5X4z7RsBNXFLyXo+rfmp5L0fVvzVdEFLyXo+rfmqPJej6t+arwCj5K0fVvzU8laPq35qvAKPkrR9W/NWOW6NK9LnPdlPvGwAanPc3q6l/Viqa27dXHu7U8cbx+nV0Iujk8pZeFll8LyqHUa+z4ak4ZYy+3vnurSbdsGWl5087Dx7571lTFIBUAAAAAAAAAAS2u7t3cfPz+EeG6dn7eXavTH61vZGbVJEgigAAAAAAAAAAACLOPKpAaHeew/4728Z5l6z1b/Sg6vUwmUuNnGWcLPY5ra9C6edwvd0vjO5qVK8QFQAAAAAAZYY22SdbZIxX9zaPa1O13YTj8b0+5VbjZNnmlhMZ77fG99ewMKAAAAAAAAAAAAAAAANdvrQ7WHbnXDr+Wtiw1sO1jlj4yz6A5UINsgAAAAADd7jx8zK+OX0k/8AWkb/AHNP9M9tyv14fZKsXgGVAAAAAAAAAAAAAAAAAAcrrY8M854ZZT6sHttfpNT8+f8AKvFtAAQAAAAdDun0OH6/5VzzoN0ehx9+X8qlWLoDKgAAAAAAAAAAAAAAAAAOZ26f7dT82TwWd4zhranvl+kVm4gAIAAAAOg3R6HH35fyoJVi6AyoAAAAAAAAAAAAAAACKQAc9vT02f6f4xUBuIACAAP/2Q=="
                    }
                    alt={cosmoOrbiter?.name || "Profile"}
                    className="profileImage"
                  />
                  <h2>{cosmoOrbiter?.name || "No Name"}</h2>
                  <p className="profileSubtitle">CosmOrbiter</p>
                </div>

                <div className="profileDetails">
                  <h3>Contact Details</h3>
                  <div className="detailsGrid">
                    <p><strong>Email:</strong> {cosmoOrbiter?.email || "No Email"}</p>
                    <p><strong>Phone:</strong> {cosmoOrbiter?.phone || "No Phone"}</p>
                    <p><strong>MentOrbiter:</strong> {cosmoOrbiter?.mentorName || "No Mentor"}</p>
                    <p><strong>MentOrbiter Phone:</strong> {cosmoOrbiter?.mentorPhone || "No Mentor Phone"}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Service/Product Card */}
          <div className="card serviceCard">
            <h2>{service ? "Service" : "Product"} Card</h2>

            <div className="serviceImg">
              <img
                src={
                  service?.imageURL || product?.imageURL ||
                  "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/No-Image-Placeholder-landscape.svg/1280px-No-Image-Placeholder-landscape.svg.png"
                }
                alt="Service/Product"
              />
            </div>

            <h3>{service?.name || product?.name || "No Name"}</h3>

            {service?.percentage ? (
              <p><strong>Percentage:</strong> {service.percentage}%</p>
            ) : product?.percentage ? (
              <p><strong>Percentage:</strong> {product.percentage}%</p>
            ) : null}

            <button
              className="calcDealBtn"
              onClick={() => setShowModal(true)}
              disabled={dealCalculated || calculatingDeal}
            >
              {dealCalculated ? "Deal Calculated ✅" : "Calculate Deal Value"}
            </button>
          </div>

          {/* Modal */}
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
                    onChange={handleChange}
                    placeholder="Enter deal value"
                  />
                </label>

                {formState.dealValue && (() => {
                  const d = calculateDistribution();
                  return (
                    <div className="distribution-box">
                      <h4>Distribution Breakdown</h4>
                      <p><strong>Total Agreed Amount:</strong> ₹{d.agreedAmount.toFixed(2)}</p>
                      <p><strong>Orbiter:</strong> ₹{d.orbiterShare.toFixed(2)}</p>
                      <p><strong>Orbiter's MentOrbiter:</strong> ₹{d.orbiterMentorShare.toFixed(2)}</p>
                      <p><strong>Cosmo MentOrbiter:</strong> ₹{d.cosmoMentorShare.toFixed(2)}</p>
                      <p><strong>UJustBe:</strong> ₹{d.ujustbeShare.toFixed(2)}</p>
                    </div>
                  );
                })()}

                <div className="modalActions">
                  <button onClick={async () => { await calculateDealValue(); setShowModal(false); }}>
                    Save & Lock
                  </button>
                  <button className="cancelBtn" onClick={() => setShowModal(false)}>Cancel</button>
                </div>
              </div>
            </div>
          )}

          {showDealCard && (
            <div className="dealPopupCard">
              {dealLogs.length > 0 ? (
                <div className="dealCardsGrid">
                  {dealLogs.map((log, i) => (
                    <div className="dealCard" key={i}>
                      <p><strong>Date:</strong> {new Date(log.timestamp).toLocaleString()}</p>
                      <p><strong>Deal Value:</strong> ₹{log.dealValue}</p>
                      <p><strong>Percentage:</strong> {log.percentage}%</p>
                      <p><strong>Agreed Amount:</strong> ₹{log.agreedAmount.toFixed(2)}</p>
                      <p><strong>Orbiter:</strong> ₹{log.orbiterShare.toFixed(2)}</p>
                      <p><strong>MentOrbiter:</strong> ₹{log.orbiterMentorShare.toFixed(2)}</p>
                      <p><strong>Cosmo MentOrbiter:</strong> ₹{log.cosmoMentorShare.toFixed(2)}</p>
                      <p><strong>UJustBe:</strong> ₹{log.ujustbeShare.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p>No deal logs yet.</p>
              )}
            </div>
          )}
        </div>

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
                  onChange={handleFollowupChange}
                >
                  <option>High</option>
                  <option>Medium</option>
                  <option>Low</option>
                </select>
              </label>

              <label>
                Next Follow-up Date:
                <input
                  type="date"
                  name="date"
                  value={newFollowup.date}
                  onChange={handleFollowupChange}
                />
              </label>

              <label>
                Description:
                <textarea
                  name="description"
                  value={newFollowup.description}
                  onChange={handleFollowupChange}
                />
              </label>

              <label>
                Status:
                <select
                  name="status"
                  value={newFollowup.status}
                  onChange={handleFollowupChange}
                >
                  <option>Pending</option>
                  <option>Completed</option>
                </select>
              </label>

              <div className="formButtons">
                <button type="button" onClick={handleAddFollowup}>
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
            followups.map((fup, idx) => (
              <div className="followupCard" key={idx}>
                <h3>{fup.priority} Priority</h3>
                <p><strong>Next Date:</strong> {fup.date}</p>
                <p><strong>Description:</strong> {fup.description}</p>
                <p><strong>Status:</strong> {fup.status}</p>
              </div>
            ))
          ) : (
            <p>No follow-ups yet.</p>
          )}
        </div>

        {/* Payment section (collapsed) */}
        {dealEverWon && (
          <div className="PaymentContainer">
            <h4>Last Payment</h4>

            {payments?.length > 0 ? (
              <p>
                {mapPaymentLabel(payments.at(-1).paymentFrom)} →{" "}
                {mapPaymentLabel(payments.at(-1).paymentTo)} : ₹
                {Number(payments.at(-1).amountReceived).toLocaleString("en-IN")}
              </p>
            ) : (
              <p>No payments recorded yet</p>
            )}

            <button
              className="viewMoreBtn"
              onClick={() => setShowPaymentSheet(true)}
            >
              View Payment History
            </button>
          </div>
        )}

        {/* Sliding Payment Sheet */}
        <div className={`PaymentSheet ${showPaymentSheet ? "open" : ""}`}>
          <div className="sheetHeader">
            <h3>{showAddPaymentForm ? "Add Payment" : "Payment History"}</h3>
            <button onClick={() => setShowPaymentSheet(false)}>✕</button>
          </div>

          {/* HISTORY VIEW */}
          {!showAddPaymentForm && (
            <>
              {payments.length > 0 ? (
                payments.map((payment, idx) => (
                  <div className="paymentCard" key={idx}>
                    <div className="paymentCardHeader">
                      <h4>₹{payment.amountReceived}</h4>
                      <div className="paymentActions">
                        <button
                          className="editBtn"
                          onClick={() => handleEditClick(idx, payment)}
                        >
                          ✏️
                        </button>
                        <button
                          className="deleteBtn"
                          onClick={() => handleDeletePayment(idx)}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                    <p><strong>From:</strong> {mapPaymentLabel(payment.paymentFrom)}</p>
                    <p><strong>To:</strong> {mapPaymentLabel(payment.paymentTo)}</p>
                    <p><strong>Mode:</strong> {payment.modeOfPayment}</p>
                    <p><strong>Date:</strong> {payment.paymentDate}</p>

                    <div className="paymentAmounts">
                      <p><strong>Total Amount Received:</strong> ₹{payment.amountReceived || 0}</p>
                      <p><strong>Adjusted Amount:</strong> ₹{payment.adjustedAmount || 0}</p>
                      <p><strong>Actual Received:</strong> ₹{payment.actualReceived || 0}</p>
                    </div>

                    {payment.transactionRef && (
                      <p><strong>Transaction Ref:</strong> {payment.transactionRef}</p>
                    )}
                    {payment.comment && (
                      <p><strong>Comment:</strong> {payment.comment}</p>
                    )}
                  </div>
                ))
              ) : (
                <p>No payments yet.</p>
              )}

              <button
                className="addPaymentBtn"
                onClick={() => setShowAddPaymentForm(true)}
              >
                + Add Payment
              </button>
            </>
          )}

          {/* ADD PAYMENT FORM */}
          {showAddPaymentForm && (
            <div className="addPaymentForm">
              <label>
                Payment From: <span style={{ color: "red" }}>*</span>
                <select
                  name="paymentFrom"
                  value={newPayment.paymentFrom}
                  onChange={handlePaymentChange}
                  required
                >
                  <option value="">-- Select --</option>
                  <option value="CosmoOrbiter">{cosmoOrbiter?.name || "CosmoOrbiter"}</option>
                  <option value="UJustBe">UJustBe</option>
                </select>
              </label>

              <label>
                Payment To: <span style={{ color: "red" }}>*</span>
                <select
                  name="paymentTo"
                  value={newPayment.paymentTo}
                  onChange={(e) => handlePaymentToSelect(e.target.value)}
                  required
                >
                  <option value="">-- Select --</option>
                  <option value="Orbiter">{orbiter?.name || "Orbiter"}</option>
                  <option value="OrbiterMentor">{orbiter?.mentorName || "Orbiter Mentor"}</option>
                  <option value="CosmoMentor">{cosmoOrbiter?.mentorName || "Cosmo Mentor"}</option>
                  <option value="UJustBe">UJustBe</option>
                </select>
              </label>

              <label>
                Amount: <span style={{ color: "red" }}>*</span>
                <input
                  type="number"
                  name="amountReceived"
                  value={newPayment.amountReceived}
                  onChange={async (e) => {
                    const value = Number(e.target.value);
                    const updatedPayment = { ...newPayment, amountReceived: value };
                    setNewPayment(updatedPayment);

                    setAdjustmentInfo({ adjustedAmount: 0, actualReceived: 0 });

                    if (updatedPayment.paymentTo && value > 0) {
                      let targetDocRef = null;
                      let paymentFieldPath = "";

                      switch (updatedPayment.paymentTo) {
                        case "Orbiter":
                          if (orbiter?.ujbCode) {
                            targetDocRef = doc(db, COLLECTIONS.userDetail, orbiter.ujbCode);
                            paymentFieldPath = "payment.orbiter";
                          }
                          break;
                        case "CosmoOrbiter":
                          if (cosmoOrbiter?.ujbCode) {
                            targetDocRef = doc(db, COLLECTIONS.userDetail, cosmoOrbiter.ujbCode);
                            paymentFieldPath = "payment.cosmo";
                          }
                          break;
                        case "OrbiterMentor":
                          if (orbiter?.mentorUjbCode) {
                            targetDocRef = doc(db, COLLECTIONS.userDetail, orbiter.mentorUjbCode);
                            paymentFieldPath = "payment.mentor";
                          }
                          break;
                        case "CosmoMentor":
                          if (cosmoOrbiter?.mentorUjbCode) {
                            targetDocRef = doc(db, COLLECTIONS.userDetail, cosmoOrbiter.mentorUjbCode);
                            paymentFieldPath = "payment.mentor";
                          }
                          break;
                        default:
                          paymentFieldPath = "";
                      }

                      if (targetDocRef) {
                        const snap = await getDoc(targetDocRef);
                        if (snap.exists()) {
                          const data = snap.data();
                          const paySection =
                            paymentFieldPath.includes("cosmo")
                              ? data?.payment?.cosmo || {}
                              : paymentFieldPath.includes("mentor")
                              ? data?.payment?.mentor || {}
                              : data?.payment?.orbiter || {};

                          const currentAmount = Number(paySection.amount || 0);
                          const status = (paySection.status || "").toLowerCase();
                          const feeType = (paySection.feeType || "").toLowerCase();

                          if (feeType === "adjustment" && ["adjusted", "unpaid"].includes(status)) {
                            if (value > 0 && value <= currentAmount) {
                              setAdjustmentInfo({ adjustedAmount: value, actualReceived: 0 });
                            } else if (value > currentAmount) {
                              setAdjustmentInfo({
                                adjustedAmount: currentAmount,
                                actualReceived: value - currentAmount,
                              });
                            } else {
                              setAdjustmentInfo({ adjustedAmount: 0, actualReceived: 0 });
                            }
                          } else {
                            setAdjustmentInfo({ adjustedAmount: 0, actualReceived: value });
                          }
                        }
                      }
                    }
                  }}
                  min="1"
                  required
                />
              </label>

              {adjustmentInfo.actualReceived === 0 && adjustmentInfo.adjustedAmount > 0 && (
                <div style={{ marginTop: "10px", color: "#2c7a7b", fontWeight: "500" }}>
                  ✅ This amount will be adjusted internally. No payment details required.
                </div>
              )}

              {adjustmentInfo.actualReceived > 0 && (
                <>
                  <label>
                    Mode of Payment: <span style={{ color: "red" }}>*</span>
                    <select
                      name="modeOfPayment"
                      value={newPayment.modeOfPayment}
                      onChange={handlePaymentChange}
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
                      Transaction Reference Number: <span style={{ color: "red" }}>*</span>
                      <input
                        type="text"
                        name="transactionRef"
                        value={newPayment.transactionRef || ""}
                        onChange={handlePaymentChange}
                        required
                      />
                    </label>
                  )}

                  <label>
                    Upload Invoice:
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) =>
                        setNewPayment({ ...newPayment, paymentInvoice: e.target.files[0] })
                      }
                    />
                  </label>

                  {newPayment.modeOfPayment === "Other" && (
                    <label>
                      Comment: <span style={{ color: "red" }}>*</span>
                      <textarea
                        name="comment"
                        value={newPayment.comment || ""}
                        onChange={handlePaymentChange}
                        required
                      />
                    </label>
                  )}
                </>
              )}

              <label>
                Payment Date: <span style={{ color: "red" }}>*</span>
                <input
                  type="date"
                  name="paymentDate"
                  value={newPayment.paymentDate}
                  onChange={handlePaymentChange}
                  max={new Date().toISOString().split("T")[0]}
                  required
                />
              </label>

              <div className="formButtons">
                <button onClick={handleAddPayment} disabled={submittingPayment}>
                  {submittingPayment ? "Saving..." : "Save Payment"}
                </button>
                <button className="cancelBtn" onClick={() => setShowAddPaymentForm(false)}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

      </section>
    </Layouts>
  );
};

export default ReferralDetails;
