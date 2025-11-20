import React from 'react';
import ReferralSection from './ReferralSection';
import BasicInfoSection from './BasicInfo';
import FacilitatorSection from './FacilatorSection';
import E2ASection from './E2ASection';
import ProspectSection from './ProspectSection';
import KnowledgeSharingSection from './KnowledgeSharingSection';
import RequirementPage from './RequirementSection';
import ImageUpload from './UploadImage';
import { COLLECTIONS } from "/utility_collection";
import DocumentUpload from './UploadMOM';
import ParticipantSection from './ParticipantsSection';

const CreateEvent = ({
  tabs,
  activeTab,
  setActiveTab,
  referralSections,
  filteredReferralFromUsers,
  filteredReferralToUsers,
  handleSearchReferralFrom,
  handleSelectReferralFrom,
  handleSearchReferralTo,
  handleSelectReferralTo,
  handleReferralDescChange,
  handleAddReferralSection,
  eventName,
  setEventName,
  eventTime,
  setEventTime,
  handlePrev,
  handleNext,
  agendaPoints,
  handleCreateEvent,
  handleAgendaChange,
  handleRemoveAgendaPoint,
  zoomLink,
  setZoomLink,
  sections,
  handleImageUpload,
  facilitatorSearch,
  filteredUsers,
  handleSearchFacilitator,
  handleSelectFacilitator,
  handleDescChange,
  handleAddSection,
  error,
  success,
  loading,
  e2a,
  e2aDate,
  e2aDesc,
  e2aSearch,
  handleSearchE2a,
  handleSelectE2a,
  setE2aDate,
  setE2aDesc,
  eventId,
  handleProspectSearch,
  handleAddProspectSection,
  handleChangeProspectField,
  handleRemoveProspectSection,
  prospectSections,
  handleSelectProspect,
  knowledgeSharingSections,
  addKnowledgeSection,
  handleSearchknowledgeSharing,
  handleSelectKnowledgeSharing,
  handleKnowledgeTopicChange,
  handleKnowledgeDescChange,
  removeKnowledgeSection,
  handleSearchReq,
  handleAddReqSection,
  handleRemoveReqSection,
  handleChangeReqField,
  handleSelectReq,
  requirementSections,
  handleDocUpload,
  handleAddParticipantSection,
  handleSearchParticipant1,
  handleSearchParticipant2,
  handleDateChange,
  setLoading,
  setError,
  setSuccess
}) => {


 

  return (
    <section className="c-form box">
    <h2>Create New Event</h2>
    <div className="tab-header">
      {tabs.map((tab, index) => (
        <button
          key={index}
          className={index === activeTab ? 'active' : ''}
          onClick={() => index === 0 && setActiveTab(index)} // only allow clicking Basic Info
          disabled={index !== 0} // disable all except Basic Info
          style={{
            cursor: index === 0 ? 'pointer' : 'not-allowed',
            opacity: index === 0 ? 1 : 0.5,
          }}
        >
          {tab}
        </button>
      ))}
    </div>

  
     
        {activeTab === 0 && (
          <BasicInfoSection
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
            setLoading={setLoading}
            setError={setError}
            setSuccess={setSuccess}
          />
        )}
    {activeTab === 1 &&(
  <FacilitatorSection
    sections={sections}
    facilitatorSearch={facilitatorSearch}
    filteredUsers={filteredUsers}
    handleSearchFacilitator={handleSearchFacilitator}
    handleSelectFacilitator={handleSelectFacilitator}
    handleDescChange={handleDescChange}
    handleAddSection={handleAddSection}
  />
)}


        {activeTab === 2 && (
          <ReferralSection
            referralSections={referralSections}
            filteredReferralFromUsers={filteredReferralFromUsers}
            filteredReferralToUsers={filteredReferralToUsers}
            handleSearchReferralFrom={handleSearchReferralFrom}
            handleSelectReferralFrom={handleSelectReferralFrom}
            handleSearchReferralTo={handleSearchReferralTo}
            handleSelectReferralTo={handleSelectReferralTo}
            handleReferralDescChange={handleReferralDescChange}
            handleAddReferralSection={handleAddReferralSection}
          />
        )}
        {activeTab === 3 && (
          <ParticipantSection
            sections={sections}
            handleAddParticipantSection={handleAddParticipantSection}
            handleSearchParticipant1={handleSearchParticipant1}
            handleSearchParticipant2={handleSearchParticipant2}
            handleDateChange={handleDateChange}
          />
        )}
        {activeTab === 4 && (
          <E2ASection
            e2aSearch={e2aSearch}
            e2a={e2a}
            e2aDesc={e2aDesc}
            e2aDate={e2aDate}
            filteredUsers={filteredUsers}
            handleSearchE2a={handleSearchE2a}
            handleSelectE2a={handleSelectE2a}
            setE2aDesc={setE2aDesc}
            setE2aDate={setE2aDate}
          />
        )}
        {activeTab === 5 && (
          <ProspectSection
            prospectSections={prospectSections}
            handleProspectSearch={handleProspectSearch}
            handleSelectProspect={handleSelectProspect}
            handleChangeProspectField={handleChangeProspectField}
            handleAddProspectSection={handleAddProspectSection}
            handleRemoveProspectSection={handleRemoveProspectSection}
          />
        )}
        {activeTab === 6 && (
          <KnowledgeSharingSection
            knowledgeSharingSections={knowledgeSharingSections}
            handleSearchknowledgeSharing={handleSearchknowledgeSharing}
            handleSelectKnowledgeSharing={handleSelectKnowledgeSharing}
            handleKnowledgeTopicChange={handleKnowledgeTopicChange}
            handleKnowledgeDescChange={handleKnowledgeDescChange}
            removeKnowledgeSection={removeKnowledgeSection}
            addKnowledgeSection={addKnowledgeSection}
          />
        )}
        {activeTab === 7 && <DocumentUpload onUpload={handleImageUpload} loading={loading} />}
        {activeTab === 8 && <ImageUpload onUpload={handleDocUpload} loading={loading} />}
        {activeTab === 9 && (
          <RequirementPage
            handleSearchReq={handleSearchReq}
            handleAddReqSection={handleAddReqSection}
            handleRemoveReqSection={handleRemoveReqSection}
            handleChangeReqField={handleChangeReqField}
            handleSelectReq={handleSelectReq}
            requirementSections={requirementSections}
          />
        )}

        {/* Submit Button Section */}
        <div className="tab-navigation">
          {activeTab > 0 && <button onClick={handlePrev}>Previous</button>}
          {activeTab < 7 && <button onClick={handleNext}>Next</button>}
        </div>

        
        {error && <p style={{ color: 'red' }}>{error}</p>}
        {success && <p style={{ color: 'green' }}>{success}</p>}
  
    </section>
  );
};

export default CreateEvent;
