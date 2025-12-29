import React, { useState, useEffect } from "react";
import { doc, updateDoc, getDoc,collection,
  query,
  where,
  getDocs,
  setDoc,
  addDoc,
  serverTimestamp, } from "firebase/firestore";
import { db } from "../firebaseConfig";
import emailjs from "@emailjs/browser";
import { COLLECTIONS } from "/utility_collection";
import axios from "axios";
import Swal from "sweetalert2";
import "../src/app/styles/main.scss";

const KnowledgeSeries4 = ({ id, fetchData }) => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("morning");
  const [morningData, setMorningData] = useState(null);
  const [eveningData, setEveningData] = useState(null);

  const WHATSAPP_API_URL =
    "https://graph.facebook.com/v22.0/527476310441806/messages";
  const WHATSAPP_API_TOKEN =
    "Bearer EAAHwbR1fvgsBOwUInBvR1SGmVLSZCpDZAkn9aZCDJYaT0h5cwyiLyIq7BnKmXAgNs0ZCC8C33UzhGWTlwhUarfbcVoBdkc1bhuxZBXvroCHiXNwZCZBVxXlZBdinVoVnTB7IC1OYS4lhNEQprXm5l0XZAICVYISvkfwTEju6kV4Aqzt4lPpN8D3FD7eIWXDhnA4SG6QZDZD";

  // 🔹 Load saved data
  useEffect(() => {
    const fetchSeries = async () => {
      const docRef = doc(db, "Prospects", id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setMorningData(docSnap.data().knowledgeSeries4_morning || null);
        setEveningData(docSnap.data().knowledgeSeries4_evening || null);
      }
    };
    fetchSeries();
  }, [id]);

  // 🔹 Message Content
  const getContent = (tab) => {
    if (tab === "morning") {
      return {
        subject: "📘 Knowledge Series - Episode 1: Introduction to UJustBe",
        body: `Aarav: Hey Soumya, have you heard about UJustBe?\n\nSoumya: Yeah, I’ve heard the name, but I’m not exactly sure what it’s about. Can you please explain more?\n\nAarav: Of course! UJustBe Universe is a community where Contributors, called Orbiters, contribute to personal and collective growth. It focuses on relationships, health, and wealth to live into the world of “happy face.”\n\nSoumya: That sounds interesting. So, who exactly are these Orbiters?`,
      };
    }
    return {
      subject: "📘 Knowledge Series - Episode 2: The Role of Orbiters",
      body: `Aarav: Orbiters are Contributing individuals who actively participate in UJustBe Universe. They share knowledge, give referrals, and take part in events like monthly meetings, WhatsApp and other events.\n\nSoumya: Oh, so they’re like the backbone of the community?\n\nAarav: Exactly! They contribute by exploring possibilities and sharing verified referrals within the UJustBe Universe.`,
    };
  };
/* ================= CP HELPERS ================= */

const ensureCpBoardUser = async (db, orbiter) => {
  if (!orbiter?.ujbcode) return;

  const ref = doc(db, "CPBoard", orbiter.ujbcode);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, {
      id: orbiter.ujbcode,
      name: orbiter.name,
      phoneNumber: orbiter.phone,
      role: orbiter.category || "MentOrbiter",
      createdAt: serverTimestamp(),
    });
  }
};

