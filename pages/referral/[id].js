// pages/referral/[id].js

import { useRouter } from "next/router";
import { useState } from "react";

import "../../src/app/styles/referral-ui.scss";

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
  } = useReferralDetails(id);

  const payment = useReferralPayments({
    id,
    referralData,
    payments,
    setPayments,
    dealLogs,
  });

  const ujb = useUjbDistribution({
    referralId: id,
    referralData,
    payments,
    onPaymentsUpdate: setPayments,
    orbiter,
    cosmoOrbiter,
  });

  const adjustment = useReferralAdjustment(
    id,
    orbiter?.ujbCode || orbiter?.UJBCode
  );

  const defaultFollowupForm = {
    priority: "Medium",
    date: "",
    description: "",
    status: "Pending",
  };

  const [followupForm, setFollowupForm] = useState(defaultFollowupForm);
  const [isEditingFollowup, setIsEditingFollowup] = useState(false);
  const [editIndex, setEditIndex] = useState(null);

  const [showPaymentDrawer, setShowPaymentDrawer] = useState(false);

  const [payoutModal, setPayoutModal] = useState({
    open: false,
    recipient: "",
    slotKey: null,
    amount: 0,
    fromPaymentId: null,
    modeOfPayment: "",
    transactionRef: "",
    paymentDate: new Date().toISOString().split("T")[0],
  });

  const openPayoutModal = ({ recipient, slotKey, amount, fromPaymentId }) => {
    setPayoutModal({
      open: true,
      recipient: recipient || "",
      slotKey: slotKey || null,
      amount: Number(amount || 0),
      fromPaymentId: fromPaymentId || null,
      modeOfPayment: "",
      transactionRef: "",
      paymentDate: new Date().toISOString().split("T")[0],
    });
  };

  const closePayoutModal = () => {
    setPayoutModal((prev) => ({ ...prev, open: false }));
  };

  // UJB payout with adjustment logic
  const handleConfirmPayout = async () => {
    const {
      recipient,
      slotKey,
      amount,
      fromPaymentId,
      modeOfPayment,
      transactionRef,
      paymentDate,
    } = payoutModal;

    const numericAmount = Number(amount || 0);

    // validation (updated)
    if (!recipient || numericAmount <= 0) {
      alert("Invalid payout");
      return;
    }

    if (!modeOfPayment) {
      alert("Mode of payment required");
      return;
    }

    if (!transactionRef) {
      alert("Transaction / Reference ID is required");
      return;
    }

    if (!paymentDate || isNaN(Date.parse(paymentDate))) {
      alert("Please select a valid payment date");
      return;
    }

    const lastDeal = dealLogs?.[dealLogs.length - 1];
    const dealValue = lastDeal?.dealValue || null;

    // Apply onboarding adjustment ALWAYS for any payout
    const adj = await adjustment.applyAdjustmentBeforePayOrbiter({
      requestedAmount: numericAmount,
      dealValue,
    });

    const { cashToPay, deducted, newGlobalRemaining } = adj;

    // balance check based on actual cash being paid
    if (cashToPay > Number(ujb.ujbBalance || 0)) {
      alert("Insufficient UJB balance for this payout");
      return;
    }

    const extraMeta =
      deducted > 0
        ? {
          adjustment: {
            deducted,
            cashPaid: cashToPay,
            previousRemaining: newGlobalRemaining + deducted,
            newRemaining: newGlobalRemaining,
          },
        }
        : {};

    const result = await ujb.payFromSlot({
      recipient,
      amount: cashToPay,
      logicalAmount: numericAmount,
      fromPaymentId,
      modeOfPayment,
      transactionRef,
      paymentDate,
      extraMeta: {
        ...extraMeta,
        fromSlot: slotKey || null,
      },
    });

    if (result?.error) {
      alert(result.error);
      return;
    }

    closePayoutModal();
  };

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
        return (
          cosmoOrbiter?.mentorName ||
          cosmoOrbiter?.MentorName ||
          "Cosmo Mentor"
        );
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
            <h1>Referral #{id}</h1>
            <p>{referralData?.referralSource || "Referral"}</p>
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
              onUpdate={handleStatusUpdate}
              statusLogs={referralData.statusLogs || []}
            />
            <ServiceDetailsCard
              referralData={referralData}
              dealLogs={dealLogs}
              dealAlreadyCalculated={dealAlreadyCalculated}
              onSaveDealLog={handleSaveDealLog}
            />
            <ReferralInfoCard referralData={referralData} />
            
              <OrbiterDetailsCard orbiter={orbiter} referralData={referralData} />
              <CosmoOrbiterDetailsCard
                cosmoOrbiter={cosmoOrbiter}
                payments={payments}
              />

            

            <PaymentHistory
              payments={payments}
              mapName={mapName}
              paidToOrbiter={paidToOrbiter}
              paidToOrbiterMentor={paidToOrbiterMentor}
              paidToCosmoMentor={paidToCosmoMentor}
              onRequestPayout={openPayoutModal}
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

            <button
              className="openPanelBtn"
              onClick={() => setShowPaymentDrawer(true)}
            >
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
          onRequestPayout={openPayoutModal}
        />

        {/* UJB → SLOT PAYOUT MODAL */}
        {payoutModal.open && (
          <div className="ModalContainer">
            <div className="Modal">
              <h3>Payout to {mapName(payoutModal.recipient)}</h3>

              <p className="modalHint">
                UJB Balance: ₹{ujb.ujbBalance.toLocaleString("en-IN")}
              </p>
              <p className="modalHint">
                Slot Payout (logical): ₹
                {Number(payoutModal.amount || 0).toLocaleString("en-IN")}
              </p>

              <label>
                Mode of Payment
                <select
                  value={payoutModal.modeOfPayment}
                  onChange={(e) =>
                    setPayoutModal((p) => ({
                      ...p,
                      modeOfPayment: e.target.value,
                    }))
                  }
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
                  onChange={(e) =>
                    setPayoutModal((p) => ({
                      ...p,
                      transactionRef: e.target.value,
                    }))
                  }
                />
              </label>

              <label>
                Payment Date
                <input
                  type="date"
                  value={payoutModal.paymentDate}
                  onChange={(e) =>
                    setPayoutModal((p) => ({
                      ...p,
                      paymentDate: e.target.value,
                    }))
                  }
                />
              </label>

              <div className="modalActions">
                <button
                  onClick={handleConfirmPayout}
                  disabled={ujb.isSubmitting || adjustment.loading}
                >
                  {ujb.isSubmitting || adjustment.loading
                    ? "Processing..."
                    : "Confirm Payout"}
                </button>
                <button className="cancel" onClick={closePayoutModal}>
                  Cancel
                </button>
              </div>

              {adjustment.error && (
                <p className="errorText">
                  Adjustment error: {adjustment.error}
                </p>
              )}
              {ujb.error && (
                <p className="errorText">Payout error: {ujb.error}</p>
              )}
            </div>
          </div>
        )}

        {/* COSMO → UJB PAYMENT MODAL */}
        {payment.showAddPaymentForm && (
          <div className="ModalContainer">
            <div className="Modal">
              <h3>Add Payment (Cosmo → UJB)</h3>

              <p className="modalHint">
                Remaining Agreed: ₹
                {payment.agreedRemaining.toLocaleString("en-IN")}
              </p>

              <label>
                Amount
                <input
                  type="number"
                  min="0"
                  value={payment.newPayment.amountReceived}
                  onChange={(e) =>
                    payment.updateNewPayment("amountReceived", e.target.value)
                  }
                />
              </label>

              <label>
                Mode of Payment
                <select
                  value={payment.newPayment.modeOfPayment}
                  onChange={(e) =>
                    payment.updateNewPayment("modeOfPayment", e.target.value)
                  }
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
                  onChange={(e) =>
                    payment.updateNewPayment("transactionRef", e.target.value)
                  }
                />
              </label>

              <label>
                Payment Date
                <input
                  type="date"
                  value={payment.newPayment.paymentDate}
                  onChange={(e) =>
                    payment.updateNewPayment("paymentDate", e.target.value)
                  }
                />
              </label>

              <div className="modalActions">
                <button
                  onClick={payment.handleSavePayment}
                  disabled={payment.isSubmitting}
                >
                  {payment.isSubmitting ? "Saving..." : "Save"}
                </button>
                <button
                  className="cancel"
                  onClick={payment.closePaymentModal}
                  disabled={payment.isSubmitting}
                >
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
