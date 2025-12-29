import { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import {
  collection,
  getDocs,
  doc,
  addDoc,
  query,
  where,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

import { useRouter } from 'next/router';
import "../src/app/styles/main.scss";
import axios from 'axios';
import { COLLECTIONS } from "/utility_collection";
import emailjs from '@emailjs/browser';
import Swal from 'sweetalert2';

const Register = (props) => {
    console.log("BasicInfoSection",props);
    const router = useRouter();
    const [phone, setPhone] = useState(props?.data?.orbiterContact || '');
    const [name, setName] = useState(props?.data?.orbiterName || '');
    const [orbiteremail, setOrbiterEmail] = useState(props?.data?.orbiterEmail || '');
    const [type, setType] = useState(props?.data?.type || '');
    const [userList, setUserList] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [userSearch, setUserSearch] = useState('');
    const [prospectName, setProspectName] = useState(props?.data?.prospectName || '');
    const [prospectPhone, setProspectPhone] = useState(props?.data?.prospectPhone || '');
    const [occupation, setOccupation] = useState(props?.data?.occupation || '');
    const [hobbies, setHobbies] = useState(props?.data?.hobbies || '');
    const [email, setEmail] = useState(props?.data?.email || '');
    const [date, setDate] = useState(props?.data?.date || '');
    const [userType, setUserType] = useState('prospect'); // default to prospect

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
            user.name && user.name.toLowerCase().includes(value) // Check if name exists
        );
        setFilteredUsers(filtered);
    };

    const handleSelectUser = (user) => {
      if (userType === 'orbiter') {
        // Populate dummy MentOrbiter data
        setName("UJustBeSupport");
        setPhone("8928660399");
        setOrbiterEmail("support@ujustbe.com");
    
        // Use selected user's info as prospect details
        setProspectName(user.name);
        setProspectPhone(user.phone);
        setEmail(user.Email);
      } else {
        // Default behavior: set selected user as MentOrbiter
        setName(user.name);
        setPhone(user.phone);
        setOrbiterEmail(user.Email);
      }
    
      setUserSearch('');
      setFilteredUsers([]);
    };
    
    

    // Handle Dropdown Change for Type
    const handleTypeChange = (e) => {
        setType(e.target.value);
    };
    const handleOccupationChange = (e) => {
      setOccupation(e.target.value);
  };


    const sendAssessmentEmail = async (orbiterName, orbiterEmail, prospectName, formattedDate, formLink) => {
      const body = `
      Dear ${orbiterName},
      
      As part of our ongoing efforts to ensure meaningful engagement and alignment within the UJustBe Universe, we kindly request you to share the Prospect Assessment Form for ${prospectName} whom you would like to enroll in UJustBe Universe.
      
      Your inputs are valuable in helping us understand the prospect’s alignment with the culture, contribution intent, and potential next steps. This will enable us to support them better and take the conversation forward in the right direction.
      
      Kindly share the filled form within 2 working days. If you need any support or have queries while filling it out, feel free to reach out.
      
    Prospect Assessment Form: ${formLink}
      `;
      
        const templateParams = {
          prospect_name: prospectName,
          to_email: orbiterEmail,
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
// Function to send thank you message
// Function to send the assessment message
const sendAssesmentMessage = async (orbiterName, prospectName, phone,formLink) => {
    const payload = {
      messaging_product: 'whatsapp',
      to: `91${phone}`, // Prefix the phone number with the country code
      type: 'template',
      template: {
        name: 'mentorbiter_assesment_form', // WhatsApp template name
        language: { code: 'en' },
        components: [
          {
            type: 'body',
            parameters: [
                { type: 'text', text: orbiterName },
                { type: 'text', text: prospectName },
                { type: 'text', text: formLink }

              ]
          }
        ]
      }
    };
  
    try {
      // Send the message using your WhatsApp API
      await axios.post(WHATSAPP_API_URL, payload, {
        headers: {
          Authorization: WHATSAPP_API_TOKEN,
          'Content-Type': 'application/json',
        },
      });
      console.log(`✅ Message sent to ${orbiterName}`);
    } catch (error) {
      console.error(`❌ Failed to send message to ${orbiterName}`, error.response?.data || error.message);
    }
  };
         

   const ensureCpBoardUser = async (orbiter) => {
  if (!orbiter?.ujbcode) return;

  const ref = doc(db, "CPBoard", orbiter.ujbcode);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, {
      id: orbiter.ujbcode,
      name: orbiter.name,
      phoneNumber: orbiter.phone,
      role: orbiter.category || "CosmOrbiter",
      createdAt: serverTimestamp(),
    });
  }
};
const addCpForProspectIntroduction = async (orbiter) => {
  if (!orbiter?.ujbcode) return;

  await ensureCpBoardUser(orbiter);

  // 🔐 Prevent duplicate CP for same prospect
  const q = query(
    collection(db, "CPBoard", orbiter.ujbcode, "activities"),
    where("activityNo", "==", "001"),
    where("prospectPhone", "==", prospectPhone)
  );

  const snap = await getDocs(q);
  if (!snap.empty) return;

  await addDoc(
    collection(db, "CPBoard", orbiter.ujbcode, "activities"),
    {
      activityNo: "001",
      activityName: "	Prospect to Enrollment – Prospect Identification",
      points: 50,
      purpose: "Recognizes initiative in identifying potential new Orbiters aligned with UJustBe values and vision.",
      prospectName,
      prospectPhone,
      source: "ProspectRegistration",
      month: new Date().toLocaleString("default", {
        month: "short",
        year: "numeric",
      }),
      addedAt: serverTimestamp(),
    }
  );
};


  const handleSubmit = async (e) => {
    e.preventDefault();
  
    // Validate required fields for both user types
    if (userType === 'prospect' && (!name || !phone || !orbiteremail || !type || !prospectName || !prospectPhone || !occupation || !email || !hobbies || !date)) {
      alert('Please fill all fields');
      return;
    }
  
    if (userType === 'orbiter' && (!prospectName || !prospectPhone || !occupation || !email || !hobbies || !date)) {
      alert('Please fill all fields');
      return;
    }
  
    try {
      const prospectRef = collection(db, 'Prospects');
      const formattedDate = date ? formatReadableDate(date) : null;
  
      const data = {
        userType, // Save userType
        prospectName,
        prospectPhone,
        occupation,
        hobbies,
        email,
        orbiterName: name,
        orbiterContact: phone,
        orbiterEmail: orbiteremail,
        date: formattedDate,
        registeredAt: new Date()
      };
  
      if (userType === 'prospect') {
        Object.assign(data, {
          type,
          prospectName,
          prospectPhone,
          occupation,
          hobbies,
          email,
          date: formattedDate,
          orbiterName: name,
          orbiterContact: phone,
          orbiterEmail: orbiteremail,
          registeredAt: new Date()
        });
      }
  
      // Save to Firestore
      const docRef = await addDoc(prospectRef, data);
 // ✅ ADD CP POINTS ONLY IF REAL MENTOR ORBITER EXISTS
if (userType === "prospect" && phone) {
  const q = query(
    collection(db, "userdetails"),
    where("Mobile no", "==", phone)
  );

  const snap = await getDocs(q);

  if (!snap.empty) {
    const d = snap.docs[0].data();

    if (!d["UJB Code"]) return; // safety

    const orbiter = {
      ujbcode: d["UJB Code"],
      name: d[" Name"],
      phone: d["Mobile no"],
      category: d["Category"],
    };

    await addCpForProspectIntroduction(orbiter);
  } else {
    console.warn("⚠️ MentorOrbiter not found in userdetails, CP skipped");
  }
}

      const docId = docRef.id;
  
      if (userType === 'prospect') {
        const formLink = `https://otc-app.vercel.app/prospectform/${docId}`;
        console.log("Send this to Orbiter: ", formLink);
  
        // Send assessment email
        await sendAssessmentEmail(name, orbiteremail, prospectName, formattedDate, formLink);
  
        // Optional WhatsApp message (uncomment if needed)
        await sendAssesmentMessage(name, prospectName, phone,formLink);
  
        Swal.fire({
          icon: 'success',
          title: 'Success',
          text: 'Prospect registered successfully!',
        });
        
      } else {
         const formLink = `https://otc-app.vercel.app/prospectform/${docId}`;
        console.log("Send this to Orbiter: ", formLink);
  
        // Send assessment email
        await sendAssessmentEmail(name, orbiteremail, prospectName, formattedDate, formLink);
  
        // Optional WhatsApp message (uncomment if needed)
        await sendAssesmentMessage(name, prospectName, phone,formLink);

        Swal.fire({
          icon: 'success',
          title: 'Success',
          text: 'Orbiter registered successfully!',
        });
        
      }
    
  
      // Clear form fields
      setUserType('');
      setName('');
      setPhone('');
      setOrbiterEmail('');
      setType('');
      setProspectName('');
      setProspectPhone('');
      setOccupation('');
      setHobbies('');
      setEmail('');
      setDate('');
    } catch (error) {
      console.error("Error registering user:", error);
      alert('Error registering user');
    }
  };


      
  return (
    <section className='c-form box'>
      <div>
        <h2>Add New Prospects</h2>
        <ul>
          <li className='form-row'>
            <h4>Select User Type:<sup>*</sup></h4>
            <div className='multipleitem'>
              <select value={userType} onChange={(e) => setUserType(e.target.value)}>
                <option value="prospect">Prospect</option>
                <option value="orbiter">Orbiter</option>
              </select>
            </div>
          </li>
  
          {userType === 'orbiter' && (
            <>
          
          <li className='form-row'>
                <h4>Select MentOrbiter:<sup>*</sup></h4>
                <div className='autosuggest'>
                  <input
                    type="text"
                    placeholder="Search Orbiter"
                    value={userSearch}
                    onChange={handleSearchUser}
                  />
                  {filteredUsers.length > 0 && (
                    <ul className="dropdown">
                      {filteredUsers.map(user => (
                        <li key={user.id} onClick={() => handleSelectUser(user)}>
                          {user.name}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
  
              <li className='form-row'>
                <h4>Selected MentOrbiter Name:<sup>*</sup></h4>
                <div className='multipleitem'>
                  <p>{name}</p>
                </div>
              </li>
  
              <li className='form-row'>
                <h4>Selected MentOrbiter's Phone:<sup>*</sup></h4>
                <div className='multipleitem'>
                  <p>{phone}</p>
                </div>
              </li>
  
              <li className='form-row'>
                <h4>Selected MentOrbiter Email:<sup>*</sup></h4>
                <div className='multipleitem'>
                  <p>{orbiteremail}</p>
                </div>
              </li>
  
              <li className='form-row'>
                <h4>Prospect Name:<sup>*</sup></h4>
                <div className='multipleitem'>
                  <input
                    type="text"
                    value={prospectName}
                    onChange={(e) => setProspectName(e.target.value)}
                    placeholder="Enter Prospect Name"
                  />
                </div>
              </li>
  
              <li className='form-row'>
                <h4>Prospect Phone:<sup>*</sup></h4>
                <div className='multipleitem'>
                  <input
                    type="text"
                    value={prospectPhone}
                    onChange={(e) => setProspectPhone(e.target.value)}
                    placeholder="Enter Prospect Phone"
                  />
                </div>
              </li>
  
              <li className='form-row'>
                <h4>Email:<sup>*</sup></h4>
                <div className='multipleitem'>
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter Email"
                  />
                </div>
              </li>
  
              <li className='form-row'>
                <h4>Date:<sup>*</sup></h4>
                <div className='multipleitem'>
                  <input
                    type="datetime-local"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
              </li>
  
            
              <li className='form-row'>
              <h4>Occupation:<sup>*</sup></h4>
                <div className='multipleitem'>
                <select value={occupation} onChange={handleOccupationChange}>
                    <option value="Service">Service</option>
                    <option value="Student">Student</option>
                    <option value="Retired">Retired</option>
                    <option value="Business">Business</option>
                    <option value="professional">Professional</option>
                    <option value="Housewife">Housewife</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </li>
              <li className='form-row'>
                <h4>Hobbies:<sup>*</sup></h4>
                <div className='multipleitem'>
                  <input
                    type="text"
                    value={hobbies}
                    onChange={(e) => setHobbies(e.target.value)}
                    placeholder="Enter Hobbies"
                  />
                </div>
              </li>
  
              <li className='form-row'>
                <h4>Occasion for intimation:</h4>
                <div className='multipleitem'>
                  <select value={type} onChange={handleTypeChange}>
                    <option value="support_call">UJustBe Support team induced call</option>
                    <option value="orbiter_connection">Orbiter connects with UJustBe</option>
                    <option value="doorstep_service">UJustBe at your doorstep</option>
                    <option value="monthly_meeting">Monthly Meeting interactions</option>
                    <option value="e2a_interactions">E2A interactions</option>
                    <option value="unniversary_interactions">Unniversary Interactions - Introduced by NT</option>
                    <option value="support">UJustBe Support</option>
                    <option value="nt">NT</option>
                    <option value="management">Management</option>
                  </select>
                </div>
              </li>
            </>
          )}
 
          {userType === 'prospect' && (
            <>
              <li className='form-row'>
                <h4>Select MentOrbiter:<sup>*</sup></h4>
                <div className='autosuggest'>
                  <input
                    type="text"
                    placeholder="Search Orbiter"
                    value={userSearch}
                    onChange={handleSearchUser}
                  />
                  {filteredUsers.length > 0 && (
                    <ul className="dropdown">
                      {filteredUsers.map(user => (
                        <li key={user.id} onClick={() => handleSelectUser(user)}>
                          {user.name}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
  
              <li className='form-row'>
                <h4>Selected MentOrbiter Name:<sup>*</sup></h4>
                <div className='multipleitem'>
                  <p>{name}</p>
                </div>
              </li>
  
              <li className='form-row'>
                <h4>Selected MentOrbiter's Phone:<sup>*</sup></h4>
                <div className='multipleitem'>
                  <p>{phone}</p>
                </div>
              </li>
  
              <li className='form-row'>
                <h4>Selected MentOrbiter Email:<sup>*</sup></h4>
                <div className='multipleitem'>
                  <p>{orbiteremail}</p>
                </div>
              </li>
  
              <li className='form-row'>
                <h4>Prospect Name:<sup>*</sup></h4>
                <div className='multipleitem'>
                  <input
                    type="text"
                    value={prospectName}
                    onChange={(e) => setProspectName(e.target.value)}
                    placeholder="Enter Prospect Name"
                  />
                </div>
              </li>
  
              <li className='form-row'>
                <h4>Prospect Phone:<sup>*</sup></h4>
                <div className='multipleitem'>
                  <input
                    type="text"
                    value={prospectPhone}
                    onChange={(e) => setProspectPhone(e.target.value)}
                    placeholder="Enter Prospect Phone"
                  />
                </div>
              </li>
  
              <li className='form-row'>
                <h4>Email:<sup>*</sup></h4>
                <div className='multipleitem'>
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter Email"
                  />
                </div>
              </li>
  
              <li className='form-row'>
                <h4>Date:<sup>*</sup></h4>
                <div className='multipleitem'>
                  <input
                    type="datetime-local"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
              </li>
  
              <li className='form-row'>
              <h4>Occupation:<sup>*</sup></h4>
                <div className='multipleitem'>
                  <select value={occupation} onChange={handleOccupationChange}>
                    <option value="Service">Service</option>
                    <option value="Student">Student</option>
                    <option value="Retired">Retired</option>
                    <option value="Business">Business</option>
                    <option value="professional">Professional</option>
                    <option value="Housewife">Housewife</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </li>
  
              <li className='form-row'>
                <h4>Hobbies:<sup>*</sup></h4>
                <div className='multipleitem'>
                  <input
                    type="text"
                    value={hobbies}
                    onChange={(e) => setHobbies(e.target.value)}
                    placeholder="Enter Hobbies"
                  />
                </div>
              </li>
  
              <li className='form-row'>
                <h4>Occasion for intimation:</h4>
                <div className='multipleitem'>
                  <select value={type} onChange={handleTypeChange}>
                    <option value="support_call">UJustBe Support team induced call</option>
                    <option value="orbiter_connection">Orbiter connects with UJustBe</option>
                    <option value="doorstep_service">UJustBe at your doorstep</option>
                    <option value="monthly_meeting">Monthly Meeting interactions</option>
                    <option value="e2a_interactions">E2A interactions</option>
                    <option value="unniversary_interactions">Unniversary Interactions - Introduced by NT</option>
                    <option value="support">UJustBe Support</option>
                    <option value="nt">NT</option>
                    <option value="management">Management</option>
                  </select>
                </div>
              </li>
            </>
          )}
    <ul>
                        <li className='form-row'>
                            <div className='multipleitem'>
                                <button className='submitbtn' onClick={handleSubmit}>Register</button>
                            </div>
                        </li>
                    </ul>  

          
        </ul>
    
      </div>

    </section>
  );
  
};

export default Register;
