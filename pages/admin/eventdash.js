import React, { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import Layout from "../../component/Layout";
import "../../src/app/styles/page/_referral.scss";
import "../../src/app/styles/main.scss";

/* ================= HELPERS ================= */

const toDate = (ts) => {
  if (!ts) return null;
  if (ts.seconds) return new Date(ts.seconds * 1000);
  if (typeof ts === "string") return new Date(ts);
  return null;
};

const attendanceColor = (pct) => {
  if (pct >= 75) return "#16a34a";
  if (pct >= 50) return "#ca8a04";
  return "#dc2626";
};

/* ================= MAIN ================= */

export default function AdminEventSessionTracking() {
  const [meetings, setMeetings] = useState([]);
  const [conclaves, setConclaves] = useState([]);
  const [referrals, setReferrals] = useState([]);
  const [prospects, setProspects] = useState([]);

  /* ================= FIRESTORE ================= */

  useEffect(() => {
    const unsubMM = onSnapshot(
      collection(db, "MonthlyMeeting"),
      (snap) => setMeetings(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );

    const unsubCC = onSnapshot(
      collection(db, "Conclaves"),
      (snap) => setConclaves(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );

    const unsubRef = onSnapshot(
      collection(db, "Referraldev"),
      (snap) => setReferrals(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );

    const unsubPros = onSnapshot(
      collection(db, "Prospects"),
      (snap) => setProspects(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );

    return () => {
      unsubMM();
      unsubCC();
      unsubRef();
      unsubPros();
    };
  }, []);

  /* ================= SESSION SUMMARY ================= */

  const summary = useMemo(() => {
    let totalSessions = meetings.length + conclaves.length;
    let invited = 0;
    let attended = 0;
    let referralsGenerated = 0;
    let enrollmentsCompleted = 0;

    meetings.forEach(m => {
      invited += m.invitedUsers?.length || 0;
      attended += m.invitedUsers?.length || 0;
      referralsGenerated += m.referralSections?.length || 0;
    });

    conclaves.forEach(c => {
      invited += (c.orbiters?.length || 0) + (c.ntMembers?.length || 0);
      attended += (c.orbiters?.length || 0) + (c.ntMembers?.length || 0);
    });

    referrals.forEach(r => {
      if (r.cosmoOrbiter?.dealStatus?.includes("Received")) {
        enrollmentsCompleted++;
      }
    });

    const attendancePct = invited ? Math.round((attended / invited) * 100) : 0;

    return {
      totalSessions,
      invited,
      attended,
      attendancePct,
      referralsGenerated,
      enrollmentsCompleted,
    };
  }, [meetings, conclaves, referrals]);

  /* ================= SESSION TABLE ================= */

  const sessionTable = useMemo(() => {
    const rows = [];

    meetings.forEach(m => {
      const invited = m.invitedUsers?.length || 0;
      const attended = invited;
      rows.push({
        name: "Monthly Meeting",
        date: toDate(m.time)?.toLocaleDateString(),
        invited,
        attended,
        attendancePct: invited ? Math.round((attended / invited) * 100) : 0,
        referrals: m.referralSections?.length || 0,
      });
    });

    conclaves.forEach(c => {
      const invited = (c.orbiters?.length || 0) + (c.ntMembers?.length || 0);
      const attended = invited;
      rows.push({
        name: "Conclave / E2A",
        date: toDate(c.startDate)?.toLocaleDateString(),
        invited,
        attended,
        attendancePct: invited ? Math.round((attended / invited) * 100) : 0,
        referrals: 0,
      });
    });

    return rows;
  }, [meetings, conclaves]);

  /* ================= FUNNEL ================= */

  const funnelData = useMemo(() => {
    let generated = 0;
    let completed = 0;

    meetings.forEach(m => generated += m.referralSections?.length || 0);
    referrals.forEach(r => {
      if (r.cosmoOrbiter?.dealStatus?.includes("Received")) completed++;
    });

    return [
      { name: "Generated", value: generated },
      { name: "Completed", value: completed },
    ];
  }, [meetings, referrals]);

  /* ================= TREND ================= */

  const trendData = useMemo(() => {
    const map = {};

    meetings.forEach(m => {
      const d = toDate(m.time);
      if (!d) return;
      const key = d.toISOString().split("T")[0];
      map[key] = (map[key] || 0) + 1;
    });

    conclaves.forEach(c => {
      const d = toDate(c.startDate);
      if (!d) return;
      const key = d.toISOString().split("T")[0];
      map[key] = (map[key] || 0) + 1;
    });

    return Object.entries(map).map(([date, sessions]) => ({
      date,
      sessions,
    }));
  }, [meetings, conclaves]);

  /* ================= FOLLOWUPS ================= */

  const followups = useMemo(() => {
    let completed = 0;
    let pending = 0;
    prospects.forEach(p => {
      p.status === "Closed" ? completed++ : pending++;
    });
    return { completed, pending };
  }, [prospects]);

  /* ================= UI ================= */

  return (
    <Layout>
      <div className="admin-page">
        <h2 className="page-title">Event & Session Tracking</h2>

        {/* SUMMARY CARDS */}
        <div className="card-grid">
          <Card label="Total Sessions" value={summary.totalSessions} />
          <Card label="Attendance %" value={`${summary.attendancePct}%`} color={attendanceColor(summary.attendancePct)} />
          <Card label="Referrals Generated" value={summary.referralsGenerated} />
          <Card label="Enrollments Completed" value={summary.enrollmentsCompleted} />
        </div>

        {/* FUNNEL + FOLLOWUPS */}
        <div className="two-col-grid">
          <div className="panel">
            <h4>Enrollment Funnel</h4>
            <ResponsiveContainer height={220}>
              <BarChart data={funnelData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#2563eb" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="panel">
            <h4>Post-Session Follow-ups</h4>
            <p>Completed: {followups.completed}</p>
            <p>Pending: {followups.pending}</p>
          </div>
        </div>

        {/* TREND */}
        <div className="panel">
          <h4>Session Trend Over Time</h4>
          <ResponsiveContainer height={280}>
            <LineChart data={trendData}>
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line dataKey="sessions" stroke="#16a34a" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* SESSION TABLE */}
        <div className="panel">
          <h4>Session-wise Performance</h4>
          <table className="activity-table">
            <thead>
              <tr>
                <th>Session</th>
                <th>Date</th>
                <th>Invited</th>
                <th>Attended</th>
             
                <th>Referrals</th>
              </tr>
            </thead>
            <tbody>
              {sessionTable.map((s, i) => (
                <tr key={i}>
                  <td>{s.name}</td>
                  <td>{s.date}</td>
                  <td>{s.invited}</td>
              
                  <td style={{ color: attendanceColor(s.attendancePct) }}>
                    {s.attendancePct}%
                  </td>
                  <td>{s.referrals}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}

/* ================= CARD ================= */

const Card = ({ label, value, color }) => (
  <div className="stat-card">
    <p>{label}</p>
    <h3 style={{ color }}>{value}</h3>
  </div>
);
