'use client';

import { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, getDocs, addDoc ,getDoc,doc} from 'firebase/firestore';

export default function CreateConclavePage() {
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

  const [leaderSearch, setLeaderSearch] = useState('');
  const [ntSearch, setNtSearch] = useState('');
  const [orbiterSearch, setOrbiterSearch] = useState('');
const [focusedInput, setFocusedInput] = useState(null);

  const [filteredLeaders, setFilteredLeaders] = useState([]);
  const [filteredNt, setFilteredNt] = useState([]);
  const [filteredOrbiters, setFilteredOrbiters] = useState([]);

  useEffect(() => {
    const fetchUsers = async () => {
      const querySnapshot = await getDocs(collection(db, 'userdetails'));
      const userList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data()[" Name"],
      }));
      setUsers(userList);
      setFilteredLeaders(userList);
      setFilteredNt(userList);
      setFilteredOrbiters(userList);
    };
    fetchUsers();
  }, []);
useEffect(() => {
  const handleClickOutside = (e) => {
    if (!e.target.closest('.autosuggest')) {
      setFocusedInput(null);
    }
  };
  document.addEventListener('click', handleClickOutside);
  return () => {
    document.removeEventListener('click', handleClickOutside);
  };
}, []);

  const handleChange = (e) => {
    setForm(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };
const handleSearch = (query, setQuery, setFiltered, allUsers) => {
  setQuery(query);
  setFiltered(
    allUsers.filter(user =>
      user.name?.toLowerCase().includes(query.toLowerCase())
    )
  );
};

  const handleAddToMulti = (field, userId) => {
    if (!form[field].includes(userId)) {
      setForm(prev => ({
        ...prev,
        [field]: [...prev[field], userId],
      }));
    }
  };

  const handleRemoveFromMulti = (field, userId) => {
    setForm(prev => ({
      ...prev,
      [field]: prev[field].filter(id => id !== userId),
    }));
  };

 const handleSubmit = async (e) => {
  e.preventDefault();
  try {
    const docRef = await addDoc(collection(db, 'Conclaves'), form);
    alert('Conclave created successfully!');

    const eventName = form.conclaveStream;
    const eventDate = form.startDate;

    const allRecipients = [
      { role: 'Leader', numbers: [form.leader] },
      { role: 'NT Member', numbers: form.ntMembers },
      { role: 'Orbiter', numbers: form.orbiters },
    ];

    for (const group of allRecipients) {
      for (const phone of group.numbers) {
        const userDoc = await getDoc(doc(db, 'userdetails', phone));
        const userName = userDoc.exists() ? userDoc.data()[" Name"] : phone;

   //     await sendWhatsAppMessage(userName, eventName, eventDate, '', phone);
      }
    }
  } catch (err) {
    console.error('Error adding document:', err);
    alert('Failed to create conclave.');
  }
};


  const getUserNameById = (id) => {
    const user = users.find(u => u.id === id);
    return user ? user.name : id;
  };
const sendWhatsAppMessage = async (userName, eventName, eventDate, eventLink, phoneNumber) => {
   const ACCESS_TOKEN = 'EAAHwbR1fvgsBOwUInBvR1SGmVLSZCpDZAkn9aZCDJYaT0h5cwyiLyIq7BnKmXAgNs0ZCC8C33UzhGWTlwhUarfbcVoBdkc1bhuxZBXvroCHiXNwZCZBVxXlZBdinVoVnTB7IC1OYS4lhNEQprXm5l0XZAICVYISvkfwTEju6kV4Aqzt4lPpN8D3FD7eIWXDhnA4SG6QZDZD'; // Replace with your Meta API token
    const PHONE_NUMBER_ID = '527476310441806'; 
  const url = `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`;

  const messageData = {
    messaging_product: 'whatsapp',
    to: phoneNumber,
    type: 'template',
    template: {
      name: 'welcome_conclave', // Template name from Meta
      language: { code: 'en' },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: userName },
            { type: 'text', text: eventName },
          ]
        }
      ]
    }
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(messageData)
    });

    const data = await response.json();
    console.log('WhatsApp Message Sent:', data);
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
  }
};

  return (
    <section className='c-form box'>
      <div>
        <h2>Add New Conclave</h2>
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
    
    <li className="form-row">
       <h4>Assign Leader:<sup>*</sup></h4>
  <div className="autosuggest">
   <input
  type="text"
  placeholder="Search leader"
  value={leaderSearch}
  onFocus={() => {
    setFilteredLeaders(users);
    setFocusedInput('leader');
  }}
  onChange={(e) =>
    handleSearch(e.target.value, setLeaderSearch, setFilteredLeaders, users)
  }
/>

{focusedInput === 'leader' && filteredLeaders.length > 0 && (
  <ul className="dropdown">
    {filteredLeaders.map((user) => (
      <li
        key={user.id}
        onClick={() => {
          setForm((prev) => ({ ...prev, leader: user.id }));
          setLeaderSearch(user.name);
          setFilteredLeaders([]);
          setFocusedInput(null);
        }}
      >
        {user.name}
      </li>
    ))}
  </ul>
)}

                </div>
                {/* {form.leader && (
                  <p className="selected-single">Selected: {getUserNameById(form.leader)}</p>
                )} */}
            </li>
          
              <li className="form-row">
  <h4>Assign NT Members (multiple):<sup>*</sup></h4>
  <div className="autosuggest">
   <input
  type="text"
  placeholder="Search NT Members"
  value={ntSearch}
  onFocus={() => {
    setFilteredNt(users);
    setFocusedInput('ntMembers');
  }}
  onChange={(e) =>
    handleSearch(e.target.value, setNtSearch, setFilteredNt, users)
  }
/>

{focusedInput === 'ntMembers' && filteredNt.length > 0 && (
  <ul className="dropdown">
    {filteredNt.map((user) => (
     <li
  key={user.id}
  onClick={() => {
    handleAddToMulti('ntMembers', user.id);
    setNtSearch(''); // ✅ clear input
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
          {getUserNameById(id)} ✕
        </span>
      ))}
    </div>
  </div>
</li>

            
              <li className="form-row">
  <h4>Add Orbiters (10+):<sup>*</sup></h4>
  <div className="autosuggest">
    <input
  type="text"
  placeholder="Search Orbiters"
  value={orbiterSearch}
  onFocus={() => {
    setFilteredOrbiters(users);
    setFocusedInput('orbiters');
  }}
  onChange={(e) =>
    handleSearch(e.target.value, setOrbiterSearch, setFilteredOrbiters, users)
  }
/>

{focusedInput === 'orbiters' && filteredOrbiters.length > 0 && (
  <ul className="dropdown">
    {filteredOrbiters.map((user) => (
     <li
  key={user.id}
  onClick={() => {
    handleAddToMulti('orbiters', user.id);
    setOrbiterSearch(''); // ✅ clear input
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
          {getUserNameById(id)} ✕
        </span>
      ))}
    </div>
  </div>
</li>

         

     <ul>
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
              <h4>NT Members’ Roles & Responsibilities:<sup>*</sup></h4>
 
                <textarea
                  name="ntRoles"
                  value={form.ntRoles}
                  onChange={handleChange}
                  required
                />
              
            </li>
</ul>   
            <li className='form-row'>
              <div className='multipleitem'>
                <button className='submitbtn' type="submit">Create</button>
              </div>
            </li>
          </ul>
        </form>
      </div>
    </section>
  );
}
