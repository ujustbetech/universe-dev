"use client";

import React, { useEffect, useState } from "react";
import {
    getFirestore,
    collection,
    query,
    where,
    orderBy,
    doc,
    updateDoc,
    Timestamp,
    arrayUnion,
    onSnapshot,getDoc,
setDoc,
addDoc,
getDocs

} from "firebase/firestore";
import { app } from "../firebaseConfig";
import Link from "next/link";
import HeaderNav from "../component/HeaderNav";
import Swal from "sweetalert2";

import Headertop from "../component/Header";
import { COLLECTIONS } from "/utility_collection";
import "../src/app/styles/user.scss";
import { HiOutlineMail } from "react-icons/hi";
import { IoIosCall } from "react-icons/io";

const db = getFirestore(app);

// Function to get dynamic message
const getDynamicMessage = (template, referral) => {
    if (!template) return "";

    const serviceOrProduct =
        (referral.product && referral.product.name) ||
        (referral.service && referral.service.name) ||
        "-";

    return template
        .replace(/\(CosmOrbiter Name\)/g, referral.cosmoOrbiter.name)
        .replace(/\(Orbiter Name\)/g, referral.orbiter.name)
        .replace(/\(Product\/Service\)/g, serviceOrProduct);
};
// ================= CP LOGIC =================




const ensureCpBoardUser = async (user) => {
  if (!user?.ujbCode) return;

  const ref = doc(db, "CPBoard", user.ujbCode);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, {
      id: user.ujbCode,
      name: user.name,
      phoneNumber: user.phone,
      role: "Orbiter",
      totals: { R: 0, H: 0, W: 0 },
      createdAt: Timestamp.now(),
    });
  }
};

const hasCpActivity = async (ujbCode, activityNo, refId) => {
  const q = query(
    collection(db, "CPBoard", ujbCode, "activities"),
    where("activityNo", "==", activityNo),
    where("referralId", "==", refId)
  );
  const snap = await getDocs(q);
  return !snap.empty;
};

const addCp = async ({
  user,
  activityNo,
  activityName,
  points,
  referralId,
  purpose,
}) => {
  await ensureCpBoardUser(user);

  if (await hasCpActivity(user.ujbCode, activityNo, referralId)) return;

  await addDoc(collection(db, "CPBoard", user.ujbCode, "activities"), {
    activityNo,
    activityName,
    points,
    categories: ["R"],
    referralId,
    purpose,
    source: "ReferralModule",
    month: new Date().toLocaleString("default", {
      month: "short",
      year: "numeric",
    }),
    addedAt: Timestamp.now(),
  });
};

