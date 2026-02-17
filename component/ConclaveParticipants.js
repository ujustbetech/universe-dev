import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, collection, getDocs } from 'firebase/firestore';
import { COLLECTIONS } from "/utility_collection";
import { db } from '../firebaseConfig';
import { useRouter } from 'next/router';

const ParticipantSection = ({ eventID, data = {}, fetchData }) => {
  const [sections, setSections] = useState(data.sections || []);
  const [userList, setUserList] = useState([]);
  const router = useRouter();
const { conclaveId, id: meetingId } = router.query;
const [filteredUsers, setFilteredUsers] = useState({});
  const [loading, setLoading] = useState(false);

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const snapshot = await getDocs(collection(db,COLLECTIONS.userDetail));
  
        const users = snapshot.docs.map(doc => ({
          ujbCode: doc.id,                            // 🔥 UJB Code
          name: doc.data()["Name"] || '',            // Name field
          phone: doc.data().MobileNo || '',           // 🔥 Add phone number
        }));
  
        setUserList(users);
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };
  
    fetchUsers();
  }, []);
  const handleSearch = (value, index, key) => {
    const updatedSections = [...sections];
    updatedSections[index][key === 'selectedParticipant1' ? 'participantSearchTerm1' : 'participantSearchTerm2'] = value;
    setSections(updatedSections);

    const filtered = userList.filter(user =>
      user.name?.toLowerCase().includes(value.toLowerCase())
    ); 
    setFilteredUsers(prev => ({
      ...prev,
      [`${index}_${key}`]: filtered,
    }));
  };

  const handleSelectParticipant = (index, user, key) => {
    const updatedSections = [...sections];
    updatedSections[index][key] = user.name;
    updatedSections[index][key === 'selectedParticipant1' ? 'participantSearchTerm1' : 'participantSearchTerm2'] = '';
    setSections(updatedSections);

    setFilteredUsers(prev => ({
      ...prev,
      [`${index}_${key}`]: [],
    }));
  };

  const handleDateChange = (value, index) => {
    const updatedSections = [...sections];
    updatedSections[index].interactionDate = value;
    setSections(updatedSections);
  };

  const handleAddParticipantSection = () => {
    setSections(prev => [
      ...prev,
      {
        participantSearchTerm1: '',
        participantSearchTerm2: '',
        selectedParticipant1: '',
        selectedParticipant2: '',
        interactionDate: '',
      },
    ]);
  };
