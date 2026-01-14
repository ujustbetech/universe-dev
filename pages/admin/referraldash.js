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
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import '../../src/app/styles/page/_referral.scss';
import "../../src/app/styles/main.scss";
import Layout from "../../component/Layout";
/* ================= HELPERS ================= */

const toDate = (ts) =>
  ts?.seconds ? new Date(ts.seconds * 1000) : null;

const isSameDay = (d1, d2) =>
  d1 && d2 && d1.toDateString() === d2.toDateString();

const getPipelineStatus = (dealStatus = "") => {
  if (!dealStatus) return "New";
  if (dealStatus.includes("Lost")) return "Closed - Lost";
  if (dealStatus.includes("Received")) return "Closed - Won";
  if (dealStatus.includes("Transferred")) return "Awaiting Closure";
  return "In Progress";
};

const getUJBPaid = (payments = []) =>
  payments
    .filter((p) => p.ujbShareType === "UJustBe")
    .reduce((s, p) => s + Number(p.amountReceived || 0), 0);

/* ===== TIME BUCKET HELPER ===== */

const getTrendKey = (date, view) => {
  const d = new Date(date);

  if (view === "daily") return d.toISOString().split("T")[0];

  if (view === "weekly") {
    const firstDayOfYear = new Date(d.getFullYear(), 0, 1);
    const week = Math.ceil(
      (((d - firstDayOfYear) / 86400000) +
        firstDayOfYear.getDay() +
        1) /
        7
    );
    return `${d.getFullYear()}-W${week}`;
  }

  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const PIE_COLORS = [
  "#2563eb", // New
  "#ca8a04", // In Progress
  "#6366f1", // Awaiting
  "#16a34a", // Won
  "#dc2626", // Lost
];

/* ================= MAIN ================= */

export default function AdminReferralDashboard() {
  const [referrals, setReferrals] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [trendView, setTrendView] = useState("monthly");
  const [filters, setFilters] = useState({
    orbiter: "All",
    cosmo: "All",
    source: "All",
  });

  const today = new Date();

  /* ================= FIRESTORE ================= */

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "Referraldev"), (snap) => {
      const data = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setReferrals(data);
    });
    return () => unsub();
  }, []);

  /* ================= FILTER ================= */

  const filtered = useMemo(() => {
    return referrals.filter((r) => {
      if (filters.orbiter !== "All" && r.orbiter?.name !== filters.orbiter)
        return false;
      if (filters.cosmo !== "All" && r.cosmoOrbiter?.name !== filters.cosmo)
        return false;
      if (filters.source !== "All" && r.referralSource !== filters.source)
        return false;
      return true;
    });
  }, [referrals, filters]);

  /* ================= STATS ================= */

  const stats = useMemo(() => {
    let todayCount = 0;
    let pipeline = {
      New: 0,
      "In Progress": 0,
      "Awaiting Closure": 0,
      "Closed - Won": 0,
      "Closed - Lost": 0,
    };
    let paid = 0;
    let closed = 0;

    filtered.forEach((r) => {
      const created = toDate(r.timestamp);
      if (isSameDay(created, today)) todayCount++;

      const status = getPipelineStatus(r.cosmoOrbiter?.dealStatus);
      pipeline[status]++;
      paid += getUJBPaid(r.payments);

      if (status.startsWith("Closed")) closed++;
    });

    return {
      todayCount,
      pipeline,
      paid,
      conversion: filtered.length
        ? ((closed / filtered.length) * 100).toFixed(1)
        : 0,
    };
  }, [filtered]);

  /* ================= TREND DATA ================= */

  const trendData = useMemo(() => {
    const map = {};
    referrals.forEach((r) => {
      const d = toDate(r.timestamp);
      if (!d) return;
      const key = getTrendKey(d, trendView);
      map[key] = (map[key] || 0) + 1;
    });

    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, count]) => ({
        period,
        referrals: count,
      }));
  }, [referrals, trendView]);

  /* ================= PIE DATA ================= */

  const pieData = Object.entries(stats.pipeline).map(([k, v]) => ({
    name: k,
    value: v,
  }));

  /* ================= DROPDOWNS ================= */

  const orbiters = [
    "All",
    ...new Set(referrals.map((r) => r.orbiter?.name).filter(Boolean)),
  ];
  const cosmos = [
    "All",
    ...new Set(referrals.map((r) => r.cosmoOrbiter?.name).filter(Boolean)),
  ];
  const sources = [
    "All",
    ...new Set(referrals.map((r) => r.referralSource).filter(Boolean)),
  ];

  /* ================= UI ================= */

  return (
    <Layout>
    <div style={{ padding: 24 }}>
      <h2>Referral & Contribution Tracking</h2>

      {/* STATS */}
      <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
        <Card label="Referrals Today" value={stats.todayCount} />
        <Card label="Total Referrals" value={filtered.length} />
        <Card label="Conversion %" value={stats.conversion} />
        <Card label="UJustBe Paid ₹" value={stats.paid} />
      </div>

      {/* PIPELINE CARDS */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
        {Object.entries(stats.pipeline).map(([k, v]) => (
          <Card key={k} label={k} value={v} />
        ))}
      </div>

      {/* FILTERS */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <select onChange={(e) => setFilters((f) => ({ ...f, orbiter: e.target.value }))}>
          {orbiters.map((o) => <option key={o}>{o}</option>)}
        </select>

        <select onChange={(e) => setFilters((f) => ({ ...f, cosmo: e.target.value }))}>
          {cosmos.map((c) => <option key={c}>{c}</option>)}
        </select>

        <select onChange={(e) => setFilters((f) => ({ ...f, source: e.target.value }))}>
          {sources.map((s) => <option key={s}>{s}</option>)}
        </select>

        <select value={trendView} onChange={(e) => setTrendView(e.target.value)}>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
      </div>

      {/* ================= CHART ROW ================= */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 2fr",
          gap: 20,
          marginBottom: 30,
        }}
      >
        {/* PIE */}
        <div
          style={{
            background: "#fff",
            borderRadius: 12,
            padding: 16,
            boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
            height: 300,
          }}
        >
          <h4>Pipeline Distribution</h4>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={3}
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* BAR */}
        <div
          style={{
            background: "#fff",
            borderRadius: 12,
            padding: 16,
            boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
            height: 300,
          }}
        >
          <h4>Referral Trend</h4>
          <ResponsiveContainer>
            <BarChart
              data={trendData}
              barCategoryGap={8}
              margin={{ top: 10, right: 20, left: 0, bottom: 40 }}
            >
              <XAxis
                dataKey="period"
                angle={-35}
                textAnchor="end"
                height={50}
                interval="preserveStartEnd"
              />
              <YAxis />
              <Tooltip />
              <Bar dataKey="referrals" barSize={14} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* TABLE */}
      <table width="100%" border="1" cellPadding="8">
        <thead>
          <tr>
            <th>Referral ID</th>
            <th>Orbiter</th>
            <th>CosmoOrbiter</th>
            <th>Status</th>
            <th>UJB Paid</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((r) => {
            const status = getPipelineStatus(r.cosmoOrbiter?.dealStatus);
            return (
              <React.Fragment key={r.id}>
                <tr>
                  <td>{r.referralId}</td>
                  <td>{r.orbiter?.name}</td>
                  <td>{r.cosmoOrbiter?.name}</td>
                  <td>{status}</td>
                  <td>₹{getUJBPaid(r.payments)}</td>
                  <td>
                    <button onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}>
                      View
                    </button>
                  </td>
                </tr>

                {expandedId === r.id && (
                  <tr>
                    <td colSpan="6">
                      <strong>Product:</strong> {r.product?.name}
                      <br />
                      <strong>Description:</strong> {r.product?.description}
                      <br />
                      <strong>Referral Type:</strong> {r.referralType}
                      <br />
                      <strong>Referral Source:</strong> {r.referralSource || "-"}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
    </Layout>
  );
}

/* ================= CARD ================= */

const Card = ({ label, value }) => (
  <div
    style={{
      background: "#fff",
      padding: 16,
      minWidth: 160,
      borderRadius: 8,
      boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
    }}
  >
    <p style={{ margin: 0 }}>{label}</p>
    <h3>{value}</h3>
  </div>
);
