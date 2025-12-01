// components/referral/PaymentSummary.js
import { useState } from "react";

export default function PaymentSummary({
  agreedAmount = 0,
  cosmoPaid = 0,
  agreedRemaining = 0,
  ujbBalance = 0,
  paidTo = {},
  referralData = {},
  onAddPayment = () => {},
}) {
  const [showBreakdown, setShowBreakdown] = useState(false);

  const logs = referralData?.dealLogs || [];
  const deal = logs.length ? logs[logs.length - 1] : {};

  const orbiterShare = deal?.orbiterShare ?? 0;
  const orbiterMentorShare = deal?.orbiterMentorShare ?? 0;
  const cosmoMentorShare = deal?.cosmoMentorShare ?? 0;
  const ujustbeShare = deal?.ujustbeShare ?? 0;

  const progress =
    agreedAmount > 0 ? Math.round((cosmoPaid / agreedAmount) * 100) : 0;

  return (
    <div className="paymentSummaryCard">
      <div className="headerRow">
        <h4 className="sectionTitle">Payments & Distribution</h4>
      </div>

      <div className="summaryGrid">
        <div className="summaryItem">
          <span>Agreed</span>
          <strong>₹{agreedAmount.toLocaleString("en-IN")}</strong>
        </div>
        <div className="summaryItem">
          <span>Paid</span>
          <strong>₹{cosmoPaid.toLocaleString("en-IN")}</strong>
        </div>
        <div className="summaryItem">
          <span>Remaining</span>
          <strong>₹{agreedRemaining.toLocaleString("en-IN")}</strong>
        </div>
        <div className="summaryItem">
          <span>Progress</span>
          <strong>{progress}%</strong>
        </div>
      </div>

      <div className="progressBarContainer">
        <div className="progressTrack">
          <div className="progressFill" style={{ width: `${progress}%` }} />
        </div>
        <small>{progress}% received</small>
      </div>

      <div
        className="accordionHeader"
        onClick={() => setShowBreakdown(!showBreakdown)}
      >
        <strong>Earnings Breakdown</strong>
        <span>{showBreakdown ? "▲" : "▼"}</span>
      </div>

      {showBreakdown && (
        <div className="accordionContent">
          <div className="breakdownRow">
            <span>Orbiter</span>
            <strong>
              ₹{orbiterShare.toLocaleString("en-IN")}
              <em>
                {" "}
                (Paid: ₹
                {(paidTo.orbiter || 0).toLocaleString("en-IN")})
              </em>
            </strong>
          </div>

          <div className="breakdownRow">
            <span>Orbiter Mentor</span>
            <strong>
              ₹{orbiterMentorShare.toLocaleString("en-IN")}
              <em>
                {" "}
                (Paid: ₹
                {(paidTo.orbiterMentor || 0).toLocaleString(
                  "en-IN"
                )})
              </em>
            </strong>
          </div>

          <div className="breakdownRow">
            <span>Cosmo Mentor</span>
            <strong>
              ₹{cosmoMentorShare.toLocaleString("en-IN")}
              <em>
                {" "}
                (Paid: ₹
                {(paidTo.cosmoMentor || 0).toLocaleString("en-IN")})
              </em>
            </strong>
          </div>

          <div className="breakdownRow">
            <span>UJustBe</span>
            <strong>₹{ujustbeShare.toLocaleString("en-IN")}</strong>
          </div>

          <div className="breakdownRow">
            <span>UJB Balance</span>
            <strong>
              ₹{ujbBalance.toLocaleString("en-IN")}
            </strong>
          </div>
        </div>
      )}

      <div className="paymentActions">
        <button
          className="addPaymentBtn"
          onClick={onAddPayment}
          disabled={agreedRemaining <= 0}
        >
          + Add Cosmo Payment
        </button>
      </div>
    </div>
  );
}
