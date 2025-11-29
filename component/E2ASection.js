import React, { useState, useEffect } from 'react';
import { COLLECTIONS } from "/utility_collection";
import { doc, getDoc, updateDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';

const E2ASection = ({ eventID, data = {}, fetchData }) => {
  const [e2aSections, setE2aSections] = useState(data.e2aSections || []);
  const [userList, setUserList] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const userRef = collection(db, COLLECTIONS.userDetail);
        const snapshot = await getDocs(userRef);
  
        const users = snapshot.docs.map(doc => ({
          ujbCode: doc.id,                    // 🔥 UJB Code from doc ID
          name: doc.data()["Name"] || "",    // Name field
          phone: doc.data().MobileNo || "",   // 🔥 Phone number
        }));
  
        setUserList(users);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };
  
    fetchUsers();
  }, []);

  const handleSearchChange = (index, value) => {
    setE2aSections(prev =>
      prev.map((section, i) =>
        i === index ? { ...section, e2aSearch: value } : section
      )
    );

    const filtered = userList.filter(user =>
      user.name?.toLowerCase().includes(value.toLowerCase())
    );
    setFilteredUsers(prev => ({
      ...prev,
      [index]: filtered
    }));
    
  };

  const handleSelectName = (index, name) => {
    setE2aSections(prev =>
      prev.map((section, i) =>
        i === index ? { ...section, e2a: name, e2aSearch: '' } : section
      )
    );
    setFilteredUsers(prev => ({ ...prev, [index]: [] }));

  };

  const handleDescriptionChange = (index, value) => {
    setE2aSections(prev =>
      prev.map((section, i) =>
        i === index ? { ...section, e2aDesc: value } : section
      )
    );
  };

  const handleDateChange = (index, value) => {
    setE2aSections(prev =>
      prev.map((section, i) =>
        i === index ? { ...section, e2aDate: value } : section
      )
    );
  };

const handleAddSection = () => {
  setE2aSections(prev => [
    ...prev,
    { e2a: '', e2aSearch: '', e2aDesc: '', e2aDate: '', status: false }
  ]);
};

const handleToggleStatus = (index) => {
  setE2aSections(prev =>
    prev.map((section, i) =>
      i === index ? { ...section, status: !section.status } : section
    )
  );
};

  const handleRemoveSection = async (index) => {
    const toRemove = e2aSections[index];

    // Remove from Firestore if already exists
    if (toRemove.e2a || toRemove.e2aDesc || toRemove.e2aDate) {
      try {
        const docRef = doc(db, COLLECTIONS.monthlyMeeting, eventID);
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
          const data = snapshot.data();
          const updated = data.e2aSections?.filter((_, i) => i !== index) || [];
          await updateDoc(docRef, { e2aSections: updated });
          console.log('E2A section removed from Firestore');
        }
      } catch (error) {
        console.error('Error removing E2A section:', error);
      }
    }

    // Remove from UI
    setE2aSections(prev => prev.filter((_, i) => i !== index));
  };

