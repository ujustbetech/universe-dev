import React, { useMemo, useState, useEffect } from "react";
import { buildDealDistribution } from "../../src/utils/referralCalculations";

export default function ServiceDetailsCard({
  referralData,
  dealLogs,
  onSaveDealLog,
}) {

  const [localDealValue, setLocalDealValue] = useState("");

  /* ================= CC CHECK ================= */

  const isCC =
    referralData?.referralSource === "CC";

  /* ================= LOCK CONDITION ================= */

  const isDealLocked =
    referralData?.dealStatus === "Agreed % Transferred to UJustBe" ||
    referralData?.dealStatus ===
      "Agreed Percentage Transferred to UJustBe" ||
    referralData?.statusLogs?.some(
      (s) => s.status === "Agreed % Transferred to UJustBe"
    ) ||
    referralData?.dealLogs?.some(
      (log) => log.dealStatus === "Agreed % Transferred to UJustBe"
    );

  /* ================= LATEST DEAL LOG ================= */

  const latestDealLog =
    referralData?.dealLogs?.length > 0
      ? referralData.dealLogs[
          referralData.dealLogs.length - 1
        ]
      : null;

  /* ================= SYNC DEAL VALUE ================= */

  useEffect(() => {
    if (latestDealLog?.dealValue) {
      setLocalDealValue(latestDealLog.dealValue);
    }
  }, [latestDealLog]);

  /* ================= DISTRIBUTION ================= */

  const previewDistribution = useMemo(() => {

    // 🔒 Locked → show saved distribution
    if (isDealLocked && latestDealLog) {

      return {
        agreedAmount: latestDealLog.agreedAmount,
        orbiterShare: latestDealLog.orbiterShare,
        orbiterMentorShare: isCC ? 0 : latestDealLog.orbiterMentorShare,
        cosmoMentorShare: isCC ? 0 : latestDealLog.cosmoMentorShare,
        ujustbeShare: latestDealLog.ujustbeShare,
      };

    }

    // ✏️ Editable → live calc
    const dealValueNum =
      Number(localDealValue);

    if (!dealValueNum || dealValueNum <= 0)
      return null;

    const dist =
      buildDealDistribution(
        dealValueNum,
        referralData
      );

    // 🟣 CC FORCE ZERO MENTORS
    if (isCC) {
      dist.orbiterMentorShare = 0;
      dist.cosmoMentorShare = 0;
    }

    return dist;

  }, [
    localDealValue,
    referralData,
    isDealLocked,
    latestDealLog,
    isCC
  ]);

  /* ================= SAVE DEAL ================= */

  const handleSaveDeal = () => {

    if (isDealLocked) {
      alert(
        "Deal is locked. Agreed percentage already transferred to UJustBe."
      );
      return;
    }

    if (!previewDistribution) {
      alert("Enter valid deal value first.");
      return;
    }

    onSaveDealLog({
      ...previewDistribution,
      dealValue:
        Number(localDealValue),
    });

  };

  return (

    <div className="card serviceDetailsCard">

      <h2>Service / Product Details</h2>

      <div className="dealBox">

        <label>
          <strong>Deal Value (₹):</strong>

          <input
            type="number"
            value={localDealValue}
            onChange={(e)=>
              setLocalDealValue(
                e.target.value
              )
            }
            disabled={isDealLocked}
            placeholder="Enter deal value"
          />

        </label>

        {previewDistribution && (

          <div className="distributionPreview">

            <h4>
              {isDealLocked
                ? "Final Distribution"
                : "Distribution Preview"}
            </h4>

            <p>
              <strong>
                Total Agreed Amount:
              </strong> ₹
              {previewDistribution
                .agreedAmount
                .toLocaleString("en-IN")}
            </p>

            <ul>

              <li>
                Orbiter: ₹
                {previewDistribution
                  .orbiterShare}
              </li>

              {/* 🚫 HIDE MENTORS IN CC */}

              {!isCC && (
                <>
                  <li>
                    Orbiter Mentor: ₹
                    {previewDistribution
                      .orbiterMentorShare}
                  </li>

                  <li>
                    Cosmo Mentor: ₹
                    {previewDistribution
                      .cosmoMentorShare}
                  </li>
                </>
              )}

              <li>
                UJustBe: ₹
                {previewDistribution
                  .ujustbeShare}
              </li>

            </ul>

          </div>

        )}

        {!isDealLocked && (

          <button
            className="saveDealBtn"
            onClick={handleSaveDeal}
          >
            {dealLogs?.length
              ? "Update Deal Calculation"
              : "Save Deal Calculation"}
          </button>

        )}

        {isDealLocked && (

          <p className="dealSavedTag">
            🔒 Deal locked. Agreed percentage transferred to UJustBe.
          </p>

        )}

      </div>

    </div>

  );

}