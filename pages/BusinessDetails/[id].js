import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { getFirestore, doc, getDoc, collection, getDocs, addDoc,query,orderBy,limit } from "firebase/firestore";
import { CiImageOn } from "react-icons/ci";
import { app } from "../../firebaseConfig";
import HeaderNav from "../../component/HeaderNav";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Radio, RadioGroup, FormControlLabel } from "@mui/material";
import "../../src/app/styles/user.scss";
import { MdArrowBack } from "react-icons/md";
import { FaMapMarkerAlt } from "react-icons/fa";
import { FaUser } from "react-icons/fa";
import Slider from "react-slick";
import { CiImageOff } from "react-icons/ci";
// Import css files
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import Headertop from "../../component/Header";
import { COLLECTIONS } from "/utility_collection";
import toast from "react-hot-toast";
const db = getFirestore(app);

const ReferralDetails = () => {
  const router = useRouter();
  const { id } = router.query;
  const [refType, setRefType] = useState("Self");
  const [otherName, setOtherName] = useState("");
  const [otherPhone, setOtherPhone] = useState("");
  const [otherEmail, setOtherEmail] = useState("");
  const [selectedOption, setSelectedOption] = useState(""); // For selected service/product
  const [isDialogOpen, setIsDialogOpen] = useState(false); // For opening/closing the dropdown modal
  const [leadDescription, setLeadDescription] = useState(""); // Short description
  const [selectedFor, setSelectedFor] = useState("self"); // For Self / Someone Else

  const [dropdownOpen, setDropdownOpen] = useState(false); // dropdown toggle
  const [modalOpen, setModalOpen] = useState(false);
  const [userDetails, setUserDetails] = useState(null);
  const [orbiterDetails, setOrbiterDetails] = useState(null);
  const [services, setServices] = useState([]);
  const [products, setProducts] = useState([]);
  const [activeTab, setActiveTab] = useState("about");
  const [servicesLoaded, setServicesLoaded] = useState(false);
  const [productsLoaded, setProductsLoaded] = useState(false);

  const sliderSettings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    swipe: true,           // Enable swipe
    touchThreshold: 10,    // Sensitivity
    adaptiveHeight: true,  // Adjust slider height per slide
    draggable: true,       // Enable mouse drag on desktop
    lazyLoad: "ondemand", // Key: Lazy load images on-demand
  };

  const handleTabClick = (tab) => {
    setActiveTab(tab);
    if (tab === "services") setServicesLoaded(true);
    if (tab === "products") setProductsLoaded(true);
  };


useEffect(() => {
  const storedUJBCode = localStorage.getItem("mmUJBCode");
  if (!storedUJBCode) return;

  const fetchOrbiter = async () => {
    try {
      const snap = await getDoc(doc(db, COLLECTIONS.userDetail, storedUJBCode));
      if (snap.exists()) {
        const data = snap.data();
        setOrbiterDetails({
          name: data["Name"] || "",
          email: data.Email || "",
          phone: data["MobileNo"] || "",
          ujbCode: data["UJBCode"] || "",
          mentorName: data["MentorName"] || "",
          mentorPhone: data["MentorPhone"] || "",
        });
      }
    } catch (err) {
      console.error("Error fetching orbiter details:", err);
    }
  };

  fetchOrbiter();
}, []);
useEffect(() => {
  const storedUJBCode = id || localStorage.getItem("mmUJBCode");
  if (!storedUJBCode) return;

  const fetchCosmo = async () => {
    try {
      const snap = await getDoc(doc(db, COLLECTIONS.userDetail, storedUJBCode));
      if (snap.exists()) {
        const data = snap.data();
        console.log("orbiter data", data);

        setUserDetails({
          name: data["Name"] || "",
          email: data.Email || "",
          phone: data["MobileNo"] || "",
          businessName: data["BusinessName"] || "N/A",
          businessDetails: data["BusinessDetails"] || "N/A", // fixed field name
          tagline: data["TagLine"] || "",
          logo: data["BusinessLogo"] || "",
          profilePic: data["ProfilePhotoURL"] || "",
          ujbCode: data["UJBCode"] || "",
          businessType: data["BusinessDetails(Nature & Type)"] || "", // fix exact Firestore key
          Locality: data.Locality || "",
          City: data.City || "",
          State: data.State || "",
          services: Array.isArray(data.services) ? data.services : [],
          products: Array.isArray(data.products) ? data.products : [],
          category: data.Category || '',
          category1: data['Category1'] || '',
          category2: data['Category2'] || '',
        });

        setServices(Array.isArray(data.services) ? data.services : []);
        setProducts(Array.isArray(data.products) ? data.products : []);
      }
    } catch (err) {
      console.error("Error fetching CosmoOrbiter details:", err);
    }
  };

  fetchCosmo();
}, [id]);

