import React, { useState, useEffect } from "react";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";
import emailjs from "@emailjs/browser";
import axios from "axios";
import { COLLECTIONS } from "/utility_collection";
import Swal from "sweetalert2";
import "../src/app/styles/main.scss";

const NTIntro = ({ id, fetchData }) => {
  const [loading, setLoading] = useState(false);
  const [ntIntro, setNtIntro] = useState(null);

  const WHATSAPP_API_URL =
    "https://graph.facebook.com/v22.0/527476310441806/messages";
  const WHATSAPP_API_TOKEN =
    "Bearer EAAHwbR1fvgsBOwUInBvR1SGmVLSZCpDZAkn9aZCDJYaT0h5cwyiLyIq7BnKmXAgNs0ZCC8C33UzhGWTlwhUarfbcVoBdkc1bhuxZBXvroCHiXNwZCZBVxXlZBdinVoVnTB7IC1OYS4lhNEQprXm5l0XZAICVYISvkfwTEju6kV4Aqzt4lPpN8D3FD7eIWXDhnA4SG6QZDZD";

  // 🔹 Load ntIntro data if already sent
  useEffect(() => {
    const fetchNTIntro = async () => {
      const docRef = doc(db, "Prospects", id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setNtIntro(docSnap.data().ntIntro || null);
      }
    };
    fetchNTIntro();
  }, [id]);

  // 🔹 Send Email
  const sendNTIntroEmail = async (prospectName, prospectEmail) => {
    const body = `
Subject: Welcome to the UJustBe Universe – Introducing the Nucleus Team

Dear ${prospectName},

Welcome to the UJustBe Universe! We are thrilled to have you on board as part of our ever-growing Galaxy.

As you embark on this journey, we’d like to introduce you to a core pillar of our community – The Nucleus Team.

The Nucleus Team plays a vital role in fostering a culture of growth, collaboration, and empowerment within the UJustBe Universe.

We encourage you to align with the community's vision and take active steps toward exploring your potential in the domains of Relationship, Health, and Wealth. With time and consistent contribution, you, too, could become part of this prestigious team!

If you have any questions about the Nucleus Team or would like to know how to contribute effectively, feel free to reach out to us. We’re here to support you every step of the way.

Welcome once again, and we look forward to seeing you shine in the UJustBe Universe!

Warm regards,  
Team UJustBe  
📞 Level 1: 9326062258  
📞 Level 2: 8928660399  
📧 Email: support@ujustbe.com  

Brand Vision: You, as a contributor, come to be, connect and grow together to live into a world of Happy faces
`;

    const templateParams = {
      prospect_name: prospectName,
      to_email: prospectEmail,
      body,
    };

    try {
      await emailjs.send(
        "service_acyimrs",
        "template_cdm3n5x",
        templateParams,
        "w7YI9DEqR9sdiWX9h"
      );
      console.log("📧 NT Intro Email sent.");
      return true;
    } catch (error) {
      console.error("❌ Failed to send NT Intro email:", error);
      return false;
    }
  };

  // 🔹 Send WhatsApp
  const sendNTIntroMessage = async (prospectName, phone) => {
    const bodyText = `Hi ${prospectName},\n\nWelcome to the UJustBe Universe! 🎉 We’re excited to introduce you to the Nucleus Team – the core pillar that fosters growth, collaboration, and empowerment.\n\nThey play a vital role in building the UJustBe community and you, too, can aspire to be part of this prestigious team.\n\nFor support:\n📞 Level 1: 9326062258\n📞 Level 2: 8928660399\n📧 support@ujustbe.com\n\n🌟 Brand Vision: You, as a contributor, come to be, connect and grow together to live into a world of Happy faces.\n\nWarm regards,\nTeam UJustBe`;

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
      console.log(`✅ WhatsApp NT Intro sent to ${prospectName}`);
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
  const handleSendNTIntro = async () => {
    setLoading(true);
    try {
      const docRef = doc(db, "Prospects", id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        const prospectEmail = data.email;
        const prospectPhone = data.prospectPhone;
        const prospectName = data.prospectName;

        // Send Email + WhatsApp
        const emailSent = await sendNTIntroEmail(prospectName, prospectEmail);
        const wpSent = await sendNTIntroMessage(prospectName, prospectPhone);

        if (emailSent || wpSent) {
          const timestamp = new Date().toLocaleString("en-IN", {
            day: "numeric",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });

          const ntIntroData = {
            sent: true,
            sentAt: timestamp,
          };

          await updateDoc(docRef, { ntIntro: ntIntroData });
          setNtIntro(ntIntroData);

          Swal.fire("✅ Sent!", "NT Intro sent successfully.", "success");
          fetchData?.();
        } else {
          Swal.fire("❌ Error", "Failed to send NT Intro.", "error");
        }
      }
    } catch (error) {
      console.error("❌ Error sending NT Intro:", error);
      Swal.fire("❌ Error", "Something went wrong.", "error");
    }
    setLoading(false);
  };

  return (
    <div>
      <h2 className="form-title">NT Intro (Day 07)</h2>
      {ntIntro?.sent ? (
        <p style={{ color: "green" }}>
          ✅ NT Intro Sent on {ntIntro.sentAt}
        </p>
      ) : (
        <p style={{ color: "red" }}>❌ NT Intro Not Sent</p>
      )}

      <button
        className="m-button-7"
        onClick={handleSendNTIntro}
        disabled={loading || ntIntro?.sent}
      >
        {loading ? "Sending..." : "Send NT Intro"}
      </button>
    </div>
  );
};

export default NTIntro;
