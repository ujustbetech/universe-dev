// pages/prospect-dashboard.js
import React, { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import "../../src/app/styles/page/ReferralLiveDashboard.css";

/* ================= HELPERS ================= */

const parseAnyDate = (v) => {
  if (!v) return null;
  if (v?.seconds) return new Date(v.seconds * 1000);
  if (v instanceof Date) return v;
  if (typeof v === "string") {
    const d = new Date(v.replace("at", "").replace(/\./g, ":"));
    return isNaN(d) ? null : d;
  }
  return null;
};

const daysDiff = (a, b) =>
  Math.floor((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));

const getPipelineStage = (p) => {
  const stages = p.enrollmentStages || [];
  if (stages.some((s) => s.checked && s.label?.toLowerCase().includes("completion")))
    return "Enrolled";
  if (stages.some((s) => s.checked)) return "Enrollment Pending";
  if (p.event) return "Connected";
  return "New";
};

/* ================= CHART ================= */

const ClientCharts = dynamic(
  () =>
    Promise.resolve({
      default: function Charts({ data }) {
        const {
          ResponsiveContainer,
          LineChart,
          Line,
          CartesianGrid,
          XAxis,
          YAxis,
          Tooltip,
        } = require("recharts");

        return (
          <ResponsiveContainer height={260}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Line dataKey="count" stroke="#0aa2ff" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        );
      },
    }),
  { ssr: false }
);

/* ================= MAIN ================= */

export default function ProspectDashboardPage() {
  const COLLECTION = "Prospects";
  const [docs, setDocs] = useState([]);
  const [view, setView] = useState("daily");
  const [tab, setTab] = useState("dashboard");
  const [doneMap, setDoneMap] = useState({});
  const [snoozeMap, setSnoozeMap] = useState({});

  /* ===== Persist Actions ===== */
  useEffect(() => {
    setDoneMap(JSON.parse(localStorage.getItem("done") || "{}"));
    setSnoozeMap(JSON.parse(localStorage.getItem("snooze") || "{}"));
  }, []);

  const markDone = (id) => {
    const updated = { ...doneMap, [id]: true };
    setDoneMap(updated);
    localStorage.setItem("done", JSON.stringify(updated));
  };

  const snooze = (id, days = 1) => {
    const until = Date.now() + days * 86400000;
    const updated = { ...snoozeMap, [id]: until };
    setSnoozeMap(updated);
    localStorage.setItem("snooze", JSON.stringify(updated));
  };

  /* ===== Firestore ===== */
  useEffect(() => {
    let unsub;
    (async () => {
      const { initializeApp, getApps } = await import("firebase/app");
      const { getFirestore, collection, query, orderBy, onSnapshot } =
        await import("firebase/firestore");

      if (!getApps().length)
        initializeApp({
          apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
          authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        });

      const db = getFirestore();
      unsub = onSnapshot(
        query(collection(db, COLLECTION), orderBy("registeredAt", "desc")),
        (snap) => setDocs(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      );
    })();
    return () => unsub && unsub();
  }, []);

  const today = new Date();

  /* ================= DERIVED ================= */

  const activeDocs = docs.filter(
    (p) => !doneMap[p.id] && (!snoozeMap[p.id] || snoozeMap[p.id] < Date.now())
  );

  /* ---- Progress ---- */
  const progressData = useMemo(() => {
    const map = {};
    activeDocs.forEach((p) => {
      const d = parseAnyDate(p.registeredAt);
      if (!d) return;
      let key =
        view === "daily"
          ? d.toDateString()
          : view === "weekly"
          ? `W${Math.ceil(d.getDate() / 7)}`
          : `${d.getMonth() + 1}/${d.getFullYear()}`;
      map[key] = (map[key] || 0) + 1;
    });
    return Object.keys(map).map((k) => ({ label: k, count: map[k] }));
  }, [activeDocs, view]);

  /* ---- Kanban ---- */
  const pipeline = useMemo(() => {
    const p = {
      New: [],
      Connected: [],
      "Enrollment Pending": [],
      Enrolled: [],
    };
    activeDocs.forEach((d) => p[getPipelineStage(d)].push(d));
    return p;
  }, [activeDocs]);

  /* ---- Orbiter ---- */
  const orbiters = useMemo(() => {
    const map = {};
    docs.forEach((p) => {
      const o = p.orbiterName || "Unknown";
      if (!map[o]) map[o] = { total: 0, enrolled: 0, stuck: 0 };
      map[o].total++;
      if (getPipelineStage(p) === "Enrolled") map[o].enrolled++;
      if (daysDiff(today, parseAnyDate(p.updatedAt || p.registeredAt)) > 7)
        map[o].stuck++;
    });
    return map;
  }, [docs]);

  /* ================= UI ================= */

  return (
    <div className="prospect-page">
      <h1>Admin Prospect Dashboard</h1>

      {/* TOP NAV */}
      <div className="view-toggle">
        {["dashboard", "pipeline", "orbiters"].map((t) => (
          <button key={t} onClick={() => setTab(t)} className={tab === t ? "active" : ""}>
            {t.toUpperCase()}
          </button>
        ))}
      </div>

      {/* VIEW MODE */}
      <div className="view-toggle">
        {["daily", "weekly", "monthly"].map((v) => (
          <button key={v} onClick={() => setView(v)} className={view === v ? "active" : ""}>
            {v.toUpperCase()}
          </button>
        ))}
      </div>

      {/* DASHBOARD */}
      {tab === "dashboard" && (
        <>
          <ClientCharts data={progressData} />

          <div className="panel">
            <div className="panel-title">📌 Today’s Actions</div>
            {activeDocs.slice(0, 10).map((p) => (
              <div key={p.id} className="recent-item">
                <strong>{p.prospectName}</strong>
                <span>{p.orbiterName}</span>
                <button onClick={() => markDone(p.id)}>✔ Done</button>
                <button onClick={() => snooze(p.id, 1)}>⏰ Snooze</button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* PIPELINE */}
      {tab === "pipeline" && (
        <div className="kanban">
          {Object.keys(pipeline).map((k) => (
            <div key={k} className="kanban-col">
              <h3>{k}</h3>
              {pipeline[k].map((p) => (
                <div key={p.id} className="kanban-card">
                  {p.prospectName}
                  <div className="small">{p.orbiterName}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* ORBITERS */}
      {tab === "orbiters" && (
        <div className="panel">
          <div className="panel-title">👥 Orbiter Performance</div>
          {Object.entries(orbiters).map(([o, d]) => (
            <div key={o} className="recent-item">
              <strong>{o}</strong>
              <span>Total: {d.total}</span>
              <span>Enrolled: {d.enrolled}</span>
              <span>Stuck: {d.stuck}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
