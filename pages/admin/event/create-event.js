// pages/create-event.js
import React, { useState, useEffect } from 'react';
import CreateEvent from '../../../component/CreateEvent';
import { collection, doc, setDoc, Timestamp, getDocs } from 'firebase/firestore';
import { db } from "../../../firebaseConfig";
import Layout from '../../../component/Layout'
import { useRouter } from 'next/router'; // Add this import

import "../../../src/app/styles/main.scss";
import { COLLECTIONS } from '../../../utility_collection';

const CreateEventPage = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(0);
  const [userList, setUserList] = useState([]);
  const tabs = ['Basic Info', 'Facilitator', 'Referral Possibility', '1-2-1 Interaction', 'E2A', 'Prospect Identified', 'Knowledge Sharing', 'Upload Mom', 'Upload Image', 'Requirement'
  ];

  const [referralSections, setReferralSections] = useState([
    { id: 1, referralFrom: '', referralFromSearch: '', referralTo: '', referralToSearch: '', referralDesc: '' },
  ]);


  const [eventName, setEventName] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [agendaPoints, setAgendaPoints] = useState(['']);
  const [zoomLink, setZoomLink] = useState('');
  const [prospectSections, setProspectSections] = useState([
    {
      prospect: '',
      prospectName: '',
      prospectDescription: '',
      prospectSearch: '',
      filteredUsers: [],
    },
  ]);

  const [e2aDesc, setE2aDesc] = useState('');
  const [interactionParticipants, setInteractionParticipants] = useState(['', '']);
  const [interactionDate, setInteractionDate] = useState('');
  const [e2aDate, setE2aDate] = useState('');
  const [e2a, setE2a] = useState('');
  const [reqfrom, setReq] = useState('');
  const [knowledgeSharing, setKnowledgeSharin] = useState('');
  const [prospect, setProspect] = useState('');

  const [prospectName, setProspectName] = useState('');
  const [prospectDescription, setProspectDescription] = useState('');
  const [reqDescription, setReqDescription] = useState('');
  const [knowledgeSharingName, setKnowledgeSharingName] = useState('');
  const [knowledgeSharingDesc, setKnowledgeSharingDesc] = useState('');
  const [contentTopic, setContentTopic] = useState('');
  const [contentType, setContentType] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const [facilitatorSearch, setFacilitatorSearch] = useState('');
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [knowledgeSharingSections, setKnowledgeSharingSections] = useState([
    { search: '', filteredUsers: [], name: '', topic: '', description: '' }
  ]);


  const [searchTerm1, setSearchTerm1] = useState("");
  const [searchTerm2, setSearchTerm2] = useState("");
  const [showDropdown1, setShowDropdown1] = useState(false);
  const [showDropdown2, setShowDropdown2] = useState(false);
  const [e2aSearch, setE2aSearch] = useState('');

  const [filteredReferralFromUsers, setFilteredReferralFromUsers] = useState([]);

  const [sections, setSections] = useState([{ id: 1, facilitator: '', facilitatorDesc: '' }]);

  const [requirementSections, setRequirementSections] = useState([
    {
      reqfrom: '',
      reqDescription: '',
      reqSearch: '',
      filteredUsers: [],
    },
  ]);



  const [filteredReferralToUsers, setFilteredReferralToUsers] = useState([]);
  const [referralTo, setReferralTo] = useState([]);
  const [prospectSearch, setProspectSearch] = useState('');
  const [reqSearch, setReqSearch] = useState('');
  const [knowledgeSharingSearch, setknowledgeSharingSearch] = useState('');


  const [imageDescription, setImageDescription] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);

  const handleAddParticipantSection = () => {
    setSections([
      ...sections,
      {
        id: sections.length + 1,
        participantSearchTerm1: '',
        participantSearchTerm2: '',
        selectedParticipant1: '',
        selectedParticipant2: '',
        interactionDate: '',
      },
    ]);
  };

  const handleSearchParticipant1 = (value, index) => {
    const updatedSections = [...sections];
    updatedSections[index].participantSearchTerm1 = value;
    updatedSections[index].selectedParticipant1 = value; // Update the selected participant
    setSections(updatedSections);
  };

  const handleSearchParticipant2 = (value, index) => {
    const updatedSections = [...sections];
    updatedSections[index].participantSearchTerm2 = value;
    updatedSections[index].selectedParticipant2 = value; // Update the selected participant
    setSections(updatedSections);
  };

  const handleDateChange = (value, index) => {
    const updatedSections = [...sections];
    updatedSections[index].interactionDate = value;
    setSections(updatedSections);
  };


  const handleSearchReq = (index, e) => {
    const query = e.target.value;
    const updated = [...requirementSections];
    updated[index].reqSearch = query;
    updated[index].filteredUsers = userList.filter(user =>
      user.name?.toLowerCase().includes(query.toLowerCase())
    );
    setRequirementSections(updated);
  };

  const handleSelectReq = (index, name) => {
    const updated = [...requirementSections];
    updated[index].reqfrom = name;
    updated[index].reqSearch = '';
    updated[index].filteredUsers = [];
    setRequirementSections(updated);
  };

  const handleChangeReqField = (index, field, value) => {
    const updated = [...requirementSections];
    updated[index][field] = value;
    setRequirementSections(updated);
  };

  const handleAddReqSection = () => {
    setRequirementSections([
      ...requirementSections,
      {
        reqfrom: '',
        reqDescription: '',
        reqSearch: '',
        filteredUsers: [],
      },
    ]);
  };

  const handleRemoveReqSection = (index) => {
    const updated = [...requirementSections];
    updated.splice(index, 1);
    setRequirementSections(updated);
  };
  const handleKnowledgeTopicChange = (value, index) => {
    const updatedSections = [...knowledgeSharingSections];
    updatedSections[index].topic = value;
    setKnowledgeSharingSections(updatedSections);
  };
  const handleKnowledgeSearch = (value, index) => {
    const updatedSections = [...knowledgeSharingSections];
    updatedSections[index].search = value;

    // Simulate filtered users list (you can modify as needed)
    updatedSections[index].filteredUsers = users.filter(user =>
      user.name.toLowerCase().includes(value.toLowerCase())
    );

    setKnowledgeSharingSections(updatedSections);
  };

  const handleSelectKnowledgeName = (selectedName, index) => {
    const updatedSections = [...knowledgeSharingSections];
    updatedSections[index].name = selectedName;
    updatedSections[index].search = '';
    updatedSections[index].filteredUsers = [];
    setKnowledgeSharingSections(updatedSections);
  };

  const handleKnowledgeDescChange = (value, index) => {
    const updatedSections = [...knowledgeSharingSections];
    updatedSections[index].description = value;
    setKnowledgeSharingSections(updatedSections);
  };

  const addKnowledgeSection = () => {
    setKnowledgeSharingSections(prev => [
      ...prev,
      { search: '', knowledgeSharing: '', knowledgeSharingName: '', knowledgeSharingDesc: '', filteredUsers: [] }
    ]);
  };

  const removeKnowledgeSection = index => {
    const updatedSections = [...knowledgeSharingSections];
    updatedSections.splice(index, 1);
    setKnowledgeSharingSections(updatedSections);
  };


  // Handle Search Input
  // Handle Search in each Knowledge Sharing Section
  const handleSearchknowledgeSharing = (e, index) => {
    const query = e.target.value;

    // Update the search query for the specific section
    const updatedSections = [...knowledgeSharingSections];
    updatedSections[index].search = query;

    // Filter users based on the query
    updatedSections[index].filteredUsers = userList.filter(user =>
      user.name?.toLowerCase().includes(query.toLowerCase())
    );

    setKnowledgeSharingSections(updatedSections);
  };

  // Handle Selecting a User in each Knowledge Sharing Section
  const handleSelectKnowledgeSharing = (name, index) => {
    const updatedSections = [...knowledgeSharingSections];

    // Update the name for the specific section
    updatedSections[index].name = name;
    updatedSections[index].search = '';  // Clear the search box after selection
    updatedSections[index].filteredUsers = [];  // Clear the filtered users list

    setKnowledgeSharingSections(updatedSections);
  };

  const handleProspectSearch = (index, e) => {
    const query = e.target.value;
    const updated = [...prospectSections];
    updated[index].prospectSearch = query;
    updated[index].filteredUsers = userList.filter(user =>
      user.name?.toLowerCase().includes(query.toLowerCase())
    );
    setProspectSections(updated);
  };

  const handleSelectProspect = (index, name) => {
    const updated = [...prospectSections];
    updated[index].prospect = name;
    updated[index].prospectSearch = '';
    updated[index].filteredUsers = [];
    setProspectSections(updated);
  };

  const handleChangeProspectField = (index, field, value) => {
    const updated = [...prospectSections];
    updated[index][field] = value;
    setProspectSections(updated);
  };

  const handleAddProspectSection = () => {
    setProspectSections([
      ...prospectSections,
      {
        prospect: '',
        prospectName: '',
        prospectDescription: '',
        prospectSearch: '',
        filteredUsers: [],
      },
    ]);
  };

  const handleRemoveProspectSection = (index) => {
    const updated = [...prospectSections];
    updated.splice(index, 1);
    setProspectSections(updated);
  };

  const handleSearchE2a = (e) => {
    const query = e.target.value;
    setE2aSearch(query);
    setFilteredUsers(
      userList.filter(user => user.name?.toLowerCase().includes(query.toLowerCase()))
    );
  };

  const handleSelectE2a = (name) => {
    setE2a(name);
    setE2aSearch('');
    setFilteredUsers([]);
  };



  const handleSearchFacilitator = (e) => {
    const query = e.target.value;
    setFacilitatorSearch(query);
    setFilteredUsers(
      userList.filter(user => user.name?.toLowerCase().includes(query.toLowerCase()))
    );
  };

  const handleSelectFacilitator = (index, name) => {
    setFacilitatorSearch('');
    setFilteredUsers([]);
    setSections(prev =>
      prev.map((sec, i) =>
        i === index ? { ...sec, facilitator: name } : sec
      )
    );
  };

  const handleDescChange = (index, value) => {
    setSections(prev =>
      prev.map((sec, i) =>
        i === index ? { ...sec, facilitatorDesc: value } : sec
      )
    );
  };

  const handleAddSection = () => {
    setSections(prev => [
      ...prev,
      { id: Date.now(), facilitator: '', facilitatorDesc: '' }
    ]);
  };


  const handleAgendaChange = (index, value) => {
    const updatedPoints = [...agendaPoints];
    updatedPoints[index] = value;
    setAgendaPoints(updatedPoints);
  };

  const handleRemoveAgendaPoint = (index) => {
    const updatedPoints = [...agendaPoints];
    updatedPoints.splice(index, 1);
    setAgendaPoints(updatedPoints);
  };

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const userRef = collection(db, 'userdetails'); // Firestore collection name
        const snapshot = await getDocs(userRef);
        const users = snapshot.docs.map(doc => ({
          id: doc.id, // Phone number (if needed)
          name: doc.data()[" Name"], // Ensure 'Name' is correctly capitalized (case-sensitive)
        }));
        setUserList(users);
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };

    fetchUsers();
  }, []);

  const handleSearchReferralFrom = (index, searchValue) => {
    const updatedReferralSections = [...referralSections];
    updatedReferralSections[index].referralFromSearch = searchValue;
    setReferralSections(updatedReferralSections);

    const filtered = userList.filter(user =>
      user.name && user.name.toLowerCase().includes(searchValue.toLowerCase())
    );

    setFilteredReferralFromUsers(filtered);
  };

  const handleSelectReferralFrom = (index, name) => {
    const updatedReferralSections = [...referralSections];
    updatedReferralSections[index].referralFrom = name;
    setReferralSections(updatedReferralSections);
  };

  const handleSearchReferralTo = (index, searchValue) => {
    const updatedReferralSections = [...referralSections];
    updatedReferralSections[index].referralToSearch = searchValue;
    setReferralSections(updatedReferralSections);

    const filtered = userList.filter(user =>
      user.name && user.name.toLowerCase().includes(searchValue.toLowerCase())
    );

    setFilteredReferralToUsers(filtered);
  };

  const handleSelectReferralTo = (index, name) => {
    const updatedReferralSections = [...referralSections];
    updatedReferralSections[index].referralTo = name;
    setReferralSections(updatedReferralSections);
  };

  const handleReferralDescChange = (index, value) => {
    const updatedReferralSections = [...referralSections];
    updatedReferralSections[index].referralDesc = value;
    setReferralSections(updatedReferralSections);
  };

  const handleAddReferralSection = () => {
    const newReferralSection = { id: Date.now(), referralFrom: '', referralFromSearch: '', referralTo: '', referralToSearch: '', referralDesc: '' };
    setReferralSections([...referralSections, newReferralSection]);
  };

  const handleNext = () => {
    if (activeTab < 7) setActiveTab(activeTab + 1);
  };

  const handlePrev = () => {
    if (activeTab > 0) setActiveTab(activeTab - 1);
  };
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const userRef = collection(db, 'userdetails'); // Firestore collection name
        const snapshot = await getDocs(userRef);
        const users = snapshot.docs.map(doc => ({
          id: doc.id, // Phone number (if needed)
          name: doc.data()[" Name"], // Ensure 'Name' is correctly capitalized (case-sensitive)
        }));
        setUserList(users);
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };

    fetchUsers();
  }, []);

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    setLoading(true); // Show loading state
    setError(''); // Clear any previous errors
    setSuccess(''); // Clear success state

    try {
      const monthlyMeetRef = collection(db, COLLECTIONS.monthlyMeeting);
      const uniqueId = doc(monthlyMeetRef).id;
      const eventDocRef = doc(monthlyMeetRef, uniqueId);

      await setDoc(eventDocRef, {
        name: eventName,
        time: Timestamp.fromDate(new Date(eventTime)),
        agenda: agendaPoints,
        zoomLink: zoomLink,
      });

      setSuccess('Event created successfully!');
    } catch (error) {
      setError('Failed to create event. Please try again.');
    } finally {
      setLoading(false); // Hide loading state after completion
    }
  };

  return (
    <Layout>
      <CreateEvent
        tabs={tabs}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        referralSections={referralSections}
        filteredReferralFromUsers={filteredReferralFromUsers}
        filteredReferralToUsers={filteredReferralToUsers}
        handleSearchReferralFrom={handleSearchReferralFrom}
        handleSelectReferralFrom={handleSelectReferralFrom}
        handleSearchReferralTo={handleSearchReferralTo}
        handleSelectReferralTo={handleSelectReferralTo}
        handleReferralDescChange={handleReferralDescChange}
        handleAddReferralSection={handleAddReferralSection}
        eventName={eventName}
        setEventName={setEventName}
        eventTime={eventTime}
        setEventTime={setEventTime}
        agendaPoints={agendaPoints}
        handleAgendaChange={handleAgendaChange}
        handleRemoveAgendaPoint={handleRemoveAgendaPoint}
        zoomLink={zoomLink}
        setZoomLink={setZoomLink}
        error={error}
        success={success}
        loading={loading}
        facilitatorSearch={facilitatorSearch}
        filteredUsers={filteredUsers}
        handleSearchFacilitator={handleSearchFacilitator}
        handleSelectFacilitator={handleSelectFacilitator}
        handleDescChange={handleDescChange}
        handleAddSection={handleAddSection}
        e2aSearch={e2aSearch}
        e2a={e2a}
        e2aDesc={e2aDesc}
        e2aDate={e2aDate}
        handleSearchE2a={handleSearchE2a}
        handleSelectE2a={handleSelectE2a}
        setE2aDesc={setE2aDesc}
        setE2aDate={setE2aDate}
        prospectSections={prospectSections}
        handleProspectSearch={handleProspectSearch}
        handleSelectProspect={handleSelectProspect}
        handleChangeProspectField={handleChangeProspectField}
        handleAddProspectSection={handleAddProspectSection}
        handleRemoveProspectSection={handleRemoveProspectSection}
        knowledgeSharingSections={knowledgeSharingSections}
        handleSearchknowledgeSharing={handleSearchknowledgeSharing}
        handleSelectKnowledgeSharing={handleSelectKnowledgeSharing}
        handleKnowledgeTopicChange={handleKnowledgeTopicChange}
        handleKnowledgeDescChange={handleKnowledgeDescChange}
        removeKnowledgeSection={removeKnowledgeSection}
        addKnowledgeSection={addKnowledgeSection}
        handleSearchReq={handleSearchReq}
        handleAddReqSection={handleAddReqSection}
        handleRemoveReqSection={handleRemoveReqSection}
        handleChangeReqField={handleChangeReqField}
        handleSelectReq={handleSelectReq}
        requirementSections={requirementSections}
        sections={sections}
        handleAddParticipantSection={handleAddParticipantSection}
        handleSearchParticipant1={handleSearchParticipant1}
        handleSearchParticipant2={handleSearchParticipant2}
        handleDateChange={handleDateChange}
        setLoading={setLoading}
        setError={setError}
        setSuccess={setSuccess}
        handleCreateEvent={handleCreateEvent}
      />
    </Layout>
  );
};

export default CreateEventPage;
