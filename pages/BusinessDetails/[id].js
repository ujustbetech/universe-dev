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


  // Fetch Orbiter details
  useEffect(() => {
    const storedPhone = localStorage.getItem("mmOrbiter");
    if (!storedPhone) return;
    const phone = storedPhone.trim();

    const fetchOrbiter = async () => {
      const snap = await getDoc(doc(db, "userdetail", phone));
      if (snap.exists()) {
        const data = snap.data();
        setOrbiterDetails({
          name: data[" Name"] || "",
          email: data.Email || "",
          phone: data["Mobile no"] || "",
          ujbCode: data["UJB Code"] || "",
          mentorName: data["Mentor Name"] || "",
          mentorPhone: data["Mentor Phone"] || "",
        });
      }
    };
    fetchOrbiter();
  }, []);

  // Fetch CosmoOrbiter details
  useEffect(() => {
    if (!id) return;

    const fetchCosmo = async () => {
      const snap = await getDoc(doc(db, "userdetail", id));
      if (snap.exists()) {
        const data = snap.data();
        console.log("orbiter data", data);

        setUserDetails({
          name: data[" Name"] || "",
          email: data.Email || "",
          phone: data["Mobile no"] || "",
          businessName: data["Business Name"] || "N/A",
          businessDetails: data["Business History"] || "N/A",
          tagline: data["Tag Line"] || "",
          logo: data["Business Logo"] || "",
          profilePic: data["Profile Photo URL"] || "",
          ujbCode: data["UJB Code"] || "",
          businessType: data["Business Details (Nature & Type)"] || "",
          Locality: data.Locality || "",
          City: data.City || "",
          State: data.State || "",
          services: Array.isArray(data.services) ? data.services : [],
          products: Array.isArray(data.products) ? data.products : [],
          // ✅ New fields
          category: data.Category || '',
          category1: data['Category 1'] || '',
          category2: data['Category 2'] || '',
        });
        setServices(Array.isArray(data.services) ? data.services : []);
        setProducts(Array.isArray(data.products) ? data.products : []);
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
    const q = query(collection(db, "Referral"), orderBy("timestamp", "desc"), limit(1));
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

    await addDoc(collection(db, "Referral"), data);

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
              src={userDetails.profilePic || 'data:image/jpeg;base64,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'}
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
                  <strong>{userDetails.businessType || "N/A"}</strong>
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


