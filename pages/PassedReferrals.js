'use client';

import React, { useEffect, useState } from "react";
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";
import { app } from "../firebaseConfig";
import Headertop from "../component/Header";
import HeaderNav from "../component/HeaderNav";
import Link from 'next/link';
import "../src/app/styles/user.scss";
import { COLLECTIONS } from "/utility_collection";

const db = getFirestore(app);

const OrbiterReferralView = () => {
    const [referrals, setReferrals] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReferrals = async () => {
            try {
                const orbiterPhone = localStorage.getItem("mmOrbiter");
                if (!orbiterPhone) {
                    console.warn("No Orbiter phone found in localStorage");
                    setLoading(false);
                    return;
                }

                // ✅ Fetch referrals for logged-in orbiter
                const q = query(collection(db, COLLECTIONS.referral), where("orbiter.phone", "==", orbiterPhone));
                const snapshot = await getDocs(q);

                const data = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                }));

                // Sort by timestamp (newest first)
                const sortedData = data.sort((a, b) => {
                    const aTime = a.timestamp?.seconds ? a.timestamp.seconds * 1000 : new Date(a.timestamp).getTime();
                    const bTime = b.timestamp?.seconds ? b.timestamp.seconds * 1000 : new Date(b.timestamp).getTime();
                    return bTime - aTime;
                });

                setReferrals(sortedData);
            } catch (error) {
                console.error("Error fetching referrals:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchReferrals();
    }, []);

    return (
        <main className="pageContainer">
            <Headertop />

            <section className="dashBoardMain">
                <div className="sectionHeadings">
                    <h2>My Passed Referrals</h2>
                </div>
                <div className="referralTabs">
                    <Link href="/ReferralList" >
                        My Referral

                    </Link>
                    <Link href="/PassedReferrals" className="active">
                        Passed Referrals
                    </Link>

                </div>
                <div className="container eventList">
                    {loading ? (
                        <div className="loader">
                            <span className="loader2"></span>
                        </div>
                    ) : referrals.length === 0 ? (
                        <p className="noDataText">No referrals found.</p>
                    ) : (
                        referrals.map((ref, index) => (
                            <div key={index} className="cosmoCard">
                                <div className="cosmoCard-header">
                                    <div className="cosmoCard-info">
                                        <p className="cosmoCard-category">
                                            {ref.product?.name || ref.service?.name || "-"}
                                        </p>

                                        <h3 className="cosmoCard-owner">{ref.cosmoOrbiter?.name}</h3>

                                        <div className="cosmoCard-location">
                                            <p>
                                                📧 {ref.cosmoOrbiter?.email || "-"} | 📞 {ref.cosmoOrbiter?.phone || "-"}
                                            </p>
                                        </div>

                                        <p>
                                            <strong>Date:</strong>{" "}
                                            {ref.timestamp?.seconds
                                                ? new Date(ref.timestamp.seconds * 1000).toLocaleString()
                                                : ref.timestamp
                                                    ? new Date(ref.timestamp).toLocaleString()
                                                    : "-"}
                                        </p>

                                        <p>
                                            <strong>Status:</strong>{" "}
                                            <span className="statusTag">
                                                {ref.dealStatus || "Pending"}
                                            </span>
                                        </p>

                                        {ref.dealLogs && ref.dealLogs.length > 0 && (
                                            <div className="deal-logs">
                                                <h4>Deal Logs</h4>
                                                <table>
                                                    <thead>
                                                        <tr>
                                                            <th>Date</th>
                                                            <th>Deal Value</th>
                                                            <th>Agreed %</th>
                                                            <th>UJustBe Share</th>
                                                            <th>Orbiter Share</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {ref.dealLogs.map((log, i) => (
                                                            <tr key={i}>
                                                                <td>{new Date(log.timestamp).toLocaleDateString()}</td>
                                                                <td>{log.dealValue}</td>
                                                                <td>{log.percentage}%</td>
                                                                <td>{log.ujustbeShare}</td>
                                                                <td>{log.orbiterShare}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <HeaderNav />
            </section>
        </main>
    );
};

export default OrbiterReferralView;
