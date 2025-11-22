import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { db } from '../firebaseConfig';
import { doc, getDoc, collection, getDocs, setDoc } from 'firebase/firestore';
import Headertop from '../component/Header';
import AllServicesProducts from './AllServicesProducts';
import SummaryCard from '../component/SummaryCard';
import MeetingCard from '../component/MeetingCard';
import HeaderNav from '../component/HeaderNav';
import '../src/app/styles/user.scss';
import { COLLECTIONS } from "/utility_collection";

const HomePage = () => {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [userName, setUserName] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [ntMeetCount, setNtMeetCount] = useState(0);
  const [monthlyMetCount, setMonthlyMetCount] = useState(0);

  const [upcomingMonthlyMeet, setUpcomingMonthlyMeet] = useState(null);
  const [upcomingNTMeet, setUpcomingNTMeet] = useState(null);

// ✅ Fetch user info after reload
useEffect(() => {
  const storedUjb = localStorage.getItem('mmUJBCode');
  const storedPhone = localStorage.getItem('mmOrbiter');
  const storedName = localStorage.getItem('nameOrbiter');

  if (storedUjb && storedPhone) {
    setPhoneNumber(storedPhone);
    setUserName(storedName || 'User'); // ✅ USE LOCALSTORAGE FIRST
    setIsLoggedIn(true);

    if (!storedName) {
      fetchUserName(storedUjb); // only if name missing
    }
  }
  setLoading(false);
}, []);


// ✅ Fetch data using UJBCode as Doc ID
const fetchUserName = async (ujbCode) => {
  try {
    const userRef = doc(db, COLLECTIONS.userDetail, ujbCode);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      const data = userDoc.data();

      const firestoreName =
        data["Name"] ||
        data["name"] ||
        data[" FullName"] ||
        data["FullName"];

      const existingName = localStorage.getItem("nameOrbiter");

      const finalName = firestoreName || existingName || "User";

      setUserName(finalName);
      localStorage.setItem("nameOrbiter", finalName);

      return finalName;
    }
    return localStorage.getItem("nameOrbiter") || 'User';
  } catch (err) {
    console.error(err);
    return localStorage.getItem("nameOrbiter") || 'User';
  }
};

// ✅ Login → Fetch UJB from matching phone → then login
const handleLogin = async (e) => {
  e.preventDefault();
  try {
    const usersSnapshot = await getDocs(collection(db, COLLECTIONS.userDetail));
    let matchedDoc = null;

    usersSnapshot.forEach(doc => {
      const data = doc.data();
      if (data["MobileNo"] === phoneNumber) {
        matchedDoc = { id: doc.id, ...data };
      }
    });

    if (matchedDoc) {
      const fetchedName = matchedDoc["Name"] || matchedDoc[" Name"] || 'User';
      const fetchedUJBCode = matchedDoc.id; // ✅ Doc ID

      // ✅ Store in localStorage
      localStorage.setItem('mmOrbiter', phoneNumber);
      localStorage.setItem('mmUJBCode', fetchedUJBCode);

      setUserName(fetchedName);
      setIsLoggedIn(true);

      logUserLogin(phoneNumber, fetchedName);
    } else {
      setError("You are not an Orbiter.");
    }

  } catch (err) {
    console.error(err);
    setError("Login failed. Please try again.");
  }
};

  

  // ✅ Fetch upcoming events and counts
  useEffect(() => {
    const fetchData = async () => {
      const now = new Date();

      // Monthly Meetings
      const monthlySnapshot = await getDocs(collection(db, COLLECTIONS.monthlyMeeting));
      const monthlyEvents = monthlySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        time: doc.data().time?.toDate?.() || new Date(0)
      }));
    
      const futureMonthly = monthlyEvents.filter(e => e.time > now).sort((a, b) => a.time - b.time);
      setUpcomingMonthlyMeet(futureMonthly[0] || null);

      // Conclaves & NT Meetings
      const conclaveSnapshot = await getDocs(collection(db, COLLECTIONS.conclaves));
     
      let allNTMeetings = [];
      for (const conclaveDoc of conclaveSnapshot.docs) {
        const meetingsSnapshot = await getDocs(collection(db, COLLECTIONS.conclaves, conclaveDoc.id, "meetings"));
        meetingsSnapshot.forEach(doc => {
          allNTMeetings.push({ id: doc.id, conclaveId: conclaveDoc.id, ...doc.data(), time: doc.data().time?.toDate?.() || new Date(0) });
        });
      }
      const futureNTMeet = allNTMeetings.filter(m => m.time > now).sort((a, b) => a.time - b.time);
      setUpcomingNTMeet(futureNTMeet[0] || null);
    };

    fetchData();
  }, []);
