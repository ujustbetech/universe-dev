import React, { useEffect, useState } from 'react';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { app } from '../firebaseConfig';
import { TbBlocks } from "react-icons/tb";
import { TbSettingsStar } from "react-icons/tb";
import '../src/app/styles/user.scss';
import { FiBell, FiGlobe, FiUser, FiHeart, FiBriefcase, FiBox, FiLayers, FiChevronRight, FiUsers } from "react-icons/fi";
import { useRouter } from 'next/router';
import HeaderNav from '../component/HeaderNav';
import { FaCalendarAlt } from 'react-icons/fa';
import { MdArrowBack } from "react-icons/md";
import { CiImageOff } from "react-icons/ci";
import Headertop from '../component/Header';

const db = getFirestore(app);

const Profile = () => {
  const [userDetails, setUserDetails] = useState({});
  const [activeTab, setActiveTab] = useState('basic');
  const [showContentOnly, setShowContentOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  const router = useRouter();

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

  useEffect(() => {
    const storedUjb = localStorage.getItem('mmUJBCode');

    if (storedUjb) {
      fetchUserDetails(storedUjb);
    }
  }, []);

  const fetchUserDetails = async (ujbCode) => {
    try {
      const docSnap = await getDoc(doc(db, "usersdetail", ujbCode));

      if (docSnap.exists()) {
        const data = docSnap.data();

        setUserDetails({
          ...data,
          name: data.Name || data.orbiterName || '',
          email: data.Email || data.BusinessEmailID || '',
          dob: data.DOB || '',
          gender: data.Gender || '',
          mobile: data.MobileNo || data.mobileNumber || '',
          category: data.Category || '',
          ujbCode,

          // field corrections
          AreaOfServices: data.AreaOfServices || data.AreaofServices || '',
          ContributionAreaInUJustBe:
            data.ContributionAreaInUJustBe || data.ContributionAreainUJustBe || [],

          BusinessLogo: data.BusinessLogo || '',

          services: data.services ? Object.values(data.services) : [],
          products: data.products ? Object.values(data.products) : [],

          connects: data.connects ? data.connects : [],
        });
      }
    } catch (err) {
      console.error("❌ Error fetching user details:", err);
    }

    setLoading(false);
  };

  const renderField = (label, value) => (
    <div className="input-group" key={label}>
      <label>{label}</label>
      <input type="text" value={value} readOnly />
    </div>
  );

  const renderArrayField = (label, values) => (
    <div className="input-group" key={label}>
      <label>{label}</label>
      <ul>{values.map((v, i) => <li key={i}>{v}</li>)}</ul>
    </div>
  );

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

  const basicFields = [
    renderField('Fullname', userDetails.name),
    renderField('Phone Number', userDetails.mobile),
    renderField('Email Address', userDetails.email),
    renderField('Gender', userDetails.gender),
    renderField('Category', userDetails.category),
    renderField('UJB Code', userDetails.ujbCode),
    <div className="input-group" key="dob">
      <label>Date of Birth</label>
      <div className="date-input">
        <input type="text" value={userDetails.dob} readOnly />
        <span className="calendar-icon"><FaCalendarAlt /></span>
      </div>
    </div>
  ];

  return (
    <main className="pageContainer">
      <Headertop />

      <section className="dashBoardMain profileMainPage">

        {/* 🔵 LOADING SKELETON */}
        {loading ? (
          <>
            <ProfileSkeleton />
            {[...Array(8)].map((_, i) => (
              <FieldSkeleton key={i} />
            ))}
          </>
        ) : (
          <>
            <div className="input-group profile-photo-group">
              <div className="profile-photo-wrapper">
                <img
                  src={userDetails.ProfilePhotoURL || ""}
                  alt="Profile"
                  className="profile-round-image"
                />
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
                        {activeTab === 'basic' && basicFields}

                        {activeTab === 'additional' &&
                          orbiterFields.map(field =>
                            Array.isArray(userDetails[field])
                              ? renderArrayField(field, userDetails[field])
                              : renderField(field, userDetails[field] || '')
                          )
                        }

                        {activeTab === 'health' &&
                          healthFields.map(field =>
                            renderField(field, userDetails[field] || '')
                          )
                        }

                        {activeTab === 'professional' &&
                          professionalFields.map(field =>
                            Array.isArray(userDetails[field])
                              ? renderArrayField(field, userDetails[field])
                              : renderField(field, userDetails[field] || '')
                          )
                        }

                        {activeTab === 'business' && (
                          <>
                            {userDetails.BusinessLogo && (
                              <div className="businessLogo">
                                <img
                                  src={userDetails.BusinessLogo}
                                  alt="Business Logo"
                                  className="profile-photo-img"
                                />
                              </div>
                            )}

                            {cosmorbiterExtraFields.map(field =>
                              renderField(field, userDetails[field] || '')
                            )}
                          </>
                        )}

                        {activeTab === 'services' && (
                          <div className="offering-list">
                            {userDetails.services.map((srv, i) => (
                              <div key={i} className="offering-card">
                                <div className='offerImage'>
                                  {srv.imageURL ? (
                                    <img src={srv.imageURL} alt={srv.name} />
                                  ) : (
                                    <div className="nothumbnail"><CiImageOff /></div>
                                  )}
                                </div>
                                <div className='offerDesc'>
                                  <h4>{srv.name}</h4>
                                  <p>{srv.description}</p>
                                  {srv.percentage && <p>Agreed Percentage: {srv.percentage}%</p>}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {activeTab === 'products' && (
                          <div className="offering-list">
                            {userDetails.products.map((srv, i) => (
                              <div key={i} className="offering-card">
                                <div className='offerImage'>
                                  {srv.imageURL ? (
                                    <img src={srv.imageURL} alt={srv.name} />
                                  ) : (
                                    <div className="nothumbnail"><CiImageOff /></div>
                                  )}
                                </div>
                                <div className='offerDesc'>
                                  <h4>{srv.name}</h4>
                                  <p>{srv.description}</p>
                                  {srv.percentage && <p>Agreed Percentage: {srv.percentage}%</p>}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

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
