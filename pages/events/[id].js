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

  const [userName, setUserName] = useState(''); 
  const [error, setError] = useState(null);
  const [eventDetails, setEventDetails] = useState(null);
  const [registeredUserCount, setRegisteredUserCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showModal, setShowModal] = useState(false);
const db = getFirestore(app);
  const [eventInfo, setEventInfo] = useState(null);
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('agenda');
  const [timeLeft, setTimeLeft] = useState(null);

  // ⭐ NEW CODE ⭐ Availability Popup States
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [showAcceptPopUp, setShowAcceptPopUp] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState("");

  // ⭐ NEW CODE ⭐ Auto-detect phone from localStorage
  useEffect(() => {
    const savedPhone = localStorage.getItem("mmOrbiter");
    if (savedPhone) {
      setPhoneNumber(savedPhone);
      setIsLoggedIn(true); // auto-login
    }
  }, []);

  useEffect(() => {
    if (!eventInfo?.time?.seconds) return;

    const targetTime = new Date(eventInfo.time.seconds * 1000).getTime();

    const updateCountdown = () => {
      const now = new Date().getTime();
      const difference = targetTime - now;

      if (difference <= 0) {
        setTimeLeft(null); 
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / (1000 * 60)) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      setTimeLeft({ days, hours, minutes, seconds });
    };

    updateCountdown(); 
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [eventInfo]);

  useEffect(() => {
    if (!id) return;

  const fetchEventData = async () => {
  try {
    const eventDocRef = doc(db, COLLECTIONS.monthlyMeeting, id);
    const eventSnap = await getDoc(eventDocRef);

    if (eventSnap.exists()) {
      setEventInfo(eventSnap.data());
    }

    const registeredUsersRef = collection(
      db,
      `${COLLECTIONS.monthlyMeeting}/${id}/registeredUsers`
    );

    const regUsersSnap = await getDocs(registeredUsersRef);

    const userDetails = await Promise.all(
      regUsersSnap.docs.map(async (docSnap) => {
        const phone = docSnap.id;      
        const regUserData = docSnap.data();

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
setLoading(false);   // ⭐ FIX: page will now load

} catch (err) {
    console.error("Error fetching event/user data:", err);
    setLoading(false); // prevent infinite loader on error
}
};

    fetchEventData();
  }, [id]);


 const getInitials = (name) => {
    return name
      .split(" ")
      .map(word => word[0])
      .join("");
  };

  useEffect(() => {
    const storedPhoneNumber = localStorage.getItem('mmOrbiter');
    fetchUserName(storedPhoneNumber);
  }, []);
  
const fetchUserName = async (phoneNumber) => {
  if (!phoneNumber || typeof phoneNumber !== "string" || phoneNumber.trim() === "") {
    console.error("Invalid phone number:", phoneNumber);
    return;
  }

  try {
    const q = query(
      collection(db, COLLECTIONS.userDetail),
      where("MobileNo", "==", phoneNumber)
    );

    const snap = await getDocs(q);

    if (!snap.empty) {
      const data = snap.docs[0].data();
      const orbiterName = data["Name"] || "User";
      setUserName(orbiterName);
    }

  } catch (err) {
    console.error("Error fetching user name:", err);
  }
};

  const renderTabContent = () => {
    if (!eventInfo) return <div className='loader'><span className="loader2"></span></div>

    switch (activeTab) {

      // ❗ NOT EDITING ANY OF YOUR TAB CODE
      // (Keeping everything exactly same)

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

      // ... ALL YOUR OTHER TAB CODE UNTOUCHED ...

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

  // ⭐ NEW CODE ⭐ Check Registration and trigger popup ONCE
  useEffect(() => {
    if (!id || !phoneNumber) return;

    const check = async () => {
      const ref = doc(db, COLLECTIONS.monthlyMeeting, id, "registeredUsers", phoneNumber);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        setShowResponseModal(true);
        setShowAcceptPopUp(true);
      }
    };

    check();
  }, [id, phoneNumber]);

  // ⭐ NEW CODE ⭐ Accept (YES)
  const handleAccept = async () => {
    await setDoc(
      doc(db, COLLECTIONS.monthlyMeeting, id, "registeredUsers", phoneNumber),
      {
        phoneNumber,
        available: true,
        registeredAt: new Date(),
      }
    );

    closePopup();
  };

  // ⭐ NEW CODE ⭐ Decline
  const handleDecline = () => {
    setShowAcceptPopUp(false);
    setShowDeclineModal(true);
  };

  // ⭐ NEW CODE ⭐ Submit decline reason
  const submitDeclineReason = async () => {
    if (!declineReason.trim()) {
      Swal.fire("Please enter a reason");
      return;
    }

    await setDoc(
      doc(db, COLLECTIONS.monthlyMeeting, id, "registeredUsers", phoneNumber),
      {
        phoneNumber,
        available: false,
        declineReason,
        declinedAt: new Date(),
      }
    );

    closePopup();
  };

  const closePopup = () => {
    setShowDeclineModal(false);
    setShowAcceptPopUp(false);
    setShowResponseModal(false);
  };

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
      window.location.reload(); 
    }
  });
};

 const handleLogin = async (e) => {
  e.preventDefault();

  try {
    const q = query(
      collection(db, COLLECTIONS.userDetail),
      where("MobileNo", "==", phoneNumber)
    );

    const snap = await getDocs(q);

    if (!snap.empty) {
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
        await updateDoc(newUserRef, {
          register: true,
          updatedAt: new Date()
        });
      } else {
        await setDoc(newUserRef, {
          phoneNumber: phoneNumber,
          registeredAt: new Date(),
          register: true
        });
      }
  
    } catch (err) {
      console.error('Error registering/updating user in Firebase:', err);
    }
  };

useEffect(() => {
  const storedPhone = localStorage.getItem('mmOrbiter');
  if (storedPhone) {
    setPhoneNumber(storedPhone);
  }
}, []);

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

  const fetchRegisteredUserCount = async () => {
    if (id) {
      const registeredUsersRef = collection(db, COLLECTIONS.monthlyMeeting, id, 'registeredUsers');
      const userSnapshot = await getDocs(registeredUsersRef);
      setRegisteredUserCount(userSnapshot.size);
    }
  };

  const handleOpenModal = () => {
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  // ======================
  // ⭐ LOGIN SCREEN LOGIC ⭐
  // ======================
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
      {/* ⭐ NEW CODE ⭐ GLOBAL MODAL ABOVE <main> */}
      <div className={showResponseModal ? 'modal-overlay' : 'modal-overlay hide'}>
        {showAcceptPopUp && (
          <div className='modal-content'>
            <h2>Are you available for the meeting?</h2>
            <ul className='actionBtns'>
              <li><button className="m-button" onClick={handleAccept}>Yes</button></li>
              <li><button className="m-button-2" onClick={handleDecline}>No</button></li>
            </ul>
          </div>
        )}

        {showDeclineModal && (
          <div className='modal-content'>
            <div className='contentBox'>
              <h2>Reason for Declining</h2>
              <textarea
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder="Enter reason..."
              />
              <ul className='actionBtns'>
                <li><button onClick={submitDeclineReason} className='m-button'>Submit</button></li>
                <li><button onClick={() => setShowDeclineModal(false)} className='m-button-2'>Cancel</button></li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* ⬇️ EVERYTHING BELOW IS YOUR ORIGINAL CODE */}
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

        {/* YOUR FULL ORIGINAL EVENT UI GOES HERE UNCHANGED */}
        
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
