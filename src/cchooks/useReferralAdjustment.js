"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  collection,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
  arrayUnion,
} from "firebase/firestore";

import { db } from "../../firebaseConfig";
import { COLLECTIONS } from "../../utility_collection";
import { applyAdjustmentBeforePayRoleCalc } from "../utils/referralCalculations";
import sanitizeForFirestore from "../utils/sanitizeForFirestore";

/**
 * 🔐 SINGLE SOURCE OF TRUTH
 * COLLECTION.userDetail → payment.orbiter.adjustmentRemaining
 *
 * COLLECTION.referral → VIEW ONLY
 */
export const useReferralAdjustment = (referralId, orbiterUjbCode) => {
  const [loading, setLoading] = useState(false);
  const [loadingInit, setLoadingInit] = useState(false);
  const [error, setError] = useState(null);

  // UI-only cache (NOT used for business logic)
  const [profileDocId, setProfileDocId] = useState(null);
  const [globalRemaining, setGlobalRemaining] = useState(0);
  const [feeType, setFeeType] = useState("adjustment");

  const initLoaded = useRef(false);

  /* --------------------------------------------------
     LOAD ORBITER ADJUSTMENT BUCKET (UI DISPLAY ONLY)
  -------------------------------------------------- */
  const loadProfileAdjustment = useCallback(async () => {
    if (!orbiterUjbCode || initLoaded.current) return;
    initLoaded.current = true;

    try {
      setLoadingInit(true);

      const q = query(
        collection(db, COLLECTIONS.userDetail),
        where("UJBCode", "==", orbiterUjbCode)
      );

      const snap = await getDocs(q);
      if (snap.empty) return;

      const d = snap.docs[0];
      const orb = d.data()?.payment?.orbiter || {};

      const remaining = Math.max(
        Number(orb.adjustmentRemaining ?? 0),
        0
      );

      setProfileDocId(d.id);
      setGlobalRemaining(remaining);
      setFeeType(orb.feeType || "adjustment");
    } catch (e) {
      console.error(e);
      setError("Failed to load adjustment bucket");
    } finally {
      setLoadingInit(false);
    }
  }, [orbiterUjbCode]);

  useEffect(() => {
    initLoaded.current = false;
    loadProfileAdjustment();
  }, [loadProfileAdjustment]);

  /* --------------------------------------------------
     APPLY ADJUSTMENT (PREVIEW OR COMMIT)
  -------------------------------------------------- */
  const applyAdjustmentForRole = useCallback(
    async ({
      role,
      requestedAmount,
      dealValue,
      ujbCode,
      referral,
      previewOnly = false,
    }) => {
      const req = Math.max(0, Number(requestedAmount || 0));
      if (!ujbCode || req <= 0) {
        return { cashToPay: req, deducted: 0 };
      }

      /* ---------- LOAD USERDETAIL (AUTHORITATIVE) ---------- */
      let targetDocId = null;
      let bucketRemaining = 0;
      let bucketFeeType = "adjustment";
      let existingLogs = [];

      const q = query(
        collection(db, COLLECTIONS.userDetail),
        where("UJBCode", "==", ujbCode)
      );

      const snap = await getDocs(q);
      if (!snap.empty) {
        const d = snap.docs[0];
        targetDocId = d.id;

        const orb = d.data()?.payment?.orbiter || {};
        bucketRemaining = Math.max(Number(orb.adjustmentRemaining ?? 0), 0);
        bucketFeeType = orb.feeType || "adjustment";
        existingLogs = Array.isArray(orb.adjustmentLogs)
          ? orb.adjustmentLogs
          : [];
      }

      if (!targetDocId || bucketRemaining <= 0) {
        return {
          cashToPay: req,
          deducted: 0,
          newGlobalRemaining: bucketRemaining,
          previewOnly,
        };
      }

      /* ---------- CALC ---------- */
      const {
        deducted,
        remainingForCash,
        newGlobalRemaining,
        logEntry,
      } = applyAdjustmentBeforePayRoleCalc({
        requestedAmount: req,
        userDetailData: {
          adjustmentRemaining: bucketRemaining,
          feeType: bucketFeeType,
        },
        referral,
        dealValue,
        role,
        ujbCode,
      });

      if (previewOnly) {
        return {
          previewOnly: true,
          deducted,
          cashToPay: remainingForCash,
          newGlobalRemaining,
        };
      }

      if (!deducted || deducted <= 0) {
        return {
          cashToPay: remainingForCash,
          deducted: 0,
          newGlobalRemaining: bucketRemaining,
        };
      }

      // ONLY CHANGE SHOWN (DO NOT REMOVE OTHER CODE)

      const safeLog = sanitizeForFirestore({
        id: `adj_${Date.now()}`, // ✅ REQUIRED for multiple logs
        ...logEntry,
        previousRemaining: bucketRemaining,
        newRemaining: Math.max(newGlobalRemaining, 0),
        createdAt: new Date().toISOString(),
        _v: 1,
      });


      /* ---------- WRITE ---------- */
      await updateDoc(
        doc(db, COLLECTIONS.userDetail, targetDocId),
        {
          "payment.orbiter.adjustmentRemaining": newGlobalRemaining,
          "payment.orbiter.adjustmentCompleted": newGlobalRemaining === 0,
          "payment.orbiter.adjustmentLogs": arrayUnion(safeLog),
        }
      );

      if (referral?.id) {
        await updateDoc(
          doc(db, COLLECTIONS.ccreferral, referral.id),
          {
            adjustmentLogs: arrayUnion({
              type: safeLog.type,
              role: safeLog.role,
              deducted: safeLog.deducted,
              remainingForCash: safeLog.remainingForCash,
              dealValue: safeLog.dealValue,
              ujbCode: safeLog.ujbCode,
              createdAt: safeLog.createdAt,
            }),
          }
        );
      }

      return {
        cashToPay: remainingForCash,
        deducted,
        newGlobalRemaining,
        logEntry: safeLog,
      };
    },
    [orbiterUjbCode]
  );


  return {
    loading,
    loadingInit,
    error,
    profileDocId,
    globalRemaining, // UI display only
    feeType,
    applyAdjustmentForRole,
  };
};
