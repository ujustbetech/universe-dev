import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  getDocs
} from 'firebase/firestore';
import '/pages/events/frontend.css';
import { app } from '../../firebaseConfig';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilePdf } from '@fortawesome/free-solid-svg-icons';
import { COLLECTIONS } from "/utility_collection";

const db = getFirestore(app);

export default function EventDetailsPage() {
  const router = useRouter();
  const { eventId } = router.query;
  const [userName, setUserName] = useState('');
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
    if (!eventId) return;

    const fetchEventData = async () => {
      try {
        const eventDocRef = doc(db, COLLECTIONS.monthlyMeeting, eventId);
        const eventSnap = await getDoc(eventDocRef);
        if (eventSnap.exists()) {
          setEventInfo(eventSnap.data());
        }

        const registeredUsersRef = collection(db, `${COLLECTIONS.monthlyMeeting}/${eventId}/registeredUsers`);
        const regUsersSnap = await getDocs(registeredUsersRef);

        const userDetails = await Promise.all(
          regUsersSnap.docs.map(async (docSnap) => {
            const phone = docSnap.id;
            const regUserData = docSnap.data();
            const userDoc = await getDoc(doc(db, 'userdetails', phone));
            const name = userDoc.exists() ? userDoc.data()[" Name"] : 'Unknown';

            return {
              phone,
              name,
              attendance: regUserData.attendanceStatus === true ? 'Yes' : 'No',
            };
          })
        );

        setUsers(userDetails);
      } catch (err) {
        console.error('Error fetching event/user data:', err);
      }
    };

    fetchEventData();
  }, [eventId]);

  const getInitials = (name) => {
    return name
      .split(" ")
      .map(word => word[0])
      .join("");
  };

  useEffect(() => {
    const storedPhoneNumber = localStorage.getItem('ntnumber');
    fetchUserName(storedPhoneNumber);
  }, []);

  const fetchUserName = async (phoneNumber) => {
    const userRef = doc(db, 'NTMember', phoneNumber);
    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) {
      setUserName(userDoc.data().name);
    }
  };

  const renderTabContent = () => {
    if (!eventInfo) return <p>Loading...</p>;

    switch (activeTab) {
      case 'agenda':
        return (
          <>
            <h3>Agenda</h3>
            <ul>
              {eventInfo.agenda?.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </>
        );

      case 'documents':
        return (
          <>
            <h3>Document Uploads</h3>
            {eventInfo.documentUploads?.map((doc, idx) => (
             <div key={idx} className="document-item">
  <strong>Description:</strong>
  <p>{doc.description}</p>
  {doc.files?.map((file, i) => (
    <p key={i}>
      <FontAwesomeIcon icon={faFilePdf} className="pdf-icon" />
      <a href={file.url} target="_blank" rel="noopener noreferrer" className="file-link">
        {file.name}
      </a>
    </p>
  ))}
</div>

            ))}
          </>
        );

      case 'facilitators':
        return (
          <>
            <h3>Facilitators</h3>
            {eventInfo.facilitatorSections?.map((f, idx) => (
              <div key={idx}>
                <strong>{f.facilitator}</strong>
                <p>{f.facilitatorDesc}</p>
              </div>
            ))}
          </>
        );

      case 'knowledge':
        return (
          <>
            <h3>Knowledge Sections</h3>
            {eventInfo.knowledgeSections?.map((k, idx) => (
              <div key={idx}>
                <p><strong>Topic:</strong> {k.topic}</p>
                <p><strong>Name:</strong> {k.name}</p>
                <p><strong>Description:</strong> {k.description}</p>
              </div>
            ))}
          </>
        );

      case 'prospects':
        return (
          <>
            <h3>Prospects</h3>
            {eventInfo.prospectSections?.map((p, idx) => (
              <div key={idx}>
                <strong>{p.prospect}</strong> ({p.prospectName}):
                <p> {p.prospectDescription}</p>
              </div>
            ))}
          </>
        );

      case 'referrals':
        return (
          <>
            <h3>Referrals</h3>
            {eventInfo.referralSections?.map((r, idx) => (
              <div key={idx}>
                <p><strong>From: </strong> {r.referralFrom} </p>
               <p><strong>To: </strong> {r.referralTo}</p> 
                <p><strong>Description:</strong> {r.referralDesc}</p>
              </div>
            ))}
          </>
        );

      case 'requirements':
        return (
          <>
            <h3>Requirements</h3>
            {eventInfo.requirementSections?.map((req, idx) => (
              <div key={idx}>
                <p><strong>From:</strong> {req.reqfrom} — {req.reqDescription}</p>
              </div>
            ))}
          </>
        );

     case 'e2a':
  return (
    <>
      <h3>E2A</h3>
      {eventInfo.e2aSections?.map((e2a, idx) => {
        const formattedDate = new Date(e2a.e2aDate).toLocaleDateString('en-GB'); // DD/MM/YYYY
        return (
          <div key={idx}>
            <p><strong>Name:</strong> {e2a.e2a}</p>
            <p><strong>Date:</strong> {formattedDate}</p>
            <p><strong>Description:</strong> {e2a.e2aDesc}</p>
          </div>
        );
      })}
    </>
  );

case '121':
  return (
    <>
      <h3>One to One</h3>
      {eventInfo.sections?.map((s, idx) => {
        const formattedDate = new Date(s.interactionDate).toLocaleDateString('en-GB'); // DD/MM/YYYY
        return (
          <div key={idx}>
            <p><strong>Date:</strong> {formattedDate}</p>
            <p><strong>Participants:</strong> {s.selectedParticipant1} & {s.selectedParticipant2}</p>
          </div>
        );
      })}
    </>
  );


      case 'users':
        return (
          <>
            <h3>Registered Users</h3>
            {users.length === 0 ? (
              <p>No users registered.</p>
            ) : (
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
        <td>{user.attendance}</td>
      </tr>
    ))}
  </tbody>
</table>

            )}
          </>
        );

      default:
        return null;
    }
  };

  return (
    <>
 <div className="event-container">
      {/* Event image and countdown */}
      <div className="event-header">
        <img src="/space.jpeg" alt="Event" className="event-image" />
        {timeLeft && (
  <div className="countdown">
    {timeLeft.days > 0 ? (
      <>
        <div className="time">
          {timeLeft.days}d : {String(timeLeft.hours).padStart(2, '0')}h : {String(timeLeft.minutes).padStart(2, '0')}m
        </div>
        <div className="labels">DAYS HOURS MINUTES</div>
      </>
    ) : (
      <>
        <div className="time">
          {String(timeLeft.hours).padStart(2, '0')} : {String(timeLeft.minutes).padStart(2, '0')} : {String(timeLeft.seconds).padStart(2, '0')}
        </div>
        <div className="labels">HOURS MINUTES SECONDS</div>
      </>
    )}
  </div>
)}

      </div>

      {/* Event info */}
      <div className="event-content">
        <h2 className="event-title">{eventInfo?.Eventname || 'Event Details'}</h2>
      

        {/* <p className="organizer">Organized by Malia Steav</p> */}
        <p className="event-date">
  {eventInfo?.time ? new Date(eventInfo.time.seconds * 1000).toLocaleString() : 'Event'}
</p>

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
    <span>{users.length}</span> people are joining
  </div>


 <div className="see-all" onClick={() => setActiveTab("users")}>
  See all
</div>
</div>
</div>
        <div className="tabs">
              {[
                'agenda', 'documents', 'facilitators', 'knowledge',
                'prospects', 'referrals', 'requirements', 'e2a', '121', 'users'
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

            <div className="tab-content">
              {renderTabContent()}
            </div>
          </div>
        {/* Tabs */}
      

        {/* Tab content */}
        
      </div>
  
    </>
  );
}
