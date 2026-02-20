export function buildCCDealDistribution(dealValue, referralData) {

  const agreedPercent =
    Number(referralData?.agreedPercentage?.finalAgreedPercent || 0);

  const ccModel = referralData?.ccModel?.type;

  let finalDealValue = Number(dealValue || 0);

  /* ================= DISCOUNT MODEL ================= */

  if (ccModel === "DISCOUNT") {

    const discount =
      Number(referralData?.ccModel?.discountPercent || 0);

    finalDealValue =
      finalDealValue - (finalDealValue * discount / 100);

  }

  /* ================= ADDITIONAL % MODEL ================= */

  if (ccModel === "ADDITIONAL_PERCENT") {

    const add =
      Number(referralData?.ccModel?.additionalPercent || 0);

    agreedPercent += add;

  }

  /* ================= AGREED AMOUNT ================= */

  const agreedAmount =
    finalDealValue * agreedPercent / 100;

  /* ================= CC SOP SPLIT ================= */

  const orbiterShare = agreedAmount / 2;
  const ujustbeShare = agreedAmount / 2;

  return {

    finalDealValue,
    agreedPercent,
    agreedAmount,

    orbiterShare,
    ujustbeShare,

    orbiterMentorShare: 0,
    cosmoMentorShare: 0

  };
}
