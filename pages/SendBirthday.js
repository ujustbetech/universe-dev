import React, { useEffect, useState } from "react";
import { collection, getDocs, doc, getDoc } from "firebase/firestore"; // ✅ Correct

import { db } from "../firebaseConfig"; 
import axios from "axios";
import "../pages/events/frontend.css"; // Make sure to import your SCSS file
import Layout from '../component/Layout'
import "../src/app/styles/main.scss";

const BirthdayPage = () => {
  const [users, setUsers] = useState([]);

  const getFormattedDate = (offset = 0) => {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`;
  };

  const today = getFormattedDate(0);
  const tomorrow = getFormattedDate(1);
const [sentMessages, setSentMessages] = useState([]);

  const fetchBirthdayUsers = async () => {
    const querySnapshot = await getDocs(collection(db, "birthdaycanva"));
    const birthdayUsers = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const dobRaw = data.dob; // Ensure 'dob' is correct

      if (dobRaw) {
        const dobDate = new Date(dobRaw); // Convert the raw dob value to Date
        const formattedDOB = `${String(dobDate.getDate()).padStart(2, "0")}/${String(dobDate.getMonth() + 1).padStart(2, "0")}`;

        console.log(`🔍 Checking: ${data.Name} | DOB: ${formattedDOB}`);

        if (formattedDOB === today || formattedDOB === tomorrow) {
          birthdayUsers.push({ id: doc.id, ...data });
        }
      } else {
        console.log(`❌ No DOB found for user: ${data.Name}`);
      }
    });

    console.log("🎉 Final birthday list:", birthdayUsers);
    setUsers(birthdayUsers);
  };
const sanitizeText = (text) =>
  text
    .replace(/\s{5,}/g, " ")     // Collapse 5+ spaces
    .replace(/[\n\r\t]+/g, " ")  // Remove newlines/tabs
    .trim();

  const sendWhatsAppMessage = async (user) => {
    const templateName = "daily_reminder";
    let phoneNumber = user["phone"]; // Change `const` to `let`
    const name = user["name"];
    const imageUrl = user.imageUrl;
   const accessToken = "EAAHwbR1fvgsBOwUInBvR1SGmVLSZCpDZAkn9aZCDJYaT0h5cwyiLyIq7BnKmXAgNs0ZCC8C33UzhGWTlwhUarfbcVoBdkc1bhuxZBXvroCHiXNwZCZBVxXlZBdinVoVnTB7IC1OYS4lhNEQprXm5l0XZAICVYISvkfwTEju6kV4Aqzt4lPpN8D3FD7eIWXDhnA4SG6QZDZD"; // Replace with your Meta API token
    const phoneNumberId = "527476310441806";  

    // Log the entire user object to inspect its structure
    console.log("User Object:", user);

     if (!phoneNumber || phoneNumber.trim() === "") {
    alert("Phone number is missing or invalid.");
    return;
  }

  const originalPhone = phoneNumber;
  phoneNumber = phoneNumber.replace(/^\+/, "");

  if (!/^\d{10,15}$/.test(phoneNumber)) {
    alert("Phone number is not in a valid format.");
    return;
  }

  if (!name || name.trim() === "") {
    alert("Name is missing.");
    return;
  }

  try {
    // 🎂 Message to birthday user (Orbiter)
  const cleanMessage = sanitizeText(`Today Be Special, Connect with Love and Grow in Abundance.

UJustBe Universe wishes you a day full of happiness and a year that brings you much success.
May all life's blessings be yours, on your birthday and always.

Happy Birthday!!!🥳🎂🎊🎊🎂🎉`);

    await axios.post(
      `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
      {
        messaging_product: "whatsapp",
        to: phoneNumber,
        type: "template",
        template: {
          name: templateName,
          language: { code: "en" },
          components: [
            {
              type: "header",
              parameters: [
                {
                  type: "image",
                  image: { link: imageUrl },
                },
              ],
            },
            {
              type: "body",
              parameters: [
                { type: "text", text: name },
                { type: "text", text: cleanMessage},
              ],
            },
          ],
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );


    // 🎉 Fetch mentor details
    const mentorDocRef = doc(db, "userdetail", originalPhone);
    const mentorSnap = await getDoc(mentorDocRef);

    if (mentorSnap.exists()) {
  const mentorData = mentorSnap.data();
  const mentorName = mentorData["Mentor Name"];
  let mentorPhone = mentorData["Mentor Phone"];
  const gender = mentorData["Gender"]?.toLowerCase(); // assuming "Male" or "Female"
  // then proceed to send the WhatsApp message...

      if (mentorPhone && /^\d{10,15}$/.test(mentorPhone)) {
        mentorPhone = mentorPhone.toString();
  let pronoun = "them";
  if (gender === "male") pronoun = "him";
  else if (gender === "female") pronoun = "her";

  const mentorMessage = `Today is your connect's (${name}) birthday so kindly wish ${pronoun}.`;



      

        // 🎁 Send message to mentor
        await axios.post(
          `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
          {
            messaging_product: "whatsapp",
            to: mentorPhone,
            type: "template",
           template: {
  name: "daily_reminder",
  language: { code: "en" },
  components: [
    {
      type: "header",
      parameters: [
        {
          type: "image",
          image: { link: imageUrl }, // must be a valid HTTPS image
        },
      ],
    },
    {
      type: "body",
      parameters: [
        { type: "text", text: mentorName },      // {{1}}
        { type: "text", text: mentorMessage } // {{2}}
      ],
    },
  ],
}

          },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          }
        );

        alert(`WhatsApp message sent to mentor ${mentorName}`);
      } else {
        console.log("Invalid or missing mentor phone number.");
      }
    } else {
      console.log("Mentor details not found for user with phone:", originalPhone);
    }
setSentMessages((prev) => [...prev, user.id]);
    alert(`WhatsApp message sent to ${name}`);
  } catch (error) {
    console.error("Error sending message", error.response?.data || error);
    

    alert(`Failed to send message to ${name}`);
  }
};
  useEffect(() => {
    fetchBirthdayUsers();
  }, []);

  // Separate birthdays into today, tomorrow, and upcoming
  const todayBirthdays = users.filter(user => {
    const dobDate = new Date(user.dob);
    const formattedDOB = `${String(dobDate.getDate()).padStart(2, "0")}/${String(dobDate.getMonth() + 1).padStart(2, "0")}`;
    return formattedDOB === today;
  });

  const tomorrowBirthdays = users.filter(user => {
    const dobDate = new Date(user.dob);
    const formattedDOB = `${String(dobDate.getDate()).padStart(2, "0")}/${String(dobDate.getMonth() + 1).padStart(2, "0")}`;
    return formattedDOB === tomorrow;
  });

  const upcomingBirthdays = users.filter(user => {
    const dobDate = new Date(user.dob);
    const formattedDOB = `${String(dobDate.getDate()).padStart(2, "0")}/${String(dobDate.getMonth() + 1).padStart(2, "0")}`;
    return formattedDOB !== today && formattedDOB !== tomorrow;
  });

  return (
    <Layout>
    <div className="birthday-page">
      <h2>Today's and Tomorrow's Birthdays</h2>

     <div className="birthday-section today">
  <h3>
     Today's Birthdays:{" "}
    {new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "2-digit",
    })},{" "}
    {new Date().toLocaleDateString("en-GB", { weekday: "long" })}
  </h3>

  {todayBirthdays.length === 0 ? (
    <p>No birthdays today.</p>
  ) : (
    todayBirthdays.map((user) => (
<div key={user.id} className="birthday-card">
  <div className="birthday-info">
    <h3>{user.name}</h3>
    <p>
      DOB:{" "}
      {new Date(user.dob).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })}
    </p>
    <p>Mobile: {user["phone"]}</p>
  <p>MentOrbiter: {user.mentorName}</p>

 {sentMessages.includes(user.id) ? (
  <button style={{backgroundColor:"#16274f"}}className="send-message-btn">Sent </button>
) : (
  <button
    onClick={() => sendWhatsAppMessage(user)}
    className="send-message-btn"
  >
    Send
  </button>
)}


  </div>

  {user.imageUrl && (
    <img
      src={user.imageUrl}
      alt={user.name}
      className="birthday-image top-right"
    />
  )}
</div>


    ))
  )}
</div>

<div className="birthday-section tomorrow">
  <h3>
     Tomorrow's Birthdays:{" "}
    {new Date(Date.now() + 86400000).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "2-digit",
    })},{" "}
    {new Date(Date.now() + 86400000).toLocaleDateString("en-GB", {
      weekday: "long",
    })}
  </h3>

  {tomorrowBirthdays.length === 0 ? (
    <p>No birthdays tomorrow.</p>
  ) : (
    tomorrowBirthdays.map((user) => (
      <div key={user.id} className="birthday-card">
       
  <div className="birthday-info">
    <h3>{user.name}</h3>
    <p>
      DOB:{" "}
      {new Date(user.dob).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })}
    </p>
    <p>Mobile: {user["phone"]}</p>
  </div>
        {user.imageUrl && (
          <img
            src={user.imageUrl}
            alt={user.name}
       className="birthday-image top-right"
          />
        )}
      </div>
    ))
  )}
</div>

    </div>
    </Layout>
  );
};

export default BirthdayPage;
