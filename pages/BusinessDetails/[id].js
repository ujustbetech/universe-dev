"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  getDocs,
  addDoc,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import { CiImageOn, CiImageOff } from "react-icons/ci";
import { app } from "../../firebaseConfig";
import HeaderNav from "../../component/HeaderNav";
import { MdArrowBack } from "react-icons/md";
import "../../src/app/styles/user.scss";
import { FaMapMarkerAlt, FaUser } from "react-icons/fa";
import Slider from "react-slick";
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

  const [selectedOption, setSelectedOption] = useState(""); // selected service/product name (serviceName/productName)
  const [leadDescription, setLeadDescription] = useState(""); // Short description
  const [selectedFor, setSelectedFor] = useState("self"); // For Self / Someone Else

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const [userDetails, setUserDetails] = useState(null); // CosmoOrbiter (business) details
  const [orbiterDetails, setOrbiterDetails] = useState(null); // current orbiter (local user)
  const [services, setServices] = useState([]); // normalized services { id, serviceName, description, imageURL, ... }
  const [products, setProducts] = useState([]); // normalized products { id, productName, description, imageURL, ... }

  const [activeTab, setActiveTab] = useState("about");
  const [servicesLoaded, setServicesLoaded] = useState(false);
  const [productsLoaded, setProductsLoaded] = useState(false);

  const sliderSettings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    swipe: true,
    touchThreshold: 10,
    adaptiveHeight: true,
    draggable: true,
    lazyLoad: "ondemand",
  };

  const handleTabClick = (tab) => {
    setActiveTab(tab);
    if (tab === "services") setServicesLoaded(true);
    if (tab === "products") setProductsLoaded(true);
  };

  // Fetch orbiter (the user who is passing referral) from localStorage mmUJBCode
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
            mentorName: data["MentorName"] || data["Mentor Name"] || "",
            mentorPhone: data["MentorPhone"] || data["Mentor Phone"] || "",
          });
        }
      } catch (err) {
        console.error("Error fetching orbiter details:", err);
      }
    };

    fetchOrbiter();
  }, []);

  // Fetch CosmoOrbiter (business) details for the page's id or local mmUJBCode
  useEffect(() => {
    const storedUJBCode = id || localStorage.getItem("mmUJBCode");
    if (!storedUJBCode) return;

    const fetchCosmo = async () => {
      try {
        const snap = await getDoc(doc(db, COLLECTIONS.userDetail, storedUJBCode));
        if (!snap.exists()) return;

        const data = snap.data();

        // Convert map → array (handles your DB where products/services are maps)
        const servicesArr = data.services ? Object.values(data.services) : [];
        const productsArr = data.products ? Object.values(data.products) : [];

        // Normalize services (keep serviceName field as you requested)
        const normalizedServices = servicesArr.map((s, index) => ({
          id: `service_${index}`,
          serviceName: s.serviceName || s.name || "",
          description: s.description || "",
          imageURL: s.imageURL || "",
          keywords: s.keywords || "",
          percentage: s.percentage || "",
        }));

        // Normalize products (keep productName field)
        const normalizedProducts = productsArr.map((p, index) => ({
          id: `product_${index}`,
          productName: p.productName || p.name || "",
          description: p.description || "",
          imageURL: p.imageURL || "",
          keywords: p.keywords || "",
          percentage: p.percentage || "",
        }));

        setUserDetails({
          name: data["Name"] || "",
          email: data.Email || "",
          phone: data["MobileNo"] || "",
          businessName: data["BusinessName"] || "N/A",
          businessDetails: data["BusinessHistory"] || "N/A",
          tagline: data["TagLine"] || "",
          logo: data["Business Logo"] || data["BusinessLogo"] || data["ProfilePhotoURL"] || "",
          profilePic: data["ProfilePhotoURL"] || "",
          ujbCode: data["UJBCode"] || "",
          businessType: data["BusinessDetails(Nature & Type)"] || "",
          Locality: data.Locality || "",
          City: data.City || "",
          State: data.State || "",
          category: data.Category || "",
          category1: data["Category1"] || "",
          category2: data["Category2"] || "",
          products: normalizedProducts,
          services: normalizedServices,
        });

        setProducts(normalizedProducts);
        setServices(normalizedServices);

        // Optionally set some defaults: if active tab was services or products ensure loaded flags
        if (normalizedServices.length > 0) setServicesLoaded(true);
        if (normalizedProducts.length > 0) setProductsLoaded(true);
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
      const q = query(collection(db, COLLECTIONS.referral), orderBy("timestamp", "desc"), limit(1));
      const snapshot = await getDocs(q);

      let lastNum = 2999;

      if (!snapshot.empty) {
        const lastRef = snapshot.docs[0].data().referralId;
        const match = lastRef?.match(/\/(\d{8})$/);
        if (match) lastNum = parseInt(match[1]);
      }

      const newId = `${refPrefix}${String(lastNum + 1).padStart(8, "0")}`;
      return newId;
    } catch (error) {
      console.error("Error generating referral ID:", error);
      throw error;
    }
  };

  // Pass referral handler
  const handlePassReferral = async () => {
    if (!orbiterDetails) {
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

    if (selectedFor === "someone" || selectedFor === "others") {
      if (!otherName || !otherPhone) {
        toast.error("Please enter Name and Phone for the referred person.");
        return;
      }
    }

    try {
      const referralId = await generateReferralId();

      // Find by serviceName or productName (Option A)
      const selectedService = services.find((s) => s.serviceName === selectedOption) || null;
      const selectedProduct = products.find((p) => p.productName === selectedOption) || null;

      const data = {
        referralId,
        referralSource: "R",
        referralType: selectedFor === "self" ? "Self" : "Others",
        leadDescription,
        dealStatus: "Pending",
        lastUpdated: new Date(),
        timestamp: new Date(),

        cosmoUjbCode: userDetails.ujbCode,

        cosmoOrbiter: {
          name: userDetails.name,
          email: userDetails.email,
          phone: userDetails.phone,
          ujbCode: userDetails.ujbCode,
          mentorName: userDetails.mentorName || null,
          mentorPhone: userDetails.mentorPhone || null,
        },

        orbiter: {
          name: orbiterDetails.name,
          email: orbiterDetails.email,
          phone: orbiterDetails.phone,
          ujbCode: orbiterDetails.ujbCode,
          mentorName: orbiterDetails.mentorName || null,
          mentorPhone: orbiterDetails.mentorPhone || null,
        },

        referredForName: selectedFor === "someone" || selectedFor === "others" ? otherName : null,
        referredForPhone: selectedFor === "someone" || selectedFor === "others" ? otherPhone : null,
        referredForEmail: selectedFor === "someone" || selectedFor === "others" ? otherEmail : null,

        product: selectedProduct
          ? {
              name: selectedProduct.productName,
              description: selectedProduct.description,
              imageURL: selectedProduct.imageURL || "",
              percentage: selectedProduct.percentage || "0",
            }
          : null,

        service: selectedService
          ? {
              name: selectedService.serviceName,
              description: selectedService.description,
              imageURL: selectedService.imageURL || "",
              percentage: selectedService.percentage || "0",
            }
          : null,

        dealLogs: [],
        followups: [],
        statusLogs: [],
      };

      await addDoc(collection(db, COLLECTIONS.referral), data);

      const serviceOrProduct = selectedService?.serviceName || selectedProduct?.productName || "";

      // send WhatsApp messages (your existing function)
      await Promise.all([
        sendWhatsAppMessage(orbiterDetails.phone, [
          orbiterDetails.name,
          `🚀 You’ve successfully passed a referral for *${serviceOrProduct}* to *${userDetails.name}*.`,
        ]),
        sendWhatsAppMessage(userDetails.phone, [
          userDetails.name,
          `✨ You’ve received a referral from *${orbiterDetails.name}* for *${serviceOrProduct}*.`,
        ]),
      ]);

      toast.success("Referral passed successfully!");

      // reset
      setSelectedOption("");
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

  // WhatsApp sender (unchanged)
  const sendWhatsAppMessage = async (phone, parameters = []) => {
    const formattedPhone = String(phone || "").replace(/\s+/g, "");

    const payload = {
      messaging_product: "whatsapp",
      to: formattedPhone,
      type: "template",
      template: {
        name: "referral_module",
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

  const getInitials = (name) => name?.split(" ").map((n) => n[0]).join("").toUpperCase();

  if (!orbiterDetails || !userDetails) {
    return (
      <div className="loader">
        <span className="loader2"></span>
      </div>
    );
  }

  return (
    <main className="pageContainer businessDetailsPage">
      <Headertop />

      <section className="p-meetingDetails">
        <div className="container pageHeading">
          <div className="DetailsCards">
            <img
              src={
                userDetails.profilePic && userDetails.profilePic.startsWith("http")
                  ? userDetails.profilePic
                  : "https://firebasestorage.googleapis.com/v0/b/monthlymeetingapp.appspot.com/o/Screenshot%202025-11-20%20152603.png?alt=media&token=a8462006-e88a-4a3e-bff6-1b3871fa8075"
              }
              alt={userDetails.businessName || "Business Image"}
              className="details-image"
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
          </div>

          {/* Round Business Logo */}
          <div className="profile-header businessProfile">
            <div className="profile-round-image">
              {userDetails.logo && userDetails.logo.startsWith("http") ? (
                <img
                  src={userDetails.logo}
                  alt={userDetails.name || "User Logo"}
                  onError={(e) => {
                    e.target.style.display = "none";
                  }}
                />
              ) : (
                <FaUser size={40} />
              )}
            </div>
          </div>

          <div className="event-container">
            <div className="event-content businessDetail">
              <div className="businessCode">
                <p>
                  <strong>{userDetails.ujbCode || "N/A"}</strong>
                </p>
                <p></p>
              </div>

              <div className="profile-info-card">
                <h2 className="profile-business-name">{userDetails.businessName}</h2>
                <p className="profile-business-owner">
                  (<strong>{userDetails.name || "N/A"}</strong>)
                </p>

                {[userDetails.category1, userDetails.category2].filter(Boolean).length > 0 && (
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

              <div className="eventinnerContent">
                {activeTab === "about" && (
                  <div className="tabs about-section">
                    <div>
                      <p>{userDetails.businessDetails || "not available"}</p>
                    </div>
                    <div>{userDetails.tagline || "Tagline not available"}</div>
                  </div>
                )}

                {servicesLoaded && (
                  <div style={{ display: activeTab === "services" ? "block" : "none" }}>
                    {services.length > 0 ? (
                      <Slider {...sliderSettings}>
                        {services.map((srv, i) => (
                          <div key={i}>
                            <div className="productCard">
                              <div className="productImage">
                                {srv.imageURL ? (
                                  <img src={srv.imageURL} alt={srv.serviceName} className="offering-image" />
                                ) : (
                                  <CiImageOff className="offering-image" />
                                )}
                              </div>

                              <h4>{srv.serviceName}</h4>
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
                                  <img src={prd.imageURL} alt={prd.productName} />
                                ) : (
                                  <div className="nothumbnail">
                                    <CiImageOff />
                                  </div>
                                )}
                              </div>

                              <h4>{prd.productName}</h4>
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
                onClick={() => {
                  // Option 2 behavior: auto-select first service if available, else first product
                  const defaultSelection = (services && services.length > 0 && services[0].serviceName)
                    || (products && products.length > 0 && products[0].productName)
                    || "";
                  setSelectedOption(defaultSelection);
                  setModalOpen(true);
                }}
              >
                Pass Referral
              </button>
            </div>
          </div>

          <HeaderNav />
        </div>
      </section>

      {/* Referral Modal */}
      {modalOpen && (
        <div className="ref-modal-overlay">
          <div />
          <div className="ref-modal-content">
            <div className="modelheader">
              <button className="back-btn" onClick={() => setModalOpen(false)}>
                <MdArrowBack />
              </button>
              <h3>Refer now</h3>
            </div>

            <div className="modelContent">
              <div className="profile-section">
                <div className="businessLogo">
                  {userDetails.logo || userDetails.profilePic ? (
                    <img src={userDetails.logo || userDetails.profilePic} alt={userDetails.businessName || "Company Logo"} />
                  ) : (
                    <CiImageOn />
                  )}
                </div>

                <h4 className="profile-name">{userDetails.businessName || "Company Name"}</h4>

                <div className="dropdownMain">
                  <button className="dropdown-btn" onClick={() => setDropdownOpen((s) => !s)}>
                    {selectedOption || "Product or Service referred*"}
                  </button>

                  {dropdownOpen && (
                    <div className="dropdown-menu">
                      {services.concat(products).map((item, i) => {
                        const label = item.serviceName || item.productName || "";
                        return (
                          <div
                            key={i}
                            className="dropdown-item"
                            onClick={() => {
                              setSelectedOption(label);
                              setDropdownOpen(false);
                            }}
                          >
                            {label}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <textarea
                  className="description-input"
                  placeholder="Short description of the lead*"
                  value={leadDescription}
                  onChange={(e) => setLeadDescription(e.target.value)}
                />

                {selectedFor === "someone" && (
                  <div className="ref-section">
                    <h4 className="ref-subtitle">Orbiter Info (Others)</h4>
                    <input type="text" placeholder="Name" value={otherName} onChange={(e) => setOtherName(e.target.value)} className="ref-input" />
                    <input type="text" placeholder="Phone" value={otherPhone} onChange={(e) => setOtherPhone(e.target.value)} className="ref-input" />
                    <input type="email" placeholder="Email" value={otherEmail} onChange={(e) => setOtherEmail(e.target.value)} className="ref-input" />
                  </div>
                )}
              </div>

              <div className="form-container">
                <div className="selection-container">
                  <div className="selection-icon" />
                  <div className="buttons">
                    <button className={`border-btn ${selectedFor === "self" ? "active" : ""}`} onClick={() => setSelectedFor("self")}>
                      For Self
                    </button>
                    <button className={`border-btn ${selectedFor === "someone" ? "active" : ""}`} onClick={() => setSelectedFor("someone")}>
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
          </div>
        </div>
      )}
    </main>
  );
};

export default ReferralDetails;
