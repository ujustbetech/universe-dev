"use client";

import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { initializeApp, getApps } from "firebase/app";
import {
  getFirestore,
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";
import "../../src/app/styles/page/ReferralLiveDashboard.css";

/* ================= FIREBASE ================= */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

if (!getApps().length) initializeApp(firebaseConfig);
const db = getFirestore();

/* ================= CONSTANTS ================= */
const PIPELINE_STAGES = [
  "New",
  "In Progress",
  "Part Payment",
  "Completed",
  "Lost",
];

/* ================= HELPERS ================= */
const tsToDate = (ts) => (ts?.seconds ? new Date(ts.seconds * 1000) : null);

const mapStatus = (doc) => {
  const raw =
    (doc?.cosmoOrbiter?.dealStatus || doc?.dealStatus || "").toLowerCase();
  if (!raw) return "New";
  if (raw.includes("completed") || raw.includes("fully")) return "Completed";
  if (raw.includes("lost")) return "Lost";
  if (raw.includes("part")) return "Part Payment";
  return "In Progress";
};

/* ================= STATS ================= */
const computeStats = (docs) => {
  const now = new Date();

  const pipeline = {
    New: [],
    "In Progress": [],
    "Part Payment": [],
    Completed: [],
    Lost: [],
  };

  const trend = {};
  const ageingBuckets = { "0–3 Days": 0, "4–7 Days": 0, "8+ Days": 0 };

  docs.forEach((doc) => {
    const createdAt = tsToDate(doc.timestamp);
    if (!createdAt) return;

    const status = mapStatus(doc);
    pipeline[status].push(doc);

    const key = createdAt.toISOString().slice(0, 7);
    if (!trend[key]) trend[key] = { created: 0, completed: 0, lost: 0 };
    trend[key].created++;
    if (status === "Completed") trend[key].completed++;
    if (status === "Lost") trend[key].lost++;

    if (status === "In Progress") {
      const days = Math.floor((now - createdAt) / 86400000);
      if (days <= 3) ageingBuckets["0–3 Days"]++;
      else if (days <= 7) ageingBuckets["4–7 Days"]++;
      else ageingBuckets["8+ Days"]++;
    }
  });

  return { pipeline, trend, ageingBuckets };
};

/* ================= TODO ================= */
const computeTodos = (docs) => {
  const now = Date.now();
  const todos = [];

  docs.forEach((doc) => {
    const createdAt = tsToDate(doc.timestamp);
    if (!createdAt) return;

    const days = Math.floor((now - createdAt) / 86400000);
    const status = mapStatus(doc);
    const name = doc.referredForName || doc.referralId;

    if (status === "In Progress" && days >= 3 && !doc.snoozedUntil) {
      todos.push({
        refId: doc.id,
        priority: days > 7 ? "high" : "medium",
        text: `Follow up with ${name} (${days} days)`,
      });
    }

    const hasPayment =
      doc.payments?.some((p) => Number(p.amountReceived) > 0) || false;

    if (!hasPayment && status === "In Progress" && days >= 7) {
      todos.push({
        refId: doc.id,
        priority: "high",
        text: `Payment pending – ${name}`,
      });
    }
  });

  return todos;
};

/* ================= CHARTS ================= */
const ChartArea = dynamic(
  () =>
    Promise.resolve(({ trendData, funnelData, statusData, ageingData }) => {
      const {
        ResponsiveContainer,
        AreaChart,
        Area,
        BarChart,
        Bar,
        PieChart,
        Pie,
        Cell,
        XAxis,
        YAxis,
        Tooltip,
        CartesianGrid,
        Legend,
      } = require("recharts");

      const COLORS = ["#1474d2", "#2ecc71", "#f39c12", "#e74c3c", "#9b59b6"];

      return (
        <div style={{ display: "grid", gap: 20 }}>
          <div className="panel">
            <div className="panel-title">Referral Trend</div>
            <ResponsiveContainer height={260}>
              <AreaChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area dataKey="created" fill="#1474d2" />
                <Area dataKey="completed" fill="#2ecc71" />
                <Area dataKey="lost" fill="#e74c3c" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="two-grid">
            <div className="panel">
              <div className="panel-title">Referral Funnel</div>
              <ResponsiveContainer height={260}>
                <BarChart layout="vertical" data={funnelData}>
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="stage" />
                  <Tooltip />
                  <Bar dataKey="count" fill="#1474d2" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="panel">
              <div className="panel-title">Status Distribution</div>
              <ResponsiveContainer height={260}>
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={90}
                    label
                  >
                    {statusData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="panel">
            <div className="panel-title">Follow-up Ageing</div>
            <ResponsiveContainer height={220}>
              <BarChart data={ageingData}>
                <XAxis dataKey="bucket" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#f39c12" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      );
    }),
  { ssr: false }
);

/* ================= MAIN ================= */
export default function ReferralLiveDashboard() {
  const router = useRouter();
  const [docs, setDocs] = useState([]);
  const [stats, setStats] = useState(null);
  const [todos, setTodos] = useState([]);
  const [activeTab, setActiveTab] = useState("dashboard");

  /* FETCH */
  useEffect(() => {
    const q = query(collection(db, "Referraldev"), orderBy("timestamp", "desc"));
    return onSnapshot(q, (snap) =>
      setDocs(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
  }, []);

  useEffect(() => {
    setStats(computeStats(docs));
    setTodos(computeTodos(docs));
  }, [docs]);

  /* DERIVED (ALL HOOKS HERE) */
  const trendData = useMemo(
    () =>
      stats
        ? Object.entries(stats.trend).map(([label, v]) => ({
            label,
            ...v,
          }))
        : [],
    [stats]
  );

  const funnelData = useMemo(
    () =>
      stats
        ? Object.entries(stats.pipeline).map(([stage, arr]) => ({
            stage,
            count: arr.length,
          }))
        : [],
    [stats]
  );

  const statusData = useMemo(
    () => funnelData.map((f) => ({ name: f.stage, value: f.count })),
    [funnelData]
  );

  const ageingData = useMemo(
    () =>
      stats
        ? Object.entries(stats.ageingBuckets).map(([bucket, count]) => ({
            bucket,
            count,
          }))
        : [],
    [stats]
  );

  const orbiterStats = useMemo(() => {
    const map = {};
    docs.forEach((d) => {
      const o = d?.orbiter?.name;
      if (!o) return;
      if (!map[o]) map[o] = { total: 0, completed: 0, revenue: 0 };
      map[o].total++;
      if (mapStatus(d) === "Completed") map[o].completed++;
      d.payments?.forEach((p) => {
        if (p.paymentTo === "UJustBe") {
          map[o].revenue += Number(p.amountReceived || 0);
        }
      });
    });
    return Object.entries(map).map(([name, v]) => ({
      name,
      ...v,
      conversion:
        v.total === 0 ? 0 : Math.round((v.completed / v.total) * 100),
    }));
  }, [docs]);

  /* ACTIONS */
  const updateStatus = async (id, status) => {
    await updateDoc(doc(db, "Referraldev", id), {
      dealStatus: status,
      lastUpdated: new Date(),
    });
  };

  const handleTodoAction = async (id, type) => {
    if (type === "done") {
      await updateDoc(doc(db, "Referraldev", id), {
        adminActions: arrayUnion({ type: "done", at: new Date() }),
      });
    }
    if (type === "snooze") {
      await updateDoc(doc(db, "Referraldev", id), {
        snoozedUntil: new Date(Date.now() + 2 * 86400000),
      });
    }
  };

  if (!stats) return <div>Loading…</div>;

  return (
    <div className="prospect-page">
      <h1 className="title">Referral Admin Dashboard</h1>

      {/* TABS */}
      <div className="view-toggle">
        {["dashboard", "pipeline", "orbiters"].map((t) => (
          <button
            key={t}
            className={activeTab === t ? "active" : ""}
            onClick={() => setActiveTab(t)}
          >
            {t.toUpperCase()}
          </button>
        ))}
      </div>

      {/* DASHBOARD */}
      {activeTab === "dashboard" && (
        <>
          <div className="stats-grid">
            <div className="card">
              <div className="card-title">Active Follow-ups</div>
              <div className="card-value">
                {stats.pipeline["In Progress"].length}
              </div>
            </div>
          </div>

          <ChartArea
            trendData={trendData}
            funnelData={funnelData}
            statusData={statusData}
            ageingData={ageingData}
          />

          <div className="panel todo-panel">
            <div className="panel-title">Admin To-Do</div>
            <ul className="todo-list">
              {todos.map((t, i) => (
                <li key={i} className={`todo ${t.priority}`}>
                  <span>{t.text}</span>
                  <div className="todo-actions">
                    <button onClick={() => handleTodoAction(t.refId, "done")}>
                      ✓
                    </button>
                    <button onClick={() => handleTodoAction(t.refId, "snooze")}>
                      ⏰
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      {/* PIPELINE */}
      {activeTab === "pipeline" && (
        <div className="kanban">
          {PIPELINE_STAGES.map((stage) => (
            <div
              key={stage}
              className="kanban-col"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) =>
                updateStatus(e.dataTransfer.getData("id"), stage)
              }
            >
              <h3>{stage}</h3>
              {stats.pipeline[stage].map((r) => (
                <div
                  key={r.id}
                  draggable
                  className="kanban-card"
                  onDragStart={(e) =>
                    e.dataTransfer.setData("id", r.id)
                  }
                  onClick={() => router.push(`/referral/${r.id}`)}
                >
                  <strong>{r.referredForName || r.referralId}</strong>
                  <div className="small">{r.product?.name}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* ORBITERS */}
      {activeTab === "orbiters" && (
        <div className="panel">
          <div className="panel-title">Orbiter Performance</div>
          <table className="table">
            <thead>
              <tr>
                <th>Orbiter</th>
                <th>Total</th>
                <th>Completed</th>
                <th>Conversion</th>
                <th>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {orbiterStats.map((o) => (
                <tr key={o.name}>
                  <td>{o.name}</td>
                  <td>{o.total}</td>
                  <td>{o.completed}</td>
                  <td>{o.conversion}%</td>
                  <td>₹{o.revenue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
