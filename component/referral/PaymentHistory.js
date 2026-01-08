import React, { useState } from "react";
import SlotPayoutRow from "./SlotPayoutRow";
import ProgressRing from "./ProgressRing";
import StatusBadge from "./StatusBadge";

export default function PaymentHistory({
  payments = [],
  mapName,
  onRequestPayout,
}) {
  const [expanded, setExpanded] = useState(null);

  // ✅ FIX 1: Proper normalization (array OR object)
  const safePayments = Array.isArray(payments)
    ? payments
    : Object.values(payments || {}).flat();

  // Show ONLY Cosmo → UJB payments and UJB payouts
  const visiblePayments = safePayments.filter(
    (p) => p?.meta?.isCosmoToUjb || p?.meta?.isUjbPayout
  );

  /**
   * ✅ LOGICAL PAID (PRIMARY)
   * logicalAmount → preferred
   * fallback → cash + adjustment
   */
const getPaidForSlot = (cosmoPaymentId, slot) =>
  visiblePayments
    .filter(
      (p) =>
        p?.meta?.isUjbPayout === true &&
        p?.meta?.belongsToPaymentId === cosmoPaymentId &&
        p?.meta?.slot === slot
    )
    .reduce((sum, p) => {
      // ✅ BEST CASE (new data)
      if (typeof p?.meta?.logicalAmount === "number") {
        return sum + p.meta.logicalAmount;
      }

      // ⚠️ LEGACY DATA FIX (THIS IS THE KEY)
      const net = Number(p?.amountReceived || 0);

      // 👇 if tdsAmount missing, derive it from totalShare
    const tds =
  typeof p?.meta?.tdsAmount === "number"
    ? p.meta.tdsAmount
    : (() => {
        const rate =
          typeof p?.meta?.tdsRate === "number"
            ? p.meta.tdsRate / 100
            : 0.05; // fallback only for very old data

        return Math.round((net * rate) / (1 - rate));
      })();


      return sum + net + tds;
    }, 0);



  if (!visiblePayments.length) {
    return <p>No payments yet.</p>;
  }

  return (
    <div className="paymentHistoryContainer">
      {visiblePayments.map((pay, idx) => {
        const paymentId =
          pay?.paymentId ||
          pay?.meta?.paymentId ||
          pay?.meta?.belongsToPaymentId ||
          idx;

        const isCosmo = pay?.meta?.isCosmoToUjb === true;
        const isUjb = pay?.meta?.isUjbPayout === true;

const logicalTotal =
  typeof pay?.grossAmount === "number"
    ? pay.grossAmount
    : typeof pay?.meta?.logicalAmount === "number"
    ? pay.meta.logicalAmount
    : Number(pay?.amountReceived || 0) +
      Number(pay?.meta?.adjustment?.deducted || 0);


        return (
          <div className="paymentCard" key={paymentId}>
            {/* HEADER */}
            <div className="paymentCardHeader">
              <div>
                <h4>₹{logicalTotal}</h4>

                {pay?.meta?.adjustment?.deducted > 0 && (
                  <small className="muted">
                    ₹{pay.amountReceived} cash + ₹
                    {pay.meta.adjustment.deducted} adjustment
                  </small>
                )}

                <small className="muted">{paymentId}</small>
              </div>

              {isCosmo && (
                <div className="paymentStatusColumn">
                  <ProgressRing size={44} strokeWidth={4} progress={100} />
                  <StatusBadge status="received" />
                </div>
              )}
            </div>

            {/* META */}
            <p><strong>From:</strong> {mapName(pay?.paymentFrom)}</p>
            <p><strong>To:</strong> {mapName(pay?.paymentTo || pay?.meta?.slot)}</p>
            <p><strong>Date:</strong> {pay?.paymentDate || "—"}</p>
            <p><strong>Mode:</strong> {pay?.modeOfPayment || "—"}</p>

            {/* ADJUSTMENT DETAILS */}
            {pay?.meta?.adjustment?.deducted > 0 && (
              <div className="adjustmentBox">
                <p>🧮 Adjustment Used: ₹{pay.meta.adjustment.deducted}</p>
                <p>💰 Cash Paid: ₹{pay.amountReceived}</p>
                <p>
                  Adjustment Balance After: ₹
                  {pay.meta.adjustment.newRemaining ?? "—"}
                </p>
              </div>
            )}

            {/* DISTRIBUTION */}
            {isCosmo && pay?.distribution && (
              <>
                <button
                  className="viewDistributionBtn"
                  onClick={() =>
                    setExpanded(expanded === paymentId ? null : paymentId)
                  }
                >
                  {expanded === paymentId
                    ? "Hide Distribution"
                    : "View Distribution"}
                </button>

                {expanded === paymentId && (
                  <div className="distributionBox">
                    <SlotPayoutRow
                      label="Orbiter"
                      slotKey="Orbiter"
                      totalShare={pay.distribution.orbiter || 0}
                      paidSoFar={getPaidForSlot(paymentId, "Orbiter")}
                      onRequestPayout={(amount) =>
                        onRequestPayout?.({
                          cosmoPaymentId: paymentId,
                          slot: "Orbiter",
                          amount,
                        })
                      }
                    />

                    <SlotPayoutRow
                      label="Orbiter Mentor"
                      slotKey="OrbiterMentor"
                      totalShare={pay.distribution.orbiterMentor || 0}
                      paidSoFar={getPaidForSlot(paymentId, "OrbiterMentor")}
                      onRequestPayout={(amount) =>
                        onRequestPayout?.({
                          cosmoPaymentId: paymentId,
                          slot: "OrbiterMentor",
                          amount,
                        })
                      }
                    />

                    <SlotPayoutRow
                      label="Cosmo Mentor"
                      slotKey="CosmoMentor"
                      totalShare={pay.distribution.cosmoMentor || 0}
                      paidSoFar={getPaidForSlot(paymentId, "CosmoMentor")}
                      onRequestPayout={(amount) =>
                        onRequestPayout?.({
                          cosmoPaymentId: paymentId,
                          slot: "CosmoMentor",
                          amount,
                        })
                      }
                    />
                  </div>
                )}
              </>
            )}

            {isUjb && (
              <div className="ujbPayoutBadge">
                ✅ UJB Payout ({pay?.meta?.slot})
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
