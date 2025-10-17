import { useState, useEffect } from "react";
import { db } from "../../firebaseConfig";
import { collection, getDocs } from "firebase/firestore";
import Layout from "../../component/Layout";
import "../../src/app/styles/main.scss";

export default function CPPointsSummary() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMembersWithPoints = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "Orbiters"));
        const membersData = [];

        for (const docSnap of querySnapshot.docs) {
          const data = docSnap.data();
          const member = {
            id: docSnap.id,
            name: data.name || "—",
            phoneNumber: data.phoneNumber || "—",
            totalPoints: 0,
          };

          // Fetch activities subcollection for each member
          const activitiesSnapshot = await getDocs(
            collection(db, "Orbiters", docSnap.id, "activities")
          );

          let totalPoints = 0;
          activitiesSnapshot.forEach((activityDoc) => {
            const activity = activityDoc.data();
            totalPoints += parseInt(activity.points) || 0;
          });

          member.totalPoints = totalPoints;
          membersData.push(member);
        }

        setMembers(membersData);
      } catch (error) {
        console.error("Error fetching members:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMembersWithPoints();
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
          <p>No members found.</p>
        ) : (
          <table className="table-class">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone Number</th>
                <th>Total CP Points</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id}>
                  <td>{member.name}</td>
                  <td>{member.phoneNumber}</td>
                  <td>{member.totalPoints}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </Layout>
  );
}
