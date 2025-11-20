import React, { useEffect, useState } from 'react';
import { db } from '../firebaseConfig';
import { COLLECTIONS } from "/utility_collection";
import {
  doc,
  getDoc,
  getDocs,
  updateDoc,
  collection,
  arrayUnion
} from 'firebase/firestore';

export default function Conclave({ eventId, fetchData }) {
  const [selectedUser, setSelectedUser] = useState({ id: '', name: '' });
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [users, setUsers] = useState([]);
  const [invitedList, setInvitedList] = useState([]);
  const [invitationSaved, setInvitationSaved] = useState(false);
  const [conclaves, setConclaves] = useState([]);
  const [selectedConclaveId, setSelectedConclaveId] = useState('');

  useEffect(() => {
    const fetchUsersAndConclaves = async () => {
      const snapshot = await getDoc(doc(db, COLLECTIONS.monthlyMeeting, eventId));
      if (snapshot.exists()) {
        const data = snapshot.data();
        setInvitedList(data.invitedUsers || []);
      }

      const userSnapshot = await getDocs(collection(db, 'userdetails'));
      const userList = userSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data()[" Name"] || 'Unnamed'
      }));
      setUsers(userList);

      const conclaveSnap = await getDocs(collection(db, COLLECTIONS.conclaves));
      const conclaveList = conclaveSnap.docs.map(doc => ({
        id: doc.id,
        stream: doc.data().conclaveStream || 'Unnamed Stream'
      }));
      setConclaves(conclaveList);
    };

    fetchUsersAndConclaves();
  }, [eventId, invitationSaved]);

  const handleSaveInvitation = async () => {
    if (!selectedUser.id || !eventId || !selectedConclaveId) {
      alert("Please select a user, conclave, and ensure event ID is passed.");
      return;
    }

    try {
      const eventRef = doc(db, COLLECTIONS.monthlyMeeting, eventId);
      await updateDoc(eventRef, {
        invitedUsers: arrayUnion({
          id: selectedUser.id,
          name: selectedUser.name,
          invitedAt: new Date(),
          sent: false
        })
      });

      const conclaveRef = doc(db, COLLECTIONS.conclaves, selectedConclaveId);
      await updateDoc(conclaveRef, {
        orbiters: arrayUnion(selectedUser.id)
      });

      alert("Invitation saved in MonthlyMeeting and added to Conclave!");
      setInvitationSaved(!invitationSaved);
      fetchData();
    } catch (err) {
      console.error("Error saving invitation:", err);
      alert("Failed to save invitation.");
    }
  };

  const handleSendWhatsApp = async (user) => {
    const phone = user.id;
    if (!phone) {
      alert("User doesn't have a valid phone number.");
      return;
    }

    try {
      await sendWhatsAppMessage(user.name, phone);

      const eventRef = doc(db, COLLECTIONS.monthlyMeeting, eventId);
      const eventSnap = await getDoc(eventRef);
      const data = eventSnap.data();

      const updatedInvites = (data.invitedUsers || []).map(u =>
        u.id === user.id ? { ...u, sent: true } : u
      );

      await updateDoc(eventRef, { invitedUsers: updatedInvites });
      setInvitedList(updatedInvites);
      alert("Message sent & marked as sent!");
    } catch (error) {
      console.error("WhatsApp error:", error);
      alert("Failed to send message.");
    }
  };

  const sendWhatsAppMessage = async (userName, phoneNumber) => {
    const ACCESS_TOKEN = 'YOUR_ACCESS_TOKEN';
    const PHONE_NUMBER_ID = 'YOUR_PHONE_NUMBER_ID';
    const url = `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`;

    const messageData = {
      messaging_product: 'whatsapp',
      to: phoneNumber,
      type: 'template',
      template: {
        name: 'your_template_name',
        language: { code: 'en' },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: userName }
            ]
          }
        ]
      }
    };

    await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(messageData)
    });
  };

  return (
    <section>
      <h2>Invite User to Conclave</h2>
 <div className='c-form box'>
  <ul >

    <li className="form-row">
      <label>Search Orbiter:</label>
      <div className="autosuggest">
        <input
          type="text"
          placeholder="Type to search user"
          value={selectedUser.name || ''}
          onChange={(e) => {
            const value = e.target.value;
            setSelectedUser({ name: value, id: '' });
            const filtered = users.filter(user =>
              user.name && user.name.toLowerCase().includes(value.toLowerCase())
            );
            setFilteredUsers(filtered);
          }}
        />
        {filteredUsers.length > 0 && (
          <ul className="dropdown">
            {filteredUsers.map(user => (
              <li
                key={user.id}
                onClick={() => {
                  setSelectedUser({ id: user.id, name: user.name });
                  setFilteredUsers([]);
                }}
              >
                {user.name}
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>

   
   <li className='form-row'>
                    <label>Select Conclave Stream:</label>
                        <div className='multipleitem'>
                            <select
        value={selectedConclaveId}
        onChange={(e) => setSelectedConclaveId(e.target.value)}
        className="styled-select"
      >
        <option value="">-- Select Stream --</option>
        {conclaves.map(conclave => (
          <option key={conclave.id} value={conclave.id}>
            {conclave.stream}
          </option>
        ))}
      </select>
                        </div>
                    </li>
                     <ul>
      <li className='form-row'>
        <div className='multipleitem'>   
                <button className='submitbtn'onClick={handleSaveInvitation}> Save</button>
            </div>
            </li>
            </ul>   
   

  </ul>
</div>

      <h3>Invited Users</h3>
      {invitedList.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Phone</th>
              <th>Invited At</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {invitedList.map((user, index) => (
              <tr key={user.id + index}>
                <td>{index + 1}</td>
                <td>{user.name}</td>
                <td>{user.id}</td>
                <td>{user.invitedAt?.seconds ? new Date(user.invitedAt.seconds * 1000).toLocaleString() : ''}</td>
                <td>{user.sent ? 'Sent ✅' : 'Not Sent ❌'}</td>
                <td>
                  {!user.sent && (
                    <button onClick={() => handleSendWhatsApp(user)}>
                      Send WhatsApp
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}