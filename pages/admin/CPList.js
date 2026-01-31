import { useState, useEffect } from "react";
import { db } from "../../firebaseConfig";
import { collection, getDocs } from "firebase/firestore";
import Layout from "../../component/Layout";
import "../../src/app/styles/main.scss";

export default function CPPointsSummary() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCPBoard = async () => {
      try {
        const snap = await getDocs(collection(db, "CPBoard"));
        const rows = [];

        for (const d of snap.docs) {
          const data = d.data();

          let totalPoints = 0;

          // 🔹 Fetch activities
          const activitiesSnap = await getDocs(
            collection(db, "CPBoard", d.id, "activities")
          );

          activitiesSnap.forEach((a) => {
            totalPoints += Number(a.data().points || 0);
          });

          rows.push({
            id: d.id,
            name: data.name || "—",
            phoneNumber: data.phoneNumber || "—",
            role: data.role || "—",
            totalPoints,
          });
        }

        setMembers(rows);
      } catch (err) {
        console.error("❌ Error loading CP Board:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCPBoard();
  }, []);

  if (loading)
    return (
      <div className="loader">
        <span className="loader2"></span>
      </div>
    );

  return (
    <Layout>
      <section className="c-userslist box">
        <h2>CP Board</h2>

        {members.length === 0 ? (
          <p>No CP data found.</p>
        ) : (
          <table className="table-class">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone Number</th>
                <th>Role</th>
                <th>Total CP Points</th>
                <th>View</th>
              </tr>
            </thead>

            <tbody>
              {members.map((m) => (
                <tr key={m.id}>
                  <td>{m.name}</td>
                  <td>{m.phoneNumber}</td>
                  <td>{m.role}</td>
                  <td>{m.totalPoints}</td>
                  <td>
  <a
    href={`/cp-board/${m.id}`}
    style={{ color: "#2563eb", fontWeight: 600 }}
  >
    {m.name}
  </a>
</td>

                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </Layout>
  );
}