const addCpForKnowledgeSeriesMorning = async (
  db,
  orbiter,
  prospectPhone,
  prospectName
) => {
  if (!orbiter?.ujbcode) return;

  await ensureCpBoardUser(db, orbiter);

  // 🚫 Prevent duplicate CP
  const q = query(
    collection(db, "CPBoard", orbiter.ujbcode, "activities"),
    where("activityNo", "==", "016"),
    where("prospectPhone", "==", prospectPhone)
  );

  const snap = await getDocs(q);
  if (!snap.empty) return;

  await addDoc(
    collection(db, "CPBoard", orbiter.ujbcode, "activities"),
    {
      activityNo: "016",
      activityName: "Completion of OTC Journey till Day 5",
      points: 75,
      purpose:
        "Encourages timely completion of orientation journey and early engagement.",
      prospectName,
      prospectPhone,
      source: "KnowledgeSeries4Morning",
      month: new Date().toLocaleString("default", {
        month: "short",
        year: "numeric",
      }),
      addedAt: serverTimestamp(),
    }
  );
};

  // 🔹 Send Email
  const sendEmail = async (prospectName, prospectEmail, orbiterName, tab) => {
    const content = getContent(tab);
    const body = `
      Dear ${prospectName},

      ${content.subject}

      ${content.body}

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
      console.log(`📧 ${tab} Knowledge Series Email sent.`);
      return true;
    } catch (error) {
      console.error("❌ Failed to send email:", error);
      return false;
    }
  };

  // 🔹 Send WhatsApp
  const sendWhatsApp = async (orbiterName, prospectName, phone, tab) => {
    const content = getContent(tab);
    const bodyText = `Hi ${prospectName},\n\n${content.subject}\n\n${content.body}\n\nRegards,\n${orbiterName}`;

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
      console.log(`✅ WhatsApp ${tab} Knowledge Series sent to ${prospectName}`);
      return true;
    } catch (error) {
      console.error(
        `❌ Failed to send WhatsApp (${tab}) to ${prospectName}`,
        error.response?.data || error.message
      );
      return false;
    }
  };

  // 🔹 Handle Send
  const handleSend = async (tab) => {
    setLoading(true);
    try {
      const docRef = doc(db, "Prospects", id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        const { email: prospectEmail, prospectPhone, prospectName, orbiterName } = data;

        const emailSent = await sendEmail(prospectName, prospectEmail, orbiterName, tab);
        const wpSent = await sendWhatsApp(orbiterName, prospectName, prospectPhone, tab);

     if (emailSent || wpSent) {
  const timestamp = new Date().toLocaleString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const updateField =
    tab === "morning"
      ? "knowledgeSeries4_morning"
      : "knowledgeSeries4_evening";

  const seriesData = { sent: true, sentAt: timestamp };

  await updateDoc(docRef, { [updateField]: seriesData });

  if (tab === "morning") {
    setMorningData(seriesData);

    /* ⭐ ADD CP 016 – ONLY FOR MORNING */
    const qMentor = query(
      collection(db, COLLECTIONS.userDetail),
      where("MobileNo", "==", data.orbiterContact)
    );

    const mentorSnap = await getDocs(qMentor);

    if (!mentorSnap.empty) {
      const d = mentorSnap.docs[0].data();

      if (d.UJBCode) {
        const orbiter = {
          ujbcode: d.UJBCode,
          name: d.Name,
          phone: d.MobileNo,
          category: d.Category,
        };

        await addCpForKnowledgeSeriesMorning(
          db,
          orbiter,
          data.prospectPhone,
          data.prospectName
        );
      }
    }
  } else {
    setEveningData(seriesData);
  }

  Swal.fire(
    "✅ Sent!",
    `Knowledge Series 4 (${tab}) sent successfully.`,
    "success"
  );

  fetchData?.();

        } else {
          Swal.fire("❌ Error", `Failed to send Knowledge Series 4 (${tab}).`, "error");
        }
      }
    } catch (error) {
      console.error("❌ Error sending Knowledge Series 4:", error);
      Swal.fire("❌ Error", "Something went wrong.", "error");
    }
    setLoading(false);
  };

  return (
    <div>
      <h2 className="form-title">Knowledge Series 4</h2>

      {/* Tabs */}
      <div style={{ display: "flex", marginBottom: "1rem" }}>
        <button
          className={`m-button-7 ${activeTab === "morning" ? "active" : ""}`}
          onClick={() => setActiveTab("morning")}
        >
          Morning
        </button>
        <button
          className={`m-button-7 ${activeTab === "evening" ? "active" : ""}`}
          onClick={() => setActiveTab("evening")}
        >
          Evening
        </button>
      </div>

      {/* Morning Tab */}
      {activeTab === "morning" && (
        <div>
          {morningData?.sent ? (
            <p style={{ color: "green" }}>
              ✅ Morning Knowledge Series Sent on {morningData.sentAt}
            </p>
          ) : (
            <p style={{ color: "red" }}>❌ Morning Knowledge Series Not Sent</p>
          )}
          <button
            className="m-button-7"
            onClick={() => handleSend("morning")}
            disabled={loading || morningData?.sent}
          >
            {loading ? "Sending..." : "Send Morning Episode"}
          </button>
        </div>
      )}

      {/* Evening Tab */}
      {activeTab === "evening" && (
        <div>
          {eveningData?.sent ? (
            <p style={{ color: "green" }}>
              ✅ Evening Knowledge Series Sent on {eveningData.sentAt}
            </p>
          ) : (
            <p style={{ color: "red" }}>❌ Evening Knowledge Series Not Sent</p>
          )}
          <button
            className="m-button-7"
            onClick={() => handleSend("evening")}
            disabled={loading || eveningData?.sent}
          >
            {loading ? "Sending..." : "Send Evening Episode"}
          </button>
        </div>
      )}
    </div>
  );
};

export default KnowledgeSeries4;