const generateReferralId = async () => {
  const now = new Date();
  const year1 = now.getFullYear() % 100;
  const year2 = (now.getFullYear() + 1) % 100;
  const refPrefix = `Ref/${year1}-${year2}/`;

  try {
    // Fetch the latest referral document (ordered by timestamp)
    const q = query(collection(db, COLLECTIONS.referral), orderBy("timestamp", "desc"), limit(1));
    const snapshot = await getDocs(q);

    let lastNum = 2999; // Start base number (Ref/25-26/00003000)

    if (!snapshot.empty) {
      const lastRef = snapshot.docs[0].data().referralId;
      const match = lastRef?.match(/\/(\d{8})$/);
      if (match) lastNum = parseInt(match[1]);
    }

    // Increment and generate new ID
    const newId = `${refPrefix}${String(lastNum + 1).padStart(8, "0")}`;
    return newId;
  } catch (error) {
    console.error("Error generating referral ID:", error);
    throw error;
  }
};


const handlePassReferral = async () => {
  if (!orbiterDetails && selectedFor === "self") {
    toast.error("Orbiter details not found.");
    return;
  }

  if (!userDetails) {
    toast.error("CosmoOrbiter details not found.");
    return;
  }

  if (!selectedOption) {
    toast.error("Please select a service or product to refer.");
    return;
  }

  if (!leadDescription || leadDescription.trim() === "") {
    toast.error("Please enter a short description of the lead.");
    return;
  }

  try {
    const referralId = await generateReferralId();

    const selectedService = services.find((s) => s.name === selectedOption) || null;
    const selectedProduct = products.find((p) => p.name === selectedOption) || null;

    const data = {
      referralId,
      referralSource: "R",
      referralType: selectedFor === "self" ? "Self" : "Others",
      leadDescription,
      dealStatus: "Pending",
      lastUpdated: new Date(),
      timestamp: new Date(),
      cosmoOrbiter: {
        name: userDetails.name,
        email: userDetails.email,
        phone: userDetails.phone,
        mentorName: userDetails.mentorName || null,
        mentorPhone: userDetails.mentorPhone || null,
      },
      orbiter:
        selectedFor === "self"
          ? orbiterDetails
          : { name: otherName, phone: otherPhone, email: otherEmail },
      product: selectedProduct
        ? {
            name: selectedProduct.name,
            description: selectedProduct.description,
            imageURL: selectedProduct.imageURL || "",
            percentage: selectedProduct.percentage || "0",
          }
        : null,
      service: selectedService
        ? {
            name: selectedService.name,
            description: selectedService.description,
            imageURL: selectedService.imageURL || "",
            percentage: selectedService.percentage || "0",
          }
        : null,
      dealLogs: [],
      followups: [],
      statusLogs: [],
    };

    await addDoc(collection(db,COLLECTIONS.referral), data);

    // Determine service or product name
    const serviceOrProduct = selectedService?.name || selectedProduct?.name || "";

    // Send WhatsApp messages to all 4 people
    await Promise.all([
      // 1. Orbiter
      sendWhatsAppMessage(
        orbiterDetails.phone,
        [
          orbiterDetails.name,
          `🚀 You’ve just passed a referral for *${serviceOrProduct}* to *${userDetails.name}*. It’s now in motion and will be actioned within 24 hours. 🌱`
        ]
      ),
      // 2. CosmoOrbiter
      sendWhatsAppMessage(
        userDetails.phone,
        [
          userDetails.name,
          `✨ You’ve received a referral from *${orbiterDetails.name}* for *${serviceOrProduct}*. Please act within 24 hours!`
        ]
      ),
      // 3. Orbiter's Mentor (if exists)
      orbiterDetails.mentorPhone
        ? sendWhatsAppMessage(
            orbiterDetails.mentorPhone,
            [
              orbiterDetails.mentorName || "Mentor",
              `Your connect *${orbiterDetails.name}* passed a referral. 🚀`
            ]
          )
        : Promise.resolve(),
      // 4. CosmoOrbiter's Mentor (if exists)
      userDetails.mentorPhone
        ? sendWhatsAppMessage(
            userDetails.mentorPhone,
            [
              userDetails.mentorName || "Mentor",
              `Your connect *${userDetails.name}* received a referral. 🌱`
            ]
          )
        : Promise.resolve(),
    ]);

    toast.success("Referral passed successfully!");

    // Reset fields
    setSelectedOption(null);
    setDropdownOpen(false);
    setLeadDescription("");
    setOtherName("");
    setOtherPhone("");
    setOtherEmail("");
    setSelectedFor("self");
    setModalOpen(false);
  } catch (err) {
    console.error("Error passing referral:", err);
    toast.error("Failed to pass referral.");
  }
};



