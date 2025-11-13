import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc,collection,getDocs } from 'firebase/firestore';
import axios from 'axios';
import emailjs from '@emailjs/browser';
import { db } from '../firebaseConfig';

const Followup = ({ id, data = { followups: [], comments: [] ,event: [] }, fetchData }) => {
  const [followup, setFollowup] = useState([]);
  const [docData, setDocData] = useState({});
  const [loading, setLoading] = useState(false);
  const [comment, setComment] = useState('');
  const [NTphone, setNTPhone] = useState('');
  const [Name, setName] = useState('');
  const [comments, setComments] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventMode, setEventMode] = useState('online');
  const [zoomLink, setZoomLink] = useState('');
  const [userList, setUserList] = useState([]);
  const [venue, setVenue] = useState('');
  const [eventCreated, setEventCreated] = useState(null);
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [createMode, setCreateMode] = useState(false);
  const [rescheduleMode, setRescheduleMode] = useState(false);
  const WHATSAPP_API_URL = 'https://graph.facebook.com/v22.0/527476310441806/messages';
  const WHATSAPP_API_TOKEN = 'Bearer EAAHwbR1fvgsBOwUInBvR1SGmVLSZCpDZAkn9aZCDJYaT0h5cwyiLyIq7BnKmXAgNs0ZCC8C33UzhGWTlwhUarfbcVoBdkc1bhuxZBXvroCHiXNwZCZBVxXlZBdinVoVnTB7IC1OYS4lhNEQprXm5l0XZAICVYISvkfwTEju6kV4Aqzt4lPpN8D3FD7eIWXDhnA4SG6QZDZD';
  const formatReadableDate = (inputDate) => {
    const d = new Date(inputDate);
    const day = String(d.getDate()).padStart(2, '0');
    const month = d.toLocaleString('en-GB', { month: 'long' });
    const year = String(d.getFullYear()).slice(-2);
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
  
    hours = hours % 12 || 12;
  
    return `${day} ${month} ${year} at ${hours}.${minutes} ${ampm}`;
  };
  useEffect(() => {
    const fetchData = async () => {
      const docRef = doc(db, 'Prospects', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setDocData(data);
        setFollowup(data.followup || []);
        setComments(data.comments || []);
        if (data.event) {
          setEventCreated(data.event);
        }
      }
    };

    fetchData();
  }, [id]);

  const handleSendComment = async () => {
    if (!comment.trim()) return;

    const newComment = {
      text: comment.trim(),
      timestamp: new Date().toISOString(),
    };

    const updatedComments = [newComment, ...comments];

    try {
      const docRef = doc(db, 'Prospects', id);
      await updateDoc(docRef, { comments: updatedComments });
      setComments(updatedComments);
      setComment('');
    } catch (err) {
      console.error('Error adding comment:', err);
    }
  };

 
  const handleCreateOrReschedule = async () => {
    if (!eventDate.trim()) return alert('Please select a date');
    const formattedEventDate = formatReadableDate(eventDate);
  
    const eventDetails = {
      date: formattedEventDate, 
      mode: eventMode,
      zoomLink: eventMode === 'online' ? zoomLink : '',
      venue: eventMode === 'offline' ? venue : '',
      reason: rescheduleMode ? rescheduleReason : '',
    
    };
  
    try {
      const docRef = doc(db, 'Prospects', id);
      await updateDoc(docRef, { event: eventDetails });
      setEventCreated(eventDetails);
  
   
  
      alert(rescheduleMode ? 'Event rescheduled successfully!' : 'Event created successfully!');
      setCreateMode(false);
      setRescheduleMode(false);
      setRescheduleReason('');
  
      // WhatsApp messages
     const messages = [
  {
    name: data.prospectName,
    phone: data.prospectPhone,
    date: formattedEventDate,
    zoomLink: eventMode === 'online' ? zoomLink : '',
    venue: eventMode === 'offline' ? venue : ''
  },
  {
    name: data.orbiterName,
    phone: data.orbiterContact,
    date: formattedEventDate,
    zoomLink: eventMode === 'online' ? zoomLink : '',
    venue: eventMode === 'offline' ? venue : ''
  }
];

  
   for (const msg of messages) {
  await sendWhatsAppMessage({
    ...msg,
    isReschedule: rescheduleMode,
    reason: rescheduleReason,
    venue: eventMode === 'offline' ? venue : ''
  });
}

  
      // Send email to prospect
  await sendEmailToProspect(
  data.prospectName,
  data.email,
  formattedEventDate,
  eventMode === 'online' ? zoomLink : '',
  rescheduleMode,
  rescheduleReason,
  eventMode === 'offline' ? venue : ''
);

  
    } catch (error) {
      console.error('Error saving event or sending messages:', error);
    }
  };


