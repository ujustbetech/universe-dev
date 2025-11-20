'use client';

import { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { COLLECTIONS } from "/utility_collection";
import { doc, getDoc, updateDoc, collection, getDocs } from 'firebase/firestore';
import { useRouter } from 'next/router';

const EditConclave = ({ id }) => {
  const router = useRouter();
  const [users, setUsers] = useState([]);

  const [form, setForm] = useState({
    conclaveStream: '',
    startDate: '',
    initiationDate: '',
    leader: '',
    ntMembers: [],
    orbiters: [],
    leaderRole: '',
    ntRoles: '',
  });

  const [searchLeader, setSearchLeader] = useState('');
  const [searchNt, setSearchNt] = useState('');
  const [searchOrbiters, setSearchOrbiters] = useState('');
const [focusedInput, setFocusedInput] = useState(null);
const [filteredLeaders, setFilteredLeaders] = useState([]);
const [filteredNt, setFilteredNt] = useState([]);
const [filteredOrbiters, setFilteredOrbiters] = useState([]);


  useEffect(() => {
    const fetchUsersAndConclave = async () => {
      try {
        const userSnapshot = await getDocs(collection(db, 'userdetails'));
        const userList = userSnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data()[" Name"],
        }));
        setUsers(userList);

        if (id) {
          const conclaveDoc = await getDoc(doc(db, COLLECTIONS.conclaves, id));
          if (conclaveDoc.exists()) {
            setForm(conclaveDoc.data());
          } else {
            alert('Conclave not found');
            router.back();
          }
        }
      } catch (error) {
        console.error('Error:', error);
        alert('Something went wrong');
      }
    };

    fetchUsersAndConclave();
  }, [id]);
