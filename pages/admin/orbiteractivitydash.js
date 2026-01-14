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
} from "recharts";
import Layout from "../../component/Layout";
import "../../src/app/styles/main.scss";
/* ================= HELPERS ================= */

const toDate = (ts) => {
  if (!ts) return null;
  if (ts.seconds) return new Date(ts.seconds * 1000);
  if (typeof ts === "string") return new Date(ts);
  return null;
};

const isToday = (d) =>
  d && d.toDateString() === new Date().toDateString();

/* ================= MAIN ================= */

export default function AdminOrbiterActivityDashboard() {
  const [users, setUsers] = useState([]);
  const [interactions, setInteractions] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [conclaves, setConclaves] = useState([]);

  /* ================= FIRESTORE ================= */

  useEffect(() => {
    const unsubUsers = onSnapshot(
      collection(db, "usersdetail"),
      (snap) =>
        setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );

    const unsubInteractions = onSnapshot(
      collection(db, "Prospects"),
      (snap) =>
        setInteractions(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );

    const unsubMeetings = onSnapshot(
      collection(db, "Monthlymeeting"),
      (snap) =>
        setMeetings(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );

    const unsubConclave = onSnapshot(
      collection(db, "Conclave"),
      (snap) =>
        setConclaves(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );

    return () => {
      unsubUsers();
      unsubInteractions();
      unsubMeetings();
      unsubConclave();
    };
  }, []);

  /* ================= DAILY SUMMARY ================= */

  const summary = useMemo(() => {
    let callsToday = 0;
    let meetingsToday = 0;
    let sessionsToday = 0;

    interactions.forEach((i) => {
      const d = toDate(i.updatedAt || i.registeredAt);
      if (isToday(d)) callsToday++;
    });

    meetings.forEach((m) => {
      const d = toDate(m.time);
      if (isToday(d)) meetingsToday++;
    });

    conclaves.forEach((c) => {
      const d = toDate(c.startDate);
      if (isToday(d)) sessionsToday++;
    });

    return {
      callsToday,
      meetingsToday,
      sessionsToday,
      totalToday: callsToday + meetingsToday + sessionsToday,
    };
  }, [interactions, meetings, conclaves]);

  /* ================= ACTIVITY BY USER ================= */

  const activityByUser = useMemo(() => {
    const map = {};

    users.forEach((u) => {
      map[u.MobileNo] = {
        name: u.Name,
        calls: 0,
        meetings: 0,
        sessions: 0,
      };
    });

    interactions.forEach((i) => {
      if (map[i.orbiterContact]) {
        map[i.orbiterContact].calls += 1;
      }
    });

    meetings.forEach((m) => {
      m.invitedUsers?.forEach((u) => {
        if (map[u.mobile]) {
          map[u.mobile].meetings += 1;
        }
      });
    });

    conclaves.forEach((c) => {
      c.orbiters?.forEach((mobile) => {
        if (map[mobile]) {
          map[mobile].sessions += 1;
        }
      });
    });

    return Object.values(map).map((u) => ({
      ...u,
      total: u.calls + u.meetings + u.sessions,
    }));
  }, [users, interactions, meetings, conclaves]);

  /* ================= LEADERBOARD ================= */

  const leaderboard = useMemo(() => {
    return [...activityByUser]
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [activityByUser]);

  /* ================= UI ================= */

  return (
    <Layout>
    <div className="admin-page">
      <h2 className="page-title">Orbiter & CosmOrbiter Daily Activity</h2>

      {/* SUMMARY CARDS */}
      <div className="card-grid">
        <Card label="Calls Today" value={summary.callsToday} />
        <Card label="Meetings Today" value={summary.meetingsToday} />
        <Card label="Sessions Today" value={summary.sessionsToday} />
        <Card label="Total Activities" value={summary.totalToday} />
      </div>

      {/* ACTIVITY + LEADERBOARD */}
      <div className="two-col-grid">
        <div className="panel">
          <h4>Activity Breakdown</h4>
          <ResponsiveContainer height={260}>
            <BarChart
              data={[
                { name: "Calls", value: interactions.length },
                { name: "Meetings", value: meetings.length },
                { name: "Sessions", value: conclaves.length },
              ]}
            >
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#3b82f6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="panel">
          <h4>Leaderboard</h4>
          {leaderboard.map((u, i) => (
            <div key={i} className="leader-row">
              <span>{i + 1}. {u.name}</span>
              <strong>{u.total}</strong>
            </div>
          ))}
        </div>
      </div>

      {/* STACKED BAR BY ORBITER */}
      <div className="panel">
        <h4>Activity Distribution by Orbiter</h4>
        <ResponsiveContainer height={300}>
          <BarChart data={activityByUser}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="calls" stackId="a" fill="#3b82f6" />
            <Bar dataKey="meetings" stackId="a" fill="#16a34a" />
            <Bar dataKey="sessions" stackId="a" fill="#8b5cf6" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* DAILY ACTIVITY TABLE */}
      <div className="panel">
        <h4>Daily Activity by Orbiter</h4>

        <table className="activity-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Calls</th>
              <th>Meetings</th>
              <th>Sessions</th>
              <th>Total</th>
              <th>Performance</th>
            </tr>
          </thead>
          <tbody>
            {activityByUser.map((u, i) => (
              <tr key={i}>
                <td>{u.name}</td>
                <td>{u.calls}</td>
                <td>{u.meetings}</td>
                <td>{u.sessions}</td>
                <td><strong>{u.total}</strong></td>
                <td>
                  <div className="progress-bg">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${Math.min((u.total / 20) * 100, 100)}%`,
                      }}
                    />
                  </div>
                </td>
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

const Card = ({ label, value }) => (
  <div className="stat-card">
    <p>{label}</p>
    <h3>{value}</h3>
  </div>
);
