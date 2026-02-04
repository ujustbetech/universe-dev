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
import Swal from "sweetalert2";
import { updateDoc } from "firebase/firestore";
import jsPDF from "jspdf";
import {
  LISTED_PARTNER_AGREEMENT,
  PARTNER_AGREEMENT
} from "../src/utils/agreements";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../firebaseConfig";

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


const generateAgreementPDF = async ({ name, address, city, category }) => {
  const doc = new jsPDF("p", "mm", "a4");

  const PAGE_WIDTH = 210;
  const PAGE_HEIGHT = 297;

  /* ================= LAYOUT CONFIG ================= */
  const MARGIN_X = 20;
  const MARGIN_Y = 40;

  const FONT_SIZE = 11.5;
  const LINE_HEIGHT = 6.5;

  const TEXT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;
  let cursorY = MARGIN_Y;

  const isCosmOrbiter = category === "CosmOrbiter";

  const agreementText = isCosmOrbiter
    ? LISTED_PARTNER_AGREEMENT
    : PARTNER_AGREEMENT;

  const finalText = agreementText
    .replace(/{{NAME}}/g, name)
    .replace(/{{ADDRESS}}/g, `${address}, ${city}`);

  /* ================= LOGO ================= */
  const LOGO_WIDTH = 30;
  const LOGO_HEIGHT = 30; // ✅ taller logo
  const LOGO_X = (PAGE_WIDTH - LOGO_WIDTH) / 2;

  doc.addImage("/ujustlogo.png", "PNG", LOGO_X, 10, LOGO_WIDTH, LOGO_HEIGHT);

  cursorY = 55;

  /* ================= TITLE ================= */
  doc.setFont("Helvetica", "Bold");
  doc.setFontSize(17);
  doc.text(
    isCosmOrbiter
      ? "LISTED PARTNER AGREEMENT"
      : "PARTNER AGREEMENT",
    PAGE_WIDTH / 2,
    cursorY,
    { align: "center" }
  );

  cursorY += 18;

  /* ================= BODY ================= */
  doc.setFont("Helvetica", "Normal");
  doc.setFontSize(FONT_SIZE);

  finalText.split("\n").forEach((line) => {
    if (!line.trim()) {
      cursorY += LINE_HEIGHT;
      return;
    }

    const wrappedLines = doc.splitTextToSize(line, TEXT_WIDTH);

    wrappedLines.forEach((wrapLine) => {
      if (cursorY > PAGE_HEIGHT - 30) {
        doc.addPage();
        cursorY = MARGIN_Y;
      }

      doc.text(wrapLine, MARGIN_X, cursorY, {
        align: "left",
        maxWidth: TEXT_WIDTH,
      });

      cursorY += LINE_HEIGHT;
    });
  });

  /* ================= SIGNATURE PAGE ================= */
  doc.addPage();
  cursorY = 60;

  doc.setFont("Helvetica", "Bold");
  doc.setFontSize(14);
  doc.text("ACCEPTANCE & CONFIRMATION", PAGE_WIDTH / 2, cursorY, {
    align: "center",
  });

  cursorY += 20;

  doc.setFont("Helvetica", "Normal");
  doc.setFontSize(12);

  doc.text(`Name: ${name}`, MARGIN_X, cursorY); cursorY += 12;
  doc.text(`Category: ${category}`, MARGIN_X, cursorY); cursorY += 12;
  doc.text(`Address: ${address}, ${city}`, MARGIN_X, cursorY); cursorY += 12;
  doc.text(`Date: ${new Date().toLocaleDateString()}`, MARGIN_X, cursorY);

  cursorY += 25;
  doc.text("Signature: Digitally Accepted", MARGIN_X, cursorY);

  /* ================= WATERMARK + FOOTER ================= */
  const pageCount = doc.getNumberOfPages();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    doc.setFontSize(42);
    doc.setTextColor(235);
    doc.text(
      "DIGITALLY ACCEPTED",
      PAGE_WIDTH / 2,
      PAGE_HEIGHT / 2,
      { align: "center", angle: 35 }
    );

    doc.setTextColor(0);
    doc.setFontSize(10);
    doc.text(
      `Page ${i} of ${pageCount}`,
      PAGE_WIDTH / 2,
      PAGE_HEIGHT - 12,
      { align: "center" }
    );
  }

  /* ================= DOWNLOAD + UPLOAD ================= */
  const pdfBlob = doc.output("blob");

  doc.save(
    `${isCosmOrbiter ? "ListedPartner" : "Partner"}_Agreement_${name}.pdf`
  );

  const pdfRef = ref(storage, `agreements/${Date.now()}_${name}.pdf`);
  await uploadBytes(pdfRef, pdfBlob);
  const pdfUrl = await getDownloadURL(pdfRef);

  return pdfUrl;
};




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
// ✅ Agreement Check (SHOW ONLY ONCE)
useEffect(() => {
  const checkAgreement = async () => {
    const ujbCode = localStorage.getItem("mmUJBCode");
    if (!ujbCode) return;

    try {
      const userRef = doc(db, COLLECTIONS.userDetail, ujbCode);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) return;

      const data = userSnap.data();

      // ✅ If already accepted → do nothing
      if (data.agreementAccepted === true) return;

      // ✅ Show Agreement Modal
      const result = await Swal.fire({
        title:
          data.Category === "CosmOrbiter"
            ? "Listed Partner Agreement"
            : "Partner Agreement",
        html: `
          <div style="text-align:left; max-height:250px; overflow:auto;">
            <p>• You have read and understood the agreement</p>
            <p>• You accept all terms & conditions</p>
            <p>• This acceptance is legally binding</p>
          </div>
        `,
        icon: "info",
        confirmButtonText: "Accept",
        allowOutsideClick: false,
        allowEscapeKey: false,
      });

      // ✅ On Accept
      if (result.isConfirmed) {
        const name =
          data.Name ||
          data.BusinessName ||
          userName ||
          "User";

        const address = data.Address || "—";
        const city = data.City || "—";
        const category = data.Category; // CosmOrbiter / Orbiter

        // ✅ Generate PDF + Upload → get URL
        const pdfUrl = await generateAgreementPDF({
          name,
          address,
          city,
          category,
        });

        // ✅ Save acceptance + PDF URL in Firestore
        await updateDoc(userRef, {
          agreementAccepted: true,
          agreementAcceptedAt: new Date(),
          agreementType:
            category === "CosmOrbiter"
              ? "LISTED_PARTNER"
              : "PARTNER",
          agreementPdfUrl: pdfUrl,
        });

        Swal.fire(
          "Agreement Accepted",
          "Your agreement has been signed and saved successfully",
          "success"
        );
      }
    } catch (err) {
      console.error("Agreement error:", err);
      Swal.fire(
        "Error",
        "Something went wrong while saving the agreement",
        "error"
      );
    }
  };

  if (isLoggedIn) {
    checkAgreement();
  }
}, [isLoggedIn, userName]);



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
