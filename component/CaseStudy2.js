import React, { useState, useEffect } from "react";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";
import emailjs from "@emailjs/browser";
import { COLLECTIONS } from "/utility_collection";
import axios from "axios";
import Swal from "sweetalert2";
import "../src/app/styles/main.scss";

const Assessment = ({ id, fetchData }) => {
  const [loading, setLoading] = useState(false);
  const [caseStudy, setCaseStudy] = useState(null);

  const WHATSAPP_API_URL =
    "https://graph.facebook.com/v22.0/527476310441806/messages";
  const WHATSAPP_API_TOKEN =
    "Bearer EAAHwbR1fvgsBOwUInBvR1SGmVLSZCpDZAkn9aZCDJYaT0h5cwyiLyIq7BnKmXAgNs0ZCC8C33UzhGWTlwhUarfbcVoBdkc1bhuxZBXvroCHiXNwZCZBVxXlZBdinVoVnTB7IC1OYS4lhNEQprXm5l0XZAICVYISvkfwTEju6kV4Aqzt4lPpN8D3FD7eIWXDhnA4SG6QZDZD";

  // 🔹 Load caseStudy2 data if already sent
  useEffect(() => {
    const fetchCaseStudy = async () => {
      const docRef = doc(db, COLLECTIONS.prospect, id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setCaseStudy(docSnap.data().caseStudy2 || null);
      }
    };
    fetchCaseStudy();
  }, [id]);

  // 🔹 Send Email
  const sendCaseStudyEmail = async (prospectName, prospectEmail, orbiterName) => {
    const body = `
      Dear ${prospectName},

      Subject: 📘 Your Case Study from UJustBe

      We are delighted to share a second case study with you that reflects the journey of authentic choice and contribution within UJustBe Universe.

      Please go through the case study carefully, as it will help you align better with our vision and values.

Click the link below to view the Case Study:
https://firebasestorage.googleapis.com/v0/b/monthlymeetingapp.appspot.com/o/CaseStudy%2FHow%20to%20pass%20referral%20Doc%20-%20Sneha.pdf?alt=media&token=509239d3-6f7b-4fb1-8891-e68e06f2a79a

      Warm Regards,
      ${orbiterName}
    `;

    const templateParams = {
      prospect_name: prospectName,
      to_email: prospectEmail,
      body,
      orbiter_name: orbiterName,
    };

    try {
      await emailjs.send(
        "service_acyimrs",
        "template_cdm3n5x",
        templateParams,
        "w7YI9DEqR9sdiWX9h"
      );
      console.log("📧 Case Study 2 Email sent.");
      return true;
    } catch (error) {
      console.error("❌ Failed to send email:", error);
      return false;
    }
  };

  // 🔹 Send WhatsApp
  const sendCaseStudyMessage = async (orbiterName, prospectName, phone) => {
    const bodyText = `Hi ${prospectName},\n\nHere is your second case study from UJustBe. Click the link below to view the Case Study:https://firebasestorage.googleapis.com/v0/b/monthlymeetingapp.appspot.com/o/CaseStudy%2FHow%20to%20pass%20referral%20Doc%20-%20Sneha.pdf?alt=media&token=509239d3-6f7b-4fb1-8891-e68e06f2a79a. Please review it carefully and let us know your reflections.\n\nRegards,\n${orbiterName}`;

    const payload = {
      messaging_product: "whatsapp",
      to: `91${phone}`,
      type: "text",
      text: { body: bodyText },
    };

    try {
      await axios.post(WHATSAPP_API_URL, payload, {
        headers: {
          Authorization: WHATSAPP_API_TOKEN,
          "Content-Type": "application/json",
        },
      });
      console.log(`✅ WhatsApp Case Study 2 sent to ${prospectName}`);
      return true;
    } catch (error) {
      console.error(
        `❌ Failed to send WhatsApp to ${prospectName}`,
        error.response?.data || error.message
      );
      return false;
    }
  };

  // 🔹 Handle Send Button
  const handleSendCaseStudy = async () => {
    setLoading(true);
    try {
      const docRef = doc(db,COLLECTIONS.prospect, id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        const prospectEmail = data.email;
        const prospectPhone = data.prospectPhone;
        const prospectName = data.prospectName;
        const orbiterName = data.orbiterName;

        // Send Email + WhatsApp
        const emailSent = await sendCaseStudyEmail(
          prospectName,
          prospectEmail,
          orbiterName
        );
        const wpSent = await sendCaseStudyMessage(
          orbiterName,
          prospectName,
          prospectPhone
        );

        if (emailSent || wpSent) {
          const timestamp = new Date().toLocaleString("en-IN", {
            day: "numeric",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });

          const caseStudyData = {
            sent: true,
            sentAt: timestamp,
          };

          await updateDoc(docRef, { caseStudy2: caseStudyData });
          setCaseStudy(caseStudyData);

          Swal.fire("✅ Sent!", "Case study 2 sent successfully.", "success");
          fetchData?.();
        } else {
          Swal.fire("❌ Error", "Failed to send case study 2.", "error");
        }
      }
    } catch (error) {
      console.error("❌ Error sending case study 2:", error);
      Swal.fire("❌ Error", "Something went wrong.", "error");
    }
    setLoading(false);
  };

  return (
    <div>
      <h2 className="form-title">Case Study 2</h2>
      {caseStudy?.sent ? (
        <p style={{ color: "green" }}>
          ✅ Case Study 2 Sent on {caseStudy.sentAt}
        </p>
      ) : (
        <p style={{ color: "red" }}>❌ Case Study 2 Not Sent</p>
      )}

      <button
        className="m-button-7"
        onClick={handleSendCaseStudy}
        disabled={loading || caseStudy?.sent}
      >
        {loading ? "Sending..." : "Send Case Study 2"}
      </button>
    </div>
  );
};

export default Assessment;
