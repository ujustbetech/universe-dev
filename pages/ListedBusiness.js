'use client';

import React, { useEffect, useState } from "react";
import { getFirestore, collection, getDocs, doc, getDoc, addDoc } from "firebase/firestore";
import { app } from "../firebaseConfig";
import HeaderNav from "../component/HeaderNav";
import Headertop from "../component/Header";
import styles from '../src/app/styles/Offercard.module.scss';
import "../src/app/styles/user.scss";
import { CiImageOff, CiImageOn } from "react-icons/ci";
import { MdArrowBack } from "react-icons/md";

const db = getFirestore(app);

const AllServicesProducts = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedOption, setSelectedOption] = useState("");
  const [leadDescription, setLeadDescription] = useState("");
  const [selectedFor, setSelectedFor] = useState("self");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [orbiterDetails, setOrbiterDetails] = useState({ name: "", phone: "", email: "" });
  const [userDetails, setUserDetails] = useState(null);
  const [services, setServices] = useState([]);
  const [products, setProducts] = useState([]);

  const [otherName, setOtherName] = useState("");
  const [otherPhone, setOtherPhone] = useState("");
  const [otherEmail, setOtherEmail] = useState("");

  useEffect(() => {
  const fetchData = async () => {
    try {
      const snapshot = await getDocs(collection(db, "userdetail"));
      const list = [];

      // Allowed categories
      const allowedCategories = ["IT & TECH", "Healthcare", "Beauty", "Food Industry" ,"Art & Design","Travel & Tourism","Fashion & Garments"," Organic Products"];

      snapshot.forEach((doc) => {
        const data = doc.data();

        // ✅ Notice the space in key names
        const category1 = data["Category 1"]?.trim();
        const category2 = data["Category 2"]?.trim();

        const isAllowedCategory =
          allowedCategories.includes(category1) || allowedCategories.includes(category2);

        if (isAllowedCategory) {
          const ownerName = data[" Name"] || "—";
          const businessName = data["Business Name"] || "—";

          // ✅ Services
          if (Array.isArray(data.services)) {
            data.services.forEach((s) => {
              list.push({
                id: doc.id,
                type: "Service",
                name: s.name || "—",
                description: s.description || "—",
                imageURL: s.imageURL || "",
                percentage: s.percentage || "",
                keywords: s.keywords || "",
                ownerName,
                businessName,
              });
            });
          }

          // ✅ Products
          if (Array.isArray(data.products)) {
            data.products.forEach((p) => {
              list.push({
                id: doc.id,
                type: "Product",
                name: p.name || "—",
                description: p.description || "—",
                imageURL: p.imageURL || "",
                percentage: p.percentage || "",
                keywords: p.keywords || "",
                ownerName,
                businessName,
              });
            });
          }
        }
      });

      setItems(list);
      console.log("Filtered data:", list.length);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  fetchData();
}, []);

  // Function to open modal and fetch CosmOrbiter + Orbiter info
 // Function to open modal and fetch CosmOrbiter + Orbiter info
const openReferralModal = async (item) => {
  setSelectedItem(item);
  setSelectedOption(item.name); // Preselect the clicked service/product

  // Fetch CosmOrbiter details by their ID
  const snap = await getDoc(doc(db, "userdetail", item.id));
  if (snap.exists()) {
    const data = snap.data();
    setUserDetails({
      name: data[" Name"] || "",
      email: data.Email || "",
      phone: data["Mobile no"] || "",
      businessName: data["Business Name"] || "N/A",
      logo: data["Business Logo"] || "",
      services: Array.isArray(data.services) ? data.services : [],
      products: Array.isArray(data.products) ? data.products : [],
    });

    // Store for dropdown population
    const allItems = [
      ...(Array.isArray(data.services) ? data.services : []),
      ...(Array.isArray(data.products) ? data.products : []),
    ];
    setServices(data.services || []);
    setProducts(data.products || []);

    // Auto select the matching item from dropdown list
    const matchedItem = allItems.find((i) => i.name === item.name);
    if (matchedItem) {
      setSelectedOption(matchedItem.name);
    }
  }

  // Orbiter details from localStorage
  const storedPhone = localStorage.getItem("mmOrbiter");
  if (storedPhone) {
    const orbSnap = await getDoc(doc(db, "userdetail", storedPhone.trim()));
    if (orbSnap.exists()) {
      const d = orbSnap.data();
      setOrbiterDetails({
        name: d[" Name"] || "",
        email: d.Email || "",
        phone: d["Mobile no"] || "",
      });
    }
  }

  setModalOpen(true);
};


  // Generate sequential referral ID
  const generateReferralId = async () => {
    const now = new Date();
    const year1 = now.getFullYear() % 100;
    const year2 = (now.getFullYear() + 1) % 100;
    const refPrefix = `Ref/${year1}-${year2}/`;

    const snapshot = await getDocs(collection(db, "Referral"));
    let maxNum = 2999;
    snapshot.forEach(doc => {
      const rId = doc.data().referralId;
      const match = rId?.match(/\/(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    return `${refPrefix}${String(maxNum + 1).padStart(8, "0")}`;
  };

  const handlePassReferral = async () => {
    if (!orbiterDetails && selectedFor === "self") {
      alert("Orbiter details not found.");
      return;
    }

    if (!userDetails) {
      alert("CosmoOrbiter details not found.");
      return;
    }

    if (!selectedOption) {
      alert("Please select a service or product to refer.");
      return;
    }

    if (!leadDescription || leadDescription.trim() === "") {
      alert("Please enter a short description of the lead.");
      return;
    }

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

    try {
      await addDoc(collection(db, "Referral"), data);
      alert("Referral passed successfully!");

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
      alert("Failed to pass referral.");
    }
  };

  const filteredItems = items.filter((item) => {
    const query = searchQuery.toLowerCase();
    return (
      item.name.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query) ||
      (item.keywords && item.keywords.toLowerCase().includes(query))
    );
  });

  return (
    <main className="pageContainer">
      <Headertop />

      <section className="dashBoardMain">
        <div className="sectionHeadings">
          <h2>All Services & Products {items.length}</h2>
        </div>

        <div className="search">
          <input
            type="text"
            placeholder="Search by name, description or keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search__input"
          />
        </div>

        <div className={styles.OffersList}>
          {loading ? (
            <div className="loader"><span className="loader2"></span></div>
          ) : filteredItems.length === 0 ? (
            <p className="noDataText">No services or products found.</p>
          ) : (
            filteredItems.map((item, i) => (
              <div key={i} className={styles.cardsDiv}>
                <div className={styles.cardImg}>
                  {item.imageURL ? (
                    <img src={item.imageURL} alt={item.name} />

                  ) : (
                    <div className={styles.thumbnail_NA}><CiImageOff /></div>
                  )}
                  <span className={styles.wdp_ribbon}>{item.percentage}<abbr>%</abbr></span>
                </div>

                <div className={styles.description}>
                  <h4>{item.name}</h4>
                  <p className={styles.ownerInfo}>
                    {item.businessName}
                  </p>

                  <button
                  
                    onClick={() => openReferralModal(item)}
                  >
                    Send Referral
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <HeaderNav />
      </section>

      {/* Referral Modal */}
      {modalOpen && (
        <div className="ref-modal-overlay">
          <div></div>
          <div className="ref-modal-content">
            <div className="modelheader">
              <button className="back-btn" onClick={() => setModalOpen(false)}><MdArrowBack /></button>
              <h3>Refer now</h3>
            </div>

            <div className="modelContent">
              <div className="profile-section">
                <div className="businessLogo">
                  {userDetails?.logo || userDetails?.profilePic ? (
                    <img src={userDetails.logo || userDetails.profilePic} alt={userDetails.businessName || "Company Logo"} />
                  ) : <CiImageOn />}
                </div>
                <h4 className="profile-name">{userDetails?.businessName || "Company Name"}</h4>

                <div className="dropdownMain">
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
                  <div className="selection-icon"></div>
                  <div className="buttons">
                    <button className={`border-btn ${selectedFor === "self" ? "active" : ""}`} onClick={() => setSelectedFor("self")}>For Self</button>
                    <button className={`border-btn ${selectedFor === "someone" ? "active" : ""}`} onClick={() => setSelectedFor("someone")}>For Someone Else</button>
                  </div>
                </div>
              </div>
            </div>

            <div className="modelheader">
              <button className="submit-btn" onClick={handlePassReferral}>Send Referral</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default AllServicesProducts;
