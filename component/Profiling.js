'use client';

import React, { useEffect, useState } from 'react';
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  where
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import Swal from 'sweetalert2';

import { db, storage } from '../firebaseConfig';
import { useSearchParams } from 'next/navigation'; 


const UserProfileForm = () => {
  const searchParams = useSearchParams();
const ujbcode = searchParams.get('user');
const [activeTab, setActiveTab] = useState('Personal Info');
const [profilePreview, setProfilePreview] = useState('');
const [businessLogoPreview, setBusinessLogoPreview] = useState('');
const [servicePreviews, setServicePreviews] = useState([]); 
const [productPreviews, setProductPreviews] = useState([]);
// payment state: orbiter + cosmo entries, each may include a screenshotFile (temp) + preview
const [payment, setPayment] = useState({
  orbiter: {
    feeType: '',      // 'upfront' | 'adjustment'
    amount: 1000,
    status: 'unpaid', // 'paid' | 'adjusted' | 'unpaid'
    paidDate: '',
    paymentMode: '',
    paymentId: '',
    screenshotURL: '',    // persisted URL from storage
    screenshotFile: null, // local file object (not persisted)
    screenshotPreview: '' // local preview for UI
  },
  cosmo: {
    amount: 5000,
    status: 'unpaid', // 'paid' | 'unpaid'
    paidDate: '',
    paymentMode: '',
    paymentId: '',
    screenshotURL: '',
    screenshotFile: null,
    screenshotPreview: ''
  }
});

const paymentModes = ['UPI', 'Cash', 'Bank Transfer', 'Credit Card', 'Debit Card', 'NEFT/RTGS'];


// --- social platform list ---
const socialPlatforms = [
  'Facebook',
  'Instagram',
  'LinkedIn',
  'YouTube',
  'Twitter',
  'Pinterest',
  'Other' // keep Other for custom names
];

// --- social links state (start with one blank entry) ---
const [socialMediaLinks, setSocialMediaLinks] = useState([
  { platform: '', url: '', customPlatform: '' },
]);

// --- change handler ---
const handleSocialMediaChange = (index, key, value) => {
  setSocialMediaLinks((prev) => {
    const updated = [...prev];
    // ensure entry exists
    if (!updated[index]) updated[index] = { platform: '', url: '', customPlatform: '' };

    // if platform changed to a non-Other, clear customPlatform
    if (key === 'platform') {
      updated[index].platform = value;
      if (value !== 'Other') updated[index].customPlatform = '';
    } else {
      updated[index][key] = value;
    }
    return updated;
  });
};

// --- add / remove helpers ---
const addSocialMediaField = () => {
  setSocialMediaLinks((prev) => [...prev, { platform: '', url: '', customPlatform: '' }]);
};

const removeSocialMediaField = (index) => {
  setSocialMediaLinks((prev) => {
    const updated = [...prev];
    updated.splice(index, 1);
    // ensure at least one blank entry remains
    return updated.length ? updated : [{ platform: '', url: '', customPlatform: '' }];
  });
};



useEffect(() => {
  const fetchUserByPhone = async () => {
    try {
      if (!ujbcode) return;

      const q = query(collection(db, 'userdetail_dev'), where('UJBCode', '==', ujbcode));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const userDoc = snapshot.docs[0];
        const userData = userDoc.data();

        setFormData(userData);
        setDocId(userDoc.id);

        if (userData['Profile Photo URL']) setProfilePreview(userData['ProfilePhotoURL']);
        if (userData['Business Logo']) setBusinessLogoPreview(userData['BusinessLogo']);

        // Load services
        if (userData.services?.length > 0) {
          setServices(
            userData.services.map(s => ({
              name: s.name || '',
              description: s.description || '',
              keywords: s.keywords || '',
              image: null,
              percentage: s.percentage || '',
            }))
          );
        }
// --- populate payment safely ---
const incomingPayments = userData.payment || {};

setPayment((prev) => ({
  orbiter: {
    feeType: incomingPayments?.orbiter?.feeType || prev.orbiter.feeType || '',
    amount: incomingPayments?.orbiter?.amount || 1000,
    status: incomingPayments?.orbiter?.status || prev.orbiter.status || 'unpaid',
    paidDate: incomingPayments?.orbiter?.paidDate || '',
    paymentMode: incomingPayments?.orbiter?.paymentMode || '',
    paymentId: incomingPayments?.orbiter?.paymentId || '',
    screenshotURL: incomingPayments?.orbiter?.screenshotURL || '',
    screenshotFile: null,
    screenshotPreview: incomingPayments?.orbiter?.screenshotURL || ''
  },
  cosmo: {
    amount: incomingPayments?.cosmo?.amount || 5000,
    status: incomingPayments?.cosmo?.status || prev.cosmo.status || 'unpaid',
    paidDate: incomingPayments?.cosmo?.paidDate || '',
    paymentMode: incomingPayments?.cosmo?.paymentMode || '',
    paymentId: incomingPayments?.cosmo?.paymentId || '',
    screenshotURL: incomingPayments?.cosmo?.screenshotURL || '',
    screenshotFile: null,
    screenshotPreview: incomingPayments?.cosmo?.screenshotURL || ''
  }
}));
 // Load products
        if (userData.products?.length > 0) {
          setProducts(
            userData.products.map(p => ({
              name: p.name || '',
              description: p.description || '',
              keywords: p.keywords || '',
              image: null,
              percentage: p.percentage || '',
            }))
          );
        }
// --- When loading user data from Firestore (inside fetchUserByPhone) ---
const pages = Array.isArray(userData.BusinessSocialMediaPages)
  ? userData.BusinessSocialMediaPages
  : [];

setSocialMediaLinks(
  pages.map((s) => ({
    platform: s?.platform || '',
    link: s?.link || ''
  }))
);


      }
    } catch (err) {
      console.error('Error fetching user:', err);
    }
  };

  fetchUserByPhone();
}, [ujbcode]);

