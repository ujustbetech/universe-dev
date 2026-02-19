import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { useAuth } from "../context/authContext";
import Swal from "sweetalert2";
import { BiSolidCoinStack } from "react-icons/bi";

const Headertop = () => {
  const { user, logout } = useAuth();
  const [cpPoints, setCPPoints] = useState(0);
  const router = useRouter();

  /* ================= FETCH CP POINTS ================= */

  useEffect(() => {
    if (!user?.ujbCode) return;

    fetchCPPoints(user.ujbCode);
  }, [user]);

  const fetchCPPoints = async (ujbCode) => {
    try {
      const activitiesRef = collection(
        db,
        "CPBoard",
        ujbCode,
        "activities"
      );

      const snap = await getDocs(activitiesRef);

      let total = 0;

      snap.forEach((doc) => {
        const pts = Number(doc.data()?.points) || 0;
        total += pts;
      });

      setCPPoints(total);
    } catch (err) {
      console.error("Error fetching CP points:", err);
    }
  };

  const getInitials = (name) =>
    name ? name.split(" ").map((w) => w[0]).join("") : "";

  const handleLogout = () => {
    Swal.fire({
      title: "Logout?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes",
    }).then((res) => {
      if (res.isConfirmed) logout();
    });
  };

  if (!user) return null;

  return (
    <header className="Main m-Header">
      <section className="container">
        <div className="innerLogo" onClick={() => router.push("/")}>
          <img src="/ujustlogo.png" alt="Logo" className="logo" />
          <div className="beta">BETA</div>
        </div>

        <div className="headerRight">
          {/* 🔥 Correct CP Button */}
          <button
            onClick={() =>
              router.push(`/cp-details/${user.ujbCode}`)
            }
            className="reward-btn"
          >
            <BiSolidCoinStack size={18} /> CP: {cpPoints}
          </button>

          <div className="userName" onClick={handleLogout}>
            <span>{getInitials(user.name)}</span>
          </div>
        </div>
      </section>
    </header>
  );
};

export default Headertop;
