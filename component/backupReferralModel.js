'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
    getFirestore,
    doc,
    getDoc,
    addDoc,
    collection,
    runTransaction
} from 'firebase/firestore';
import { app } from '../firebaseConfig';
import { CiImageOn } from 'react-icons/ci';
import { MdArrowBack } from 'react-icons/md';
import { toast, Toaster } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const db = getFirestore(app);

const ReferralModalold = ({ item, onClose, userCache, setUserCache }) => {
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

    // 🔹 Generate referral ID safely using Firestore transaction
    const generateReferralId = async () => {
        const now = new Date();
        const year1 = now.getFullYear() % 100;
        const year2 = (now.getFullYear() + 1) % 100;
        const refPrefix = `Ref/${year1}-${year2}/`;

        const refCounterDoc = doc(db, "ReferralCounter", "counter");

        try {
            const newNum = await runTransaction(db, async (transaction) => {
                const counterSnap = await transaction.get(refCounterDoc);
                let lastNum = 2999;
                if (counterSnap.exists()) lastNum = counterSnap.data().lastNum;

                const nextNum = lastNum + 1;
                transaction.set(refCounterDoc, { lastNum: nextNum }, { merge: true });
                return nextNum;
            });

            return `${refPrefix}${String(newNum).padStart(8, "0")}`;
        } catch (err) {
            console.error("Error generating referral ID:", err);
            throw new Error("Failed to generate referral ID.");
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

            await addDoc(collection(db, "Referral"), data);
            toast.success("Referral passed successfully!");

            // Reset fields
            setSelectedOption(null);
            setDropdownOpen(false);
            setLeadDescription("");
            setOtherName("");
            setOtherPhone("");
            setOtherEmail("");
            setSelectedFor("self");

            // Delay closing modal for toast visibility
            setTimeout(() => onClose(), 500);
        } catch (err) {
            console.error("Error passing referral:", err);
            toast.error("Failed to pass referral.");
        }

        setSubmitting(false);
    };

    return (
        <>
            <Toaster position="top-right" reverseOrder={false} />
            <AnimatePresence>
                <motion.div
                    className="ref-modal-overlay"
                    initial={{ opacity: 0 }
                    }
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
                        <div className="modelheader" >
                            <button className="back-btn" onClick={onClose} >
                                <MdArrowBack />
                            </button>
                            < h3 > Refer Now </h3>
                        </div>

                        < div className="modelContent" >
                            <div className="profile-section" >
                                <div className="businessLogo" >
                                    {
                                        userDetails?.logo ? (
                                            <img src={userDetails.logo} alt={userDetails.businessName} />
                                        ) : (
                                            <CiImageOn />
                                        )}
                                </div>
                                < h4 className="profile-name" > {userDetails?.businessName} </h4>

                                {/* Dropdown */}
                                <div className="dropdownMain" ref={dropdownRef} >
                                    <button className="dropdown-btn" onClick={() => setDropdownOpen(!dropdownOpen)}>
                                        {selectedOption || 'Select product or service*'}
                                    </button>
                                    {
                                        dropdownOpen && (
                                            <div className="dropdown-menu" >
                                                {
                                                    services.concat(products).map((opt, i) => {
                                                        const label = typeof opt === 'string' ? opt : opt?.name || '';
                                                        return (
                                                            <div
                                                                key={i}
                                                                className="dropdown-item"
                                                                onClick={() => {
                                                                    setSelectedOption(label);
                                                                    setDropdownOpen(false);
                                                                }
                                                                }
                                                            >
                                                                {label}
                                                            </div>
                                                        );
                                                    })
                                                }
                                            </div>
                                        )}
                                </div>

                                < textarea
                                    className="description-input"
                                    placeholder="Short description of the lead*"
                                    value={leadDescription}
                                    onChange={(e) => setLeadDescription(e.target.value)}
                                />

                                {
                                    selectedFor === 'someone' && (
                                        <div className="ref-section" >
                                            <h4 className="ref-subtitle" > Orbiter Info(Others) </h4>
                                            < input type="text" placeholder="Name" value={otherName} onChange={(e) => setOtherName(e.target.value)
                                            } className="ref-input" />
                                            <input type="text" placeholder="Phone" value={otherPhone} onChange={(e) => setOtherPhone(e.target.value)} className="ref-input" />
                                            <input type="email" placeholder="Email" value={otherEmail} onChange={(e) => setOtherEmail(e.target.value)} className="ref-input" />
                                        </div>
                                    )}
                            </div>

                            < div className="form-container" >
                                <div className="buttons" >
                                    <button className={`border-btn ${selectedFor === 'self' ? 'active' : ''}`} onClick={() => setSelectedFor('self')}>
                                        For Self
                                    </button>
                                    < button className={`border-btn ${selectedFor === 'someone' ? 'active' : ''}`} onClick={() => setSelectedFor('someone')}>
                                        For Someone Else
                                    </button>
                                </div>
                            </div>
                        </div>

                        < div className="modelheader" >
                            <button className="submit-btn" onClick={handlePassReferral} disabled={submitting} >
                                {submitting ? 'Sending...' : 'Send Referral'}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            </AnimatePresence>
        </>
    );
};

export default ReferralModalold;
