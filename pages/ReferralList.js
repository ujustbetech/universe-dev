'use client';

import React, { useEffect, useState } from "react";
import {
    getFirestore,
    collection,
    getDocs,
    query,
    where,
    orderBy,
    doc,
    updateDoc,
    Timestamp,
    arrayUnion,
} from "firebase/firestore";
import { app } from "../firebaseConfig";
import Link from 'next/link';
import HeaderNav from "../component/HeaderNav";
import Headertop from "../component/Header";
import { COLLECTIONS } from "/utility_collection";
import "../src/app/styles/user.scss";
import { HiOutlineMail } from "react-icons/hi";
import { IoIosCall } from "react-icons/io";


const db = getFirestore(app);
// Function to get dynamic message
const getDynamicMessage = (template, referral) => {
    if (!template) return "";

    const serviceOrProduct = referral.product?.name || referral.service?.name || "-";

    return template
        .replace(/\(CosmOrbiter Name\)/g, referral.cosmoOrbiter.name)
        .replace(/\(Orbiter Name\)/g, referral.orbiter.name)
        .replace(/\(Product\/Service\)/g, serviceOrProduct);
};

// Example usage:


// ✅ Predefined status messages
const statusMessages = {
    "Not Connected": {
        Orbiter: `Referral Accepted! 🤝 Good news! (CosmOrbiter Name) has accepted your referral for (Product/Service). You may reach out directly if the matter is urgent. 🌟`,
        CosmOrbiter: `Let’s Connect! 📲 You’ve accepted a referral from (Orbiter Name) for (Product/Service). Time to reach out and explore possibilities within the next 24 hours!`,
    },
    "Called but Not Answered": {
        Orbiter: `Hello knock knock! 📞 Our CosmOrbiter (Name) tried connecting with you for the referral you passed. Please reconnect so the opportunity doesn’t go cold. 🔄`,
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

const UserReferrals = () => {
    // const [referrals, setReferrals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("my");
    const [allReferrals, setAllReferrals] = useState({
        my: [],
        passed: [],
    });


    // Tabs
    const tabs = [
        { name: "My Referrals", key: "my" },
        { name: "Passed Referrals", key: "passed" },
    ];




useEffect(() => {
    const fetchReferrals = async () => {
        try {
            setLoading(true);

            const storedUJB = localStorage.getItem("mmUJBCode");
            if (!storedUJB) {
                console.warn("UJB code not found in localStorage");
                setLoading(false);
                return;
            }

            const referralsCol = collection(db, COLLECTIONS.referral);

            // My Referrals (cosmoOrbiter.ujbCode)
            const myQuery = query(
                referralsCol,
                where("cosmoOrbiter.ujbCode", "==", storedUJB),
                orderBy("timestamp", "desc")
            );
            const mySnapshot = await getDocs(myQuery);
            const myReferrals = mySnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));

            // Passed Referrals (orbiter.ujbCode)
            const passedQuery = query(
                referralsCol,
                where("orbiter.ujbCode", "==", storedUJB),
                orderBy("timestamp", "desc")
            );
            const passedSnapshot = await getDocs(passedQuery);
            const passedReferrals = passedSnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));

            setAllReferrals({ my: myReferrals, passed: passedReferrals });
        } catch (error) {
            console.error("Error fetching referrals:", error);
        } finally {
            setLoading(false);
        }
    };

    fetchReferrals();
}, []);

    // ✅ WhatsApp sending
    const sendWhatsAppTemplate = async (phone, name, message) => {
        if (!message) return;
        const formatted = String(phone || "").replace(/\s+/g, "");
        const payload = {
            messaging_product: "whatsapp",
            to: formatted,
            type: "template",
            template: {
                name: "referral_module",
                language: { code: "en" },
                components: [
                    { type: "body", parameters: [{ type: "text", text: name }, { type: "text", text: message }] },
                ],
            },
        };

        await fetch("https://graph.facebook.com/v19.0/527476310441806/messages", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer",
            },
            body: JSON.stringify(payload),
        });
    };

    // ✅ Handle status change
    const handleStatusChange = async (referralId, newStatus) => {
        try {
            const ref = referrals.find((r) => r.id === referralId);
            if (!ref) return;

            const docRef = doc(db, COLLECTIONS.referral, referralId);
            const statusLog = { status: newStatus, updatedAt: Timestamp.now() };

            await updateDoc(docRef, {
                dealStatus: newStatus,
                statusLogs: arrayUnion(statusLog),
                lastUpdated: Timestamp.now(),
            });

            setReferrals((prev) =>
                prev.map((r) => (r.id === referralId ? { ...r, dealStatus: newStatus } : r))
            );

            // Send messages dynamically
            const serviceOrProduct = ref.product?.name || ref.service?.name || "-";


            await Promise.all([
                sendWhatsAppTemplate(ref.orbiter.phone, ref.orbiter.name, getDynamicMessage(statusMessages[newStatus].Orbiter, ref)),
                sendWhatsAppTemplate(ref.cosmoOrbiter.phone, ref.cosmoOrbiter.name, getDynamicMessage(statusMessages[newStatus].CosmOrbiter, ref)),
            ]);

        } catch (error) {
            console.error("Error updating deal status:", error);
            alert("Failed to update deal status.");
        }
    };

    const statusOptions = [
        "Not Connected",
        "Called but Not Answered",
        "Discussion in Progress",
        "Deal Lost",
        "Deal Won",
        "Work in Progress",
        "Work Completed",
        "Received Full & Final Payment",
        "Received Part Payment & Transferred to UJustBe",
        "Agreed % Transferred to UJustBe",
        "Hold",
    ];

    // ✅ Handle tab change
    const handleTabClick = (tabKey) => {
        setActiveTab(tabKey);
    };

    // Referrals for the active tab
    const referrals = allReferrals[activeTab];


    return (
        <main className="pageContainer">
            <Headertop />

            <section className="dashBoardMain">
                <div className="sectionHeadings">
                    <h2>{activeTab === "my" ? "My Referrals" : "Passed Referrals"}</h2>
                </div>


                {/* Tabs */}
                <div className="referralTabs">
                    {tabs.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => handleTabClick(tab.key)}
                            className={`tabButton ${activeTab === tab.key ? "active" : ""}`}
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
                        referrals.map((ref) => (
                            <div key={ref.id} className="referralBox">
                                <div className="boxHeader">
                                    <div>{ref.referralId ? ref.referralId : null}
                                        Date:{" "}
                                        {ref.timestamp?.toDate
                                            ? ref.timestamp.toDate().toLocaleString()
                                            : "N/A"}
                                    </div>
                                    <div> <span class="meetingLable">  {ref.cosmoOrbiter?.dealStatus || "-"}</span></div>

                                </div>
                                <div className="cosmoCard-info">
                                    <p className="cosmoCard-category">
                                        {ref.product?.name || ref.service?.name || "-"}
                                    </p>
                                    <h3 className="cosmoCard-owner">{ref.orbiter?.name}</h3>

                                    {/* ✅ Hide or blur contact info if Deal Lost */}
                                    { ref.cosmoOrbiter?.dealStatus === "Deal Lost" ? (
                                        <p className="text-gray-400 italic">
                                            Contact details hidden (Deal Lost)
                                        </p>
                                    ) : (
                                        <div className="cosmoCard-location">
                                            <p>
                                                <HiOutlineMail /> {ref.orbiter?.email} | <IoIosCall /> {ref.orbiter?.phone}
                                            </p>
                                        </div>
                                    )}

                                  <div className="cosmoCard-actions">
  <Link href={`/ReferralsDetails/${ref.id}`} className="viewButton">
    View Details
  </Link>
</div>


                                </div>
                            </div>

                        ))
                    )}
                </div>


                <HeaderNav />
            </section>
        </main >
    );
};

export default UserReferrals;
