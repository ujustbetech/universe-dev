import { useState, useEffect } from "react";
import { db } from "../../firebaseConfig";
import { collection, addDoc, doc, getDoc } from "firebase/firestore";
import Swal from "sweetalert2";
import "../../src/app/styles/main.scss";
import "../../pages/feedback.css";
import { useRouter } from "next/router";



const tabs = ["1", "2", "3", "4"];



const initialFormState = {
  fullName: "",
  phoneNumber: "",
  email: "",
  country: "",
  city: "",
  profession: "",
  companyName: "",
  industry: "",
  socialProfile: "",
  howFound: "",
  interestLevel: "",
  interestAreas: [],
  contributionWays: [],
  informedStatus: "",
  alignmentLevel: "",
  recommendation: "",
  additionalComments: "",
  mentorName: "",
  mentorPhone: "",
  mentorEmail: "",
  assessmentDate: "",
};

const interestOptions = [
  "Skill Sharing & Collaboration",
  "Business Growth & Referrals",
  "Learning & Personal Development",
  "Community Engagement",
  "Others (please specify)"
];

const contributionOptions = [
  "Sharing knowledge and expertise",
  "Providing business or services",
  "Connecting with fellow Orbiters",
  "Active participation in events/meetings",
  "Other (please specify)"
];

