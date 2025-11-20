import { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { useRouter } from 'next/router';
import { COLLECTIONS } from "/utility_collection";
import "../src/app/styles/main.scss";
import axios from 'axios';
import emailjs from '@emailjs/browser';

const Edit = ({ id, data }) => {

    const [phone, setPhone] = useState(data?.orbiterContact || '');
    const [name, setName] = useState(data?.orbiterName || '');
    const [orbiteremail, setOrbiterEmail] = useState(data?.orbiterEmail || '');
    const [type, setType] = useState(data?.type || '');
    const [prospectName, setProspectName] = useState(data?.prospectName || '');
    const [prospectPhone, setProspectPhone] = useState(data?.prospectPhone || '');
    const [occupation, setOccupation] = useState(data?.occupation || '');
    const [hobbies, setHobbies] = useState(data?.hobbies || '');
    const [email, setEmail] = useState(data?.email || '');
    const [date, setDate] = useState(data?.date || '');
    const [userSearch, setUserSearch] = useState('');
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [userList, setUserList] = useState([]);    
    const formatReadableDate = (inputDate) => {
        const d = new Date(inputDate);
        const day = String(d.getDate()).padStart(2, '0');
        const month = d.toLocaleString('en-GB', { month: 'long' });
        const year = String(d.getFullYear()).slice(-2);
        let hours = d.getHours();
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
      
        hours = hours % 12 || 12;
      
        return `${day} ${month} ${year} at ${hours}.${minutes} ${ampm}`;
      };
      
    

    
  
  
  
    useEffect(() => {
        const fetchUsers = async () => {
          try {
            const userRef = collection(db, 'userdetails');
            const snapshot = await getDocs(userRef);
            const data = snapshot.docs.map(doc => ({
              id: doc.id,
              name: doc.data()[" Name"],
              phone: doc.data()["Mobile no"],
              Email: doc.data()["Email"]
            }));
            setUserList(data);
          } catch (error) {
            console.error('Error fetching users:', error);
          }
        };
    
        fetchUsers();
      }, []);

    const handleSearchUser = (e) => {
        const value = e.target.value.toLowerCase();
        setUserSearch(value);
        const filtered = userList.filter(user =>
            user.name && user.name.toLowerCase().includes(value) // Check if name exists
        );
        setFilteredUsers(filtered);
    };

    const handleSelectUser = (user) => {
        setName(user.name);
        setPhone(user.phone);
        setOrbiterEmail(user.Email);
        setUserSearch('');
        setFilteredUsers([]);
    };
    

    // Handle Dropdown Change for Type
    const handleTypeChange = (e) => {
        setType(e.target.value);
    };
  

    

         
    
   


  // Accept docId as a prop or from context
  const handleSubmit = async (e) => {
    e.preventDefault();
  
    if (!name || !phone || !orbiteremail || !type || !prospectName || !prospectPhone || !occupation || !email || !hobbies || !date) {
      alert('Please fill all fields');
      return;
    }
  
    try {
      const formattedDate = formatReadableDate(date);
      
const prospectDocRef = doc(db, COLLECTIONS.prospect, id);

  
      await updateDoc(prospectDocRef, {
        orbiterName: name,
        orbiterContact: phone,
        orbiterEmail: orbiteremail,
        type,
        prospectName,
        prospectPhone,
        occupation,
        hobbies,
        email,
        date: formattedDate,
        updatedAt: new Date()
      });
  
      // Clear form
      setName('');
      setPhone('');
      setOrbiterEmail('');
      setType('');
      setProspectName('');
      setProspectPhone('');
      setOccupation('');
      setHobbies('');
      setEmail('');
      setDate('');
    } catch (error) {
      console.error("❌ Error updating user:", error);
      alert('Error updating user');
    }
  };
  
  
   
      
    return (
      
           <div>
         
                <div>
                      <h2>{prospectName}'s Details</h2> 
                    <ul>
                    <li className='form-row'>
                    <h4>Select Orbiter:<sup>*</sup></h4>
                    <div className='autosuggest'>
                        <input
                            type="text"
                            placeholder="Search Orbiter"
                            value={userSearch}
                            onChange={handleSearchUser}
                        />
                        {filteredUsers.length > 0 && (
                            <ul className="dropdown">
                                {filteredUsers.map(user => (
                                    <li key={user.id} onClick={() => handleSelectUser(user)}>
                                        {user.name}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </li>
                <li className='form-row'>
                    <h4>Selected Orbiter Name:<sup>*</sup></h4>
                    <div className='multipleitem'>
                        <p>{name}</p>
                    </div>
                </li>
                <li className='form-row'>
                    <h4>Selected Orbiter's Phone:<sup>*</sup></h4>
                    <div className='multipleitem'>
                        <p>{phone}</p>
                    </div>
                </li>
                <li className='form-row'>
                    <h4>Selected Orbiter Email:<sup>*</sup></h4>
                    <div className='multipleitem'>
                        <p>{orbiteremail}</p>
                    </div>
                </li>
                <li className='form-row'>
  <h4>Prospect Name:<sup>*</sup></h4>
  <div className='multipleitem'>
    <input 
      type="text" 
      value={prospectName} 
      onChange={(e) => setProspectName(e.target.value)} 
      placeholder="Enter Prospect Name"
    />
  </div>
</li>

<li className='form-row'>
  <h4>Prospect Phone:<sup>*</sup></h4>
  <div className='multipleitem'>
    <input 
      type="text" 
      value={prospectPhone} 
      onChange={(e) => setProspectPhone(e.target.value)} 
      placeholder="Enter Prospect Phone"
    />
  </div>
</li>
<li className='form-row'>
                            <h4>Email:<sup>*</sup></h4>
                            <div className='multipleitem'>
                                <input 
                                    type="text" 
                                    value={email} 
                                    onChange={(e) => setEmail(e.target.value)} 
                                    placeholder="Enter Email"
                                />
                            </div>
                        </li>
                        <li className='form-row'>
                            <h4>Date:<sup>*</sup></h4>
                            <div className='multipleitem'>
                            <input
  type="datetime-local"
  value={date}
  onChange={(e) => setDate(e.target.value)} // use ISO format here
/>



                            </div>
                        </li>
                        <li className='form-row'>
                            <h4>Occupation:<sup>*</sup></h4>
                            <div className='multipleitem'>
                                <input 
                                    type="text" 
                                    value={occupation} 
                                    onChange={(e) => setOccupation(e.target.value)} 
                                    placeholder="Enter Occupation"
                                />
                            </div>
                        </li>
                        <li className='form-row'>
                            <h4>Hobbies:<sup>*</sup></h4>
                            <div className='multipleitem'>
                                <input 
                                    type="text" 
                                    value={hobbies} 
                                    onChange={(e) => setHobbies(e.target.value)} 
                                    placeholder="Enter Hobbies"
                                />
                            </div>
                        </li>
                      

                    

                        {/* Type Dropdown */}
                        <li className='form-row'>
                            <h4>Occasion for intimation:</h4>
                            <div className='multipleitem'>
                                <select value={type} onChange={handleTypeChange}>
                                <option value="support_call">UJustBe Support team induced call</option>
  <option value="orbiter_connection">Orbiter connects with UJustBe</option>
  <option value="doorstep_service">UJustBe at your doorstep</option>
  <option value="monthly_meeting">Monthly Meeting interactions</option>
  <option value="e2a_interactions">E2A interactions</option>
  <option value="unniversary_interactions">Unniversary Interactions - Introduced by NT</option>
  <option value="support">UJustBe Support</option>
  <option value="nt">NT</option>
  <option value="management">Management</option>
                                </select>
                            </div>
                        </li>
                    </ul>
                    <ul>
                        <li className='form-row'>
                            <div className='multipleitem'>
                                <button className='submitbtn' onClick={handleSubmit}>Update</button>
                            </div>
                        </li>
                    </ul>   
                </div>
          </div>
    
    );
};

export default Edit;
