import { useEffect, useState } from 'react';
import { db } from '../../../../firebaseConfig';
import { collection, getDocs, doc, getDoc, updateDoc, arrayUnion,query,orderBy,onSnapshot,where,serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/router'; 
import Layout from '../../../../component/Layout';
import "../../../../src/app/styles/main.scss";
import { IoMdClose } from "react-icons/io";
import ExportToExcel from '../../ExporttoExcel';
import Modal from 'react-modal';
import { FaSearch } from "react-icons/fa";

Modal.setAppElement('#__next'); 
const customStyles = {
  content: { 
    top: '50%',
    left: '50%',
    right: 'auto',
    bottom: 'auto',
    transform: 'translate(-50%, -50%)',
    width: '80%',
    maxWidth: '500px',
    border: '1px solid #ccc',
    borderRadius: '8px',
    padding: '20px',
  },
};

const RegisteredUsers = () => {
  const router = useRouter();
  const { id, eventId } = router.query; 
  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]); 
  const [searchTerm, setSearchTerm] = useState(''); 
  const [registeredNumberFilter, setRegisteredNumberFilter] = useState('');
  const [ujbCodeFilter, setUjbCodeFilter] = useState('');
  const [userNameFilter, setUserNameFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const [feedbacks, setFeedbacks] = useState({});
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [addFeedbackModalIsOpen, setAddFeedbackModalIsOpen] = useState(false); // State for add feedback modal
  const [selectedUserName, setSelectedUserName] = useState('');
  const [selectedFeedbacks, setSelectedFeedbacks] = useState([]);
  const [error, setError] = useState('');
  const [currentUserId, setCurrentUserId] = useState(''); 
  const [predefinedFeedback, setPredefinedFeedback] = useState(''); 
  const [customFeedback, setCustomFeedback] = useState(''); 

  
  const predefinedFeedbacks = [
    "Available",
    "Not Available",
    "Not Connected Yet",
    "Called but no response",
    "Tentative",
    "Other response",
  ];

  useEffect(() => {
    if (!eventId) return;  // Ensure eventId is available
  
    const registeredUsersRef = collection(db, `MonthlyMeeting/${eventId}/registeredUsers`);
    const usersQuery = query(registeredUsersRef, orderBy('registeredAt', 'desc'));
  
    const unsubscribe = onSnapshot(usersQuery, async (snapshot) => {
      if (!snapshot.empty) {
        const userDetails = snapshot.docs.map((doc) => ({
          id: doc.id, // User's phone number as doc ID
          ...doc.data(),
        }));
  
        try {
          const nameAndUJBPromises = userDetails.map(async (user) => {
            const userDocRef = doc(db, `usersdetail/${user.id}`);
            const userDocSnap = await getDoc(userDocRef);
  
            return {
              id: user.id,
              name: userDocSnap.exists() ? userDocSnap.data()["Name"] : 'Unknown',
              ujbcode: userDocSnap.exists() ? userDocSnap.data()["UJBCode"] : 'Unknown',
              category: userDocSnap.exists() ? userDocSnap.data()["Category"] : 'Unknown',
              ...user,
            };
          });
  
          const completeUsers = await Promise.all(nameAndUJBPromises);
          setRegisteredUsers(completeUsers);
          console.log("Fetched Users with Details:", completeUsers);
  
        } catch (error) {
          console.error("Error fetching additional user details:", error);
        }
      } else {
        console.log("No registered users found.");
        setRegisteredUsers([]);
      }
    }, (error) => {
      console.error('Error fetching registered users:', error);
    });
  
    return () => unsubscribe();  // Cleanup listener on unmount
  }, [eventId]);
  
 useEffect(() => {
    const filtered = registeredUsers.filter((user) =>
      (user.id || '').toLowerCase().includes(registeredNumberFilter.toLowerCase()) &&
      (user.ujbcode || '').toLowerCase().includes(ujbCodeFilter.toLowerCase()) &&
      (user.name || '').toLowerCase().includes(userNameFilter.toLowerCase()) &&
      (user.category || '').toLowerCase().includes(categoryFilter.toLowerCase())
    );
    setFilteredUsers(filtered);
  }, [registeredUsers, registeredNumberFilter, ujbCodeFilter, userNameFilter, categoryFilter]);
  

  const handleSearchChange = (e, setFilter) => {
    setFilter(e.target.value);
  };

  
  const openModal = (userFeedbacks, userName) => {
    setSelectedFeedbacks(userFeedbacks || []);
    setSelectedUserName(userName);
    setModalIsOpen(true);
  };

  // Open add feedback modal
  const openAddFeedbackModal = (userId, userName) => {
    setCurrentUserId(userId);
    setSelectedUserName(userName);
    setAddFeedbackModalIsOpen(true);
  };

  // Close feedback modal
  const closeModal = () => {
    setModalIsOpen(false);
  };

  // Close add feedback modal
  const closeAddFeedbackModal = () => {
    setAddFeedbackModalIsOpen(false);
    setPredefinedFeedback(''); 
    setCustomFeedback(''); 
  };

  
  const handlePredefinedFeedbackChange = (userId, feedback) => {
    setFeedbacks(prev => ({
      ...prev,
      [userId]: { ...prev[userId], predefined: feedback, custom: prev[userId]?.custom || '' }
    }));
  };

  // Handle custom feedback change in input
  const handleCustomFeedbackChange = (userId, feedback) => {
    setFeedbacks(prev => ({
      ...prev,
      [userId]: { ...prev[userId], custom: feedback }
    }));
  };


  const submitFeedback = async (userId) => {
    const { predefined, custom } = feedbacks[userId] || {};
    if (!predefined && !custom) { 
      alert("Please provide feedback before submitting.");
      return;
    }
    
    const timestamp = new Date().toLocaleString(); 
    const feedbackEntry = {
      predefined: predefined || 'No predefined feedback',
      custom: custom || 'No custom feedback',
      timestamp: `Submitted on: ${timestamp}`
    };

    await updateFeedback(userId, feedbackEntry);
  };

  // Update feedback in Firestore
  const updateFeedback = async (userId, feedbackEntry) => {
    try {
      const userRef = doc(db, `MonthlyMeeting/${eventId}/registeredUsers`, userId);
      
      await updateDoc(userRef, {
        feedback: arrayUnion(feedbackEntry)
      });
      
      alert("Feedback submitted successfully!");
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert("Error submitting feedback. Please try again.");
    }
  };

  // Submit feedback from the add feedback modal
  const submitAddFeedback = async () => {
    if (!predefinedFeedback && !customFeedback) {
      alert("Please provide feedback before submitting.");
      return;
    }

    const timestamp = new Date().toLocaleString();
    const feedbackEntry = {
      predefined: predefinedFeedback || 'No predefined feedback',
      custom: customFeedback || 'No custom feedback',
      timestamp: `Submitted on: ${timestamp}`
    };

    await updateFeedback(currentUserId, feedbackEntry);
    closeAddFeedbackModal();
  };
  const markAttendance = async (phoneNumber) => {
    if (!eventId) {
      console.error("Event ID is missing");
      return;
    }
  
    try {
      // Reference to the user's document in the registeredUsers collection
      const userRef = doc(db, "MonthlyMeeting", eventId, "registeredUsers", phoneNumber);
    
      // Update only the attendanceStatus field without affecting other data
      await updateDoc(userRef, {
        attendanceStatus: true,  // Mark attendance as true (can be false depending on the action)
        timestamp: serverTimestamp()  // Add timestamp for when the attendance was marked
      });
    
      alert("Attendance marked successfully!");
    } catch (error) {
      console.error("Failed to mark attendance:", error);
      alert("Error marking attendance.");
    }
  };
  const handleMeetingDone = async () => {
    const accessToken = "EAAHwbR1fvgsBOwUInBvR1SGmVLSZCpDZAkn9aZCDJYaT0h5cwyiLyIq7BnKmXAgNs0ZCC8C33UzhGWTlwhUarfbcVoBdkc1bhuxZBXvroCHiXNwZCZBVxXlZBdinVoVnTB7IC1OYS4lhNEQprXm5l0XZAICVYISvkfwTEju6kV4Aqzt4lPpN8D3FD7eIWXDhnA4SG6QZDZD"; // Replace with your Meta API token
    const phoneNumberId = "527476310441806";  
  
    if (!eventId) {
      alert("Event ID is missing!");
      return;
    }
  
    try {
      const usersRef = collection(db, "MonthlyMeeting", eventId, "registeredUsers");
      const q = query(usersRef, where("attendanceStatus", "==", true));
      const querySnapshot = await getDocs(q);
  
      if (querySnapshot.empty) {
        alert("No attendees found.");
        return;
      }
  
      for (const docSnap of querySnapshot.docs) {
        const ujbCode = docSnap.id;
  
        // Get user name from userdetails/{phoneNumber}
        const userDocRef = doc(db, "usersdetail", ujbCode);
        const userDocSnap = await getDoc(userDocRef);
        const userName = userDocSnap.exists() ? userDocSnap.data()["Name"] || "there" : "there";
  
        // Send WhatsApp Message
        const response = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: `91${phoneNumber}`, // Make sure it's a valid WhatsApp number
            type: "template",
            template: {
              name: "post_thankyou_mm",
              language: {
                code: "en",
              },
              components: [
                {
                  type: "body",
                  parameters: [
                    {
                      type: "text",
                      text: userName,
                    },
                  ],
                },
              ],
            },
          }),
        });
  
        const result = await response.json();
        console.log("WhatsApp Response:", result);
      }
  
      alert("Thank you messages sent to all attendees.");
    } catch (error) {
      console.error("Error sending WhatsApp messages:", error);
      alert("Something went wrong while sending messages.");
    }
  };
  
  
  return (
    <Layout>
      <section className='c-userslist box'>
      <div className="twobtn">
        <ExportToExcel eventId={eventId} />
        <button className="m-button-7" onClick={handleMeetingDone} style={{ marginLeft: '10px', backgroundColor: '#f16f06', color: 'white' }}>
 Meeting Done
</button>
</div>
        <button className="m-button-5" onClick={() => window.history.back()}>
          Back
        </button>
      

        {error && <p style={{ color: 'red' }}>{error}</p>}
        <table className='table-class'>
          
        </table>
        {/* User Table */}
        <table className='table-class'>
          <thead>
            <tr>
              <th>Sr no</th>
              <th>Registered Number</th>
              {/* <th>UJB Code</th>  */}
              <th>User Name</th> 
              <th>Category</th>
              <th>Type</th>
    <th>Register</th>
    <th>Interested In</th>
              <th>Feedback</th>
              <th>Attendance</th>
            </tr>
          </thead>
          <thead>
            <tr>
              <th></th>
              <th>
            
   <div class="search">
      <input type="text" class="searchTerm" placeholder="Search by Registered Number"
            value={registeredNumberFilter}
            onChange={(e) => handleSearchChange(e, setRegisteredNumberFilter)}/>
      <button type="submit" class="searchButton">
        <FaSearch/>
     </button>
   </div>
 
          </th>
          {/* <th>
          <div class="search">
      <input type="text" class="searchTerm" placeholder="Search by UJB Code"
            value={ujbCodeFilter}
            onChange={(e) => handleSearchChange(e, setUjbCodeFilter)}/>
      <button type="submit" class="searchButton">
        <FaSearch/>
     </button>
   </div>
         
          </th> */}
          <th>

          <div class="search">
      <input type="text" class="searchTerm" p placeholder="Search by User Name"
            value={userNameFilter}
            onChange={(e) => handleSearchChange(e, setUserNameFilter)}/>
      <button type="submit" class="searchButton">
        <FaSearch/>
     </button>
   </div>    
       
          </th>
          <th>
          <div class="search">
      <input type="text" class="searchTerm"   placeholder="Search by Category"
            value={categoryFilter}
            onChange={(e) => handleSearchChange(e, setCategoryFilter)}/>
      <button type="submit" class="searchButton">
        <FaSearch/>
     </button>
   </div>    
       
          </th>
          <th></th>
          </tr>
          </thead>
          <tbody>
          {filteredUsers.length > 0 ? (
              filteredUsers.map((user, index) => (
                <tr key={user.id}>
                  <td>{index + 1}</td> 
                  <td>{user.id}</td> 
                  {/* <td>{user.ujbcode}</td>   */}
                  <td>{user.name || 'Unknown'}</td> 
                  <td>{user.category}</td> 
                  <td>{user.type || '—'}</td>
        <td>{user.register ? '✅' : '❌'}</td>
        <td>
          {user.interestedIn ? (
            <ul className="list-disc ml-4">
              {Object.entries(user.interestedIn).map(([key, value]) =>
                value ? <li key={key}>{key}</li> : null
              )}
            </ul>
          ) : (
            '—'
          )}
        </td>

                  <td>
                    <div className="twobtn">
                    <button className='m-button-7' onClick={() => openModal(user.feedback, user.name)} style={{ marginLeft: '10px', backgroundColor: '#e2e2e2', color: 'black' }}>
                      View
                    </button>
                    <button className='m-button-7' onClick={() => openAddFeedbackModal(user.id, user.name)} style={{ marginLeft: '10px', backgroundColor: '#f16f06', color: 'white' }}>
                      Add 
                    </button>
                    </div>
                  </td>
                  <button className='m-button-7' onClick={() => markAttendance(user.id)}>
              Mark Present
            </button>
                </tr>
              ))
            ) : (
              <tr>
              <td colSpan="6" style={{ textAlign: 'center' }}>No registered users found</td>
            </tr>
            )}
          </tbody>
        </table>

        {/* Feedback Modal */}
        <Modal isOpen={modalIsOpen} onRequestClose={closeModal} className="modal"
  overlayClassName="overlay">
  
  <button className="closes-modal" onClick={closeModal}><IoMdClose /></button>
  
  <h2 className="modal-title">Feedback for {selectedUserName}</h2>
  
  {selectedFeedbacks.length > 0 ? (
    <table className="feedback-table">
      <thead>
        <tr>
          <th>Sr no</th>
          <th>Feedback</th>
          <th>Remark</th>
          <th>Time</th>
        </tr>
      </thead>
      <tbody>
        {selectedFeedbacks.map((feedback, index) => (
          <tr key={index}>
            <td>{index+1}</td>
            <td>{feedback.predefined}</td>
            <td>{feedback.custom}</td>
            <td>{feedback.timestamp}</td>
          </tr>
        ))}
      </tbody>
    </table>
  ) : (
    <p className="no-feedback-message">No feedback available.</p>
  )}
</Modal>

        {/* Add Feedback Modal */}
        <Modal isOpen={addFeedbackModalIsOpen} onRequestClose={closeAddFeedbackModal} className="modal"
      overlayClassName="overlay">
          <button className="close-modal" onClick={closeAddFeedbackModal}><IoMdClose /></button>
          <h2 className="modal-title">Add Feedback for {selectedUserName}</h2>
          <div className="leave-container">
          <div className="form-group">
          <select
            onChange={(e) => setPredefinedFeedback(e.target.value)}
            value={predefinedFeedback}
          >
            <option value="">Select Feedback</option>
            {predefinedFeedbacks.map((feedback, idx) => (
              <option key={idx} value={feedback}>{feedback}</option>
            ))}
          </select>
          </div>
          </div>
          <div className="form-group">
          <textarea
            value={customFeedback}
            onChange={(e) => setCustomFeedback(e.target.value)}
            placeholder="Enter feedback"
          />
          </div>
          <div className="twobtn">
          <button className='m-button-7' onClick={submitAddFeedback} style={{ marginLeft: '10px', backgroundColor: '#f16f06', color: 'white' }} >
            Submit
          </button>
          <button className='m-button-7' onClick={closeAddFeedbackModal} style={{ marginLeft: '10px', backgroundColor: '#e2e2e2', color: 'black' }}>
            Cancel
          </button>
          </div>
          
        </Modal>
      </section>
    </Layout>
  );
};

export default RegisteredUsers;
