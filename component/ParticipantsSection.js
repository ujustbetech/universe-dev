import React, { useEffect, useState } from 'react';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc
} from 'firebase/firestore';
import { db } from '../firebaseConfig';



const ParticipantSection = ({ eventID }) => {
  const [sections, setSections] = useState([]);
  const [userList, setUserList] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState({});
  const [loading, setLoading] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedSectionIndex, setSelectedSectionIndex] = useState(null);
  const [modalDate, setModalDate] = useState('');
  const [modalMode, setModalMode] = useState('online');
  const [modalZoomLink, setModalZoomLink] = useState('');
  const [modalVenue, setModalVenue] = useState('');

  const fetchData = async () => {
    const docRef = doc(db, 'MonthlyMeeting', eventID);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      const data = snapshot.data();
      setSections(data.sections || []);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'userdetails'));
        const users = snapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data()[' Name'],
          email: doc.data()[' Email'],
          phone: doc.data()[' Phone'],
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
    const updated = sections.filter((_, i) => i !== index);
    setSections(updated);
    const docRef = doc(db, 'MonthlyMeeting', eventID);
    await updateDoc(docRef, { sections: updated });
  };

  const handleSaveParticipants = async () => {
    setLoading(true);
    try {
      const docRef = doc(db, 'MonthlyMeeting', eventID);
      await updateDoc(docRef, { sections });
      alert('Participants saved successfully!');
    } catch (error) {
      console.error('Error saving:', error);
    }
    setLoading(false);
  };

  const handleScheduleMeet = (index) => {
    setSelectedSectionIndex(index);
    const sec = sections[index];
    setModalDate(sec.interactionDate || '');
    setModalMode(sec.mode || 'online');
    setModalZoomLink(sec.zoomLink || '');
    setModalVenue(sec.venue || '');
    setModalVisible(true);
  };

  const handleModalSchedule = async () => {
    const section = sections[selectedSectionIndex];
    if (!section) return alert('Invalid section');
    if (!modalDate.trim()) return alert('Please select date');
    if (modalMode === 'online' && !modalZoomLink.trim()) return alert('Enter Zoom link');
    if (modalMode === 'offline' && !modalVenue.trim()) return alert('Enter venue');

    const formattedDate = new Date(modalDate).toLocaleString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const updatedSection = {
      ...section,
      status: 'Scheduled',
      interactionDate: modalDate,
      mode: modalMode,
      zoomLink: modalMode === 'online' ? modalZoomLink : '',
      venue: modalMode === 'offline' ? modalVenue : ''
    };

    const updatedSections = [...sections];
    updatedSections[selectedSectionIndex] = updatedSection;
    setSections(updatedSections);

    const docRef = doc(db, 'MonthlyMeeting', eventID);
    await updateDoc(docRef, { sections: updatedSections });

    const participants = [section.selectedParticipant1, section.selectedParticipant2].filter(Boolean);

    for (const name of participants) {
      const user = userList.find(u => u.name === name);
      if (!user) continue;

      await sendWhatsAppMessage({
        name: user.name,
        phone: user.phone,
        date: formattedDate,
        zoomLink: modalMode === 'online' ? modalZoomLink : 'N/A',
        isReschedule: false,
        reason: ''
      });

      if (user.email) {
        await sendEmailToProspect(
          user.name,
          user.email,
          formattedDate,
          modalMode === 'online' ? modalZoomLink : 'N/A',
          false,
          ''
        );
      }
    }

    alert('✅ Meeting scheduled and participants notified!');
    setModalVisible(false);
  };

  return (
    <div className="content-wrapper">
      <h3>121 Interaction Section</h3>
      <div className="form-row">
        <div className="repeater-content">
          {sections.map((section, index) => (
            <div key={index} className="formBoxCon">
              <h4>Proposed by:<sup>*</sup></h4>
              <div className="autosuggest">
                <input
                  type="text"
                  placeholder="Search Participant 1"
                  value={section.participantSearchTerm1 || section.selectedParticipant1}
                  onChange={(e) => handleSearch(e.target.value, index, 'selectedParticipant1')}
                  onFocus={() => handleSearch(section.participantSearchTerm1 || '', index, 'selectedParticipant1')}
                />
                {filteredUsers[`${index}_selectedParticipant1`] &&
                  <ul className="dropdown">
                    {filteredUsers[`${index}_selectedParticipant1`].map(user => (
                      <li key={user.id} onClick={() => handleSelectParticipant(index, user, 'selectedParticipant1')}>
                        {user.name}
                      </li>
                    ))}
                  </ul>}
              </div>

              <h4>Proposed with:<sup>*</sup></h4>
              <div className="autosuggest">
                <input
                  type="text"
                  placeholder="Search Participant 2"
                  value={section.participantSearchTerm2 || section.selectedParticipant2}
                  onChange={(e) => handleSearch(e.target.value, index, 'selectedParticipant2')}
                  onFocus={() => handleSearch(section.participantSearchTerm2 || '', index, 'selectedParticipant2')}
                />
                {filteredUsers[`${index}_selectedParticipant2`] &&
                  <ul className="dropdown">
                    {filteredUsers[`${index}_selectedParticipant2`].map(user => (
                      <li key={user.id} onClick={() => handleSelectParticipant(index, user, 'selectedParticipant2')}>
                        {user.name}
                      </li>
                    ))}
                  </ul>}
              </div>

              <h4>Select Date:<sup>*</sup></h4>
              <input
                type="datetime-local"
                value={section.interactionDate}
                onChange={(e) => handleDateChange(e.target.value, index)}
              />

              {sections.length > 1 && (
                <button onClick={() => handleRemoveSection(index)}>Remove</button>
              )}
            </div>
          ))}
        </div>
      </div>

      <button className="m-button-7" onClick={handleAddParticipantSection}>+ Add Participant</button>
      <ul>
        <li className="form-row">
          <div className="multipleitem">
            <button className="submitbtn" onClick={handleSaveParticipants} disabled={loading}>
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </li>
      </ul>

      <table className="interaction-display-table">
        <thead>
          <tr>
            <th>Proposed By</th>
            <th>Proposed With</th>
            <th>Interaction Date</th>
            <th>Status</th>
            <th>Schedule</th>
          </tr>
        </thead>
        <tbody>
          {sections.map((section, index) => (
            <tr key={index}>
              <td>{section.selectedParticipant1 || '—'}</td>
              <td>{section.selectedParticipant2 || '—'}</td>
              <td>{section.interactionDate ? new Date(section.interactionDate).toLocaleString('en-IN') : '—'}</td>
              <td>{section.status || 'Pending'}</td>
              <td><button onClick={() => handleScheduleMeet(index)}>Schedule Meet</button></td>
            </tr>
          ))}
        </tbody>
      </table>

      {modalVisible && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h3>Schedule Meeting</h3>
            <label>Date:</label>
            <input
              type="datetime-local"
              value={modalDate}
              onChange={e => setModalDate(e.target.value)}
            />
            <label>Mode:</label>
            <select value={modalMode} onChange={e => setModalMode(e.target.value)}>
              <option value="online">Online</option>
              <option value="offline">Offline</option>
            </select>
            {modalMode === 'online' ? (
              <>
                <label>Zoom Link:</label>
                <input
                  type="text"
                  value={modalZoomLink}
                  onChange={e => setModalZoomLink(e.target.value)}
                />
              </>
            ) : (
              <>
                <label>Venue:</label>
                <input
                  type="text"
                  value={modalVenue}
                  onChange={e => setModalVenue(e.target.value)}
                />
              </>
            )}
            <button onClick={handleModalSchedule}>Schedule</button>
            <button onClick={() => setModalVisible(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParticipantSection;