const sendEmailToProspect = async (prospectName, email, date, zoomLink, isReschedule = false, reason = '', venue = '') => {
 const scheduleDetails = zoomLink
  ? `Zoom Link: ${zoomLink}`
  : venue
    ? `Venue: ${venue}`
    : 'Details will be shared soon';

const body = isReschedule
  ? `Dear ${prospectName},

As you are aware, due to ${reason}, we need to reschedule our upcoming call.

We are available for the call on ${date}. Please confirm if this works for you, or let us know a convenient time within the next two working days so we can align accordingly.`
  : `Thank you for confirming your availability. We look forward to connecting with you and sharing insights about UJustBe and how it fosters meaningful contributions in the areas of Relationship, Health, and Wealth.

Schedule details:

Date: ${date}  
${scheduleDetails}

Our conversation will be an opportunity to explore possibilities, answer any questions you may have, and understand how UJustBe aligns with your aspirations.

Looking forward to speaking with you soon! `;

  const templateParams = {
    prospect_name: prospectName,
    to_email: email,
    body,
  };

  try {
    await emailjs.send(
      'service_acyimrs',
      'template_cdm3n5x',
      templateParams,
      'w7YI9DEqR9sdiWX9h'
    );

    console.log(`✅ Email sent to ${prospectName} (${email})`);
  } catch (error) {
    console.error(`❌ Failed to send email to ${prospectName}:`, error);
  }
};

  
const sendWhatsAppMessage = async ({
  name,
  phone,
  date,
  zoomLink,
  isReschedule = false,
  reason = '',
  venue = ''
}) => {
  const payload = {
    messaging_product: 'whatsapp',
    to: `91${phone}`,
    type: 'template',
    template: {
      name: isReschedule ? 'reschedule_meeting_otc' : 'schedule_message_otc',
      language: { code: 'en' },
      components: [
        {
          type: 'body',
          parameters: isReschedule
            ? [
                { type: 'text', text: name },
                { type: 'text', text: reason },
                { type: 'text', text: date }
              ]
            : [
                { type: 'text', text: name },
                { type: 'text', text: date },
                {
                  type: 'text',
                  text: zoomLink
                    ? `Zoom Link: ${zoomLink}`
                    : `Venue: ${venue}`
                }
              ]
        }
      ]
    }
  };

  try {
    await axios.post(WHATSAPP_API_URL, payload, {
      headers: {
        Authorization: WHATSAPP_API_TOKEN,
        'Content-Type': 'application/json'
      }
    });

    console.log(`✅ WhatsApp message sent to ${name} (${phone})`);
  } catch (err) {
    console.error(`❌ Failed to send message to ${name}:`, err.response?.data || err.message);
  }
};


// Function to send thank you message
const sendThankYouMessage = async (name, phone) => {
  const payload = {
    messaging_product: 'whatsapp',
    to: `91${phone}`,
    type: 'template',
    template: {
      name: 'meeeting_done_thankyou_otc',
      language: { code: 'en' },
      components: [
        {
          type: 'body',
          parameters: [{ type: 'text', text: name }]
        }
      ]
    }
  };

  try {
    await axios.post(WHATSAPP_API_URL, payload, {
      headers: {
        Authorization: WHATSAPP_API_TOKEN,
        'Content-Type': 'application/json',
      },
    });
    console.log(`✅ Message sent to ${name}`);
  } catch (error) {
    console.error(`❌ Failed to send message to ${name}`, error.response?.data || error.message);
  }
}; 
 useEffect(() => {
        const fetchUsers = async () => {
          try {
            const userRef = collection(db, 'userdetails');
            const snapshot = await getDocs(userRef);
            const data = snapshot.docs.map(doc => ({
              id: doc.id,
              name: doc.data()[" Name"],
              phone: doc.data()["Mobile no"],
              Email: doc.data()["Email"]
            }));
            setUserList(data);
          } catch (error) {
            console.error('Error fetching users:', error);
          }
        };
    
        fetchUsers();
      }, []);

