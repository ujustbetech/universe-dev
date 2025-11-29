import { useState, useEffect, useRef } from 'react';
import { db, storage } from '../../../../firebaseConfig';
import { collection, doc,  Timestamp, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { useRouter } from 'next/router';
import Layout from '../../../../component/Layout';
import "../../../../pages/feedback.css";
import "../../../../src/app/styles/main.scss";
import DocumentUpload from '../../../../component/MeetingUploadMOM';
import Edit from '../../../../component/AddMeeting';
import { COLLECTIONS } from "/utility_collection";
import ReferralSection from '../../../../component/ConclaveReferral';
import RequirementPage from '../../../../component/MeetingRequirement';
import ParticipantSection from '../../../../component/ConclaveParticipants';
import ProspectSection from '../../../../component/ConclaveProspect';
import RegisteredUsers from '../../../../component/RegisteredConclave';
import Meetup from '../../../../component/MeetingMeetup';
import KnowledgeSharingSection from '../../../../component/ConclaveKnowlegde';
const EditAdminEvent = () => {
  const router = useRouter();
  const { id } = router.query;
  const { conclaveId, id: meetingId } = router.query;
  const [activeTab, setActiveTab] = useState(0);
  const [eventData, seteventData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [requirementSections, setRequirementSections] = useState([]);
  


  const tabs = [
    'Meeting Details', 'Knowledge Sharing','121' ,'Requirement', 'Prospect Identification' ,'Referral Identification','Upload Agenda','Registered Users'];

const fetchEvent = async (index) => {
  if (!conclaveId || !meetingId) return;

  try {
    const eventDoc = doc(db, COLLECTIONS.conclaves, conclaveId, 'meetings', meetingId);
    const eventSnapshot = await getDoc(eventDoc);

    if (eventSnapshot.exists()) {
      const data = eventSnapshot.data();
      console.log("entire data", data);
      seteventData(data);
      setEventTime(new Date(data.time?.seconds * 1000).toISOString().slice(0, 16));
      setRequirementSections(data.requirements || []);
      handleTabClick(index);
    } else {
      setError('Event not found.');
    }
  } catch (err) {
    console.error(err);
    setError('Failed to fetch event data.');
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    if (!router.isReady) return;   
    fetchEvent(0);
  }, [router.isReady, id]);
  
  useEffect(() => {
    if (router.isReady) {
      setLoading(true);
      setError('');
      setSuccess('');
      seteventData([]);
    }
  }, [router.query.id]);
    
  
  

   const handleTabClick = (index) => {
    setActiveTab(index);
  };
    
  const goToNextTab = () => {
    if (activeTab < tabs.length - 1) {
      setActiveTab(activeTab + 1);
    }
  };

  const goToPreviousTab = () => {
    if (activeTab > 0) {
      setActiveTab(activeTab - 1);
    }
  };
  return (
    <Layout>
       <div className="step-form-container">
       <div className="step-progress-bar">
  {tabs.map((tab, index) => (
    <div key={index} className="step-container">
      <button
        className={`step ${activeTab === index ? "active" : ""}`}
        onClick={() => handleTabClick(index)}
      >
        {index + 1}
      </button>
      <div className="step-title">{tab}</div>
    </div>
  ))}
</div>

</div>
      <section className='c-form box'>
        {/* <h2>Edit Event</h2> */}
        
       
        {loading ? (
  <p>Loading...</p>
) : (
  <>
   {activeTab === 0 && <>
          <Edit data={eventData} id={id} />
        </>}
      
     
        {activeTab === 1 && (
          <>
<KnowledgeSharingSection fetchData={fetchEvent} eventID={id} data={eventData} />
          </>
        )}
        
  {activeTab === 2 && (
          <>
<ParticipantSection fetchData={fetchEvent} eventID={id} data={eventData} />
          </>
        )}
        {activeTab === 3 && (
          <>

<RequirementPage fetchData={fetchEvent} eventID={id} data={eventData} />
          </>
        )}
               {activeTab === 4 && (
          <>
<ProspectSection fetchData={fetchEvent} eventID={id} data={eventData} />
          </>
        )}
          {activeTab === 5 && (
          <>
           <ReferralSection fetchData={fetchEvent} eventID={id} data={eventData} />
          </>
        )}
           {activeTab === 6 && (
          <>
<DocumentUpload fetchData={fetchEvent} eventID={id} data={eventData} />
          </>
        )}
         {activeTab === 7 && (
          <>
<RegisteredUsers fetchData={fetchEvent} eventID={id} data={eventData} />
          </>
        )}
          {/* {activeTab === 8 && (
          <>
<Meetup fetchData={fetchEvent} eventID={id} data={eventData} />
          </>
        )} */}
   </>
)}
    <div className="nav-buttons">
  <button type="button" onClick={goToPreviousTab} disabled={activeTab === 0}>
    Back
  </button>

  {activeTab === tabs.length - 1 ? (
  null
  ) : (
    <button type="button" onClick={goToNextTab}>
      Next
    </button>
  )}
</div>
       
     
      </section>
    </Layout>
  );

};

export default EditAdminEvent;