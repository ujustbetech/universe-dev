// pages/prospect-dashboard.js
import React, { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import "../../src/app/styles/page/ReferralLiveDashboard.css";

// We'll render charts client-side using a dynamic client-only component
const ClientCharts = dynamic(
  () =>
    Promise.resolve({
      default: function ClientCharts({ monthlyData, funnelData, orbiterTop }) {
        // Import Recharts at runtime (client-only)
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
        } = require("recharts");

        return (
          <div style={{ display: "grid", gap: 16 }}>
            <div style={{ width: "100%", height: 280 }}>
              <ResponsiveContainer>
                <LineChart data={monthlyData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="prospects" stroke="#00a3ff" name="Prospects" strokeWidth={2} />
                  <Line type="monotone" dataKey="engagements" stroke="#1474d2" name="Engagements" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1, height: 240 }}>
                <ResponsiveContainer>
                  <BarChart data={funnelData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="stage" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#1474d2">
                      {funnelData.map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={["#1474d2", "#2196F3", "#4FC3F7", "#81D4FA", "#B3E5FC"][idx % 5]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div style={{ flex: 1, height: 240 }}>
                <ResponsiveContainer>
                  <BarChart data={orbiterTop} layout="vertical" margin={{ left: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={160} />
                    <Tooltip />
                    <Bar dataKey="prospects" fill="#005bbb" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        );
      },
    }),
  { ssr: false }
);

export default function ProspectDashboardPage() {
  const COLLECTION = "Prospects"; // <-- use your exact collection name

  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Initialize Firebase & attach snapshot listener client-side
  useEffect(() => {
    let unsub = null;
    let isMounted = true;

    async function init() {
      try {
        const firebaseApp = await import("firebase/app");
        const firebaseFirestore = await import("firebase/firestore");
        const { initializeApp, getApps } = firebaseApp;
        const { getFirestore, collection, query, orderBy, onSnapshot } = firebaseFirestore;

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

        const colRef = collection(db, COLLECTION);
        const q = query(colRef, orderBy("registeredAt", "desc"));
        unsub = onSnapshot(
          q,
          (snap) => {
            const arr = [];
            snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
            if (!isMounted) return;
            setDocs(arr);
            setLoading(false);
          },
          (err) => {
            console.error("Prospects listener error:", err);
            setLoading(false);
          }
        );
      } catch (e) {
        console.error("Init error:", e);
        setLoading(false);
      }
    }

    init();

    return () => {
      isMounted = false;
      if (unsub) unsub();
    };
  }, [COLLECTION]);

  // Compute stats whenever docs change or date filters change
  useEffect(() => {
    if (!Array.isArray(docs)) return;

    // helpers
    const tsToDate = (ts) => {
      if (!ts) return null;
      try {
        return new Date(ts.seconds * 1000);
      } catch {
        // maybe already a Date string
        const d = new Date(ts);
        return isNaN(d.getTime()) ? null : d;
      }
    };

    const monthKey = (d) => (d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` : "unknown");

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    // date filter bounds
    const from = fromDate ? new Date(fromDate) : null;
    const to = toDate ? new Date(toDate) : null;
    if (to) { to.setHours(23,59,59,999); }

    // aggregation containers
    let totals = { total: 0, todays: 0, engagements: 0 };
    const monthly = {}; // monthKey -> { prospects:0, engagements:0 }
    const funnelBuckets = [0, 0, 0, 0, 0]; // stage 0..4
    const orbiterMap = {}; // orbiterName -> { count, prospects, enrollCompleted }

    const recentList = [];

    docs.forEach((d) => {
      // pick a primary created date
      const created = tsToDate(d.registeredAt) || tsToDate(d.updatedAt) || tsToDate(d.createdAt) || null;

      // apply date filter on created or skip
      if (from && created && created < from) return;
      if (to && created && created > to) return;

      totals.total++;
      if (created && created >= todayStart && created <= todayEnd) totals.todays++;

      // treat each document as an engagement record
      totals.engagements++;

      // monthly
      const mk = monthKey(created);
      if (!monthly[mk]) monthly[mk] = { prospects: 0, engagements: 0 };
      monthly[mk].engagements++;

      // if it's a prospect (userType/prospectName presence)
      const isProspect = (d.userType || "").toString().toLowerCase() === "prospect" || !!(d.prospectName || d.prospect_name);
      if (isProspect) {
        monthly[mk].prospects++;
      }

      // enrollment funnel: assume d.enrollmentStages[] exists and stage .checked or .status === 'Completed'
      const stages = Array.isArray(d.enrollmentStages) ? d.enrollmentStages : [];
      let lastCompleted = -1;
      stages.forEach((s, idx) => {
        if (s?.checked || (s?.status && (""+s.status).toLowerCase() === "completed")) lastCompleted = Math.max(lastCompleted, idx);
      });
      if (lastCompleted >= 0) funnelBuckets[lastCompleted] = (funnelBuckets[lastCompleted] || 0) + 1;

      // orbiter stats
      const orbiter = d.orbiterName || (d.orbiter && d.orbiter.name) || "Unknown";
      if (!orbiterMap[orbiter]) orbiterMap[orbiter] = { count: 0, prospects: 0, enrollCompleted: 0 };
      orbiterMap[orbiter].count++;
      if (isProspect) orbiterMap[orbiter].prospects++;
      if ((d.status || "").toString().toLowerCase().includes("choose to enroll") && lastCompleted === 4) orbiterMap[orbiter].enrollCompleted++;

      // add to recent list
      recentList.push({ id: d.id, title: d.prospectName || d.prospect_name || d.name || "Unknown", sub: d.type || d.status || "", created });
    });

    // prepare monthly array (sorted)
    const monthKeys = Object.keys(monthly).filter(k => k !== "unknown").sort();
    const monthlyArray = monthKeys.map(k => ({ month: k, prospects: monthly[k].prospects || 0, engagements: monthly[k].engagements || 0 }));

    // orbiter top
    const orbiterTop = Object.entries(orbiterMap).map(([name, v]) => ({ name, ...v })).sort((a,b) => (b.prospects||0) - (a.prospects||0)).slice(0, 10);

    setStats({
      totals,
      monthlyArray,
      funnelBuckets,
      orbiterTop,
      recentList: recentList.sort((a,b) => (b.created?.getTime() || 0) - (a.created?.getTime() || 0)).slice(0, 200),
    });
  }, [docs, fromDate, toDate]);

  const monthlyDataForChart = useMemo(() => {
    if (!stats) return [];
    return stats.monthlyArray.map(m => ({ month: m.month, prospects: m.prospects, engagements: m.engagements }));
  }, [stats]);

  const funnelData = useMemo(() => {
    if (!stats) return [];
    return (stats.funnelBuckets || []).map((v, i) => ({ stage: `Stage ${i+1}`, value: v }));
  }, [stats]);

  if (loading) return <div className="prospect-page"><h2 className="title">Loading prospects dashboard…</h2></div>;
  if (!stats) return <div className="prospect-page"><h2 className="title">No data found</h2></div>;

  return (
    <div className="prospect-page">
      <div className="header">
        <h1 className="title">Prospects Dashboard — (Collection: {COLLECTION})</h1>
        <div className="filter-row">
          <input className="filter-input" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          <input className="filter-input" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          <button className="btn" onClick={() => { setFromDate(""); setToDate(""); }}>Clear</button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="card">
          <div className="card-title">Total Records</div>
          <div className="card-val">{stats.totals.total}</div>
        </div>
        <div className="card">
          <div className="card-title">Today's New</div>
          <div className="card-val">{stats.totals.todays}</div>
        </div>
        <div className="card">
          <div className="card-title">Total Engagements</div>
          <div className="card-val">{stats.totals.engagements}</div>
        </div>
        <div className="card">
          <div className="card-title">Top Orbiters</div>
          <div className="card-val">{stats.orbiterTop.length}</div>
        </div>
      </div>

      <div className="charts-row">
        <div className="panel">
          <div className="panel-title">Monthly Prospect & Engagement Trend</div>
          <ClientCharts monthlyData={monthlyDataForChart} funnelData={[]} orbiterTop={[]} />
        </div>

        <div className="panel">
          <div className="panel-title">Enrollment Funnel & Orbiter Performance</div>
          <ClientCharts monthlyData={[]} funnelData={funnelData} orbiterTop={stats.orbiterTop} />
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 14 }}>
        <div className="panel-title">Top Orbiters — Summary</div>
        <table className="table">
          <thead><tr><th>Orbiter</th><th>Interactions</th><th>Prospects</th><th>Enroll Completed</th></tr></thead>
          <tbody>
            {stats.orbiterTop.map(o => (
              <tr key={o.name}><td>{o.name}</td><td>{o.count}</td><td>{o.prospects}</td><td>{o.enrollCompleted}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <div className="panel-title">Recent Prospect Activities</div>
        <div className="scroll-box">
          {stats.recentList.map(item => (
            <div className="recent-item" key={item.id}>
              <div className="recent-left">
                <div className="recent-title">{item.title}</div>
                <div className="recent-sub">{item.sub}</div>
              </div>
              <div className="recent-time">{item.created ? item.created.toLocaleString() : ""}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
