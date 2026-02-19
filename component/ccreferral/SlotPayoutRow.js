// components/referral/SlotPayoutRow.js
import React from "react";

export default function SlotPayoutRow({
  label,
  slotKey,
  totalShare = 0,
  paidSoFar = 0, // 🔒 MUST be logicalPaid (cash + adjustment)
  onRequestPayout,
  recipientName,
  recipientUjbCode,
}) {
  const total = Number(totalShare || 0);
  const paid = Number(paidSoFar || 0);

  // ✅ ONLY calculation that should exist
  const remaining = Math.max(total - paid, 0);
  const isPaid = remaining === 0;

  return (
    <div className={`slotRow ${isPaid ? "slotPaid" : ""}`}>
      {/* LEFT */}
      <div className="slotInfo">
        <strong>{label}</strong>
        <div className="slotMeta">
          <span>Total: ₹{total}</span>
          {isPaid && <span className="paidTag">✅ Paid</span>}
        </div>
      </div>

      {/* CENTER */}
      <div className="slotAmounts">
        <div>Paid: ₹{paid}</div>
        {!isPaid && <div>Remaining: ₹{remaining}</div>}
      </div>

      {/* RIGHT */}
      <div className="slotActions">
        {!isPaid && onRequestPayout && (
          <button
            className="payoutBtn"
            onClick={() => onRequestPayout(remaining)}
          >
            Pay ₹{remaining}
          </button>
        
        )}

        <div className="slotTooltip">
          ⓘ
          <div className="slotTooltipBox">
            <p><strong>{recipientName || label}</strong></p>
            {recipientUjbCode && <p>UJB: {recipientUjbCode}</p>}
            <p>Total Share: ₹{total}</p>
            <p>Paid (Cash + Adjustment): ₹{paid}</p>
            <p>Remaining: ₹{remaining}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
