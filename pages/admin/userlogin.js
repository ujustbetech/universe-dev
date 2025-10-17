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
        const q = query(collection(db, "LoginLogs"), orderBy("loginTime", "desc"));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map((doc) => {
          const logData = doc.data();
          console.log("Logs", logData);
          
          return {
            id: doc.id,
            phoneNumber: logData.phoneNumber || "—",
            name: logData.name || "—", // ✅ use proper name field
            loginTime: logData.loginTime?.toDate
              ? logData.loginTime.toDate()
              : new Date(logData.loginTime),
            ipAddress: logData.ipAddress || "—",
            deviceInfo: logData.deviceInfo || "—",
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
          <table className="table-class">
            <thead>
              <tr>
                <th>#</th>
                <th>Phone Number</th>
                <th>Name</th>
                <th>Login Time</th>
                <th>Page Name</th>
                <th>IP Address</th>
                <th>Device Info</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, index) => (
                <tr key={log.id}>
                  <td>{index + 1}</td>
                  <td>{log.phoneNumber}</td>
                  <td>{log.name}</td> {/* ✅ show name here */}
                  <td>
                    {log.loginTime
                      ? log.loginTime.toLocaleString("en-GB", {
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
                  <td>{log.pageName}</td>
                  <td>{log.ipAddress}</td>
                  <td
                    style={{
                      maxWidth: "400px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {log.deviceInfo}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </Layout>
  );
};

export default AdminLoginLogs;
