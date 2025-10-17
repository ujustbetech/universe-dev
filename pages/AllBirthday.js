import React, { useEffect, useState } from "react";
import { db } from "../firebaseConfig";
import { collection, getDocs, getDoc, doc } from "firebase/firestore";
import Layout from "../component/Layout";
import "../src/app/styles/main.scss";

const BirthdayPage = () => {
  const [allUsers, setAllUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");

  const fetchAllBirthdayUsers = async () => {
    const querySnapshot = await getDocs(collection(db, "userdetail"));
    const users = [];

    for (const docSnap of querySnapshot.docs) {
      const data = docSnap.data();
      const dobString = data["DOB"];
      if (!dobString || !dobString.includes("/")) continue;

      const [day, month, year] = dobString.split("/").map((val) => val.trim());
      const phone = (data["Mobile no"] || "").trim();

      if (!phone) continue;

      let status = "Incomplete";
      let imageUrl = "";

      try {
        const birthdayDocRef = doc(db, "birthdaycanva", phone);
        const birthdayDocSnap = await getDoc(birthdayDocRef);
        if (birthdayDocSnap.exists()) {
          const birthdayData = birthdayDocSnap.data();
          status = "Complete";
          imageUrl = birthdayData.imageUrl || "";
        }
      } catch (err) {
        console.error("Error fetching birthdaycanva data for", phone, err);
      }

      const sortKey = `${month.padStart(2, "0")}-${day.padStart(2, "0")}`;

      users.push({
        id: docSnap.id,
        ...data,
        dobFormatted: `${day}/${month}`,
        sortKey,
        cleanPhone: phone,
        month,
        status,
        imageUrl,
      });
    }

    users.sort((a, b) => (a.sortKey > b.sortKey ? 1 : -1));
    setAllUsers(users);
    setFilteredUsers(users);
  };

  useEffect(() => {
    fetchAllBirthdayUsers();
  }, []);

  useEffect(() => {
    let filtered = allUsers;

    if (selectedMonth) {
      filtered = filtered.filter((user) => user.month === selectedMonth);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((user) =>
        (user["Name"] || "").toLowerCase().includes(term)
      );
    }

    setFilteredUsers(filtered);
  }, [searchTerm, selectedMonth, allUsers]);

  return (
    <Layout>
      <section className="c-userslist box">
        <h2>🎂 Birthday List (Sorted by Month & Day)</h2>

        {/* Filters */}
        <div className="filters" style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
          <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
            <option value="">All Months</option>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={String(i + 1).padStart(2, "0")}>
                {new Date(0, i).toLocaleString("default", { month: "long" })}
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Search by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {filteredUsers.length === 0 ? (
          <p>No users found.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="table-class">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>DOB</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Gender</th>
                  <th>Category</th>
                  <th>UJB Code</th>
                  <th>Status</th>
                  <th>Image</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user, index) => (
                  <tr key={user.id}>
                    <td>{index + 1}</td>
                    <td>{user[" Name"]}</td>
                    <td>{user.dobFormatted}</td>
                    <td>{user.cleanPhone}</td>
                    <td>{user["Email"]}</td>
                    <td>{user["Gender"]}</td>
                    <td>{user["Category"]}</td>
                    <td>{user["UJB Code"]}</td>
                    <td>{user.status}</td>
                    <td>
                      {user.imageUrl ? (
                        <img
                          src={user.imageUrl}
                          alt="Preview"
                          style={{
                            width: "50px",
                            height: "50px",
                            objectFit: "cover",
                            borderRadius: "50%",
                          }}
                        />
                      ) : (
                        "-"
                      )}
                    </td>
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

export default BirthdayPage;
