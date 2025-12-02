// components/referral/SlotPayoutRow.js
import React from "react";

const formatCurrency = (v) =>
  `₹${Number(v || 0).toLocaleString("en-IN")}`;

export default function SlotPayoutRow({
  label,
  amount = 0,
  paid = 0,
  remaining = 0,
  onPay,
  payoutInfo, // optional: the payout record for this slot
}) {
  const safeRemaining = Math.max(Number(remaining || 0), 0);
  const fullyPaid = safeRemaining <= 0;

  const adjustedMeta = payoutInfo?.meta?.adjustment;
  const hasAdjustment =
    adjustedMeta && Number(adjustedMeta.deducted || 0) > 0;

  const effectivePaid =
    payoutInfo?.actualPaid ??
    payoutInfo?.amountReceived ??
    paid ??
    0;

  return (
    <div className="slotRow">
      <div className="slotInfo">
        <strong>{label}</strong>
        <p>Slot Share: {formatCurrency(amount)}</p>

        {fullyPaid ? (
          <p>Remaining: {formatCurrency(0)}</p>
        ) : (
          <p>Remaining: {formatCurrency(safeRemaining)}</p>
        )}

        {fullyPaid && payoutInfo && (
          <div className="slotPaidDetails">
            <p>
              <strong>Cash Paid:</strong> {formatCurrency(effectivePaid)}
            </p>
            {hasAdjustment && (
              <p className="slotAdjustmentNote">
                Adjustment used:{" "}
                {formatCurrency(adjustedMeta.deducted)}
                <br />
                Onboarding fee pending before:{" "}
                {formatCurrency(adjustedMeta.previousRemaining)}
                <br />
                Pending after payout:{" "}
                {formatCurrency(adjustedMeta.newRemaining)}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="slotAction">
        {fullyPaid ? (
          <span className="paidBadge">PAID</span>
        ) : (
          <button className="payBtn" onClick={onPay}>
            Pay {formatCurrency(safeRemaining)}
          </button>
        )}
      </div>
    </div>
  );
}
