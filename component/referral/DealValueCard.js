// component/referral/DealValueCard.js
import React, { useState } from "react";
import { buildDealDistribution } from "../../src/utils/referralCalculations";

export default function DealValueCard({
  formState,
  setFormState,
  referralData,
  dealAlreadyCalculated,
  onSave,
}) {
  const [showModal, setShowModal] = useState(false);

  const calculateDistribution = () => {
    const dealValue = Number(formState.dealValue || 0);
    if (!dealValue || dealValue <= 0) return null;
    return buildDealDistribution(dealValue, referralData);
  };

  const handleSave = () => {
    const dist = calculateDistribution();
    if (!dist) {
      alert("Enter a valid deal value");
      return;
    }
    onSave(dist);
    setShowModal(false);
  };

  const dist = formState.dealValue ? calculateDistribution() : null;
  const item = referralData?.service || referralData?.product;

  return (
    <div className="card serviceCard">
      <h2>{referralData?.service ? "Service" : "Product"} Card</h2>

      <div className="serviceImg">
        <img
          src={
            referralData?.service?.imageURL ||
            referralData?.product?.imageURL ||
            "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/No-Image-Placeholder-landscape.svg/1280px-No-Image-Placeholder-landscape.svg.png"
          }
          alt="Service/Product"
        />
      </div>

      <h3>{item?.name || "No Name"}</h3>

      <button
        className="calcDealBtn"
        onClick={() => setShowModal(true)}
        disabled={dealAlreadyCalculated}
      >
        {dealAlreadyCalculated
          ? "Deal Already Calculated"
          : "Calculate Deal Value"}
      </button>

      {showModal && (
        <div className="modalOverlay">
          <div className="modalContent">
            <h3>Enter Deal Value</h3>

            <label>
              Deal Value:
              <input
                type="number"
                name="dealValue"
                min="0"
                value={formState.dealValue}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    dealValue: e.target.value,
                  }))
                }
                placeholder="Enter deal value"
              />
            </label>

            {dist && (
              <div className="distribution-box">
                <h4>Distribution Breakdown</h4>
                <p>
                  <strong>Total Agreed Amount:</strong> ₹
                  {dist.agreedAmount.toFixed(2)}
                </p>
                <p>
                  <strong>Orbiter:</strong> ₹
                  {dist.orbiterShare.toFixed(2)}
                </p>
                <p>
                  <strong>Orbiter Mentor:</strong> ₹
                  {dist.orbiterMentorShare.toFixed(2)}
                </p>
                <p>
                  <strong>Cosmo Mentor:</strong> ₹
                  {dist.cosmoMentorShare.toFixed(2)}
                </p>
                <p>
                  <strong>UJustBe:</strong> ₹
                  {dist.ujustbeShare.toFixed(2)}
                </p>
              </div>
            )}

            <div className="modalActions">
              <button onClick={handleSave}>Save</button>
              <button
                className="cancelBtn"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