// 📩 WhatsApp sender function — fixed template name
const sendWhatsAppMessage = async (phone, parameters = []) => {
  const formattedPhone = String(phone || "").replace(/\s+/g, "");

  const payload = {
    messaging_product: "whatsapp",
    to: formattedPhone,
    type: "template",
    template: {
      name: "referral_module", // ✅ fixed template name
      language: { code: "en" },
      components: [
        {
          type: "body",
          parameters: parameters.map((param) => ({
            type: "text",
            text: param,
          })),
        },
      ],
    },
  };

  try {
    const response = await fetch("https://graph.facebook.com/v19.0/527476310441806/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization:
          "Bearer EAAHwbR1fvgsBOwUInBvR1SGmVLSZCpDZAkn9aZCDJYaT0h5cwyiLyIq7BnKmXAgNs0ZCC8C33UzhGWTlwhUarfbcVoBdkc1bhuxZBXvroCHiXNwZCZBVxXlZBdinVoVnTB7IC1OYS4lhNEQprXm5l0XZAICVYISvkfwTEju6kV4Aqzt4lPpN8D3FD7eIWXDhnA4SG6QZDZD",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("WhatsApp API Error:", data);
    } else {
      console.log("WhatsApp message sent successfully:", data);
    }
  } catch (error) {
    console.error("Error sending WhatsApp message:", error);
  }
};


  const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase();

  if (!orbiterDetails || !userDetails) return <div className='loader'>
    <span className="loader2"></span>
  </div>;

  return (
    <main className="pageContainer businessDetailsPage">
      <Headertop/>

      <section className='p-meetingDetails'>
        <div className='container pageHeading'>



          <div className='DetailsCards'>
            <img
              src={userDetails.profilePic || ''}
              alt={userDetails.businessName || 'Business Image'}
              className="details-image"
            />
          </div>




          {/* Round Business Logo */}
          <div className="profile-header businessProfile">

            <div className="profile-round-image ">
              {userDetails.profilePic || userDetails.logo ? (
                <img
                  src={userDetails.logo}
                  alt={userDetails.name || "User Logo"}
                />
              ) : (
                <FaUser />
              )}
            </div>

          </div>

          <div className="event-container">
            <div className="event-content businessDetail">
              <div className="businessCode">
                <p><strong>{userDetails.ujbCode || "N/A"}</strong>
                </p>
                <p>
                  {/* <strong>{userDetails.businessType || "N/A"}</strong> */}
                </p>

              </div>
              <div className="profile-info-card">


                {/* Business Name */}
                <h2 className="profile-business-name">{userDetails.businessName}</h2>
                <p className="profile-business-owner">
                  (<strong>{userDetails.name || "N/A"}</strong>)
                </p>


                {[userDetails.category1, userDetails.category2]
                  .filter(Boolean).length > 0 && (
                    <ul className="categoryList">
                      {[userDetails.category1, userDetails.category2].map(
                        (cat, index) =>
                          cat && (
                            <li key={index}>
                              {cat}
                            </li>
                          )
                      )}
                    </ul>
                  )}
                {/* Location */}
                <p className="profile-business-location">
                  <FaMapMarkerAlt /> {userDetails.Locality || "N/A"}
                </p>
              </div>

              {/* Tabs */}
              <div className="custom-tabs">
                <button
                  className={`custom-tab ${activeTab === "about" ? "active" : ""}`}
                  onClick={() => handleTabClick("about")}
                >
                  About
                </button>

                {services && services.length > 0 && (
                  <button
                    className={`custom-tab ${activeTab === "services" ? "active" : ""}`}
                    onClick={() => handleTabClick("services")}
                  >
                    Services
                  </button>
                )}

                {products && products.length > 0 && (
                  <button
                    className={`custom-tab ${activeTab === "products" ? "active" : ""}`}
                    onClick={() => handleTabClick("products")}
                  >
                    Products
                  </button>
                )}
              </div>

              <div className='eventinnerContent'>
                {/* About Section */}
                {activeTab === "about" && (
                  <div className="tabs about-section">
                    <div>
                      <p>{userDetails.businessDetails || null}</p>
                    </div>
                    <div>
                      {userDetails.tagline || "Tagline not available"}
                    </div>

                  </div>
                )}

                {servicesLoaded && (
                  <div style={{ display: activeTab === "services" ? "block" : "none" }}>
                    {services.length > 0 ? (
                      <Slider {...sliderSettings}>
                        {services.map((srv, i) => (
                          // const imageSrc = srv.imageURL; // use the URL directly

                          <div key={i} >
                            <div className="productCard">
                              <div className="productImage">
                                {srv.imageURL ? (
                                  <img
                                    src={srv.imageURL}
                                    alt={srv.name}
                                    className="offering-image"
                                  />
                                ) : (
                                  <CiImageOff className="offering-image" />
                                )}
                              </div>

                              <h4>{srv.name}</h4>
                              <p>{srv.description}</p>
                              {srv.percentage && <p>Agreed Percentage: {srv.percentage}%</p>}
                            </div>
                          </div>
                        ))}
                      </Slider>
                    ) : (
                      <p>No services available</p>
                    )}
                  </div>
                )}

                {productsLoaded && (
                  <div style={{ display: activeTab === "products" ? "block" : "none" }}>
                    {products.length > 0 ? (
                      <Slider {...sliderSettings}>
                        {products.map((prd, i) => (
                          <div key={i}>
                            <div className="productCard">
                              <div className="productImage">
                                {prd.imageURL ? (
                                  <img
                                    src={prd.imageURL}
                                    alt={prd.name}
                                  />
                                ) : (
                                  <div className="nothumbnail">
                                    <CiImageOff />
                                  </div>
                                )}
                              </div>

                              <h4>{prd.name}</h4>
                              <p>{prd.description}</p>
                              {prd.percentage && <p>Agreed Percentage: {prd.percentage}%</p>}
                            </div>
                          </div>

                        ))}
                      </Slider>
                    ) : (
                      <p>No products available</p>
                    )}
                  </div>
                )}

              </div>

              {/* Floating Pass Referral Button */}
              <button
                className="floating-referral-btn"
                onClick={() => setModalOpen(true)}
              >
                Pass Referral
              </button>
            </div>
          </div>



          <HeaderNav />

        </div>
      </section>

      {/* Referral Modal */}
      {/* Referral Modal */}
      {
        modalOpen && (
          // const imgSrc = userDetails.logo || userDetails.profilePic;
          <div className="ref-modal-overlay">
            <div></div>
            <div className="ref-modal-content">
              {/* Header */}
              <div className="modelheader">
                <button className="back-btn" onClick={() => setModalOpen(false)}>
                  <MdArrowBack />
                </button>
                <h3>Refer now</h3>
              </div>

              <div className="modelContent">
                {/* Profile Section */}
                <div className="profile-section">
                  <div className="businessLogo">
                    {userDetails.logo || userDetails.profilePic ? (

                      <img
                        src={userDetails.logo || userDetails.profilePic}
                        alt={userDetails.businessName || "Company Logo"}
                      />
                    ) : (
                      <CiImageOn />
                    )}
                  </div>
                  <h4 className="profile-name">{userDetails.businessName || "Company Name"}</h4>

                  <div className="dropdownMain">
                    {/* Service/Product Dropdown */}
                    <button className="dropdown-btn" onClick={() => setDropdownOpen(!dropdownOpen)}>
                      {selectedOption || "Product or Service referred*"}
                    </button>
                    {dropdownOpen && (
                      <div className="dropdown-menu">
                        {services.concat(products).map((item, i) => (
                          <div
                            key={i}
                            className="dropdown-item"
                            onClick={() => { setSelectedOption(item.name); setDropdownOpen(false); }}
                          >
                            {item.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Short Description */}
                  <textarea
                    className="description-input"
                    placeholder="Short description of the lead*"
                    value={leadDescription}
                    onChange={(e) => setLeadDescription(e.target.value)}
                  />

                  {/* Others Info */}
                  {selectedFor === "someone" && (
                    <div className="ref-section">
                      <h4 className="ref-subtitle">Orbiter Info (Others)</h4>
                      <input
                        type="text"
                        placeholder="Name"
                        value={otherName}
                        onChange={(e) => setOtherName(e.target.value)}
                        className="ref-input"
                      />
                      <input
                        type="text"
                        placeholder="Phone"
                        value={otherPhone}
                        onChange={(e) => setOtherPhone(e.target.value)}
                        className="ref-input"
                      />
                      <input
                        type="email"
                        placeholder="Email"
                        value={otherEmail}
                        onChange={(e) => setOtherEmail(e.target.value)}
                        className="ref-input"
                      />
                    </div>
                  )}
                </div>
                {/* Referral Type Selection */}
                <div className="form-container">
                  <div className="selection-container">
                    <div className="selection-icon">
                      {/* <img src="/imgs/icons/referralsGiven@2x.png" alt="Selection Icon" /> */}
                    </div>
                    <div className="buttons">
                      <button
                        className={`border-btn ${selectedFor === "self" ? "active" : ""}`}
                        onClick={() => setSelectedFor("self")}
                      >
                        For Self
                      </button>
                      <button
                        className={`border-btn ${selectedFor === "someone" ? "active" : ""}`}
                        onClick={() => setSelectedFor("someone")}
                      >
                        For Someone Else
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modelheader">
                <button className="submit-btn" onClick={handlePassReferral}>
                  Send Referral
                </button>
              </div>
              {/* Submit Button */}

            </div>
          </div>
        )}




    </main>
  );
};

export default ReferralDetails;


