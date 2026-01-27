// src/hooks/useReferralDetails.js
import { useEffect, useState } from "react";
import {
  doc,
  getDoc,
  updateDoc,
  onSnapshot,
  Timestamp,
  arrayUnion,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../firebaseConfig";
import { COLLECTIONS } from "../../utility_collection";

export default function useReferralDetails(id) {
  const [loading, setLoading] = useState(true);

  const [referralData, setReferralData] = useState(null);
  const [orbiter, setOrbiter] = useState(null);
  const [cosmoOrbiter, setCosmoOrbiter] = useState(null);

  const [payments, setPayments] = useState([]);
  const [followups, setFollowups] = useState([]);

  const [formState, setFormState] = useState({
    dealStatus: "Pending",
    dealValue: "",
    referralType: "",
    referralSource: "",
  });

  const [dealLogs, setDealLogs] = useState([]);
  const [dealAlreadyCalculated, setDealAlreadyCalculated] = useState(false);
  const [dealEverWon, setDealEverWon] = useState(false);

  /* ------------------------------------------------------
     REALTIME REFERRAL LISTENER
  ------------------------------------------------------ */
  useEffect(() => {
    if (!id) return;

    const refDoc = doc(db, COLLECTIONS.referral, id);

    const unsub = onSnapshot(
      refDoc,
      async (snap) => {
        if (!snap.exists()) {
          console.error("Referral not found:", id);
          setLoading(false);
          return;
        }

        const data = snap.data();
        setReferralData(data);

        /* Update local form state */
        setFormState((prev) => ({
          ...prev,
          dealStatus: data.dealStatus || "Pending",
          dealValue: data.dealValue || "",
          referralType: data.referralType || "",
          referralSource: data.referralSource || "",
        }));

        setPayments(data.payments || []);
        setFollowups(data.followups || []);

        const logs = data.dealLogs || [];
        setDealLogs(logs);
        setDealAlreadyCalculated(logs.length > 0);

        const eligible = [
          "Deal Won",
          "Work in Progress",
          "Work Completed",
          "Received Part Payment and Transferred to UJustBe",
          "Received Full and Final Payment",
          "Agreed % Transferred to UJustBe",
        ];
        if (eligible.includes(data.dealStatus)) setDealEverWon(true);

        /* ------------------------------------------------
           LOAD ORBITER PROFILE (USING UJBCode)
        ------------------------------------------------ */
        if (data.orbiter?.ujbCode || data.orbiter?.UJBCode) {
          const orbCode = data.orbiter.ujbCode || data.orbiter.UJBCode;

          try {
            const oSnap = await getDoc(
              doc(db, COLLECTIONS.userDetail, orbCode)
            );

            if (oSnap.exists()) {
              setOrbiter({ ...data.orbiter, ...oSnap.data() });
            } else {
              setOrbiter(data.orbiter);
            }
          } catch (e) {
            console.error("Orbiter profile load failed:", e);
            setOrbiter(data.orbiter || null);
          }
        } else {
          setOrbiter(data.orbiter || null);
        }

        /* ------------------------------------------------
           LOAD COSMO ORBITER PROFILE (FIXED)
           Previously was loading using .phone → WRONG
        ------------------------------------------------ */
        if (data.cosmoOrbiter?.ujbCode || data.cosmoOrbiter?.UJBCode) {
          const cosmoCode =
            data.cosmoOrbiter.ujbCode || data.cosmoOrbiter.UJBCode;

          try {
            const cSnap = await getDoc(
              doc(db, COLLECTIONS.userDetail, cosmoCode)
            );

            if (cSnap.exists()) {
              setCosmoOrbiter({ ...data.cosmoOrbiter, ...cSnap.data() });
            } else {
              setCosmoOrbiter(data.cosmoOrbiter);
            }
          } catch (e) {
            console.error("Cosmo profile load failed:", e);
            setCosmoOrbiter(data.cosmoOrbiter || null);
          }
        } else {
          setCosmoOrbiter(data.cosmoOrbiter || null);
        }

        setLoading(false);
      },
      (err) => {
        console.error("Snapshot error:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [id]);

  /* ------------------------------------------------------
     STATUS UPDATE
  ------------------------------------------------------ */
const handleStatusUpdate = async (newStatus) => {
  if (!id) return;

  try {
    // Fallback protection
    const finalStatus =
      newStatus ??
      formState?.dealStatus ??
      "Pending"; // safe fallback

    if (!finalStatus || finalStatus === undefined) {
      console.error("Invalid status passed to handleStatusUpdate:", newStatus);
      return;
    }

    // Create safe payload (remove undefined values)
    const payload = {
      dealStatus: finalStatus,
      statusLogs: arrayUnion({
        status: finalStatus,
        updatedAt: Timestamp.now(),
      }),
    };

    // Remove anything undefined (Firestore does NOT accept undefined)
    Object.keys(payload).forEach((k) => {
      if (payload[k] === undefined) delete payload[k];
    });

    // Firestore update
    await updateDoc(doc(db, COLLECTIONS.referral, id), payload);

    // Detect statuses that make dealEverWon = true
    const eligible = [
      "Deal Won",
      "Work in Progress",
      "Work Completed",
      "Received Part Payment and Transferred to UJustBe",
      "Received Full and Final Payment",
      "Agreed % Transferred to UJustBe",
    ];

    if (eligible.includes(finalStatus)) setDealEverWon(true);

    // Update local state
    setFormState((prev) => ({
      ...prev,
      dealStatus: finalStatus,
    }));
  } catch (e) {
    console.error("Status update failed:", e);
  }
};


  /* ------------------------------------------------------
     DEAL LOG SAVE
  ------------------------------------------------------ */
/* ------------------------------------------------------
   DEAL LOG SAVE  ✅ FIXED (APPEND, NOT OVERWRITE)
------------------------------------------------------ */
const handleSaveDealLog = async (distribution) => {
  if (!id || !distribution) return;

  try {
    const newDealLog = {
      ...distribution,

      // audit & safety
      dealStatus: formState?.dealStatus || referralData?.dealStatus || "Deal Won",
      timestamp: new Date().toISOString(),
      lastDealCalculatedAt: Timestamp.now(),
    };

    await updateDoc(doc(db, COLLECTIONS.referral, id), {
      dealLogs: arrayUnion(newDealLog), // ✅ KEEP PREVIOUS LOGS
      lastDealCalculatedAt: Timestamp.now(),
      agreedTotal: distribution.agreedAmount,
      dealValue: distribution.dealValue,
    });

    // Update local state (append, not replace)
    setDealLogs((prev = []) => [...prev, newDealLog]);
    setDealAlreadyCalculated(true);
  } catch (e) {
    console.error("Deal log save failed:", e);
  }
};

  /* ------------------------------------------------------
     FOLLOWUPS CRUD
  ------------------------------------------------------ */
  const addFollowup = async (f) => {
    if (!id) return;
    const entry = {
      priority: f.priority || "Medium",
      date: f.date || new Date().toISOString().split("T")[0],
      description: f.description || "",
      status: f.status || "Pending",
      createdAt: Date.now(),
    };

    const updated = [...(followups || []), entry];

    try {
      await updateDoc(doc(db, COLLECTIONS.referral, id), {
        followups: updated,
      });
      setFollowups(updated);
    } catch (e) {
      console.error("Add follow-up failed:", e);
    }
  };

  const editFollowup = async (index, updatedItem) => {
    if (!id) return;
    const arr = [...followups];
    arr[index] = updatedItem;
    try {
      await updateDoc(doc(db, COLLECTIONS.referral, id), {
        followups: arr,
      });
      setFollowups(arr);
    } catch (e) {
      console.error("Edit follow-up failed:", e);
    }
  };

  const deleteFollowup = async (index) => {
    if (!id) return;
    const arr = [...followups];
    arr.splice(index, 1);

    try {
      await updateDoc(doc(db, COLLECTIONS.referral, id), {
        followups: arr,
      });
      setFollowups(arr);
    } catch (e) {
      console.error("Delete follow-up failed:", e);
    }
  };

  /* ------------------------------------------------------
     FILE UPLOADS
  ------------------------------------------------------ */
  const uploadReferralFile = async (file, type = "supporting") => {
    if (!id || !file) return { error: "Missing file or referral ID" };

    try {
      const path = `referrals/${id}/${type}-${Date.now()}-${file.name}`;
      const storageRef = ref(storage, path);

      await uploadBytes(storageRef, file);

      const url = await getDownloadURL(storageRef);

      const refDoc = doc(db, COLLECTIONS.referral, id);

      if (type === "invoice") {
        await updateDoc(refDoc, {
          invoiceUrl: url,
          invoiceName: file.name,
        });
      } else {
        await updateDoc(refDoc, {
          supportingDocs: arrayUnion({
            url,
            name: file.name,
            type,
            uploadedAt: Date.now(),
          }),
        });
      }

      return { success: true, url };
    } catch (e) {
      console.error("File upload failed:", e);
      return { error: "File upload failed" };
    }
  };

  const uploadInvoice = async (file) => uploadReferralFile(file, "invoice");
  const uploadSupportingDoc = async (file, type = "supporting") =>
    uploadReferralFile(file, type);
  const uploadLeadDoc = async (file) => uploadReferralFile(file, "lead");

  /* ------------------------------------------------------
     RETURN HOOK VALUES
  ------------------------------------------------------ */
  return {
    loading,
    referralData,
    orbiter,
    cosmoOrbiter,
    payments,
    setPayments,
    followups,
    formState,
    setFormState,
    dealLogs,
    dealAlreadyCalculated,
    dealEverWon,
    handleStatusUpdate,
    handleSaveDealLog,
    addFollowup,
    editFollowup,
    deleteFollowup,
    uploadInvoice,
    uploadSupportingDoc,
    uploadLeadDoc,
  };
}