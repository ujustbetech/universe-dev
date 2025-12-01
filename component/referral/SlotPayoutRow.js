// components/referral/SlotPayoutRow.js
import React, { useState } from "react";

export default function SlotPayoutRow({
  label,
  amount = 0,
  paid = 0,
  remaining = 0,
  onPay,
}) {
  const [loading, setLoading] = useState(false);

  const r2 = (n) => Math.round(n * 100) / 100;
  const safeRemaining = r2(remaining);
  const fullyPaid = safeRemaining <= 0;

  const handlePay = async () => {
    if (loading || fullyPaid) return;
    setLoading(true);
    const res = await onPay();
    if (res?.error) {
      alert(res.error);
    }
    setLoading(false);
  };

  return (
    <div className="slotRow">
      <div>
        <strong>{label}</strong>
        <p>Share: ₹{r2(amount)}</p>
        <p>Paid: ₹{r2(paid)}</p>
        <p>Remaining: ₹{safeRemaining}</p>
      </div>

      {fullyPaid ? (
        <span className="paidBadge">PAID</span>
      ) : (
        <button
          className="payBtn"
          onClick={handlePay}
          disabled={loading || safeRemaining <= 0}
        >
          {loading ? "Processing..." : `Pay ₹${safeRemaining}`}
        </button>
      )}
    </div>
  );
}
