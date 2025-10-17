import React, { useEffect, useState } from 'react';
import { getFirestore, collection, getDocs,doc,getDoc } from 'firebase/firestore';
import { app } from '../firebaseConfig'; 
import '/pages/events/event.css'; 

import { useRouter } from 'next/router';
import Link from 'next/link'
const db = getFirestore(app);

const AllEvents = () => {
  const [events, setEvents] = useState([]);
   const [userName, setUserName] = useState('');
   const router = useRouter();
  useEffect(() => {
    const fetchAllEvents = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'MonthlyMeeting'));
        const eventList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setEvents(eventList);
      } catch (error) {
        console.error('Error fetching events:', error);
      }
    };

    fetchAllEvents();
  }, []);
 const getInitials = (name) => {
    return name
      .split(" ") // Split the name into words
      .map(word => word[0]) // Get the first letter of each word
      .join(""); // Join them together
  };
  useEffect(() => {
    const storedPhoneNumber = localStorage.getItem('ntnumber');
    fetchUserName(storedPhoneNumber);
    // setPhoneNumber(storedPhoneNumber)
   
  }, []);
  

  const fetchUserName = async (phoneNumber) => {
    console.log("Fetch User from NTMember", phoneNumber);
    const userRef = doc(db, 'NTMember', phoneNumber);
    const userDoc = await getDoc(userRef);

    console.log("Check Details", userDoc.data());

    if (userDoc.exists()) {
      const orbitername = userDoc.data().name; // Access the Name field with the space
      const mobileNumber = userDoc.data().phoneNumber; // Access the Name field with the space
      setUserName(orbitername);
      // setPhoneNumber(mobileNumber);
      // registerUserForEvent(phoneNumber, orbitername);
    }

    else {
      console.log("user not found");

      // setError('User not found.');
    }
  };
  
  
  return (
    <>
    <main className="pageContainer">
      <header className='Main m-Header'>
        <section className='container'>
          <div className='innerLogo' onClick={() => router.push('/')}>
            <img src="/ujustlogo.png" alt="Logo" className="logo" />
          </div>
          <div>
            <div className='userName'> {userName || 'User'} <span>{getInitials(userName)}</span> </div>
          </div>
        </section>
      </header>
      <section className='dashBoardMain'>
        <div className='container pageHeading'>
  
      <h1>All Monthly Meetings Details</h1>
      <div className='container eventList'>
        {events.map((event, index) => (
          <div className='meetingBox' key={index}>
             <div className="suggestionDetails">
             <span className='meetingLable3'>2 days left </span>
             <span className='suggestionTime'> {event.time?.toDate?.().toLocaleString?.() || 'N/A'}</span>
                </div>
                <div className='meetingDetails'>
                <h3 className="eventName">{event.Eventname || 'N/A'}</h3>

                    </div>
                  
                    <div className='meetingBoxFooter'>
                         <div className='viewDetails'>
                                          <Link href={`/MonthlyMeeting/${event.id}`}>View Details</Link>
                                          {/* <a href=''>View Details</a> */}
                                        </div>
                      </div>
                   
{/*          
            <p><strong>Zoom Link:</strong> <a href={event.zoomLink} target="_blank" rel="noreferrer">{event.zoomLink}</a></p> */}
          </div>
        ))}
      </div>
    </div>
    </section>
    </main>
    </>
  );
};

export default AllEvents;
