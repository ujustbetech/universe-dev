import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  addDoc,
  doc,
  getDoc,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";
import Layout from "../../component/Layout";
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

  const [referralType, setReferralType] = useState("Service");
  const [referralSource, setReferralSource] = useState("MonthlyMeeting");
  const [otherReferralSource, setOtherReferralSource] = useState("");

  const [refType, setRefType] = useState("Self");
  const [otherName, setOtherName] = useState("");
  const [otherPhone, setOtherPhone] = useState("");
  const [otherEmail, setOtherEmail] = useState("");

  const [leadDescription, setLeadDescription] = useState("");

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      const snapshot = await getDocs(collection(db, "usersdetail"));
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setUsers(data);
    };
    fetchUsers();
  }, []);

  const handleOrbiterSelect = (user) => {
    setSelectedOrbiter(user);
    setOrbiterSearch(user.Name);
  };

  const handleCosmoSelect = async (user) => {
    setSelectedCosmo(user);
    setCosmoSearch(user.Name);

    setSelectedService(null);
    setSelectedProduct(null);
    setServices([]);
    setProducts([]);

    const docRef = doc(db, "usersdetail", user.id);
    const userDoc = await getDoc(docRef);

    if (userDoc.exists()) {
      const data = userDoc.data();

      // FIX: Convert Firestore map → array
      const servicesArray = data.services
        ? Object.values(data.services)
        : [];
      const productsArray = data.products
        ? Object.values(data.products)
        : [];

      setServices(servicesArray);
      setProducts(productsArray);
    }
  };

  const generateReferralId = async () => {
    const now = new Date();
    const year1 = now.getFullYear() % 100;
    const year2 = (now.getFullYear() + 1) % 100;
    const prefix = `Ref/${year1}-${year2}/`;

    const q = query(
      collection(db, "Referraldev"),
      orderBy("referralId", "desc"),
      limit(1)
    );

    const snapshot = await getDocs(q);

    let lastNum = 2999;

    if (!snapshot.empty) {
      const lastRef = snapshot.docs[0].data().referralId;
      const match = lastRef?.match(/\/(\d{8})$/);
      if (match) lastNum = parseInt(match[1]);
    }

    return `${prefix}${String(lastNum + 1).padStart(8, "0")}`;
  };

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

    await fetch(
      "https://graph.facebook.com/v19.0/527476310441806/messages",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:
            "Bearer EAAHwbR1fvgsBOwUInBvR1SGmVLSZCpDZAkn9aZCDJYaT0h5cwyiLyIq7BnKmXAgNs0ZCC8C33UzhGWTlwhUarfbcVoBdkc1bhuxZBXvroCHiXNwZCZBVxXlZBdinVoVnTB7IC1OYS4lhNEQprXm5l0XZAICVYISvkfwTEju6kV4Aqzt4lPpN8D3FD7eIWXDhnA4SG6QZDZD",
        },
        body: JSON.stringify(payload),
      }
    );
  };

  const handleSubmit = async () => {
    if (
      !selectedOrbiter ||
      !selectedCosmo ||
      (!selectedService && !selectedProduct)
    ) {
      alert("Please fill all required fields.");
      return;
    }

    try {
      const referralId = await generateReferralId();

      const serviceData =
        selectedService ? JSON.parse(JSON.stringify(selectedService)) : null;

      const productData =
        selectedProduct ? JSON.parse(JSON.stringify(selectedProduct)) : null;

      const data = {
        referralId,

        orbiter: {
          name: selectedOrbiter.Name || "",
          email: selectedOrbiter.Email || "",
          phone: selectedOrbiter.MobileNo || "",
          ujbCode: selectedOrbiter.UJBCode || "",
          mentorName: selectedOrbiter.MentorName || "",
          mentorPhone: selectedOrbiter.MentorPhone || "",
        },

        cosmoOrbiter: {
          name: selectedCosmo.Name || "",
          email: selectedCosmo.Email || "",
          phone: selectedCosmo.MobileNo || "",
          mentorName: selectedCosmo.MentorName || "",
          mentorPhone: selectedCosmo.MentorPhone || "",
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
      };

      await addDoc(collection(db, "Referraldev"), data);

      alert("Referral submitted successfully!");

      const serviceOrProduct =
        selectedService?.serviceName ||
        selectedProduct?.productName ||
        "";

      await Promise.all([
        sendWhatsAppTemplate(
          selectedOrbiter.MobileNo,
          selectedOrbiter.Name,
          `🚀 You’ve passed a referral for *${serviceOrProduct}* to *${selectedCosmo.Name}*. Will be actioned within 24 hours!`
        ),
        sendWhatsAppTemplate(
          selectedCosmo.MobileNo,
          selectedCosmo.Name,
          `✨ You’ve received a referral from *${selectedOrbiter.Name}* for *${serviceOrProduct}*. Please act within 24 hours.`
        ),
      ]);

      // Reset fields
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
    } catch (error) {
      console.error("Error submitting referral:", error);
      alert("Failed to submit referral.");
    }
  };

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
                  <li
                    key={user.id}
                    onClick={() => handleCosmoSelect(user)}
                  >
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
                onChange={(e) =>
                  setSelectedService(
                    services.find(
                      (s) => s.serviceName === e.target.value
                    )
                  )
                }
              >
                <option value="">-- Select Service --</option>
                {services.map((service, i) => (
                  <option key={i} value={service.serviceName}>
                    {service.serviceName}
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
                onChange={(e) =>
                  setSelectedProduct(
                    products.find(
                      (p) => p.productName === e.target.value
                    )
                  )
                }
              >
                <option value="">-- Select Product --</option>
                {products.map((product, i) => (
                  <option key={i} value={product.productName}>
                    {product.productName}
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
