'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { app } from '../../firebaseConfig';
import Headertop from '../../component/Header';
import HeaderNav from '../../component/HeaderNav';
import '../../src/app/styles/user.scss';
import { COLLECTIONS } from "/utility_collection";

const db = getFirestore(app);

const ReferralDetails = () => {
  const router = useRouter();
  const { id } = router.query;
  const [activeTab, setActiveTab] = useState("referral");
  const [referral, setReferral] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetchReferral = async () => {
      try {
        const docRef = doc(db,COLLECTIONS.referral, id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setReferral(docSnap.data());
        } else {
          console.warn('No referral found');
        }
      } catch (error) {
        console.error('Error fetching referral details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReferral();
  }, [id]);

  if (loading) {
    return (
      <div className="loader">
        <span className="loader2"></span>
      </div>
    );
  }

  if (!referral) {
    return <p className="noDataText">No referral found.</p>;
  }

  return (
<main className="pageContainer businessDetailsPage">
      <Headertop />

      <section className="p-meetingDetails">
    <div className="sectionHeadings">
          <h2>Referral Details</h2>

</div>
          {/* Tabs Navigation */}
      {/* Tabs */}
{/* Tabs */}
<div className="referralTabsWrapper">

  {/* Tab Buttons */}
  <div className="referralTabsHeader">
    <button
      className={`referralTabButton ${activeTab === "referral" ? "active" : ""}`}
      onClick={() => setActiveTab("referral")}
    >
      Referral Info
    </button>

    <button
      className={`referralTabButton ${activeTab === "orbiter" ? "active" : ""}`}
      onClick={() => setActiveTab("orbiter")}
    >
      Orbiter Details
    </button>

    <button
      className={`referralTabButton ${activeTab === "cosmo" ? "active" : ""}`}
      onClick={() => setActiveTab("cosmo")}
    >
      CosmoOrbiter Details
    </button>

    <button
      className={`referralTabButton ${activeTab === "product" ? "active" : ""}`}
      onClick={() => setActiveTab("product")}
    >
      Product / Service
    </button>
  </div>

  {/* Tab Content */}
  <div className="referralTabsContent">

    {/* Referral Info */}
    {activeTab === "referral" && (
      <div className="referralCard">
        <h3 className="referralCardTitle">Referral Information</h3>
        <div className="referralCardBody">
          <p><span>Referral ID:</span> {referral.referralId || "N/A"}</p>
          <p><span>Deal Status:</span> { referral.cosmoOrbiter?.dealStatus || "N/A"}</p>
          <p><span>Type:</span> {referral.referralType || "N/A"}</p>
          <p><span>Source:</span> {referral.referralSource || "N/A"}</p>
          <p><span>Last Updated:</span> {referral.lastUpdated?.toDate
            ? referral.lastUpdated.toDate().toLocaleString()
            : "N/A"}
          </p>
        </div>
      </div>
    )}

    {/* Orbiter Details */}
    {activeTab === "orbiter" && (
      <div className="referralCard">
        <h3 className="referralCardTitle">Orbiter Details</h3>
        <div className="referralCardBody">
          <p><span>Name:</span> {referral.orbiter?.name || "N/A"}</p>
          <p><span>Email:</span> {referral.orbiter?.email || "N/A"}</p>
          <p><span>Phone:</span> {referral.orbiter?.phone || "N/A"}</p>
          <p><span>Mentor:</span> {referral.orbiter?.mentorName || "N/A"}</p>
          <p><span>Mentor Phone:</span> {referral.orbiter?.mentorPhone || "N/A"}</p>
          <p><span>UJB Code:</span> {referral.orbiter?.ujbCode || "N/A"}</p>
        </div>
      </div>
    )}

    {/* CosmoOrbiter Details */}
    {activeTab === "cosmo" && (
      <div className="referralCard">
        <h3 className="referralCardTitle">CosmoOrbiter Details</h3>
        <div className="referralCardBody">
          <p><span>Name:</span> {referral.cosmoOrbiter?.name || "N/A"}</p>
          <p><span>Email:</span> {referral.cosmoOrbiter?.email || "N/A"}</p>
          <p><span>Phone:</span> {referral.cosmoOrbiter?.phone || "N/A"}</p>
          <p><span>Mentor:</span> {referral.cosmoOrbiter?.mentorName || "N/A"}</p>
          <p><span>Mentor Phone:</span> {referral.cosmoOrbiter?.mentorPhone || "N/A"}</p>
        </div>
      </div>
    )}

    {/* Product / Service Details */}
    {activeTab === "product" && (
      <div className="referralCard">
        <h3 className="referralCardTitle">Product / Service</h3>
        <div className="referralCardBody">
          <p><span>Name:</span> {referral.product?.name || referral.service?.name || "N/A"}</p>
          <p><span>Description:</span> {referral.product?.description || referral.service?.description || "N/A"}</p>
          <p><span>Percentage:</span> {referral.product?.percentage || "N/A"}</p>

          {referral.product?.imageURL && (
            <div className="referralImageBox">
              <img
                src={referral.product.imageURL}
                alt="Product"
              />
            </div>
          )}
        </div>
      </div>
    )}

  </div>
</div>



        <HeaderNav />
      </section>
    </main>
  );
};

export default ReferralDetails;
