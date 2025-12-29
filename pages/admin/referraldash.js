"use client";

import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import RightDrawer from "../../component/RightDrawer";
import "../../src/app/styles/page/ReferralLiveDashboard.css";

/* ================= HELPERS ================= */

const tsToDate = (ts) => (ts?.seconds ? new Date(ts.seconds * 1000) : null);

const pipelineStage = (d) => {
  const s = (d?.cosmoOrbiter?.dealStatus || "").toLowerCase();
  if (!s) return "New";
  if (s.includes("lost")) return "Lost";
  if (s.includes("full") || s.includes("received")) return "Paid";
  if (s.includes("part") || s.includes("progress")) return "In Progress";
  return "New";
};

/* ================= CHART ================= */

const AreaChartComp = dynamic(
  () =>
    Promise.resolve(({ data }) => {
      const {
        ResponsiveContainer,
        AreaChart,
        Area,
        XAxis,
        YAxis,
        Tooltip,
      } = require("recharts");

      return (
        <ResponsiveContainer height={260}>
          <AreaChart data={data}>
            <XAxis dataKey="label" />
            <YAxis />
            <Tooltip />
            <Area dataKey="referrals" stroke="#60a5fa" fill="#1e3a8a" />
            <Area dataKey="revenue" stroke="#22c55e" fill="#14532d" />
          </AreaChart>
        </ResponsiveContainer>
      );
    }),
  { ssr: false }
);

/* ================= MAIN ================= */

export default function ReferralAdminDashboard() {
  const [docs, setDocs] = useState([]);
  const [range, setRange] = useState("monthly");
  const [stageFilter, setStageFilter] = useState("All");

  const [drawer, setDrawer] = useState(null); // referral | orbiter
  const [drawerData, setDrawerData] = useState(null);

  /* ===== FETCH ===== */
  useEffect(() => {
    const q = query(collection(db, "Referraldev"), orderBy("timestamp", "desc"));
    return onSnapshot(q, (snap) =>
      setDocs(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
  }, []);

  /* ===== FILTER ===== */
  const filtered = useMemo(() => {
    let out = [...docs];

    if (stageFilter !== "All") {
      out = out.filter((d) => pipelineStage(d) === stageFilter);
    }

    return out;
  }, [docs, stageFilter]);

  /* ===== KPIs ===== */
  const kpis = useMemo(() => {
    let revenue = 0;
    const counts = { New: 0, "In Progress": 0, Paid: 0, Lost: 0 };

    filtered.forEach((d) => {
      counts[pipelineStage(d)]++;
      (d.payments || []).forEach((p) => {
        if (p.paymentTo === "UJustBe")
          revenue += Number(p.amountReceived || 0);
      });
    });

    return { total: filtered.length, revenue, ...counts };
  }, [filtered]);

  /* ===== CHART DATA ===== */
  const chartData = useMemo(() => {
    const map = {};
    filtered.forEach((d) => {
      const dt = tsToDate(d.timestamp);
      if (!dt) return;

      const label =
        range === "daily"
          ? `${dt.getHours()}:00`
          : range === "weekly"
          ? dt.toLocaleDateString("en", { weekday: "short" })
          : dt.getDate();

      if (!map[label]) map[label] = { label, referrals: 0, revenue: 0 };
      map[label].referrals++;

      (d.payments || []).forEach((p) => {
        if (p.paymentTo === "UJustBe")
          map[label].revenue += Number(p.amountReceived || 0);
      });
    });
    return Object.values(map);
  }, [filtered, range]);

  /* ===== ORBITERS ===== */
  const orbiters = useMemo(() => {
    const map = {};
    filtered.forEach((d) => {
      const o = d?.orbiter?.name;
      if (!o) return;
      if (!map[o]) map[o] = { total: 0, paid: 0, revenue: 0 };
      map[o].total++;
      if (pipelineStage(d) === "Paid") map[o].paid++;
      (d.payments || []).forEach((p) => {
        if (p.paymentTo === "UJustBe")
          map[o].revenue += Number(p.amountReceived || 0);
      });
    });
    return Object.entries(map).map(([name, v]) => ({
      name,
      ...v,
      conversion: v.total ? Math.round((v.paid / v.total) * 100) : 0,
    }));
  }, [filtered]);

  /* ================= UI ================= */

  return (
    <div className="dash">
      {/* HEADER */}
      <div className="dash-header">
        <h1>Referral Admin Dashboard</h1>
        <div className="range">
          {["daily", "weekly", "monthly"].map((r) => (
            <button
              key={r}
              className={range === r ? "active" : ""}
              onClick={() => setRange(r)}
            >
              {r.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* KPI STRIP */}
      <div className="kpi-row">
        <div className="kpi">Total <h2>{kpis.total}</h2></div>
        <div className="kpi">New <h2>{kpis.New}</h2></div>
        <div className="kpi">In Progress <h2>{kpis["In Progress"]}</h2></div>
        <div className="kpi">Paid <h2>{kpis.Paid}</h2></div>
        <div className="kpi">Lost <h2>{kpis.Lost}</h2></div>
        <div className="kpi">Revenue <h2>₹{kpis.revenue}</h2></div>
      </div>

      {/* PIPELINE CARDS */}
      <div className="pipeline-row">
        {["All", "New", "In Progress", "Paid", "Lost"].map((p) => (
          <div
            key={p}
            className={`pipeline-card ${
              stageFilter === p ? "active" : ""
            }`}
            onClick={() => setStageFilter(p)}
          >
            {p}
          </div>
        ))}
      </div>

      {/* CHART */}
      <div className="panel">
        <h3>Referral Inflow</h3>
        <AreaChartComp data={chartData} />
      </div>

      {/* ORBITERS */}
      <div className="panel">
        <h3>Orbiter Performance</h3>
        <table>
          <thead>
            <tr>
              <th>Orbiter</th>
              <th>Total</th>
              <th>Paid</th>
              <th>Conversion</th>
              <th>Revenue</th>
            </tr>
          </thead>
          <tbody>
            {orbiters.map((o) => (
              <tr
                key={o.name}
                onClick={() => {
                  setDrawer("orbiter");
                  setDrawerData(o);
                }}
              >
                <td>{o.name}</td>
                <td>{o.total}</td>
                <td>{o.paid}</td>
                <td>{o.conversion}%</td>
                <td>₹{o.revenue}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* DRAWER */}
      <RightDrawer
        open={!!drawer}
        title={drawer === "orbiter" ? drawerData?.name : "Details"}
        onClose={() => setDrawer(null)}
      >
        {drawer === "orbiter" && drawerData && (
          <>
            <p>Total: {drawerData.total}</p>
            <p>Paid: {drawerData.paid}</p>
            <p>Revenue: ₹{drawerData.revenue}</p>
            <p>Conversion: {drawerData.conversion}%</p>
          </>
        )}
      </RightDrawer>
    </div>
  );
}
