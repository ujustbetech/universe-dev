import { useState, useEffect, useRef } from 'react';
import { db, storage } from '../../../../firebaseConfig';
import { collection, doc, Timestamp, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { useRouter } from 'next/router';
import { COLLECTIONS } from "/utility_collection";
import Layout from '../../../../component/Layout';
import "../../../../pages/feedback.css";
import "../../../../src/app/styles/main.scss";

import Edit from '../../../../component/EditProspectForm';
import AditionalInfo from '../../../../component/AdditionalInfo';
import FollowUpInfo from '../../../../component/FollowUps';
import Assesment from '../../../../component/Assesment';
import NTIntro from '../../../../component/NTIntro';
import NTBriefCall from '../../../../component/NTBriefCall';
import EnrollmentStage from '../../../../component/EnrollmentStage';
import ProspectFormDetails from '../../../../component/ProspectDetails';
import EngagementForm from '../../../../component/Engagementform';
import EngagementActivity from '../../../../component/EngagementActivity';
import ProspectFeedback from '../../../../component/ProspectFeedback';
import KnowledgeSharing4 from '../../../../component/KnowledgeSharing4';
import KnowledgeSharing5 from '../../../../component/KnowledgeSharing5';
import KnowledgeSeries9 from '../../../../component/KnowledgeSeries9';
import KnowledgeSeries10 from '../../../../component/KnowledgeSeries10';
import CaseStudy1 from '../../../../component/CaseStudy1';
import CaseStudy2 from '../../../../component/CaseStudy2';
import AssesmentCall from '../../../../component/AssesmentCall';
import AssesmentMail from '../../../../component/AssesmentMail';

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
    'Prospect Details', 'Assesment Form', 'Meeting Logs', 'Pre- Enrollment Form' ,'Feedback Form','Authentic Choice','Enrollment Status','Engagement Logs', 'Meeting for Introduction to UJustBe',
  'UJustBe Terms Knowledge Transfer',
  'UJustBe Knowledge Series',
  'Mail for Introduction to NT',
  'Briefing on NT',
  'NT Introduction Knowledge Transfer',
  'Referrals Knowledge Transfer',
  'Monthly Meeting Knowledge Transfer',
  'UJustBe’s As Lived - Part 1',
  'UJustBe’s As Lived - Part 2',
  'Review and Feedback Session'
  ];

  const fetchEvent = async (index) => {
    try {
      const eventDoc = doc(db, 'Prospects', id);
      const eventSnapshot = await getDoc(eventDoc);
      if (eventSnapshot.exists()) {
        const data = eventSnapshot.data();
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

  // ✅ Export Prospect Details (CSV)
  const exportProspectDetails = () => {
    if (!eventData) return;

    const csvRows = [];
    const headers = Object.keys(eventData);
    csvRows.push(headers.join(","));

    const values = headers.map(h => JSON.stringify(eventData[h] ?? ""));
    csvRows.push(values.join(","));

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Prospect_${id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
        {loading ? (
          <p>Loading...</p>
        ) : (
          <>
            {activeTab === 0 && <>
              <Edit data={eventData} id={id} />
            </>}
            {activeTab === 1 && <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3>Prospect Details</h3>
                <button onClick={exportProspectDetails} className="export-btn">Export</button>
              </div>
              <ProspectFormDetails data={eventData} id={id} />
            </>}
            {activeTab === 2 && <FollowUpInfo data={eventData} id={id} />}
            {activeTab === 3 && <AditionalInfo data={eventData} id={id} />}
            {activeTab === 4 && <ProspectFeedback data={eventData} id={id} />}
            {activeTab === 5 && <Assesment data={eventData} id={id} />}
            {activeTab === 6 && <EnrollmentStage data={eventData} id={id} />}
            {activeTab === 7 && <EngagementForm data={eventData} id={id} />}
            {activeTab === 8 && <EngagementActivity data={eventData} id={id} />}
            {activeTab === 9 && <KnowledgeSharing4 data={eventData} id={id} />}
            {activeTab === 10 && <KnowledgeSharing5 data={eventData} id={id} />}
            {activeTab === 11 && <NTIntro data={eventData} id={id} />}
            {activeTab === 12 && <NTBriefCall data={eventData} id={id} />}
            {activeTab === 13 && <KnowledgeSeries9 data={eventData} id={id} />}
            {activeTab === 14 && <KnowledgeSeries10 data={eventData} id={id} />}
            {activeTab === 15 && <AssesmentMail data={eventData} id={id} />}
            {activeTab === 16 && <CaseStudy1 data={eventData} id={id} />}
            {activeTab === 17 && <CaseStudy2 data={eventData} id={id} />}
            {activeTab === 18 && <AssesmentCall data={eventData} id={id} />}
          </>
        )}

        <div className="nav-buttons">
          <button type="button" onClick={goToPreviousTab} disabled={activeTab === 0}>
            Back
          </button>

          {activeTab === tabs.length - 1 ? null : (
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
