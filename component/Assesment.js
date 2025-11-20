import React, { useState, useEffect } from 'react';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import emailjs from '@emailjs/browser';
import "../src/app/styles/main.scss";
import { COLLECTIONS } from "/utility_collection";
import axios from 'axios';
import Swal from 'sweetalert2';

const Assessment = ({ id, fetchData }) => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [declineReason, setDeclineReason] = useState('');

  const WHATSAPP_API_URL = 'https://graph.facebook.com/v22.0/527476310441806/messages';
const WHATSAPP_API_TOKEN = 'Bearer EAAHwbR1fvgsBOwUInBvR1SGmVLSZCpDZAkn9aZCDJYaT0h5cwyiLyIq7BnKmXAgNs0ZCC8C33UzhGWTlwhUarfbcVoBdkc1bhuxZBXvroCHiXNwZCZBVxXlZBdinVoVnTB7IC1OYS4lhNEQprXm5l0XZAICVYISvkfwTEju6kV4Aqzt4lPpN8D3FD7eIWXDhnA4SG6QZDZD';

  // Fetch the status from Firestore
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const docRef = doc(db, COLLECTIONS.prospect, id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setStatus(docSnap.data().status || 'No status yet');
       setDeclineReason(docSnap.data().declineReason || '');

        }
      } catch (error) {
        console.error('Error fetching status:', error);
      }
    };

    // Get the current date
    const today = new Date().toLocaleDateString("en-IN", {
      day: 'numeric', month: 'long', year: 'numeric'
    });
    setCurrentDate(today);

    fetchStatus();
  }, [id]);

  const sendAssessmentEmail = async (prospectName, prospectEmail, orbiterName, selectedstatus, formattedDate) => {
    if (!prospectEmail) {
      console.error("🚫 Prospect email is missing");
      return;
    }
  
    let body = '';
  
    switch (selectedstatus) {
      case "Choose to enroll":
        body = `
        Dear ${prospectName}, 

        Subject: 🌟 Welcome to UJustBe Universe – Ready to Make Your Authentic Choice? 

        We are happy to inform you that your enrollment into UJustBe has been approved as we find you are aligned with the basic criteria of UJustBe Universe of being Contributor.

        You have taken the first step toward becoming part of a universe built on authenticity, contribution, and conscious connection. It’s a space where like-minded individuals come together to create meaningful impact — and your presence truly matters.

        Now, we invite you to make your authentic choice:
        To say Yes to this journey.
        To say Yes to discovering, contributing, and growing.
        To say Yes to being part of a community where you just be — and that’s more than enough.

        If this resonates with you, simply reply to this email with your confirmation as Yes. Once we receive your approval, we’ll share the details of the next steps in the enrollment process.
      `;
        break;
  
      case "Declined by UJustBe":
        body = `
        Dear ${prospectName}, 

        Subject: UJustBe Enrollment Update – Non-Alignment with Our Culture and Values 

        Thank you for your interest in becoming a part of the UJustBe Universe. After assessment from our team, we want to inform you that, at this time, we do not find that your values and alignment fully match culture and values of the UJustBe Universe. 

        At UJustBe, we place a strong emphasis on authenticity, contribution, and conscious connection, and these values are the foundation of everything we do. While we recognize the effort you’ve put forth in your journey, we believe that a deep connection to our values is essential in this space.

        We appreciate your understanding and wish you all the best on your path ahead.
      `;
        break;
  
      case "Declined by Prospect":
        body = `
        Subject: Thank You for Your Honest Response

          Dear ${prospectName},
  
          Thank you for taking the time to consider being a part of the UJustBe Universe.
 
We truly value your honesty and respect your decision to not move forward at this time.
 
At UJustBe, we honour authenticity — and your choice is a reflection of that.
 
Saying No is just as important as saying Yes, especially when done consciously and with clarity.
 
Should you ever feel drawn to re-explore this journey of contribution, connection, and conscious living, please know that the doors to the UJustBe Universe will remain open for you.
 
Wishing you continued growth and fulfillment in whichever direction you choose.
        `;
        break;
  
      case "Need some time":
        body = `
        Subject: Holding Space for Your Choice – Response Requested in 5 Working Days
        
          Dear ${prospectName},
  
          Thank you for your honest response and we truly respect that you need some time before making a decision.
 
At UJustBe, we honour authentic choices, and we’re happy to hold space for you. To support our planning, we request you to share your final response within 5 working days.
 
If there is anything you would like to understand better or reflect on together, we are here for you.
        `;
        break;
  
      case "Awaiting response":
        body = `
        Subject: Reminder: Your Spot in UJustBe Awaits Your Authentic Choice

          Dear ${prospectName},
  
         We are writing to gently remind you that your enrollment into the UJustBe Universe has been approved — and we are excited about the possibility of you joining us on this journey.
 
At this stage, we are waiting for your response to take the next steps. If this space resonates with you, we invite you to reply with a Yes to confirm your participation.
 
If you choose not to proceed, we completely respect your decision. Either way, we kindly request you to share your response within 2 working days, so we can plan the way forward accordingly.
 
Looking forward to hearing from you.
        `;
        break;
  
      default:
        body = `
          Dear ${prospectName},
  
          Your current status is: ${selectedstatus}.
        `;
    }
  
    const templateParams = {
      prospect_name: prospectName,
      to_email: prospectEmail,
      body,
      orbiter_name: orbiterName,
    };
  
    try {
      await emailjs.send(
        'service_acyimrs',
        'template_cdm3n5x',
        templateParams,
        'w7YI9DEqR9sdiWX9h'
      );
      console.log("📧 Email sent successfully.");
    } catch (error) {
      console.error("❌ Failed to send email:", error);
    }
  };
  


