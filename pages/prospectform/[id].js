import { useState, useEffect } from "react";
import { db } from "../../firebaseConfig";
import { collection, addDoc, doc, getDoc } from "firebase/firestore";
import Swal from "sweetalert2";
import { useRouter } from "next/router";
import HeaderNav from "../../component/HeaderNav";

import "../../src/app/styles/prospectForm.scss";
import Headertop from "../../component/Header";

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
  const [activeTab, setActiveTab] = useState(0);
  const [formData, setFormData] = useState(initialFormState);

  // Fetch Country List
  useEffect(() => {
    fetch("https://countriesnow.space/api/v0.1/countries/positions")
      .then(res => res.json())
      .then(data => setCountries(data.data.map(c => c.name)));
  }, []);

  // Fetch Cities When Country Changes
  const handleCountryChange = async (e) => {
    const country = e.target.value;
    setFormData(prev => ({ ...prev, country, city: "" }));

    const response = await fetch(
      "https://countriesnow.space/api/v0.1/countries/cities",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country })
      }
    );

    const data = await response.json();
    setCities(data.data || []);
  };

  const handleCityChange = (e) => {
    setFormData(prev => ({ ...prev, city: e.target.value }));
  };

  // Fetch Prospect Auto-Population
  useEffect(() => {
    const fetchProspectDetails = async () => {
      if (!id) return;

      const prospectRef = doc(db,COLLECTIONS.prospect, id);
      const snap = await getDoc(prospectRef);

      if (snap.exists()) {
        const data = snap.data();
        setFormData(prev => ({
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
        Swal.fire("Error", "Invalid Prospect ID", "error");
      }
    };

    fetchProspectDetails();
  }, [id]);

  // Form Field Change
  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleCheckboxChange = (e, key) => {
    const { value, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [key]: checked
        ? [...prev[key], value]
        : prev[key].filter(v => v !== value),
    }));
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();

    const subcollectionRef = collection(db, COLLECTIONS.prospect, id, "prospectform");

    try {
      await addDoc(subcollectionRef, formData);
      Swal.fire("Success", "Assessment Submitted!", "success");
      setFormData(initialFormState);
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Something went wrong.", "error");
    }
  };

  const nextTab = () => activeTab < tabs.length - 1 && setActiveTab(activeTab + 1);
  const prevTab = () => activeTab > 0 && setActiveTab(activeTab - 1);

  return (
    <main className="pageContainer">
      <Headertop />
      <section className="dashBoardMain profileMainPage">
        <div className="pf-container">


          <div className="pf-card">

            {/* Step Indicators */}
            <div className="pf-steps">
              {tabs.map((tab, i) => (
                <div
                  key={i}
                  className={`pf-step ${activeTab === i ? "active" : ""}`}
                  onClick={() => setActiveTab(i)}
                >
                  {tab}
                </div>
              ))}
            </div>

            <form onSubmit={handleSubmit}>

              {/* TAB 1 */}
              {activeTab === 0 && (
                <div className="pf-section">
                  <h3 className="formtitle">MentOrbiter Details</h3>

                  <div className="pf-field">
                    <label>Your Name</label>
                    <input type="text" name="mentorName"
                      value={formData.mentorName} onChange={handleChange} required />
                  </div>

                  <div className="pf-field">
                    <label>Contact Number</label>
                    <input type="text" name="mentorPhone"
                      value={formData.mentorPhone} onChange={handleChange} required />
                  </div>

                  <div className="pf-field">
                    <label>Email Address</label>
                    <input type="email" name="mentorEmail"
                      value={formData.mentorEmail} onChange={handleChange} required />
                  </div>

                  <div className="pf-field">
                    <label>Date of Assessment</label>
                    <input type="date" name="assessmentDate"
                      value={formData.assessmentDate} onChange={handleChange} required />
                  </div>
                </div>
              )}

              {/* TAB 2 */}
              {activeTab === 1 && (
                <div className="pf-section">
                  <h3 className="formtitle">Prospect Details</h3>

                  <div className="pf-field">
                    <label>Prospect Name</label>
                    <input type="text" name="fullName"
                      value={formData.fullName} onChange={handleChange} required />
                  </div>

                  <div className="pf-field">
                    <label>Contact Number</label>
                    <input type="text" name="phoneNumber"
                      value={formData.phoneNumber} onChange={handleChange} required />
                  </div>

                  <div className="pf-field">
                    <label>Email Address</label>
                    <input type="email" name="email"
                      value={formData.email} onChange={handleChange} required />
                  </div>

                  {/* Country */}
                  <div className="pf-field">
                    <label>Country</label>
                    <select value={formData.country}
                      onChange={handleCountryChange} required>
                      <option value="">Select Country</option>
                      {countries.map((c, i) => (
                        <option key={i} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  {/* City */}
                  <div className="pf-field">
                    <label>City</label>
                    <select value={formData.city}
                      onChange={handleCityChange} required>
                      <option value="">Select City</option>
                      {cities.map((city, i) => (
                        <option key={i} value={city}>{city}</option>
                      ))}
                    </select>
                  </div>

                  <div className="pf-field">
                    <label>Occupation</label>
                    <input type="text" name="profession"
                      value={formData.profession} onChange={handleChange} required />
                  </div>

                  <div className="pf-field">
                    <label>Company</label>
                    <input type="text" name="companyName"
                      value={formData.companyName} onChange={handleChange} />
                  </div>

                  <div className="pf-field">
                    <label>Industry</label>
                    <input type="text" name="industry"
                      value={formData.industry} onChange={handleChange} required />
                  </div>

                  <div className="pf-field">
                    <label>Social Profile</label>
                    <input type="text" name="socialProfile"
                      value={formData.socialProfile} onChange={handleChange} />
                  </div>
                </div>
              )}

              {/* TAB 3 */}
              {activeTab === 2 && (
                <div className="pf-section">
                  <h3 className="formtitle">Alignment with UJustBe</h3>

                  <div className="pf-field">
                    <label>How did you find the prospect?</label>
                    <select name="howFound" value={formData.howFound}
                      onChange={handleChange}>
                      <option value="">Select</option>
                      <option value="Referral">Referral</option>
                      <option value="Networking Event">Networking Event</option>
                      <option value="Social Media">Social Media</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="pf-field">
                    <label>Interest Level</label>
                    <select name="interestLevel" value={formData.interestLevel}
                      onChange={handleChange}>
                      <option value="">Select</option>
                      <option value="Actively involved">Actively involved</option>
                      <option value="Some interest">Some interest</option>
                      <option value="Unfamiliar but open">Unfamiliar but open</option>
                    </select>
                  </div>

                  <div className="pf-field">
                    <label>Interest Areas</label>
                    <div className="pf-checkbox-group">
                      {interestOptions.map((opt, i) => (
                        <div key={i} className="pf-checkbox-item">
                          <input
                            type="checkbox"
                            value={opt}
                            checked={formData.interestAreas.includes(opt)}
                            onChange={(e) =>
                              handleCheckboxChange(e, "interestAreas")
                            }
                          />
                          <label>{opt}</label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pf-field">
                    <label>Contribution Ways</label>
                    <div className="pf-checkbox-group">
                      {contributionOptions.map((opt, i) => (
                        <div key={i} className="pf-checkbox-item">
                          <input
                            type="checkbox"
                            value={opt}
                            checked={formData.contributionWays.includes(opt)}
                            onChange={(e) =>
                              handleCheckboxChange(e, "contributionWays")
                            }
                          />
                          <label>{opt}</label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pf-field">
                    <label>Informed Status</label>
                    <select name="informedStatus" value={formData.informedStatus}
                      onChange={handleChange}>
                      <option value="">Select</option>
                      <option value="Fully aware">Fully aware</option>
                      <option value="Partially aware">Partially aware</option>
                      <option value="Not informed">Not informed</option>
                    </select>
                  </div>
                </div>
              )}

              {/* TAB 4 */}
              {activeTab === 3 && (
                <div className="pf-section">
                  <h3 className="formtitle">Assessment & Recommendation</h3>

                  <div className="pf-field">
                    <label>Alignment Level</label>
                    <select name="alignmentLevel" value={formData.alignmentLevel}
                      onChange={handleChange}>
                      <option value="">Select</option>
                      <option value="Not aligned">Not aligned</option>
                      <option value="Slightly aligned">Slightly aligned</option>
                      <option value="Neutral">Neutral</option>
                      <option value="Mostly aligned">Mostly aligned</option>
                      <option value="Fully aligned">Fully aligned</option>
                    </select>
                  </div>

                  <div className="pf-field">
                    <label>Recommendation</label>
                    <select name="recommendation" value={formData.recommendation}
                      onChange={handleChange}>
                      <option value="">Select</option>
                      <option value="Strongly recommended">Strongly recommended</option>
                      <option value="Needs alignment">Needs alignment</option>
                      <option value="Not recommended">Not recommended</option>
                    </select>
                  </div>

                  <div className="pf-field">
                    <label>Additional Comments</label>
                    <textarea
                      name="additionalComments"
                      rows="3"
                      value={formData.additionalComments}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              )}

              {/* Buttons */}
              <div className="pf-nav">
                <button type="button" onClick={prevTab} disabled={activeTab === 0}>
                  Back
                </button>

                {activeTab === tabs.length - 1 ? (
                  <button type="submit" className="pf-submit">Submit</button>
                ) : (
                  <button type="button" onClick={nextTab}>Next</button>
                )}
              </div>
            </form>
          </div>
        </div>
        <HeaderNav />
      </section>
    </main>
  );
};

export default ProspectForm;
