// components/ReferralLiveDashboard.jsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { initializeApp, getApps } from "firebase/app";
import {
  getFirestore,
  collection,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import "../../src/app/styles/page/ReferralLiveDashboard.css"; // adjust path if needed

/* ---------- Firebase init (client) ---------- */
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

/* ---------- Helpers (unchanged logic) ---------- */
function tsToDate(ts) {
  if (!ts) return null;
  try {
    return new Date(ts.seconds * 1000);
  } catch {
    return null;
  }
}

function mapStatusToPipeline(doc) {
  const raw =
    (doc?.cosmoOrbiter?.dealStatus || doc?.dealStatus || "").toString().toLowerCase();

  if (!raw || raw.trim() === "") return "New / No Status";

  const completedKeywords = [
    "received full",
    "full and final",
    "agreed percentage transferred",
    "transferred to ujustbe",
    "work completed",
    "agreedfullypaid",
    "agreed fully paid",
    "completed",
    "deal won",
  ];
  for (const k of completedKeywords) if (raw.includes(k)) return "Completed";

  const partKeywords = [
    "part payment",
    "received part",
    "partially",
    "partial",
    "part payment &",
  ];
  for (const k of partKeywords) if (raw.includes(k)) return "Part Payment Received";

  const lostKeywords = ["deal lost", "not connected", "rejected", "lost"];
  for (const k of lostKeywords) if (raw.includes(k)) return "Lost / Not Connected";

  const progressKeywords = [
    "pending",
    "follow",
    "connected",
    "in progress",
    "work in progress",
    "follow-up",
    "awaiting",
  ];
  for (const k of progressKeywords) if (raw.includes(k)) return "In Progress";

  return "In Progress";
}

function sumPayments(doc) {
  const payments = Array.isArray(doc.payments) ? doc.payments : [];
  let total = 0;
  payments.forEach((p) => {
    const v = Number(p?.amountReceived || 0);
    if (!isNaN(v)) total += v;
  });
  if (Array.isArray(doc.dealLogs) && doc.dealLogs.length) {
    const last = doc.dealLogs[doc.dealLogs.length - 1];
    if (last?.ujustbeShare) total += Number(last.ujustbeShare || 0);
  }
  return total;
}

function computePaymentsBreakdown(doc) {
  const payments = Array.isArray(doc.payments) ? doc.payments : [];
  const breakdown = {
    UJustBe: 0,
    Orbiter: 0,
    "Orbiter Mentor": 0,
    "CosmoOrbiter Mentor": 0,
    other: 0,
    totalReceived: 0,
  };
  payments.forEach((p) => {
    const val = Number(p?.amountReceived || 0);
    const type = p?.ujbShareType || p?.paymentTo || "other";
    if (!isNaN(val) && val > 0) {
      breakdown.totalReceived += val;
      if (type === "UJustBe") breakdown.UJustBe += val;
      else if (type === "Orbiter") breakdown.Orbiter += val;
      else if (type === "Orbiter Mentor") breakdown["Orbiter Mentor"] += val;
      else if (type === "CosmoOrbiter Mentor") breakdown["CosmoOrbiter Mentor"] += val;
      else breakdown.other += val;
    }
  });
  return breakdown;
}

function computeStats(docs) {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const pipelineBuckets = {
    "New / No Status": [],
    "In Progress": [],
    "Part Payment Received": [],
    Completed: [],
    "Lost / Not Connected": [],
  };

  let totals = {
    totalReferrals: 0,
    todaysReferrals: 0,
    totalUJustBeReceived: 0,
    totalOrbiterPaid: 0,
    totalCosmoMentorPaid: 0,
  };

  const monthlyTrend = {}; // yyyy-mm -> { created, completed, lost }

  docs.forEach((doc) => {
    totals.totalReferrals++;

    const createdAt = tsToDate(doc.timestamp) || tsToDate(doc.lastUpdated);
    if (createdAt && createdAt >= todayStart && createdAt <= todayEnd)
      totals.todaysReferrals++;

    const mapped = mapStatusToPipeline(doc);
    pipelineBuckets[mapped].push(doc);

    const pb = computePaymentsBreakdown(doc);
    totals.totalUJustBeReceived += pb.UJustBe || 0;
    totals.totalOrbiterPaid += pb.Orbiter || 0;
    totals.totalCosmoMentorPaid += pb["CosmoOrbiter Mentor"] || 0;

    const monthKey = createdAt
      ? `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, "0")}`
      : "unknown";
    if (!monthlyTrend[monthKey]) monthlyTrend[monthKey] = { created: 0, completed: 0, lost: 0 };
    monthlyTrend[monthKey].created++;

    if (mapped === "Completed") monthlyTrend[monthKey].completed++;
    if (mapped === "Lost / Not Connected") monthlyTrend[monthKey].lost++;
  });

  const completedCount = pipelineBuckets["Completed"].length;
  const conversionPercent =
    totals.totalReferrals === 0 ? 0 : Number(((completedCount / totals.totalReferrals) * 100).toFixed(2));

  return {
    pipelineBuckets,
    totals,
    conversionPercent,
    monthlyTrend,
  };
}

/* ---------- Dynamic client-only Charts component (uses recharts) ---------- */
const ChartArea = dynamic(
  () =>
    Promise.resolve(function ChartArea({ monthlyData, pipelineData, financialData }) {
      const {
        ResponsiveContainer,
        LineChart,
        Line,
        CartesianGrid,
        XAxis,
        YAxis,
        Tooltip,
        BarChart,
        Bar,
        Cell,
        Legend,
      } = require("recharts");

      return (
        <div style={{ display: "grid", gap: 16 }}>
          {/* Monthly Trend (full width) */}
          <div className="panel" style={{ padding: 12 }}>
            <div className="panel-title">Monthly Referral Trend</div>
            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer>
                <LineChart data={monthlyData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="created" stroke="#1474d2" name="Created" strokeWidth={2} />
                  <Line type="monotone" dataKey="completed" stroke="#00a3ff" name="Completed" strokeWidth={2} />
                  <Line type="monotone" dataKey="lost" stroke="#ff6b6b" name="Lost" strokeWidth={2} />
                  <Legend />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Two charts: Pipeline (left) and Financial (right) */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div className="panel" style={{ padding: 12 }}>
              <div className="panel-title">Pipeline Counts</div>
              <div style={{ width: "100%", height: 260 }}>
                <ResponsiveContainer>
                  <BarChart data={pipelineData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="status" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#1474d2">
                      {pipelineData.map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={["#1474d2", "#2196F3", "#4FC3F7", "#81D4FA", "#B3E5FC"][idx % 5]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="panel" style={{ padding: 12 }}>
              <div className="panel-title">Financial Distribution (Received)</div>
              <div style={{ width: "100%", height: 260 }}>
                <ResponsiveContainer>
                  <BarChart data={financialData} margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#00a3ff" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      );
    }),
  { ssr: false }
);

/* ---------- Main Component ---------- */
export default function ReferralLiveDashboard() {
  const [loading, setLoading] = useState(true);
  const [docs, setDocs] = useState([]);
  const [stats, setStats] = useState(null);
  const COLLECTION = "Referraldev"; // keep as your collection. adjust if needed.

  useEffect(() => {
    const colRef = collection(db, COLLECTION);
    const q = query(colRef, orderBy("timestamp", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const arr = [];
        snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
        setDocs(arr);
        const s = computeStats(arr);
        setStats(s);
        setLoading(false);
      },
      (err) => {
        console.error("Realtime listener error:", err);
        setLoading(false);
      }
    );

    return () => unsub && unsub();
  }, []);

  // prepare chart data
  const monthlyData = useMemo(() => {
    if (!stats) return [];
    const mt = stats.monthlyTrend || {};
    const keys = Object.keys(mt).filter(k => k !== "unknown").sort();
    return keys.map(k => ({ month: k, created: mt[k].created || 0, completed: mt[k].completed || 0, lost: mt[k].lost || 0 }));
  }, [stats]);

  const pipelineData = useMemo(() => {
    if (!stats) return [];
    return Object.entries(stats.pipelineBuckets).map(([status, arr]) => ({ status, count: arr.length }));
  }, [stats]);

  const financialData = useMemo(() => {
    if (!stats) return [];
    const { totals } = stats;
    return [
      { label: "UJustBe", value: totals.totalUJustBeReceived || 0 },
      { label: "Orbiter", value: totals.totalOrbiterPaid || 0 },
      { label: "Cosmo Mentor", value: totals.totalCosmoMentorPaid || 0 },
    ];
  }, [stats]);

  if (loading) return <div className="dashboard-container">Loading...</div>;
  if (!stats) return <div className="dashboard-container">No data.</div>;

  const { pipelineBuckets, totals, conversionPercent } = stats;

  return (
    <div className="dashboard-container">
      <h3 className="title">Referral Live Dashboard</h3>

      <div className="stats-grid">
        <div className="card">
          <div className="card-title">Total Referrals</div>
          <div className="card-value">{totals.totalReferrals}</div>
        </div>

        <div className="card">
          <div className="card-title">Today's Referrals</div>
          <div className="card-value">{totals.todaysReferrals}</div>
        </div>

        <div className="card">
          <div className="card-title">UJustBe Received</div>
          <div className="card-value">₹ {totals.totalUJustBeReceived.toLocaleString()}</div>
        </div>

        <div className="card">
          <div className="card-title">Conversion % (Completed)</div>
          <div className="card-value">{conversionPercent} %</div>
        </div>
      </div>

      {/* Chart area (compact layout: monthly trend + pipeline + financial) */}
      <div style={{ marginBottom: 18 }}>
        <ChartArea monthlyData={monthlyData} pipelineData={pipelineData} financialData={financialData} />
      </div>

      <div className="two-grid">
        <div className="panel">
          <div className="panel-title">Referrals Needing Follow-up / In Progress</div>
          <table className="table">
            <thead>
              <tr>
                <th>ID</th><th>Name</th><th>Cosmo</th><th>Orbiter</th><th>Status</th><th>Created</th>
              </tr>
            </thead>
            <tbody>
              {pipelineBuckets["In Progress"].slice(0, 200).map((r) => (
                <tr key={r.id}>
                  <td>{r.referralId || r.id}</td>
                  <td>{r.referredForName || "-"}</td>
                  <td>{r.cosmoOrbiter?.name || "-"}</td>
                  <td>{r.orbiter?.name || "-"}</td>
                  <td>{(r.cosmoOrbiter?.dealStatus || r.dealStatus) || "-"}</td>
                  <td>{tsToDate(r.timestamp)?.toLocaleString() || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="panel">
          <div className="panel-title">Financial Snapshot</div>
          <div className="rec-section">
            <div className="rec-row"><span>UJustBe Received</span><strong>₹ {totals.totalUJustBeReceived.toLocaleString()}</strong></div>
            <div className="rec-row"><span>Orbiter Paid</span><strong>₹ {totals.totalOrbiterPaid.toLocaleString()}</strong></div>
            <div className="rec-row"><span>Cosmo Mentor Paid</span><strong>₹ {totals.totalCosmoMentorPaid.toLocaleString()}</strong></div>
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 16 }}>
        <div className="panel-title">Recent Referrals</div>
        <div className="scroll-box">
          {docs.slice(0, 200).map((r) => (
            <div className="recent-item" key={r.id}>
              <div className="recent-left">
                <div className="recent-title">{r.referredForName || r.referralId || "Unknown"}</div>
                <div className="recent-sub">{r.product?.name || r.service?.name || ""}</div>
                <div className="recent-status">{r.cosmoOrbiter?.dealStatus || r.dealStatus || "No Status"}</div>
              </div>
              <div className="recent-time">{tsToDate(r.timestamp)?.toLocaleString() || ""}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
