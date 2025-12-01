// src/hooks/useReferralAdjustment.js
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  collection,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
  arrayUnion,
  serverTimestamp,
  increment,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { COLLECTIONS } from "/utility_collection";
import { applyOrbiterAdjustmentCalc } from "../utils/referralCalculations";

export const useReferralAdjustment = (referralId, orbiterUjbCode) => {
  const [loading, setLoading] = useState(false);
  const [loadingInit, setLoadingInit] = useState(false);
  const [error, setError] = useState(null);
  const [profileDocId, setProfileDocId] = useState(null);
  const [globalRemaining, setGlobalRemaining] = useState(0);
  const [feeType, setFeeType] = useState(null);

  const loadProfileAdjustment = useCallback(async () => {
    try {
      if (!orbiterUjbCode) return;

      setLoadingInit(true);
      setError(null);

      const q = query(
        collection(db, COLLECTIONS.userDetail),
        where("UJBCode", "==", orbiterUjbCode)
      );

      const snap = await getDocs(q);

      if (snap.empty) {
        setProfileDocId(null);
        setGlobalRemaining(0);
        setFeeType(null);
        setLoadingInit(false);
        return;
      }

      const docSnap = snap.docs[0];
      const data = docSnap.data() || {};
      const orb = data.payment?.orbiter || {};

      setProfileDocId(docSnap.id);
      setGlobalRemaining(orb.adjustmentRemaining ?? 0);
      setFeeType(orb.feeType || null);
      setLoadingInit(false);
    } catch (err) {
      console.error("loadProfileAdjustment error:", err);
      setError(err?.message || "Failed to load adjustment info");
      setLoadingInit(false);
    }
  }, [orbiterUjbCode]);

  useEffect(() => {
    loadProfileAdjustment();
  }, [loadProfileAdjustment]);

  const applyAdjustmentBeforePayOrbiter = useCallback(
    async ({ requestedAmount, dealValue }) => {
      const safeAmount = Math.max(0, Number(requestedAmount) || 0);

      if (
        !referralId ||
        !orbiterUjbCode ||
        !profileDocId ||
        feeType !== "adjustment" ||
        globalRemaining <= 0
      ) {
        return {
          cashToPay: safeAmount,
          deducted: 0,
          newGlobalRemaining: globalRemaining,
          logEntry: null,
        };
      }

      setLoading(true);
      setError(null);

      try {
        const {
          deducted,
          remainingForOrbiterCash,
          newGlobalRemaining,
          logEntry,
        } = applyOrbiterAdjustmentCalc({
          requestedAmountForOrbiter: safeAmount,
          globalAdjustmentRemaining: globalRemaining,
          referral: { id: referralId },
          dealValue,
        });

        const profileRef = doc(db, COLLECTIONS.userDetail, profileDocId);
        await updateDoc(profileRef, {
          "payment.orbiter.adjustmentRemaining": increment(-deducted),
          "payment.orbiter.adjustmentCompleted": newGlobalRemaining <= 0,
        });

        const referralRef = doc(db, COLLECTIONS.referral, referralId);
        const updatePayload = {
          adjustmentRemaining: increment(-deducted),
        };

        if (logEntry) {
          updatePayload.adjustmentLogs = arrayUnion({
            ...logEntry,
            createdAt: serverTimestamp(),
          });
        }

        await updateDoc(referralRef, updatePayload);

        setGlobalRemaining(newGlobalRemaining);
        setLoading(false);

        return {
          cashToPay: remainingForOrbiterCash,
          deducted,
          newGlobalRemaining,
          logEntry,
        };
      } catch (err) {
        console.error("applyAdjustmentBeforePayOrbiter error:", err);
        setError(err?.message || "Failed to apply adjustment");
        setLoading(false);

        return {
          cashToPay: safeAmount,
          deducted: 0,
          newGlobalRemaining: globalRemaining,
          logEntry: null,
        };
      }
    },
    [feeType, globalRemaining, profileDocId, referralId, orbiterUjbCode]
  );

  return {
    loading,
    loadingInit,
    error,
    profileDocId,
    globalRemaining,
    feeType,
    applyAdjustmentBeforePayOrbiter,
    reloadAdjustment: loadProfileAdjustment,
  };
};