const handleSearch = (value, setSearchState, setFilteredList, userList) => {
  setSearchState(value);
  const filtered = userList.filter(user =>
    user.name?.toLowerCase().includes(value.toLowerCase())
  );
  setFilteredList(filtered);
};

  const handleChange = (e) => {
    setForm(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

 
  const handleAddToMulti = (field, userId) => {
    if (!form[field].includes(userId)) {
      setForm(prev => ({ ...prev, [field]: [...prev[field], userId] }));
    }
  };

  const handleRemoveFromMulti = (field, userId) => {
    setForm(prev => ({
      ...prev,
      [field]: prev[field].filter(id => id !== userId),
    }));
  };

  const handleLeaderSelect = (user) => {
    setForm(prev => ({ ...prev, leader: user.id }));
    setSearchLeader(user.name);
  };

  const getUserName = (id) => {
    const user = users.find(u => u.id === id);
    return user ? user.name : 'Unknown';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await updateDoc(doc(db, COLLECTIONS.conclaves, id), {
        ...form,
        updatedAt: new Date(),
      });
      alert('Conclave updated successfully!');
    } catch (error) {
      console.error('Error updating:', error);
      alert('Error updating conclave');
    }
  };

  return (
    <div className='c-form box'>
      <h2>Edit Conclave</h2>
      <form onSubmit={handleSubmit}>
        <ul>
          <li className='form-row'>
            <h4>Conclave Name & Stream:<sup>*</sup></h4>
            <div className='multipleitem'>
              <input
                type="text"
                name="conclaveStream"
                value={form.conclaveStream}
                onChange={handleChange}
                required
              />
            </div>
          </li>

          <li className='form-row'>
            <h4>Start Date:<sup>*</sup></h4>
            <div className='multipleitem'>
              <input
                type="date"
                name="startDate"
                value={form.startDate}
                onChange={handleChange}
                required
              />
            </div>
          </li>

          <li className='form-row'>
            <h4>Initiation Date:<sup>*</sup></h4>
            <div className='multipleitem'>
              <input
                type="date"
                name="initiationDate"
                value={form.initiationDate}
                onChange={handleChange}
                required
              />
            </div>
          </li>

         <li className='form-row'>
  <h4>Assign Leader:<sup>*</sup></h4>
  <div className='autosuggest'>
    <input
      type="text"
      placeholder="Search Leader"
      value={searchLeader}
      onFocus={() => setFocusedInput('editLeader')}
      onChange={(e) => handleSearch(e.target.value, setSearchLeader, setFilteredLeaders, users)}
    />
    {focusedInput === 'editLeader' && filteredLeaders.length > 0 && (
      <ul className="dropdown">
        {filteredLeaders.map(user => (
          <li
            key={user.id}
            onClick={() => {
              handleLeaderSelect(user);
              setSearchLeader('');
              setFilteredLeaders([]);
              setFocusedInput(null);
            }}
          >
            {user.name}
          </li>
        ))}
      </ul>
    )}
    {form.leader && (
      <div className="selected-tags">
        <span onClick={() => {
          setForm(prev => ({ ...prev, leader: '' }));
        }}>
          {getUserName(form.leader)} ✕
        </span>
      </div>
    )}
  </div>
</li>


          {/* NT Members */}
        <li className='form-row'>
  <h4>Assign NT Members:</h4>
  <div className="autosuggest">
    <input
      type="text"
      placeholder="Search NT Members"
      value={searchNt}
      onFocus={() => setFocusedInput('editNt')}
      onChange={(e) =>
        handleSearch(e.target.value, setSearchNt, setFilteredNt, users)
      }
    />
    {focusedInput === 'editNt' && filteredNt.length > 0 && (
      <ul className="dropdown">
        {filteredNt.map(user => (
          <li
            key={user.id}
            onClick={() => {
              handleAddToMulti('ntMembers', user.id);
              setSearchNt('');
              setFilteredNt([]);
              setFocusedInput(null);
            }}
          >
            {user.name}
          </li>
        ))}
      </ul>
    )}
    <div className="selected-tags">
      {form.ntMembers.map(id => (
        <span key={id} onClick={() => handleRemoveFromMulti('ntMembers', id)}>
          {getUserName(id)} ✕
        </span>
      ))}
    </div>
  </div>
</li>

          {/* Orbiters */}
       <li className='form-row'>
  <h4>Assign Orbiters:</h4>
  <div className="autosuggest">
    <input
      type="text"
      placeholder="Search Orbiters"
      value={searchOrbiters}
      onFocus={() => setFocusedInput('editOrbiters')}
      onChange={(e) =>
        handleSearch(e.target.value, setSearchOrbiters, setFilteredOrbiters, users)
      }
    />
    {focusedInput === 'editOrbiters' && filteredOrbiters.length > 0 && (
      <ul className="dropdown">
        {filteredOrbiters.map(user => (
          <li
            key={user.id}
            onClick={() => {
              handleAddToMulti('orbiters', user.id);
              setSearchOrbiters('');
              setFilteredOrbiters([]);
              setFocusedInput(null);
            }}
          >
            {user.name}
          </li>
        ))}
      </ul>
    )}
    <div className="selected-tags">
      {form.orbiters.map(id => (
        <span key={id} onClick={() => handleRemoveFromMulti('orbiters', id)}>
          {getUserName(id)} ✕
        </span>
      ))}
    </div>
  </div>
</li>


          <li className='form-row'>
            <h4>Leader’s Role & Responsibility:</h4>
            <textarea
              name="leaderRole"
              value={form.leaderRole}
              onChange={handleChange}
              required
            />
          </li>

          <li className='form-row'>
            <h4>NT Members’ Roles & Responsibilities:</h4>
            <textarea
              name="ntRoles"
              value={form.ntRoles}
              onChange={handleChange}
              required
            />
          </li>

          <li className='form-row'>
            <div className='multipleitem'>
              <button className='submitbtn' type="submit">Update</button>
            </div>
          </li>
        </ul>
      </form>
    </div>
  );
};

export default EditConclave;
