"use client";

import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  addDoc,
  doc,
  getDoc,
  query,
  orderBy,
  limit,where
} from "firebase/firestore";
import { db } from "../../firebaseConfig";
import Layout from "../../component/Layout";
import { COLLECTIONS } from "/utility_collection";
import "../../src/app/styles/main.scss";

const Profiling = () => {
  const [users, setUsers] = useState([]);
  const [orbiterSearch, setOrbiterSearch] = useState("");
  const [cosmoSearch, setCosmoSearch] = useState("");

  const [selectedOrbiter, setSelectedOrbiter] = useState(null);
  const [selectedCosmo, setSelectedCosmo] = useState(null);

  const [services, setServices] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [dealStatus, setDealStatus] = useState("Pending");
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const [referralSource, setReferralSource] = useState("MonthlyMeeting");
  const [otherReferralSource, setOtherReferralSource] = useState("");

  const [refType, setRefType] = useState("Self");
  const [otherName, setOtherName] = useState("");
  const [otherPhone, setOtherPhone] = useState("");
  const [otherEmail, setOtherEmail] = useState("");

  const [leadDescription, setLeadDescription] = useState("");

  // ================== LOAD USERS (FROM usersdetail) ==================
  useEffect(() => {
    const fetchUsers = async () => {
      const snapshot = await getDocs(collection(db, COLLECTIONS.userDetail));
      const data = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      setUsers(data);
    };
    fetchUsers();
  }, []);

  // ================== SELECT ORBITER ==================
  const handleOrbiterSelect = (user) => {
    setSelectedOrbiter(user);
    setOrbiterSearch(user.Name || "");
  };

  // ================== SELECT COSMO ORBITER ==================
  const handleCosmoSelect = async (user) => {
    setSelectedCosmo(user);
    setCosmoSearch(user.Name || "");

    setSelectedService(null);
    setSelectedProduct(null);
    setServices([]);
    setProducts([]);

    // Fetch full user document to ensure we have services/products with agreedValue
    const docRef = doc(db, COLLECTIONS.userDetail, user.id);
    const userDoc = await getDoc(docRef);

    if (userDoc.exists()) {
      const data = userDoc.data();

      // services & products are stored as arrays, keep them exactly
      const servicesArray = Array.isArray(data.services) ? data.services : [];
      const productsArray = Array.isArray(data.products) ? data.products : [];

      setServices(servicesArray);
      setProducts(productsArray);
    }
  };

  // ================== GENERATE REFERRAL ID (Ref/YY-YY/0000xxxx) ==================
  const generateReferralId = async () => {
    const now = new Date();
    const year1 = now.getFullYear() % 100;
    const year2 = (now.getFullYear() + 1) % 100;
    const prefix = `Ref/${year1}-${year2}/`;

    const q = query(
      collection(db, COLLECTIONS.referral),
      orderBy("referralId", "desc"),
      limit(1)
    );

    const snapshot = await getDocs(q);

    let lastNum = 2999;
    if (!snapshot.empty) {
      const lastRef = snapshot.docs[0].data().referralId;
      const match = lastRef?.match(/\/(\d{8})$/);
      if (match) lastNum = parseInt(match[1], 10);
    }

    return `${prefix}${String(lastNum + 1).padStart(8, "0")}`;
  };

  // ================== WHATSAPP TEMPLATE (UNCHANGED) ==================
  const sendWhatsAppTemplate = async (phone, name, message) => {
    const formatted = String(phone || "").replace(/\s+/g, "");

    const payload = {
      messaging_product: "whatsapp",
      to: formatted,
      type: "template",
      template: {
        name: "referral_module",
        language: { code: "en" },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: name },
              { type: "text", text: message },
            ],
          },
        ],
      },
    };

    await fetch("https://graph.facebook.com/v19.0/527476310441806/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization:
          "Bearer EAAHwbR1fvgsBOwUInBvR1SGmVLSZCpDZAkn9aZCDJYaT0h5cwyiLyIq7BnKmXAgNs0ZCC8C33UzhGWTlwhUarfbcVoBdkc1bhuxZBXvroCHiXNwZCZBVxXlZBdinVoVnTB7IC1OYS4lhNEQprXm5l0XZAICVYISvkfwTEju6kV4Aqzt4lPpN8D3FD7eIWXDhnA4SG6QZDZD",
      },
      body: JSON.stringify(payload),
    });
  };

