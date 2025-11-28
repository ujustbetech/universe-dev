import React, { useEffect, useState } from 'react';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { app } from '../firebaseConfig';
import { TbBlocks } from "react-icons/tb";
import { TbSettingsStar } from "react-icons/tb";
import '../src/app/styles/user.scss';
import { FiBell, FiGlobe, FiUser, FiHeart, FiBriefcase, FiBox, FiLayers, FiChevronRight } from "react-icons/fi";
import { useRouter } from 'next/router';
import HeaderNav from '../component/HeaderNav';
import { FaCalendarAlt } from 'react-icons/fa';
import { MdArrowBack } from "react-icons/md";
import { CiImageOff } from "react-icons/ci";
import Headertop from '../component/Header';

const db = getFirestore(app);

const Profile = () => {
  const [userName, setUserName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [cpPoints, setCPPoints] = useState(0);
  const [userDetails, setUserDetails] = useState({});
  const [activeTab, setActiveTab] = useState('basic');
  const router = useRouter();
  const [showContentOnly, setShowContentOnly] = useState(false);

  const getInitials = (name) => name?.split(' ').map(word => word[0]).join('');

  useEffect(() => {
    const storedPhone = localStorage.getItem('mmOrbiter');
    if (storedPhone) {
      const phone = storedPhone.trim();
      setPhoneNumber(phone);
      fetchUserDetails(phone);
      fetchUserName(phone);
      // fetchCPPoints(phone);
    }
  }, []);
useEffect(() => {
  const storedUjb = localStorage.getItem('mmUJBCode');

  if (storedUjb) {
    fetchUserDetails(storedUjb);
    fetchUserName(storedUjb);
  }
}, []);

const fetchUserDetails = async (ujbCode) => {
  try {
    const docSnap = await getDoc(doc(db, "usersdetail", ujbCode));

    if (docSnap.exists()) {
      const data = docSnap.data();

      console.log("🔥 Firestore Data:", data);

      setUserDetails({
        ...data,
        name: data.Name || '',
        email: data.Email || '',
        dob: data.DOB || '',
        gender: data.Gender || '',
        mobile: data.MobileNo || '',
        category: data.Category || '',
        ujbCode,

        // ✅ FIXED: convert numbered object → array
        services: data.services ? Object.values(data.services) : [],
        products: data.products ? Object.values(data.products) : [],
      });
    }
  } catch (err) {
    console.error("❌ Error fetching user details:", err);
  }
};



  const fetchUserName = async (phone) => {
    const docSnap = await getDoc(doc(db, 'userdetail', phone));
    if (docSnap.exists()) setUserName(docSnap.data()[' Name'] || 'User');
  };

  const fetchCPPoints = async (phone) => {
    const snap = await getDocs(collection(db, 'Orbiters', phone, 'activities'));
    let total = 0;
    snap.forEach(doc => total += Number(doc.data()?.points) || 0);
    setCPPoints(total);
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

  const healthFields = [
    'HealthParameters', 'CurrentHealthCondition', 'FamilyHistorySummary'
  ];

  const professionalFields = [
    'ProfessionalHistory', 'CurrentProfession',
    'EducationalBackground', 'ContributionAreainUJustBe',
    'ImmediateDesire', 'Mastery', 'SpecialSocialContribution'
  ];

  const cosmorbiterExtraFields = [
    'BusinessName', 'BusinessDetails', 'BusinessHistory', 'NoteworthyAchievements',
    'ClienteleBase', 'BusinessSocialMediaPages', 'Website', 'Locality', 'AreaofServices', 'USP',
    'Business Logo (File Name)', 'TagLine'
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


  const additionalFields = orbiterFields.map(field => {
    const value = userDetails[field];
    return Array.isArray(value) ? renderArrayField(field, value) : renderField(field, value || '');
  });

  const healthInfoFields = healthFields.map(field => {
    const value = userDetails[field];
    return renderField(field, value || '');
  });

  const professionalInfoFields = professionalFields.map(field => {
    const value = userDetails[field];
    return renderField(field, value || '');
  });

  const businessFields = userDetails.category?.toLowerCase() === 'cosmorbiter'
    ? cosmorbiterExtraFields.map(field => {
      const value = userDetails[field];
      return renderField(field, value || '');
    })
    : [];

  return (
    <main className="pageContainer">
      <Headertop/>

      <section className="dashBoardMain profileMainPage">
        {!showContentOnly && (
          <>
            {/* <h2 className="profile-title">My Profile</h2> */}
            <div className="input-group profile-photo-group " key="profile-photo">
              <div className="profile-photo-wrapper">
                <img
                  src={
                    userDetails['ProfilePhotoURL']
                      ? userDetails['ProfilePhotoURL']
                      : "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBw4ODg4NDg4ODhAPEA0NDw0NDRAQDg0NFhIXFhURExUYHCggGBolHRMTITEhJSkrLi4uFx8zODMsNygtLisBCgoKDg0NEA4PDy0ZFRkrKystKzctNy0rKysrKystKysrKysrKysrNysrKysrKysrKysrKysrKysrKysrKysrK//AABEIAOEA4QMBIgACEQEDEQH/xAAbAAEAAgMBAQAAAAAAAAAAAAAAAQQCBQYDB//EADMQAQEAAQEFAwoGAwEAAAAAAAABAgMEBREhMRJBURUiM1JhcYGSocEycoKxstETI5Hh/8QAFgEBAQEAAAAAAAAAAAAAAAAAAAEC/8QAFhEBAQEAAAAAAAAAAAAAAAAAAAER/9oADAMBAAIRAxEAPwD6KgG2QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAZdqgMQAAAAAAAAAAAARxFSI4pAAEAAAAAAAAAAAAAAAAAAAAAAJzvBsdk3VllzzvCeE62PfdOwzGf5cudvSXujaM2qq6W79LHpjxvjbViaeM7p/xkIrzy2fC9cZz9iptG69PL8M7F9nHg2CDRzW07Hnp8e1OM7rOjwdVqYTKXG9LOFc9t2zXSy4dZeeN9jUqKwlCoAAAAAAAAAAAAAAAAAALm69nmpnznGY86p1vNy6fDT7XDrUqthIkGVQJQACQQrbds81MLy5znL4VaRQcn38BZ3jpzHVyk7+as3qAAgAAAAAAAAAAAAAAABXS7FjJp4d3KVzVdPsvo8Py4/slV7CIllQAAABFSig0u+5wzxvjLx+jWtpv3rp+7L7NYsRADSAAAAAAAAAAAAAAAAFdHu7U7WlhfZw/wCcnONtuTXnnad6/inuSq24hLKgAAACKljnlJLb3A0e+tXjqTH1Z+6g9Nr1O3nll422ce6PLFqIkBUAAAAAAAAAAAAAAAAGejqXDKZTrKwCjqNn1pnjMpZ/Verm9g2z/Flz49m9Z93Q6WpMpLLxlYaZgAAANTvfa+V0p7OP7rO8NtmnjZOeV4ycO6+NaDLK223nbeNWREWANIAAAAAAAAAAAAAAAAAAAkGNe2zbVnp/hvwvOPNCK2uz749fH4xZm9tH1rP05f00PEiYN5lvfT58OOXws/dR1d66uXThjPdzUacVwZZ5XK2222sQVAAAAAAAAAAAAAAAAAABlp4ZZXhjLfgvbDu25+dnxmPKzxrc6WhjhJMcZOCarT6G6c7zyvZ9i5jujTnW5X4z7RsBNXFLyXo+rfmp5L0fVvzVdEFLyXo+rfmqPJej6t+arwCj5K0fVvzU8laPq35qvAKPkrR9W/NWOW6NK9LnPdlPvGwAanPc3q6l/Viqa27dXHu7U8cbx+nV0Iujk8pZeFll8LyqHUa+z4ak4ZYy+3vnurSbdsGWl5087Dx7571lTFIBUAAAAAAAAAAS2u7t3cfPz+EeG6dn7eXavTH61vZGbVJEgigAAAAAAAAAAACLOPKpAaHeew/4728Z5l6z1b/Sg6vUwmUuNnGWcLPY5ra9C6edwvd0vjO5qVK8QFQAAAAAAZYY22SdbZIxX9zaPa1O13YTj8b0+5VbjZNnmlhMZ77fG99ewMKAAAAAAAAAAAAAAAANdvrQ7WHbnXDr+Wtiw1sO1jlj4yz6A5UINsgAAAAADd7jx8zK+OX0k/8AWkb/AHNP9M9tyv14fZKsXgGVAAAAAAAAAAAAAAAAAAcrrY8M854ZZT6sHttfpNT8+f8AKvFtAAQAAAAdDun0OH6/5VzzoN0ehx9+X8qlWLoDKgAAAAAAAAAAAAAAAAAOZ26f7dT82TwWd4zhranvl+kVm4gAIAAAAOg3R6HH35fyoJVi6AyoAAAAAAAAAAAAAAACKQAc9vT02f6f4xUBuIACAAP/2Q==" // fallback image path
                  }
                  alt="Profile"
                  className="profile-round-image"
                />
              </div>
              <div className="profile-details">
                <h2>{userDetails.name}</h2>
                <span className="profile-role">{userDetails.category}</span>
              </div>
            </div>

            <div className="profile-image-section">
              {userDetails['Upload Photo (File Name)'] && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <img
                    src={userDetails['ProfilePhotoURL']}
                    alt="Profile"
                    className="profile-photo-img"
                  />
                  <a
                    href={userDetails['ProfilePhotoURL']}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: '12px', marginTop: '5px' }}
                  >
                    View Image URL
                  </a>
                </div>
              )}
            </div>
          </>
        )}

        <div className="tab-contents">
          <div className="new-profile-container">



            <div className="profile-tab-wrapper">


              {/* Show tabs only if showContentOnly is false */}
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

                  {businessFields.length > 0 && (
                    <button className="tab-btn" onClick={() => { setActiveTab('business'); setShowContentOnly(true); }}>
                      <FiLayers className="tab-icon" />
                      <span>Business Info</span>
                      <FiChevronRight className="arrow-icon" />
                    </button>
                  )}

                  {userDetails?.services?.length > 0 && (
                    <button className="tab-btn" onClick={() => { setActiveTab('services'); setShowContentOnly(true); }}>
                      <FiBox className="tab-icon" />
                      <span>Services</span>
                      <FiChevronRight className="arrow-icon" />
                    </button>
                  )}

                  {userDetails?.products?.length > 0 && (
                    <button className="tab-btn" onClick={() => { setActiveTab('products'); setShowContentOnly(true); }}>
                      <TbSettingsStar className="tab-icon" />
                      <span>Products</span>
                      <FiChevronRight className="arrow-icon" />
                    </button>
                  )}
                </div>

              )}
              {showContentOnly && (
                <div className="tab-content-area">
                  <div className="tab-header">
                    <button
                      className="back-button"
                      onClick={() => setShowContentOnly(false)}
                    >
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
                    </span>
                  </div>

                  <div className="profile-inputs">
                    {activeTab === 'basic' && basicFields}
                    {activeTab === 'additional' && additionalFields}
                    {activeTab === 'health' && healthInfoFields}
                    {activeTab === 'professional' && professionalInfoFields}
                    {activeTab === 'business' && (
                      <div className="business-logo-section">
                        {userDetails['Business Logo'] && (
                          <div className='businessLogo'>
                            <img
                              src={userDetails['BusinessLogo']}
                              alt="BusinessLogo"
                              className="profile-photo-img"
                            />

                          </div>


                        )}

                        {/* 🔁 Render the business info fields below the logo */}
                        {businessFields}
                      </div>
                    )}

                    {activeTab === 'services' && (
                      <div className="offerings-section">

                        <div className="offering-list">
                          {userDetails.services.map((srv, i) => (
                            <div key={i} className="offering-card">
                              <div className='offerImage'>
                                {srv.imageURL ? (
                                  <img
                                    src={srv.imageURL}
                                    alt={srv.name}
                                  />
                                ) : (
                                  <div className="nothumbnail">
                                    <CiImageOff />
                                  </div>
                                )}
                              </div>
                              <div className='offerDesc'>
                                <h4>{srv.name}</h4>
                                <p>{srv.description}</p>
                                {srv.percentage && <p>Agreed Percentage: {srv.percentage}%</p>} {/* ✅ Add this */}
                              </div>
                            </div>
                          ))}

                        </div>
                      </div>
                    )}
                    {activeTab === 'products' && (
                      <div className="offerings-section">

                        <div className="offering-list">
                          {userDetails.products.map((srv, i) => (
                            <div key={i} className="offering-card">
                              <div className='offerImage'>

                                {srv.imageURL ? (
                                  <img
                                    src={srv.imageURL}
                                    alt={srv.name}
                                  />
                                ) : (
                                  <div className="nothumbnail">
                                    <CiImageOff />
                                  </div>
                                )}
                              </div>
                              <div className='offerDesc'>
                                <h4>{srv.name}</h4>
                                <p>{srv.description}</p>
                                {srv.percentage && <p>Agreed Percentage: {srv.percentage}%</p>} {/* ✅ Add this */}
                              </div>
                            </div>
                          ))}

                        </div>
                      </div>
                    )}

                  </div>
                </div>
              )}
            </div>


          </div>
        </div>

        <HeaderNav />
      </section>
    </main>
  );
};

export default Profile;