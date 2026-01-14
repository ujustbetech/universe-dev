import React, { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import '../../src/app/styles/page/_referral.scss';
import Layout from "../../component/Layout";
import "../../src/app/styles/main.scss";
/* ================= HELPERS ================= */

const toDate = (ts) => {
  if (!ts) return null;
  if (ts.seconds) return new Date(ts.seconds * 1000);
  if (typeof ts === "string") return new Date(ts);
  return null;
};

const daysDiff = (d) =>
  Math.floor((new Date() - d) / (1000 * 60 * 60 * 24));

/* ================= MAIN ================= */

export default function AdminAlertsAndFlags() {
  const [prospects, setProspects] = useState([]);
  const [referrals, setReferrals] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [conclaves, setConclaves] = useState([]);
  const [users, setUsers] = useState([]);

  /* ================= FIRESTORE ================= */

  useEffect(() => {
    const unsubPros = onSnapshot(
      collection(db, "Prospects"),
      (snap) => setProspects(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );

    const unsubRef = onSnapshot(
      collection(db, "Referraldev"),
      (snap) => setReferrals(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );

    const unsubMM = onSnapshot(
      collection(db, "MonthlyMeeting"),
      (snap) => setMeetings(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );

    const unsubCC = onSnapshot(
      collection(db, "Conclaves"),
      (snap) => setConclaves(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );

    const unsubUsers = onSnapshot(
      collection(db, "usersdetail"),
      (snap) => setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );

    return () => {
      unsubPros();
      unsubRef();
      unsubMM();
      unsubCC();
      unsubUsers();
    };
  }, []);

  /* ================= ALERT ENGINE ================= */

  const alerts = useMemo(() => {
    const list = [];
    const today = new Date();

    /* 🔴 OVERDUE FOLLOW-UPS */
    prospects.forEach((p) => {
      const d = toDate(p.updatedAt || p.registeredAt);
      if (!d) return;
      const overdueDays = daysDiff(d);

      if (p.status !== "Closed" && overdueDays >= 3) {
        list.push({
          type: "Overdue Follow-up",
          message: `Follow-up overdue by ${overdueDays} days`,
          priority: "High",
        });
      }
    });

    /* 🔴 HIGH PENDING PAYMENTS */
    referrals.forEach((r) => {
      const planned =
        Number(r.agreedAmount) || Number(r.dealValue) || 0;
      const paid = (r.payments || []).reduce(
        (s, p) => s + Number(p.amountReceived || 0),
        0
      );

      if (planned - paid > 50000) {
        list.push({
          type: "High Pending Payment",
          message: `Pending ₹${planned - paid}`,
          priority: "High",
        });
      }
    });

    /* 🟡 LOW ACTIVITY USERS */
    users.forEach((u) => {
      const hasActivity =
        prospects.some((p) => p.orbiterContact === u.MobileNo) ||
        meetings.some((m) =>
          m.invitedUsers?.some((x) => x.mobile === u.MobileNo)
        ) ||
        conclaves.some((c) => c.orbiters?.includes(u.MobileNo));

      if (!hasActivity) {
        list.push({
          type: "Low Activity",
          message: `${u.Name} has no recent activity`,
          priority: "Medium",
        });
      }
    });

    /* 🟢 UPCOMING EVENTS */
    meetings.forEach((m) => {
      const d = toDate(m.time);
      if (!d) return;
      if (daysDiff(d) === -1) {
        list.push({
          type: "Upcoming Session",
          message: "Monthly Meeting scheduled tomorrow",
          priority: "Low",
        });
      }
    });

    conclaves.forEach((c) => {
      const d = toDate(c.startDate);
      if (!d) return;
      if (daysDiff(d) === -1) {
        list.push({
          type: "Upcoming Session",
          message: "Conclave scheduled tomorrow",
          priority: "Low",
        });
      }
    });

    return list;
  }, [prospects, referrals, meetings, conclaves, users]);

  /* ================= UI ================= */

  return (
    <Layout>
    <div className="admin-page">
      <h2 className="page-title">Alerts & Action Flags</h2>

      <div className="panel">
        {alerts.length === 0 && <p>No alerts 🎉</p>}

        {alerts.map((a, i) => (
          <div
            key={i}
            className={`alert-row ${a.priority.toLowerCase()}`}
          >
            <strong>{a.type}</strong>
            <span>{a.message}</span>
            <span className="priority">{a.priority}</span>
          </div>
        ))}
      </div>
    </div>
    </Layout>
  );
}