const handleRemoveSection = async (index) => {
  const toRemove = sections[index];
  const { conclaveId, meetingId } = router.query;

  if (toRemove.selectedParticipant1 || toRemove.selectedParticipant2 || toRemove.interactionDate) {
    try {
      const docRef = doc(db, COLLECTIONS.conclaves, conclaveId, 'meetings', meetingId);
      const snapshot = await getDoc(docRef);

      if (snapshot.exists()) {
        const data = snapshot.data();
        const updated = data.sections?.filter((_, i) => i !== index) || [];
        await updateDoc(docRef, { sections: updated });
        console.log('Participant section removed from Firestore');
      }
    } catch (error) {
      console.error('Error removing participant section:', error);
    }
  }

  setSections(prev => prev.filter((_, i) => i !== index));
};
const handleSaveParticipants = async () => {
  if (!conclaveId || !meetingId) {
    console.error('Missing conclaveId or meetingId');
    return;
  }

  setLoading(true);
  try {
    const docRef = doc(db, COLLECTIONS.conclaves, conclaveId, 'meetings', meetingId);

    const cleanedSections = sections.map(({ selectedParticipant1, selectedParticipant2, interactionDate }) => ({
      selectedParticipant1,
      selectedParticipant2,
      interactionDate,
    }));

    await updateDoc(docRef, { sections: cleanedSections });
    console.log('Participant sections saved successfully');
    fetchData?.();
  } catch (error) {
    console.error('Error saving participant sections:', error);
  }
  setLoading(false);
};

  

  return (
    <div className='content-wrapper'>
        <h3>121 Interaction Section</h3>
      <div className='form-row'>
        <div className='repeater-content'>
          {sections.map((section, index) => (
            <div key={index} className='formBoxCon'>
              <h4>Proposed by:<sup>*</sup></h4>
              <div className='autosuggest'>
                <input
                  type="text"
                  placeholder="Search Participant 1"
                  value={section.participantSearchTerm1 || section.selectedParticipant1}
                  onChange={(e) => handleSearch(e.target.value, index, 'selectedParticipant1')}
                  onFocus={() => handleSearch(section.participantSearchTerm1 || '', index, 'selectedParticipant1')}
                />
                {filteredUsers[`${index}_selectedParticipant1`] &&
                  filteredUsers[`${index}_selectedParticipant1`].length > 0 && (
                    <ul className="dropdown">
                      {filteredUsers[`${index}_selectedParticipant1`].map(user => (
                        <li key={user.id} onClick={() => handleSelectParticipant(index, user, 'selectedParticipant1')}>
                          {user.name}
                        </li>
                      ))}
                    </ul>
                  )}
              </div>

              <h4>Proposed with:<sup>*</sup></h4>
              <div className='autosuggest'>
                <input
                  type="text"
                  placeholder="Search Participant 2"
                  value={section.participantSearchTerm2 || section.selectedParticipant2}
                  onChange={(e) => handleSearch(e.target.value, index, 'selectedParticipant2')}
                  onFocus={() => handleSearch(section.participantSearchTerm2 || '', index, 'selectedParticipant2')}
                />
                {filteredUsers[`${index}_selectedParticipant2`] &&
                  filteredUsers[`${index}_selectedParticipant2`].length > 0 && (
                    <ul className="dropdown">
                      {filteredUsers[`${index}_selectedParticipant2`].map(user => (
                        <li key={user.id} onClick={() => handleSelectParticipant(index, user, 'selectedParticipant2')}>
                          {user.name}
                        </li>
                      ))}
                    </ul>
                  )}
              </div>

              <h4>Select Date:<sup>*</sup></h4>
              <div className="multipleitem">
                <input
                  type="datetime-local"
                  value={section.interactionDate}
                  onChange={(e) => handleDateChange(e.target.value, index)}
                />
              </div>

              {sections.length > 1 && (
                <button class="tooltip" onClick={() =>  handleRemoveSection(index)}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20" height="25" width="25">
                  <path fill="#6361D9" d="M8.78842 5.03866C8.86656 4.96052 8.97254 4.91663 9.08305 4.91663H11.4164C11.5269 4.91663 11.6329 4.96052 11.711 5.03866C11.7892 5.11681 11.833 5.22279 11.833 5.33329V5.74939H8.66638V5.33329C8.66638 5.22279 8.71028 5.11681 8.78842 5.03866ZM7.16638 5.74939V5.33329C7.16638 4.82496 7.36832 4.33745 7.72776 3.978C8.08721 3.61856 8.57472 3.41663 9.08305 3.41663H11.4164C11.9247 3.41663 12.4122 3.61856 12.7717 3.978C13.1311 4.33745 13.333 4.82496 13.333 5.33329V5.74939H15.5C15.9142 5.74939 16.25 6.08518 16.25 6.49939C16.25 6.9136 15.9142 7.24939 15.5 7.24939H15.0105L14.2492 14.7095C14.2382 15.2023 14.0377 15.6726 13.6883 16.0219C13.3289 16.3814 12.8414 16.5833 12.333 16.5833H8.16638C7.65805 16.5833 7.17054 16.3814 6.81109 16.0219C6.46176 15.6726 6.2612 15.2023 6.25019 14.7095L5.48896 7.24939H5C4.58579 7.24939 4.25 6.9136 4.25 6.49939C4.25 6.08518 4.58579 5.74939 5 5.74939H6.16667H7.16638ZM7.91638 7.24996H12.583H13.5026L12.7536 14.5905C12.751 14.6158 12.7497 14.6412 12.7497 14.6666C12.7497 14.7771 12.7058 14.8831 12.6277 14.9613C12.5495 15.0394 12.4436 15.0833 12.333 15.0833H8.16638C8.05588 15.0833 7.94989 15.0394 7.87175 14.9613C7.79361 14.8831 7.74972 14.7771 7.74972 14.6666C7.74972 14.6412 7.74842 14.6158 7.74584 14.5905L6.99681 7.24996H7.91638Z" clip-rule="evenodd" fill-rule="evenodd"></path>
                </svg>
                <span class="tooltiptext">Remove</span>
              </button>
              )}
            </div>
          ))}
        </div>
</div>
      
          <button  className="m-button-7" type="button" onClick={handleAddParticipantSection}>+ Add Participant</button>
          <ul>
        <li className="form-row">
          <div className="multipleitem">
          <button  className="submitbtn" onClick={handleSaveParticipants} disabled={loading}>
            {loading ? 'Saving...' : 'Save'}
          </button>
          </div>
          </li></ul>

      </div>
    
  );
};

export default ParticipantSection; 