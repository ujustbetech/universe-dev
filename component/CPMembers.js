import { useState, useEffect } from "react";
import { db } from "../firebaseConfig"; // Adjust Firebase config path
import { COLLECTIONS } from "/utility_collection";
import { collection, getDocs, addDoc, deleteDoc, doc, setDoc } from "firebase/firestore";
import "../src/app/styles/main.scss";
import { FaSearch } from "react-icons/fa";

const UserList = () => {
    const [searchInput, setSearchInput] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [teamMembers, setTeamMembers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Fetch already added team members
    useEffect(() => {
        const fetchTeamMembers = async () => {
            try {
                const teamSnapshot = await getDocs(teamCollection);
                const teamList = teamSnapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                }));
                setTeamMembers(teamList);
            } catch (err) {
                console.error("Error fetching team members:", err);
            }
        };
        fetchTeamMembers();
    }, []);

    const handleSearch = async () => {
        if (!searchInput.trim()) {
            console.log("Search input is empty");
            return;
        }

        setLoading(true);
        try {
            const userCollection = collection(db, 'userdetails');
            const querySnapshot = await getDocs(userCollection);

            const allUsers = querySnapshot.docs.map((doc) => {
                const data = doc.data();
                return {
                    id: doc.id,
                    phoneNumber: data["Mobile no"],
                    name: data[" Name"]?.trim(),
                    role: data["Category"],
                };
            });

            // Filter users who are NOT already in the team
            const results = allUsers.filter(
                (user) =>
                    user.name?.toLowerCase().includes(searchInput.toLowerCase()) &&
                    !teamMembers.some((member) => member.id === user.id)
            );

            setSearchResults(results);
        } catch (err) {
            console.error("Error searching user:", err);
            setError("Error searching user.");
        }
        setLoading(false);
    };

    // Add user to team
    const addUserToTeam = async (user) => {
        console.log("users" , user.id);
        
        try {
           await setDoc(doc(db, COLLECTIONS.orbiter, user.id), user);
const newMember = { ...user };


            setTeamMembers([...teamMembers, newMember]); // Update UI
            setSearchResults(searchResults.filter((u) => u.id !== user.id)); // Remove from search results
        } catch (err) {
            console.error("Error adding user:", err);
        }
    };

    // Remove user from team
    const removeUserFromTeam = async (userId) => {
        try {
            await deleteDoc(doc(db, COLLECTIONS.orbiter, userId));
            setTeamMembers(teamMembers.filter((user) => user.id !== userId)); // Update UI
        } catch (err) {
            console.error("Error deleting user:", err);
        }
    };

    return (
        <section className="c-form box">
            <h2>Manage Team Members</h2>
            <button className="m-button-5" onClick={() => window.history.back()}>Back</button>
<ul>
            {/* Search Input */}
            <li className='form-row'>
            <h4>Name:<sup>*</sup></h4>
            <div className='multipleitem'>
                <input
                    type="text"
                    className="searchTerm"
                    placeholder="Search by Name"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                />
             
                <div>
          <button className="submitbtn" type="button"onClick={handleSearch}>
            Search
          </button>
          </div>
          
            </div>
            
          </li>

          </ul>

            {/* Search Results */}
            {loading && <div className="loader"><span className="loader2"></span></div>}
            {error && <p style={{ color: "red" }}>{error}</p>}
            {searchResults.length > 0 && (
                <table className="table-class">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Mobile No</th>
                            <th>Role</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {searchResults.map((user) => (
                            <tr key={user.id}>
                                <td>{user.name || "No name"}</td>
                                <td>{user.phoneNumber || "No phone"}</td>
                                <td>{user.role || "User"}</td>
                                <td>
                                    <button className="m-button-7" onClick={() => addUserToTeam(user)}>
                                        Add to Team
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {/* Team Members List */}
            {teamMembers.length > 0 && (
                <>
                  
                    <table className="table-class">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Mobile No</th>
                                <th>Role</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {teamMembers.map((user) => (
                                <tr key={user.id}>
                                    <td>{user.name}</td>
                                    <td>{user.phoneNumber}</td>
                                    <td>{user.role}</td>
                                    <td>
                                        <button
                                            className="m-button-7"
                                            onClick={() => removeUserFromTeam(user.id)}
                                            style={{ backgroundColor: "#f16f06", color: "white" }}
                                        >
                                            Remove
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </>
            )}
        </section>
    );
};

export default UserList;
