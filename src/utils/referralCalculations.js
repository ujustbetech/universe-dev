// src/utils/referralCalculations.js

// ---------- helpers ----------
const toNumber = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isNaN(n) ? fallback : n;
};

// ---------------- AGREED VALUE FROM SERVICE/PRODUCT ----------------
/**
 * item.agreedValue:
 *   {
 *     mode: "single" | "multiple",
 *     single?: { type: "percentage" | "amount", value: number },
 *     multiple?: { slabs: [{ from, to, type, value }] }
 *   }
 *
 * Fallback (legacy): item.percentage (e.g. "2")
 */
export const calculateAgreedFromItem = (dealAmount, item) => {
  if (!item) return 0;

  const deal = toNumber(dealAmount);
  const av = item.agreedValue;

  // 🔙 Legacy: simple percentage
  if (!av) {
    const pct = toNumber(item.percentage, 0);
    return (deal * pct) / 100;
  }

  // SINGLE MODE
  if (av.mode === "single" && av.single) {
    const v = toNumber(av.single.value, 0);
    if (av.single.type === "percentage") return (deal * v) / 100;
    if (av.single.type === "amount") return v;
    return 0;
  }

  // MULTIPLE / SLAB MODE
  if (av.mode === "multiple" && Array.isArray(av.multiple?.slabs)) {
    const slabs = av.multiple.slabs.map((s) => ({
      ...s,
      from: toNumber(s.from),
      to: toNumber(s.to),
      value: toNumber(s.value),
    }));

    const candidates = slabs.filter((s) => deal >= s.from && deal <= s.to);
    if (!candidates.length) return 0;

    // best match: highest "from"
    const best = candidates.reduce((a, b) => (b.from > a.from ? b : a));

    if (best.type === "percentage") return (deal * best.value) / 100;
    if (best.type === "amount") return best.value;
    return 0;
  }

  return 0;
};

// ---------------- SPLIT AGREED AMOUNT (50/15/15/20) ----------------
export const splitAgreedAmount = (agreedAmount) => {
  const a = toNumber(agreedAmount);
  const r2 = (n) => Math.round(n * 100) / 100;

  return {
    orbiterShare: r2(a * 0.5),
    orbiterMentorShare: r2(a * 0.15),
    cosmoMentorShare: r2(a * 0.15),
    ujustbeShare: r2(a * 0.2),
  };
};

// ---------------- BUILD DISTRIBUTION FOR A DEAL ----------------
/**
 * referralData should contain either .service or .product
 */
export const buildDealDistribution = (dealValue, referralData) => {
  const deal = toNumber(dealValue);
  const item = referralData?.service || referralData?.product;

  const agreedAmount = calculateAgreedFromItem(deal, item);
  const shares = splitAgreedAmount(agreedAmount);

  // keep legacy % for reference if single % is used
  const percentage =
    item?.agreedValue?.mode === "single" &&
    item.agreedValue.single?.type === "percentage"
      ? toNumber(item.agreedValue.single.value)
      : toNumber(item?.percentage || 0);

  return {
    dealValue: deal,
    percentage,
    agreedAmount,
    ...shares,
    timestamp: new Date().toISOString(),
  };
};

// ---------------- AGREED AMOUNT FOR REFERRAL ----------------
export const getAgreedAmountFromReferral = (referralData, dealLogs) => {
  if (referralData?.agreedTotal) return toNumber(referralData.agreedTotal);

  if (Array.isArray(dealLogs) && dealLogs.length) {
    const last = dealLogs[dealLogs.length - 1];
    if (last?.agreedAmount) return toNumber(last.agreedAmount);
  }

  const deal = referralData?.dealValue;
  return buildDealDistribution(deal, referralData).agreedAmount;
};

// ---------------- COSMO → UJB PAID SO FAR ----------------
export const getCosmoPaidSoFar = (payments = []) =>
  payments.reduce((sum, p) => {
    if (p.paymentFrom === "CosmoOrbiter" && p.paymentTo === "UJustBe") {
      return sum + toNumber(p.amountReceived);
    }
    return sum;
  }, 0);

// ---------------- EARNED SHARES FROM COSMO PAID ----------------
export const computeEarnedShares = (cosmoPaid) => {
  return splitAgreedAmount(cosmoPaid);
};

// ===================================================================
//  🔥 GLOBAL ORBITER ADJUSTMENT (PROFILE LEVEL) + REFERRAL LOGGING
// ===================================================================
/**
 * PURE calculation. It does NOT talk to Firestore.
 *
 * Inputs:
 *  - requestedAmountForOrbiter: How much this referral wants to pay to Orbiter (₹)
 *  - globalAdjustmentRemaining: From usersdetail.payment.orbiter.adjustmentRemaining
 *  - referral: { id, referralId? }  (metadata, only used inside log entry)
 *  - dealValue: deal amount for this referral (for log context only)
 *
 * Output:
 *  {
 *    deducted: number,               // how much got adjusted this time
 *    remainingForOrbiterCash: number,// how much cash we actually pay Orbiter now
 *    newGlobalRemaining: number,     // new profile-level remaining balance
 *    logEntry: { ... } | null        // single log object for referral.adjustmentLogs
 *  }
 */
export const applyOrbiterAdjustmentCalc = ({
  requestedAmountForOrbiter,
  globalAdjustmentRemaining,
  referral,
  dealValue,
}) => {
  const req = toNumber(requestedAmountForOrbiter, 0);
  const globalRem = toNumber(globalAdjustmentRemaining, 0);

  // Nothing to adjust
  if (req <= 0 || globalRem <= 0) {
    return {
      deducted: 0,
      remainingForOrbiterCash: req,
      newGlobalRemaining: globalRem,
      logEntry: null,
    };
  }

  // Amount that can be adjusted from this payment
  const deducted = Math.min(req, globalRem);
  const remainingForOrbiterCash = req - deducted;
  const newGlobalRemaining = globalRem - deducted;

  const logEntry = {
    type: "OrbiterFeeAdjustment",
    deducted,
    requestedAmount: req,
    remainingForOrbiterCash,
    globalRemainingAfter: newGlobalRemaining,
    dealValue: dealValue != null ? toNumber(dealValue, 0) : null,
    referralId: referral?.referralId || referral?.id || null,
    deductedFrom: "orbiterShare",
    createdAt: new Date().toISOString(),
  };

  return {
    deducted,
    remainingForOrbiterCash,
    newGlobalRemaining,
    logEntry,
  };
};
