import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";

import "../../src/app/styles/user.scss";
import Layout from "../../component/Layout";
import HeaderNav from "../../component/HeaderNav";
import Headertop from "../../component/Header";

const CPDetails = () => {
  const router = useRouter();
  const { ujbCode } = router.query;

  const [user, setUser] = useState(null);
  const [activities, setActivities] = useState([]);
  const [filteredActivities, setFilteredActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("All");
  const [totalPoints, setTotalPoints] = useState(0);

  useEffect(() => {
    if (!ujbCode) return;

    const fetchData = async () => {
      try {
        // 🔹 Fetch CPBoard user
        const userSnap = await getDoc(doc(db, "CPBoard", ujbCode));
        if (userSnap.exists()) {
          setUser(userSnap.data());
        }

        // 🔹 Fetch activities
        const q = query(
          collection(db, "CPBoard", ujbCode, "activities"),
          orderBy("addedAt", "desc")
        );

        const snap = await getDocs(q);

        let total = 0;
        const rows = snap.docs.map((d) => {
          const data = d.data();
          total += Number(data.points || 0);
          return {
            id: d.id,
            ...data,
          };
        });

        setActivities(rows);
        setFilteredActivities(rows);
        setTotalPoints(total);
      } catch (err) {
        console.error("❌ Error loading CP details:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [ujbCode]);

  // 🔹 Filter categories
  const categories = ["All", "R", "H", "W"];

  const handleFilterClick = (cat) => {
    setActiveFilter(cat);
    if (cat === "All") {
      setFilteredActivities(activities);
    } else {
      setFilteredActivities(
        activities.filter((a) => a.categories?.includes(cat))
      );
    }
  };

  if (loading) {
    return (
      <div className="loader">
        <span className="loader2"></span>
      </div>
    );
  }

  return (
  
      <main className="pageContainer">
        <Headertop />

        <section className="dashBoardMain">
          <div className="container sectionHeadings">
            <h2>
              {user?.name || "User"} ({ujbCode})
            </h2>
            <h3>Total CP Points: {totalPoints}</h3>
          </div>

          {/* FILTER */}
          <div className="container filterTab">
            <h4>Filter by Category</h4>
            <ul>
              {categories.map((cat) => (
                <li
                  key={cat}
                  className={`navItem ${
                    activeFilter === cat ? "active" : ""
                  }`}
                  onClick={() => handleFilterClick(cat)}
                >
                  {cat === "R"
                    ? "Relation"
                    : cat === "H"
                    ? "Health"
                    : cat === "W"
                    ? "Wealth"
                    : "All"}
                </li>
              ))}
            </ul>
          </div>

          {/* ACTIVITIES */}
          {filteredActivities.length === 0 ? (
            <p>No activities found.</p>
          ) : (
            <div className="container suggestionList">
              {filteredActivities.map((activity) => (
                <div key={activity.id} className="suggestionBox">
                  <div className="suggestionDetails">
                    <span className="meetingLable2">
                      CP Points: {activity.points}
                    </span>
                    <span className="suggestionTime">
                      {activity.month}
                    </span>
                  </div>

                  <div className="suggestions">
                    <h4>{activity.activityName}</h4>
                    <p>{activity.purpose}</p>

                    <div className="cp-tags">
                      {activity.categories?.map((c) => (
                        <span key={c} className={`cpTag ${c}`}>
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <HeaderNav />
        </section>
      </main>
  
  );
};

export default CPDetails;