const handlePaymentScreenshotChange = (feeKey, file) => {
  if (!file) return;
  const preview = URL.createObjectURL(file);
  setPayment((p) => ({
    ...p,
    [feeKey]: {
      ...p[feeKey],
      screenshotFile: file,
      screenshotPreview: preview
    }
  }));
};

const clearPaymentScreenshot = (feeKey) => {
  setPayment((p) => ({
    ...p,
    [feeKey]: {
      ...p[feeKey],
      screenshotFile: null,
      screenshotPreview: p[feeKey].screenshotURL || ''
    }
  }));
};
const uploadPaymentScreenshot = async (file, feeKey) => {
  if (!file || !docId) return '';
  const timestamp = Date.now();
  const path = `users/${docId}/payments/${feeKey}_screenshot_${timestamp}_${file.name}`;
  const fileRef = ref(storage, path);
  await uploadBytes(fileRef, file);
  return await getDownloadURL(fileRef);
};

  const [allUsers, setAllUsers] = useState([]);
  const [formData, setFormData] = useState({});
  const [docId, setDocId] = useState('');
  const [profilePic, setProfilePic] = useState(null);
const [services, setServices] = useState([{ name: '', description: '', image: null, percentage: '' }]);
const [products, setProducts] = useState([{ name: '', description: '', image: null, percentage: '' }]);

const [businessLogo, setBusinessLogo] = useState(null); 




const handleChange = (e) => {
  const { name, files } = e.target;

  if (name === 'Upload Photo') {
    setProfilePic(files[0]);
    setProfilePreview(URL.createObjectURL(files[0])); // preview
  } else if (name === 'BusinessLogo') {
    setBusinessLogo(files[0]);
    setBusinessLogoPreview(URL.createObjectURL(files[0])); // preview
  } else {
    const { value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }
};


  useEffect(() => {
    const fetchUsers = async () => {
      const snapshot = await getDocs(collection(db, 'userdetail_devb'));
      const users = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        users.push({
          name: (data['Name'] || '').trim(),
          id: docSnap.id,
          data,
        });
      });
      setAllUsers(users);
    };

    fetchUsers();
  }, []);

 
useEffect(() => {
  if (formData['ProfilePhotoURL']) setProfilePreview(formData['ProfilePhotoURL']);
  if (formData['BusinessLogo']) setBusinessLogoPreview(formData['BusinessLogo']);
  
  if (formData.services) {
    setServicePreviews(formData.services.map(s => s.imageURL || ''));
  }
  if (formData.products) {
    setProductPreviews(formData.products.map(p => p.imageURL || ''));
  }
}, [formData]);

  
  const handleMultiSelect = (name, value) => {
    const existing = formData[name] || [];
    if (existing.includes(value)) {
      setFormData((prev) => ({
        ...prev,
        [name]: existing.filter((v) => v !== value),
      }));
    } else if (name === 'Skills' && existing.length >= 4) {
      alert('You can select up to 4 skills');
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: [...existing, value],
      }));
    }
  };
const uploadProfilePhoto = async () => {
  if (!profilePic || !docId) return '';
  const fileRef = ref(storage, `profilePhotos/${docId}/${profilePic.name}`);
  await uploadBytes(fileRef, profilePic);
  Swal.fire({
    icon: 'success',
    title: 'Profile Photo Uploaded!',
    text: 'Your profile photo has been successfully uploaded.',
    timer: 2000,
    showConfirmButton: false
  });
  return await getDownloadURL(fileRef);
};

