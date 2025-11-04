import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { doc, getDoc, updateDoc, Timestamp, arrayUnion } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import Layouts from "../../component/Layouts";
import "../../src/app/styles/main.scss";
import { COLLECTIONS } from "/utility_collection";
import "../../src/app/styles/user.scss";
const TABS = ["Referral Info", "Orbiter", "CosmoOrbiter", "Service/Product", "Follow Up", "Payment History"];
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../../firebaseConfig";
import Swal from "sweetalert2";

const ReferralDetails = () => {
  const router = useRouter();
  const { id } = router.query;
  const [activeProfileTab, setActiveProfileTab] = useState("Orbiter");
  const [dealLogs, setDealLogs] = useState([]);
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
  const [showFollowupForm, setShowFollowupForm] = useState(false);  // 👈 Add this
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

  const calculateDistribution = () => {
    const dealValue = parseFloat(formState.dealValue);
    const percentage = parseFloat(service?.percentage || product?.percentage);
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

  const handleSaveDealLog = async () => {
    const distribution = calculateDistribution();
    try {
      const updatedLogs = [...dealLogs, distribution];
      const docRef = doc(db,COLLECTIONS.referral, id);
      await updateDoc(docRef, { dealLogs: updatedLogs });
      setDealLogs(updatedLogs);
      setShowModal(false); // close modal
    } catch (error) {
      console.error("Error saving deal log:", error);
      alert("Failed to save deal distribution.");
    }
  };


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

     if (data.orbiter?.phone) {
  const orbiterSnap = await getDoc(doc(db, COLLECTIONS.userDetail, data.orbiter.phone));
  if (orbiterSnap.exists()) {
    const orbiterData = orbiterSnap.data();
    setOrbiter({
      ...data.orbiter,
      ...orbiterData,
      profilePic: orbiterData["Profile Photo URL"] || orbiterData["Business Logo"] || "", // normalize
    });
  }
}// ✅ Fetch ORBITER details using UJB Code as doc ID
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

// ✅ Fetch COSMO details using UJB Code as doc ID
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
  const handlePaymentChange = (e) => {
    setNewPayment({ ...newPayment, [e.target.name]: e.target.value });
  };





// 🧾 EDIT PAYMENT
const handleEditPayment = async (index, updatedPayment) => {
  try {
    const referralDocRef = doc(db, "Referraldev", id);
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

// ❌ DELETE PAYMENT
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

    const referralDocRef = doc(db, "Referraldev", id);
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
  setShowAddPaymentForm(true); // open the form for editing
};

const handleAddPayment = async () => {
  try {
    // 🧾 Basic field validation
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

    // 🗓️ Prevent future date
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

    // 💸 Amount validation
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

    // Initialize adjustment variables
    let adjustedAmount = 0;
    let actualReceived = 0;
    let currentAmount = 0;
    let currentStatus = "";
    let feeType = "";
    let targetDocRef = null;
    let paymentFieldPath = "";
    let targetUser = null;

    // 🎯 Determine correct user document
    switch (newPayment.paymentTo) {
      case "Orbiter":
        if (orbiter?.ujbCode) {
          targetDocRef = doc(db, COLLECTIONS.userDetail, orbiter.ujbCode);
          paymentFieldPath = "payment.orbiter";
          targetUser = orbiter;
        }
        break;
      case "CosmoOrbiter":
        if (cosmoOrbiter?.ujbCode) {
          targetDocRef = doc(db, COLLECTIONS.userDetail, cosmoOrbiter.ujbCode);
          paymentFieldPath = "payment.cosmo";
          targetUser = cosmoOrbiter;
        }
        break;
      case "OrbiterMentor":
        if (orbiter?.mentorUjbCode) {
          targetDocRef = doc(db, COLLECTIONS.userDetail, orbiter.mentorUjbCode);
          paymentFieldPath = "payment.mentor";
          targetUser = { name: orbiter.mentorName, ujbCode: orbiter.mentorUjbCode };
        }
        break;
      case "CosmoMentor":
        if (cosmoOrbiter?.mentorUjbCode) {
          targetDocRef = doc(db, COLLECTIONS.userDetail, cosmoOrbiter.mentorUjbCode);
          paymentFieldPath = "payment.mentor";
          targetUser = { name: cosmoOrbiter.mentorName, ujbCode: cosmoOrbiter.mentorUjbCode };
        }
        break;
      default:
        console.log("❌ Unknown paymentTo target:", newPayment.paymentTo);
    }

    // 🧩 Fetch current fee type and adjustment info
    if (targetDocRef) {
      const targetSnap = await getDoc(targetDocRef);
      if (targetSnap.exists()) {
        const targetData = targetSnap.data();

        const paySection = paymentFieldPath.includes("cosmo")
          ? targetData?.payment?.cosmo || {}
          : paymentFieldPath.includes("mentor")
          ? targetData?.payment?.mentor || {}
          : targetData?.payment?.orbiter || {};

        feeType = paySection?.feeType || "";
        if (!["upfront", "adjustment"].includes(feeType)) {
          await Swal.fire({
            icon: "error",
            title: "Fee Type Not Set",
            text: "Fee type (upfront or adjustment) is not set in the user's profile. Please update their profile first.",
            backdrop: true,
          });
          return;
        }

        currentAmount = Number(paySection.amount || 0);
        currentStatus = paySection.status || "";

        if (feeType === "adjustment" && ["adjusted", "unpaid"].includes(currentStatus)) {
          if (received <= currentAmount) {
            adjustedAmount = received; // 🔹 Fully adjusted
            actualReceived = 0;
          } else {
            adjustedAmount = currentAmount; // 🔸 Partial adjustment
            actualReceived = received - currentAmount;
          }
        }
      }
    }

    // 🧠 Dynamic validation depending on adjustment type
    if (adjustedAmount > 0 && actualReceived === 0) {
      // ✅ FULL ADJUSTMENT
      console.log("✅ Full adjustment — skipping payment details validation.");
    } else if (adjustedAmount > 0 && actualReceived > 0) {
      // ⚠️ PARTIAL ADJUSTMENT
      if (!newPayment.modeOfPayment) {
        await Swal.fire({
          icon: "warning",
          title: "Payment Mode Required",
          text: "Please select a payment mode for the remaining (non-adjusted) amount.",
          backdrop: true,
        });
        return;
      }
      if (
        ["GPay", "Razorpay", "Bank Transfer", "Other"].includes(newPayment.modeOfPayment) &&
        !newPayment.transactionRef
      ) {
        await Swal.fire({
          icon: "warning",
          title: "Transaction Reference Required",
          text: "Please provide transaction reference for the received portion.",
          backdrop: true,
        });
        return;
      }
    } else {
      // 💰 NORMAL (UPFRONT)
      if (!newPayment.modeOfPayment) {
        await Swal.fire({
          icon: "warning",
          title: "Payment Mode Required",
          text: "Please select a payment mode.",
          backdrop: true,
        });
        return;
      }
    }

    // 📎 Upload invoice only if external payment exists
    let paymentInvoiceURL = "";
    if (newPayment.paymentInvoice && actualReceived > 0) {
      const fileRef = ref(
        storage,
        `paymentInvoices/${id}/${Date.now()}_${newPayment.paymentInvoice.name}`
      );
      await uploadBytes(fileRef, newPayment.paymentInvoice);
      paymentInvoiceURL = await getDownloadURL(fileRef);
    }

    // 🧾 Prepare payment data
    const { paymentInvoice, ...restPayment } = newPayment;
    const paymentData = {
      ...restPayment,
      paymentFromName: mapToActualName(newPayment.paymentFrom),
      paymentToName: mapToActualName(newPayment.paymentTo),
      paymentInvoiceURL,
      createdAt: Timestamp.now(),
      adjustedAmount,
      actualReceived,
      feeType,
    };

    // ✅ Add payment to Referraldev
    const updatedPayments = [...payments, paymentData];
    await updateDoc(doc(db, "Referraldev", id), { payments: updatedPayments });
    setPayments(updatedPayments);

    // 🧮 Update adjustment in user details
    if (targetDocRef && currentStatus === "adjusted") {
      const newAmount = Math.max(currentAmount - received, 0);
      const newStatus = newAmount === 0 ? "paid" : "adjusted";

      const logEntry = {
        date: new Date().toISOString(),
        receivedAmount: received,
        remainingAmount: newAmount,
        referralId: id,
        paymentMode: actualReceived > 0 ? newPayment.modeOfPayment : "Adjusted",
        transactionRef: newPayment.transactionRef || "",
      };

      await updateDoc(targetDocRef, {
        [`${paymentFieldPath}.amount`]: newAmount,
        [`${paymentFieldPath}.status`]: newStatus,
        [`${paymentFieldPath}.lastUpdated`]: new Date().toISOString(),
        [`${paymentFieldPath}.adjustmentLogs`]: arrayUnion(logEntry),
      });
    }

    // 🧼 Reset form
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
    setShowAddPaymentForm(false);

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
  }
};





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


  const handleUpdate = async (e) => {
    e.preventDefault();

    try {
      const docRef = doc(db,COLLECTIONS.referral, id);

      const newLog = {
        status: formState.dealStatus,
        updatedAt: Timestamp.now(),
      };

      await updateDoc(docRef, { 
        dealStatus: formState.dealStatus,
        statusLogs: arrayUnion(newLog), // 👈 push instead of replace
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
        {/* <span className="date">01/20/2025</span>
        <span className="role">COO</span>
        <span className="email">michaelstone@gmail.com</span>
        <span className="phone">202-56-32-945</span> */}

        <div className="actions">
          {/* <button>📞</button>
          <button>✈️</button> */}
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
         
          {/* Referral Box */}
          <div className="card ReferralStatusCard">
            <div className="cardHeader">
              <h2>Referral Details</h2>
              <span className={`statusBadge ${formState.dealStatus?.toLowerCase().replace(/\s/g, "-")}`}>
                {formState.dealStatus || "Pending"}
              </span>
            </div>

        

     {/* Status Update */}
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
  <button onClick={handleUpdate}>Update Status</button>
</div>


            {/* Timeline */}
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
                          {new Date(log.updatedAt.seconds * 1000).toLocaleString()}
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
            {/* Tabs */}
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

  {/* Show name separately */}
  <h3>{service?.name || product?.name || "No Name"}</h3>

  {/* Show percentage only if it exists */}
  {service?.percentage ? (
    <p><strong>Percentage:</strong> {service.percentage}%</p>
  ) : product?.percentage ? (
    <p><strong>Percentage:</strong> {product.percentage}%</p>
  ) : null}


            {/* Trigger Modal */}
            <button className="calcDealBtn" onClick={() => setShowModal(true)}>
              Calculate Deal Value
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
                  <button onClick={handleSaveDealLog}>Save</button>
                  <button className="cancelBtn" onClick={() => setShowModal(false)}>Cancel</button>
                </div>
              </div>
            </div>
          )}
{/* Small Popup Card */}
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
                  Date:
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
                  <p><strong>Date:</strong> {fup.date}</p>
                  <p><strong>Description:</strong> {fup.description}</p>
                  <p><strong>Status:</strong> {fup.status}</p>
                </div>
              ))
            ) : (
              <p>No follow-ups yet.</p>
            )}
          </div>
        {/* Collapsed Payment Container */}
        {/* Collapsed Payment Container */}
        <div className="PaymentContainer">
          <h4>Last Payment</h4>
          {payments.length > 0 ? (
            <p>
              {mapPaymentLabel(payments[payments.length - 1].paymentFrom)} →{" "}
              {mapPaymentLabel(payments[payments.length - 1].paymentTo)} : ₹
              {payments[payments.length - 1].amountReceived}
            </p>
          ) : (
            <p>No payments yet</p>
          )}
          <button
            className="viewMoreBtn"
            onClick={() => setShowPaymentSheet(true)}  // <-- Use correct state here
          >
       Payment Details
          </button>
        </div>


{/* Sliding Sheet */}
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

{/* 💸 Display Adjusted / Actual / Total amounts */}
<div className="paymentAmounts">
  <p><strong>Total Amount Received:</strong> ₹{payment.amountReceived || 0}</p>
  <p><strong>Adjusted Amount:</strong> ₹{payment.adjustedAmount || 0}</p>
  <p><strong>Actual Received:</strong> ₹{payment.actualReceived || 0}</p>
</div>

{/* Optional comment or reference */}
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
    

              {/* Add Payment Button */}
              <button
                className="addPaymentBtn"
                onClick={() => setShowAddPaymentForm(true)}
              >
                + Add Payment
              </button>
            </>
          )}

