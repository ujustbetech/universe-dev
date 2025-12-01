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

  // Followup state
  const defaultFollowupForm = {
    priority: "Medium",
    date: "",
    description: "",
    status: "Pending",
  };
  const [followupForm, setFollowupForm] = useState(defaultFollowupForm);
  const [isEditingFollowup, setIsEditingFollowup] = useState(false);
  const [editIndex, setEditIndex] = useState(null);

  // UJB payout modal state
  const [payoutModal, setPayoutModal] = useState({
    open: false,
    recipient: "",
    amount: 0,
    fromPaymentId: null,
    modeOfPayment: "",
    transactionRef: "",
    paymentDate: new Date().toISOString().split("T")[0],
  });

  const openPayoutModal = ({ recipient, amount, fromPaymentId }) => {
    setPayoutModal({
      open: true,
      recipient,
      amount,
      fromPaymentId,
      modeOfPayment: "",
      transactionRef: "",
      paymentDate: new Date().toISOString().split("T")[0],
    });
  };

  const closePayoutModal = () => {
    setPayoutModal((prev) => ({ ...prev, open: false }));
  };

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

  // ORBITER payout with adjustment: slot is fully settled (logical), cash reduced
  const handleConfirmPayout = async () => {
    const {
      recipient,
      amount,
      fromPaymentId,
      modeOfPayment,
      transactionRef,
      paymentDate,
    } = payoutModal;

    if (!recipient || amount <= 0) {
      alert("Invalid payout details");
      return;
    }

    if (!modeOfPayment) {
      alert("Please select mode of payment");
      return;
    }

    if (!transactionRef) {
      alert("Please enter transaction/reference ID");
      return;
    }

    if (!paymentDate) {
      alert("Select payment date");
      return;
    }

    if (recipient === "Orbiter") {
      const deal = dealLogs?.[dealLogs.length - 1];
      const dealValue = deal?.dealValue || null;

      const adj = await adjustment.applyAdjustmentBeforePayOrbiter({
        requestedAmount: amount,
        dealValue,
      });

      const { cashToPay, deducted } = adj;

      if (cashToPay > ujb.ujbBalance) {
        alert("Insufficient UJB balance after adjustment.");
        return;
      }

      const res = await ujb.payFromSlot({
        recipient: "Orbiter",
        amount: cashToPay,
        logicalAmount: amount, // full slot settled
        fromPaymentId,
        modeOfPayment,
        transactionRef,
        paymentDate,
        extraMeta: {
          adjustment: {
            requestedAmount: amount,
            deducted,
            cashPaid: cashToPay,
          },
        },
      });

      if (res?.error) {
        alert(res.error);
        return;
      }
    } else {
      // Orbiter Mentor / Cosmo Mentor (no adjustment)
      if (amount > ujb.ujbBalance) {
        alert("Insufficient UJB balance.");
        return;
      }

      const res = await ujb.payFromSlot({
        recipient,
        amount,
        fromPaymentId,
        modeOfPayment,
        transactionRef,
        paymentDate,
      });

      if (res?.error) {
        alert(res.error);
        return;
      }
    }

    closePayoutModal();
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
          ujbBalance={ujb.ujbBalance}
          paidTo={{
            orbiter: paidToOrbiter,
            orbiterMentor: paidToOrbiterMentor,
            cosmoMentor: paidToCosmoMentor,
          }}
          referralData={referralData}
          onAddPayment={payment.openPaymentModal}
        />
      )}

      {/* PAYMENT HISTORY + SLOT PAYOUT REQUESTS */}
      <PaymentHistory
        payments={payments}
        mapName={mapName}
        paidToOrbiter={paidToOrbiter}
        paidToOrbiterMentor={paidToOrbiterMentor}
        paidToCosmoMentor={paidToCosmoMentor}
        onRequestPayout={openPayoutModal}
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

      {/* COSMO → UJB PAYMENT MODAL */}
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

      {/* UJB → ORBITER / MENTORS PAYOUT MODAL */}
      {payoutModal.open && (
        <div className="ModalContainer">
          <div className="Modal">
            <h3>
              UJB Payout to {mapName(payoutModal.recipient)}
            </h3>

            <p>
              <strong>Auto Amount:</strong> ₹{payoutModal.amount}
            </p>
            <p>
              <strong>UJB Balance:</strong> ₹{ujb.ujbBalance}
            </p>

            <label>
              Mode of Payment
              <select
                value={payoutModal.modeOfPayment}
                onChange={(e) =>
                  setPayoutModal((prev) => ({
                    ...prev,
                    modeOfPayment: e.target.value,
                  }))
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
              Transaction Ref / ID
              <input
                value={payoutModal.transactionRef}
                onChange={(e) =>
                  setPayoutModal((prev) => ({
                    ...prev,
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
                  setPayoutModal((prev) => ({
                    ...prev,
                    paymentDate: e.target.value,
                  }))
                }
              />
            </label>

            <div className="modalActions">
              <button onClick={handleConfirmPayout}>
                Confirm Payout
              </button>
              <button className="cancel" onClick={closePayoutModal}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
