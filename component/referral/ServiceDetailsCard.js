import React, { useMemo, useState } from "react";
import { buildDealDistribution } from "../../src/utils/referralCalculations";

export default function ServiceDetailsCard({
  referralData,
  dealLogs,
  dealAlreadyCalculated,
  onSaveDealLog,
}) {
  const [localDealValue, setLocalDealValue] = useState(
    referralData?.dealValue || ""
  );

  const [invoiceFile, setInvoiceFile] = useState(null);

  // PREVIEW DISTRIBUTION
  const previewDistribution = useMemo(() => {
    const dealValueNum = Number(localDealValue);
    if (!dealValueNum || dealValueNum <= 0) return null;

    return buildDealDistribution(dealValueNum, referralData);
  }, [localDealValue, referralData]);

  const handleSaveDeal = () => {
    if (!previewDistribution) {
      alert("Enter valid deal value first.");
      return;
    }
    onSaveDealLog(previewDistribution);
  };

  return (
    <div className="card serviceDetailsCard">

      <h2>Service / Product Details</h2>

      {/* Service or Product List */}
      <div className="spList">
        {(referralData?.services || []).map((srv, idx) => (
          <div key={idx} className="spItem">
            <h4>{srv.name}</h4>
            <p>{srv.description}</p>
          </div>
        ))}

        {(referralData?.products || []).map((prd, idx) => (
          <div key={idx} className="spItem">
            <h4>{prd.name}</h4>
            <p>{prd.description}</p>
          </div>
        ))}
      </div>

      {/* Deal Value Input */}
      <div className="dealBox">
        <label>
          <strong>Deal Value (₹):</strong>
          <input
            type="number"
            value={localDealValue}
            onChange={(e) => setLocalDealValue(e.target.value)}
            placeholder="Enter deal value"
            disabled={dealAlreadyCalculated}
          />
        </label>

        {/* Preview distribution */}
        {previewDistribution && (
          <div className="distributionPreview">
            <h4>Distribution Preview</h4>

            <p>
              <strong>Total Agreed Amount:</strong> ₹
              {previewDistribution.agreedAmount.toLocaleString("en-IN")}
            </p>

            <ul>
              <li>
                Orbiter: ₹
                {previewDistribution.orbiterShare.toLocaleString("en-IN")}
              </li>
              <li>
                Orbiter Mentor: ₹
                {previewDistribution.orbiterMentorShare.toLocaleString("en-IN")}
              </li>
              <li>
                Cosmo Mentor: ₹
                {previewDistribution.cosmoMentorShare.toLocaleString("en-IN")}
              </li>
              <li>
                UJustBe: ₹
                {previewDistribution.ujustbeShare.toLocaleString("en-IN")}
              </li>
            </ul>
          </div>
        )}

        {!dealAlreadyCalculated && (
          <button className="saveDealBtn" onClick={handleSaveDeal}>
            Save Deal Calculation
          </button>
        )}

        {dealAlreadyCalculated && (
          <p className="dealSavedTag">
            ✔ Deal already calculated. Edit not allowed.
          </p>
        )}
      </div>

      {/* Invoice Upload */}
      <div className="invoiceBox">
        <h4>Upload Invoice</h4>

        <input
          type="file"
          accept="image/*,application/pdf"
          onChange={(e) => setInvoiceFile(e.target.files[0])}
        />

        {invoiceFile && <p>Selected: {invoiceFile.name}</p>}

        <button
          disabled={!invoiceFile}
          onClick={() => alert("Upload logic pending")}
        >
          Upload Invoice
        </button>
      </div>
    </div>
  );
}
