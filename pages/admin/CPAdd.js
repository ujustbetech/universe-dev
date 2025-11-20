import { useState, useEffect } from "react";
import { db } from "../../firebaseConfig"; // Ensure Firestore is configured
import { collection, getDocs, doc,addDoc ,query,where,setDoc,getDoc} from "firebase/firestore";
import Layout from "../../component/Layout";
import { COLLECTIONS } from "/utility_collection";
import "../../src/app/styles/main.scss";

const activityTypes = {
  "Event Host (Offline)": { activityNo: "D005", points: 50 },
  "Event Segment Delivery (Offline)": { activityNo: "D006", points: 50 },
  "Event Segment Delivery (Online)": { activityNo: "D003", points: 25 },
  "Content (Video format) online": { activityNo: "C004", points: 10 },
  "Content (Video format) offline": { activityNo: "C005", points: 25 },
  "Event Support (Online)": { activityNo: "D004", points: 10 },
  "Content (Draft format) for Event": { activityNo: "C001", points: 25 }
};

export default function AddActivity() {
  const [ntMembers, setNtMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [activityType, setActivityType] = useState("");
  const [activityNo, setActivityNo] = useState("");
  const [points, setPoints] = useState("");
  const [activityDescription, setActivityDescription] = useState("");
const [searchName, setSearchName] = useState("");
const [searchResults, setSearchResults] = useState([]);
const [selectedMemberData, setSelectedMemberData] = useState(null);



const handleSearchChange = async (e) => {
  const value = e.target.value;
  setSearchName(value);

  if (value.length >= 2) {
    const userdetailsSnapshot = await getDocs(collection(db, "userdetails"));

    const allUsers = userdetailsSnapshot.docs
      .map((doc) => {
        const data = doc.data();
        const name = data[" Name"]?.trim();
        if (!name) return null;
        return {
          id: doc.id.trim(),
          name,
          phoneNumber: data["Mobile no"]?.trim(),
          role: data["Category"]?.trim() || "CosmOrbiter"
        };
      })
      .filter(Boolean);

    const results = allUsers.filter(user =>
      user.name.toLowerCase().includes(value.toLowerCase())
    );

    setSearchResults(results);
  } else {
    setSearchResults([]);
  }
};



  useEffect(() => {
    const fetchMembers = async () => {
      const querySnapshot = await getDocs(collection(db, "Orbiters"));
      const members = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setNtMembers(members);
    };
    fetchMembers();
  }, []);

const handleSelectMember = async (member) => {
  try {
    const phone = member.id.trim();
    const userRef = doc(db, "userdetails", phone);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      alert("User not found in userdetails.");
      return;
    }

    const data = userSnap.data();
    const name = data[" Name"]?.trim();
    const role = data["Category"]?.trim() || "CosmOrbiter";
    const phoneNumber = data["Mobile no"]?.trim();

    if (!name || !phoneNumber) {
      alert("Incomplete user data. Cannot add.");
      return;
    }

    const memberRef = doc(db, "Orbiters", phone);
    const memberSnap = await getDoc(memberRef);

    // ✅ Either create or update the doc
    await setDoc(memberRef, {
      id: phone,
      name,
      phoneNumber,
      role
    }, { merge: true });

    console.log("Orbiters doc created or updated");

    // Update local state
    setSelectedMember(name);
    setSelectedMemberData({
      id: phone,
      name,
      phoneNumber,
      role
    });
    setPhoneNumber(phone);
    setSearchName(name);
    setSearchResults([]);

  } catch (err) {
    console.error("Error selecting member:", err);
    alert("An error occurred while selecting this member.");
  }
};




  const handleActivityTypeChange = (e) => {
    const selectedType = e.target.value;
    setActivityType(selectedType);
    
    // Auto-fill Activity No & Points
    const { activityNo, points } = activityTypes[selectedType] || {};
    setActivityNo(activityNo || "");
    setPoints(points || "");
  };

const handleSubmit = async (e) => {
  e.preventDefault();
  if (!selectedMember || !activityType || !activityDescription) {
    return alert("Please fill all fields");
  }

  const { activityNo, points } = activityTypes[activityType] || {};

  const activitiesRef = collection(db, "Orbiters", phoneNumber, "activities");

await addDoc(activitiesRef, {
  month: new Date().toLocaleString("default", { month: "short", year: "numeric" }),
  activityNo,
  activityType,
  points,
  activityDescription,
  name: selectedMemberData?.name || "",
  phoneNumber
});


  alert("Activity added successfully!");
  setActivityType("");
  setActivityNo("");
  setPoints("");
  setActivityDescription("");
};

  return (
    <Layout>
      <section className="c-form box">
        <h2>Create New Event</h2>
        <h2>Add Activity</h2>
        <form onSubmit={handleSubmit}>
          <ul>
    <li className="form-row">
  <h4>Search Member<sup>*</sup></h4>
  <div className="autosuggest">
    <input
      type="text"
      value={searchName}
      onChange={handleSearchChange}
      placeholder="Type member name"
    />
    {searchResults.length > 0 && (
   <ul className="dropdown" >
  {searchResults.map((user) => (
    <li key={user.id} onClick={() => handleSelectMember(user)}>
      {user.name}
    </li>
  ))}
</ul>

    )}
  </div>
</li>


  
            <li className="form-row">
              <h4>Phone Number<sup>*</sup></h4>
              <div className="multipleitem">
                <input type="text" value={phoneNumber} readOnly />
              </div>
            </li>
  
            <li className="form-row">
              <h4>Select Activity<sup>*</sup></h4>
              <div className="multipleitem">
                <select onChange={handleActivityTypeChange} value={activityType}>
                  <option value="">Select Activity</option>
                  {Object.keys(activityTypes).map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
            </li>
  
            <li className="form-row">
              <h4>Activity No<sup>*</sup></h4>
              <div className="multipleitem">
                <input type="text" value={activityNo} readOnly />
              </div>
            </li>
  
            <li className="form-row">
              <h4>Points<sup>*</sup></h4>
              <div className="multipleitem">
                <input type="text" value={points} readOnly />
              </div>
            </li>
  
            <li className="form-row">
              <h4>Activity Description<sup>*</sup></h4>
              <div className="multipleitem">
                <input
                  type="text"
                  value={activityDescription}
                  onChange={(e) => setActivityDescription(e.target.value)}
                />
              </div>
            </li>
            <li className='form-row'>
            <div>
              <button className='submitbtn' type='submit' >
              Add Activity
              </button>
            </div>    
          </li>
         
          </ul>
        </form>
      </section>
    </Layout>
  );
}  