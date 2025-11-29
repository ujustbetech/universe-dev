import { useState, useEffect } from 'react';
import { db } from '../../../../firebaseConfig';
import { useRouter } from 'next/router';
import Layout from '../../../../component/Layout';
import "../../../../pages/feedback.css";
import "../../../../src/app/styles/main.scss";
import { COLLECTIONS } from "/utility_collection";
import { addDoc, collection, doc, getDoc,getDocs, Timestamp } from 'firebase/firestore';
import Edit from '../../../../component/EditConclave';


const EditAdminEvent = () => {
  const router = useRouter();
  const { id } = router.query;
const [meetings, setMeetings] = useState([]);

  const [activeTab, setActiveTab] = useState(0);
  const [eventData, seteventData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showMeetingForm, setShowMeetingForm] = useState(false); // 🔁 NEW

  const [meetingForm, setMeetingForm] = useState({
    meetingName: '',
    datetime: '',
    agenda: '',
    mode: 'online',
    link: '',
    venue: ''
  });

  useEffect(() => {
    const fetchConclave = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const docRef = doc(db,COLLECTIONS.conclaves, id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          seteventData(docSnap.data());
        }
      } catch (error) {
        console.error('Error fetching conclave:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchConclave();
  }, [id]);
useEffect(() => {
  const fetchConclave = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const docRef = doc(db,COLLECTIONS.conclaves, id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        seteventData(docSnap.data());
      }

      // 🔁 Fetch meetings
      const meetingsRef = collection(db, COLLECTIONS.conclaves, id, 'meetings');
      const snapshot = await getDocs(meetingsRef);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMeetings(data);
    } catch (error) {
      console.error('Error fetching conclave or meetings:', error);
    } finally {
      setLoading(false);
    }
  };
  fetchConclave();
}, [id]);

  const handleMeetingChange = (e) => {
    setMeetingForm(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  

const sendWhatsAppMessage = async (userName, conclaveName, eventDate, venue, link, phoneNumber) => {
   const ACCESS_TOKEN = 'EAAHwbR1fvgsBOwUInBvR1SGmVLSZCpDZAkn9aZCDJYaT0h5cwyiLyIq7BnKmXAgNs0ZCC8C33UzhGWTlwhUarfbcVoBdkc1bhuxZBXvroCHiXNwZCZBVxXlZBdinVoVnTB7IC1OYS4lhNEQprXm5l0XZAICVYISvkfwTEju6kV4Aqzt4lPpN8D3FD7eIWXDhnA4SG6QZDZD'; // Replace with your Meta API token
    const PHONE_NUMBER_ID = '527476310441806'; 

  const url = `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`;

  const messageData = {
    messaging_product: 'whatsapp',
    to: phoneNumber,
    type: 'template',
    template: {
      name: 'conclave_meeting', // Replace with your approved template name
      language: { code: 'en' },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: userName },
            { type: 'text', text: conclaveName },
            { type: 'text', text: eventDate },
            { type: 'text', text: venue || 'Online' },
            { type: 'text', text: link || '-' }
          ]
        }
      ]
    }
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(messageData)
    });

    const data = await response.json();
    console.log(`WhatsApp sent to ${userName}:`, data);
  } catch (error) {
    console.error('Error sending WhatsApp:', error);
  }
};
const handleMeetingSubmit = async (e) => {
  e.preventDefault();
  const { meetingName, datetime, agenda, mode, link, venue } = meetingForm;

  if (
    !meetingName || !datetime || !agenda ||
    (mode === 'online' && !link) ||
    (mode === 'offline' && !venue)
  ) {
    alert('Please fill all required fields');
    return;
  }

  try {
    const meetingData = {
      meetingName,
      datetime: Timestamp.fromDate(new Date(datetime)),
      agenda,
      mode,
      link: mode === 'online' ? link : '',
      venue: mode === 'offline' ? venue : '',
      createdAt: Timestamp.now()
    };

    const meetingRef = collection(db, COLLECTIONS.conclaves, id, 'meetings');
    const newDocRef = await addDoc(meetingRef, meetingData);

    alert('Meeting added successfully!');
    setMeetingForm({
      meetingName: '',
      datetime: '',
      agenda: '',
      mode: 'online',
      link: '',
      venue: ''
    });
    setShowMeetingForm(false);

    // WhatsApp messaging is turned off
    // const conclaveSnap = await getDoc(doc(db, 'Conclaves', id));
    // const conclaveData = conclaveSnap.data();
    // const userIds = [
    //   ...conclaveData.orbiters || [],
    //   ...conclaveData.ntMembers || [],
    //   conclaveData.leader
    // ];
    //
    // const readableDate = new Date(datetime).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    //
    // for (const uid of userIds) {
    //   const userSnap = await getDoc(doc(db, 'userdetails', uid));
    //   const user = userSnap.data();
    //   if (user && user.Phone) {
    //     await sendWhatsAppMessage(
    //       user[" Name"],
    //       conclaveData.conclaveStream,
    //       readableDate,
    //       venue,
    //       link,
    //       user.Phone
    //     );
    //   }
    // }

  } catch (error) {
    console.error("Error adding meeting:", error);
    alert("Failed to add meeting.");
  }
};
const formatDateTime = (seconds) => {
  const date = new Date(seconds * 1000);

  const options = { day: '2-digit', month: 'short', year: '2-digit' };
  const datePart = date.toLocaleDateString('en-GB', options);

  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const isPM = hours >= 12;

  hours = hours % 12 || 12; // Convert 0 -> 12
  const period = isPM ? 'pm' : 'am';

  const timePart = `${hours}:${minutes}${period}`;

  return `${datePart} at ${timePart}`;
};

  return (
    <Layout>
      <div className="step-form-container"></div>

      <section className='c-form box'>
        {loading ? (
          <p>Loading...</p>
        ) : (
          <>
            {activeTab === 0 && (
              <>
               <div style={{ marginTop: "2rem" }}>
                  <button
                  className="m-button-7" 
    
            style={{ marginLeft: '10px', backgroundColor: '#f16f06', color: 'white' }} 
                    onClick={() => setShowMeetingForm(!showMeetingForm)}
                  >
                    {showMeetingForm ? "Cancel" : "➕ Add Meeting"}
                  </button>
                </div>

           
               
                {showMeetingForm && (
                  <>
                    <hr style={{ margin: '2rem 0' }} />
                    <h3>Add New Meeting</h3>
                    <form onSubmit={handleMeetingSubmit}>
                      <ul>
                        <li className="form-row">
                          <h4>Meeting Name<sup>*</sup></h4>
                          <div className="multipleitem">
                            <input
                              type="text"
                              name="meetingName"
                              value={meetingForm.meetingName}
                              onChange={handleMeetingChange}
                              required
                            />
                          </div>
                        </li>

                        <li className="form-row">
                          <h4>Date & Time<sup>*</sup></h4>
                          <div className="multipleitem">
                            <input
                              type="datetime-local"
                              name="datetime"
                              value={meetingForm.datetime}
                              onChange={handleMeetingChange}
                              required
                            />
                          </div>
                        </li>

                        <li className="form-row">
                          <h4>Agenda<sup>*</sup></h4>
                          <div className="multipleitem">
                            <textarea
                              name="agenda"
                              value={meetingForm.agenda}
                              onChange={handleMeetingChange}
                              required
                            />
                          </div>
                        </li>

                        <li className="form-row">
                          <h4>Mode<sup>*</sup></h4>
                          <div className="multipleitem">
                            <select
                              name="mode"
                              value={meetingForm.mode}
                              onChange={handleMeetingChange}
                            >
                              <option value="online">Online</option>
                              <option value="offline">Offline</option>
                            </select>
                          </div>
                        </li>

                        {meetingForm.mode === 'online' && (
                          <li className="form-row">
                            <h4>Meeting Link<sup>*</sup></h4>
                            <div className="multipleitem">
                              <input
                                type="text"
                                name="link"
                                value={meetingForm.link}
                                onChange={handleMeetingChange}
                                required
                              />
                            </div>
                          </li>
                        )}

                        {meetingForm.mode === 'offline' && (
                          <li className="form-row">
                            <h4>Venue<sup>*</sup></h4>
                            <div className="multipleitem">
                              <input
                                type="text"
                                name="venue"
                                value={meetingForm.venue}
                                onChange={handleMeetingChange}
                                required
                              />
                            </div>
                          </li>
                        )}

                        <li className="form-row">
                          <div className="multipleitem">
                            <button type="submit" className="submitbtn">Create</button>
                          </div>
                        </li>
                      </ul>
                    </form>
                  </>
                )}
                     <Edit data={eventData} id={id} />

              </>
            )}
          <hr style={{ margin: '2rem 0' }} />
<h3>Existing Meetings</h3>
{meetings.length === 0 ? (
  <p>No meetings added yet.</p>
) : (
  <table className="table-class">
    <thead>
      <tr>
        <th>Meeting Name</th>
        <th>Mode</th>
        <th>Date & Time</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      {meetings.map((meeting) => (
        <tr key={meeting.id}>
          <td>{meeting.meetingName}</td>
          <td>{meeting.mode}</td>
       <td>
  {meeting.datetime?.seconds
    ? formatDateTime(meeting.datetime.seconds)
    : 'N/A'}
</td>

          <td>
         <button
 className="m-button-7" 
    
            style={{ marginLeft: '10px', backgroundColor: '#f16f06', color: 'white' }} 
  onClick={() =>
    router.push(`/admin/event/addmeeting/${meeting.id}?conclaveId=${id}`)
  }
>
  ✎ Edit
</button>

          </td>
        </tr>
      ))}
    </tbody>
  </table>
)}

          </>
        )}
      </section>
    </Layout>
  );
};

export default EditAdminEvent;
