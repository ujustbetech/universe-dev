import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { app } from '../../firebaseConfig';
import '../../src/app/styles/user.scss';
import { COLLECTIONS } from "/utility_collection";
import HeaderNav from '../../component/HeaderNav';


const db = getFirestore(app);

const MeetingDetails = () => {
  const router = useRouter();
  const { id } = router.query;

  const [meetingInfo, setMeetingInfo] = useState(null);
  const [userName, setUserName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [responseStatus, setResponseStatus] = useState('');
  const [declineReason, setDeclineReason] = useState('');
  const [activeTab, setActiveTab] = useState('Agenda');
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [showAcceptPopUp, setShowAcceptPopUp] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
const [conclaveInfo, setConclaveInfo] = useState(null);
const [leaderName, setLeaderName] = useState('');

  const conclaveId = typeof window !== 'undefined' ? localStorage.getItem('conclaveId') : null;

useEffect(() => {
  const fetchData = async () => {
    const phone = localStorage.getItem('mmOrbiter');
    if (!phone || !id || !conclaveId) return;

    setPhoneNumber(phone);

    // Fetch user name
    const userSnap = await getDoc(doc(db, 'userdetails', phone));
    if (userSnap.exists()) setUserName(userSnap.data()[" Name"] || '');

    // Fetch meeting info
    const meetingRef = doc(db,  COLLECTIONS.conclaves, conclaveId, 'meetings', id);
    const meetingSnap = await getDoc(meetingRef);
    if (meetingSnap.exists()) setMeetingInfo(meetingSnap.data());

    // Fetch conclave info
    const conclaveRef = doc(db,  COLLECTIONS.conclaves, conclaveId);
    const conclaveSnap = await getDoc(conclaveRef);
    if (conclaveSnap.exists()) {
      const conclaveData = conclaveSnap.data();
      setConclaveInfo(conclaveData);

      // 🔍 Fetch leader name from userdetails using leader's phone number
      if (conclaveData.leader) {
        const leaderSnap = await getDoc(doc(db, 'userdetails', conclaveData.leader));
        if (leaderSnap.exists()) {
          setLeaderName(leaderSnap.data()[" Name"] || conclaveData.leader);
        } else {
          setLeaderName(conclaveData.leader); // fallback if not found
        }
      }
    }

    // Registration check
    const regSnap = await getDoc(doc(db,  COLLECTIONS.conclaves, conclaveId, 'meetings', id, 'registeredUsers', phone));
    if (regSnap.exists()) {
      const data = regSnap.data();
      setResponseStatus(data.response || '');
      if (!data.response) setShowResponseModal(true);
    } else {
      setShowResponseModal(true);
    }

    setShowAcceptPopUp(true);
    setLoading(false);
  };

  fetchData();
}, [id, conclaveId]);


  const handleAccept = async () => {
    const ref = doc(db,  COLLECTIONS.conclaves, conclaveId, 'meetings', id, 'registeredUsers', phoneNumber);
    await setDoc(ref, {
      phoneNumber,
      name: userName,
      response: 'Accepted',
      responseTime: new Date()
    }, { merge: true });

    setResponseStatus("Accepted");
    setShowResponseModal(false);
  };

  const handleDecline = () => {
    setShowDeclineModal(true);
    setShowAcceptPopUp(false);
  };

  const submitDeclineReason = async () => {
    if (!declineReason.trim()) return;

    const ref = doc(db,  COLLECTIONS.conclaves, conclaveId, 'meetings', id, 'registeredUsers', phoneNumber);
    await setDoc(ref, {
      phoneNumber,
      name: userName,
      response: 'Declined',
      reason: declineReason,
      responseTime: new Date()
    }, { merge: true });

    setResponseStatus("Declined");
    setShowDeclineModal(false);
    setShowResponseModal(false);
  };

  const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase();

  const datetime = meetingInfo?.datetime?.seconds ? new Date(meetingInfo.datetime.seconds * 1000) : null;

  const renderTabContent = () => {
    switch (activeTab) {
      case 'Agenda':
        return <p>{meetingInfo?.agenda || 'No agenda available'}</p>;
      case 'MoM':
        return meetingInfo?.documentUploads?.map((doc, idx) => (
          <div key={idx}>
            <p><strong>{doc.description}</strong></p>
            {doc.files?.map((file, i) => (
              <p key={i}><a href={file.url} target="_blank">{file.name}</a></p>
            ))}
          </div>
        )) || <p>No MoM uploaded</p>;
      case 'Knowledge Sharing':
        return meetingInfo?.knowledgeSections?.map((k, idx) => (
          <div key={idx}>
            <p><strong>Topic:</strong> {k.topic}</p>
            <p><strong>Name:</strong> {k.name}</p>
            <p><strong>Description:</strong> {k.description}</p>
          </div>
        )) || <p>No knowledge shared</p>;
      case 'Referrals':
        return meetingInfo?.referralSections?.map((r, idx) => (
          <div key={idx}>
            <p><strong>From:</strong> {r.referralFrom}</p>
            <p><strong>To:</strong> {r.referralTo}</p>
            <p>{r.referralDesc}</p>
          </div>
        )) || <p>No referrals</p>;
      case 'Requirements':
        return meetingInfo?.requirementSections?.map((r, idx) => (
          <div key={idx}>
            <p><strong>From:</strong> {r.reqfrom}</p>
            <p>{r.reqDescription}</p>
          </div>
        )) || <p>No requirements</p>;
      case 'Interactions':
        return meetingInfo?.sections?.map((s, idx) => (
          <div key={idx}>
            <p><strong>Participants:</strong> {s.selectedParticipant1} & {s.selectedParticipant2}</p>
            <p><strong>Date:</strong> {new Date(s.interactionDate).toLocaleDateString('en-GB')}</p>
          </div>
        )) || <p>No interactions</p>;
      default:
        return <p>No content available</p>;
    }
  };

  return (
    <>
      <main className="pageContainer">
        <header className='Main m-Header'>
          <section className='container'>
            <div className='innerLogo'>
              <img src="/ujustlogo.png" alt="Logo" className="logo" />
            </div>
            <div className='headerRight'>
              <div className="userName" onClick={() => router.push('/')} style={{ cursor: 'pointer' }}>
                <span>{getInitials(userName)}</span>
              </div>
            </div>
          </section>
        </header>

        <section className='p-meetingDetails'>
          <div className='container pageHeading'>
  {conclaveInfo && (
  <div className='DetailsCard'>
    <h2 className="event-title">{conclaveInfo.conclaveStream || 'Conclave Name'}</h2>

    <div className='names'>
      <p className="event-category with-dot dot-blue">
        Leader: <strong>{leaderName || 'N/A'}</strong>
      </p>
    </div>

    <div className="event-meta">
      <div className="due-date">
        Date:{" "}
        <strong>
          {conclaveInfo.initiationDate
            ? new Date(conclaveInfo.initiationDate).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              })
            : 'N/A'}
        </strong>
      </div>
    </div>
  </div>
)}


            <div className="event-container">
          

              <div className="event-content">
                <div className='sectionHeading'>
                  <h2 className="event-title">{meetingInfo?.meetingName || 'Meeting Details'}</h2>
                  <p className="event-date">
                    {datetime?.toLocaleString('en-GB', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true,
                    }) || 'Date'}
                  </p>
                </div>

                <div className='eventinnerContent'>
                  <div className="tabs">
                    {['Agenda', 'MoM', 'Knowledge Sharing', 'Referrals', 'Requirements', 'Interactions'].map(tab => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`tab ${activeTab === tab ? "active" : ""}`}
                      >
                        {tab}
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

        {/* Accept/Decline Modal */}
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
      </main>
    </>
  );
};

export default MeetingDetails;
