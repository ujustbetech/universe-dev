import React, { useEffect, useState } from 'react';
import { db } from '../firebaseConfig';
import { COLLECTIONS } from "/utility_collection";
import { collection, addDoc, getDocs,doc,getDoc } from 'firebase/firestore';

const EngagementForm = ({ id }) => {
  const [loading, setLoading] = useState(false);
  const [entries, setEntries] = useState([]);
  const [userList, setUserList] = useState([]);
const [filteredUsers, setFilteredUsers] = useState([]);
const [userSearch, setUserSearch] = useState('');

const [formData, setFormData] = useState({
  callDate: '',
  orbiterName: '',
  occasion: '',
  referralId: '',
  eventName: '',
  otherOccasion: '',
  discussionDetails: '',
  orbiterSuggestions: [''],
  teamSuggestions: [''],
  referralPossibilities: [''],
  nextFollowupDate: ''  // ✅ New field added
});

const formatDate = (date) => {
  if (!date) return "—";
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0"); // Months are 0-indexed
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

  const handleArrayChange = (field, index, value) => {
    const updated = [...formData[field]];
    updated[index] = value;
    setFormData({ ...formData, [field]: updated });
  };
  
  const addMoreField = (field) => {
    setFormData({ ...formData, [field]: [...formData[field], ''] });
  };
  
  const handleSearchUser = (e) => {
    const value = e.target.value.toLowerCase();
    setUserSearch(value);
    const filtered = userList.filter(user =>
      user.name && user.name.toLowerCase().includes(value)
    );
    setFilteredUsers(filtered);
  };
  
  const handleSelectUser = (user) => {
    setFormData(prev => ({ ...prev, orbiterName: user.name }));
    setUserSearch('');
    setFilteredUsers([]);
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
    
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

 const handleSave = async () => {
  if (!id) {
    alert('Prospect ID missing!');
    return;
  }

  setLoading(true);
  try {
    const stage5Ref = collection(db, 'Prospects', id, 'engagementform');
    await addDoc(stage5Ref, {
      ...formData,
      createdAt: new Date(),   // ✅ first created
      updatedAt: new Date()    // ✅ initially same as createdAt
    });
    alert('Data saved successfully!');
    setFormData({
      callDate: '',
      orbiterName: '',
      occasion: '',
      discussionDetails: '',
      orbiterSuggestions: [''],
      teamSuggestions: [''],
      referralPossibilities: ['']
    });

    fetchEntries();
  } catch (err) {
    console.error('Error saving data:', err);
    alert('Failed to save data.');
  } finally {
    setLoading(false);
  }
};


  const fetchEntries = async () => {
    if (!id) return;
    try {
      const stage5Ref = collection(db, 'Prospects', id, 'engagementform');
      const snapshot = await getDocs(stage5Ref);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEntries(data);
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  };
const fetchProspectName = async () => {
  if (!id) return;
  try {
    const prospectRef = doc(db, 'Prospects', id);
    const prospectSnap = await getDoc(prospectRef);
    if (prospectSnap.exists()) {
      const data = prospectSnap.data();
      setFormData(prev => ({
        ...prev,
        orbiterName: data.prospectName || ''
      }));
    }
  } catch (err) {
    console.error('Error fetching prospect name:', err);
  }
};

useEffect(() => {
  fetchEntries();
  fetchProspectName();
}, [id]);


  return (
<div>
    <h2 className="form-title">Engagement Logs</h2>
  
 
<ul>
    <li className='form-row'>
 
        <label className="form-label">Date of Calling</label>
        <div className='multipleitem'>
          <input
            type="datetime-local"
            name="callDate"
            value={formData.callDate}
            onChange={handleChange}
            required
          />
        </div>
      </li>
     

  <li className='form-row'>
  <label className="form-label">Name of the Orbiter</label>
  <div className='multipleitem'>
    <input
      type="text"
      placeholder="Search Orbiter"
      value={formData.orbiterName}
      onChange={(e) =>
        setFormData(prev => ({ ...prev, orbiterName: e.target.value }))
      }
    />
  </div>
</li>

      {/* Orbiter Dropdown List */}
      {filteredUsers.length > 0 && (
        <ul className="dropdown-list">
          {filteredUsers.map((user, index) => (
            <li
              key={index}
              onClick={() => handleSelectUser(user)}
              className="dropdown-item"
            >
              {user.name}
            </li>
          ))}
        </ul>
      )}
  
  {/* Occasion Dropdown */}
<li className='form-row'>
  <label className="form-label">Occasion</label>
  <div className='multipleitem'>
    <select
      name="occasion"
      value={formData.occasion}
      onChange={handleChange}
      required
    >
      <option value="">-- Select Occasion --</option>
      <option value="Referral Follow up">Referral Follow up</option>
      <option value="Rapport building">Rapport building</option>
      <option value="Event Calling">Event Calling</option>
      <option value="Enquiry Follow ups">Enquiry Follow ups</option>
      <option value="Birthday Wishes">Birthday Wishes</option>
      <option value="Other">Other</option>
    </select>
  </div>
</li>

{/* Conditional extra input based on occasion */}
{formData.occasion === "Referral Follow up" && (
  <li className="form-row">
    <label className="form-label">Referral ID</label>
      <div className='multipleitem'>
    <input
      type="text"
      name="referralId"
      value={formData.referralId || ""}
      onChange={handleChange}
      placeholder="Enter Referral ID"
    />
    </div>
  </li>
)}

{formData.occasion === "Event Calling" && (
  <li className="form-row">
    <label className="form-label">Event Name</label>
    <div className='multipleitem'>
    <input
      type="text"
      name="eventName"
      value={formData.eventName || ""}
      onChange={handleChange}
      placeholder="Enter Event Name"
    />
    </div>
  </li>
)}

{formData.occasion === "Other" && (
  <li className="form-row">
    <label className="form-label">Other Occasion</label>
    <div className='multipleitem'>
    <input
      type="text"
      name="otherOccasion"
      value={formData.otherOccasion || ""}
      onChange={handleChange}
      placeholder="Enter Occasion Name"
    />
    </div>
  </li>
)}



  <li className='form-row'>
        <label className="form-label">Discussion Details</label>
        <textarea
          name="discussionDetails"
          value={formData.discussionDetails}
          onChange={handleChange}
          rows="2"
          required
        />
      </li>
      <li className='form-row'>
  <label className="form-label">Next Follow-up Date</label>
  <div className='multipleitem'>
    <input
      type="datetime-local"
      name="nextFollowupDate"
      value={formData.nextFollowupDate}
      onChange={handleChange}
    />
  </div>
</li>

      </ul>
      <ul className="form-fields">
      {/* Orbiter Suggestions */}
      <li className="form-item">
        <label className="form-label">Suggestions Shared by Orbiter</label>
        {formData.orbiterSuggestions.map((suggestion, index) => (
          <textarea
            key={index}
            value={suggestion}
            onChange={(e) => handleArrayChange('orbiterSuggestions', index, e.target.value)}
            rows="2"
            className="accordion-textarea"
            placeholder={`Suggestion ${index + 1}`}
          />
        ))}
        <button type="button" className="m-button-7" onClick={() => addMoreField('orbiterSuggestions')}>+ Add Suggestion</button>
      </li>
  
      {/* Team Suggestions */}
      <li className="form-item">
        <label className="form-label">Suggestions from UJustBe Team</label>
        {formData.teamSuggestions.map((suggestion, index) => (
          <textarea
            key={index}
            value={suggestion}
            onChange={(e) => handleArrayChange('teamSuggestions', index, e.target.value)}
            rows="2"
            className="accordion-textarea"
            placeholder={`Team Suggestion ${index + 1}`}
          />
        ))}
        <button type="button" className="m-button-7" onClick={() => addMoreField('teamSuggestions')}>+ Add Suggestion</button>
      </li>
  
      {/* Referral Possibilities */}
      <li className="form-item">
        <label className="form-label">Referral Possibilities</label>
        {formData.referralPossibilities.map((referral, index) => (
          <textarea
            key={index}
            value={referral}
            onChange={(e) => handleArrayChange('referralPossibilities', index, e.target.value)}
            rows="2"
            className="accordion-textarea"
            placeholder={`Referral Possibility ${index + 1}`}
          />
        ))}
        <button type="button" className="m-button-7" onClick={() => addMoreField('referralPossibilities')}>+ Add Referral</button>
      </li>
    </ul>
  
    {/* Save Button */}
    <button onClick={handleSave} disabled={loading} className="save-button">
      {loading ? 'Saving...' : 'Save'}
    </button>
  
    {/* Divider */}
    <hr className="divider" />
  
    {/* Saved Entries Section */}
   
    <label className="form-label">Saved Engagement Entries</label>
    {entries.length === 0 ? (
      <p className="no-data">No data found.</p>
    ) : (
 <table className="entries-table">
  <thead>
    <tr>
      <th>Date</th>
      <th>Orbiter Name</th>
      <th>Occasion</th>
      <th>Discussion</th>
      <th>Next Follow-up</th>
      <th>Orbiter Suggestions</th>
      <th>Team Suggestions</th>
      <th>Referrals</th>
      <th>Last Updated</th> {/* ✅ New column */}
    </tr>
  </thead>
  <tbody>
    {entries.map((entry) => (
      <tr key={entry.id}>
        <td>{new Date(entry.callDate).toLocaleString()}</td>
        <td>{entry.orbiterName}</td>
        <td>
          {entry.occasion}
          {entry.occasion === "Referral Follow up" && entry.referralId
            ? ` - ${entry.referralId}`
            : ""}
          {entry.occasion === "Event Calling" && entry.eventName
            ? ` - ${entry.eventName}`
            : ""}
          {entry.occasion === "Other" && entry.otherOccasion
            ? ` - ${entry.otherOccasion}`
            : ""}
        </td>
        <td>{entry.discussionDetails}</td>
      <td>{formatDate(entry.nextFollowupDate)}</td>


        <td>
          <ul>
            {entry.orbiterSuggestions?.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </td>
        <td>
          <ul>
            {entry.teamSuggestions?.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </td>
        <td>
          <ul>
            {entry.referralPossibilities?.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </td>
      <td>
  {entry.updatedAt
    ? formatDate(entry.updatedAt.seconds ? entry.updatedAt.toDate() : entry.updatedAt)
    : "—"}
</td>

      </tr>
    ))}
  </tbody>
</table>


    )}
</div>
  
);
};

export default EngagementForm;