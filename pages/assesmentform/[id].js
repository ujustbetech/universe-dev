import { useState, useEffect } from "react";
import { db } from "../../firebaseConfig";
import { collection, addDoc, doc, getDoc } from "firebase/firestore";
import Swal from "sweetalert2";
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
  day14Journey: "",
  day14Comments: "",
  totalCCPoints: "",
  contributedActivities: [],
  alignmentWithValues: "",
  engagementFrequency: "",
  biggestChallenge: "",
  additionalSupport: "",
  supportDetails: "",
};


const ProspectFeedbackForm = () => {
  const router = useRouter();
  const { id } = router.query;

  const [formData, setFormData] = useState(initialFormState);

  
  

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
      const subcollectionRef = collection(db, "Prospects", id, "assesmentform");
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

  
{/* 1. Journey from Day 1 to Day 14 */}
<div className="input-group">
  <label>1. How would you describe your journey from Day 1 to Day 14?</label>
  {["Very Engaging and Aligned", "Mostly Positive with Minor Gaps", "Neutral / Still Exploring", "Confusing or Challenging", "Not Aligned with Expectations"].map((option) => (
    <label key={option}>
      <input
        type="radio"
        name="day14Journey"
        value={option}
        checked={formData.day14Journey === option}
        onChange={handleChange}
        required
      />
      {option}
    </label>
  ))}
</div>
<div className="input-group">
  <label>Comments (Optional):</label>
  <input
    type="text"
    name="day14Comments"
    value={formData.day14Comments}
    onChange={handleChange}
  />
</div>

{/* 2. Total CC Points */}
<div className="input-group">
  <label>2. Total CC Points Earned:</label>
  {["0–10", "11–25", "26–50", "51+"].map((option) => (
    <label key={option}>
      <input
        type="radio"
        name="totalCCPoints"
        value={option}
        checked={formData.totalCCPoints === option}
        onChange={handleChange}
        required
      />
      {option}
    </label>
  ))}
</div>

{/* 3. Activities Contributed Toward */}
<div className="input-group">
  <label>3. Activities Contributed Toward (Check all that apply):</label>
  {[
    "Attended Monthly Meeting",
    "Participated in Campaign",
    "Made Referrals",
    "Joined One-on-One Calls",
    "Shared Feedback or Ideas",
  ].map((activity) => (
    <label key={activity}>
      <input
        type="checkbox"
        value={activity}
        checked={formData.contributedActivities.includes(activity)}
        onChange={(e) => handleCheckboxChange(e, "contributedActivities")}
      />
      {activity}
    </label>
  ))}
  <label>
    <input
      type="checkbox"
      value="Other"
      checked={formData.contributedActivities.includes("Other")}
      onChange={(e) => handleCheckboxChange(e, "contributedActivities")}
    />
    Other:
    <input
      type="text"
      name="otherActivity"
      onChange={handleChange}
      placeholder="Specify if Other"
    />
  </label>
</div>

{/* 4. Alignment with Values */}
<div className="input-group">
  <label>4. How aligned do you feel with UJustBe values and culture?</label>
  {["Fully Aligned", "Mostly Aligned", "Partially Aligned", "Still Trying to Understand", "Misaligned"].map((option) => (
    <label key={option}>
      <input
        type="radio"
        name="alignmentWithValues"
        value={option}
        checked={formData.alignmentWithValues === option}
        onChange={handleChange}
        required
      />
      {option}
    </label>
  ))}
</div>

{/* 5. Frequency of Engagement */}
<div className="input-group">
  <label>5. Frequency of Engagement</label>
  {["Daily", "2-3 times a week", "Once a week", "Rarely"].map((option) => (
    <label key={option}>
      <input
        type="radio"
        name="engagementFrequency"
        value={option}
        checked={formData.engagementFrequency === option}
        onChange={handleChange}
        required
      />
      {option}
    </label>
  ))}
</div>

{/* 6. Biggest Challenge Faced */}
<div className="input-group">
  <label>6. Biggest Challenge Faced</label>
  {[
    "Clarity in tasks",
    "Cultural fit",
    "Time commitment",
    "Communication",
    "Lack of confidence",
  ].map((challenge) => (
    <label key={challenge}>
      <input
        type="radio"
        name="biggestChallenge"
        value={challenge}
        checked={formData.biggestChallenge === challenge}
        onChange={handleChange}
        required
      />
      {challenge}
    </label>
  ))}
  <label>
    <input
      type="radio"
      name="biggestChallenge"
      value="Other"
      checked={formData.biggestChallenge === "Other"}
      onChange={handleChange}
    />
    Other:
    <input
      type="text"
      name="otherChallenge"
      onChange={handleChange}
      placeholder="Specify if Other"
    />
  </label>
</div>

{/* 7. Need Additional Support */}
<div className="input-group">
  <label>7. Do you require any additional support or guidance?</label>
  <label>
    <input
      type="radio"
      name="additionalSupport"
      value="Yes"
      checked={formData.additionalSupport === "Yes"}
      onChange={handleChange}
      required
    />
    Yes
  </label>
  <label>
    <input
      type="radio"
      name="additionalSupport"
      value="No"
      checked={formData.additionalSupport === "No"}
      onChange={handleChange}
    />
    No
  </label>
  {formData.additionalSupport === "Yes" && (
    <input
      type="text"
      name="supportDetails"
      placeholder="Please specify"
      value={formData.supportDetails}
      onChange={handleChange}
    />
  )}
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
