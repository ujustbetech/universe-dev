import { useEffect, useState } from 'react';
import { db } from '../firebaseConfig';
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  query,
  orderBy,
  onSnapshot
} from 'firebase/firestore';
import { useRouter } from 'next/router';
import { COLLECTIONS } from "/utility_collection";
import Modal from 'react-modal';

Modal.setAppElement('#__next');

// ...imports remain the same

const RegisteredUsers = () => {
  const router = useRouter();
  const { conclaveId, eventId, id } = router.query;
  const effectiveEventId = eventId || id;

  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [userNameFilter, setUserNameFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [markedAttendance, setMarkedAttendance] = useState({});
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [addFeedbackModalIsOpen, setAddFeedbackModalIsOpen] = useState(false);
  const [selectedUserName, setSelectedUserName] = useState('');
  const [selectedFeedbacks, setSelectedFeedbacks] = useState([]);
  const [currentUserId, setCurrentUserId] = useState('');
  const [predefinedFeedback, setPredefinedFeedback] = useState('');
  const [customFeedback, setCustomFeedback] = useState('');

  const predefinedOptions = [
    "Available", "Not Available", "Not Connected Yet", "Called but no response", "Tentative", "Other response"
  ];

  useEffect(() => {
    if (!router.isReady || !conclaveId || !effectiveEventId) return;

    const registeredUsersRef = collection(db, `Conclaves/${conclaveId}/meetings/${effectiveEventId}/registeredUsers`);
    const usersQuery = query(registeredUsersRef, orderBy('registeredAt', 'desc'));

    const unsubscribe = onSnapshot(usersQuery, async (snapshot) => {
      if (!snapshot.empty) {
        const rawUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const enhancedUsers = await Promise.all(rawUsers.map(async (user) => {
          const userDocRef = doc(db, `userdetails/${user.id}`);
          const userDocSnap = await getDoc(userDocRef);
          const data = userDocSnap.exists() ? userDocSnap.data() : {};
          return {
            id: user.id,
            name: data[" Name"] || `Unknown (${user.id})`,
            category: data["Category"] || 'Unknown',
            feedback: user.feedback || [],
            phoneNumber: user.phoneNumber || user.id,
            response: user.response || '',
            ...user,
          };
        }));

        // Filter users who have a response
        const respondedUsers = enhancedUsers.filter(user => user.response);
        setRegisteredUsers(respondedUsers);
      } else {
        setRegisteredUsers([]);
      }
    });

    return () => unsubscribe();
  }, [router.isReady, conclaveId, effectiveEventId]);

  useEffect(() => {
    const filtered = registeredUsers.filter(user =>
      user.name.toLowerCase().includes(userNameFilter.toLowerCase()) &&
      user.category.toLowerCase().includes(categoryFilter.toLowerCase())
    );
    setFilteredUsers(filtered);
  }, [registeredUsers, userNameFilter, categoryFilter]);

  const openModal = (feedbacks = [], name) => {
    setSelectedFeedbacks(feedbacks);
    setSelectedUserName(name);
    setModalIsOpen(true);
  };

  const openAddFeedbackModal = (userId, name) => {
    setCurrentUserId(userId);
    setSelectedUserName(name);
    setAddFeedbackModalIsOpen(true);
  };

  const closeModal = () => setModalIsOpen(false);
  const closeAddFeedbackModal = () => {
    setAddFeedbackModalIsOpen(false);
    setPredefinedFeedback('');
    setCustomFeedback('');
  };

  const submitFeedback = async () => {
    const entry = {
      predefined: predefinedFeedback || "No predefined",
      custom: customFeedback || "No custom",
      timestamp: new Date().toLocaleString()
    };

    try {
      const ref = doc(db, `Conclaves/${conclaveId}/meetings/${effectiveEventId}/registeredUsers/${currentUserId}`);
      await updateDoc(ref, {
        feedback: arrayUnion(entry)
      });
      alert("Feedback added");
      closeAddFeedbackModal();
    } catch (err) {
      console.error("Feedback error:", err);
      alert("Error adding feedback");
    }
  };

  const markAttendance = async (userId) => {
    try {
      const ref = doc(db, `Conclaves/${conclaveId}/meetings/${effectiveEventId}/registeredUsers/${userId}`);
      await updateDoc(ref, { attendanceStatus: true });
      setMarkedAttendance(prev => ({ ...prev, [userId]: true }));
    } catch (err) {
      console.error("Error marking attendance:", err);
    }
  };

  useEffect(() => {
    const fetchAttendance = async () => {
      const ref = collection(db, `Conclaves/${conclaveId}/meetings/${effectiveEventId}/registeredUsers`);
      const snap = await getDocs(ref);
      const statusMap = {};
      snap.forEach(doc => {
        const data = doc.data();
        statusMap[doc.id] = data.attendanceStatus || false;
      });
      setMarkedAttendance(statusMap);
    };

    if (conclaveId && effectiveEventId) {
      fetchAttendance();
    }
  }, [conclaveId, effectiveEventId]);

  return (
    <div className="container">
      <h2>Registered Users (Accepted/Declined)</h2>

      <div className="filters">
        <input placeholder="Search Name" value={userNameFilter} onChange={e => setUserNameFilter(e.target.value)} />
        <input placeholder="Search Category" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} />
      </div>

      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Phone Number</th>
            <th>Name</th>
            <th>Category</th>
            <th>Response</th>
            {/* <th>Feedback</th>
            <th>Attendance</th> */}
          </tr>
        </thead>
        <tbody>
          {filteredUsers.map((user, i) => (
            <tr key={user.id}>
              <td>{i + 1}</td>
              <td>{user.phoneNumber}</td>
              <td>{user.name}</td>
              <td>{user.category}</td>
              <td>{user.response}</td>
              {/* <td>
                <button onClick={() => openModal(user.feedback, user.name)}>View</button>
                <button onClick={() => openAddFeedbackModal(user.id, user.name)}>Add</button>
              </td>
              <td>
                {markedAttendance[user.id] ? (
                  <span>✅ Present</span>
                ) : (
                  <button onClick={() => markAttendance(user.id)}>Mark Present</button>
                )}
              </td> */}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Feedback View Modal */}
      <Modal isOpen={modalIsOpen} onRequestClose={closeModal}>
        <h3>Feedbacks for {selectedUserName}</h3>
        {selectedFeedbacks.length > 0 ? (
          <ul>
            {selectedFeedbacks.map((fb, i) => (
              <li key={i}>
                <strong>{fb.predefined}</strong> - {fb.custom}<br />
                <em>{fb.timestamp}</em>
              </li>
            ))}
          </ul>
        ) : <p>No feedback found</p>}
        <button onClick={closeModal}>Close</button>
      </Modal>

      {/* Add Feedback Modal */}
      <Modal isOpen={addFeedbackModalIsOpen} onRequestClose={closeAddFeedbackModal}>
        <h3>Add Feedback for {selectedUserName}</h3>
        <select value={predefinedFeedback} onChange={(e) => setPredefinedFeedback(e.target.value)}>
          <option value="">Select Option</option>
          {predefinedOptions.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Custom Feedback"
          value={customFeedback}
          onChange={(e) => setCustomFeedback(e.target.value)}
        />
        <button onClick={submitFeedback}>Submit</button>
        <button onClick={closeAddFeedbackModal}>Cancel</button>
      </Modal>
    </div>
  );
};

export default RegisteredUsers;