// Predefined status messages
const statusMessages = {
    "Not Connected": {
        Orbiter: `Referral Accepted! 🤝 Good news! (CosmOrbiter Name) has accepted your referral for (Product/Service). You may reach out directly if the matter is urgent. 🌟`,
        CosmOrbiter: `Let’s Connect! 📲 You’ve accepted a referral from (Orbiter Name) for (Product/Service). Time to reach out and explore possibilities within the next 24 hours!`,
    },
    "Called but Not Answered": {
        Orbiter: `Hello knock knock! 📞 Our CosmOrbiter (CosmOrbiter Name) tried connecting with you for the referral you passed. Please reconnect so the opportunity doesn’t go cold. 🔄`,
        CosmOrbiter: `Effort Noticed! 🙏 We see your attempt to connect with (Orbiter Name). The Orbiter’s been notified — kindly try again after 24 hours. Your persistence builds trust! 💪`,
    },
    "Discussion in Progress": {
        Orbiter: `Lets do it together 💬 Thank you, (Orbiter Name), for connecting with (CosmOrbiter Name). Your referral is now progressing beautifully! 🌈 You’ve earned Contribution Points for sharing a valid referral. 🌟`,
        CosmOrbiter: `Let the Collaboration Flow! 💬 Thank you, (CosmOrbiter Name), for engaging with (Orbiter Name). You’ve earned Contribution Points for validating this referral. Let’s make this one count! 🚀`,
    },
    "Deal Lost": {
        Orbiter: `We are listening 💭 The referral with (CosmOrbiter Name) for (Product/Service) couldn’t close this time. 🌱 Your efforts matter — please share feedback so we can grow stronger together. 💪`,
        CosmOrbiter: `Every Effort Counts! 🌦️ This referral from (Orbiter Name) didn’t close, but your efforts are valued. Share your learnings — each experience adds wisdom to our Universe. ✨`,
    },
    "Deal Won": {
        Orbiter: `You Did It! 🏆 The referral you passed to (CosmOrbiter Name) for (Product/Service) has been WON! 🌟 Your contribution just turned into real impact. Keep shining! 💫`,
        CosmOrbiter: `Victory Unlocked! 🎉 Amazing, (CosmOrbiter Name)! The referral from (Orbiter Name) for (Product/Service) has been successfully won. Here’s to purposeful partnerships! 🔑`,
    },
    "Work in Progress": {
        Orbiter: `Work in Progress! 🔧 The referral you passed to (CosmOrbiter Name) for (Product/Service) is now actively in motion. Great teamwork happening behind the scenes! 💥`,
        CosmOrbiter: `Steady Progress! ⚙️ Thank you, (CosmOrbiter Name)! You’ve marked this referral from (Orbiter Name) as ‘Work in Progress.’ Keep the momentum going! 🔄`,
    },
    "Work Completed": {
        Orbiter: `Work Completed! ✅ The referral you passed to (CosmOrbiter Name) for (Product/Service) is now completed. You’re one step closer to closure and contribution rewards! 🌟`,
        CosmOrbiter: `Fantastic Finish! 🌈 Great job, (CosmOrbiter Name)! The work for the referral from (Orbiter Name) is complete. Another successful collaboration in our UJustBe Universe! 🌍`,
    },
    "Received Full & Final Payment": {
        Orbiter: `Payment Confirmed! 💰 You’ve released full payment to (CosmOrbiter Name) for (Product/Service). Contribution cycle is almost complete — reciprocation is on its way! 💫`,
        CosmOrbiter: `Payment Received! 🎯 Congratulations, (CosmOrbiter Name)! You’ve received full payment for (Product/Service). UJustBe will now process your agreed % invoice. Contribution Points coming soon! 🌟`,
    },
    "Received Part Payment & Transferred to UJustBe": {
        Orbiter: `Part Payment Released! 💸 Thank you for your payment to (CosmOrbiter Name) for (Product/Service). The agreed % has been successfully shared with UJustBe. 🌍`,
        CosmOrbiter: `Part Payment Acknowledged! 💸 You’ve received part payment for (Product/Service). UJustBe has your update and will share your agreed % invoice soon. Keep up the progress! 🚀`,
    },
    "Agreed % Transferred to UJustBe": {
        Orbiter: `Referral Journey Complete! 🎉 Your referral with (CosmOrbiter Name) for (Product/Service) is officially closed. The agreed % has been received by UJustBe, and your reciprocation points are credited! 🌟💎`,
        CosmOrbiter: `Closure Confirmed! 🌟 Cheers, (CosmOrbiter Name)! The referral from (Orbiter Name) is now closed, and UJustBe has received the agreed %. The Orbiter’s reciprocation will be shared soon. ✨`,
    },
    "Hold": {
        Orbiter: `Referral on Pause! ⏸️ Your referral for (Product/Service) with (CosmOrbiter Name) is currently on hold. Don’t worry — we’ll notify you once it’s active again. Stay tuned! 🔔`,
        CosmOrbiter: `Temporary Pause! 🕓 The referral from (Orbiter Name) for (Product/Service) is on hold for now. Await further updates before resuming action. Your patience keeps the process smooth! 🌼`,
    },
};

const statusOptions = [
    "Not Connected",
    "Called but Not Answered",
    "Discussion in Progress",
    "Deal Lost",
    "Deal Won",
    "Work in Progress",
    "Work Completed",
    "Received Full and Final Payment",
    "Received Part Payment & Transferred to UJustBe",
    "Agreed % Transferred to UJustBe",
    "Hold",
];

