import React, { useState } from 'react';
import { doc, setDoc, collection, Timestamp } from 'firebase/firestore';
import { COLLECTIONS } from "/utility_collection";
import { db } from '../firebaseConfig';

const BasicInfoSection = (props) => {
  console.log("BasicInfoSection",props);
  const [eventName, setEventName] = useState(props?.data?.Eventname || '');
const [eventTime, setEventTime] = useState(props?.data?.time || '');
const [agendaPoints, setAgendaPoints] = useState(props?.data?.agenda || []);
const [zoomLink, setZoomLink] = useState(props?.data?.zoomLink || '');

  const [eventId, setEventId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleAgendaChange = (index, value) => {
    const updatedPoints = [...agendaPoints];
    updatedPoints[index] = value; // Update the specific agenda point
    setAgendaPoints(updatedPoints);
  };

  const handleRemoveAgendaPoint = (index) => {
    const updatedAgenda = agendaPoints.filter((_, i) => i !== index);
    setAgendaPoints(updatedAgenda);
  };



  const handleCreateEvent = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const monthlyMeetRef = collection(db, COLLECTIONS.monthlyMeeting);
      const uniqueId = doc(monthlyMeetRef).id;
      const eventDocRef = doc(monthlyMeetRef, uniqueId);

      await setDoc(eventDocRef, {
        Eventname: eventName,
        time: Timestamp.fromDate(new Date(eventTime)),
        agenda: agendaPoints,
        zoomLink: zoomLink,
      });

      setEventId(uniqueId);
      setSuccess('Event created successfully!');
      // Reset the form if needed
      setEventName('');
      setEventTime('');
      setAgendaPoints(['']);
      setZoomLink('');
    } catch (error) {
      setError( );
      console.error("Firebase Error:", error);
    } finally {
      setLoading(false);
    }
  };



  return (
    <section className='c-form box'>
      <h2>Create New Event</h2>
      <form onSubmit={handleCreateEvent}>
        <ul>
          <li className='form-row'>
            <h4>Event Name<sup>*</sup></h4>
            <div className='multipleitem'>
              <input
                type="text"
                placeholder="Event Name"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                required
              />
            </div>
          </li>

          <li className='form-row'>
            <h4>Date<sup>*</sup></h4>
            <div className='multipleitem'>
              <input
                type="datetime-local"
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
                required
              />
            </div>
          </li>

          <li className='form-row'>
            <h4>Agenda<sup>*</sup></h4>
            <div className='multipleitem'>
              {agendaPoints?agendaPoints.map((point, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    marginBottom: '10px',
                  }}
                >
                  <textarea
                    value={point}
                    onChange={(e) => handleAgendaChange(index, e.target.value)}
                    placeholder={`Agenda Point ${index + 1}`}
                    required
                    rows={3}
                    style={{ width: '300px', marginRight: '10px' }}
                  />
                  {agendaPoints.length > 1 && (
                    
                    <button class="tooltip" onClick={() =>  handleRemoveAgendaPoint(index)}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20" height="25" width="25">
                      <path fill="#6361D9" d="M8.78842 5.03866C8.86656 4.96052 8.97254 4.91663 9.08305 4.91663H11.4164C11.5269 4.91663 11.6329 4.96052 11.711 5.03866C11.7892 5.11681 11.833 5.22279 11.833 5.33329V5.74939H8.66638V5.33329C8.66638 5.22279 8.71028 5.11681 8.78842 5.03866ZM7.16638 5.74939V5.33329C7.16638 4.82496 7.36832 4.33745 7.72776 3.978C8.08721 3.61856 8.57472 3.41663 9.08305 3.41663H11.4164C11.9247 3.41663 12.4122 3.61856 12.7717 3.978C13.1311 4.33745 13.333 4.82496 13.333 5.33329V5.74939H15.5C15.9142 5.74939 16.25 6.08518 16.25 6.49939C16.25 6.9136 15.9142 7.24939 15.5 7.24939H15.0105L14.2492 14.7095C14.2382 15.2023 14.0377 15.6726 13.6883 16.0219C13.3289 16.3814 12.8414 16.5833 12.333 16.5833H8.16638C7.65805 16.5833 7.17054 16.3814 6.81109 16.0219C6.46176 15.6726 6.2612 15.2023 6.25019 14.7095L5.48896 7.24939H5C4.58579 7.24939 4.25 6.9136 4.25 6.49939C4.25 6.08518 4.58579 5.74939 5 5.74939H6.16667H7.16638ZM7.91638 7.24996H12.583H13.5026L12.7536 14.5905C12.751 14.6158 12.7497 14.6412 12.7497 14.6666C12.7497 14.7771 12.7058 14.8831 12.6277 14.9613C12.5495 15.0394 12.4436 15.0833 12.333 15.0833H8.16638C8.05588 15.0833 7.94989 15.0394 7.87175 14.9613C7.79361 14.8831 7.74972 14.7771 7.74972 14.6666C7.74972 14.6412 7.74842 14.6158 7.74584 14.5905L6.99681 7.24996H7.91638Z" clip-rule="evenodd" fill-rule="evenodd"></path>
                    </svg>
                    <span class="tooltiptext">Remove</span>
                  </button>
                  )}
                </div>
              )):null}
              <button
                type="button"
                onClick={() => setAgendaPoints([...agendaPoints, ''])}
                style={{
                  backgroundColor: '#fe6f06',
                  color: 'white',
                  padding: '5px 10px',
                  border: 'none',
                  borderRadius: '5px',
                  marginTop: '5px',
                }}
              >
                Add Agenda Point
              </button>
            </div>
          </li>

          <li className='form-row'>
            <h4>Zoom link</h4>
            <div className='multipleitem'>
              <input
                type="text"
                placeholder="Zoom Link"
                value={zoomLink}
                onChange={(e) => setZoomLink(e.target.value)}
                required
              />
            </div>
          </li>
        </ul>
        <ul>
        <li className="form-row">
          <div className="multipleitem">
        <button type="submit" className='submitbtn' disabled={loading}>
          {loading ? 'Creating Event...' : 'Update'}
        </button>
        </div>
        </li>
        </ul>

        {error && <p style={{ color: 'red' }}>{error}</p>}
        {success && <p style={{ color: 'green' }}>{success}</p>}

        {loading && (
          <div className='loader'>
            <span className="loader2"></span>
          </div>
        )}
      </form>
    </section>
  );
};

export default BasicInfoSection;