// ✅ Referral Count Logic
useEffect(() => {
  const fetchReferralData = async () => {
    const storedUjb = localStorage.getItem('mmUJBCode');
    if (!storedUjb) return;

    const referralSnap = await getDocs(collection(db, "Referraldev"));

    let myReferral = 0;
    let passedReferral = 0;

    referralSnap.forEach(doc => {
      const data = doc.data();

      // ✅ My Referral → logged-in user's UJB is inside cosmoOrbiter
      if (data.cosmoOrbiter?.ujbCode === storedUjb) {
        myReferral++;
      }

      // ✅ Passed Referral → logged-in user's UJB is inside orbiter
      if (data.orbiter?.ujbCode === storedUjb) {
        passedReferral++;
      }
    });

    setNtMeetCount(myReferral);        // ✅ My Referral
    setMonthlyMetCount(passedReferral); // ✅ Passed Referral
  };

  fetchReferralData();
}, []);


  if (!isLoggedIn) {
    return (
      <div className='mainContainer signInBox'>
        <div className="signin">
          <div className="loginInput">
            <div className='logoContainer'>
              <img src="/logo.png" alt="Logo" className="logos" />
            </div>
            <p>UJustBe Unniverse</p>
            <form onSubmit={handleLogin}>
              <ul>
                <li>
                  <input type="text" placeholder="Enter your phone number" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} required />
                </li>
                <li>
                  <button className="login" type="submit">Login</button>
                </li>
              </ul>
            </form>
          </div>
          {error && <p style={{ color: 'red' }}>{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <main className="pageContainer">
      <Headertop />
      <section className='HomepageMain'>
        <div className='container pageHeading'>
          <h1>Hi {userName || 'User'}</h1>
          <p>Let's Create Brand Ambassador through Contribution</p>
        </div>

        <section className="project-summary">
          {/* <SummaryCard className="in-progress" count={ntMeetCount} label="Total Conclaves" href="/ConclaveMeeting" />
          <SummaryCard  className="in-review" count={monthlyMetCount} label="Monthly Meetings" href="/Monthlymeetdetails" /> */}
            <SummaryCard className="on-hold" count={ntMeetCount} label="My Referrals" href="/ReferralList" />
          <SummaryCard  className="completed" count={monthlyMetCount} label="Passed Referrals" href="/ReferralList" />
        </section>

  {(upcomingMonthlyMeet || upcomingNTMeet) && (
  <section className="upcoming-events">
    <h2>Upcoming Events</h2>

    {upcomingMonthlyMeet && (
      <MeetingCard meeting={upcomingMonthlyMeet} type="monthly" />
    )}

    {upcomingNTMeet && (
      <MeetingCard meeting={upcomingNTMeet} type="nt" />
    )}
  </section>
)}


        <AllServicesProducts pageHeading="Top Services & Products" hideFilters={true} enableInfiniteScroll={false} maxItems={12} hideHeaderFooter={true} extraSectionClass="homepage-preview" />

        <div className='seeMore'>
          <a className="see-more-btn" href="/AllServicesProducts">See More</a>
        </div>

        <div>{loading ? <div className="loader"><span className="loader2"></span></div> : <HeaderNav />}</div>
      </section>
    </main>
  );
};

export default HomePage;