const handleSearchUser = (e) => {
    const value = e.target.value.toLowerCase();
    setUserSearch(value);
    const filtered = userList.filter(user =>
        user.Name && user.Name.toLowerCase().includes(value) // Check if name exists
    );
    setFilteredUsers(filtered);
};

const handleSelectUser = (user) => {
    setName(user.Name);
    setNTPhone(user.NTphone);
    setUserSearch('');
    setFilteredUsers([]);
};
const sendThankYouEmail = async (recipientName, recipientEmail) => {
  const body = `Dear ${recipientName},

Thank you for taking the time to connect with us. It was a pleasure learning about your interests and sharing how UJustBe creates meaningful contributions in the areas of Relationship, Health, and Wealth. We truly value the time and energy you invested in this conversation.

As you reflect on our discussion, we hope you consider how being part of the UJustBe Universe can contribute to building stronger connections, enhancing well-being, and creating possibilities for growth and collaboration. Should you have any questions or require further clarity, we are here to support you.

Regardless of your choice, we are grateful for the opportunity to connect with you and would love to stay in touch. UJustBe is a space where contributions in all aspects of life lead to shared progress and empowerment, and we hope to welcome you into this journey whenever it feels right for you.`;

  const templateParams = {
    prospect_name: recipientName,
    to_email: recipientEmail,
    body,
  };

  try {
    await emailjs.send(
      'service_acyimrs',
      'template_cdm3n5x',
      templateParams,
      'w7YI9DEqR9sdiWX9h'
    );
    console.log(`✅ Thank you email sent to ${recipientName}`);
  } catch (error) {
    console.error(`❌ Failed to send thank you email to ${recipientName}:`, error);
  }
};



