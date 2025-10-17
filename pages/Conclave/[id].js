import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { getFirestore, doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { app } from '../../firebaseConfig';
import Link from 'next/link';
import '../../src/app/styles/user.scss';
import HeaderNav from '../../component/HeaderNav';
import Headertop from '../../component/Header';

const db = getFirestore(app);

const ConclaveDetails = () => {
  const router = useRouter();
  const { id } = router.query;
    const [phoneNumber, setPhoneNumber] = useState('');
const { id: conclaveId } = router.query; // Use `id` as `conclaveId`
  const [conclave, setConclave] = useState(null);
  const [meetings, setMeetings] = useState([]);
    const [cpPoints, setCPPoints] = useState(0);
      const [userName, setUserName] = useState('');
  useEffect(() => {
    if (id) {
      fetchConclave();
      fetchMeetings();
    }
  }, [id]);

  const fetchConclave = async () => {
    try {
      const conclaveRef = doc(db, 'Conclaves', id);
      const conclaveSnap = await getDoc(conclaveRef);
      if (conclaveSnap.exists()) {
        setConclave(conclaveSnap.data());
      }
    } catch (err) {
      console.error('Error fetching conclave:', err);
    }
  };
  const fetchMeetings = async () => {
    try {
      const meetingsRef = collection(db, 'Conclaves', id, 'meetings');
      const meetingsSnap = await getDocs(meetingsRef);
      const list = meetingsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMeetings(list);
    } catch (err) {
      console.error('Error fetching meetings:', err);
    }
  };
useEffect(() => {
  if (!phoneNumber) return; // 👈 important check

  const fetchCP = async () => {
    try {
      const activitiesRef = collection(db, "Orbiters", phoneNumber, "activities");
      const activitiesSnapshot = await getDocs(activitiesRef);

      let totalCP = 0;

      activitiesSnapshot.forEach((doc) => {
        const data = doc.data();
        totalCP += Number(data?.points) || 0;
      });

      setCPPoints(totalCP);
    } catch (error) {
      console.error("Error fetching CP points:", error);
    }
  };

  fetchCP();
}, [phoneNumber]);


const fetchUserName = async (phoneNumber) => {
  if (!phoneNumber || typeof phoneNumber !== 'string' || phoneNumber.trim() === '') {
    console.error("Invalid phone number:", phoneNumber);
    return;
  }

  console.log("Fetch User from Userdetails", phoneNumber);
  try {
    const userRef = doc(db, 'userdetails', phoneNumber);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      const orbitername = userDoc.data()[" Name"] || 'User';
      setUserName(orbitername);
    } else {
      console.log("User not found in userdetails");
    }
  } catch (err) {
    console.error("Error fetching user name:", err);
  }
};
  return (
     <main className="pageContainer">
      <Headertop/>
     
     <section className='dashBoardMain'>
        <div className='sectionHeadings'>
          <h2>{conclave?.conclaveStream || 'Conclave'} Meetings</h2>
        </div>
  <div className="container eventList">
       {meetings.map((meeting, index) => {
  const date = meeting.datetime?.seconds
    ? new Date(meeting.datetime.seconds * 1000)
    : null;

  return (
    <div className="meetingBox" key={index}>
        <span className="meetingLable">
 {date?.toLocaleDateString('en-IN')} {date?.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
</span>
      <div className="meetingDetails">
        <div className="eventDetails">
        <h3>{meeting.meetingName || 'Untitled Meeting'}</h3>
   
    
      <p>
  <strong>Mode:</strong>{' '}
  <span>{meeting.mode?.charAt(0).toUpperCase() + meeting.mode?.slice(1).toLowerCase()}</span>
</p>

{meeting.mode === 'online' && (
  <p>
    <strong>Zoom Link:</strong>{' '}
    <a href={meeting.link} target="_blank" rel="noopener noreferrer">
      {meeting.link}
    </a>
  </p>
)}

{meeting.mode === 'offline' && (
  <p>
    <strong>Venue:</strong>{' '}
    <span>{meeting.venue?.charAt(0).toUpperCase() + meeting.venue?.slice(1).toLowerCase()}</span>
  </p>
)}

        </div>
      </div>
 
    <div className="meetingBoxFooter">
  <div className="viewDetails">
    <Link
      href={`/meeting/${meeting.id}`}
      onClick={() => localStorage.setItem('conclaveId', conclaveId)}
  
    >
      View Details
    </Link>
  </div>
</div>

    </div>
  );
})}

        </div>



 <HeaderNav/>
    </section>
    </main>
 
  );
};

export default ConclaveDetails;