const handleSaveSections = async () => {
  try {
    const docRef = doc(db, COLLECTIONS.monthlyMeeting, eventID);

    // Sanitize fields to remove undefined
    const cleanedE2ASections = e2aSections.map(section => ({
      e2a: section.e2a || '',
      e2aDate: section.e2aDate || '',
      e2aDesc: section.e2aDesc || '',
      status: section.status ?? false  // explicitly set false if undefined
    }));

    await updateDoc(docRef, { e2aSections: cleanedE2ASections });
    console.log('E2A sections saved successfully');
    fetchData?.();
  } catch (error) {
    console.error('Error saving E2A sections:', error);
  }
};


  return (
    <div className='content-wrapper'>
        <h3>Proposed E2A</h3>
      <div className='form-row'>
        <div className='repeater-content'>
          {e2aSections.map((section, index) => (
            <div key={index} className='formBoxCon'>
              <h4>Facilitator:<sup>*</sup></h4>
              <div className='autosuggest'>
                <input
                  type='text'
                  placeholder='Search name'
                  value={section.e2aSearch || section.e2a}
                  onChange={(e) => handleSearchChange(index, e.target.value)}
                  onFocus={() => setFilteredUsers(prev => ({ ...prev, [index]: userList }))}

                />
               {filteredUsers[index]?.length > 0 && (
  <ul className='dropdown'>
    {filteredUsers[index].map(user => (
      <li key={user.id} onClick={() => handleSelectName(index, user.name)}>
        {user.name}
      </li>
    ))}
  </ul>
)}

              </div>

              <h4>Topic and Description:<sup>*</sup></h4>
              <textarea
                placeholder='Description'
                value={section.e2aDesc}
                onChange={(e) => handleDescriptionChange(index, e.target.value)}
              />

              <h4>Date:<sup>*</sup></h4>
              <div className="multipleitem">
              <input
                type='datetime-local'
                value={section.e2aDate}
                onChange={(e) => handleDateChange(index, e.target.value)}
              />
</div>
<button class="tooltip" onClick={() =>  handleRemoveSection(index)}>
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20" height="25" width="25">
    <path fill="#6361D9" d="M8.78842 5.03866C8.86656 4.96052 8.97254 4.91663 9.08305 4.91663H11.4164C11.5269 4.91663 11.6329 4.96052 11.711 5.03866C11.7892 5.11681 11.833 5.22279 11.833 5.33329V5.74939H8.66638V5.33329C8.66638 5.22279 8.71028 5.11681 8.78842 5.03866ZM7.16638 5.74939V5.33329C7.16638 4.82496 7.36832 4.33745 7.72776 3.978C8.08721 3.61856 8.57472 3.41663 9.08305 3.41663H11.4164C11.9247 3.41663 12.4122 3.61856 12.7717 3.978C13.1311 4.33745 13.333 4.82496 13.333 5.33329V5.74939H15.5C15.9142 5.74939 16.25 6.08518 16.25 6.49939C16.25 6.9136 15.9142 7.24939 15.5 7.24939H15.0105L14.2492 14.7095C14.2382 15.2023 14.0377 15.6726 13.6883 16.0219C13.3289 16.3814 12.8414 16.5833 12.333 16.5833H8.16638C7.65805 16.5833 7.17054 16.3814 6.81109 16.0219C6.46176 15.6726 6.2612 15.2023 6.25019 14.7095L5.48896 7.24939H5C4.58579 7.24939 4.25 6.9136 4.25 6.49939C4.25 6.08518 4.58579 5.74939 5 5.74939H6.16667H7.16638ZM7.91638 7.24996H12.583H13.5026L12.7536 14.5905C12.751 14.6158 12.7497 14.6412 12.7497 14.6666C12.7497 14.7771 12.7058 14.8831 12.6277 14.9613C12.5495 15.0394 12.4436 15.0833 12.333 15.0833H8.16638C8.05588 15.0833 7.94989 15.0394 7.87175 14.9613C7.79361 14.8831 7.74972 14.7771 7.74972 14.6666C7.74972 14.6412 7.74842 14.6158 7.74584 14.5905L6.99681 7.24996H7.91638Z" clip-rule="evenodd" fill-rule="evenodd"></path>
  </svg>
  <span class="tooltiptext">Remove</span>
</button>
  <div className="status-button-wrapper">
      <button
        className={section.status ? 'done' : 'not-done'}
        onClick={() => handleToggleStatus(index)}
        type="button"
      >
        {section.status ? 'Done' : 'Not Done'}
      </button>
    </div>
            </div>
            
          ))}
        </div>
      </div>


      <button className='m-button-7' type='button' onClick={handleAddSection}>
       + Add E2A Host
      </button>
      <ul>
        <li className="form-row">
          <div className="multipleitem">
      <button className='submitbtn' onClick={handleSaveSections}>
        Save
      </button>
      </div>
      </li>
      </ul>
    </div>
  );
};

export default E2ASection;
