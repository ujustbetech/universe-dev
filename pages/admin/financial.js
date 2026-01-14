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
} from "recharts";
import Layout from "../../component/Layout";
import "../../src/app/styles/main.scss";

/* ================= HELPERS ================= */

const toDate = (ts) => {
  if (!ts) return null;
  if (ts.seconds) return new Date(ts.seconds * 1000);
  if (typeof ts === "string") {
    const d = new Date(ts);
    return isNaN(d) ? null : d;
  }
  return null;
};

const getPeriodKey = (date, view) => {
  const d = new Date(date);
  if (view === "daily") return d.toISOString().split("T")[0];
  if (view === "weekly") {
    const start = new Date(d.getFullYear(), 0, 1);
    const week = Math.ceil(
      ((d - start) / 86400000 + start.getDay() + 1) / 7
    );
    return `${d.getFullYear()}-W${week}`;
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

/* ================= MAIN ================= */

export default function AdminFinancialOverview() {
  const [referrals, setReferrals] = useState([]);
  const [view, setView] = useState("monthly");

  /* ================= FIRESTORE (SAME DB) ================= */

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "Referraldev"), (snap) => {
      setReferrals(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  /* ================= EXECUTIVE TOTALS ================= */

  const totals = useMemo(() => {
    let plannedIncome = 0;
    let actualReceived = 0;
    let totalExpense = 0;

    referrals.forEach((r) => {
      const planned =
        Number(r.agreedAmount) || Number(r.dealValue) || 0;

      plannedIncome += planned;

      (r.payments || []).forEach((p) => {
        const amt = Number(p.amountReceived || 0);

        if (p.status === "Paid") {
          actualReceived += amt;
          totalExpense += amt;
        }
      });
    });

    return {
      plannedIncome,
      actualReceived,
      totalExpense,
      net: actualReceived - totalExpense,
      variance:
        plannedIncome > 0
          ? (((actualReceived - plannedIncome) / plannedIncome) * 100).toFixed(1)
          : 0,
    };
  }, [referrals]);

  /* ================= TREND DATA ================= */

  const trendData = useMemo(() => {
    const map = {};

    referrals.forEach((r) => {
      const date = toDate(r.createdAt);
      if (!date) return;

      const key = getPeriodKey(date, view);
      if (!map[key]) {
        map[key] = {
          period: key,
          planned: 0,
          received: 0,
          expense: 0,
        };
      }

      const planned =
        Number(r.agreedAmount) || Number(r.dealValue) || 0;

      map[key].planned += planned;

      (r.payments || []).forEach((p) => {
        if (p.status === "Paid") {
          const amt = Number(p.amountReceived || 0);
          map[key].received += amt;
          map[key].expense += amt;
        }
      });
    });

    return Object.values(map).sort((a, b) =>
      a.period.localeCompare(b.period)
    );
  }, [referrals, view]);

  /* ================= CATEGORY (OPS / ORBITER / UJB) ================= */

  const pieData = useMemo(() => {
    const map = {};

    referrals.forEach((r) => {
      (r.payments || []).forEach((p) => {
        if (p.status !== "Paid") return;

        const key = p.paidTo || p.ujbShareType || "Other";
        map[key] = (map[key] || 0) + Number(p.amountReceived || 0);
      });
    });

    return Object.keys(map).map((k) => ({
      name: k,
      value: map[k],
    }));
  }, [referrals]);

  const PIE_COLORS = ["#2563eb", "#16a34a", "#dc2626", "#8b5cf6", "#f59e0b"];

  /* ================= APPROVAL AGING ALERTS ================= */

  const alerts = useMemo(() => {
    const now = new Date();

    return referrals.flatMap((r) =>
      (r.payments || [])
        .filter((p) => p.status !== "Paid" && toDate(p.createdAt))
        .map((p) => {
          const created = toDate(p.createdAt);
          const days =
            Math.floor((now - created) / (1000 * 60 * 60 * 24)) || 0;

          return {
            id: r.id,
            category: p.paidTo || p.ujbShareType || "Other",
            amount: Number(p.amountReceived || 0),
            days,
          };
        })
        .filter((a) => a.amount > 50000 || a.days > 3)
    );
  }, [referrals]);

  /* ================= UI ================= */

  return (
    <Layout>
      <div className="admin-page">
        <h2 className="page-title">Financial Activity Overview</h2>

        {/* SUMMARY */}
        <div className="card-grid">
          <Card label="Planned Income" value={`₹${totals.plannedIncome}`} />
          <Card label="Actual Received" value={`₹${totals.actualReceived}`} />
          <Card label="Total Expense" value={`₹${totals.totalExpense}`} />
          <Card label="Variance %" value={`${totals.variance}%`} />
        </div>

        {/* VIEW TOGGLE */}
        <div style={{ marginBottom: 12 }}>
          <select value={view} onChange={(e) => setView(e.target.value)}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>

        {/* TREND */}
        <div className="panel">
          <h4>Planned vs Received vs Expense</h4>
          <ResponsiveContainer height={320}>
            <BarChart data={trendData}>
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="planned" fill="#94a3b8" />
              <Bar dataKey="received" fill="#16a34a" />
              <Bar dataKey="expense" fill="#dc2626" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* PIE + ALERTS */}
        <div className="two-col-grid">
          <div className="panel">
            <h4>Expense Distribution</h4>
            <ResponsiveContainer height={260}>
              <PieChart>
                <Pie data={pieData} dataKey="value" outerRadius={90}>
                  {pieData.map((_, i) => (
                    <Cell
                      key={i}
                      fill={PIE_COLORS[i % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="panel">
            <h4>Approval Aging Alerts</h4>
            {alerts.length === 0 && <p>No high-risk pending approvals</p>}
            {alerts.map((a, i) => (
              <p key={i} style={{ color: "#dc2626" }}>
                {a.category} • ₹{a.amount} • {a.days} days pending
              </p>
            ))}
          </div>
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
