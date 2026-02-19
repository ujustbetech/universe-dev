import React from "react";
import SlotPayoutRow from "./SlotPayoutRow";

export default function PaymentDrawer({
  isOpen,
  onClose,
  payments = [],
  payment,
  referralData,
  ujbBalance,
  paidTo = {},
  mapName,
  onRequestPayout,
  dealEverWon,
}) {
  if (!isOpen) return null;

  const agreedAmount = Number(payment?.agreedAmount || 0);
  const cosmoPaid = Number(payment?.cosmoPaid || 0);
  const agreedRemaining = Math.max(agreedAmount - cosmoPaid, 0);

  // 🔎 Separate payment types
  const cosmoPayments = payments.filter(
    (p) => p.meta?.isCosmoToUjb === true
  );

  const payoutEntries = payments.filter(
    (p) => p.meta?.isUjbPayout === true
  );

  /**
   * ✅ LOGICAL PAID FOR SLOT
   * logicalAmount → primary
   * fallback → cash + adjustment
   */
  const getLogicalPaid = (cosmoPaymentId, slot) =>
    payoutEntries
      .filter(
        (p) =>
          p.meta?.belongsToPaymentId === cosmoPaymentId &&
          p.meta?.slot === slot
      )
      .reduce((sum, p) => {
        if (typeof p.meta?.logicalAmount === "number") {
          return sum + p.meta.logicalAmount;
        }

        const cash = Number(p.amountReceived || 0);
        const adj = Number(p.meta?.adjustment?.deducted || 0);
        return sum + cash + adj;
      }, 0);

  const totalPayoutsDone =
    Number(paidTo.orbiter || 0) +
    Number(paidTo.orbiterMentor || 0) +
    Number(paidTo.cosmoMentor || 0);

  return (
    <div className="DrawerOverlay" onClick={onClose}>
      <div
        className="PaymentDrawer"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="drawerHeader">
          <h3>Payments & Settlement</h3>
          <button className="drawerCloseBtn" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* ---------- SUMMARY ---------- */}
        <section className="drawerSection">
          <h4 className="sectionTitle">Settlement Summary</h4>

          <div className="settlementGrid">
            <SummaryItem label="Agreed Amount" value={agreedAmount} />
            <SummaryItem label="Cosmo Paid" value={cosmoPaid} />
            <SummaryItem
              label="Remaining"
              value={agreedRemaining}
              red
            />
            <SummaryItem label="UJB Balance" value={ujbBalance} />
            <SummaryItem
              label="Payouts Done"
              value={totalPayoutsDone}
            />
            <SummaryItem
              label="Net Retained"
              value={cosmoPaid - totalPayoutsDone}
            />
          </div>

          <button
            className="primaryBtn"
            disabled={!dealEverWon || agreedRemaining <= 0}
            onClick={payment.openPaymentModal}
          >
            + Add Cosmo Payment
          </button>
        </section>

        {/* ---------- COSMO PAYMENTS ---------- */}
        <section className="drawerSection">
          <h4 className="sectionTitle">
            Cosmo Payments & UJB Payouts
          </h4>

          {cosmoPayments.map((cp) => {
            const pid = cp.paymentId;

            const safeDate = cp.paymentDate
              ? new Date(cp.paymentDate).toLocaleDateString(
                  "en-IN"
                )
              : "—";

            const orbShare = Number(cp.distribution?.orbiter || 0);
            const omShare = Number(
              cp.distribution?.orbiterMentor || 0
            );
            const cmShare = Number(
              cp.distribution?.cosmoMentor || 0
            );

            const orbPaid = getLogicalPaid(pid, "Orbiter");
            const omPaid = getLogicalPaid(pid, "OrbiterMentor");
            const cmPaid = getLogicalPaid(pid, "CosmoMentor");

            const isSettled =
              orbPaid >= orbShare &&
              omPaid >= omShare &&
              cmPaid >= cmShare;

            return (
              <div
                key={pid}
                className="paymentHistoryBox cosmoPaymentBox"
              >
                <div className="paymentRowHeader">
                  <div>
                    <h4>
                      ₹
                      {Number(cp.amountReceived).toLocaleString(
                        "en-IN"
                      )}
                    </h4>
                    <small>{pid}</small>
                  </div>

                  <span
                    className={`badge ${
                      isSettled
                        ? "badgeGreen"
                        : "badgeYellow"
                    }`}
                  >
                    {isSettled
                      ? "Settled"
                      : "Pending Payouts"}
                  </span>
                </div>

                <p>
                  <strong>From:</strong>{" "}
                  {mapName(cp.paymentFrom)}
                </p>
                <p>
                  <strong>Date:</strong> {safeDate}
                </p>

                <div className="slotPayoutGroup">
                  <SlotPayoutRow
                    label="Orbiter"
                    slotKey="Orbiter"
                    totalShare={orbShare}
                    paidSoFar={orbPaid}
                    onRequestPayout={(amount) =>
                      onRequestPayout({
                        recipient: "Orbiter",
                        slotKey: "Orbiter",
                        amount,
                        fromPaymentId: pid,
                      })
                    }
                  />

                  <SlotPayoutRow
                    label="Orbiter Mentor"
                    slotKey="OrbiterMentor"
                    totalShare={omShare}
                    paidSoFar={omPaid}
                    onRequestPayout={(amount) =>
                      onRequestPayout({
                        recipient: "OrbiterMentor",
                        slotKey: "OrbiterMentor",
                        amount,
                        fromPaymentId: pid,
                      })
                    }
                  />

                  <SlotPayoutRow
                    label="Cosmo Mentor"
                    slotKey="CosmoMentor"
                    totalShare={cmShare}
                    paidSoFar={cmPaid}
                    onRequestPayout={(amount) =>
                      onRequestPayout({
                        recipient: "CosmoMentor",
                        slotKey: "CosmoMentor",
                        amount,
                        fromPaymentId: pid,
                      })
                    }
                  />
                </div>
              </div>
            );
          })}
        </section>
      </div>
    </div>
  );
}

function SummaryItem({ label, value, red }) {
  return (
    <div className="settlementItem">
      <span>{label}</span>
      <strong style={red ? { color: "#d11" } : {}}>
        ₹{Number(value || 0).toLocaleString("en-IN")}
      </strong>
    </div>
  );
}
