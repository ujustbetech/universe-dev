// hooks/useReferralDetails.js
import { useEffect, useState } from "react";
import {
  doc,
  getDoc,
  updateDoc,
  onSnapshot,
  Timestamp,
  arrayUnion,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { COLLECTIONS } from "../../utility_collection"; // ✅ use your central mapping

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

  useEffect(() => {
    if (!id) return;

    const ref = doc(db, COLLECTIONS.referral, id); // ✅ fixed

    const unsub = onSnapshot(
      ref,
      async (snap) => {
        if (!snap.exists()) {
          console.error("Referral not found:", id);
          setLoading(false);
          return;
        }

        const data = snap.data();
        setReferralData(data);

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

        // Orbiter profile
        if (data.orbiter?.phone) {
          const oSnap = await getDoc(
            doc(db, COLLECTIONS.userDetail, data.orbiter.phone)
          );
          if (oSnap.exists()) setOrbiter({ ...data.orbiter, ...oSnap.data() });
          else setOrbiter(data.orbiter);
        } else {
          setOrbiter(data.orbiter || null);
        }

        // Cosmo profile
        if (data.cosmoOrbiter?.phone) {
          const cSnap = await getDoc(
            doc(db, COLLECTIONS.userDetail, data.cosmoOrbiter.phone)
          );
          if (cSnap.exists())
            setCosmoOrbiter({ ...data.cosmoOrbiter, ...cSnap.data() });
          else setCosmoOrbiter(data.cosmoOrbiter);
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

  const handleStatusUpdate = async (newStatus) => {
    if (!id) return;
    try {
      await updateDoc(doc(db, COLLECTIONS.referral, id), {
        dealStatus: newStatus,
        statusLogs: arrayUnion({
          status: newStatus,
          updatedAt: Timestamp.now(),
        }),
      });

      const eligible = [
        "Deal Won",
        "Work in Progress",
        "Work Completed",
        "Received Part Payment and Transferred to UJustBe",
        "Received Full and Final Payment",
        "Agreed % Transferred to UJustBe",
      ];
      if (eligible.includes(newStatus)) setDealEverWon(true);
    } catch (e) {
      console.error("Status update failed:", e);
    }
  };

  const handleSaveDealLog = async (distribution) => {
    if (!id || !distribution) return;
    try {
      await updateDoc(doc(db, COLLECTIONS.referral, id), {
        dealLogs: [distribution],
        lastDealCalculatedAt: Timestamp.now(),
        agreedTotal: distribution.agreedAmount,
      });

      setDealLogs([distribution]);
      setDealAlreadyCalculated(true);
    } catch (e) {
      console.error("Deal log save failed:", e);
    }
  };

  const addFollowup = async (f) => {
    if (!id) return;
    const entry = {
      priority: f.priority || "Medium",
      date: f.date || new Date().toISOString().split("T")[0],
      description: f.description || "",
      status: f.status || "Pending",
      createdAt: Date.now(),
    };

    const current = Array.isArray(followups) ? followups : [];
    const updated = [...current, entry];

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
  };
}
