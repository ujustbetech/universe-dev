// pages/referral/[id].js
import { useRouter } from "next/router";
import { useState } from "react";

import useReferralDetails from "../../src/hooks/useReferralDetails";
import useReferralPayments from "../../src/hooks/useReferralPayments";
import { useUjbDistribution } from "../../src/hooks/useUjbDistribution";
import { useReferralAdjustment } from "../../src/hooks/useReferralAdjustment";

import StatusCard from "../../component/referral/StatusCard";
import DealValueCard from "../../component/referral/DealValueCard";
import PaymentSummary from "../../component/referral/PaymentSummary";
import PaymentHistory from "../../component/referral/PaymentHistory";
import FollowupList from "../../component/referral/FollowupList";
import FollowupForm from "../../component/referral/FollowupForm";

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

  const orbiterUjbCode = referralData?.orbiter?.UJBCode || null;
  const adjustment = useReferralAdjustment(id, orbiterUjbCode);

  const defaultFollowupForm = {
    priority: "Medium",
    date: "",
    description: "",
    status: "Pending",
  };

  const [followupForm, setFollowupForm] = useState(defaultFollowupForm);
  const [isEditingFollowup, setIsEditingFollowup] = useState(false);
  const [editIndex, setEditIndex] = useState(null);

  if (!router.isReady || loading || !referralData) {
    return <p style={{ padding: 20 }}>Loading referral...</p>;
  }

  const mapName = (key) => {
    switch (key) {
      case "Orbiter":
        return orbiter?.name || "Orbiter";
      case "OrbiterMentor":
        return orbiter?.mentorName || "Orbiter Mentor";
      case "CosmoOrbiter":
        return cosmoOrbiter?.name || "Cosmo Orbiter";
      case "CosmoMentor":
        return cosmoOrbiter?.mentorName || "Cosmo Mentor";
      case "UJustBe":
        return "UJustBe";
      default:
        return key || "";
    }
  };

  const paidToOrbiter = Number(referralData?.paidToOrbiter || 0);
  const paidToOrbiterMentor = Number(
    referralData?.paidToOrbiterMentor || 0
  );
  const paidToCosmoMentor = Number(
    referralData?.paidToCosmoMentor || 0
  );

  // ORBITER PAYOUT WITH ADJUSTMENT (slot fully settled, less cash paid)
  const handleOrbiterPayout = async ({ amount, fromPaymentId }) => {
    const deal = dealLogs?.[dealLogs.length - 1];
    const dealValue = deal?.dealValue || null;

    // 1) Apply global adjustment
    const adj = await adjustment.applyAdjustmentBeforePayOrbiter({
      requestedAmount: amount,
      dealValue,
    });

    const { cashToPay, deducted } = adj;

    if (cashToPay > referralData.ujbBalance) {
      return { error: "Insufficient UJB balance after adjustment." };
    }

    // 2) Pay only cashToPay, but mark logical share as full `amount`
    return await ujb.payFromSlot({
      recipient: "Orbiter",
      amount: cashToPay,
      logicalAmount: amount, // slot considered fully settled
      fromPaymentId,
      extraMeta: {
        adjustment: {
          requestedAmount: amount,
          deducted,
          cashPaid: cashToPay,
        },
      },
    });
  };

  return (
    <div className="ReferralPage">
      {/* STATUS */}
      <StatusCard
        formState={formState}
        setFormState={setFormState}
        onUpdate={(status) => {
          setFormState((prev) => ({ ...prev, dealStatus: status }));
          handleStatusUpdate(status);
        }}
        statusLogs={referralData.statusLogs || []}
      />

      {/* DEAL VALUE */}
      <DealValueCard
        formState={formState}
        setFormState={setFormState}
        referralData={referralData}
        dealAlreadyCalculated={dealAlreadyCalculated}
        onSave={handleSaveDealLog}
      />

      {/* SUMMARY */}
      {dealEverWon && (
        <PaymentSummary
          agreedAmount={payment.agreedAmount}
          cosmoPaid={payment.cosmoPaid}
          agreedRemaining={payment.agreedRemaining}
          ujbBalance={referralData.ujbBalance || 0}
          paidTo={{
            orbiter: paidToOrbiter,
            orbiterMentor: paidToOrbiterMentor,
            cosmoMentor: paidToCosmoMentor,
          }}
          referralData={referralData}
          onAddPayment={payment.openPaymentModal}
        />
      )}

      {/* HISTORY & SLOT PAYOUTS */}
      <PaymentHistory
        payments={payments}
        mapName={mapName}
        paidToOrbiter={paidToOrbiter}
        paidToOrbiterMentor={paidToOrbiterMentor}
        paidToCosmoMentor={paidToCosmoMentor}
        ujb={{
          ...ujb,
          // Override Orbiter payouts to inject adjustment flow
          payFromSlot: async ({
            recipient,
            amount,
            fromPaymentId,
            ...rest
          }) => {
            if (recipient === "Orbiter") {
              return await handleOrbiterPayout({
                amount,
                fromPaymentId,
              });
            }
            return await ujb.payFromSlot({
              recipient,
              amount,
              fromPaymentId,
              ...rest,
            });
          },
        }}
      />

      {/* FOLLOWUPS */}
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
          setIsEditingFollowup(false);
          setEditIndex(null);
        }}
        onCancel={() => {
          setFollowupForm(defaultFollowupForm);
          setIsEditingFollowup(false);
          setEditIndex(null);
        }}
      />

      {/* COSMO PAYMENT MODAL */}
      {payment.showAddPaymentForm && (
        <div className="ModalContainer">
          <div className="Modal">
            <h3>Add Payment (Cosmo → UJustBe)</h3>

            <label>
              Amount
              <input
                type="number"
                value={payment.newPayment.amountReceived}
                onChange={(e) =>
                  payment.updateNewPayment(
                    "amountReceived",
                    e.target.value
                  )
                }
              />
            </label>

            <label>
              Mode of Payment
              <select
                value={payment.newPayment.modeOfPayment}
                onChange={(e) =>
                  payment.updateNewPayment(
                    "modeOfPayment",
                    e.target.value
                  )
                }
              >
                <option value="">--Select--</option>
                <option value="GPay">GPay</option>
                <option value="Razorpay">Razorpay</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cash">Cash</option>
                <option value="Other">Other</option>
              </select>
            </label>

            <label>
              Transaction Ref
              <input
                value={payment.newPayment.transactionRef}
                onChange={(e) =>
                  payment.updateNewPayment(
                    "transactionRef",
                    e.target.value
                  )
                }
              />
            </label>

            <label>
              Payment Date
              <input
                type="date"
                value={payment.newPayment.paymentDate}
                onChange={(e) =>
                  payment.updateNewPayment(
                    "paymentDate",
                    e.target.value
                  )
                }
              />
            </label>

            <label>
              Comment
              <textarea
                value={payment.newPayment.comment}
                onChange={(e) =>
                  payment.updateNewPayment(
                    "comment",
                    e.target.value
                  )
                }
              />
            </label>

            <button
              disabled={payment.isSubmitting}
              onClick={payment.handleSavePayment}
            >
              {payment.isSubmitting ? "Saving..." : "Save Payment"}
            </button>

            <button className="cancel" onClick={payment.closePaymentModal}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
