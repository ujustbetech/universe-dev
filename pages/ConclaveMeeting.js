import React, { useEffect, useState } from 'react';
import { getFirestore, collection, getDocs,doc,getDoc } from 'firebase/firestore';
import { app } from '../firebaseConfig'; 
import '../src/app/styles/user.scss';
//import '/pages/events/event.scss'; // Ensure your CSS file is correctly linked
import { useRouter } from 'next/router';
import Link from 'next/link'
import HeaderNav from '../component/HeaderNav';
import Headertop from '../component/Header';
const db = getFirestore(app);

const AllEvents = () => {
  const [events, setEvents] = useState([]);
   const [userName, setUserName] = useState('');
     const [phoneNumber, setPhoneNumber] = useState('');
   const router = useRouter();
    const [cpPoints, setCPPoints] = useState(0);
const [leaderNames, setLeaderNames] = useState({});
 const [users, setUsers] = useState([]);

  useEffect(() => {
 
const fetchAllConclaves = async () => {
  try {
    const conclaveSnapshot = await getDocs(collection(db, 'Conclaves'));

    const conclaveList = conclaveSnapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        orbiterCount: data.orbiters?.length || 0,
        ntMemberCount: data.ntMembers?.length || 0,
      };
    });

    setEvents(conclaveList);

    // Fetch all leader names
    const namesMap = {};
    for (const conclave of conclaveList) {
      if (conclave.leader && !namesMap[conclave.leader]) {
        const name = await fetchUserNameReturn(conclave.leader);
        namesMap[conclave.leader] = name;
      }
    }
    setLeaderNames(namesMap);

  } catch (error) {
    console.error('Error fetching conclaves:', error);
  }
};



  fetchAllConclaves();
}, []);
const fetchUserNameReturn = async (phoneNumber) => {
  if (!phoneNumber || typeof phoneNumber !== 'string' || phoneNumber.trim() === '') {
    console.error("Invalid phone number:", phoneNumber);
    return 'N/A';
  }

  try {
    const userRef = doc(db, 'userdetails', phoneNumber);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      return userDoc.data()[" Name"] || 'User';
    } else {
      return 'User';
    }
  } catch (err) {
    console.error("Error fetching user name:", err);
    return 'User';
  }
};
const formatDate = (date) => {
  const d = new Date(date);
  if (isNaN(d)) return 'Invalid Date';

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
  const year = d.getFullYear();

  return `${day}/${month}/${year}`;
};
 
 const getInitials = (name) => {
    return name
      .split(" ") // Split the name into words
      .map(word => word[0]) // Get the first letter of each word
      .join(""); // Join them together
  };
useEffect(() => {
  const storedPhoneNumber = localStorage.getItem('mmOrbiter');
  if (storedPhoneNumber) {
    fetchUserName(storedPhoneNumber);
    setPhoneNumber(storedPhoneNumber);
  } else {
    console.error("Phone number not found in localStorage.");
  }
}, []);

  
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


const sortedEvents = [...events].sort((a, b) => {
  const dateA = a.time?.toDate?.() || new Date(0);
  const dateB = b.time?.toDate?.() || new Date(0);
  return dateB - dateA; // latest first
});
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
      window.location.href = "/"; // redirect to home
    }
  });
};
  
  
  return (
    <>
    <main className="pageContainer">
   <Headertop/>
      <section className='dashBoardMain'>
     <div className='sectionHeadings'>
          <h2>Conclave Meetings</h2> 
         </div>
 <div className='container eventList'>
  {events.map((conclave, index) => {
    return (
      <Link href={`/Conclave/${conclave.id}`} key={index} className="meetingBoxLink">
        <div className='meetingBox'>
     
            {/* <span className="meetingLable3">
              Initiation: {conclave.initiationDate || 'N/A'}
            </span> */}
         <span className="meetingLable">
  Start: {conclave.startDate ? formatDate(conclave.startDate) : 'N/A'}
</span>

        

          <div className='meetingDetails'>
       
  <h3 className="eventName">{conclave.conclaveStream || 'No Stream'}</h3>

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
      <span>{conclave.orbiterCount} Orbiters</span> have registered
    </div>
    
  </div>
</div>
<p><strong>Host Name:</strong> {leaderNames[conclave.leader] || 'Loading...'}</p>

          </div>

          <div className='meetingBoxFooter'>
            <div className='viewDetails'>
              <Link href={`/Conclave/${conclave.id}`}>View Details</Link>
            </div>
          </div>
        </div>
      </Link>
    );
  })}
</div>



    <HeaderNav/>
    </section>
    </main>
    </>
  );
};

export default AllEvents;
