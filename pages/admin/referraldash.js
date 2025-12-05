// components/ReferralLiveDashboard.jsx
import React, { useEffect, useState } from "react";
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

// === Firebase init (client) - uses NEXT_PUBLIC env vars ===
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

// === Helpers ===
function tsToDate(ts) {
  if (!ts) return null;
  try {
    return new Date(ts.seconds * 1000);
  } catch {
    return null;
  }
}

// Determine pipeline category (Option B: detailed 5-stage)
function mapStatusToPipeline(doc) {
  // prefer cosmoOrbiter.dealStatus if present, fallback to doc.dealStatus, else ''
  const raw =
    (doc?.cosmoOrbiter?.dealStatus || doc?.dealStatus || "")
      .toString()
      .toLowerCase();

  if (!raw || raw.trim() === "") return "New / No Status";

  // Completed cases: various phrases that indicate full/complete or transferred
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

  // Part payment cases
  const partKeywords = [
    "part payment",
    "received part",
    "partially",
    "partial",
    "part payment &",
  ];
  for (const k of partKeywords) if (raw.includes(k)) return "Part Payment Received";

  // Lost / Not Connected / Rejected
  const lostKeywords = ["deal lost", "not connected", "rejected", "lost"];
  for (const k of lostKeywords) if (raw.includes(k)) return "Lost / Not Connected";

  // In progress
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

  // Default fallback
  return "In Progress";
}

// Sum payments from payments[] (amountReceived are strings)
function sumPayments(doc) {
  const payments = Array.isArray(doc.payments) ? doc.payments : [];
  let total = 0;
  payments.forEach((p) => {
    const v = Number(p?.amountReceived || 0);
    if (!isNaN(v)) total += v;
  });
  // also consider dealLogs (older structure) which may contain ujustbeShare, agreedAmount etc.
  if (Array.isArray(doc.dealLogs) && doc.dealLogs.length) {
    // last dealLog likely contains agreedAmount / ujustbeShare
    const last = doc.dealLogs[doc.dealLogs.length - 1];
    if (last?.ujustbeShare) total += Number(last.ujustbeShare || 0);
    if (last?.ujustbeShare === undefined && last?.agreedAmount)
      total += Number(last.agreedAmount || 0) * 0; // don't assume
  }
  return total;
}

// Try to extract agreed total (monetary) if present
function extractAgreedTotal(doc) {
  // priority:
  // 1) doc.agreedTotal (explicit)
  if (doc?.agreedTotal) return Number(doc.agreedTotal || 0);

  // 2) doc.dealLogs last.agreedAmount
  if (Array.isArray(doc.dealLogs) && doc.dealLogs.length) {
    const last = doc.dealLogs[doc.dealLogs.length - 1];
    if (last?.agreedAmount) return Number(last.agreedAmount || 0);
    if (last?.dealValue && last?.percentage) {
      // if dealValue present and percentage present, compute agreed
      return Number(last.dealValue) * (Number(last.percentage) / 100);
    }
  }

  // 3) doc.product.agreedValue -> percentage only (cannot compute absolute without dealValue)
  // so return 0 to indicate unknown
  return 0;
}

// Compute per-document financial breakdown (UJustBe received, Orbiter, Mentors)
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
      else if (type === "CosmoOrbiter Mentor")
        breakdown["CosmoOrbiter Mentor"] += val;
      else breakdown.other += val;
    }
  });

  // also include dealLogs ujustbeShare if present (avoid double-counting if payments already captured)
  return breakdown;
}

// Compute stats for the entire collection
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

    // pipeline map
    const mapped = mapStatusToPipeline(doc);
    pipelineBuckets[mapped].push(doc);

    // payments
    const pb = computePaymentsBreakdown(doc);
    totals.totalUJustBeReceived += pb.UJustBe || 0;
    totals.totalOrbiterPaid += pb.Orbiter || 0;
    totals.totalCosmoMentorPaid += pb["CosmoOrbiter Mentor"] || 0;

    // monthly trend grouping
    const monthKey = createdAt
      ? `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, "0")}`
      : "unknown";
    if (!monthlyTrend[monthKey]) monthlyTrend[monthKey] = { created: 0, completed: 0, lost: 0 };
    monthlyTrend[monthKey].created++;

    if (mapped === "Completed") monthlyTrend[monthKey].completed++;
    if (mapped === "Lost / Not Connected") monthlyTrend[monthKey].lost++;
  });

  // compute conversion % (Completed / total)
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

// === Component ===
export default function ReferralLiveDashboard() {
  const [loading, setLoading] = useState(true);
  const [docs, setDocs] = useState([]);
  const [stats, setStats] = useState(null);
  const COLLECTION = "Referraldev";

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

  if (loading) return <div className="dashboard-container">Loading...</div>;
  if (!stats) return <div className="dashboard-container">No data.</div>;

  const { pipelineBuckets, totals, conversionPercent, monthlyTrend } = stats;

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

      <div className="two-grid">
        <div className="panel">
          <div className="panel-title">Pipeline (Detailed)</div>
          <ul className="list">
            {Object.entries(pipelineBuckets).map(([k, arr]) => (
              <li key={k} className="list-row">
                <span>{k}</span>
                <strong>{arr.length}</strong>
              </li>
            ))}
          </ul>
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
