import { useState, useEffect } from "react";
import { db } from "../../firebaseConfig";
import { collection, addDoc, doc, getDoc } from "firebase/firestore";
import Swal from "sweetalert2";
import { COLLECTIONS } from "/utility_collection";
import "../../src/app/styles/main.scss";
import "../../pages/feedback.css";
import { useRouter } from "next/router";



const initialFormState = {
  fullName: "",
  phoneNumber: "",
  email: "",
  cityCountry: "",
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
  " Space for Personal Growth & Contribution",
  "Freedom to Express and Connect",
  "Business Promotion & Visibility",
  "Earning Through Referral",
  "Networking & Events"
];

const communicationOptions = [
  "Whatsapp",
  "Email",
  "Phone call"
]

const ProspectFeedbackForm = () => {
  const router = useRouter();
  const { id } = router.query;

  const [formData, setFormData] = useState(initialFormState);

  
  const [activeTab, setActiveTab] = useState(0); // Start with the first tab

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
      const subcollectionRef = collection(db, "Prospects", id, "prospectfeedbackform");
      await addDoc(subcollectionRef, formData);
      Swal.fire({ icon: "success", title: "Form Submitted!", text: "Thank you for assessing the prospect." });
      setFormData(initialFormState);
    } catch (error) {
      console.error("Submission error:", error);
      Swal.fire({ icon: "error", title: "Error", text: "Something went wrong. Please try again." });
    }
  };


  return (
    <section className="feedbackContainer">
      <div className="feedback_logo">
        <img src="/ujustlogo.png" alt="Logo" />
      </div>

      <div className="step-form-container">
   

  

      <form onSubmit={handleSubmit}>
     
      <div className="step-content active">
  <h3 className="formtitle">Prospect Feedback Form</h3>
  <h2>Thank you for taking time to connect with us. We would love to hear your feedback!</h2>

  {/* Prospect Name */}
  <div className="input-group">
    <label>Prospect Name</label>
    <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} required />
  </div>

  {/* Contact Number */}
  <div className="input-group">
    <label>Contact Number</label>
    <input type="text" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} required />
  </div>

  {/* Email Address */}
  <div className="input-group">
    <label>Email Address</label>
    <input type="email" name="email" value={formData.email} onChange={handleChange} required />
  </div>

  {/* Name of Orbiter */}
  <div className="input-group">
    <label>Name of the Orbiter</label>
    <input type="text" name="orbiterName" value={formData.mentorName} onChange={handleChange} required />
  </div>

  {/* Question 1 */}
  <div className="input-group">
    <label>How would you rate your understanding of UJustBe after today’s discussion?</label>
    <select name="understandingLevel" value={formData.understandingLevel} onChange={handleChange} required>
      <option value="">Select</option>
      <option value="Excellent">Excellent</option>
      <option value="Good">Good</option>
      <option value="Fair">Fair</option>
      <option value="Poor">Poor</option>
    </select>
  </div>

  {/* Question 2 */}
  <div className="input-group">
    <label>Did the call help you understand the possibilities for self-growth available at UJustBe?</label>
    <select name="selfGrowthUnderstanding" value={formData.selfGrowthUnderstanding} onChange={handleChange} required>
      <option value="">Select</option>
      <option value="Yes, very clearly">Yes, very clearly</option>
      <option value="Somewhat">Somewhat</option>
      <option value="No, still unclear">No, I'm still unclear</option>
    </select>
  </div>

  {/* Question 3 */}
  <div className="input-group">
    <label>Would you like to explore becoming a part of UJustBe?</label>
    <select name="joinInterest" value={formData.joinInterest} onChange={handleChange} required>
      <option value="">Select</option>
      <option value="Yes, I am interested">Yes, I am interested</option>
      <option value="I would like to think about it">I would like to think about it</option>
      <option value="No, not interested at the moment">No, not interested at the moment</option>
    </select>
  </div>

  {/* Question 4 */}
  <div className="input-group">
    <label>Which aspects of UJustBe did you find most interesting? (Check all that apply)</label>
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

  {/* Question 5 */}
  <div className="input-group">
    <label>Any specific questions or suggestions you have for UJustBe Support Team?</label>
    <textarea
      name="additionalComments"
      value={formData.additionalComments}
      onChange={handleChange}
      rows="3"
    />
  </div>

  {/* Question 6 */}
  <div className="input-group">
    <label>Preferred mode of further communication: (Check all that apply)</label>
    <div className="checkbox-group">
      {communicationOptions.map((option, idx) => (
        <div key={idx} className="checkbox-item">
          <input
            type="checkbox"
            id={`communication-${idx}`}
            value={option}
          checked={formData.communicationOptions?.includes(option)}

            onChange={(e) => handleCheckboxChange(e, "communicationOptions")}
          />
          <label htmlFor={`communication-${idx}`}>{option}</label>
        </div>
      ))}
    </div>
  </div>

  {/* Submit Button */}
  <button className="save-button" type="submit">
    Submit
  </button>

          </div>

      </form>
 </div>
 
      <h2 className="footers">Copyright @2025 | Powered by UJustBe</h2>
      
    </section>
  );
};

export default ProspectFeedbackForm;
