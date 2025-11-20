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
  const [assessment, setAssessment] = useState(null);

  const WHATSAPP_API_URL =
    "https://graph.facebook.com/v22.0/527476310441806/messages";
  const WHATSAPP_API_TOKEN =
    "Bearer EAAHwbR1fvgsBOwUInBvR1SGmVLSZCpDZAkn9aZCDJYaT0h5cwyiLyIq7BnKmXAgNs0ZCC8C33UzhGWTlwhUarfbcVoBdkc1bhuxZBXvroCHiXNwZCZBVxXlZBdinVoVnTB7IC1OYS4lhNEQprXm5l0XZAICVYISvkfwTEju6kV4Aqzt4lPpN8D3FD7eIWXDhnA4SG6QZDZD";

  // 🔹 Load assessment data if already sent
  useEffect(() => {
    const fetchAssessment = async () => {
      const docRef = doc(db,COLLECTIONS.prospect, id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setAssessment(docSnap.data().assessmentMail || null);
      }
    };
    fetchAssessment();
  }, [id]);

  // 🔹 Send Email
  const sendAssessmentEmail = async (prospectName, prospectEmail, orbiterName) => {
    const body = `
      Dear ${prospectName},

      Subject: 📘 Your Assessment Mail from UJustBe

      We are delighted to share an assessment mail with you that will help you align better with the UJustBe Universe.

      Please go through it carefully and share your reflections.

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
      console.log("📧 Assessment Email sent.");
      return true;
    } catch (error) {
      console.error("❌ Failed to send email:", error);
      return false;
    }
  };

  // 🔹 Send WhatsApp
  const sendAssessmentMessage = async (orbiterName, prospectName, phone) => {
    const bodyText = `Hi ${prospectName},\n\nHere is your assessment mail from UJustBe. Please review it carefully and let us know your reflections.\n\nRegards,\n${orbiterName}`;

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
      console.log(`✅ WhatsApp Assessment sent to ${prospectName}`);
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
  const handleSendAssessment = async () => {
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
        const emailSent = await sendAssessmentEmail(
          prospectName,
          prospectEmail,
          orbiterName
        );
        const wpSent = await sendAssessmentMessage(
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

          const assessmentData = {
            sent: true,
            sentAt: timestamp,
          };

          await updateDoc(docRef, { assessmentMail: assessmentData });
          setAssessment(assessmentData);

          Swal.fire("✅ Sent!", "Assessment mail sent successfully.", "success");
          fetchData?.();
        } else {
          Swal.fire("❌ Error", "Failed to send assessment mail.", "error");
        }
      }
    } catch (error) {
      console.error("❌ Error sending assessment mail:", error);
      Swal.fire("❌ Error", "Something went wrong.", "error");
    }
    setLoading(false);
  };

  return (
    <div>
      <h2 className="form-title">Assessment Mail</h2>
      {assessment?.sent ? (
        <p style={{ color: "green" }}>
          ✅ Assessment Mail Sent on {assessment.sentAt}
        </p>
      ) : (
        <p style={{ color: "red" }}>❌ Assessment Mail Not Sent</p>
      )}

      <button
        className="m-button-7"
        onClick={handleSendAssessment}
        disabled={loading || assessment?.sent}
      >
        {loading ? "Sending..." : "Send Assessment Mail"}
      </button>
    </div>
  );
};

export default Assessment;
