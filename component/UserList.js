import { useState, useEffect } from 'react';
import { db } from '../firebaseConfig'; // Adjust your Firebase config path
import { collection, getDocs,setDoc, deleteDoc, doc } from 'firebase/firestore';
import "../src/app/styles/main.scss";
import { FaSearch } from "react-icons/fa";
import Swal from 'sweetalert2';
import { COLLECTIONS } from "/utility_collection";
import ExportButton from '../pages/admin/Export';

const UserList = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [nameFilter, setNameFilter] = useState(''); 
    const [phoneFilter, setPhoneFilter] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [deleteModalIsOpen, setDeleteModalIsOpen] = useState(false);

  const [mentors, setMentors] = useState([]); // ✅ Store mentor list
 
  const [userToDelete, setUserToDelete] = useState(null);

  const [newUser, setNewUser] = useState({
  name: '',
  phoneNumber: '',
  role: '',
  dob: '',
  email: '',
  gender: '',
  ujbCode: '',
  mentor: '',       // user input for mentor
  mentorName: '',   // mentor's real name fetched
  mentorPhone: '',  // mentor's phone fetched
  mentorUjbCode: '',// mentor's UJB Code fetched
});

  const formatDOB = (dob) => {
    const [year, month, day] = dob.split("-");
    return `${day}/${month}/${year}`;
  };
// Fetch users from 'usersdetail' collection (UJB Code as doc ID)
useEffect(() => {
  const fetchUsers = async () => {
    try {
      const userCollection = collection(db, COLLECTIONS.userDetail); // Correct collection
      const userSnapshot = await getDocs(userCollection);

      const userList = userSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id, // UJB Code as ID
          phoneNumber: data["MobileNo"] || '',  // match your Firestore field
          name: data["Name"] || '',             // match your Firestore field
          role: data["Category"] || '',
          idNumber: data["IDNumber"] || '', 
   ujbCode: data["ujbCode"] || data["UJBCode"] || '',


          status: data["ProfileStatus"] || '',
          mentorName: data["MentorName"] || '',
          mentorPhone: data["MentorPhone"] || '',
          mentorUjbCode: data["MentorUJBCode"] || ''
        };
      });

      setUsers(userList);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError('Error fetching user data.');
      setLoading(false);
    }
  };

  fetchUsers();
}, []);
// ✅ Fetch Mentors to show suggestion list
useEffect(() => {
  const fetchMentors = async () => {
    try {
      const mentorCollection = collection(db, COLLECTIONS.userDetail);
      const snapshot = await getDocs(mentorCollection);

     const mentorList = snapshot.docs.map(doc => {
  const data = doc.data();
  return {
    id: doc.id,
    name: data["Name"] || "",
    phone: data["MobileNo"] || "",
    ujbCode: data["ujbCode"] || data["UJBCode"] || ""
  };
});


      setMentors(mentorList);
    } catch (err) {
      console.error("Error fetching mentors:", err);
    }
  };

  fetchMentors();
}, []);
const validateForm = () => {
  if (!newUser.name.trim()) {
    Swal.fire("Please enter Name", "", "warning");
    return false;
  }

  if (!newUser.phoneNumber.trim() || !/^[6-9]\d{9}$/.test(newUser.phoneNumber)) {
    Swal.fire("Enter valid 10-digit Mobile Number", "", "warning");
    return false;
  }

  if (!newUser.role.trim()) {
    Swal.fire("Please select Category", "", "warning");
    return false;
  }

  if (!newUser.dob.trim()) {
    Swal.fire("Please select Date of Birth", "", "warning");
    return false;
  }

  if (
    newUser.email.trim() &&
    !/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(newUser.email)
  ) {
    Swal.fire("Please enter valid Email address", "", "warning");
    return false;
  }

  if (!newUser.gender.trim()) {
    Swal.fire("Please select gender", "", "warning");
    return false;
  }

  if (!newUser.ujbCode.trim()) {
    Swal.fire("Please enter UJB Code", "", "warning");
    return false;
  }

  return true;
};

 const handleAddUser = async (e) => {
  e.preventDefault();

  if (!validateForm()) return;

  const formattedDOB = formatDOB(newUser.dob);

  let mentorName = '';
  let mentorPhone = '';
  let mentorUjbCode = '';
  let mentorId = '';

  if (newUser.mentor && !newUser.mentorName) {
    Swal.fire("Select mentor from dropdown list only", "", "warning");
    return;
  }

  const selectedMentor = mentors.find((m) =>
    m.name.toLowerCase() === newUser.mentor.toLowerCase() ||
    m.phone === newUser.mentor
  );

  if (selectedMentor) {
    mentorName = selectedMentor.name;
    mentorPhone = selectedMentor.phone;
    mentorUjbCode = selectedMentor.ujbCode;
    mentorId = selectedMentor.id;
  } else {
    Swal.fire("Mentor not found!", "", "error");
    return;
  }

  // ✅ NO EXTRA BRACE HERE


  const userDoc = {
    "Name": newUser.name,
    "MobileNo": newUser.phoneNumber,
    "Category": newUser.role,
    "DOB": formattedDOB,
    "Email": newUser.email,
    "Gender": newUser.gender,
    "UJBCode": newUser.ujbCode,
    "MentorName": mentorName,
    "MentorPhone": mentorPhone,
    "MentorUJBCode": mentorUjbCode,
  };

  try {
    // ✅ Use UJB Code as document ID
    await setDoc(doc(db,COLLECTIONS.userDetail, newUser.ujbCode), userDoc);

    // ✅ Update mentor's connects if assigned
    if (mentorUjbCode) {
      const mentorRef = doc(db, COLLECTIONS.userDetail, mentorUjbCode);
      const mentorSnapshot = await getDocs(collection(db, COLLECTIONS.userDetail));
      const mentorData = mentorSnapshot.docs.find(d => d.id === mentorUjbCode)?.data();
      const existingConnects = mentorData?.connects || [];

      await setDoc(
        mentorRef,
        {
          connects: [
            ...existingConnects,
            {
              name: newUser.name,
              phone: newUser.phoneNumber,
              email: newUser.email,
              ujbCode: newUser.ujbCode
            }
          ]
        },
        { merge: true }
      );
    }

    setUsers([...users, {
      id: newUser.ujbCode,
      name: newUser.name,
      phoneNumber: newUser.phoneNumber,
      role: newUser.role,
      status: "incomplete"
    }]);

    // Reset form
    setNewUser({
      name: '',
      phoneNumber: '',
      role: '',
      dob: '',
      email: '',
      gender: '',
      ujbCode: '',
      mentor: '',
      mentorName: '',
      mentorPhone: '',
      mentorUjbCode: '',
    });

    Swal.fire({
      icon: "success",
      title: "User added successfully!",
      timer: 2000,
      showConfirmButton: false,
    });

  } catch (err) {
    console.error("Error adding user:", err);
    Swal.fire("Error", "Failed to add user.", "error");
  }
};

