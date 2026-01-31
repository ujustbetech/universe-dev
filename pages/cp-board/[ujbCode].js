import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";
import Layout from "../../component/Layout";
import "../../src/app/styles/main.scss";

export default function CPBoardDetails() {
  const router = useRouter();
  const { ujbCode } = router.query;

  const [user, setUser] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ujbCode) return;

    const fetchData = async () => {
      try {
        // 🔹 CPBoard User
        const userSnap = await getDoc(doc(db, "CPBoard", ujbCode));
        if (userSnap.exists()) {
          setUser(userSnap.data());
        }

        // 🔹 Activities
        const q = query(
          collection(db, "CPBoard", ujbCode, "activities"),
          orderBy("addedAt", "desc")
        );

        const snap = await getDocs(q);
        const rows = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));

        setActivities(rows);
      } catch (err) {
        console.error("❌ Error loading CP details", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [ujbCode]);

  if (loading)
    return (
      <div className="loader">
        <span className="loader2"></span>
      </div>
    );

  return (
    <Layout>
      <section className="c-userslist box">
        <button onClick={() => router.back()} className="btn-back">
          ← Back
        </button>

        <h2>CP Activity Log</h2>

        {user && (
          <div className="cp-user-card">
            <p><strong>Name:</strong> {user.name}</p>
            <p><strong>Phone:</strong> {user.phoneNumber}</p>
            <p><strong>Role:</strong> {user.role}</p>
          </div>
        )}

        {activities.length === 0 ? (
          <p>No CP activities found.</p>
        ) : (
          <table className="table-class">
            <thead>
              <tr>
                <th>Date</th>
                <th>Activity</th>
                <th>Category</th>
                <th>Points</th>
                <th>Purpose</th>
              </tr>
            </thead>

            <tbody>
              {activities.map((a) => (
                <tr key={a.id}>
                  <td>
                    {a.addedAt?.seconds
                      ? new Date(a.addedAt.seconds * 1000).toLocaleDateString()
                      : "—"}
                  </td>

                  <td>{a.activityName}</td>

                  <td>
                    <span className={`cp-badge ${a.categories?.[0] || "R"}`}>
                      {a.categories?.[0] === "R"
                        ? "Relation"
                        : a.categories?.[0] === "H"
                        ? "Health"
                        : "Wealth"}
                    </span>
                  </td>

                  <td>{a.points}</td>
                  <td>{a.purpose || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </Layout>
  );
}
