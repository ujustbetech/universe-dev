'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
    getFirestore,
    doc,
    getDoc,
    addDoc,
    collection,
    query,
    orderBy,runTransaction,
    limit,
    getDocs,
} from 'firebase/firestore';
import { app } from '../firebaseConfig';
import { CiImageOn } from 'react-icons/ci';
import { MdArrowBack } from 'react-icons/md';
import { COLLECTIONS } from "/utility_collection";
import { toast, Toaster } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const db = getFirestore(app);

const ReferralModal = ({ item, onClose, userCache, setUserCache }) => {
    const [userDetails, setUserDetails] = useState(null);
    const [orbiterDetails, setOrbiterDetails] = useState({ name: '', phone: '', email: '' });
    const [selectedOption, setSelectedOption] = useState('');
    const [leadDescription, setLeadDescription] = useState('');
    const [selectedFor, setSelectedFor] = useState('self');
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [otherName, setOtherName] = useState('');
    const [otherPhone, setOtherPhone] = useState('');
    const [otherEmail, setOtherEmail] = useState('');
    const [services, setServices] = useState([]);
    const [products, setProducts] = useState([]);
    const [submitting, setSubmitting] = useState(false);

    const dropdownRef = useRef();

   
const generateReferralId = async () => {
  const now = new Date();
  const year1 = now.getFullYear() % 100;
  const year2 = (now.getFullYear() + 1) % 100;
  const refPrefix = `Ref/${year1}-${year2}/`;

  try {
    // Run transaction for atomic safety
    const newReferralId = await runTransaction(db, async (transaction) => {
      // Fetch the latest referral doc (most recent)
      const q = query(collection(db,  COLLECTIONS.referral), orderBy("timestamp", "desc"), limit(1));
      const snapshot = await getDocs(q);

      let lastNum = 2999;

      if (!snapshot.empty) {
        const lastRef = snapshot.docs[0].data().referralId;
        const match = lastRef?.match(/\/(\d{8})$/);
        if (match) lastNum = parseInt(match[1]);
      }

      const newNum = lastNum + 1;
      const newId = `${refPrefix}${String(newNum).padStart(8, "0")}`;

      // Create a placeholder doc in Referral to reserve the ID (avoids duplicates)
      const tempRef = doc(collection(db, COLLECTIONS.referral));
      transaction.set(tempRef, {
        referralId: newId,
        timestamp: new Date(),
        reserved: true,
      });

      return newId;
    });

    return newReferralId;
  } catch (error) {
    console.error("Error generating referral ID:", error);
    throw error;
  }
};
    // 🔹 Fetch user & orbiter details
    useEffect(() => {
        const fetchUserDetails = async () => {
            if (userCache[item.id]) {
                const cached = userCache[item.id];
                setUserDetails(cached);
                setServices(cached.services);
                setProducts(cached.products);
                setSelectedOption(item?.name || '');
            } else {
                const snap = await getDoc(doc(db, 'userdetail', item.id));
                if (snap.exists()) {
                    const data = snap.data();
                    const userData = {
                        name: data[' Name']?.trim() || '',
                        email: data.Email || '',
                        phone: data['Mobile no'] || '',
                        businessName: data['Business Name'] || 'N/A',
                        logo: data['Business Logo'] || '',
                        services: Array.isArray(data.services) ? data.services : [],
                        products: Array.isArray(data.products) ? data.products : [],
                    };
                    setUserCache(prev => ({ ...prev, [item.id]: userData }));
                    setUserDetails(userData);
                    setServices(userData.services);
                    setProducts(userData.products);
                    setSelectedOption(item?.name || '');
                }
            }

            const storedPhone = localStorage.getItem('mmOrbiter');
            if (storedPhone) {
                const orbSnap = await getDoc(doc(db, 'userdetail', storedPhone.trim()));
                if (orbSnap.exists()) {
                    const d = orbSnap.data();
                    setOrbiterDetails({
                        name: d[' Name'] || '',
                        email: d.Email || '',
                        phone: d['Mobile no'] || '',
                    });
                }
            }
        };

        fetchUserDetails();
    }, [item, userCache, setUserCache]);

    // 🔹 Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // 🔹 Submit referral
const handlePassReferral = async () => {
  if (submitting) return;
  setSubmitting(true);

  if (!orbiterDetails && selectedFor === "self") {
    toast.error("Orbiter details not found.");
    setSubmitting(false);
    return;
  }
  if (!userDetails) {
    toast.error("CosmoOrbiter details not found.");
    setSubmitting(false);
    return;
  }
  if (!selectedOption) {
    toast.error("Please select a service or product to refer.");
    setSubmitting(false);
    return;
  }
  if (!leadDescription.trim()) {
    toast.error("Please enter a short description of the lead.");
    setSubmitting(false);
    return;
  }

  try {
    const referralId = await generateReferralId();

    const selectedService = services.find(s => s.name === selectedOption) || null;
    const selectedProduct = products.find(p => p.name === selectedOption) || null;

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

    await addDoc(collection(db, COLLECTIONS.referral), data);
    toast.success("Referral passed successfully!");

    // ✅ Determine service or product name
    const serviceOrProduct = selectedService?.name || selectedProduct?.name || "";

    // ✅ Send WhatsApp messages to all 4 people
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

    // ✅ Reset fields
    setSelectedOption(null);
    setDropdownOpen(false);
    setLeadDescription("");
    setOtherName("");
    setOtherPhone("");
    setOtherEmail("");
    setSelectedFor("self");

    setTimeout(() => onClose(), 500);
  } catch (err) {
    console.error("Error passing referral:", err);
    toast.error("Failed to pass referral.");
  }

  setSubmitting(false);
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

    return (
        <>
            <Toaster position="top-right" reverseOrder={false} />
            <AnimatePresence>
                <motion.div
                    className="ref-modal-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <motion.div
                        className="ref-modal-content"
                        initial={{ y: -50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 50, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    >
                        <div className="modelheader">
                            <button className="back-btn" onClick={onClose}>
                                <MdArrowBack />
                            </button>
                            <h3>Refer Now</h3>
                        </div>

                        <div className="modelContent">
                            <div className="profile-section">
                                <div className="businessLogo">
                                    {userDetails?.logo ? (
                                        <img src={userDetails.logo} alt={userDetails.businessName} />
                                    ) : (
                                        <CiImageOn />
                                    )}
                                </div>
                                <h4 className="profile-name">{userDetails?.businessName}</h4>

                                {/* Dropdown */}
                                <div className="dropdownMain" ref={dropdownRef}>
                                    <button className="dropdown-btn" onClick={() => setDropdownOpen(!dropdownOpen)}>
                                        {selectedOption || 'Select product or service*'}
                                    </button>
                                    {dropdownOpen && (
                                        <div className="dropdown-menu">
                                            {services.concat(products).map((opt, i) => {
                                                const label = typeof opt === 'string' ? opt : opt?.name || '';
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

                                {selectedFor === 'someone' && (
                                    <div className="ref-section">
                                        <h4 className="ref-subtitle">Orbiter Info (Others)</h4>
                                        <input type="text" placeholder="Name" value={otherName} onChange={(e) => setOtherName(e.target.value)} className="ref-input" />
                                        <input type="text" placeholder="Phone" value={otherPhone} onChange={(e) => setOtherPhone(e.target.value)} className="ref-input" />
                                        <input type="email" placeholder="Email" value={otherEmail} onChange={(e) => setOtherEmail(e.target.value)} className="ref-input" />
                                    </div>
                                )}
                            </div>

                            <div className="form-container">
                                <div className="buttons">
                                    <button className={`border-btn ${selectedFor === 'self' ? 'active' : ''}`} onClick={() => setSelectedFor('self')}>
                                        For Self
                                    </button>
                                    <button className={`border-btn ${selectedFor === 'someone' ? 'active' : ''}`} onClick={() => setSelectedFor('someone')}>
                                        For Someone Else
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="modelheader">
                            <button className="submit-btn" onClick={handlePassReferral} disabled={submitting}>
                                {submitting ? 'Sending...' : 'Send Referral'}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            </AnimatePresence>
        </>
    );
};

export default ReferralModal;