// ================== FETCH USER BY UJBCODE ==================
const fetchMentorByUjbCode = async (ujbCode) => {
  if (!ujbCode) return null;

  const snap = await getDoc(
    doc(db, COLLECTIONS.userDetail, ujbCode)
  );

  return snap.exists() ? snap.data() : null;
};

  // ================== SUBMIT REFERRAL ==================
const handleSubmit = async () => {
  if (
    !selectedOrbiter ||
    !selectedCosmo ||
    (!selectedService && !selectedProduct)
  ) {
    alert("Please select Orbiter, Cosmo, and Service OR Product.");
    return;
  }

  try {
    const referralId = await generateReferralId();

    // ================== KEEP SERVICE / PRODUCT ==================
    const serviceData = selectedService
      ? JSON.parse(JSON.stringify(selectedService))
      : null;

    const productData = selectedProduct
      ? JSON.parse(JSON.stringify(selectedProduct))
      : null;

    // ================== FETCH FRESH USER DATA (SOURCE OF TRUTH) ==================
    const orbiterSnap = await getDoc(
      doc(db, COLLECTIONS.userDetail, selectedOrbiter.id)
    );

    const cosmoSnap = await getDoc(
      doc(db, COLLECTIONS.userDetail, selectedCosmo.id)
    );

    const orbiterData = orbiterSnap.exists() ? orbiterSnap.data() : {};
    const cosmoData = cosmoSnap.exists() ? cosmoSnap.data() : {};

    // ================== ORBITER FEE ADJUSTMENT ==================
    let orbiterFeeAdjustment = 0;
    try {
      const payment = orbiterData?.payment?.orbiter;
      if (payment?.feeType === "adjustment") {
        orbiterFeeAdjustment = 1000;
      }
    } catch (err) {
      console.warn("Failed to check orbiter fee adjustment", err);
    }

    // ================== FETCH MENTOR RESIDENT STATUS ==================
   // ================== FETCH MENTOR RESIDENT STATUS (BY UJBCODE) ==================
let orbiterMentor = null;
let cosmoMentor = null;

try {
  if (orbiterData?.MentorUJBCode) {
    orbiterMentor = await fetchMentorByUjbCode(
      orbiterData.MentorUJBCode
    );
  }

  if (cosmoData?.MentorUJBCode) {
    cosmoMentor = await fetchMentorByUjbCode(
      cosmoData.MentorUJBCode
    );
  }
} catch (err) {
  console.warn("Mentor fetch failed", err);
}

    // ================== FINAL REFERRAL DATA ==================
    const data = {
      referralId,

     orbiter: {
  name: orbiterData.Name || "",
  email: orbiterData.Email || "",
  phone: orbiterData.MobileNo || "",
  ujbCode: orbiterData.UJBCode || "",

  mentorName: orbiterData.MentorName || "",
  mentorPhone: orbiterData.MentorPhone || "",

  // ✅ If null / undefined → "Resident"
  residentStatus: orbiterData.residentStatus ?? "Resident",
  mentorResidentStatus: orbiterMentor?.residentStatus ?? "Resident",
},

cosmoOrbiter: {
  name: cosmoData.Name || "",
  email: cosmoData.Email || "",
  phone: cosmoData.MobileNo || "",

  mentorName: cosmoData.MentorName || "",
  mentorPhone: cosmoData.MentorPhone || "",

  // ✅ If null / undefined → "Resident"
  residentStatus: cosmoData.residentStatus ?? "Resident",
  mentorResidentStatus: cosmoMentor?.residentStatus ?? "Resident",
},


      service: serviceData,
      product: productData,

      leadDescription,

      referralType: refType,
      referralSource:
        referralSource === "Other" ? otherReferralSource : referralSource,

      orbitersInfo:
        refType === "Others"
          ? {
              name: otherName,
              phone: otherPhone,
              email: otherEmail,
            }
          : null,

      dealStatus,
      lastUpdated,
      timestamp: new Date(),

      payments: [],
      dealLogs: [],
      statusLogs: [
        {
          status: dealStatus || "Pending",
          updatedAt: new Date().toISOString(),
        },
      ],

      agreedTotal: 0,
      agreedRemaining: 0,
      ujbBalance: 0,
      paidToOrbiter: 0,
      paidToOrbiterMentor: 0,
      paidToCosmoMentor: 0,

      orbiterFeeAdjustment,
    };

    // ================== SAVE REFERRAL ==================
    await addDoc(collection(db, COLLECTIONS.referral), data);

    const serviceOrProductName =
      selectedService?.name || selectedProduct?.name || "";

    // ================== WHATSAPP NOTIFICATIONS ==================
    await Promise.all([
      sendWhatsAppTemplate(
        orbiterData.MobileNo,
        orbiterData.Name,
        `🚀 You’ve passed a referral for *${serviceOrProductName}* to *${cosmoData.Name}*. Will be actioned within 24 hours!`
      ),
      sendWhatsAppTemplate(
        cosmoData.MobileNo,
        cosmoData.Name,
        `✨ You’ve received a referral from *${orbiterData.Name}* for *${serviceOrProductName}*. Please act within 24 hours.`
      ),
    ]);

    alert("Referral submitted successfully!");

    // ================== RESET ==================
    setSelectedOrbiter(null);
    setSelectedCosmo(null);
    setOrbiterSearch("");
    setCosmoSearch("");
    setServices([]);
    setProducts([]);
    setSelectedService(null);
    setSelectedProduct(null);
    setLeadDescription("");
    setRefType("Self");
    setOtherName("");
    setOtherPhone("");
    setOtherEmail("");
    setReferralSource("MonthlyMeeting");
    setOtherReferralSource("");
    setDealStatus("Pending");
    setLastUpdated(new Date());
  } catch (error) {
    console.error("Error submitting referral:", error);
    alert("Failed to submit referral.");
  }
};


  // ================== RENDER ==================
  return (
    <Layout>
      <section className="admin-profile-container">
        <div className="admin-profile-header">
          <h2>Add Referral</h2>
          <button className="btn-back" onClick={() => window.history.back()}>
            Back
          </button>
        </div>

        <ul className="admin-profile-form">
          {/* ORBITER SEARCH */}
          <li className="form-group">
            <h4>Search Orbiter</h4>
            <input
              type="text"
              value={orbiterSearch}
              onChange={(e) => setOrbiterSearch(e.target.value)}
            />
            {orbiterSearch.length > 0 && (
              <ul className="search-results">
                {users
                  .filter((u) =>
                    String(u.Name || "")
                      .toLowerCase()
                      .includes(orbiterSearch.toLowerCase())
                  )
                  .map((user) => (
                    <li
                      key={user.id}
                      onClick={() => handleOrbiterSelect(user)}
                    >
                      {user.Name}
                    </li>
                  ))}
              </ul>
            )}
          </li>

          {/* COSMO SEARCH */}
          <li className="form-group">
            <h4>Search Cosmo Orbiter</h4>
            <input
              type="text"
              value={cosmoSearch}
              onChange={(e) => setCosmoSearch(e.target.value)}
            />

            <ul className="search-results">
              {users
                .filter((u) => {
                  const name = String(u.Name || "").toLowerCase();
                  const category = String(u.Category || "").toLowerCase();

                  if (cosmoSearch === "") {
                    return category.includes("cosmo");
                  }

                  return (
                    category.includes("cosmo") &&
                    name.includes(cosmoSearch.toLowerCase())
                  );
                })
                .map((user) => (
                  <li key={user.id} onClick={() => handleCosmoSelect(user)}>
                    {user.Name}
                  </li>
                ))}
            </ul>
          </li>

          {/* SERVICES */}
          {services.length > 0 && (
            <li className="form-group">
              <label>Select Service</label>
              <select
                value={selectedService?.name || ""}
                onChange={(e) =>
                  setSelectedService(
                    services.find((s) => s.name === e.target.value) || null
                  )
                }
              >
                <option value="">-- Select Service --</option>
                {services.map((service, i) => (
                  <option key={i} value={service.name}>
                    {service.name}
                  </option>
                ))}
              </select>
            </li>
          )}

          {/* PRODUCTS */}
          {products.length > 0 && (
            <li className="form-group">
              <label>Select Product</label>
              <select
                value={selectedProduct?.name || ""}
                onChange={(e) =>
                  setSelectedProduct(
                    products.find((p) => p.name === e.target.value) || null
                  )
                }
              >
                <option value="">-- Select Product --</option>
                {products.map((product, i) => (
                  <option key={i} value={product.name}>
                    {product.name}
                  </option>
                ))}
              </select>
            </li>
          )}

          {/* LEAD DESCRIPTION */}
          {(selectedService || selectedProduct) && (
            <li className="form-group">
              <label>Lead Description</label>
              <textarea
                value={leadDescription}
                onChange={(e) => setLeadDescription(e.target.value)}
                placeholder="Enter Lead Description"
                rows={3}
              />
            </li>
          )}

          {/* DEAL STATUS */}
          <li className="form-group">
            <label>Deal Status</label>
            <select
              value={dealStatus}
              onChange={(e) => {
                setDealStatus(e.target.value);
                setLastUpdated(new Date());
              }}
            >
              <option value="Pending">Pending</option>
              <option value="Rejected">Rejected</option>
              <option value="Not Connected">Not Connected</option>
              <option value="Called but Not Answered">
                Called but Not Answered
              </option>
              <option value="Discussion in Progress">
                Discussion in Progress
              </option>
              <option value="Hold">Hold</option>
              <option value="Deal Won">Deal Won</option>
              <option value="Deal Lost">Deal Lost</option>
              <option value="Work in Progress">Work in Progress</option>
              <option value="Work Completed">Work Completed</option>
              <option value="Received Part Payment and Transferred to UJustBe">
                Received Part Payment and Transferred to UJustBe
              </option>
              <option value="Received Full and Final Payment">
                Received Full and Final Payment
              </option>
              <option value="Agreed % Transferred to UJustBe">
                Agreed % Transferred to UJustBe
              </option>
            </select>
          </li>

          {/* REFERRAL TYPE */}
          <li className="form-group">
            <label>Referral Type</label>
            <select
              value={refType}
              onChange={(e) => setRefType(e.target.value)}
            >
              <option value="Self">Self</option>
              <option value="Others">Others</option>
            </select>
          </li>

          {/* OTHERS INFO */}
          {refType === "Others" && (
            <>
              <li className="form-group">
                <label>Referrer Name</label>
                <input
                  type="text"
                  value={otherName}
                  onChange={(e) => setOtherName(e.target.value)}
                />
              </li>
              <li className="form-group">
                <label>Referrer Phone</label>
                <input
                  type="text"
                  value={otherPhone}
                  onChange={(e) => setOtherPhone(e.target.value)}
                />
              </li>
              <li className="form-group">
                <label>Referrer Email</label>
                <input
                  type="email"
                  value={otherEmail}
                  onChange={(e) => setOtherEmail(e.target.value)}
                />
              </li>
            </>
          )}

          {/* REFERRAL SOURCE */}
          <li className="form-group">
            <label>Referral Source</label>
            <select
              value={referralSource}
              onChange={(e) => setReferralSource(e.target.value)}
            >
              <option value="MonthlyMeeting">Monthly Meeting</option>
              <option value="ConclaveMeeting">Conclave Meeting</option>
              <option value="OTCMeeting">OTC Meeting</option>
              <option value="Phone">Phone</option>
              <option value="Other">Other</option>
            </select>

            {referralSource === "Other" && (
              <input
                type="text"
                placeholder="Enter Referral Source"
                value={otherReferralSource}
                onChange={(e) => setOtherReferralSource(e.target.value)}
                style={{ marginTop: "8px" }}
              />
            )}
          </li>
        </ul>

        <button className="btn-submit" onClick={handleSubmit}>
          Submit Referral
        </button>
      </section>
    </Layout>
  );
};

export default Profiling;