const ProspectForm = () => {
  const router = useRouter();
  const { id } = router.query;
  const [countries, setCountries] = useState([]);
  const [cities, setCities] = useState([]);
  const [formData, setFormData] = useState(initialFormState);
  const [activeTab, setActiveTab] = useState(0); // Start with the first tab
  useEffect(() => {
    fetch('https://countriesnow.space/api/v0.1/countries/positions')
      .then(res => res.json())
      .then(data => setCountries(data.data.map(c => c.name)));
  }, []);

  const handleCountryChange = async (e) => {
    const country = e.target.value;
    setFormData(prev => ({ ...prev, country, city: '' }));

    const response = await fetch('https://countriesnow.space/api/v0.1/countries/cities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ country })
    });
    const data = await response.json();
    setCities(data.data);
  };

  const handleCityChange = (e) => {
    setFormData(prev => ({ ...prev, city: e.target.value }));
  };

  useEffect(() => {
    const fetchProspectDetails = async () => {
      if (!id) return;

      try {
        const prospectRef = doc(db, "Prospects", id);
        const prospectSnap = await getDoc(prospectRef);

        if (prospectSnap.exists()) {
          const data = prospectSnap.data();
          setFormData((prev) => ({
            ...prev,
            fullName: data.prospectName || "",
            phoneNumber: data.prospectPhone || "",
            email: data.email || "",
            mentorName: data.orbiterName || "",
            mentorPhone: data.orbiterContact || "",
            mentorEmail: data.orbiterEmail || "",
            profession: data.occupation || "",
          }));
        } else {
          Swal.fire({ icon: "error", title: "Error", text: "No prospect found with this ID." });
        }
      } catch (error) {
        console.error("Error fetching prospect:", error);
      }
    };
    fetchProspectDetails();
  }, [id]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCheckboxChange = (e, key) => {
    const { value, checked } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [key]: checked ? [...prevData[key], value] : prevData[key].filter((opt) => opt !== value),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!id) {
      Swal.fire({ icon: "error", title: "Invalid Link", text: "The prospect ID is missing from the URL." });
      return;
    }
    try {
      const subcollectionRef = collection(db, "Prospects", id, "prospectform");
      await addDoc(subcollectionRef, formData);
      Swal.fire({ icon: "success", title: "Form Submitted!", text: "Thank you for assessing the prospect." });
      setFormData(initialFormState);
    } catch (error) {
      console.error("Submission error:", error);
      Swal.fire({ icon: "error", title: "Error", text: "Something went wrong. Please try again." });
    }
  };
  const goToNextTab = () => {
    if (activeTab < tabs.length - 1) {
      setActiveTab(activeTab + 1);
    }
  };

  const goToPreviousTab = () => {
    if (activeTab > 0) {
      setActiveTab(activeTab - 1);
    }
  };
 
  return (
    <section className="feedbackContainer">
      <div className="feedback_logo">
        <img src="/ujustlogo.png" alt="Logo" />
      </div>

      <div className="step-form-container">
      <div className="step-progress-bar">  
  {tabs.map((tab, index) => (
    <div
      key={tab}
      className={`step ${activeTab === index ? "active" : ""}`} 
      onClick={() => setActiveTab(index)}
    >
      {tab}
    </div>
  ))}
</div>

  

      <form onSubmit={handleSubmit}>
        {activeTab === 0 && (
          <div className="step-content active">
             <h3 className="formtitle">MentOrbiter Details</h3>
            <div className="input-group"><label>Your Name</label><input type="text" name="mentorName" value={formData.mentorName} onChange={handleChange} required /></div>
            <div className="input-group"><label>Contact Number</label><input type="text" name="mentorPhone" value={formData.mentorPhone} onChange={handleChange} required /></div>
            <div className="input-group"><label>Email Address</label><input type="email" name="mentorEmail" value={formData.mentorEmail} onChange={handleChange} required /></div>
            <div className="input-group"><label>Date of Assessment</label><input type="date" name="assessmentDate" value={formData.assessmentDate} onChange={handleChange} required /></div>
          </div>
        )}

        {activeTab === 1 && (
          <div className="step-content active">
             <h3 className="formtitle">Prospect Details</h3>
            <div className="input-group"><label>Prospect Name</label><input type="text" name="fullName" value={formData.fullName} onChange={handleChange} required /></div>
            <div className="input-group"><label>Contact Number</label><input type="text" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} required /></div>
            <div className="input-group"><label>Email Address</label><input type="email" name="email" value={formData.email} onChange={handleChange} required /></div>
            <div>
      <div className="input-group">
        <label>Country</label>
        <select value={formData.country} onChange={handleCountryChange} required>
          <option value="">Select Country</option>
          {countries.map((country, idx) => (
            <option key={idx} value={country}>{country}</option>
          ))}
        </select>
      </div>

      <div className="input-group">
        <label>City</label>
        <select value={formData.city} onChange={handleCityChange} required>
          <option value="">Select City</option>
          {cities.map((city, idx) => (
            <option key={idx} value={city}>{city}</option>
          ))}
        </select>
      </div>
    </div>
            <div className="input-group"><label>Occupation</label><input type="text" name="profession" value={formData.profession} onChange={handleChange} required /></div>
            <div className="input-group"><label>Company</label><input type="text" name="companyName" value={formData.companyName} onChange={handleChange} /></div>
            <div className="input-group"><label>Industry</label><input type="text" name="industry" value={formData.industry} onChange={handleChange} required /></div>
            <div className="input-group"><label>Social Profile</label><input type="text" name="socialProfile" value={formData.socialProfile} onChange={handleChange} /></div>
          </div>
        )}

        {activeTab === 2 && (
          <div className="step-content active">
           <h3 className="formtitle">Alignment with UJustBe</h3>
          <div className="input-group">
            <label>How did you come across this prospect?</label>
            <select name="howFound" value={formData.howFound} onChange={handleChange} required>
              <option value="">Select</option>
              <option value="Referral">Referral</option>
              <option value="Networking Event">Networking Event</option>
              <option value="Social Media">Social Media</option>
              <option value="Other">Other (please specify)</option>
            </select>
          </div>

          <div className="input-group">
            <label>Has the prospect shown interest in enrolling?</label>
            <select name="interestLevel" value={formData.interestLevel} onChange={handleChange} required>
              <option value="">Select</option>
              <option value="Actively involved">Yes, actively involved</option>
              <option value="Some interest">Some interest but not actively engaged</option>
              <option value="Unfamiliar but open">Unfamiliar but open to exploring</option>
            </select>
          </div>

          <div className="input-group">
            <label>Interest Areas (Check all that apply)</label>
            <div className="checkbox-group">
              {interestOptions.map((option, idx) => (
                <div key={idx} className="checkbox-item">
                  <input
                    type="checkbox"
                    id={`interest-${idx}`}
                    value={option}
                    checked={formData.interestAreas.includes(option)}
                    onChange={(e) => handleCheckboxChange(e, "interestAreas")}
                  />
                  <label htmlFor={`interest-${idx}`}>{option}</label>
                </div>
              ))}
            </div>
          </div>

          <div className="input-group">
            <label>How would the prospect contribute? (Check all that apply)</label>
            <div className="checkbox-group">
              {contributionOptions.map((option, idx) => (
                <div key={idx} className="checkbox-item">
                  <input
                    type="checkbox"
                    id={`contribution-${idx}`}
                    value={option}
                    checked={formData.contributionWays.includes(option)}
                    onChange={(e) => handleCheckboxChange(e, "contributionWays")}
                  />
                  <label htmlFor={`contribution-${idx}`}>{option}</label>
                </div>
              ))}
            </div>
          </div>

          <div className="input-group">
            <label>Has the prospect been informed about UJustBe?</label>
            <select name="informedStatus" value={formData.informedStatus} onChange={handleChange} required>
              <option value="">Select</option>
              <option value="Fully aware">Yes, they are fully aware</option>
              <option value="Partially aware">Partially, but open to learning more</option>
              <option value="Not informed">No, needs a detailed introduction</option>
            </select>
          </div>

          </div>
        )}
{activeTab === 3 && (
  <div className="step-content active">
    <h3 className="formtitle">Assessment & Recommendation</h3>
    <div className="input-group">
      <label>Alignment Level</label>
      <select
        name="alignmentLevel"
        value={formData.alignmentLevel}
        onChange={handleChange}
        required
      >
        <option value="">Select</option>
        <option value="Not aligned">Not aligned</option>
        <option value="Slightly aligned">Slightly aligned</option>
        <option value="Neutral">Neutral</option>
        <option value="Mostly aligned">Mostly aligned</option>
        <option value="Fully aligned">Fully aligned</option>
      </select>
    </div>
    <div className="input-group">
      <label>Recommendation</label>
      <select
        name="recommendation"
        value={formData.recommendation}
        onChange={handleChange}
        required
      >
        <option value="">Select</option>
        <option value="Strongly recommended">Strongly recommended</option>
        <option value="Needs alignment">Needs alignment</option>
        <option value="Not recommended">Not recommended</option>
      </select>
    </div>
    <div className="input-group">
      <label>Additional Comments</label>
      <textarea
        name="additionalComments"
        value={formData.additionalComments}
        onChange={handleChange}
        rows="3"
      />
    </div>
  </div>
)}

<div className="nav-buttons">
  <button type="button" onClick={goToPreviousTab} disabled={activeTab === 0}>
    Back
  </button>

  {activeTab === tabs.length - 1 ? (
    <button className="login-button" type="submit">
      Submit
    </button>
  ) : (
    <button type="button" onClick={goToNextTab}>
      Next
    </button>
  )}
</div>

      </form>
 </div>
 
      <h2 className="footers">Copyright @2025 | Powered by UJustBe</h2>
      
    </section>
  );
};

export default ProspectForm;