// Button handler
const handleMeetingDone = async () => {
  try {
    if (!data) return alert("Prospect data not available");

    const messagesToSend = [
      {
        name: data.prospectName,
        phone: data.prospectPhone,
        email: data.email, // <-- assuming prospect's email is here
      },
      {
        name: data.orbiterName,
        phone: data.orbiterContact,
        email: data.orbiterEmail, // <-- optional if available
      },
    ];

    for (const msg of messagesToSend) {
      await sendThankYouMessage(msg.name, msg.phone);
      if (msg.email) {
        await sendThankYouEmail(msg.name, msg.email);
      }
    }

    alert("Thank you messages sent successfully!");
  } catch (error) {
    console.error('Meeting Done Error:', error);
    alert("Something went wrong while sending messages.");
  }
};


  return (
    <div>
      <h2>Meeting Schedule Logs</h2>

      {/* Event Section */}
 


        {!createMode && !eventCreated && (
         <button
         className='m-button-7'
         style={{ float: 'right' }}
         onClick={() => setCreateMode(true)}
       >
         Schedule Meet
       </button>
       
        )}

        {eventCreated && !rescheduleMode && (
          <>
        <div className='event-card'>
  <h4>Event Details</h4>
  <p><strong>Date:</strong> {eventCreated.date}</p>
  <p><strong>Mode:</strong> {eventCreated.mode}</p>
  {eventCreated.mode === 'online' ? (
    <p><strong>Zoom Link:</strong> <a href={eventCreated.zoomLink} target='_blank' rel='noopener noreferrer'>{eventCreated.zoomLink}</a></p>
  ) : (
    <p><strong>Venue:</strong> {eventCreated.venue}</p>
  )}
   <ul>
      <li className='form-row'>
      <div className='twobtns'>
    <button className='m-button-7' onClick={() => {
              setEventDate(eventCreated.date);
              setEventMode(eventCreated.mode);
              setZoomLink(eventCreated.zoomLink || '');
              setVenue(eventCreated.venue || '');
              setRescheduleMode(true);
            }}>
              Reschedule
            </button>
            <button className='submitbtn' onClick={handleMeetingDone}>
    Done
  </button>
            </div>
            </li>
            </ul>
</div>

           
          </>
        )}

        {(createMode || rescheduleMode) && (
            <section className='c-form box'>
   <ul>
            <li className='form-row'>
            <h4>Date:<sup>*</sup></h4>
            <div className='multipleitem'>
              <input
                type='datetime-local'
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
              />
            </div>
            </li>
            {rescheduleMode && (
  <li className='form-row'>
    <h4>Reason for Rescheduling:<sup>*</sup></h4>
    <div className='multipleitem'>
      <textarea
        placeholder='Enter reason for rescheduling'
        value={rescheduleReason}
        onChange={(e) => setRescheduleReason(e.target.value)}
        rows={3}
        style={{ width: '100%' }}
      />
    </div>
  </li>
)}
      {/* <ul>
                    <li className='form-row'>
                    <h4>Select NT Member:<sup>*</sup></h4>
                    <div className='multipleitem'>
                        <input
                            type="text"
                            placeholder="Search NTMember"
                            value={userSearch}
                            onChange={handleSearchUser}
                        />
                        {filteredUsers.length > 0 && (
                            <ul className="dropdown">
                                {filteredUsers.map(user => (
                                    <li key={user.id} onClick={() => handleSelectUser(user)}>
                                        {user.Name}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </li>
                <li className='form-row'>
                    <h4>Selected NTMember's Name:<sup>*</sup></h4>
                    <div className='multipleitem'>
                        <p>{Name}</p>
                    </div>
                </li>
                <li className='form-row'>
                    <h4>Selected NTMember's Phone:<sup>*</sup></h4>
                    <div className='multipleitem'>
                        <p>{NTphone}</p>
                    </div>
                </li>
                </ul> */}
           
            {!rescheduleMode && (
              <>
          
                <li className='form-row'>
                            <h4>Event Mode:</h4>
                            <div className='multipleitem'>
                            <select
                    value={eventMode}
                    onChange={(e) => setEventMode(e.target.value)}
                  >
                                   <option value='online'>Online</option>
                    <option value='offline'>Offline</option>
                  </select>
                            </div>
                        </li>
                {eventMode === 'online' && (
                  <li className='form-row'>
                    <label>Zoom Link:</label>
                    <div className='multipleitem'>
                    <input
                      type='text'
                      placeholder='Enter Zoom link'
                      value={zoomLink}
                      onChange={(e) => setZoomLink(e.target.value)}
                    />
                    </div>
                  </li>
               
                )}
   
                {eventMode === 'offline' && (
                  <div className='form-row'>
                    <label>Venue:</label>
                    <div className='multipleitem'>
                    <input
                      type='text'
                      placeholder='Enter venue address'
                      value={venue}
                      onChange={(e) => setVenue(e.target.value)}
                    />
                    </div>
                  </div>
                )}
              </>
            )}
  <ul>
                        <li className='form-row'>
                            <div className='multipleitem'>
            <button className='submitbtn' onClick={handleCreateOrReschedule}>
              {rescheduleMode ? 'Reschedule' : 'Schedule'}
            </button>
            </div>
            </li>
            </ul>
      </ul>
          </section>
        )}
   

      {/* Comments Section */}
     
  <div >
  <h3>Comments</h3>

  {comments.length === 0 ? (
    <p>No comments yet.</p>
  ) : (
    <div className="comment-list">
      {comments.map((c, idx) => (
        <div key={idx} className="comment-bubble">
          <span className="chat-timestamp">{new Date(c.timestamp).toLocaleString()}</span>
          <p>{c.text}</p>
        </div>
      ))}
    </div>
  )}

  <div className="chat-input-area">
    <textarea
      value={comment}
      onChange={(e) => setComment(e.target.value)}
      placeholder="Write your message..."
      rows={2}
      className="chat-textarea"
    />
       <div className='multipleitem'>
    <button onClick={handleSendComment} className='m-button-9'>Send</button>
    </div>
  </div>
</div>



</div>

  );
};

export default Followup;