{/* ADD PAYMENT FORM */}
{/* ADD PAYMENT FORM */}
{showAddPaymentForm && (
  <div className="addPaymentForm">
    {/* 🔹 Payment From */}
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

    {/* 🔹 Payment To */}
    <label>
      Payment To: <span style={{ color: "red" }}>*</span>
      <select
        name="paymentTo"
        value={newPayment.paymentTo}
        onChange={handlePaymentChange}
        required
      >
        <option value="">-- Select --</option>
        <option value="Orbiter">{orbiter?.name || "Orbiter"}</option>
        <option value="OrbiterMentor">{orbiter?.mentorName || "Orbiter Mentor"}</option>
        <option value="CosmoMentor">{cosmoOrbiter?.mentorName || "Cosmo Mentor"}</option>
        <option value="UJustBe">UJustBe</option>
      </select>
    </label>

    {/* 🔹 Amount */}
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

  // Reset first
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

        // 🧩 Adjustment visibility logic (fixed)
        if (feeType === "adjustment" && ["adjusted", "unpaid"].includes(status)) {
          if (value > 0 && value <= currentAmount) {
            // 🔹 Full adjustment → hide fields
            setAdjustmentInfo({ adjustedAmount: value, actualReceived: 0 });
          } else if (value > currentAmount) {
            // 🔸 Partial adjustment → show remainder fields
            setAdjustmentInfo({
              adjustedAmount: currentAmount,
              actualReceived: value - currentAmount,
            });
          } else {
            // 🟢 No adjustment or zero value
            setAdjustmentInfo({ adjustedAmount: 0, actualReceived: 0 });
          }
        } else {
          // 💰 Normal upfront payment
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

    {/* 💬 Adjustment Message */}
    {adjustmentInfo.actualReceived === 0 && adjustmentInfo.adjustedAmount > 0 && (
      <div style={{ marginTop: "10px", color: "#2c7a7b", fontWeight: "500" }}>
        ✅ This amount will be adjusted internally. No payment details required.
      </div>
    )}

    {/* 💳 Conditional Payment Fields */}
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

    {/* 🗓 Payment Date */}
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

    {/* Buttons */}
    <div className="formButtons">
      <button onClick={handleAddPayment}>Save Payment</button>
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
