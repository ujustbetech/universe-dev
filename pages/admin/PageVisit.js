'use client';

import React, { useEffect, useState } from "react";
import { db } from "../../firebaseConfig";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import "../../src/app/styles/main.scss";
import Layout from "../../component/Layout";

const AdminLoginLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const q = query(collection(db, "PageVisits"), orderBy("startTime", "desc")); // Sort by startTime
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map((doc) => {
          const logData = doc.data();
          console.log("Logs", logData);

          return {
            id: doc.id,
            userName: logData.userName || "—",
            userPhone: logData.userPhone || "—",
            startTime: logData.startTime?.toDate
              ? logData.startTime.toDate()
              : new Date(logData.startTime),
            browser: logData.browser || "—",
            durationMs: logData.durationMs ?? "—",
            os: logData.os || "—",
            pageName: logData.pageName || "—",
            pageURL: logData.pageURL || "—",
            userAgent: logData.userAgent || "—",
            ipAddress: logData.ipAddress || "—", // Optional
            deviceInfo: logData.deviceInfo || "—", // Optional
          };
        });
        setLogs(data);
        setLoading(false);
      } catch (error) {
        console.error("Failed to fetch login logs:", error);
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

  return (
    <Layout>
      <section className="c-userslist box">
        <h2>Manage Login Logs</h2>

        {loading ? (
          <p>Loading...</p>
        ) : logs.length === 0 ? (
          <p>No login logs found.</p>
        ) : (
          <div className="table-wrapper">
            <table className="table-class">
              <thead>
                <tr>
                  <th>#</th>
                  <th>User Name</th>
                  <th>User Phone</th>
                  <th>Start Time</th>
                  <th>Browser</th>
                  <th>OS</th>
                  <th>Duration (ms)</th>
                  <th>Page Name</th>
                  <th>Page URL</th>
                  <th>User Agent</th>
                  <th>IP Address</th>
                  <th>Device Info</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, index) => (
                  <tr key={log.id}>
                    <td>{index + 1}</td>
                    <td>{log.userName}</td>
                    <td>{log.userPhone}</td>
                    <td>
                      {log.startTime
                        ? log.startTime.toLocaleString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                            hour12: true,
                          })
                        : "—"}
                    </td>
                    <td>{log.browser}</td>
                    <td>{log.os}</td>
                  <td>
  {typeof log.durationMs === "number"
    ? `${Math.floor(log.durationMs / 60000)} min ${Math.floor((log.durationMs % 60000) / 1000)} sec`
    : "—"}
</td>

                    <td>{log.pageName}</td>
                    <td>{log.pageURL}</td>
                    <td
                      style={{
                        maxWidth: "400px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={log.userAgent}
                    >
                      {log.userAgent}
                    </td>
                    <td>{log.ipAddress}</td>
                    <td>{log.deviceInfo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </Layout>
  );
};

export default AdminLoginLogs;
