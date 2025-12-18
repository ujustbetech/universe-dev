import React, { useEffect, useState } from 'react';
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc,
  addDoc,
  Timestamp
} from 'firebase/firestore';
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from 'firebase/storage';

import { app } from '../firebaseConfig';
import { TbSettingsStar } from "react-icons/tb";
import '../src/app/styles/user.scss';
import {
  FiGlobe,
  FiUser,
  FiHeart,
  FiBriefcase,
  FiBox,
  FiLayers,
  FiChevronRight,
  FiUsers
} from "react-icons/fi";
import { useRouter } from 'next/router';
import HeaderNav from '../component/HeaderNav';
import { FaCalendarAlt } from 'react-icons/fa';
import { MdArrowBack } from "react-icons/md";
import { CiImageOff } from "react-icons/ci";
import Headertop from '../component/Header';

const db = getFirestore(app);
const storage = getStorage(app);

const Profile = () => {
  const [userDetails, setUserDetails] = useState({});
  const [activeTab, setActiveTab] = useState('basic');
  const [showContentOnly, setShowContentOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  // ✅ NEW STATES (ADDED – nothing removed)
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState({});
  const [photoFile, setPhotoFile] = useState(null);
  const [previewPhoto, setPreviewPhoto] = useState(null);
const [draftAdditional, setDraftAdditional] = useState({});
const [draftHealth, setDraftHealth] = useState({});
const [draftProfessional, setDraftProfessional] = useState({});
const [draftBusiness, setDraftBusiness] = useState({});
const [draftServices, setDraftServices] = useState([]);
const [draftProducts, setDraftProducts] = useState([]);

  const router = useRouter();

  /* ---------------- SKELETON ---------------- */

  const Skeleton = ({ width, height, radius = "6px" }) => (
    <div className="skeleton" style={{ width, height, borderRadius: radius }}></div>
  );

  const ProfileSkeleton = () => (
    <div className="profile-skeleton">
      <Skeleton width="90px" height="90px" radius="50%" />
      <Skeleton width="60%" height="18px" />
      <Skeleton width="40%" height="14px" />
    </div>
  );

  const FieldSkeleton = () => (
    <div className="input-group">
      <Skeleton width="30%" height="14px" />
      <Skeleton width="100%" height="40px" />
    </div>
  );

  
const submitTabForApproval = async (type, oldData, newData) => {
  await addDoc(collection(db, "profileChangeRequests"), {
    ujbCode: userDetails.ujbCode,
    type,
    oldData,
    newData,
    status: "PENDING",
    createdAt: Timestamp.now(),
  });
  setIsEditMode(false);
};

  useEffect(() => {
    const storedUjb = localStorage.getItem('mmUJBCode');
    if (storedUjb) fetchUserDetails(storedUjb);
  }, []);

const fetchUserDetails = async (ujbCode) => {
  try {
    const docSnap = await getDoc(doc(db, "usersdetail", ujbCode));
    if (!docSnap.exists()) return;

    const data = docSnap.data();

    const normalized = {
      ...data,
      name: data.Name || data.orbiterName || '',
      email: data.Email || data.BusinessEmailID || '',
      dob: data.DOB || '',
      gender: data.Gender || '',
      mobile: data.MobileNo || data.mobileNumber || '',
      category: data.Category || '',
      ujbCode,

      AreaOfServices: data.AreaOfServices || data.AreaofServices || '',
      ContributionAreaInUJustBe:
        data.ContributionAreaInUJustBe || data.ContributionAreainUJustBe || [],

      BusinessLogo: data.BusinessLogo || '',
      services: data.services ? Object.values(data.services) : [],
      products: data.products ? Object.values(data.products) : [],
      connects: data.connects || [],
    };

    // MAIN
    setUserDetails(normalized);
    setFormData({
      name: normalized.name,
      email: normalized.email,
      gender: normalized.gender,
      dob: normalized.dob,
    });

    // ADDITIONAL
    setDraftAdditional({
      IDType: normalized.IDType || '',
      IDNumber: normalized.IDNumber || '',
      Address: normalized.Address || '',
      MaritalStatus: normalized.MaritalStatus || '',
      LanguagesKnown: normalized.LanguagesKnown || '',
      Hobbies: normalized.Hobbies || '',
      InterestArea: normalized.InterestArea || '',
      Skills: normalized.Skills || '',
      ExclusiveKnowledge: normalized.ExclusiveKnowledge || '',
      Aspirations: normalized.Aspirations || '',
    });

    // HEALTH
    setDraftHealth({
      HealthParameters: normalized.HealthParameters || '',
      CurrentHealthCondition: normalized.CurrentHealthCondition || '',
      FamilyHistorySummary: normalized.FamilyHistorySummary || '',
    });

    // PROFESSIONAL
    setDraftProfessional({
      ProfessionalHistory: normalized.ProfessionalHistory || '',
      CurrentProfession: normalized.CurrentProfession || '',
      EducationalBackground: normalized.EducationalBackground || '',
      ContributionAreaInUJustBe: normalized.ContributionAreaInUJustBe || '',
      ImmediateDesire: normalized.ImmediateDesire || '',
      Mastery: normalized.Mastery || '',
      SpecialSocialContribution: normalized.SpecialSocialContribution || '',
    });

    // BUSINESS
    setDraftBusiness({
      BusinessName: normalized.BusinessName || '',
      BusinessDetails: normalized.BusinessDetails || '',
      BusinessHistory: normalized.BusinessHistory || '',
      USP: normalized.USP || '',
      Website: normalized.Website || '',
      TagLine: normalized.TagLine || '',
    });

    // SERVICES / PRODUCTS
    setDraftServices(normalized.services || []);
    setDraftProducts(normalized.products || []);

  } catch (err) {
    console.error("❌ Error fetching user details:", err);
  }

  setLoading(false);
};



  /* ---------------- PHOTO HANDLER ---------------- */

  const handlePhotoSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoFile(file);
    setPreviewPhoto(URL.createObjectURL(file));
  };

  const submitProfilePhoto = async () => {
    if (!photoFile) return;

    const photoRef = ref(storage, `profilePhotos/${userDetails.ujbCode}`);
    await uploadBytes(photoRef, photoFile);
    const url = await getDownloadURL(photoRef);

    await addDoc(collection(db, "profileChangeRequests"), {
      ujbCode: userDetails.ujbCode,
      type: "PROFILE_PHOTO",
      oldData: userDetails.ProfilePhotoURL || "",
      newData: url,
      status: "PENDING",
      createdAt: Timestamp.now(),
    });

    setPhotoFile(null);
    setPreviewPhoto(null);
  };

  /* ---------------- BASIC INFO SUBMIT ---------------- */

  const submitBasicInfo = async () => {
    await addDoc(collection(db, "profileChangeRequests"), {
      ujbCode: userDetails.ujbCode,
      type: "BASIC_INFO",
      oldData: {
        name: userDetails.name,
        email: userDetails.email,
        gender: userDetails.gender,
        dob: userDetails.dob,
      },
      newData: {
        name: formData.name,
        email: formData.email,
        gender: formData.gender,
        dob: formData.dob,
      },
      status: "PENDING",
      createdAt: Timestamp.now(),
    });

    if (photoFile) await submitProfilePhoto();
    setIsEditMode(false);
  };

  /* ---------------- RENDER HELPERS ---------------- */

  const renderField = (label, value) => (
    <div className="input-group" key={label}>
      <label>{label}</label>
      <input type="text" value={value || ''} readOnly />
    </div>
  );

  const renderArrayField = (label, values) => (
    <div className="input-group" key={label}>
      <label>{label}</label>
      <ul>{values.map((v, i) => <li key={i}>{v}</li>)}</ul>
    </div>
  );

  /* ---------------- FIELD GROUPS (UNCHANGED) ---------------- */

  const orbiterFields = [
    'IDType', 'IDNumber', 'Address', 'MaritalStatus', 'LanguagesKnown', 'Hobbies',
    'InterestArea', 'Skills', 'ExclusiveKnowledge', 'Aspirations'
  ];

  const healthFields = ['HealthParameters', 'CurrentHealthCondition', 'FamilyHistorySummary'];

  const professionalFields = [
    'ProfessionalHistory', 'CurrentProfession', 'EducationalBackground',
    'ContributionAreaInUJustBe', 'ImmediateDesire', 'Mastery', 'SpecialSocialContribution'
  ];

  const cosmorbiterExtraFields = [
    'BusinessName', 'BusinessDetails', 'BusinessHistory', 'NoteworthyAchievements',
    'ClienteleBase', 'BusinessSocialMediaPages', 'Website', 'Locality', 'AreaOfServices', 'USP',
    'BusinessEmailID', 'TagLine'
  ];

  /* ---------------- BASIC FIELDS (EDITABLE) ---------------- */

  const basicFields = (
    <>
      {!isEditMode ? (
        <button className="edit-btn" onClick={() => setIsEditMode(true)}>Edit</button>
      ) : (
        <button className="submit-btn" onClick={submitBasicInfo}>Submit for Approval</button>
      )}

      <div className="input-group">
        <label>Fullname</label>
        <input
          value={isEditMode ? formData.name : userDetails.name}
          readOnly={!isEditMode}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
      </div>

      <div className="input-group">
        <label>Email Address</label>
        <input
          value={isEditMode ? formData.email : userDetails.email}
          readOnly={!isEditMode}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        />
      </div>

      {renderField('Phone Number', userDetails.mobile)}
      {renderField('Gender', userDetails.gender)}
      {renderField('Category', userDetails.category)}
      {renderField('UJB Code', userDetails.ujbCode)}

      <div className="input-group">
        <label>Date of Birth</label>
        <div className="date-input">
          <input
            type="text"
            value={isEditMode ? formData.dob : userDetails.dob}
            readOnly={!isEditMode}
            onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
          />
          <span className="calendar-icon"><FaCalendarAlt /></span>
        </div>
      </div>
    </>
  );

  /* ---------------- UI ---------------- */

  return (
    <main className="pageContainer">
      <Headertop />

      <section className="dashBoardMain profileMainPage">

        {loading ? (
          <>
            <ProfileSkeleton />
            {[...Array(8)].map((_, i) => <FieldSkeleton key={i} />)}
          </>
        ) : (
          <>
            {/* PROFILE HEADER */}
            <div className="input-group profile-photo-group">
              <div className="profile-photo-wrapper">
                <img
                  src={previewPhoto || userDetails.ProfilePhotoURL || ""}
                  alt="Profile"
                  className="profile-round-image"
                />

                {isEditMode && (
                  <label className="photo-edit-btn">
                    ✎
                    <input type="file" hidden accept="image/*" onChange={handlePhotoSelect} />
                  </label>
                )}
              </div>

              <div className="profile-details">
                <h2>{userDetails.name}</h2>
                <span className="profile-role">{userDetails.category}</span>
              </div>
            </div>

         
            <div className="tab-contents">
              <div className="new-profile-container">
                <div className="profile-tab-wrapper">

                  {!showContentOnly && (
                    <div className="vertical-tabs">

                      <button className="tab-btn" onClick={() => { setActiveTab('basic'); setShowContentOnly(true); }}>
                        <FiUser className="tab-icon" />
                        <span>Basic Info</span>
                        <FiChevronRight className="arrow-icon" />
                      </button>

                      <button className="tab-btn" onClick={() => { setActiveTab('additional'); setShowContentOnly(true); }}>
                        <FiGlobe className="tab-icon" />
                        <span>Additional Info</span>
                        <FiChevronRight className="arrow-icon" />
                      </button>

                      <button className="tab-btn" onClick={() => { setActiveTab('health'); setShowContentOnly(true); }}>
                        <FiHeart className="tab-icon" />
                        <span>Health Info</span>
                        <FiChevronRight className="arrow-icon" />
                      </button>

                      <button className="tab-btn" onClick={() => { setActiveTab('professional'); setShowContentOnly(true); }}>
                        <FiBriefcase className="tab-icon" />
                        <span>Professional Info</span>
                        <FiChevronRight className="arrow-icon" />
                      </button>

                      {userDetails.category?.toLowerCase() === 'cosmorbiter' && (
                        <button className="tab-btn" onClick={() => { setActiveTab('business'); setShowContentOnly(true); }}>
                          <FiLayers className="tab-icon" />
                          <span>Business Info</span>
                          <FiChevronRight className="arrow-icon" />
                        </button>
                      )}

                      {userDetails.services.length > 0 && (
                        <button className="tab-btn" onClick={() => { setActiveTab('services'); setShowContentOnly(true); }}>
                          <FiBox className="tab-icon" />
                          <span>Services</span>
                          <FiChevronRight className="arrow-icon" />
                        </button>
                      )}

                      {userDetails.products.length > 0 && (
                        <button className="tab-btn" onClick={() => { setActiveTab('products'); setShowContentOnly(true); }}>
                          <TbSettingsStar className="tab-icon" />
                          <span>Products</span>
                          <FiChevronRight className="arrow-icon" />
                        </button>
                      )}

                      {userDetails.connects.length > 0 && (
                        <button className="tab-btn" onClick={() => { setActiveTab('connects'); setShowContentOnly(true); }}>
                          <FiUsers className="tab-icon" />
                          <span>Connects</span>
                          <FiChevronRight className="arrow-icon" />
                        </button>
                      )}

                    </div>
                  )}

                  {showContentOnly && (
                    <div className="tab-content-area">
                      <div className="tab-header">
                        <button className="back-button" onClick={() => setShowContentOnly(false)}>
                          <MdArrowBack />
                        </button>
                        <span className="tab-title">
                          {activeTab === 'basic' && 'Basic Info'}
                          {activeTab === 'additional' && 'Additional Info'}
                          {activeTab === 'health' && 'Health Info'}
                          {activeTab === 'professional' && 'Professional Info'}
                          {activeTab === 'business' && 'Business Info'}
                          {activeTab === 'services' && 'Services'}
                          {activeTab === 'products' && 'Products'}
                          {activeTab === 'connects' && 'Connects'}
                        </span>
                      </div>

                     <div className="profile-inputs">

  {/* ================= BASIC ================= */}
  {activeTab === 'basic' && basicFields}

  {/* ================= ADDITIONAL ================= */}
  {activeTab === 'additional' && (
    <>
      <button
        className="edit-btn"
        onClick={() =>
          isEditMode
            ? submitTabForApproval(
                "ADDITIONAL_INFO",
                orbiterFields.reduce((o, f) => ({ ...o, [f]: userDetails[f] }), {}),
                draftAdditional
              )
            : setIsEditMode(true)
        }
      >
        {isEditMode ? "Submit for Approval" : "Edit"}
      </button>

      {orbiterFields.map(field => (
        <div className="input-group" key={field}>
          <label>{field}</label>
          <input
            type="text"
            value={isEditMode ? draftAdditional[field] || '' : userDetails[field] || ''}
            readOnly={!isEditMode}
            onChange={(e) =>
              setDraftAdditional({ ...draftAdditional, [field]: e.target.value })
            }
          />
        </div>
      ))}
    </>
  )}

  {/* ================= HEALTH ================= */}
  {activeTab === 'health' && (
    <>
      <button
        className="edit-btn"
        onClick={() =>
          isEditMode
            ? submitTabForApproval(
                "HEALTH_INFO",
                healthFields.reduce((o, f) => ({ ...o, [f]: userDetails[f] }), {}),
                draftHealth
              )
            : setIsEditMode(true)
        }
      >
        {isEditMode ? "Submit for Approval" : "Edit"}
      </button>

      {healthFields.map(field => (
        <div className="input-group" key={field}>
          <label>{field}</label>
          <input
            type="text"
            value={isEditMode ? draftHealth[field] || '' : userDetails[field] || ''}
            readOnly={!isEditMode}
            onChange={(e) =>
              setDraftHealth({ ...draftHealth, [field]: e.target.value })
            }
          />
        </div>
      ))}
    </>
  )}

  {/* ================= PROFESSIONAL ================= */}
  {activeTab === 'professional' && (
    <>
      <button
        className="edit-btn"
        onClick={() =>
          isEditMode
            ? submitTabForApproval(
                "PROFESSIONAL_INFO",
                professionalFields.reduce((o, f) => ({ ...o, [f]: userDetails[f] }), {}),
                draftProfessional
              )
            : setIsEditMode(true)
        }
      >
        {isEditMode ? "Submit for Approval" : "Edit"}
      </button>

      {professionalFields.map(field => (
        <div className="input-group" key={field}>
          <label>{field}</label>
          <input
            type="text"
            value={isEditMode ? draftProfessional[field] || '' : userDetails[field] || ''}
            readOnly={!isEditMode}
            onChange={(e) =>
              setDraftProfessional({ ...draftProfessional, [field]: e.target.value })
            }
          />
        </div>
      ))}
    </>
  )}

  {/* ================= BUSINESS ================= */}
  {activeTab === 'business' && (
    <>
      <button
        className="edit-btn"
        onClick={() =>
          isEditMode
            ? submitTabForApproval(
                "BUSINESS_INFO",
                cosmorbiterExtraFields.reduce((o, f) => ({ ...o, [f]: userDetails[f] }), {}),
                draftBusiness
              )
            : setIsEditMode(true)
        }
      >
        {isEditMode ? "Submit for Approval" : "Edit"}
      </button>

      {userDetails.BusinessLogo && (
        <div className="businessLogo">
          <img
            src={userDetails.BusinessLogo}
            alt="Business Logo"
            className="profile-photo-img"
          />
        </div>
      )}

      {cosmorbiterExtraFields.map(field => (
        <div className="input-group" key={field}>
          <label>{field}</label>
          <input
            type="text"
            value={isEditMode ? draftBusiness[field] || '' : userDetails[field] || ''}
            readOnly={!isEditMode}
            onChange={(e) =>
              setDraftBusiness({ ...draftBusiness, [field]: e.target.value })
            }
          />
        </div>
      ))}
    </>
  )}

  {/* ================= SERVICES ================= */}
  {activeTab === 'services' && (
    <>
      <button
        className="edit-btn"
        onClick={() =>
          isEditMode
            ? submitTabForApproval("SERVICES", userDetails.services, draftServices)
            : setIsEditMode(true)
        }
      >
        {isEditMode ? "Submit for Approval" : "Edit"}
      </button>

      <div className="offering-list">
        {draftServices.map((srv, i) => (
          <div key={i} className="offering-card">
            <div className="offerDesc">
              <input
                type="text"
                value={srv.name}
                readOnly={!isEditMode}
                onChange={(e) => {
                  const u = [...draftServices];
                  u[i].name = e.target.value;
                  setDraftServices(u);
                }}
              />
              <textarea
                value={srv.description}
                readOnly={!isEditMode}
                onChange={(e) => {
                  const u = [...draftServices];
                  u[i].description = e.target.value;
                  setDraftServices(u);
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </>
  )}

  {/* ================= PRODUCTS ================= */}
  {activeTab === 'products' && (
    <>
      <button
        className="edit-btn"
        onClick={() =>
          isEditMode
            ? submitTabForApproval("PRODUCTS", userDetails.products, draftProducts)
            : setIsEditMode(true)
        }
      >
        {isEditMode ? "Submit for Approval" : "Edit"}
      </button>

      <div className="offering-list">
        {draftProducts.map((srv, i) => (
          <div key={i} className="offering-card">
            <div className="offerDesc">
              <input
                type="text"
                value={srv.name}
                readOnly={!isEditMode}
                onChange={(e) => {
                  const u = [...draftProducts];
                  u[i].name = e.target.value;
                  setDraftProducts(u);
                }}
              />
              <textarea
                value={srv.description}
                readOnly={!isEditMode}
                onChange={(e) => {
                  const u = [...draftProducts];
                  u[i].description = e.target.value;
                  setDraftProducts(u);
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </>
  )}

  {/* ================= CONNECTS (READ ONLY) ================= */}
  {activeTab === 'connects' && (
    <div className="connects-list">
      {userDetails.connects.map((con, i) => (
        <div key={i} className="connect-card">
          <div className="connect-info">
            <h4>{con.name}</h4>
            <p><strong>Phone:</strong> {con.phone}</p>
            <p><strong>Email:</strong> {con.email}</p>
            <p><strong>UJB Code:</strong> {con.ujbCode}</p>
          </div>
        </div>
      ))}
    </div>
  )}

</div>


                    </div>
                  )}

                </div>
              </div>
            </div>
          </>
        )}
       
        <HeaderNav />
      </section>
    </main>
  );
};

export default Profile;