// WhatsApp sending
const sendWhatsAppTemplate = async (phone, name, message) => {
    if (!message || !phone) return;

    const formatted = String(phone).replace(/\D/g, ""); // clean phone

    const payload = {
        messaging_product: "whatsapp",
        to: formatted,
        type: "template",
        template: {
            name: "referral_module", // must match WhatsApp template name
            language: { code: "en" },
            components: [
                {
                    type: "body",
                    parameters: [
                        { type: "text", text: name },
                        { type: "text", text: message },
                    ],
                },
            ],
        },
    };

    const res = await fetch(
        "https://graph.facebook.com/v19.0/527476310441806/messages",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization:
                    "Bearer EAAHwbR1fvgsBOwUInBvR1SGmVLSZCpDZAkn9aZCDJYaT0h5cwyiLyIq7BnKmXAgNs0ZCC8C33UzhGWTlwhUarfbcVoBdkc1bhuxZBXvroCHiXNwZCZBVxXlZBdinVoVnTB7IC1OYS4lhNEQprXm5l0XZAICVYISvkfwTEju6kV4Aqzt4lPpN8D3FD7eIWXDhnA4SG6QZDZD", // move to env in real app
            },
            body: JSON.stringify(payload),
        }
    );

    const result = await res.json();
    console.log("WhatsApp API Response:", result);
};

