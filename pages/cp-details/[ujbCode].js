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
  const [relationPoints, setRelationPoints] = useState(0);
  const [healthPoints, setHealthPoints] = useState(0);
  const [wealthPoints, setWealthPoints] = useState(0);

  /* 🔥 MINIMUM REDEEM LOGIC */
  const minimumRequired = 250;
  const canRedeem = totalPoints >= minimumRequired;
  const pointsShort = minimumRequired - totalPoints;

  useEffect(() => {
    if (!ujbCode) return;

    const fetchData = async () => {
      try {
        const userSnap = await getDoc(doc(db, "CPBoard", ujbCode));
        if (userSnap.exists()) {
          setUser(userSnap.data());
        }

        const q = query(
          collection(db, "CPBoard", ujbCode, "activities"),
          orderBy("addedAt", "desc")
        );

        const snap = await getDocs(q);

        let total = 0;
        let relation = 0;
        let health = 0;
        let wealth = 0;

        const rows = snap.docs.map((d) => {
          const data = d.data();
          const pts = Number(data.points || 0);

          total += pts;

          if (data.categories?.includes("R")) relation += pts;
          if (data.categories?.includes("H")) health += pts;
          if (data.categories?.includes("W")) wealth += pts;

          return {
            id: d.id,
            ...data,
          };
        });

        setActivities(rows);
        setFilteredActivities(rows);

        setTotalPoints(total);
        setRelationPoints(relation);
        setHealthPoints(health);
        setWealthPoints(wealth);
      } catch (err) {
        console.error("Error loading CP details:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [ujbCode]);

  /* 🔥 REDIRECT FUNCTION */
  const goToDeals = (tab) => {
    router.push(`/Dealsforyou?tab=${tab}`);
  };

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
        </div>

        {/* 🔥 POINT SUMMARY CARDS */}
        <div className="container pointsCards">

          {/* TOTAL CARD WITH REDEEM */}
          <div className="pointCard totalCard">
            <h4>Total Points</h4>
            <h2>{totalPoints}</h2>

            <button
              className="redeem-btn"
              disabled={!canRedeem}
              onClick={() => router.push("/Dealsforyou")}
            >
              Redeem Now
            </button>

            {!canRedeem && (
              <p className="redeem-warning">
                You need {pointsShort} more points to redeem
              </p>
            )}
          </div>

          <div
            className="pointCard relationCard"
            onClick={() => goToDeals("R")}
          >
            <h4>Relation</h4>
            <h2>{relationPoints}</h2>
          </div>

          <div
            className="pointCard healthCard"
            onClick={() => goToDeals("H")}
          >
            <h4>Health</h4>
            <h2>{healthPoints}</h2>
          </div>

          <div
            className="pointCard wealthCard"
            onClick={() => goToDeals("W")}
          >
            <h4>Wealth</h4>
            <h2>{wealthPoints}</h2>
          </div>
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
          <p style={{ textAlign: "center" }}>No activities found.</p>
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
