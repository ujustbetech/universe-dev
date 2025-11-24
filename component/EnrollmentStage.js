import React, { useState, useEffect } from 'react';
import { doc, updateDoc, getDoc ,setDoc,getDocs,collection} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { COLLECTIONS } from "/utility_collection";
import emailjs from '@emailjs/browser';
import axios from 'axios';
import Swal from 'sweetalert2';

const dropdownOptions = {
  'Enrollment Initiation': ['In Progress', 'Completed', 'Not Started'],
  'Enrollment documents mail': ['Sent', 'Pending', 'Need Revision'],
  'Enrollment Fees Mail Status': ['Sent', 'Follow-up Required'],
  'Enrollment fees Option Opted for': ['Upfront', 'Adjustment', 'No Response Adjustment' , 'Upfront Enrollment fees Confirmation'],
  'Enrollments Completion Status': ['Completed', 'Pending', 'Withdrawn']
};
const WHATSAPP_API_URL = 'https://graph.facebook.com/v22.0/527476310441806/messages';
const WHATSAPP_API_TOKEN = 'Bearer EAAHwbR1fvgsBOwUInBvR1SGmVLSZCpDZAkn9aZCDJYaT0h5cwyiLyIq7BnKmXAgNs0ZCC8C33UzhGWTlwhUarfbcVoBdkc1bhuxZBXvroCHiXNwZCZBVxXlZBdinVoVnTB7IC1OYS4lhNEQprXm5l0XZAICVYISvkfwTEju6kV4Aqzt4lPpN8D3FD7eIWXDhnA4SG6QZDZD';
const EnrollmentStage = ({ id, fetchData }) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const options = Object.keys(dropdownOptions); // <-- this line is important

  useEffect(() => {
    const loadData = async () => {
      try {
        const docRef = doc(db, 'Prospects', id);
        const snap = await getDoc(docRef);

        if (snap.exists()) {
          const data = snap.data();
          console.log('Firestore data:', data);

          const savedStages = data?.enrollmentStages || [];

         const merged = options.map((label) => {
  const match = savedStages.find((item) => item.label === label);
  return match || {
    label,
    checked: false,
    date: '',
    status: '',
    sent: false,
    mailStatus: 'Pending'
  };
});


          setRows(merged);
        } else {
          console.log('No document found. Initializing empty state.');
          setRows(options.map((label) => ({
            label,
            checked: false,
            date: '',
            status: '',
          })));
        }
      } catch (err) {
        console.error('Error loading enrollment data:', err);
      }
    };

    loadData();
  }, [id]);
  const sanitizeText = (text) => {
    return text
      .replace(/[\n\t]/g, ' ')          // Replace newlines and tabs with spaces
      .replace(/ {5,}/g, '    ')        // Reduce any 5+ spaces to 4 spaces
      .trim();
  };
  
  const sendAssesmentMessage = async (orbiterName, prospectName, bodyText, phone) => {
    const payload = {
      messaging_product: 'whatsapp',
      to: `91${phone}`,
      type: 'template',
      template: {
        name: 'enrollment_journey',
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
  
  
  
  const handleChange = (index, field, value) => {
    const updated = [...rows];
    updated[index][field] = value;
    setRows(updated);
  };
const generateNextUJBCode = async () => {
  const snapshot = await getDocs(collection(db, COLLECTIONS.userDetail));

  let maxNumber = 0;
  snapshot.forEach(doc => {
    const code = doc.data().UJBCode || doc.id;
    const match = code.match(/\d+/);
    if (match) maxNumber = Math.max(maxNumber, parseInt(match[0]));
  });

  return `UJB${String(maxNumber + 1).padStart(4, "0")}`;
}

const handleSave = async () => {
  try {
    setLoading(true);
    const docRef = doc(db, 'Prospects', id);
    await updateDoc(docRef, {
      enrollmentStages: rows,
    });
    // 🚀 AUTO-CREATE USER ON COMPLETION
const completionStage = rows.find(r => r.label === "Enrollments Completion Status");

if (completionStage?.status === "Completed") {
  
  // 1️⃣ Load prospect data
  const prospectSnap = await getDoc(doc(db, "Prospects", id));
  const p = prospectSnap.data();

  const prospectName = p.prospectName;
  const prospectPhone = p.prospectPhone;
  const email = p.email;

  const orbiterName = p.orbiterName;
  const orbiterPhone = p.orbiterContact;
  const orbiterEmail = p.orbiterEmail;

  // 2️⃣ Generate UJB Code
  const newUjb = await generateNextUJBCode();

  // 3️⃣ Find mentor in usersdetail
  const mentorSnap = await getDocs(collection(db, COLLECTIONS.userDetail));
  const allMentors = mentorSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  const mentor = allMentors.find(m =>
       m.MobileNo === orbiterPhone ||
       m.Email === orbiterEmail ||
       m.Name?.toLowerCase() === orbiterName?.toLowerCase()
   );

  const mentorName = mentor?.Name || orbiterName;
  const mentorPhone = mentor?.MobileNo || orbiterPhone;
  const mentorUjbCode = mentor?.UJBCode || mentor?.id || "";

  // 4️⃣ Save User in usersdetail
  await setDoc(doc(db, COLLECTIONS.userDetail, newUjb), {
      Name: prospectName,
      MobileNo: prospectPhone,
      Category: "Orbiter",
      DOB: "--",
      Email: email,
      Gender: "--",
      UJBCode: newUjb,
      MentorName: mentorName,
      MentorPhone: mentorPhone,
      MentorUJBCode: mentorUjbCode,
      ProfileStatus: "incomplete"
  });

  console.log("🎉 User created:", newUjb);
}

    Swal.fire('Saved!', 'Changes have been saved.', 'success');
  } catch (err) {
    console.error('Error saving data:', err);
    Swal.fire('Error', 'Failed to save changes.', 'error');
  } finally {
    setLoading(false);
  }
};

 
  const handleSendEmail = async (index) => {
    try {
      const { label, date, status } = rows[index];
      const docRef = doc(db, 'Prospects', id);
      const snap = await getDoc(docRef);
      if (!snap.exists()) return;
  
      const { email, prospectName, prospectPhone,orbiterName } = snap.data();
const phone = prospectPhone; // 👈 Now phone is defined



  
let body = '';

switch (label) {
  case 'Enrollment':
    body = `Hi ${prospectName},\n\nYou're successfully enrolled in our program as of ${date}. Stay tuned for the next steps.`;
    break;

  case 'Enrollment documents mail':
    switch (status) {
      case 'Sent':
        body = `Hello ${prospectName},\n\nIt was a pleasure connecting with you. Following our discussion, we are delighted to invite you to join UJustBe as an Orbiter.

As we discussed, we would like this enrollment to be an authentic choice you make to become a part of the UJustBe Universe.  

To proceed, we kindly request you to reply to this email with your approval along with the following documents:

1) Professional Photo (For KYC purposes)
2) PAN Card (For KYC purposes)
3) Aadhar Card (For KYC purposes)
4) Cancelled Cheque Copy (For KYC purposes and to facilitate transfer of UJustBe referral rewards)

Upon receiving the required documents, the UJustBe team will guide you through the next steps of the process.`;
        break;
      case 'Pending':
        body = `Hi ${prospectName},\n\nYou are just one step away from fully stepping into the UJustBe Universe and unlocking a world of possibilities, collaborations, and meaningful connections!
 
We noticed your enrollment documents are yet to be completed. To move forward and activate your journey, we invite you to connect with your MentOrbiter or speak with our UJustBe Support Team—they're here to walk with you and support you every step of the way.
We are excited to witness the contribution and value you’ll bring to the community. Let’s get you fully onboarded! 

 .`;
        break;
      case 'Need Revision':
        body = `Hi ${prospectName},\n\nYou are just one step away from completing your enrolment in UJustBe Universe and exploring a space filled with possibilities, collaboration, and contribution!
 
We have noticed that your enrollment documents require a few revisions. To move forward and complete your onboarding, we invite you to connect with your MentOrbiter or the UJustBe Support Team. They are here to guide you and ensure you have everything you need to take this next step confidently.
 
We are excited for the unique value you’ll bring into the community. Let’s get your journey officially started! `;
        break;
   
      default:
        body = `Hi ${prospectName},\n\nYou've opted for ${status} as your payment method. If any change is needed, please let us know.`;
    }
   
    break;

  case 'Enrollment Fees Mail Status':
    switch (status) {
      case 'Sent':
        body = `Hi ${prospectName},\n\nThank you for making an authentic choice in becoming an Orbiter in the UJustBe Universe.

        Below are the details regarding the one-time Orbiter Enrollment Fee:
        
        Orbiter Enrollment Fee
        Amount: Rs. 1,000 (Lifetime)
        
        You are invited to choose one of the following payment methods:
        
        Direct Payment to UJustBe's Account:
        You can directly transfer the enrollment fee to UJustBe’s account. Once your referral is closed, the reciprocation amount will be credited directly to your account registered with UJustBe.
        
        Adjustment from Referral Reciprocation:
        The enrollment fee will be adjusted against your referral reciprocation. Once the adjustment is completed, subsequent referral reciprocation fees will be transferred to your account.
        
        Next Steps:
        Please confirm your choice by replying to this email with one of the options below:
        
        Option 1: I would like to pay the Orbiter Registration Fee of Rs. 1000/- directly to UJustBe.
        Option 2: Kindly adjust the Orbiter Registration Fee from the referral reciprocation.
        
        Once we receive your confirmation, we will send you an invoice and guide you through the next steps to complete the process.
        
        If you have any questions or need further assistance, please feel free to reach out. We look forward to your confirmation.`;
        break;
   
      case 'Follow-up Required':
        body = `Hi ${prospectName},\n\nJust following up to check in on your decision regarding the enrollment fees for joining the UJustBe Universe. This step will help activate your onboarding and open the door to powerful connections, collaborations, and opportunities aligned with your growth journey.
If you have any questions or need clarity, please feel free to speak with your MentOrbiter or connect with our UJustBe Support Team. 
 
We are here to support you in making an empowered decision.
 
Looking forward to welcoming you fully into the Universe! `;
        break;
   
  
    }
  
   
    break;

  case 'Enrollment fees Option Opted for':
    switch (status) {
      case 'Upfront':
        body = `Hi ${prospectName},\n\nThank you for confirming your choice to pay the Orbiter Registration Fee of Rs. 1,000/- directly to UJustBe. 

We kindly request you to complete the payment and submit the payment screenshot to us within 2 working days. Please ensure the screenshot clearly mentions the transaction ID and amount for reference. You may reply to this email with the attachment or send it to support@ujustbe.com. 

Payment Details for Direct Transfer 
Account Name: UJustBe Enterprise  
Account Number: [Insert Account Number] 
Bank Name: [Insert Bank Name] 
IFSC Code: [Insert IFSC Code] 

If we do not receive the payment details within the stipulated time, we will automatically proceed with Option 2 (adjustment from referral reciprocation) and initiate your Orbiter journey accordingly. 

A separate email will be sent to confirm the adjustment and the next steps. 

We look forward to your prompt response. Should you have any questions or need assistance, please do not hesitate to reach out to us. `;
        break;
      case 'Adjustment':
        body = `Hi ${prospectName},\n\nThank you for confirming your choice to adjust the Orbiter Registration Fee of Rs. 1,000/- from your referral reciprocation. 

 

We have noted your preference and will proceed accordingly. The enrollment fee will be deducted from the referral reciprocation, and the remaining balance will be transferred to your registered account as per the standard timelines. 

 

Your Orbiter journey in the UJustBe Universe has now officially begun. We are happy to have you as part of UJustBe Universe and look forward to your active participation. 

 

Should you have any questions or need further assistance, please feel free to reach out to us. We are here to support you in every step of your journey. 

 .`;
        break;
      case 'No Response Adjustment':
        body = `Hi ${prospectName},\n\nWe hope this email finds you well. 

Since we have not received the payment screenshot for the Orbiter Registration Fee of Rs. 1,000/- within the stipulated 2 working days, we have proceeded with Option 2: adjustment of the enrollment fee from your referral reciprocation. 

Your Orbiter journey in the UJustBe Universe has now been initiated. The enrollment fee will be deducted from your referral reciprocation, and any subsequent referral reciprocation amounts will be credited directly to your registered account as per standard timelines. 

If you have any questions or require further assistance, please feel free to reach out to us. We are excited to have you as part of the UJustBe Universe and look forward to your active participation in our community. `;
        break;
      case 'Confirmation recieved':
        body = `Hi ${prospectName},\n\nWe are pleased to confirm that we have received your payment of Rs. 1,000/- towards the Orbiter Enrollment Fee. Thank you for completing this step to officially begin your journey in the UJustBe Universe. 

Your payment has been successfully processed, and we are excited to have you as an active Orbiter in our community. You will soon receive further communication regarding the next steps and how you can start contributing, connecting, and growing with the UJustBe Universe. 

Should you have any questions or need assistance, please feel free to reach out to us. Once again, welcome aboard! `;
        break;
      default:
        body = `Hi ${prospectName},\n\nYou've opted for ${status} as your payment method. If any change is needed, please let us know.`;
    }
    break;

  case 'Enrollments Completion Status':
    switch (status) {
      case 'Completed':
        body = `Dear ${prospectName},\n\nWelcome to the UJustBe Universe!

        Thank you for making the authentic choice to become an Orbiter in this thriving community. We are delighted to have you join us on this exciting journey. Below is an overview of your journey path within the UJustBe Universe:
        
        - Orbiter – Your initiation into the UJustBe Universe, where meaningful relationships begin to form, holistic health is nurtured, and the foundation of wealth is laid through connections and growth.

        - Monthly Meeting Journey – Participate in interactive monthly meetings designed to strengthen relationships, enhance emotional and mental well-being, and provide insights for personal and professional wealth-building.

        - Referral Journey – Share genuine referrals with CosmOrbiters to expand opportunities, build trust within the Universe, and cultivate mutual growth.

        - Active Orbiter – Take an active role in the Universe through consistent engagement, nurturing deeper relationships, maintaining personal well-being, and creating pathways for sustainable wealth.

        - CosmOrbiter – Elevate your journey by listing your business or profession, leveraging the UJustBe network to expand opportunities and build professional relationships.

        - Accelerated Orbiter – Blend the power of authentic referrals and active participation in UJustBe events to accelerate your journey, unlock new opportunities, and strengthen community bonds.

        - CCAO (Consistent Contributing Active Orbiter) – Achieve this status through regular contributions that enrich relationships, foster a balanced lifestyle, and drive meaningful impact.

        - MentOrbiter – Lead by inviting and enrolling your network. Empower them to build fulfilling relationships, nurture well-being, and create wealth through the UJustBe Universe.
        
        This journey invites you to embrace a balanced approach to life, uniting Relationship, Health, and Wealth to create a fulfilling experience within the UJustBe Universe.
        
        To support you, our dedicated Support Team, Nucleus Team, and your MentOrbiter ([Name of MentOrbiter]) will guide and assist you every step of the way.
        
        We are excited to see your growth and contributions. Let’s create meaningful connections and experiences together!
        
        If you have any questions or need assistance, please feel free to reach out to us.`;
        break;
   
      case 'Withdrawn':
        body = `Hi ${prospectName},\n\nWe wanted to let you know that we have received your decision to withdraw from the UJustBe enrollment process at this time.
 
While we understand and respect your decision, please know that we are always here for you. If you ever choose to reconsider or would like to explore the benefits of rejoining, feel free to reach out. Your journey with us is important, and we’re always ready to support your growth when the time is right.
 
Thank you for considering UJustBe, and we hope to have the opportunity to welcome you back in the future. `;
        break;
   
  
    }
  
    break;

  default:
    body = `Hello ${prospectName},\n\nUpdate regarding: ${label} on ${date}. Status: ${status}`;
}

      let bodytext = '';

      switch (label) {
        case 'Enrollment':
          bodytext = `Hi ${prospectName},\n\nYou're successfully enrolled in our program as of ${date}. Stay tuned for the next steps.`;
          break;
      
        case 'Enrollment documents mail':
          switch (status) {
            case 'Sent':
              bodytext = `Hello ${prospectName},\n\nIt was a pleasure connecting with you! 
      
      As discussed, we are happy to invite you to join UJustBe as an Orbiter.
      
      We have shared an email with the details and next steps. Kindly check it and share requested documents at your earliest convenience.
      
      Looking forward to welcoming you into the UJustBe Universe! `;
              break;
            case 'Pending':
              bodytext = `Hi ${prospectName},\n\nYou are just one step away from becoming an Orbiter in the UJustBe Universe!

Some enrollment documents are still pending—feel free to reach out to your MentOrbiter or connect with the UJustBe Support Team to complete the process.

We are here to support you and can’t wait to see your journey unfold! `;
              break;
            case 'Need Revision':
              bodytext = `Hi ${prospectName},\n\nAs there is no response from your end we are going ahead with default option as adjustment of Enrollment fees against the referral reciprocation. 

We’ve shared an email with the details with the process.`;
              break;
           
            default:
              bodytext = `Hi ${prospectName},\n\nYou've opted for ${status} as your payment method. If any change is needed, please let us know.`;
          }
         
          break;
      
        case 'Enrollment Fees Mail Status':
          switch (status) {
            case 'Sent':
              bodytext = `Hi ${prospectName},\n\nThank you for making an authentic choice to become an Orbiter in the UJustBe Universe 🌟
      
      We have shared an email with the details of the one-time Orbiter Enrollment Fee (Rs. 1,000) and the available payment options.
      
      Kindly check your email and confirm your preferred option by replying there. Once we receive your confirmation, we will guide you through the next steps.`;
              break;
       
            case 'Follow-up Required':
              bodytext = `Hi ${prospectName},\n\nJust checking in to follow up on your decision regarding the enrollment fees for joining the UJustBe Universe.

If you have any questions or need support, please connect with your MentOrbiter or our UJustBe Support Team.
We are here to walk this journey with you! `;
              break;
           
           
          }
      
          break;
      
        case 'Enrollment fees Option Opted for':
          switch (status) {
            case 'Upfront':
              bodytext = `Hi ${prospectName},\n\nThank you for confirming with your option of paying Enrollment fees upfront. 

We’ve shared an email with the details for the payment. 

Kindly check your email and confirm once you make the payment. Once we receive your confirmation, we’ll share the invoice and guide you through the next steps. 

Let us know if you need any help! !`;
              break;
            case 'Adjustment':
              bodytext = `Hi ${prospectName},\n\nThank you for confirming with your option of Adjustment of your one time enrolment fees against the referral reciprocation. 

Kindly check your email and allow us to guide you through the next steps. 

Let us know if you need any help!  `;
              break;
            case 'No Response Adjustment':
              bodytext = `Hi ${prospectName},\n\nAs there is no response from your end we are going ahead with default option as adjustment of Enrollment fees against the referral reciprocation. 

We’ve shared an email with the details with the process.`;
              break;
            case 'Confirmation recieved':
              bodytext = `Hi ${prospectName},\n\nThank you for making the payment towards the One time Enrollment fees - Upfront 

We’ve shared an email with the details with the process. `;
              break;
            default:
              bodytext = `Hi ${prospectName},\n\nYou've opted for ${status} as your payment method. If any change is needed, please let us know.`;
          }
          break;
      
        case 'Enrollments Completion Status':
          switch (status) {
            case 'Completed':
              bodytext = `Dear ${prospectName},\n\n Welcome to the UJustBe Universe! 
      
              We are happy to welcome you as an Orbiter in the UJustBe Universe! 
              
              Your journey here is about building meaningful relationships, nurturing holistic health, and creating wealth through shared growth.
              
              Start with: 
            Monthly Meetings 
              Identifying authentic referrals 
              Engaging actively in the community 
              Growing into roles like CosmOrbiter, Accelerated Orbiter, MentOrbiter & more!
              
              You’ll be supported by your MentOrbiter and our Support & Nucleus Team throughout the way. 
              
              Please check your mail for more details.`;
              break;
       
            case 'Withdrawn':
              bodytext = `Hi ${prospectName},\n\nWe have noted that you have decided to withdraw from the enrollment process for now.

If you ever choose to reconsider or need more details, we’re here to support you whenever you’re ready.

Thank you for considering UJustBe, and we hope to reconnect in the future! `;
              break;
           
            default:
              bodytext = `Hi ${prospectName},\n\nYour Status is ${status}. If any change is needed, please let us know.`;
          }
         
       
          break;
      
        default:
          bodytext = `Hello ${prospectName},\n\nUpdate regarding: ${label} on ${date}. Status: ${status}`;
      }
      
      const templateParams = {
        to_email: email,
        prospect_name: prospectName || 'Prospect',
        body,
      };
  
      await emailjs.send(
        'service_acyimrs',
        'template_cdm3n5x',
        templateParams,
        'w7YI9DEqR9sdiWX9h'
      );
  
      alert(`Email sent for "${label}"`);
      await sendAssesmentMessage(orbiterName, prospectName, bodytext, phone);
    } catch (err) {
      console.error('Error sending email:', err);
    }
  };
  
  const confirmAndSendEmail = (index) => {
    Swal.fire({
      title: 'Are you sure?',
      text: "Do you want to send the email?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, send it!',
    }).then((result) => {
      if (result.isConfirmed) {
        handleSendEmail(index);
      }
    });
  };

  const confirmAndSave = () => {
    Swal.fire({
      title: 'Are you sure?',
      text: "Do you want to save the changes?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, save it!',
    }).then((result) => {
      if (result.isConfirmed) {
        handleSave();
      }
    });
  };

  return (
    <div>
      <h2>Enrollment Status Updates</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ backgroundColor: '#f2f2f2' }}>
            <th>Check</th>
            <th>Stage</th>
            <th>Date</th>
            <th>Status</th>
            <th>Send Email</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.label}>
              <td>
                <input
                  type="checkbox"
                  checked={row.checked}
                  onChange={(e) => handleChange(index, 'checked', e.target.checked)}
                />
              </td>
              <td>{row.label}</td>
              <td>
                <input
                  type="date"
                  value={row.date}
                  onChange={(e) => handleChange(index, 'date', e.target.value)}
                />
              </td>
           <td>
  <select
    value={row.status}
    onChange={(e) => handleChange(index, 'status', e.target.value)}
  >
    <option value="">Select</option>
    {(dropdownOptions[row.label] || []).map((opt) => (
      <option key={opt} value={opt}>{opt}</option>
    ))}
  </select>
</td>

              <td>
                <button
                  className="m-button-7"
                  onClick={() => confirmAndSendEmail(index)}
                >
                  Send
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className='button-group'>
        <button
          className='save-button'
          onClick={confirmAndSave}
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
};

export default EnrollmentStage;