// components/referral/PaymentDrawer.js
import React from "react";
import SlotPayoutRow from "./SlotPayoutRow";

export default function PaymentDrawer({
  isOpen,
  onClose,
  payments = [],
  payment, // useReferralPayments result
  referralData,
  ujbBalance,
  paidTo = {},
  mapName,
  onRequestPayout,
  dealEverWon,
  totalEarned, // optional
}) {
  if (!isOpen) return null;

  const agreedAmount = Number(payment?.agreedAmount || 0);
  const cosmoPaid = Number(payment?.cosmoPaid || 0);
  const agreedRemaining = Number(payment?.agreedRemaining || 0);

  const delayWarning = getOverdueWarning(payments);

  const cosmoPayments = payments.filter((p) => p.meta?.isCosmoToUjb === true);
  const payoutEntries = payments.filter((p) => p.meta?.isUjbPayout === true);

  const totalPayoutsDone =
    Number(referralData?.paidToOrbiter || 0) +
    Number(referralData?.paidToOrbiterMentor || 0) +
    Number(referralData?.paidToCosmoMentor || 0);

  return (
    <div className="DrawerOverlay" onClick={onClose}>
      <div className="PaymentDrawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawerHeader">
          <h3>Payments & Settlement</h3>
          <button className="drawerCloseBtn" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* SUMMARY SECTION */}
        <section className="drawerSection">
          <h4 className="sectionTitle">Settlement Summary</h4>

          <div className="settlementGrid">
            <SummaryItem label="Agreed Amount" value={agreedAmount} />
            <SummaryItem label="Cosmo Paid" value={cosmoPaid} />
            <SummaryItem label="Remaining" value={agreedRemaining} red />
            <SummaryItem label="UJB Balance" value={ujbBalance} />
            <SummaryItem label="Payouts Done" value={totalPayoutsDone} />
            <SummaryItem
              label="Net Retained"
              value={cosmoPaid - totalPayoutsDone}
            />
          </div>

          {delayWarning && <p className="overdueWarning">{delayWarning}</p>}

          <button
            className="primaryBtn"
            disabled={!dealEverWon || agreedRemaining <= 0}
            onClick={payment.openPaymentModal}
          >
            + Add Cosmo Payment
          </button>
        </section>

        {/* COSMO PAYMENTS & PAYOUTS */}
        <section className="drawerSection">
          <h4 className="sectionTitle">Cosmo Payments & Payouts</h4>

          {cosmoPayments.length === 0 && (
            <p>No Cosmo payments recorded yet.</p>
          )}

          {cosmoPayments.map((cp) => {
            const paymentId = cp.paymentId || "";
            const safeDate = cp.paymentDate
              ? new Date(cp.paymentDate).toLocaleDateString("en-IN")
              : "—";

            const relatedPayouts = payoutEntries.filter(
              (po) => po.meta?.belongsToPaymentId === cp.paymentId
            );

            const orbP = relatedPayouts.find(
              (po) => po.paymentTo === "Orbiter"
            );
            const omP = relatedPayouts.find(
              (po) => po.paymentTo === "OrbiterMentor"
            );
            const cmP = relatedPayouts.find(
              (po) => po.paymentTo === "CosmoMentor"
            );

            const orbPaid = orbP ? Number(orbP.amountReceived || 0) : 0;
            const omPaid = omP ? Number(omP.amountReceived || 0) : 0;
            const cmPaid = cmP ? Number(cmP.amountReceived || 0) : 0;

            const orbShare = cp.distribution?.orbiter || 0;
            const omShare = cp.distribution?.orbiterMentor || 0;
            const cmShare = cp.distribution?.cosmoMentor || 0;
            const ujbShare = cp.distribution?.ujustbe || 0;

            const isOrbSettled = orbPaid >= orbShare;
            const isOmSettled = omPaid >= omShare;
            const isCmSettled = cmPaid >= cmShare;

            const allSettled = isOrbSettled && isOmSettled && isCmSettled;

            return (
              <div
                key={paymentId}
                className="paymentHistoryBox cosmoPaymentBox"
              >
                <div className="paymentRowHeader">
                  <div>
                    <h4>
                      ₹{Number(cp.amountReceived || 0).toLocaleString("en-IN")}
                    </h4>
                    <small>{paymentId}</small>
                  </div>
                  <div className="paymentStatusBlock">
                    {allSettled ? (
                      <span className="badge badgeGreen">Settled</span>
                    ) : (
                      <span className="badge badgeYellow">
                        Pending Payouts
                      </span>
                    )}
                  </div>
                </div>

                <p>
                  <strong>From:</strong> {mapName(cp.paymentFrom)}
                </p>
                <p>
                  <strong>Date:</strong> {safeDate}
                </p>
                <p>
                  <strong>Mode:</strong> {cp.modeOfPayment || "—"}
                </p>
                {cp.transactionRef && (
                  <p>
                    <strong>Ref:</strong> {cp.transactionRef}
                  </p>
                )}

                <div className="distListWrapper">
                  <p>
                    <strong>Distribution:</strong>
                  </p>
                  <ul className="distList">
                    <li>Orbiter: ₹{orbShare}</li>
                    <li>Orbiter Mentor: ₹{omShare}</li>
                    <li>Cosmo Mentor: ₹{cmShare}</li>
                    <li>UJB: ₹{ujbShare}</li>
                  </ul>
                </div>

                <div className="slotPayoutGroup">
                  <SlotPayoutRow
                    label="Orbiter"
                    amount={orbShare}
                    paid={orbPaid}
                    remaining={Math.max(orbShare - orbPaid, 0)}
                    onPay={() =>
                      !isOrbSettled &&
                      onRequestPayout &&
                      onRequestPayout({
                        recipient: "Orbiter",
                        slotKey: "orbiter",
                        amount: orbShare - orbPaid,
                        fromPaymentId: cp.paymentId,
                      })
                    }
                    payoutInfo={orbP}
                  />

                  <SlotPayoutRow
                    label="Orbiter Mentor"
                    amount={omShare}
                    paid={omPaid}
                    remaining={Math.max(omShare - omPaid, 0)}
                    onPay={() =>
                      !isOmSettled &&
                      onRequestPayout &&
                      onRequestPayout({
                        recipient: "OrbiterMentor",
                        slotKey: "orbiterMentor",
                        amount: omShare - omPaid,
                        fromPaymentId: cp.paymentId,
                      })
                    }
                    payoutInfo={omP}
                  />

                  <SlotPayoutRow
                    label="Cosmo Mentor"
                    amount={cmShare}
                    paid={cmPaid}
                    remaining={Math.max(cmShare - cmPaid, 0)}
                    onPay={() =>
                      !isCmSettled &&
                      onRequestPayout &&
                      onRequestPayout({
                        recipient: "CosmoMentor",
                        slotKey: "cosmoMentor",
                        amount: cmShare - cmPaid,
                        fromPaymentId: cp.paymentId,
                      })
                    }
                    payoutInfo={cmP}
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
        ₹{Number(value).toLocaleString("en-IN")}
      </strong>
    </div>
  );
}

function getOverdueWarning(payments) {
  const cosmoPayments = payments.filter((p) => p.meta?.isCosmoToUjb === true);
  if (!cosmoPayments.length) return null;

  const last = cosmoPayments[cosmoPayments.length - 1];
  if (!last.paymentDate) return null;

  const receivedDate = new Date(last.paymentDate);
  if (isNaN(receivedDate.getTime())) return null;

  const days = workingDaysBetween(receivedDate, new Date());
  if (days > 7) {
    return `⚠ Payouts overdue by ${days - 7} working days (after last Cosmo payment)`;
  }
  return null;
}

function workingDaysBetween(start, end) {
  if (!start || !end) return 0;

  let count = 0;
  let cur = new Date(start);

  while (cur <= end) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}