const UserReferrals = () => {
    const [loading, setLoading] = useState(true);
    const [ntMeetCount, setNtMeetCount] = useState(0); // My referrals count
    const [monthlyMetCount, setMonthlyMetCount] = useState(0); // Passed referrals count
    const [activeTab, setActiveTab] = useState("my");
    const [allReferrals, setAllReferrals] = useState({
        my: [],
        passed: [],
    });

    const tabs = [
        { name: "My Referrals", key: "my" },
        { name: "Passed Referrals", key: "passed" },
    ];

    // Firestore realtime subscriptions (lists + counts)
    useEffect(() => {
        const storedUJB = localStorage.getItem("mmUJBCode");
        if (!storedUJB) {
            console.warn("UJB code not found in localStorage");
            setLoading(false);
            return;
        }

        setLoading(true);

        const referralsCol = collection(db, COLLECTIONS.referral);

        const myQuery = query(
            referralsCol,
            where("cosmoOrbiter.ujbCode", "==", storedUJB),
            orderBy("timestamp", "desc")
        );

        const passedQuery = query(
            referralsCol,
            where("orbiter.ujbCode", "==", storedUJB),
            orderBy("timestamp", "desc")
        );

        const unsubMy = onSnapshot(
            myQuery,
            (snapshot) => {
                const myReferrals = snapshot.docs.map((d) => ({
                    id: d.id,
                    ...d.data(),
                }));
                setAllReferrals((prev) => ({ ...prev, my: myReferrals }));
                setNtMeetCount(myReferrals.length);
                setLoading(false);
            },
            (error) => {
                console.error("Error fetching my referrals:", error);
                setLoading(false);
            }
        );

        const unsubPassed = onSnapshot(
            passedQuery,
            (snapshot) => {
                const passedReferrals = snapshot.docs.map((d) => ({
                    id: d.id,
                    ...d.data(),
                }));
                setAllReferrals((prev) => ({
                    ...prev,
                    passed: passedReferrals,
                }));
                setMonthlyMetCount(passedReferrals.length);
                setLoading(false);
            },
            (error) => {
                console.error("Error fetching passed referrals:", error);
                setLoading(false);
            }
        );

        return () => {
            unsubMy();
            unsubPassed();
        };
    }, []);

    // Handle deal status change (My Referrals)
   const handleStatusChange = async (referral, newStatus) => {
  try {
    const docRef = doc(db, COLLECTIONS.referral, referral.id);

    await updateDoc(docRef, {
      dealStatus: newStatus,
      "cosmoOrbiter.dealStatus": newStatus,
      statusLogs: arrayUnion({
        status: newStatus,
        updatedAt: Timestamp.now(),
      }),
      lastUpdated: Timestamp.now(),
    });

    const referralType = referral?.referralType; // "Self" | "Others"

    // ================= DIP =================
// ================= CP LOGIC (MY REFERRALS) =================
if (newStatus === "Discussion in Progress") {
  await addCp({
    user: referral.cosmoOrbiter, // ✅ ALWAYS COSMO ORBITER
    activityNo: "DIP_MY",
    activityName: "Referral Discussion in Progress",
    points: referral.referralType === "Others" ? 75 : 100,
    referralId: referral.id,
    purpose: "Referral moved to discussion stage",
  });
}

if (newStatus === "Agreed % Transferred to UJustBe") {
  // BASE CLOSURE CP
  await addCp({
    user: referral.cosmoOrbiter, // ✅ ALWAYS COSMO ORBITER
    activityNo: "CLOSE_MY",
    activityName: "Referral Closure Completed",
    points:
      referral.referralType === "Others"
        ? 125   // third party closure
        : 150,  // self closure
    referralId: referral.id,
    purpose: "Referral successfully closed",
  });
}


    // ================= CLOSURE =================
    if (newStatus === "Agreed % Transferred to UJustBe") {
      // SELF
      await addCp({
        user: referral.orbiter,
        activityNo: "CLOSE_SELF",
        activityName: "Referral Closure passed by Self",
        points: 150,
        referralId: referral.id,
        purpose: "Self referral closed",
      });

      // PROSPECT
      await addCp({
        user: referral.orbiter,
        activityNo: "CLOSE_PROSPECT",
        activityName: "Referral Closure passed by Prospect",
        points: 200,
        referralId: referral.id,
        purpose: "Prospect closed referral",
      });

      // THIRD PARTY
      if (referralType === "Others") {
        await addCp({
          user: referral.orbiter,
          activityNo: "CLOSE_THIRD",
          activityName: "Referral Closure passed for Third Party",
          points: 125,
          referralId: referral.id,
          purpose: "Third party closure",
        });
      }
    }

    // ================= WHATSAPP =================
    const templates = statusMessages[newStatus];
    if (templates) {
      await Promise.all([
        sendWhatsAppTemplate(
          referral.orbiter.phone,
          referral.orbiter.name,
          getDynamicMessage(templates.Orbiter, referral)
        ),
        sendWhatsAppTemplate(
          referral.cosmoOrbiter.phone,
          referral.cosmoOrbiter.name,
          getDynamicMessage(templates.CosmOrbiter, referral)
        ),
      ]);
    }
  } catch (err) {
    console.error(err);
    Swal.fire("Error", "Status update failed", "error");
  }
};


    // Accept referral (My Referrals)
    const handleAccept = async (ref) => {
        Swal.fire({
            title: "Accept Referral?",
            text: "Are you sure you want to accept this referral?",
            icon: "question",
            showCancelButton: true,
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d33",
            confirmButtonText: "Yes, Accept",
            cancelButtonText: "No",
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const docRef = doc(db, COLLECTIONS.referral, ref.id);

                    const newStatus = "Not Connected";

                    await updateDoc(docRef, {
                        dealStatus: newStatus,
                        "cosmoOrbiter.dealStatus": newStatus,
                        statusLogs: arrayUnion({
                            status: newStatus,
                            updatedAt: Timestamp.now(),
                        }),
                        lastUpdated: Timestamp.now(),
                    });

                    const templates = statusMessages[newStatus];
                    if (templates) {
                        await Promise.all([
                            sendWhatsAppTemplate(
                                ref.orbiter.phone,
                                ref.orbiter.name,
                                getDynamicMessage(templates.Orbiter, ref)
                            ),
                            sendWhatsAppTemplate(
                                ref.cosmoOrbiter.phone,
                                ref.cosmoOrbiter.name,
                                getDynamicMessage(templates.CosmOrbiter, ref)
                            ),
                        ]);
                    }

                    Swal.fire({
                        title: "Accepted!",
                        text: "Referral has been accepted successfully.",
                        icon: "success",
                        timer: 2000,
                        showConfirmButton: false,
                    });
                    // UI auto-updates via onSnapshot
                } catch (error) {
                    console.error("Error accepting referral:", error);
                    Swal.fire(
                        "Error",
                        "Failed to accept referral. Try again.",
                        "error"
                    );
                }
            }
        });
    };

    // Reject referral with reason
    const handleReject = async (ref) => {
        Swal.fire({
            title: "Reject Referral?",
            html: `
                <p>Please enter the reason for rejection:</p>
                <textarea id="rejectReason" class="swal2-textarea" placeholder="Reason here..."></textarea>
            `,
            showCancelButton: true,
            confirmButtonText: "Reject",
            cancelButtonText: "Cancel",
            preConfirm: () => {
                const reasonEl = document.getElementById("rejectReason");
                const reason = reasonEl ? reasonEl.value : "";
                if (!reason.trim()) {
                    Swal.showValidationMessage("Reason is required");
                    return false;
                }
                return reason;
            },
        }).then(async (result) => {
            if (result.isConfirmed) {
                const reason = result.value;

                try {
                    const docRef = doc(db, COLLECTIONS.referral, ref.id);

                    await updateDoc(docRef, {
                        dealStatus: "Rejected",
                        "cosmoOrbiter.dealStatus": "Rejected",
                        rejectReason: reason,
                        statusLogs: arrayUnion({
                            status: "Rejected",
                            reason: reason,
                            updatedAt: Timestamp.now(),
                        }),
                        lastUpdated: Timestamp.now(),
                    });

                    const orbiterMsg = `Your referral was rejected.\nReason: ${reason}`;
                    const cosmoMsg = `You have rejected a referral.\nReason: ${reason}`;

                    await Promise.all([
                        sendWhatsAppTemplate(
                            ref.orbiter.phone,
                            ref.orbiter.name,
                            orbiterMsg
                        ),
                        sendWhatsAppTemplate(
                            ref.cosmoOrbiter.phone,
                            ref.cosmoOrbiter.name,
                            cosmoMsg
                        ),
                    ]);

                    Swal.fire({
                        icon: "success",
                        title: "Referral Rejected",
                        text: "Reason saved & notifications sent.",
                    });
                } catch (error) {
                    console.error("Reject error:", error);
                    Swal.fire("Error", "Failed to reject referral.", "error");
                }
            }
        });
    };

    const handleTabClick = (tabKey) => {
        setActiveTab(tabKey);
    };

    const referrals = allReferrals[activeTab];

    return (
        <main className="pageContainer">
            <Headertop />

            <section className="dashBoardMain">
                <div className="sectionHeadings">
                    <h2>
                        {activeTab === "my"
                            ? `My Referrals (${ntMeetCount})`
                            : `Passed Referrals (${monthlyMetCount})`}
                    </h2>
                </div>

                {/* Tabs */}
                <div className="referralTabs">
                    {tabs.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => handleTabClick(tab.key)}
                            className={`tabButton ${
                                activeTab === tab.key ? "active" : ""
                            }`}
                        >
                            {tab.name}
                        </button>
                    ))}
                </div>

                <div className="container eventList">
                    {loading ? (
                        <div className="loader">
                            <span className="loader2"></span>
                        </div>
                    ) : referrals.length === 0 ? (
                        <p className="noDataText">No referrals found.</p>
                    ) : (
                        referrals.map((ref) => {
                            const status =
                                ref.dealStatus ||
                                (ref.cosmoOrbiter &&
                                    ref.cosmoOrbiter.dealStatus) ||
                                "Pending";

                            const isRejected =
                                status === "Rejected" || status === "Reject";
                            const isPending = status === "Pending";

                            return (
                                <div key={ref.id} className="referralBox">
                                    <div className="boxHeader">
                                        <div className="statuslabel">
                                            <span
                                                className={
                                                    status === "Pending"
                                                        ? "meetingLable-pending"
                                                        : status ===
                                                              "Deal Lost" ||
                                                          status ===
                                                              "Rejected" ||
                                                          status === "Reject"
                                                        ? "meetingLable-rejected"
                                                        : "meetingLable"
                                                }
                                            >
                                                {status}
                                            </span>
                                        </div>

                                        <div className="referralDetails">
                                            <abbr>
                                                {ref.referralId
                                                    ? ref.referralId
                                                    : null}
                                            </abbr>
                                            <abbr>
                                                Date:{" "}
                                                {ref.timestamp &&
                                                ref.timestamp.toDate
                                                    ? ref.timestamp
                                                          .toDate()
                                                          .toLocaleString()
                                                    : "N/A"}
                                            </abbr>
                                        </div>
                                    </div>

                                    <div className="cosmoCard-info">
                                        <p className="cosmoCard-category">
                                            {(ref.product &&
                                                ref.product.name) ||
                                                (ref.service &&
                                                    ref.service.name) ||
                                                "-"}
                                        </p>

                                        {ref.leadDescription && (
                                            <p className="leadDesc">
                                                {ref.leadDescription}
                                            </p>
                                        )}

                                        <h3
                                            className={`cosmoCard-owner ${
                                                activeTab === "my" &&
                                                isPending
                                                    ? "blur-info"
                                                    : ""
                                            }`}
                                        >
                                            {activeTab === "passed"
                                                ? (ref.cosmoOrbiter &&
                                                      (ref.cosmoOrbiter
                                                          .businessName ||
                                                          ref.cosmoOrbiter
                                                              .name)) || "-"
                                                : (ref.orbiter &&
                                                      (ref.orbiter
                                                          .businessName ||
                                                          ref.orbiter
                                                              .name)) || "-"}
                                        </h3>

                                        <div className="cosmoCard-contactDetails">
                                            {activeTab === "passed" ? (
                                                // Passed Referrals → always show all details
                                                <ul>
                                                    <li>
                                                        <HiOutlineMail />{" "}
                                                        {ref.cosmoOrbiter &&
                                                            ref.cosmoOrbiter
                                                                .email}
                                                    </li>
                                                    <li>
                                                        <IoIosCall />{" "}
                                                        {ref.cosmoOrbiter &&
                                                            ref.cosmoOrbiter
                                                                .phone}
                                                    </li>
                                                </ul>
                                            ) : (
                                                // My Referrals
                                                <>
                                                    {isRejected ? (
                                                        <p className="lockedNote">
                                                            Contact details
                                                            hidden (Referral
                                                            Rejected).
                                                        </p>
                                                    ) : (
                                                        <ul
                                                            className={
                                                                isPending
                                                                    ? "blur-info"
                                                                    : ""
                                                            }
                                                        >
                                                            <li>
                                                                <HiOutlineMail />{" "}
                                                                {ref.orbiter &&
                                                                    ref.orbiter
                                                                        .email}
                                                            </li>
                                                            <li>
                                                                <IoIosCall />{" "}
                                                                {ref.orbiter &&
                                                                    ref.orbiter
                                                                        .phone}
                                                            </li>
                                                        </ul>
                                                    )}
                                                </>
                                            )}
                                        </div>

                                        {ref.rejectReason && (
                                            <p className="rejectReason">
                                                <strong>Reject Reason:</strong>{" "}
                                                {ref.rejectReason}
                                            </p>
                                        )}

                                        {/* Deal status dropdown for My Referrals (accepted & not rejected & not pending) */}
                                        {activeTab === "my" &&
                                            !isPending &&
                                            !isRejected && (
                                                <div className="statusDropdown">
                                                    <label>
                                                        Deal Status:{" "}
                                                    </label>
                                                    <select
                                                        value={status}
                                                        onChange={(e) =>
                                                            handleStatusChange(
                                                                ref,
                                                                e.target.value
                                                            )
                                                        }
                                                    >
                                                        {statusOptions.map(
                                                            (opt) => (
                                                                <option
                                                                    key={opt}
                                                                    value={opt}
                                                                >
                                                                    {opt}
                                                                </option>
                                                            )
                                                        )}
                                                    </select>
                                                </div>
                                            )}
                                    </div>

                                    <div className="cosmoCard-actions">
                                        {activeTab === "my" ? (
                                            isRejected ? (
                                                <Link
                                                    href={`/ReferralsDetails/${ref.id}`}
                                                    className="viewDetails"
                                                >
                                                    View Details
                                                </Link>
                                            ) : !(
                                                  ref.cosmoOrbiter &&
                                                  ref.cosmoOrbiter.dealStatus
                                              ) || isPending ? (
                                                <>
                                                    <button
                                                        className="m-button-5"
                                                        onClick={() =>
                                                            handleAccept(ref)
                                                        }
                                                    >
                                                        Accept
                                                    </button>
                                                    <button
                                                        className="m-button-5 rejectBtn"
                                                        onClick={() =>
                                                            handleReject(ref)
                                                        }
                                                    >
                                                        Reject
                                                    </button>
                                                </>
                                            ) : (
                                                <Link
                                                    href={`/ReferralsDetails/${ref.id}`}
                                                    className="viewDetails"
                                                >
                                                    View Details
                                                </Link>
                                            )
                                        ) : (
                                            <Link
                                                href={`/ReferralsDetails/${ref.id}`}
                                                className="viewDetails"
                                            >
                                                View Details
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                <HeaderNav />
            </section>
        </main>
    );
};

export default UserReferrals;
