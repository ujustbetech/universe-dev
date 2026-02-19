// components/referral/StatusBadge.js
import React from "react";

export default function StatusBadge({ status }) {
  const map = {
    pending: { label: "Pending Payout", className: "pending" },
    partial: { label: "Partially Settled", className: "partial" },
    settled: { label: "Fully Settled", className: "settled" },
    overdue: { label: "Overdue", className: "overdue" },
  };

  const cfg = map[status] || map.pending;

  return (
    <span className={`statusBadgeChip status-${cfg.className}`}>
      {status === "overdue" ? "🔴" : status === "settled" ? "🟢" : "🟡"}{" "}
      {cfg.label}
    </span>
  );
}
