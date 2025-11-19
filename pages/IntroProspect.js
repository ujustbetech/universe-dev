import React, { useEffect, useState } from "react";
import { collection, addDoc, doc, getDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";
import "../src/app/styles/user.scss"; // SAME UI STYLE AS REFERRAL PAGE
import Swal from "sweetalert2";
import axios from "axios";
import "../pages/feedback.css";
import emailjs from "@emailjs/browser";
import HeaderNav from "../component/HeaderNav";

const UserAddProspect = () => {
  const [mentor, setMentor] = useState({});
  const [prospectName, setProspectName] = useState("");
  const [prospectPhone, setProspectPhone] = useState("");
  const [prospectEmail, setProspectEmail] = useState("");
  const [occupation, setOccupation] = useState("Service");
  const [hobbies, setHobbies] = useState("");
  const [source, setSource] = useState("close_connect");
  const [date, setDate] = useState("");

  const WHATSAPP_API_URL =
    "https://graph.facebook.com/v22.0/527476310441806/messages";
  const WHATSAPP_API_TOKEN =
    "Bearer EAAHwbR1fvgsBOwUInBvR1SGmVLSZCpDZAkn9aZCDJYaT0h5cwyiLyIq7BnKmXAgNs0ZCC8C33UzhGWTlwhUarfbcVoBdkc1bhuxZBXvroCHiXNwZCZBVxXlZBdinVoVnTB7IC1OYS4lhNEQprXm5l0XZAICVYISvkfwTEju6kV4Aqzt4lPpN8D3FD7eIWXDhnA4SG6QZDZD";

  // Format date
  const formatReadableDate = (inputDate) => {
    const d = new Date(inputDate);
    const day = String(d.getDate()).padStart(2, "0");
    const month = d.toLocaleString("en-GB", { month: "long" });
    const year = String(d.getFullYear()).slice(-2);
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${day} ${month} ${year} at ${hours}.${minutes} ${ampm}`;
  };

  // ⭐ Fetch mentor using UJB CODE
  const fetchMentorDetails = async (ujbCode) => {
    try {
      const docRef = doc(db, "usersdetail", ujbCode);
      const snap = await getDoc(docRef);

      if (snap.exists()) {
        const data = snap.data();
        setMentor({
          name: data.Name || "",
          phone: data.MobileNo || "",
          email: data.Email || "",
          ujbCode: ujbCode,
        });
      }
    } catch (err) {
      console.error("Failed to load mentor", err);
    }
  };

  useEffect(() => {
    setDate(new Date().toISOString());
    const storedUJB = localStorage.getItem("mmUJBCode");
    if (storedUJB) {
      fetchMentorDetails(storedUJB.trim());
    }
  }, []);

  const sendAssessmentEmail = async (
    orbiterName,
    orbiterEmail,
    prospectName,
    formattedDate,
    formLink
  ) => {
    const body = `
Dear ${orbiterName},

You have registered a new prospect: ${prospectName}.
Please fill the Prospect Assessment Form.

Form Link: ${formLink}
`;

    const templateParams = {
      prospect_name: prospectName,
      to_email: orbiterEmail,
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
    } catch (err) {
      console.error("Email failed", err);
    }
  };

  const sendWhatsAppMessage = async (orbiterName, prospectName, phone, formLink) => {
    const payload = {
      messaging_product: "whatsapp",
      to: `91${phone}`,
      type: "template",
      template: {
        name: "mentorbiter_assesment_form",
        language: { code: "en" },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: orbiterName },
              { type: "text", text: prospectName },
              { type: "text", text: formLink },
            ],
          },
        ],
      },
    };

    try {
      await axios.post(WHATSAPP_API_URL, payload, {
        headers: {
          Authorization: WHATSAPP_API_TOKEN,
          "Content-Type": "application/json",
        },
      });
    } catch (err) {
      console.error("WhatsApp failed", err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!prospectName || !prospectPhone || !prospectEmail || !occupation || !hobbies) {
      Swal.fire("Error", "Please fill all fields!", "warning");
      return;
    }

    try {
      const formattedDate = formatReadableDate(date);
      const prospectRef = collection(db, "Prospects");

      const data = {
        userType: "prospect",
        prospectName,
        prospectPhone,
        email: prospectEmail,
        hobbies,
        occupation,
        type: source,
        date: formattedDate,

        // ⭐ Mentor info from Firestore using UJB Code
        orbiterName: mentor.name,
        orbiterContact: mentor.phone,
        orbiterEmail: mentor.email,
        orbiterUJBCode: mentor.ujbCode,

        registeredAt: new Date(),
      };

      const docRef = await addDoc(prospectRef, data);

      const formLink = `https://otc-app.vercel.app/prospectform/${docRef.id}`;

      await sendAssessmentEmail(mentor.name, mentor.email, prospectName, formattedDate, formLink);
      await sendWhatsAppMessage(mentor.name, prospectName, mentor.phone, formLink);

      Swal.fire("Success", "Prospect added successfully!", "success");

      setProspectName("");
      setProspectPhone("");
      setProspectEmail("");
      setOccupation("Service");
      setHobbies("");
      setSource("close_connect");
    } catch (err) {
      Swal.fire("Error", "Something went wrong!", "error");
    }
  };

  return (
<>
  <main className="pageContainer">

    {/* ----------- HEADER ----------- */}
    <header className="Main m-Header">
      <section className="container">
        <div className="innerLogo" onClick={() => router.push('/')}>
          <img src="/ujustlogo.png" alt="Logo" className="logo" />
        </div>
      </section>
    </header>

    {/* ----------- FORM AREA ----------- */}
    <section className="dashBoardMain">
      <div className="container">

        <div className="step-form-container">
          <form onSubmit={handleSubmit}>

            <div className="step-content active">

              {/* TITLE */}
              <h3 className="formtitle">Add Prospect</h3>
              <h2>Please fill the details of the person you want to add.</h2>

              {/* MENTOR INFO */}
              <div className="input-group">
                <label>Mentor Name</label>
                <input type="text" value={mentor.name} disabled />
              </div>

              <div className="input-group">
                <label>Mentor Phone</label>
                <input type="text" value={mentor.phone} disabled />
              </div>

              <div className="input-group">
                <label>Mentor Email</label>
                <input type="text" value={mentor.email} disabled />
              </div>

              {/* PROSPECT FIELDS */}
              <div className="input-group">
                <label>Prospect Name</label>
                <input
                  type="text"
                  value={prospectName}
                  onChange={(e) => setProspectName(e.target.value)}
                  required
                />
              </div>

              <div className="input-group">
                <label>Prospect Phone</label>
                <input
                  type="text"
                  value={prospectPhone}
                  onChange={(e) => setProspectPhone(e.target.value)}
                  required
                />
              </div>

              <div className="input-group">
                <label>Prospect Email</label>
                <input
                  type="text"
                  value={prospectEmail}
                  onChange={(e) => setProspectEmail(e.target.value)}
                />
              </div>

              <div className="input-group">
                <label>Occupation</label>
                <select
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                >
                  <option value="">Select</option>
                  <option>Service</option>
                  <option>Student</option>
                  <option>Retired</option>
                  <option>Business</option>
                  <option>Professional</option>
                  <option>Housewife</option>
                  <option>Other</option>
                </select>
              </div>

              <div className="input-group">
                <label>Hobbies</label>
                <input
                  type="text"
                  value={hobbies}
                  onChange={(e) => setHobbies(e.target.value)}
                />
              </div>

              <div className="input-group">
                <label>Source</label>
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                >
                  <option value="close_connect">Close Connect</option>
                  <option value="colleague">Colleague</option>
                  <option value="relative">Relative</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* BUTTON */}
              <button className="save-button" type="submit">
                Add Prospect
              </button>

            </div>
          </form>
        </div>

        <h2 className="footers">Copyright @2025 | Powered by UJustBe</h2>

      </div>
      <HeaderNav/>
    </section>
  </main>
</>


  );
};

export default UserAddProspect;
