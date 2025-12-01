// components/referral/PaymentHistory.js
import React, { useState } from "react";
import SlotPayoutRow from "./SlotPayoutRow";

export default function PaymentHistory({
  payments = [],
  mapName,
  paidToOrbiter = 0,
  paidToOrbiterMentor = 0,
  paidToCosmoMentor = 0,
  onRequestPayout, // NEW: callback to open UJB payout modal
}) {
  const [expanded, setExpanded] = useState(null);

  const toggleExpand = (pid) => {
    setExpanded((prev) => (prev === pid ? null : pid));
  };

  const r2 = (n) => Math.round(n * 100) / 100;

  if (!payments || payments.length === 0) {
    return <p>No payments yet.</p>;
  }

  return (
    <div className="paymentHistoryContainer">
      {payments.map((pay) => {
        const paymentId = pay.paymentId || Math.random().toString();
        const isCosmoPay = pay.meta?.isCosmoToUjb === true;

        const dist = pay.distribution || {};
        const orbiterTotal = r2(dist.orbiter || 0);
        const orbiterMentorTotal = r2(dist.orbiterMentor || 0);
        const cosmoMentorTotal = r2(dist.cosmoMentor || 0);

        const remainingOrbiter = r2(
          Math.max(orbiterTotal - paidToOrbiter, 0)
        );
        const remainingOrbiterMentor = r2(
          Math.max(orbiterMentorTotal - paidToOrbiterMentor, 0)
        );
        const remainingCosmoMentor = r2(
          Math.max(cosmoMentorTotal - paidToCosmoMentor, 0)
        );

        const isUjbPayoutToOrbiter =
          pay.paymentFrom === "UJustBe" &&
          pay.paymentTo === "Orbiter" &&
          pay.meta?.adjustment;

        return (
          <div className="paymentCard" key={paymentId}>
            <div className="paymentCardHeader">
              <h4>₹{pay.amountReceived}</h4>
              <small>{paymentId}</small>
            </div>

            <p>
              <strong>From:</strong> {mapName(pay.paymentFrom)}
            </p>
            <p>
              <strong>To:</strong> {mapName(pay.paymentTo)}
            </p>
            <p>
              <strong>Date:</strong> {pay.paymentDate}
            </p>
            <p>
              <strong>Mode:</strong> {pay.modeOfPayment || "—"}
            </p>

            {pay.transactionRef && (
              <p>
                <strong>Ref:</strong> {pay.transactionRef}
              </p>
            )}

            {/* Adjustment UI for Orbiter payouts (UJB → Orbiter) */}
            {isUjbPayoutToOrbiter && (
              <div className="adjustmentBox">
                <p>
                  <strong>Orbiter Share Settled:</strong> ₹
                  {pay.meta.adjustment.requestedAmount}
                </p>
                <p style={{ color: "#b30000" }}>
                  <strong>Adjustment Deducted:</strong> ₹
                  {pay.meta.adjustment.deducted}
                </p>
                <p style={{ color: "#0055aa" }}>
                  <strong>Cash Paid:</strong> ₹
                  {pay.meta.adjustment.cashPaid}
                </p>
              </div>
            )}

            {pay.distribution && (
              <>
                <p>
                  <strong>Distribution (informational):</strong>
                </p>
                <ul style={{ paddingLeft: 20 }}>
                  <li>Orbiter: ₹{orbiterTotal}</li>
                  <li>Orbiter Mentor: ₹{orbiterMentorTotal}</li>
                  <li>Cosmo Mentor: ₹{cosmoMentorTotal}</li>
                  <li>UJustBe: ₹{dist.ujustbe || 0}</li>
                </ul>
              </>
            )}

            {typeof pay.remainingAfter === "number" && (
              <p>
                <strong>Remaining Agreed:</strong>{" "}
                ₹{(pay.remainingAfter || 0).toLocaleString("en-IN")}
              </p>
            )}

            {isCosmoPay && (
              <button
                className="viewDistributionBtn"
                onClick={() => toggleExpand(paymentId)}
              >
                {expanded === paymentId
                  ? "Hide Distribution"
                  : "View Distribution"}
              </button>
            )}

            {expanded === paymentId && isCosmoPay && (
              <div className="distributionBox">
                <h4>Distribution Slots</h4>

                <SlotPayoutRow
                  label="Orbiter"
                  amount={orbiterTotal}
                  paid={paidToOrbiter}
                  remaining={remainingOrbiter}
                  onPay={() =>
                    onRequestPayout &&
                    onRequestPayout({
                      recipient: "Orbiter",
                      amount: remainingOrbiter,
                      fromPaymentId: paymentId,
                    })
                  }
                />

                <SlotPayoutRow
                  label="Orbiter Mentor"
                  amount={orbiterMentorTotal}
                  paid={paidToOrbiterMentor}
                  remaining={remainingOrbiterMentor}
                  onPay={() =>
                    onRequestPayout &&
                    onRequestPayout({
                      recipient: "OrbiterMentor",
                      amount: remainingOrbiterMentor,
                      fromPaymentId: paymentId,
                    })
                  }
                />

                <SlotPayoutRow
                  label="Cosmo Mentor"
                  amount={cosmoMentorTotal}
                  paid={paidToCosmoMentor}
                  remaining={remainingCosmoMentor}
                  onPay={() =>
                    onRequestPayout &&
                    onRequestPayout({
                      recipient: "CosmoMentor",
                      amount: remainingCosmoMentor,
                      fromPaymentId: paymentId,
                    })
                  }
                />

                <p style={{ marginTop: 10 }}>
                  <strong>UJustBe (kept from this payment):</strong> ₹
                  {dist.ujustbe || 0}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