const uploadImage = async (file, path) => {
  const fileRef = ref(storage, path);
  await uploadBytes(fileRef, file);
  Swal.fire({
    icon: 'success',
    title: 'Image Uploaded!',
    text: 'Your image has been successfully uploaded.',
    timer: 2000,
    showConfirmButton: false
  });
  return await getDownloadURL(fileRef);
};


const handleDynamicChange = (type, index, field, value) => {
  const updater = type === 'service' ? [...services] : [...products];
  const previews = type === 'service' ? [...servicePreviews] : [...productPreviews];

  if (field === 'image') {
    updater[index][field] = value.target.files[0];
    previews[index] = URL.createObjectURL(value.target.files[0]);
    type === 'service' ? setServicePreviews(previews) : setProductPreviews(previews);
  } else {
    updater[index][field] = value;
  }
  type === 'service' ? setServices(updater) : setProducts(updater);
};


 const addField = (type) => {
  if (type === 'service') {
    const updater = [...services];
    updater.push({ name: '', description: '', image: null, percentage: '' }); // ✅ This line
    setServices(updater);
  } else if (type === 'product') {
    const updater = [...products];
    updater.push({ name: '', description: '', image: null, percentage: '' }); // ✅ This line
    setProducts(updater);
  }
};

const handleSubmit = async () => {
  try {
    const profileURL = await uploadProfilePhoto();

    let businessLogoURL = '';
    if (businessLogo && docId) {
      const logoRef = ref(storage, `businessLogos/${docId}/${businessLogo.name}`);
      await uploadBytes(logoRef, businessLogo);
      businessLogoURL = await getDownloadURL(logoRef);
      Swal.fire({
        icon: 'success',
        title: 'Business Logo Uploaded!',
        text: 'Your business logo has been successfully uploaded.',
        timer: 2000,
        showConfirmButton: false
      });
    }

    // First, filter services and products
    const filteredServices = services.filter(s => s.name.trim() && s.description.trim());
    const filteredProducts = products.filter(p => p.name.trim() && p.description.trim());

    // Upload service images
    const serviceData = await Promise.all(
      filteredServices.map(async (srv, i) => {
        const imgURL = srv.image
          ? await uploadImage(srv.image, `serviceImages/${docId}/service_${i}`)
          : '';
        return {
          name: srv.name,
          description: srv.description,
          keywords: srv.keywords || '',
          imageURL: imgURL,
          percentage: srv.percentage || '',
        };
      })
    );

    // Upload product images
    const productData = await Promise.all(
      filteredProducts.map(async (prd, i) => {
        const imgURL = prd.image
          ? await uploadImage(prd.image, `productImages/${docId}/product_${i}`)
          : '';
        return {
          name: prd.name,
          description: prd.description,
          keywords: prd.keywords || '',
          imageURL: imgURL,
          percentage: prd.percentage || '',
        };
      })
    );
// ✅ FIXED: Save both Orbiter & Cosmo payment separately
const paymentToSave = {
  orbiter: {
    feeType: payment.orbiter?.feeType || 'upfront',
    amount: 1000,
    status: payment.orbiter?.status || 'unpaid',
    paidDate: payment.orbiter?.paidDate || '',
    paymentMode: payment.orbiter?.paymentMode || '',
    paymentId: payment.orbiter?.paymentId || '',
    screenshotURL: payment.orbiter?.screenshotURL || ''
  },
  cosmo: {
    amount: 5000,
    status: payment.cosmo?.status || 'unpaid',
    paidDate: payment.cosmo?.paidDate || '',
    paymentMode: payment.cosmo?.paymentMode || '',
    paymentId: payment.cosmo?.paymentId || '',
    screenshotURL: payment.cosmo?.screenshotURL || ''
  }
};


// then include into updatedData
const updatedData = {
  ...formData,
  ...(profileURL && { 'ProfilePhotoURL': profileURL }),
  ...(businessLogoURL && { 'BusinessLogo': businessLogoURL }),
  ...(serviceData.length > 0 && { services: serviceData }),
  ...(productData.length > 0 && { products: productData }),
  ...(socialMediaLinks.length > 0 && { 
    'BusinessSocialMediaPages': socialMediaLinks
      .filter((s) => s.url && (s.platform || s.customPlatform))
      .map((s) => {
        const finalPlatform = s.platform === 'Other' ? (s.customPlatform || 'Other') : s.platform;
        return { platform: finalPlatform, url: s.url };
      })
  }),
  payment: paymentToSave
};

    // Now declare updatedData
   

    const userRef = doc(db, 'userdetail_dev', docId);
    await updateDoc(userRef, updatedData);

    alert('Profile updated successfully!');
  } catch (err) {
    console.error('Error updating profile:', err);
    alert('Failed to update profile');
  }
};

