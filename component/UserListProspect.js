import { useState, useEffect } from 'react';
import { db } from '../firebaseConfig'; // Adjust your Firebase config path
import { collection, getDocs,setDoc, deleteDoc, doc } from 'firebase/firestore';
import "../src/app/styles/main.scss";
import { FaSearch } from "react-icons/fa";
import Swal from 'sweetalert2';

const UserList = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [nameFilter, setNameFilter] = useState(''); 
    const [phoneFilter, setPhoneFilter] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [deleteModalIsOpen, setDeleteModalIsOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null); // Track which user to delete
const [newUser, setNewUser] = useState({
    name: '',
    phoneNumber: '',
    role: '',
    dob: '',
    email: '',
    gender: '',
    ujbCode: ''
});
const formatDOB = (dob) => {
  const [year, month, day] = dob.split("-");
  return `${day}/${month}/${year}`;
};

const handleAddUser = async (e) => {
    e.preventDefault();
const formattedDOB = formatDOB(newUser.dob); // Convert to dd/mm/yyyy

    const userDoc = {
        " Name": newUser.name,
        "Mobile no": newUser.phoneNumber,
        "Category": newUser.role,
         "DOB": formattedDOB,
        "Email": newUser.email,
        "Gender": newUser.gender,
        "UJB Code": newUser.ujbCode,
    };

    try {
        await setDoc(doc(db, 'userdetails', newUser.phoneNumber), userDoc);
        setUsers([...users, {
            id: newUser.phoneNumber,
            name: newUser.name,
            phoneNumber: newUser.phoneNumber,
            role: newUser.role
        }]);
        setNewUser({
            name: '',
            phoneNumber: '',
            role: '',
            dob: '',
            email: '',
            gender: '',
            ujbCode: ''
        });
        alert("User added successfully!");
    } catch (err) {
        console.error("Error adding user:", err);
        alert("Failed to add user.");
    }
};

    // Fetch users from Firestore
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const userCollection = collection(db, 'userdetails');
                const userSnapshot = await getDocs(userCollection);
                
                const userList = userSnapshot.docs.map(doc => ({
                    id: doc.id, // Store document ID for deletion
                    phoneNumber: doc.data()["Mobile no"],
                    name: doc.data()[" Name"],
                    role: doc.data()["Category"]
                }));

                setUsers(userList);
                setLoading(false);
            } catch (err) {
                setError('Error fetching user data.');
                setLoading(false);
            }
        };

        fetchUsers();
    }, []);

    // Filter users based on name and phone filters
    const filteredUsers = users.filter(user => {
        const lowerCaseNameFilter = nameFilter.toLowerCase();
        const lowerCasePhoneFilter = phoneFilter.toLowerCase();
        const lowerCaseRoleFilter = roleFilter.toLowerCase();
        const userName = user.name ? user.name.toLowerCase() : '';
        const userPhone = user.phoneNumber ? user.phoneNumber.toLowerCase() : '';
        const userRole = user.role ? user.role.toLowerCase() : '';

        return (
            userName.includes(lowerCaseNameFilter) &&
            userPhone.includes(lowerCasePhoneFilter) &&
            userRole.includes(lowerCaseRoleFilter)
        );
    });

    // Open delete confirmation modal
    const openDeleteModal = (user) => {
        setUserToDelete(user);
        setDeleteModalIsOpen(true);
    };

    // Close delete modal
    const closeDeleteModal = () => {
        setDeleteModalIsOpen(false);
        setUserToDelete(null);
    };

    // Delete user from Firestore
    const deleteUser = async () => {
        if (userToDelete) {
            try {
                await deleteDoc(doc(db, 'userdetails', userToDelete.id));
                setUsers(users.filter(user => user.id !== userToDelete.id));
                closeDeleteModal();
            } catch (err) {
                console.error('Error deleting user:', err);
            }
        }
    };

    return (
        <>
            <section className='c-form box'>
                <h2>User Master Table List</h2>
                <button className="m-button-5" onClick={() => window.history.back()}>
                    Back
                </button>
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
        {/* Category Dropdown */}
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
            <h4>Category<sup>*</sup></h4>
            <div className='multipleitem'>
   
        {/* Gender Dropdown */}
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
   
      
          <li className='form-row'>
     
            <div className='multipleitem'>
        <button type="submit" className="m-button-7" style={{ backgroundColor: '#f16f06', color: 'white',marginBottom: '20px' }}>Add User</button>
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
                                <th>Actions</th> {/* Actions column */}
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
                                filteredUsers.map((user, index) => (
                                    <tr key={index}>
                                        <td>{index + 1}</td>
                                        <td>{user.name || 'No name available'}</td>
                                        <td>{user.phoneNumber || 'No phone available'}</td>
                                        <td>{user.role || 'User'}</td> {/* You can adjust the role here */}
                                        <td>
                                            <button 
                                                className='m-button-7' 
                                                onClick={() => openDeleteModal(user)} 
                                                style={{ backgroundColor: '#f16f06', color: 'white' }}
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5">No users found.</td>
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