const sanitizeText = (text) => {
  return text?.replace(/[^a-zA-Z0-9 .,!?'"@#&()\-]/g, ' ') || '';
};

const sendAssesmentMessage = async (orbiterName, prospectName, bodyText, phone) => {
  const payload = {
    messaging_product: 'whatsapp',
    to: `91${phone}`,
    type: 'template',
    template: {
      name: 'enrollment_journey', // Make sure this is correct!
      language: { code: 'en' },
      components: [
        {
          type: 'body',
          parameters: [
      
            { type: 'text', text: sanitizeText(bodyText) },
            { type: 'text', text: sanitizeText(orbiterName) }
          ]
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
    console.log(`✅ WhatsApp message sent to ${prospectName}`);
  } catch (error) {
    console.error(`❌ Failed to send WhatsApp to ${prospectName}`, error.response?.data || error.message);
  }
};

// Helper function to format line breaks
// Helper function to format line breaks for WhatsApp
const formatMessage = (message) => {
  return message.replace(/\\n/g, '\n'); // Replace '\\n' with real newlines
};

const handleSaveStatus = async (selectedstatus, reason = '') => {
  setLoading(true);
  try {
    const docRef = doc(db, COLLECTIONS.prospect, id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      const prospectEmail = data.email;
      const prospectPhone = data.prospectPhone; // 📱 phone field
      const prospectName = data.prospectName;
      const orbiterName = data.orbiterName;

      
      const updateData = { status: selectedstatus };

      if (
        selectedstatus === 'Declined by UJustBe' ||
        selectedstatus === 'Declined by Prospect'
      ) {
        updateData.declineReason = reason;
      }
      
      await updateDoc(docRef, updateData);

     
      // Build body text for WhatsApp with formatMessage function
      let bodyText = '';
  
      if (selectedstatus === "Choose to enroll") {
        bodyText = formatMessage(`Congratulations ${prospectName}! We are Happy to inform you that, your enrollment into UJustBe has been approved! ✨\n\nWe now invite you to make your authentic choice to say Yes to this journey.\n\nKindly check your email for full details and next steps.\n\nLooking forward to your confirmation!`);
      } else if (selectedstatus === "Declined by UJustBe") {
        bodyText = formatMessage(`Hello ${prospectName}, Thank you for your interest in joining UJustBe!\n\nAfter assessment from our team, we want to inform you that we don’t currently find your alignment with UJustBe's core culture and values.\n\nWe wish you the best in your future endeavors and appreciate your understanding.`);
      } else if (selectedstatus === "Declined by Prospect") {
        bodyText = formatMessage(`Hello ${prospectName}, we appreciate your interest in UJustBe!\n\nOur team would like to follow up with you at a later time. Kindly check your email for details, and we’ll be in touch soon.`);
      } else if (selectedstatus === "Need some time") {
        bodyText = formatMessage(`Hello ${prospectName}, Thank you for your honest response and we truly respect that you need some time before making a decision.\n\nWe will hold space for your decision and request you to share your response within 5 working days. This will help us plan the next steps accordingly.\n\nIf you have any questions or need clarity in the meantime, we’re just a message away.`);
      } else {
        bodyText = formatMessage(`Hello ${prospectName}, We are still waiting for your response regarding enrollment in the UJustBe Universe.\n\nWe would be happy to have you with us on this journey of authenticity and contribution.\n\nIf you feel aligned, simply reply Yes here.\n\nIf not, that’s completely okay too.\n\nWe just request you to share your decision within 2 working days, so we can plan accordingly.\n\nLooking forward to hearing from you soon!`);
      }
      
      

      // Send Email (only for "Choose to enroll" or "Declined")
    // Send Email for all statuses
const formattedDate = new Date().toLocaleDateString("en-IN", { day: 'numeric', month: 'long', year: 'numeric' });
await sendAssessmentEmail(prospectName, prospectEmail, orbiterName, selectedstatus, formattedDate);

// Send WhatsApp for all statuses
await sendAssesmentMessage(orbiterName, prospectName, bodyText, prospectPhone);


   

      // Refresh UI
    
      fetchData?.();
      setDeclineReason(''); 
    } else {
      console.error("❌ No such document!");
    }
  } catch (error) {
    console.error("❌ Error saving status or sending email/whatsapp:", error);
  }
  setLoading(false);
};



const confirmSaveStatus = (newStatus) => {
  if (
    newStatus === 'Declined by UJustBe' ||
    newStatus === 'Declined by Prospect'
  ) {
    Swal.fire({
      title: 'Add Reason',
      input: 'textarea',
      inputLabel: 'Reason for declining',
      inputPlaceholder: 'Type your reason here...',
      inputAttributes: {
        'aria-label': 'Type your reason here'
      },
      showCancelButton: true,
      confirmButtonText: 'Submit',
      preConfirm: (reason) => {
        if (!reason) {
          Swal.showValidationMessage('Reason is required');
        }
        return reason;
      }
    }).then((result) => {
      if (result.isConfirmed) {
        const reason = result.value;
        setDeclineReason(reason); // still update local state if needed elsewhere
        handleSaveStatus(newStatus, reason);
      }
    });
  } else {
    Swal.fire({
      title: 'Are you sure?',
      text: `You want to set status as "${newStatus}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, confirm it!'
    }).then((result) => {
      if (result.isConfirmed) {
        handleSaveStatus(newStatus);
      }
    });
  }
};
useEffect(() => {
  const getReason = async () => {
    const docRef = doc(db, COLLECTIONS.prospect, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.status?.startsWith('Declined')) {
        setDeclineReason(data.declineReason || '');
      }
    }
  };
  getReason();
}, [id]);


return (
  <div>
    <h2 className="form-title">Authentic Choice by Prospect</h2>
    <h3>Status: {status || 'No status yet'}</h3>
{status?.startsWith('Declined') && declineReason && (
  <p style={{ marginTop: '10px', color: 'darkred', fontStyle: 'italic' }}>
    Reason: {declineReason}
  </p>
)}

    <div className="status-container">
      <p>Date: {currentDate}</p>
      <div className="twobtns">
        <button
          className="m-button-7"
          onClick={() => confirmSaveStatus('Choose to enroll')}
          disabled={loading}
        >
          Choose to enroll
        </button>
        <button
          className="m-button-7"
          onClick={() => confirmSaveStatus('Declined by UJustBe')}
          disabled={loading}
        >
          Decline by UJustBe
        </button>
        <button
          className="m-button-7"
          onClick={() => confirmSaveStatus('Declined by Prospect')}
          disabled={loading}
        >
          Decline by Prospect
        </button>
        <button
          className="m-button-7"
          onClick={() => confirmSaveStatus('Need some time')}
          disabled={loading}
        >
          Need some time
        </button>
        <button
          className="m-button-7"
          onClick={() => confirmSaveStatus('Awaiting response')}
          disabled={loading}
        >
          Awaiting response
        </button>
      </div>
    </div>
  </div>

);
};

export default Assessment;