// ✅ Fetch users from 'usersdetail' with UJB Code as doc ID
useEffect(() => {
  const fetchUsers = async () => {
    try {
      const userCollection = collection(db, COLLECTIONS.userDetail);
      const userSnapshot = await getDocs(userCollection);

      const userList = userSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id, // UJB Code
          phoneNumber: data["MobileNo"] || '',
          name: data["Name"] || '',
          role: data["Category"] || '',
          idNumber: data["IDNumber"] || '',
     ujbCode: data["ujbCode"] || data["UJBCode"] || '',

          status: data["ProfileStatus"] || '',
          mentorName: data["MentorName"] || '',
          mentorPhone: data["MentorPhone"] || '',
          mentorUjbCode: data["MentorUJBCode"] || ''
        };
      });

      setUsers(userList);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError('Error fetching user data.');
      setLoading(false);
    }
  };

  fetchUsers();
}, []);


  const filteredUsers = users.filter(user => {
    const name = user.name?.toLowerCase() || '';
    const phone = user.phoneNumber?.toLowerCase() || '';
    const role = user.role?.toLowerCase() || '';
    return (
      name.includes(nameFilter.toLowerCase()) &&
      phone.includes(phoneFilter.toLowerCase()) &&
      role.includes(roleFilter.toLowerCase())
    );
  });

  const openDeleteModal = (user) => {
    setUserToDelete(user);
    setDeleteModalIsOpen(true);
  };

  const closeDeleteModal = () => {
    setDeleteModalIsOpen(false);
    setUserToDelete(null);
  };

 // Delete user by UJB Code
