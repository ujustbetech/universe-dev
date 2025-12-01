import React, { useState } from "react";
import { useRouter } from "next/router";
import Layouts from "../../component/Layouts";

// Hooks
import { useReferralData } from "../../hooks/referral/useReferralData";
import { useDealCalculation } from "../../hooks/referral/useDealCalculation";
import { usePaymentFlow } from "../../hooks/referral/usePaymentFlow";
import { useDistribution } from "../../hooks/referral/useDistribution";

// Components
import PaymentSummary from "../../components/referral/PaymentSummary";
import PaymentSheet from "../../components/referral/PaymentSheet";
import ReferralHeader from "../../components/referral/ReferralHeader";
import ReferralStatusCard from "../../components/referral/ReferralStatusCard";
import ProfileTabs from "../../components/referral/ProfileTabs";
import ServiceProductCard from "../../components/referral/ServiceProductCard";
import DealModal from "../../components/referral/DealModal";
import DealHistory from "../../components/referral/DealHistory";
import FollowUpSection from "../../components/referral/FollowUpSection";

// Styles
import "../../src/app/styles/main.scss";
import "../../src/app/styles/user.scss";

export default function ReferralDetailsPage() {
  const router = useRouter();
  const { id } = router.query;

  // Load referral + users
  const {
    referral,
    loading,
    orbiter,
    cosmoOrbiter,
    payments,
    setPayments,
    dealLogs,
    followups,
  } = useReferralData(id);

  // Deal calculation
  const dealCalc = useDealCalculation(referral, dealLogs);

  // Cosmo → UJB payment flow
  const paymentFlow = usePaymentFlow({
    referral,
    payments,
    setPayments,
    dealCalc,
  });

  // UJB → Role payout logic
  const distribution = useDistribution({
    referralData: referral,
    payments,
    setPayments,
    dealCalc,
    orbiter,
    cosmoOrbiter,
  });

  const [activeTab, setActiveTab] = useState("Referral Info");

  if (loading || !referral) return <p>Loading...</p>;

  return (
    <Layouts>
      {/* ---------------------- */}
      {/* REFERRAL HEADER        */}
      {/* ---------------------- */}
      <ReferralHeader referral={referral} />

      {/* ---------------------- */}
      {/* STATUS CARD            */}
      {/* ---------------------- */}
      <ReferralStatusCard
        referral={referral}
        referralId={id}
        orbiter={orbiter}
        cosmoOrbiter={cosmoOrbiter}
      />

      {/* ---------------------- */}
      {/* TABS                   */}
      {/* ---------------------- */}
      <ProfileTabs activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* ---------------------- */}
      {/* ACTIVE TAB CONTENT     */}
      {/* ---------------------- */}

      {activeTab === "Referral Info" && (
        <ServiceProductCard referral={referral} />
      )}

      {activeTab === "Orbiter" && (
        <div className="profile-wrapper">
          <h3>Orbiter</h3>
          <p>Name: {orbiter?.name}</p>
          <p>Phone: {orbiter?.phone}</p>
          <p>Mentor: {orbiter?.mentorName}</p>
        </div>
      )}

      {activeTab === "CosmoOrbiter" && (
        <div className="profile-wrapper">
          <h3>Cosmo Orbiter</h3>
          <p>Name: {cosmoOrbiter?.name}</p>
          <p>Phone: {cosmoOrbiter?.phone}</p>
          <p>Mentor: {cosmoOrbiter?.mentorName}</p>
        </div>
      )}

      {activeTab === "Service/Product" && (
        <>
          <ServiceProductCard referral={referral} />
        </>
      )}

      {activeTab === "Follow Up" && (
        <FollowUpSection
          referralId={id}
          followups={followups}
        />
      )}

      {activeTab === "Payment History" && (
        <>
          {/* ---------------------- */}
          {/* DEAL MODAL            */}
          {/* ---------------------- */}
          <DealModal dealCalc={dealCalc} referralId={id} dealLogs={dealLogs} />

          {/* ---------------------- */}
          {/* SUMMARY BAR           */}
          {/* ---------------------- */}
          <PaymentSummary
            agreedAmount={dealCalc.getAgreedAmount()}
            totalCosmoPaid={distribution.totalCosmoPaid}
            progressPct={
              dealCalc.getAgreedAmount()
                ? Math.round(
                    (distribution.totalCosmoPaid /
                      dealCalc.getAgreedAmount()) *
                      100
                  )
                : 0
            }
            earnedShares={distribution.earnedShares}
            remainingShares={distribution.remainingShares}
            currentUjbBalance={distribution.currentUjbBalance}
          />

          {/* ---------------------- */}
          {/* PAYMENT SHEET         */}
          {/* ---------------------- */}
          <PaymentSheet
            payments={payments}
            paymentFlow={paymentFlow}
            distribution={distribution}
          />

          {/* ---------------------- */}
          {/* DEAL HISTORY          */}
          {/* ---------------------- */}
          <DealHistory dealLogs={dealLogs} />
        </>
      )}
    </Layouts>
  );
}