const handleBusinessApprove = async () => {
  try {
    const today = new Date();
    const startDate = today.toISOString().split('T')[0];

    const nextYear = new Date(today);
    nextYear.setFullYear(today.getFullYear() + 1);
    const nextRenewalDate = nextYear.toISOString().split('T')[0];

    const subscriptionData = {
      subscription: {
        startDate,
        nextRenewalDate,
        status: 'active'
      }
    };

    const userRef = doc(db, 'userdetail_dev', docId);
    await updateDoc(userRef, subscriptionData);

    Swal.fire({
      icon: "success",
      title: "Business Approved ✅",
      text: `Next Renewal: ${nextRenewalDate}`,
      timer: 2000,
      showConfirmButton: false
    });

    setFormData((prev) => ({
      ...prev,
      subscription: subscriptionData.subscription
    }));

  } catch (err) {
    console.error("Subscription update error:", err);
  }
};


const dropdowns = {
  Gender: ['Male', 'Female', 'Transgender', 'Prefer not to say'],
  'IDType': ['Aadhaar', 'PAN', 'Passport', 'Driving License'],
  'InterestArea': ['Business', 'Education', 'Wellness', 'Technology', 'Art', 'Environment', 'Other'],
  'Current Health Condition': ['Excellent', 'Good', 'Average', 'Needs Attention'],
  'MaritalStatus': ['Single', 'Married', 'Widowed', 'Divorced'],
  'EducationalBackground': ['SSC', 'HSC', 'Graduate', 'Post-Graduate', 'PhD', 'Other'],
  'ProfileStatus': ['Pending', 'In process', 'Submitted', 'Verified', 'Inactive'],
  'BusinessDetails (Nature & Type)': ['Product', 'Service', 'Both; Proprietorship', 'LLP', 'Pvt Ltd'],

  // ✅ New dropdowns
  'City': ['Mumbai', 'Pune', 'Delhi', 'Bengaluru', 'Hyderabad', 'Chennai', 'Kolkata', 'Ahmedabad', 'Other'],
  'State': ['Maharashtra', 'Karnataka', 'Delhi', 'Telangana', 'Tamil Nadu', 'West Bengal', 'Gujarat', 'Other']
};


  const skillsOptions = ['Leadership', 'Communication', 'Management', 'Design', 'Coding', 'Marketing'];
  const contributionOptions = ['Referrals', 'Volunteering', 'RHW Activities', 'Content Creation', 'Mentorship'];

const orbiterFields = [
  'IDType', 'ID Number', 'Upload Photo',
  'City', 'State', 'Location', // ✅ Added here
  'Hobbies', 'Interest Area', 'Skills', 'Exclusive Knowledge',
  'Aspirations', 'Health Parameters', 'Current Health Condition',
  'FamilyHistorySummary', 'Marital Status', 'Professional History',
  'CurrentProfession', 'Educational Background', 'Languages Known',
  'ContributionAreainUJustBe', 'Immediate Desire', 'Mastery',
  'SpecialSocialContribution', 'ProfileStatus',  'BusinessSocialMediaPages',  // 👈 add this line

];

const cosmorbiterFields = [
  ...orbiterFields,
  'BusinessName', 'BusinessDetails(Nature & Type)', 'BusinessHistory',
  'NoteworthyAchievements', 'ClienteleBase', 
  'Website', 'Locality', 'AreaofServices', 'USP', 'BusinessLogo',
  'TagLine',  
  'EstablishedAt'
];

