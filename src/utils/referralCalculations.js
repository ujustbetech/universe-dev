// src/utils/referralCalculations.js

const toNumber = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isNaN(n) ? fallback : n;
};

/* -------------------------------------------------
   AGREED VALUE CALCULATION
------------------------------------------------- */
export const calculateAgreedFromItem = (dealAmount, item) => {
  if (!item) return 0;

  const deal = toNumber(dealAmount);
  const av = item.agreedValue;

  if (!av) {
    const pct = toNumber(item.percentage, 0);
    return (deal * pct) / 100;
  }

  if (av.mode === "single") {
    const s = av.single || item.single;
    if (!s) return 0;

    const v = toNumber(s.value, 0);
    return s.type === "percentage" ? (deal * v) / 100 : v;
  }

  if (av.mode === "multiple") {
    const rawSlabs =
      av.multiple?.slabs?.length
        ? av.multiple.slabs
        : av.multiple?.itemSlabs || [];

    if (!rawSlabs.length) return 0;

    const slabs = rawSlabs.map((s) => ({
      ...s,
      from: toNumber(s.from),
      to: s.to === "" || s.to == null ? Infinity : toNumber(s.to),
      value: toNumber(s.value),
    }));

    const match = slabs
      .filter((s) => deal >= s.from && deal <= s.to)
      .sort((a, b) => b.from - a.from)[0];

    if (!match) return 0;

    return match.type === "percentage"
      ? (deal * match.value) / 100
      : match.value;
  }

  return 0;
};

/* -------------------------------------------------
   DEAL DISTRIBUTION  ✅ THIS WAS MISSING
------------------------------------------------- */
export const buildDealDistribution = (dealValue, referralData) => {
  const deal = toNumber(dealValue);

  const item =
    referralData?.service ||
    referralData?.product ||
    referralData?.services?.[0] ||
    referralData?.products?.[0] ||
    null;

  const agreedAmount = calculateAgreedFromItem(deal, item);

  const r2 = (n) => Math.round(n * 100) / 100;

  const orbiterShare = r2(agreedAmount * 0.5);
  const orbiterMentorShare = r2(agreedAmount * 0.15);
  const cosmoMentorShare = r2(agreedAmount * 0.15);

  let ujustbeShare = r2(agreedAmount * 0.2);

  const total =
    orbiterShare +
    orbiterMentorShare +
    cosmoMentorShare +
    ujustbeShare;

  const diff = r2(agreedAmount - total);
  if (diff !== 0) ujustbeShare = r2(ujustbeShare + diff);

  let percentage = 0;
  if (
    item?.agreedValue?.mode === "single" &&
    item.agreedValue.single?.type === "percentage"
  ) {
    percentage = toNumber(item.agreedValue.single.value);
  } else {
    percentage = toNumber(item?.percentage);
  }

  return {
    dealValue: deal,
    percentage,
    agreedAmount,
    orbiterShare,
    orbiterMentorShare,
    cosmoMentorShare,
    ujustbeShare,
    timestamp: new Date().toISOString(),
  };
};

/* -------------------------------------------------
   ADJUSTMENT CALC (ALREADY FIXED)
------------------------------------------------- */
export const applyAdjustmentBeforePayRoleCalc = ({
  requestedAmount,
  userDetailData,
  dealValue,
  role,
  ujbCode,
  referral,
}) => {
  const req = Number(requestedAmount || 0);
  const prev = Math.max(
    Number(userDetailData?.adjustmentRemaining || 0),
    0
  );

  // STOP conditions
  if (req <= 0 || prev <= 0) {
    return {
      deducted: 0,
      remainingForCash: req,
      newGlobalRemaining: prev,
      logEntry: null,
    };
  }

  // ✅ CORE LOGIC (AS YOU SAID)
  const deducted = Math.min(req, prev);     // 900
  const newRemaining = prev - deducted;     // 100
  const remainingForCash = req - deducted;  // 0

  const logEntry = {
    type: "RoleFeeAdjustment",
    role: role || null,
    ujbCode: ujbCode || null,

    requestedAmount: req,
    deducted,
    remainingForCash,

    previousRemaining: prev,
    newRemaining,

    dealValue: dealValue ?? null,
    referralId: referral?.id ?? null,

    deductedFrom: "orbiter",
    feeType: "adjustment",
    createdAt: new Date().toISOString(),
    _v: 1,
  };

  return {
    deducted,
    remainingForCash,
    newGlobalRemaining: newRemaining,
    logEntry,
  };
};

