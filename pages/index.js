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

  // ✅ Fetch user info from localStorage thi for deployment
  useEffect(() => {
    const storedPhone = localStorage.getItem('mmOrbiter');
    if (storedPhone) {
      setPhoneNumber(storedPhone);
      setIsLoggedIn(true);
      fetchUserName(storedPhone);
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUserName = async (phone) => {
    try {
      const userRef = doc(db, 'userdetails', phone);
      const userDoc = await getDoc(userRef);
      const name = userDoc.exists() ? userDoc.data()[" Name"] || 'User' : 'User';
      setUserName(name);
      return name;
    } catch (err) {
      console.error(err);
      return 'User';
    }
  };

  // ✅ Handle login
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const docRef = doc(db, "userdetails", phoneNumber);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        localStorage.setItem('mmOrbiter', phoneNumber);
        setIsLoggedIn(true);
        const fetchedName = docSnap.data()[" Name"] || 'User';
        setUserName(fetchedName);
        logUserLogin(phoneNumber, fetchedName);
      } else {
        setError('You are not an Orbiter.');
      }
    } catch (err) {
      console.error(err);
      setError('Login failed. Please try again.');
    }
  };

  // ✅ Log login events
  const logUserLogin = async (phone, name) => {
    try {
      const res = await fetch('https://api.ipify.org?format=json');
      const data = await res.json();
      const deviceInfo = navigator.userAgent;

      await setDoc(doc(collection(db, 'LoginLogs')), {
        phoneNumber: phone,
        name: name || 'Unknown',
        loginTime: new Date(),
        deviceInfo,
        ipAddress: data.ip || 'Unknown',
      });
    } catch (err) {
      console.warn("Could not log login:", err);
    }
  };

  // ✅ Fetch upcoming events and counts
  useEffect(() => {
    const fetchData = async () => {
      const now = new Date();

      // Monthly Meetings
      const monthlySnapshot = await getDocs(collection(db, "MonthlyMeeting"));
      const monthlyEvents = monthlySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        time: doc.data().time?.toDate?.() || new Date(0)
      }));
      setMonthlyMetCount(monthlySnapshot.size);
      const futureMonthly = monthlyEvents.filter(e => e.time > now).sort((a, b) => a.time - b.time);
      setUpcomingMonthlyMeet(futureMonthly[0] || null);

      // Conclaves & NT Meetings
      const conclaveSnapshot = await getDocs(collection(db, "Conclaves"));
      setNtMeetCount(conclaveSnapshot.size);

      let allNTMeetings = [];
      for (const conclaveDoc of conclaveSnapshot.docs) {
        const meetingsSnapshot = await getDocs(collection(db, "Conclaves", conclaveDoc.id, "meetings"));
        meetingsSnapshot.forEach(doc => {
          allNTMeetings.push({ id: doc.id, conclaveId: conclaveDoc.id, ...doc.data(), time: doc.data().time?.toDate?.() || new Date(0) });
        });
      }
      const futureNTMeet = allNTMeetings.filter(m => m.time > now).sort((a, b) => a.time - b.time);
      setUpcomingNTMeet(futureNTMeet[0] || null);
    };

    fetchData();
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
          <SummaryCard  className="completed" count={monthlyMetCount} label="Passed Referrals" href="/PassedReferrals" />
        </section>

        <section className="upcoming-events">
          <h2>Upcoming Events</h2>
          {upcomingMonthlyMeet && <MeetingCard meeting={upcomingMonthlyMeet} type="monthly" />}
          {upcomingNTMeet && <MeetingCard meeting={upcomingNTMeet} type="nt" />}
          {!upcomingMonthlyMeet && !upcomingNTMeet && <p className="noMeetings">No upcoming meetings</p>}
        </section>

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
