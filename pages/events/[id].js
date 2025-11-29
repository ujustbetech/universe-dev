import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {  getFirestore, doc, getDoc, collection, getDocs, setDoc,  updateDoc,query,where} from 'firebase/firestore';
import axios from 'axios';
import './event.css'; // Ensure your CSS file is correctly linked
import '../../src/app/styles/user.scss';
import { COLLECTIONS } from "/utility_collection";
import { app} from '../../firebaseConfig';
import HeaderNav from '../../component/HeaderNav';
import Swal from 'sweetalert2';

const EventLoginPage = () => {  
  const router = useRouter();
  const { id } = router.query; // Get event name from URL
const [phoneNumber, setPhoneNumber] = useState(''); // initial empty


  const [userName, setUserName] = useState(''); // State to store user name
  const [error, setError] = useState(null);
  const [eventDetails, setEventDetails] = useState(null);
  const [registeredUserCount, setRegisteredUserCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showModal, setShowModal] = useState(false); // State to show/hide modal
const db = getFirestore(app);
  const [eventInfo, setEventInfo] = useState(null);
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('agenda');
  const [timeLeft, setTimeLeft] = useState(null);


  useEffect(() => {
    if (!eventInfo?.time?.seconds) return;

    const targetTime = new Date(eventInfo.time.seconds * 1000).getTime();

    const updateCountdown = () => {
      const now = new Date().getTime();
      const difference = targetTime - now;

      if (difference <= 0) {
        setTimeLeft(null); // Event is over
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / (1000 * 60)) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      setTimeLeft({ days, hours, minutes, seconds });
    };

    updateCountdown(); // Run immediately
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [eventInfo]);

  useEffect(() => {
    if (!id) return;

  const fetchEventData = async () => {
  try {
    // 1️⃣ Fetch event info
    const eventDocRef = doc(db, COLLECTIONS.monthlyMeeting, id);
    const eventSnap = await getDoc(eventDocRef);

    if (eventSnap.exists()) {
      setEventInfo(eventSnap.data());
    }

    // 2️⃣ Fetch registered users (phone numbers)
    const registeredUsersRef = collection(
      db,
      `${COLLECTIONS.monthlyMeeting}/${id}/registeredUsers`
    );

    const regUsersSnap = await getDocs(registeredUsersRef);

    const userDetails = await Promise.all(
      regUsersSnap.docs.map(async (docSnap) => {
        const phone = docSnap.id;       // registeredUsers docId = phone
        const regUserData = docSnap.data();

        // 🔥 Correct lookup — fetch userdetails using MobileNo
        const q = query(
          collection(db, COLLECTIONS.userDetail),
          where("MobileNo", "==", phone)
        );

        const snap = await getDocs(q);
        let name = "Unknown";

        if (!snap.empty) {
          name = snap.docs[0].data()["Name"] || "Unknown";
        }

        return {
          phone,
          name,
          attendance: regUserData.attendanceStatus === true ? "Yes" : "No",
          feedback: regUserData.feedback || [],
        };
      })
    );

    setUsers(userDetails);

  } catch (err) {
    console.error("Error fetching event/user data:", err);
  }
};


    fetchEventData();
  }, [id]);

 


 const getInitials = (name) => {
    return name
      .split(" ") // Split the name into words
      .map(word => word[0]) // Get the first letter of each word
      .join(""); // Join them together
  };
  useEffect(() => {
    const storedPhoneNumber = localStorage.getItem('mmOrbiter');
    fetchUserName(storedPhoneNumber);
    // setPhoneNumber(storedPhoneNumber)
   
  }, []);
  
const fetchUserName = async (phoneNumber) => {
  if (!phoneNumber || typeof phoneNumber !== "string" || phoneNumber.trim() === "") {
    console.error("Invalid phone number:", phoneNumber);
    return;
  }

  try {
    console.log("Fetching user by phone:", phoneNumber);

    // 🔥 Correct lookup — find user by MobileNo
    const q = query(
      collection(db, COLLECTIONS.userDetail),
      where("MobileNo", "==", phoneNumber)
    );

    const snap = await getDocs(q);

    if (!snap.empty) {
      const data = snap.docs[0].data();
      const orbiterName = data["Name"] || "User";
      setUserName(orbiterName);
    } else {
      console.log("User not found in userdetails for phone:", phoneNumber);
    }

  } catch (err) {
    console.error("Error fetching user name:", err);
  }
};




  const renderTabContent = () => {
    if (!eventInfo) return <div className='loader'><span className="loader2"></span></div>

    switch (activeTab) {
      case 'agenda':
        return (
          <>
            <h3>Agenda</h3>
            {eventInfo.agenda?.length > 0 ? (
              <ul>
                {eventInfo.agenda.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            ) : (
              <p>Yet to be uploaded</p>
            )}
          </>
        );

      case 'MoM':
        return (
          <>
            <h3>MoM Uploads</h3>
            {eventInfo.documentUploads?.length > 0 ? (
              eventInfo.documentUploads.map((doc, idx) => (
                <div key={idx} className="document-item">
                  <strong>Description:</strong>
                  <p>{doc.description}</p>
                  {doc.files?.map((file, i) => (
                    <p key={i} className="file-link-wrapper">
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="file-link"
                      >
                        <span role="img" aria-label="PDF" style={{ marginRight: '8px', color: 'red' }}>
                          📄
                        </span>
                        {file.name}
                      </a>
                    </p>
                  ))}
                </div>
              ))
            ) : (
              <p>Yet to be uploaded</p>
            )}
          </>
        );
  case 'Topic of the Day':
        return (
          <>
            <h3>Topic of the Day</h3>
         <div>
           <p><strong>Title: </strong>{eventInfo?.titleOfTheDay || 'No Topic'}</p>
                   <p><strong>Description: </strong>{eventInfo?.description || 'No Description'}</p>
            
                 </div>
             
          </>
        );
      case 'facilitators':
        return (
          <>
            <h3>Facilitators</h3>
            {eventInfo.facilitatorSections?.length > 0 ? (
              eventInfo.facilitatorSections.map((f, idx) => (
                <div key={idx}>
                  <strong>{f.facilitator}</strong>
                  <p>{f.facilitatorDesc}</p>
                </div>
              ))
            ) : (
              <p>No Facilitators Identified</p>
            )}
          </>
        );

      case 'Knowledge Sharing':
        return (
          <>
            <h3>Knowledge Sharing</h3>
            {eventInfo.knowledgeSections?.length > 0 ? (
              eventInfo.knowledgeSections.map((k, idx) => (
                <div key={idx}>
                  <p><strong>Topic:</strong> {k.topic}</p>
                  <p><strong>Name:</strong> {k.name}</p>
                  <p><strong>Description:</strong> {k.description}</p>
                </div>
              ))
            ) : (
              <p>No Knowledge Sharing Session</p>
            )}
          </>
        );

      case 'New energy':
        return (
          <>
            <h3>Prospects Identified</h3>
            {eventInfo.prospectSections?.length > 0 ? (
              eventInfo.prospectSections.map((p, idx) => (
                <div key={idx}>
                      <p><strong>Orbiter's Name: </strong> {p.prospect}</p>
                        <p><strong>Prospect's Name: </strong> {p.prospectName}</p>
                 
                  <p>{p.prospectDescription}</p>
                </div>
              ))
            ) : (
              <p>No New Energies</p>
            )}
          </>
        );

      case 'referrals':
        return (
          <>
            <h3>Referrals</h3>
            {eventInfo.referralSections?.length > 0 ? (
              eventInfo.referralSections.map((r, idx) => (
                <div key={idx}>
                  <p><strong>From: </strong> {r.referralFrom}</p>
                  <p><strong>To: </strong> {r.referralTo}</p>
                  <p><strong>Description:</strong> {r.referralDesc}</p>
                    <p><strong>Status:</strong> {r.status || 'Not specified'}</p>
                </div>
              ))
            ) : (
              <p>No Referrals Identified</p>
            )}
          </>
        );

      case 'requirements':
        return (
          <>
            <h3>Requirements</h3>
            {eventInfo.requirementSections?.length > 0 ? (
              eventInfo.requirementSections.map((req, idx) => (
                <div key={idx}>
                  <p><strong>From:</strong> {req.reqfrom} — {req.reqDescription}</p>
                    
                </div>
                
              ))
            ) : (
              <p>No Requirements Identified</p>
            )}
          </>
        );

      case 'E2A':
  return (
    <>
      <h3>E2A</h3>
      {eventInfo.e2aSections?.length > 0 ? (
        eventInfo.e2aSections.map((e2a, idx) => {
          const formattedDate = new Date(e2a.e2aDate).toLocaleDateString('en-GB');
          return (
            <div key={idx} style={{ border: '1px solid #ccc', marginBottom: '1rem', padding: '1rem' }}>
              <div>
                <p><strong>{e2a.e2a}</strong> {e2a.status ? '✅ Done' : ''}</p>
                <p>{formattedDate}</p>
              </div>
              <p>{e2a.e2aDesc}</p>
            </div>
          );
        })
      ) : (
        <p>No E2A </p>
      )}
    </>
  );


      case 'One to One Interaction':
        return (
          <>
            <h3>One to One Interactions</h3>
            {eventInfo.sections?.length > 0 ? (
              eventInfo.sections.map((s, idx) => {
                const formattedDate = new Date(s.interactionDate).toLocaleDateString('en-GB');
                return (
                  <div key={idx}>
                    <p><strong>Date:</strong> {formattedDate}</p>
                    <p><strong>Participants:</strong> {s.selectedParticipant1} & {s.selectedParticipant2}</p>
                  </div>
                );
              })
            ) : (
              <p>No One to One Interactions</p>
            )}
          </>
        );

      case 'Registrations':
        return (
          <>
            <h3>Registered Users</h3>
            {users?.length > 0 ? (
              <>
                <p>Orbiters Participated: {users.filter(user => user.attendance === 'Yes').length}</p>
                <table className="user-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Attended</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.phone}>
                        <td>{user.name}</td>
                        <td
                          style={{
                            color: user.attendance === 'Yes' ? 'white' : 'black',
                            backgroundColor: user.attendance === 'Yes' ? '#a2cbda' : 'transparent',
                            fontWeight: user.attendance === 'Yes' ? '600' : 'normal',
                            textAlign: 'center',
                          }}
                        >
                          {user.attendance}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            ) : (
              <p>Yet to be uploaded</p>
            )}

          </>
        );
      case 'feedback':
        return (
          <>
            <h3 style={{ marginBottom: '15px' }}>Feedbacks</h3>
            {users && users.length > 0 ? (
              <>
                {users
                  .filter(user => user.feedback && user.feedback.length > 0)
                  .map((user) => (
                    <div
                      key={user.phone}
                    >
                      <strong style={{ fontSize: '16px', color: '#fe6f06' }}>{user.name}</strong>
                      <ul style={{ marginTop: '10px', paddingLeft: '20px', color: '#333' }}>
                        {user.feedback.map((fb, idx) => (
                          <li key={idx} style={{ marginBottom: '5px' }}>{fb.custom}</li>
                        ))}
                      </ul>
                    </div>
                  ))
                }
              </>
            ) : (
              <p>No Feedback</p>
            )}
          </>
        );



      default:
        return <p>Yet to be uploaded</p>;
    }
  };

  useEffect(() => {
    const checkRegistrationStatus = async () => {
      const storedEventId = localStorage.getItem('lastEventId');
      console.log('Current event ID:', id);
      console.log('Stored event ID in localStorage:', storedEventId);
      
      if (!id) {
        console.error('Event ID is missing');
        return;
      }
  
      if (storedEventId !== id) {
        console.log('New event detected, clearing localStorage for userPhoneNumber');
        localStorage.setItem('lastEventId', id); // Store new event ID
      }
  
      // Retrieve user phone number if already set in localStorage
      const userPhoneNumber = localStorage.getItem('mmOrbiter');
      console.log('Retrieved userPhoneNumber from localStorage:', userPhoneNumber);
  
      if (!userPhoneNumber) {
        console.log('No userPhoneNumber found in localStorage.');
        return;
      }
  
      if (storedEventId) {
        try {
          const registeredUserRef = doc(db, COLLECTIONS.monthlyMeeting, id, 'registeredUsers', userPhoneNumber);
          const userDoc = await getDoc(registeredUserRef);
          if (userDoc.exists()) {
            console.log('User is registered for this event:', userDoc.data());
            setIsLoggedIn(true);
            fetchEventDetails();
            fetchRegisteredUserCount();
            fetchUserName(userPhoneNumber);
          } else {
            console.log('User is not registered for this event. Clearing state.');
            setIsLoggedIn(false);
            // setPhoneNumber('');
            localStorage.removeItem('userPhoneNumber'); // Clear if not registered
          }
        } catch (error) {
          console.error('Error checking registration status:', error);
        }
      } else {
        console.log('No stored event ID found.');
      }
      setLoading(false);
    };
  
    checkRegistrationStatus();
  }, [id]);
  
const handleLogout = () => {
  Swal.fire({
    title: 'Are you sure?',
    text: 'You will be logged out.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Yes, Logout',
    cancelButtonText: 'Cancel',
  }).then((result) => {
    if (result.isConfirmed) {
      localStorage.removeItem('mmOrbiter');
      window.location.reload(); // or navigate to login
    }
  });
};



 const handleLogin = async (e) => {
  e.preventDefault();

  try {
    // 🔥 Search userdetails using MobileNo field
    const q = query(
      collection(db, COLLECTIONS.userDetail),
      where("MobileNo", "==", phoneNumber)
    );

    const snap = await getDocs(q);

    if (!snap.empty) {
      // User found
      localStorage.setItem("mmOrbiter", phoneNumber);
      setIsLoggedIn(true);

      await registerUserForEvent(phoneNumber);
      fetchEventDetails();
      fetchRegisteredUserCount();
      fetchUserName(phoneNumber); 
    } else {
      setError("Phone number not registered.");
    }

  } catch (err) {
    console.error("Error during login:", err);
    setError("Login failed. Please try again.");
  }
};

 
  
  const registerUserForEvent = async (phoneNumber) => {
    if (!id) return;
  
    const registeredUsersRef = collection(db, COLLECTIONS.monthlyMeeting, id, 'registeredUsers');
    const newUserRef = doc(registeredUsersRef, phoneNumber);
  
    try {
      const userDoc = await getDoc(newUserRef);
  
      if (userDoc.exists()) {
        // Update existing document
        await updateDoc(newUserRef, {
          register: true,
          updatedAt: new Date()
        });
      } else {
        // Create new document
        await setDoc(newUserRef, {
          phoneNumber: phoneNumber,
          registeredAt: new Date(),
          register: true
        });
      }
  
      // Optionally send WhatsApp message
      // sendWhatsAppMessage(phoneNumber);
  
    } catch (err) {
      console.error('Error registering/updating user in Firebase:', err);
    }
  };
  
  const sendWhatsAppMessage = async (phoneNumber) => {
    const accessToken = "EAAHwbR1fvgsBOwUInBvR1SGmVLSZCpDZAkn9aZCDJYaT0h5cwyiLyIq7BnKmXAgNs0ZCC8C33UzhGWTlwhUarfbcVoBdkc1bhuxZBXvroCHiXNwZCZBVxXlZBdinVoVnTB7IC1OYS4lhNEQprXm5l0XZAICVYISvkfwTEju6kV4Aqzt4lPpN8D3FD7eIWXDhnA4SG6QZDZD"; // Replace with your Meta API token
    const phoneId = "527476310441806";  // Found in Meta Developer Console
  
    const messageData = {
      messaging_product: "whatsapp",
      to: phoneNumber,
      type: "template",
      template: {
        name: "mm_thankyoumessage",
        language: { code: "en" } // Template is in English-Hindi mix
      }
    };
  
    try {
      const response = await axios.post(
        `https://graph.facebook.com/v21.0/${phoneId}/messages`,
        messageData,
        {
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          }
        }
      );
      console.log("WhatsApp template message sent:", response.data);
    } catch (error) {
      console.error("Error sending WhatsApp template message:", error);
    }
  };

useEffect(() => {
  const storedPhone = localStorage.getItem('mmOrbiter');
  if (storedPhone) {
    setPhoneNumber(storedPhone);
  }
}, []);

  // Fetch event details from Firestore
  const fetchEventDetails = async () => {
    if (id) {
      const eventRef = doc(db, COLLECTIONS.monthlyMeeting, id);
      const eventDoc = await getDoc(eventRef);
      if (eventDoc.exists()) {
        setEventDetails(eventDoc.data());
      } else {
        setError('No event found.');
      }
      setLoading(false);
    }
  };

  // Fetch the count of registered users from Firestore
  const fetchRegisteredUserCount = async () => {
    if (id) {
      const registeredUsersRef = collection(db, COLLECTIONS.monthlyMeeting, id, 'registeredUsers');
      const userSnapshot = await getDocs(registeredUsersRef);
      setRegisteredUserCount(userSnapshot.size);
    }
  };

  // Modal handlers
  const handleOpenModal = () => {
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  if (!isLoggedIn) {
    return (
      <div className='mainContainer'>
        <div className='logosContainer'>
          <img src="/ujustlogo.png" alt="Logo" className="logo" />
        </div>
        <div className="signin">
          <div className="loginInput">
            <div className='logoContainer'>
              <img src="/logo.png" alt="Logo" className="logos" />
            </div>
            <form onSubmit={handleLogin}>
              <ul>
                <li>
               <input
  type="text"
  placeholder="Enter your phone number"
  value={phoneNumber}
  onChange={(e) => setPhoneNumber(e.target.value)}
/>

                </li>
                <li>
                  <button className="login" type="submit">Register</button>
                </li>
              </ul>
            </form>
          </div>
          {error && <p style={{ color: 'red' }}>{error}</p>}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="loader-container">
        <svg className="load" viewBox="25 25 50 50">
          <circle r="20" cy="50" cx="50"></circle>
        </svg>
      </div>
    );
  }

  if (error) {
    return <p style={{ color: 'red' }}>{error}</p>;
  }


  return (
      <>
      <main className="pageContainer">
        <header className='Main m-Header'>
          <section className='container'>
            <div className='innerLogo'>
              <img src="/ujustlogo.png" alt="Logo" className="logo" />
            </div>

            <div className='headerRight'>
       
         
                 <div className="userName" onClick={handleLogout} style={{ cursor: 'pointer' }}>
  <span>{getInitials(userName)}</span>
</div>

            </div>





          </section>
        </header>
        <section className='p-meetingDetails'>
          <div className='container pageHeading'>

            <div className="event-container">
              {/* Event image and countdown */}
              <div className="event-header">
<img
  src={
    eventInfo?.imageUploads?.find(item => item.type === "Banner")?.image?.url || "/creative.jpg"
  }
  alt="Event Banner"
  className="event-image"
/>


                {timeLeft ? (
                  <div className="timer">
                    {timeLeft.days > 0 ? (
                      <>
                        <div className="time">
                          {timeLeft.days}d : {String(timeLeft.hours).padStart(2, '0')}h : {String(timeLeft.minutes).padStart(2, '0')}m
                        </div>

                      </>
                    ) : (
                      <>
                        <div className="time">
                          {String(timeLeft.hours).padStart(2, '0')} : {String(timeLeft.minutes).padStart(2, '0')} : {String(timeLeft.seconds).padStart(2, '0')}
                        </div>

                      </>
                    )}
                  </div>
                ) : (
                  <div className="countdown">
                    <div className="meeting-done">Meeting Done</div>
                  </div>
                )}


              </div>

              {/* Event info */}
              <div className="event-content">
                <div className='sectionHeading'>
                  <h2 className="event-title">{eventInfo?.Eventname || 'Event Details'}</h2>


                  {/* <p className="organizer">Organized by Malia Steav</p> */}
             <p className="event-date">
  {eventInfo?.time
    ? new Date(eventInfo.time.seconds * 1000).toLocaleString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    : 'Event'}
</p>

                </div>


                {/* <p className="location-name">minuit.agency</p> */}
                <div className="avatar-container">
                  <div className="avatars">
                    {users.slice(0, 8).map((user, index) => (
                      <div key={user.phone} className="avatar">
                        {getInitials(user.name)}
                      </div>
                    ))}
                    {users.length > 8 && (
                      <div className="more">+{users.length - 8}</div>
                    )}
                  </div>
                  <div className='registeredusers'>
                    <div className="info">
                      <span>{users.length} Orbiters</span> have registered
                    </div>


                    <div className="see-all" onClick={() => setActiveTab("Registration")}>
                      See all
                    </div>
                  </div>
                </div>
                <div className='eventinnerContent'>
                  <div className="tabs">
                    {[
                      'agenda', 'Registrations','facilitators', 'Knowledge Sharing',
                      'New energy', 'Topic of the Day','referrals','One to One Interaction', 'requirements','E2A' ,'MoM','feedback'
                    ].map(tab => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`tab ${activeTab === tab ? "active" : ""}`}
                      >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                      </button>
                    ))}
                  </div>

                  <div className="tab-contents">
                    {renderTabContent()}
                  </div>
                </div>
              </div>
<HeaderNav/>

            </div>
          </div>
        </section>
      </main>
    </>
  );
};

export default EventLoginPage;