const deleteUser = async () => {
  if (userToDelete) {
    try {
      // ✅ Use usersdetail collection and UJB Code as doc ID
      await deleteDoc(doc(db, COLLECTIONS.userDetail, userToDelete.id));
      setUsers(users.filter(user => user.id !== userToDelete.id));
      closeDeleteModal();
      Swal.fire({
        icon: 'success',
        title: 'User deleted successfully!',
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (err) {
      console.error('Error deleting user:', err);
      Swal.fire("Error", "Failed to delete user.", "error");
    }
  }
};

// Fetch users from usersdetail with UJB Code as doc ID
useEffect(() => {
  const fetchUsers = async () => {
    try {
      const userCollection = collection(db, COLLECTIONS.userDetail);
      const userSnapshot = await getDocs(userCollection);

      const userList = userSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id, // UJB Code as ID
          phoneNumber: data["MobileNo"] || '',
          name: data["Name"] || '',
          role: data["Category"] || '',
          idNumber: data["IDNumber"] || '',
          status: data["ProfileStatus"] || '',
       ujbCode: data["ujbCode"] || data["UJBCode"] || '',


          mentorName: data["MentorName"] || '',
          mentorPhone: data["MentorPhone"] || '',
          mentorUjbCode: data["MentorUJBCode"] || '',
        };
      });

      setUsers(userList);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError('Error fetching user data.');
      setLoading(false);
    }
  };

  fetchUsers();
}, []);

   

    return (
        <>
            <section className='c-form box'>
                <h2>User Master Table List</h2>
            
                <ExportButton/>
<div>
  <h2>Add New User</h2>
  <form onSubmit={handleAddUser}>
    <ul>
      <li className='form-row'>
        <h4>Name<sup>*</sup></h4>
        <div className='multipleitem'>
          <input 
            type="text" 
            placeholder="Full Name" 
            value={newUser.name} 
            onChange={(e) => setNewUser({...newUser, name: e.target.value})} 
            required 
          />
        </div>
      </li>

      <li className='form-row'>
        <h4>Mobile no<sup>*</sup></h4>
        <div className='multipleitem'>
          <input 
            type="text" 
            placeholder="Mobile No" 
            value={newUser.phoneNumber} 
            onChange={(e) => setNewUser({...newUser, phoneNumber: e.target.value})} 
            required 
          />
        </div>
      </li>

      <li className='form-row'>
        <h4>Category<sup>*</sup></h4>
        <div className='multipleitem'>
          <select 
            value={newUser.role} 
            onChange={(e) => setNewUser({...newUser, role: e.target.value})}
            required
          >
            <option value="">Select Category</option>
            <option value="Orbiter">Orbiter</option>
            <option value="CosmOrbiter">CosmOrbiter</option>
          </select>
        </div>
      </li>

      <li className='form-row'>
        <h4>DOB<sup>*</sup></h4>
        <div className='multipleitem'>
          <input
            type="date"
            value={newUser.dob}
            onChange={(e) => setNewUser({ ...newUser, dob: e.target.value })}
            required
          />
        </div>
      </li>

      <li className='form-row'>
        <h4>Email<sup>*</sup></h4>
        <div className='multipleitem'>
          <input 
            type="text" 
            placeholder="Email" 
            value={newUser.email} 
            onChange={(e) => setNewUser({...newUser, email: e.target.value})} 
          />
        </div>
      </li>

      <li className='form-row'>
        <h4>Gender<sup>*</sup></h4>
        <div className='multipleitem'>
          <select 
            value={newUser.gender} 
            onChange={(e) => setNewUser({...newUser, gender: e.target.value})}
            required
          >
            <option value="">Select Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </div>
      </li>

      <li className='form-row'>
        <h4>UJB Code<sup>*</sup></h4>
        <div className='multipleitem'>
          <input 
            type="text" 
            placeholder="UJB Code" 
            value={newUser.ujbCode} 
            onChange={(e) => setNewUser({...newUser, ujbCode: e.target.value})} 
          />
        </div>
      </li>

      {/* ✅ NEW FIELD: Mentor Search */}
     <li className="form-row">
  <h4>Assign Mentor</h4>
  <div className="multipleitem" style={{ position: "relative" }}>

    <input
      type="text"
      placeholder="Search Mentor by Name or Mobile"
      value={newUser.mentor}
      onChange={(e) => setNewUser({ ...newUser, mentor: e.target.value })}
      autoComplete="off"
    />

    {newUser.mentor && (
      <ul className="mentor-dropdown">
        {mentors
          .filter((m) =>
            (m.name?.toLowerCase() || "").includes(newUser.mentor.toLowerCase()) ||
            m.phone?.includes(newUser.mentor)
          )
          .slice(0, 8) // show only 8 results
          .map((m) => (
            <li
              key={m.id}
              onClick={() => {
                setNewUser({
                  ...newUser,
                  mentor: m.name,
                  mentorName: m.name,
                  mentorPhone: m.phone,
                  mentorUjbCode: m.ujbCode,
                });
              }}
            >
              {m.name}
            </li>
          ))}
      </ul>
    )}
  </div>

 
</li>

      <li className='form-row'>
        <div className='multipleitem'>
          <button 
            type="submit" 
            className="m-button-7"
            style={{ backgroundColor: '#f16f06', color: 'white', marginBottom: '20px' }}
          >
            Add User
          </button>
        </div>
      </li>
    </ul>
  </form>
</div>



                {loading && <div className='loader'><span className="loader2"></span></div>}
                {error && <p style={{ color: 'red' }}>{error}</p>}
                {!loading && !error && (
                    <table className='table-class'>
                     <thead>
  <tr>
    <th>Sr no</th>
    <th>Name</th>
    <th>Mobile No</th>
    <th>Role</th>
    <th>Profile Status</th>
    <th>Actions</th>
  </tr>
</thead>

                        <thead>
                            <tr>
                                <th></th>
                                <th>
                                    <div className="search">
                                        <input
                                            type="text"
                                            className="searchTerm"
                                            placeholder="Filter by Name" 
                                            value={nameFilter} 
                                            onChange={(e) => setNameFilter(e.target.value)} 
                                        />
                                        <button type="submit" className="searchButton">
                                            <FaSearch />
                                        </button>
                                    </div>
                                </th>
                                <th>
                                    <div className="search">
                                        <input
                                            type="text"
                                            className="searchTerm"
                                            placeholder="Filter by Mobile No" 
                                            value={phoneFilter} 
                                            onChange={(e) => setPhoneFilter(e.target.value)} 
                                        />
                                        <button type="submit" className="searchButton">
                                            <FaSearch />
                                        </button>
                                    </div>
                                </th>
                                <th>
                                <div className="search">
                                        <input
                                            type="text"
                                            className="searchTerm"
                                            placeholder="Filter by Role" 
                                            value={roleFilter} 
                                            onChange={(e) => setRoleFilter(e.target.value)} 
                                        />
                                        <button type="submit" className="searchButton">
                                            <FaSearch />
                                        </button>
                                        </div>
                                </th>
                                <th></th>
                            </tr>
                        </thead>
               <tbody>
  {filteredUsers.length > 0 ? (
    filteredUsers
    .sort((a, b) => {
  const statusOrder = [
    "verified",
    "submitted",
    "in process",
    "pending",
    "inactive",
    "incomplete"
  ];

  // Normalize statuses (lowercase, fallback to "incomplete")
  const aStatus = a.status ? a.status.toLowerCase().trim() : "incomplete";
  const bStatus = b.status ? b.status.toLowerCase().trim() : "incomplete";

  const aIndex = statusOrder.indexOf(aStatus);
  const bIndex = statusOrder.indexOf(bStatus);

  // Sort based on status priority
  if (aIndex !== bIndex) {
    return aIndex - bIndex;
  }

  // If status is same → sort alphabetically by name
  const nameA = (a.name || "").toLowerCase();
  const nameB = (b.name || "").toLowerCase();
  return nameA.localeCompare(nameB);
})

      .map((user, index) => (
        <tr key={index}>
          <td>{index + 1}</td>
          <td>{user.name || "No name available"}</td>
          <td>{user.phoneNumber || "No phone available"}</td>
          <td>{user.role || "User"}</td>
      <td>
  {user.status && user.status.trim() !== "" ? (
    <span className={`status ${user.status.toLowerCase().replace(" ", "-")}`}>
      {user.status}
    </span>
  ) : (
    <span className="status incomplete">Incomplete</span>
  )}
</td>


          <td>
            <div className="twobtn">
              <button
                className="m-button-7"
                onClick={() => openDeleteModal(user)}
                style={{ backgroundColor: "#f14506ff", color: "white", marginRight: "5px" }}
              >
                Delete
              </button><button
  className="m-button-7"
  onClick={() => {
    const ujb =
      user.ujbCode ||    // some users have lowercase
      user.UJBCode || ""; // some have uppercase
    
    if (!ujb) {
      alert("UJB Code is missing for this user!");
      return;
    }

    window.location.href = `/admin/profile?user=${ujb}`;
  }}
  style={{ backgroundColor: "#f16f06", color: "white" }}
>
  Edit
</button>

            </div>
          </td>
        </tr>
      ))
  ) : (
    <tr>
      <td colSpan="6">No users found.</td>
    </tr>
  )}
</tbody>

                    </table>
                )}

                {/* Delete Confirmation Modal */}
                {deleteModalIsOpen && (
                    <div className="modal-overlay">
                        <div className="modal">
                            <h2>Confirm Deletion</h2>
                            <p>Are you sure you want to delete {userToDelete?.name}?</p>
                            <div className="twobtn">
                                <button
                                    className="m-button-7"
                                    onClick={deleteUser}
                                    style={{ backgroundColor: '#f16f06', color: 'white' }}
                                >
                                    Yes, Delete
                                </button>
                                <button
                                    className="m-button-7"
                                    onClick={closeDeleteModal}
                                    style={{ backgroundColor: '#e2e2e2', color: 'black' }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </section>
        </>
    );
};

export default UserList;
