// components/referral/PaymentHistory.js
import React, { useState } from "react";
import SlotPayoutRow from "./SlotPayoutRow";
import ProgressRing from "./ProgressRing";
import StatusBadge from "./StatusBadge";

function parseDate(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.split("-");
  if (parts.length !== 3) return null;
  const [y, m, d] = parts.map((p) => Number(p));
  return new Date(y, m - 1, d);
}

// working days difference (skip Sundays only)
function workingDaysDiff(from, to) {
  if (!from || !to) return 0;
  if (to < from) return 0;

  let count = 0;
  const cursor = new Date(from.getTime());
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(to.getTime());
  end.setHours(0, 0, 0, 0);

  while (cursor <= end) {
    const day = cursor.getDay(); // 0 = Sunday
    if (day !== 0) {
      count += 1;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

export default function PaymentHistory({
  payments = [],
  mapName,
  paidToOrbiter = 0,
  paidToOrbiterMentor = 0,
  paidToCosmoMentor = 0,
  onRequestPayout,
}) {
  const [expanded, setExpanded] = useState(null);
  const today = new Date();

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

        const totalSlotAmount =
          orbiterTotal + orbiterMentorTotal + cosmoMentorTotal;
        const remainingSlotsAmount =
          remainingOrbiter +
          remainingOrbiterMentor +
          remainingCosmoMentor;
        const paidSlotsAmount = Math.max(
          totalSlotAmount - remainingSlotsAmount,
          0
        );
        const progress =
          totalSlotAmount > 0
            ? Math.round((paidSlotsAmount / totalSlotAmount) * 100)
            : 0;

        // Determine status for Cosmo payments only
        let status = null;
        let workingDays = 0;
        let isOverdue = false;

        if (isCosmoPay && totalSlotAmount > 0) {
          const dateObj = parseDate(pay.paymentDate);
          workingDays = workingDaysDiff(dateObj, today);

          if (remainingSlotsAmount <= 0) {
            status = "settled";
          } else if (workingDays > 7) {
            status = "overdue";
            isOverdue = true;
          } else if (paidSlotsAmount > 0) {
            status = "partial";
          } else {
            status = "pending";
          }
        }

        const isUjbPayoutToOrbiter =
          pay.paymentFrom === "UJustBe" &&
          pay.paymentTo === "Orbiter" &&
          pay.meta?.adjustment;

        const cardClassNames = [
          "paymentCard",
          isCosmoPay && status === "overdue" ? "paymentCardOverdue" : "",
          isCosmoPay && status === "partial" ? "paymentCardPartial" : "",
          isCosmoPay && status === "settled" ? "paymentCardSettled" : "",
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <div className={cardClassNames} key={paymentId}>
            <div className="paymentCardHeader">
              <div>
                <h4>₹{pay.amountReceived}</h4>
                <small>{paymentId}</small>
              </div>

              {isCosmoPay && (
                <div className="paymentStatusColumn">
                  <ProgressRing size={44} strokeWidth={4} progress={progress} />
                  <StatusBadge status={status} />
                  {status !== "settled" && (
                    <span className="payoutRibbon">🏁 Payout Required</span>
                  )}
                </div>
              )}
            </div>

            {isCosmoPay && isOverdue && (
              <div className="overdueBanner">
                ⚠ Payment overdue for settlement (
                {workingDays} working days since receipt)
              </div>
            )}

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

            {isUjbPayoutToOrbiter && (
              <div className="adjustmentBox">
                <p>
                  <strong>Orbiter Share Settled:</strong> ₹
                  {pay.meta.adjustment.requestedAmount}
                </p>
                <p className="adjustmentDeducted">
                  <strong>Adjustment Deducted:</strong> ₹
                  {pay.meta.adjustment.deducted}
                </p>
                <p className="adjustmentCashPaid">
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
                    remainingOrbiter > 0 &&
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
                    remainingOrbiterMentor > 0 &&
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
                    remainingCosmoMentor > 0 &&
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
