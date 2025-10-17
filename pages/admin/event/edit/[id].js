import { useState, useEffect, useRef } from 'react';
import { db, storage } from '../../../../firebaseConfig';
import { collection, doc, setDocs, Timestamp, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { useRouter } from 'next/router';
import { ref, uploadBytesResumable, getDownloadURL, getStorage, uploadBytes } from "firebase/storage";
import Layout from '../../../../component/Layout';
import "../../../../src/app/styles/main.scss";
import FacilitatorSection from '../../../../component/FacilatorSection';
import ReferralSection from '../../../../component/ReferralSection';
import E2ASection from '../../../../component/E2ASection';
import ProspectSection from '../../../../component/ProspectSection';
import KnowledgeSharingSection from '../../../../component/KnowledgeSharingSection';
import RequirementPage from '../../../../component/RequirementSection';
import DocumentUpload from '../../../../component/UploadMOM';
import ImageUpload from '../../../../component/UploadImage';
import ParticipantSection from '../../../../component/ParticipantsSection';
import EditForm from '../../../../component/EditForm';
import RegisteredUsers from '../../../../component/RegisteredUsers';
import AddUser from '../../../../component/AddUsers';
import TopicSection from '../../../../component/TopicOfTheDay';
import Conclave from '../../../../component/Conclave';

const EditAdminEvent = () => {
  const router = useRouter();
  const { id } = router.query;
  const [activeTab, setActiveTab] = useState(0);
  const [eventData, seteventData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [requirementSections, setRequirementSections] = useState([]);
  


  const tabs = [
    'Event Info','Topic of the Day', 'Facilitator', 'Referral Possibilities', 'Proposed Interaction', 'Proposed E2A', 'Prospects Identified', 'Knowledge Sharing', 'Upload MoM', 'Add Creatives', 'Requirements','Registered Users','Add Users','Conclave'
  ];

  const fetchEvent = async (index) => {
    try {
      const eventDoc = doc(db, 'MonthlyMeeting', id);
      const eventSnapshot = await getDoc(eventDoc);
      if (eventSnapshot.exists()) {
        const data = eventSnapshot.data();
        console.log("entire data", data);
        seteventData(data);
         // setEventName(data.Eventname || '');
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
  
  return (
    <Layout>
      
     
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

<section className='c-form box'>
      
        {loading ? (
  <p>Loading...</p>
) : (
  <>
   {activeTab === 0 && <>
          <EditForm data={eventData} id={id} />
        </>}
   </>
)}
  {activeTab === 1 && (
          <>
            <TopicSection fetchData={fetchEvent} eventID={id} data={eventData} />
          </>
        )}

       
        {activeTab === 2 && (
          <>
            <FacilitatorSection fetchData={fetchEvent} eventID={id} data={eventData} />
          </>
        )}


        {activeTab === 3 && (
          <>
           <ReferralSection fetchData={fetchEvent} eventID={id} data={eventData} />
          </>
        )}

        {activeTab === 4 && (
          <>
<ParticipantSection fetchData={fetchEvent} eventID={id} data={eventData} />
          </>
        )}


        {activeTab === 5 && (
          <>
<E2ASection fetchData={fetchEvent} eventID={id} data={eventData} />
          </>
        )}
        {activeTab === 6 && (
          <>
<ProspectSection fetchData={fetchEvent} eventID={id} data={eventData} />
          </>
        )}

{activeTab === 7 && (
          <>
<KnowledgeSharingSection fetchData={fetchEvent} eventID={id} data={eventData} />
          </>
        )}


        {activeTab === 8 && (
          <>
<DocumentUpload fetchData={fetchEvent} eventID={id} data={eventData} />
          </>
        )}

{activeTab === 9 && (
          <>
<ImageUpload fetchData={fetchEvent} eventID={id} data={eventData} />
          </>
        )}

{activeTab === 10 && (
          <>

<RequirementPage fetchData={fetchEvent} eventID={id} data={eventData} />
          </>
        )}
{activeTab === 11 && (
          <>

<RegisteredUsers fetchData={fetchEvent} eventId={id} data={eventData} />
          </>
        )}

{activeTab === 12 && (
          <>

<AddUser fetchData={fetchEvent} eventId={id} data={eventData} />
          </>
        )}
        {activeTab === 13 && (
          <>

<Conclave fetchData={fetchEvent} eventId={id} data={eventData} />
          </>
        )}
        {/* <div className='tab-navigation'>
          {activeTab > 0 && <button onClick={handlePrev}>Previous</button>}
          {activeTab < 7 && <button onClick={handleNext}>Next</button>}
        </div>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        {success && <p style={{ color: 'green' }}>{success}</p>} */}
      </section>
    </Layout>
  );

};

export default EditAdminEvent;
