import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc,collection,addDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

import 'react-quill/dist/quill.snow.css';
import "../pages/feedback.css";
import emailjs from '@emailjs/browser';
import axios from 'axios';
import dynamic from 'next/dynamic';

// Dynamically import ReactQuill with SSR disabled
const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });



const AditionalInfo = ({ id, data = { sections: [] }, fetchData })     => {
  const [section, setSection] = useState({
    lived: '',
    overviewOfUJB: '',
    whyUJB: '',
    selectionRational: '',
    tangible: '',
    intangible: '',
    vision: '',
    happyFace: '',
  });
  
  
  const [loading, setLoading] = useState(false);
  const WHATSAPP_API_URL = 'https://graph.facebook.com/v22.0/527476310441806/messages';
  const WHATSAPP_API_TOKEN = 'Bearer EAAHwbR1fvgsBOwUInBvR1SGmVLSZCpDZAkn9aZCDJYaT0h5cwyiLyIq7BnKmXAgNs0ZCC8C33UzhGWTlwhUarfbcVoBdkc1bhuxZBXvroCHiXNwZCZBVxXlZBdinVoVnTB7IC1OYS4lhNEQprXm5l0XZAICVYISvkfwTEju6kV4Aqzt4lPpN8D3FD7eIWXDhnA4SG6QZDZD';
  useEffect(() => {
    console.log('Received data:', data);
    if (data.sections?.[0]) {
      setSection(data.sections[0]);
    }
  }, [data]);
  

  const handleInputChange = (value, field) => {
    setSection((prev) => ({ ...prev, [field]: value }));
  };

 const handleSave = async () => {
  setLoading(true);
  console.log('Saving sections:', section);

  try {
    // Update sections in an existing Prospect document
    const existingDocRef = doc(db, 'Prospects', id);
    await updateDoc(existingDocRef, { sections: [section] });


  
      // 3. Generate Form Link dynamically
     const formLink = `https://otc-app.vercel.app/prospectfeedbackform/${id}`;

      console.log("Send this form link to Orbiter: ", formLink);
  
      // 4. Prepare data for Email and WhatsApp
      const orbiterName = data.orbiterName || 'Orbiter';
      const prospectEmail = data.email || 'orbiter@example.com';
      const prospectName = data.prospectName || 'Prospect';
      const formattedDate = new Date().toLocaleDateString('en-GB'); // DD/MM/YYYY
      const phone = data.prospectPhone || '9999999999';
  
      const emailBody = `
  Dear ${prospectName},
  
  It was a pleasure connecting with you and introducing UJustBe! 
  
  We truly appreciate your time and the insights you shared.
  
  To help us move forward meaningfully, we’d love to hear your feedback.
  
  Please take a few minutes to fill out this form: ${formLink}
  
  Thank you!
      `;
  
      // 5. Send Email
      await sendAssessmentEmail(orbiterName, prospectEmail, prospectName, formattedDate, formLink);
  
      // 6. Send WhatsApp Message
      await sendAssesmentMessage(orbiterName, prospectName, emailBody, phone);
  
    } catch (error) {
      console.error('Error saving section or sending notifications:', error);
    }
  
    setLoading(false);
  };
  
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
  
  const sendAssessmentEmail = async (orbiterName, prospectEmail, prospectName, formattedDate, formLink) => {
    const body = `
   Dear  ${prospectName}, 

 

It was a pleasure connecting with you and introducing UJustBe. We truly appreciate your time and the insights you shared during our conversation. 

 

To help us enhance our engagement and proceed further, we would love to hear your feedback. Please take a few moments to fill out the attached feedback form/link and share your thoughts with us within the next two working days. 

Form Link : ${formLink}
 

Your input is valuable, and we look forward to continuing this journey with you. 
    `;
    
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
        console.log("📧 Assessment email sent successfully.");
      } catch (error) {
        console.error("❌ Failed to send assessment email:", error);
      }
    };
  
  return (
<div>
  <div className="prospect-container">
    <h2 className="form-title">UJB Pre Enrollment Assesment Form</h2>
    <ul className="prospect-list">
    <li className='form-row'>
        <h4 className="prospect-label">As lived Experience:<sup>*</sup></h4>
        <div className="editor-wrapper">
          <ReactQuill
            theme="snow"
            placeholder="Lived"
            value={section.lived}
            onChange={(value) => handleInputChange(value, 'lived')}
          />
        </div>
      </li>
   

      <li className='form-row'>
        <h4 className="prospect-label">Overview of UJustBe:<sup>*</sup></h4>
        <div className="editor-wrapper">
          <ReactQuill
            theme="snow"
            value={section.overviewOfUJB}
            onChange={(value) => handleInputChange(value, 'overviewOfUJB')}
          />
        </div>
      </li>

      <li className='form-row'>
        <h4 className="prospect-label">Why UJustBe for Prospect:<sup>*</sup></h4>
        <div className="editor-wrapper">
          <ReactQuill
            theme="snow"
            value={section.whyUJB}
            onChange={(value) => handleInputChange(value, 'whyUJB')}
          />
        </div>
      </li>

      <li className='form-row'>
        <h4 className="prospect-label">Selection Rationale:<sup>*</sup></h4>
        <div className="editor-wrapper">
          <ReactQuill
            theme="snow"
            value={section.selectionRational}
            onChange={(value) => handleInputChange(value, 'selectionRational')}
          />
        </div>
      </li>

      <li className='form-row'>
        <h4 className="prospect-label">Tangible Aspects:<sup>*</sup></h4>
        <div className="editor-wrapper">
          <ReactQuill
            theme="snow"
            placeholder="Tangible"
            value={section.tangible}
            onChange={(value) => handleInputChange(value, 'tangible')}
          />
        </div>
      </li>

      <li className='form-row'>
        <h4 className="prospect-label">Intangible Aspects:<sup>*</sup></h4>
        <div className="editor-wrapper">
          <ReactQuill
            theme="snow"
            placeholder="Intangible"
            value={section.intangible}
            onChange={(value) => handleInputChange(value, 'intangible')}
          />
        </div>
      </li>

      <li className='form-row'>
        <h4 className="prospect-label">Vision Statement:<sup>*</sup></h4>
        <div className="editor-wrapper">
          <ReactQuill
            theme="snow"
            placeholder="Vision"
            value={section.vision}
            onChange={(value) => handleInputChange(value, 'vision')}
          />
        </div>
      </li>

      <li className='form-row'>
        <h4 className="prospect-label">Happy Face:<sup>*</sup></h4>
        <div className="editor-wrapper">
          <ReactQuill
            theme="snow"
            placeholder="Happy Face"
            value={section.happyFace}
            onChange={(value) => handleInputChange(value, 'happyFace')}
          />
        </div>
      </li>
    </ul>

    <div className="button-group">
      <button onClick={handleSave} className="save-button" disabled={loading}>
        {loading ? 'Saving...' : 'Save'}
      </button>
    </div>
  </div>
</div>


  );
};

export default AditionalInfo;