const fieldGroups = {
  'Personal Info': [
    'IDType', 'IDNumber', 'UploadPhoto',
    'City', 'State', 'Location', 
    'Address(City, State)', 'MaritalStatus', 'LanguagesKnown'
  ],
  'Health': ['HealthParameters', 'CurrentHealthCondition', 'FamilyHistorySummary'],
  'Education': ['EducationalBackground', 'ProfessionalHistory', 'CurrentProfession'],
  'BusinessInfo': [
  'BusinessName',
  'BusinessDetails (Nature & Type)',
  'BusinessHistory',
  'NoteworthyAchievements',
  'ClienteleBase',
  'Website',
  'Locality',
  'AreaofServices',
  'USP',
  'BusinessLogo',
  'TagLine',

  'Tags',
  'EstablishedAt'
],

  'Additional Info': [
    'Hobbies', 'InterestArea', 'Skills', 'ExclusiveKnowledge', 'Aspirations',
    'ContributionAreainUJustBe', 'ImmediateDesire', 'Mastery',
    'SpecialSocialContribution', 'ProfileStatus' , 'BusinessSocialMediaPages',
  ],
};


  const getFields = () => {
    if (!formData?.Category) return [];
    return formData.Category.toLowerCase() === 'cosmorbiter'
      ? cosmorbiterFields
      : orbiterFields;
  };

  const renderInput = (field) => {
    if (field === 'Skills') {
      return (
        <div className="multi-select">
          {skillsOptions.map((skill) => (
            <label key={skill}>
              <input
                type="checkbox"
                checked={formData[field]?.includes(skill) || false}
                onChange={() => handleMultiSelect(field, skill)}
              />
              {skill}
            </label>
          ))}
        </div>
      );
    }
if (field === 'BusinessSocialMediaPages') {
  return (
    <div>
      <h4>Business Social Media Pages</h4>
      {socialMediaLinks.map((link, index) => (
        <div
          key={index}
          style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center' }}
        >
          <select
            value={link.platform}
            onChange={(e) => handleSocialMediaChange(index, 'platform', e.target.value)}
          >
            <option value="">Select Platform</option>
            {socialPlatforms.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
            {/* If the stored platform was custom and not in the list, allow showing it as selected */}
            {link.platform === 'Other' && link.customPlatform && (
              <option value="Other">Other ({link.customPlatform})</option>
            )}
          </select>

          {/* show custom input only when platform === 'Other' */}
          {link.platform === 'Other' && (
            <input
              type="text"
              placeholder="Enter Custom Platform"
              value={link.customPlatform || ''}
              onChange={(e) => handleSocialMediaChange(index, 'customPlatform', e.target.value)}
              style={{ flex: 1 }}
            />
          )}

          <input
            type="url"
            placeholder="Enter Page URL"
            value={link.url}
            onChange={(e) => handleSocialMediaChange(index, 'url', e.target.value)}
            style={{ flex: 1 }}
          />

          {socialMediaLinks.length > 1 && (
            <button
              type="button"
              onClick={() => removeSocialMediaField(index)}
              style={{ color: 'red', fontWeight: 'bold' }}
            >
              ✕
            </button>
          )}
        </div>
      ))}

      {socialMediaLinks.length < 6 && (
        <button type="button" onClick={addSocialMediaField} className="submitbtn">
          + Add
        </button>
      )}
    </div>
  );
}


    if (field === 'ContributionAreainUJustBe') {
      return (
        <div className="multi-select">
          {contributionOptions.map((item) => (
            <label key={item}>
              <input
                type="checkbox"
                checked={formData[field]?.includes(item) || false}
                onChange={() => handleMultiSelect(field, item)}
              />
              {item}
            </label>
          ))}
        </div>
      );
    }

    if (dropdowns[field]) {
      return (
        <select name={field} value={formData[field] || ''} onChange={handleChange}>
          <option value="">Select {field}</option>
          {dropdowns[field].map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      );
    }

  if (field.toLowerCase().includes('upload') || field.toLowerCase().includes('logo')) {
  const preview =
    field === 'Upload Photo' ? profilePreview :
    field === 'BusinessLogo' ? businessLogoPreview : '';
  
  return (
    <div>
      <label className="upload-label">
        Choose {field}
        <input
          type="file"
          name={field}
          onChange={handleChange}
          className="file-input-hidden"
          accept="image/*"
        />
      </label>
      {preview && (
        <img
          src={preview}
          alt={`${field} Preview`}
          style={{ width: '100px', marginTop: '10px', borderRadius: '5px' }}
        />
      )}
    </div>
  );
}



    return (
      <input
        type="text"
        name={field}
        value={formData[field] || ''}
        onChange={handleChange}
      />
    );
  };

  return (
 <section className="c-form box">
  <h2>Orbiter's Profile Setup</h2>
  <button className="m-button-5" onClick={() => window.history.back()}>Back</button>

  <ul>
    {formData && (
      <>
          
     
 
 <div className="step-progress-bar">
  {['Personal Info', 'Health', 'Education', 'Business Info', 'Additional Info','Payment'].map((tab, index) => (
    <div key={tab} className="step-container">
      <button
        className={`step ${activeTab === tab ? "active" : ""}`}
        onClick={() => setActiveTab(tab)}
      >
        <span className="step-number">{index + 1}</span>
      </button>
      <div className="step-title">{tab}</div>
    </div>
  ))}
</div>


        {/* --- PERSONAL INFO TAB --- */}
        {activeTab === 'Personal Info' && (
          <>
            <h3>Autofilled Info</h3>

            <li className="form-row">
              <h4>Name</h4>
              <div className="multipleitem">
                <input type="text" value={formData.Name || formData[' Name'] || ''} readOnly />
              </div>
            </li>

            <li className="form-row">
              <h4>Category</h4>
              <div className="multipleitem">
                <input type="text" value={formData.Category || ''} readOnly />
              </div>
            </li>

            <li className="form-row">
              <h4>Email</h4>
              <div className="multipleitem">
                <input type="text" value={formData.Email || ''} readOnly />
              </div>
            </li>

            <li className="form-row">
              <h4>Mobile</h4>
              <div className="multipleitem">
                <input type="text" value={formData['MobileNo'] || formData.Mobile || ''} readOnly />
              </div>
            </li>

           
          </>
        )}
{activeTab === 'Business Info' && formData?.Category?.toLowerCase() === 'cosmorbiter' && (
  <>
    <div >
      
 {/* --- SERVICES SECTION --- */}
<h3>Services (Max 5)</h3>
<div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
  {services.map((service, index) => (
    <div
      key={index}
      style={{
        border: '1px solid #ccc',
        padding: '15px',
        borderRadius: '8px',
        width: '100%',
        maxWidth: '500px',
        background: '#fafafa',
      }}
    >
      <h4>Service {index + 1}</h4>

      <div className="form-row">
        <h4>Service Name</h4>
        <input
          type="text"
          value={service.name}
          onChange={(e) =>
            handleDynamicChange('service', index, 'name', e.target.value)
          }
          className="multipleitem"
        />
      </div>

      <div className="form-row">
        <h4>Service Description</h4>
        <textarea
          value={service.description}
          onChange={(e) =>
            handleDynamicChange('service', index, 'description', e.target.value)
          }
          className="multipleitem"
        />
      </div>

      {/* Keywords Field */}
      <div className="form-row">
        <h4>Keywords <span style={{ fontWeight: 'normal' }}>(comma-separated)</span></h4>
        <input
          type="text"
          value={service.keywords || ''}
          onChange={(e) =>
            handleDynamicChange('service', index, 'keywords', e.target.value)
          }
          className="multipleitem"
          placeholder="e.g. vastu, residential, consultation"
        />
      </div>

      <div className="form-row">
        <h4>Agreed Percentage</h4>
        <input
          type="number"
          min="0"
          max="100"
          value={service.percentage || ''}
          onChange={(e) =>
            handleDynamicChange('service', index, 'percentage', e.target.value)
          }
          className="multipleitem"
          placeholder="Enter agreed %"
        />
      </div>

      <div className="form-row">
        <h4>Service Image (Optional)</h4>
        <input
          type="file"
          accept="image/*"
          onChange={(e) =>
            handleDynamicChange('service', index, 'image', e)
          }
          className="multipleitem"
        />
        {servicePreviews[index] && (
          <img
            src={servicePreviews[index]}
            alt={`Service ${index + 1} Preview`}
            style={{ width: '100px', marginTop: '10px' }}
          />
        )}
      </div>
    </div>
  ))}
</div>

{services.length < 5 && (
  <div style={{ marginTop: '10px' }}>
    <button type="button" className="submitbtn" onClick={() => addField('service')}>
      + Add Service
    </button>
  </div>
)}

{/* --- PRODUCTS SECTION --- */}
<h3 style={{ marginTop: '40px' }}>Products (Max 5)</h3>
<div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
  {products.map((product, index) => (
    <div
      key={index}
      style={{
        border: '1px solid #ccc',
        padding: '15px',
        borderRadius: '8px',
        width: '100%',
        maxWidth: '500px',
        background: '#fafafa',
      }}
    >
      <h4>Product {index + 1}</h4>

      <div className="form-row">
        <h4>Product Name</h4>
        <input
          type="text"
          value={product.name}
          onChange={(e) =>
            handleDynamicChange('product', index, 'name', e.target.value)
          }
          className="multipleitem"
        />
      </div>

      <div className="form-row">
        <h4>Product Description</h4>
        <textarea
          value={product.description}
          onChange={(e) =>
            handleDynamicChange('product', index, 'description', e.target.value)
          }
          className="multipleitem"
        />
      </div>

      {/* Keywords Field */}
      <div className="form-row">
        <h4>Keywords <span style={{ fontWeight: 'normal' }}>(comma-separated)</span></h4>
        <input
          type="text"
          value={product.keywords || ''}
          onChange={(e) =>
            handleDynamicChange('product', index, 'keywords', e.target.value)
          }
          className="multipleitem"
          placeholder="e.g. skincare, organic, beauty"
        />
      </div>

      <div className="form-row">
        <h4>Agreed Percentage</h4>
        <input
          type="number"
          min="0"
          max="100"
          value={product.percentage || ''}
          onChange={(e) =>
            handleDynamicChange('product', index, 'percentage', e.target.value)
          }
          className="multipleitem"
          placeholder="Enter agreed %"
        />
      </div>

      <div className="form-row">
        <h4>Product Image (Optional)</h4>
        <input
          type="file"
          accept="image/*"
          onChange={(e) =>
            handleDynamicChange('product', index, 'image', e)
          }
          className="multipleitem"
        />
        {productPreviews[index] && (
          <img
            src={productPreviews[index]}
            alt={`Product ${index + 1} Preview`}
            style={{ width: '100px', marginTop: '10px' }}
          />
        )}
      </div>
    </div>
  ))}
</div>

{products.length < 5 && (
  <div style={{ marginTop: '10px' }}>
    <button type="button" className="submitbtn" onClick={() => addField('product')}>
      + Add Product
    </button>
  </div>
)}
</div>
</>
)}
{activeTab === 'Payment' && (
  <div>
    <h3>Payment Tracking</h3>

    <div className="form-row">
      <h4>Category</h4>
      <div className="multipleitem">
        <input type="text" value={formData?.Category || ''} readOnly />
      </div>
    </div>

    {/* Orbiter fee section (always shown to Orbiter; shown to Cosmo too because they must pay orbiter as part of journey) */}
    <div style={{ border: '1px solid #ddd', padding: '12px', borderRadius: 8, marginBottom: 12 }}>
      <h4>Orbiter Fee (₹1000)</h4>

      <div className="form-row">
        <h4>Fee Type</h4>
        <div className="multipleitem">
          <select
            value={payment.orbiter.feeType || ''}
            onChange={(e) => {
              const ft = e.target.value;
              setPayment((p) => ({
                ...p,
                orbiter: {
                  ...p.orbiter,
                  feeType: ft,
                  amount: 1000,
                  status: ft === 'adjustment' ? 'adjusted' : (p.orbiter.status === 'adjusted' ? 'unpaid' : p.orbiter.status),
                  // clear payment details if switching to adjustment? keep them but validation will enforce
                }
              }));
            }}
          >
            <option value="">Select Fee Type</option>
            <option value="upfront">Upfront</option>
            <option value="adjustment">Adjustment</option>
          </select>
        </div>
      </div>

      {payment.orbiter.feeType === 'upfront' && (
        <>
          <div className="form-row">
            <h4>Paid?</h4>
            <div className="multipleitem">
              <label>
                <input
                  type="checkbox"
                  checked={payment.orbiter.status === 'paid'}
                  onChange={(e) =>
                    setPayment((p) => ({
                      ...p,
                      orbiter: {
                        ...p.orbiter,
                        status: e.target.checked ? 'paid' : 'unpaid',
                        paidDate: e.target.checked ? (p.orbiter.paidDate || new Date().toISOString().slice(0, 10)) : ''
                      }
                    }))
                  }
                />{' '}
                Paid
              </label>
            </div>
          </div>

          {payment.orbiter.status === 'paid' && (
            <>
              <div className="form-row">
                <h4>Paid Date</h4>
                <div className="multipleitem">
                  <input
                    type="date"
                    value={payment.orbiter.paidDate || ''}
                    onChange={(e) => setPayment((p) => ({ ...p, orbiter: { ...p.orbiter, paidDate: e.target.value } }))}
                  />
                </div>
              </div>

              <div className="form-row">
                <h4>Payment Mode</h4>
                <div className="multipleitem">
                  <select
                    value={payment.orbiter.paymentMode || ''}
                    onChange={(e) => setPayment((p) => ({ ...p, orbiter: { ...p.orbiter, paymentMode: e.target.value } }))}
                  >
                    <option value="">Select Mode</option>
                    {paymentModes.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <h4>Payment ID / Txn</h4>
                <div className="multipleitem">
                  <input
                    type="text"
                    value={payment.orbiter.paymentId || ''}
                    onChange={(e) => setPayment((p) => ({ ...p, orbiter: { ...p.orbiter, paymentId: e.target.value } }))}
                  />
                </div>
              </div>

              <div className="form-row">
                <h4>Payment Screenshot</h4>
                <div className="multipleitem">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handlePaymentScreenshotChange('orbiter', e.target.files[0])}
                  />
                  {payment.orbiter.screenshotPreview && (
                    <div style={{ marginTop: 8 }}>
                      <img src={payment.orbiter.screenshotPreview} alt="orbiter-screenshot" style={{ width: 120, borderRadius: 6 }} />
                      <div>
                        <button type="button" onClick={() => clearPaymentScreenshot('orbiter')}>Clear</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </>
      )}

      {payment.orbiter.feeType === 'adjustment' && (
        <div className="form-row">
          <h4>Adjustment</h4>
          <div className="multipleitem">
            <input type="text" value="Adjustment applied (₹1000)" readOnly />
          </div>
        </div>
      )}
    </div>

    {/* CosmOrbiter fee section: only relevant if Category === 'CosmOrbiter' */}
    {formData?.Category === 'CosmOrbiter' && (
      <div style={{ border: '1px solid #ddd', padding: '12px', borderRadius: 8 }}>
        <h4>CosmOrbiter Fee (₹5000)</h4>

        <div className="form-row">
          <h4>Paid?</h4>
          <div className="multipleitem">
            <label>
              <input
                type="checkbox"
                checked={payment.cosmo.status === 'paid'}
                onChange={(e) =>
                  setPayment((p) => ({
                    ...p,
                    cosmo: {
                      ...p.cosmo,
                      amount: 5000,
                      status: e.target.checked ? 'paid' : 'unpaid',
                      paidDate: e.target.checked ? (p.cosmo.paidDate || new Date().toISOString().slice(0, 10)) : ''
                    }
                  }))
                }
              />{' '}
              Paid
            </label>
          </div>
        </div>

        {payment.cosmo.status === 'paid' && (
          <>
            <div className="form-row">
              <h4>Paid Date</h4>
              <div className="multipleitem">
                <input
                  type="date"
                  value={payment.cosmo.paidDate || ''}
                  onChange={(e) => setPayment((p) => ({ ...p, cosmo: { ...p.cosmo, paidDate: e.target.value } }))}
                />
              </div>
            </div>

            <div className="form-row">
              <h4>Payment Mode</h4>
              <div className="multipleitem">
                <select
                  value={payment.cosmo.paymentMode || ''}
                  onChange={(e) => setPayment((p) => ({ ...p, cosmo: { ...p.cosmo, paymentMode: e.target.value } }))}
                >
                  <option value="">Select Mode</option>
                  {paymentModes.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>

            <div className="form-row">
              <h4>Payment ID / Txn</h4>
              <div className="multipleitem">
                <input
                  type="text"
                  value={payment.cosmo.paymentId || ''}
                  onChange={(e) => setPayment((p) => ({ ...p, cosmo: { ...p.cosmo, paymentId: e.target.value } }))}
                />
              </div>
            </div>

            <div className="form-row">
              <h4>Payment Screenshot</h4>
              <div className="multipleitem">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handlePaymentScreenshotChange('cosmo', e.target.files[0])}
                />
                {payment.cosmo.screenshotPreview && (
                  <div style={{ marginTop: 8 }}>
                    <img src={payment.cosmo.screenshotPreview} alt="cosmo-screenshot" style={{ width: 120, borderRadius: 6 }} />
                    <div>
                      <button type="button" onClick={() => clearPaymentScreenshot('cosmo')}>Clear</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
        {formData.Category === 'CosmOrbiter' &&
 payment.cosmo?.status === 'paid' && (
  <>
    {!formData.subscription?.startDate ? (
      <button
        onClick={handleBusinessApprove}
        className="approve-btn"
      >
        Approve Business
      </button>
    ) : (
      <p className="approved-status">
        ✅ Business Approved on {formData.subscription.startDate}<br/>
        🔄 Renew on {formData.subscription.nextRenewalDate}
      </p>
    )}
  </>
)}


      </div>
    )}
  </div>
)}
{activeTab === "Payment" && (
  <div className="payment-section">
    <h3>Payment Details</h3>

    

    {/* ✅ Adjustment Logs for Orbiter */}
    {formData.payment?.orbiter?.adjustmentLogs?.length > 0 && (
      <div className="adjustment-section" style={{ marginTop: "30px" }}>
        <h3>Adjustment Logs</h3>
        <table
          className="adjustment-table"
          border="1"
          cellPadding="8"
          style={{
            width: "100%",
            borderCollapse: "collapse",
            background: "#fff",
            borderRadius: "8px",
            overflow: "hidden",
          }}
        >
          <thead style={{ backgroundColor: "#f3f3f3" }}>
            <tr>
              <th>#</th>
              <th>Date</th>
              <th>Received Amount (₹)</th>
              <th>Remaining Amount (₹)</th>
              <th>Payment Mode</th>
              <th>Transaction Ref</th>
              <th>Referral ID</th>
            </tr>
          </thead>
          <tbody>
            {formData.payment.orbiter.adjustmentLogs.map((log, index) => (
              <tr key={index}>
                <td>{index + 1}</td>
                <td>{new Date(log.date).toLocaleString()}</td>
                <td>{log.receivedAmount || "-"}</td>
                <td>{log.remainingAmount || "-"}</td>
                <td>{log.paymentMode || "-"}</td>
                <td>{log.transactionRef || "-"}</td>
                <td>{log.referralId || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
)}



        {/* --- OTHER TABS: HEALTH, EDUCATION, ETC. --- */}
       {activeTab && (
  <>
    {activeTab !== 'Personal Info' && <h3>{activeTab}</h3>}
    {getFields()
      .filter((field) => fieldGroups[activeTab]?.includes(field))
      .map((field, i) => (
        <li className="form-row" key={i}>
          <h4>{field}</h4>
          <div className="multipleitem">{renderInput(field)}</div>
        </li>
      ))}
  </>
)}


        <button className="m-button-7" onClick={handleSubmit}>Submit</button>
      </>
    )}
  </ul>
</section>

  );
};

export default UserProfileForm;
