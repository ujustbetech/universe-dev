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
import { COLLECTIONS } from "/utility_collection";
import { db, storage } from '../firebaseConfig';
import { useSearchParams } from 'next/navigation'; 
import { encryptData, decryptData } from "../src/utils/encryption";
// ------------------------------------------------------------
// Helper: filename generator + base path + upload wrapper
// ------------------------------------------------------------
function generateFileName(ujbcode, category, description, file) {
  const date = new Date();
  const YYYY = date.getFullYear();
  const MM = String(date.getMonth() + 1).padStart(2, "0");
  const DD = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  const timestamp = `${YYYY}${MM}${DD}T${hh}${mm}${ss}`;
  const ext = (file?.name || '').split('.').pop();
  return `${ujbcode}_${timestamp}_${category}_${description}.${ext}`;
}

function getBasePath(ujbcode, mobile) {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `UserAssets/${year}/${month}/${ujbcode}-${mobile}`;
}

async function uploadWithMeta(file, fullPath) {
  const fileRef = ref(storage, fullPath);
  await uploadBytes(fileRef, file);
  const url = await getDownloadURL(fileRef);
  return {
    url,
    path: fullPath,
    fileName: fullPath.split('/').pop()
  };
}

// ------------------------------------------------------------
// Main component
// ------------------------------------------------------------
const UserProfileForm = () => {
  const searchParams = useSearchParams();
  const ujbcode = searchParams.get('user');
// Resident / Tax
const [residentStatus, setResidentStatus] = useState("");
const [taxSlab, setTaxSlab] = useState("");

  // form / UI state
  const [activeTab, setActiveTab] = useState('Personal Info');
  const [profilePreview, setProfilePreview] = useState('');
  const [businessLogoPreview, setBusinessLogoPreview] = useState('');
  const [servicePreviews, setServicePreviews] = useState([]);
  const [productPreviews, setProductPreviews] = useState([]);
// BUSINESS KYC
const [businessKYC, setBusinessKYC] = useState({
  gst: null,
  shopAct: null,
  businessPan: null,
  cheque: null,
  addressProof: null,
});
const [bankDetails, setBankDetails] = useState({
  accountHolderName: "",
  bankName: "",
  accountNumber: "",
  ifscCode: "",
});

const [businessKYCPreview, setBusinessKYCPreview] = useState({
  gst: "",
  shopAct: "",
  businessPan: "",
  cheque: "",
  addressProof: "",
});

  const emptyAgreedValue = () => ({
    mode: "single",
    single: { type: "", value: "" },
    multiple: {
      slabs: [],
      itemSlabs: []
    }
  });
const handleResidentStatusChange = (value) => {
  setResidentStatus(value);

  if (value === "Resident") {
    setTaxSlab("5%");
  } else if (value === "Non-Resident") {
    setTaxSlab("20%");
  } else {
    setTaxSlab("");
  }
};

  const [services, setServices] = useState([
    { name: '', description: '', image: null,  keywords: '', agreedValue: emptyAgreedValue() }
  ]);
  const [products, setProducts] = useState([
    { name: '', description: '', image: null, keywords: '', agreedValue: emptyAgreedValue() }
  ]);

  const [payment, setPayment] = useState({
    orbiter: {
      feeType: '',
      amount: 1000,
      status: 'unpaid',
      paidDate: '',
      paymentMode: '',
      paymentId: '',
      screenshotURL: '',
      screenshotFile: null,
      screenshotPreview: ''
    },
    cosmo: {
      amount: 5000,
      status: 'unpaid',
      paidDate: '',
      paymentMode: '',
      paymentId: '',
      screenshotURL: '',
      screenshotFile: null,
      screenshotPreview: ''
    }
  });
// PERSONAL KYC
const [personalKYC, setPersonalKYC] = useState({
  aadhaarFront: null,
  aadhaarBack: null,
  panCard: null,
  addressProof: null,
});

const [personalKYCPreview, setPersonalKYCPreview] = useState({
  aadhaarFront: "",
  aadhaarBack: "",
  panCard: "",
  addressProof: "",
});

  const paymentModes = ['UPI', 'Cash', 'Bank Transfer', 'Credit Card', 'Debit Card', 'NEFT/RTGS'];

  const [socialMediaLinks, setSocialMediaLinks] = useState([{ platform: '', url: '', customPlatform: '' }]);

  const [allUsers, setAllUsers] = useState([]);
  const [formData, setFormData] = useState({});
  const [docId, setDocId] = useState('');
  const [profilePic, setProfilePic] = useState(null);
  const [businessLogo, setBusinessLogo] = useState(null);

  // Social platforms
  const socialPlatforms = [
    'Facebook', 'Instagram', 'LinkedIn', 'YouTube', 'Twitter', 'Pinterest', 'Other'
  ];

  // --- Per-item agreedValue helpers ---
  const addSlabToItem = (type, index) => {
    const updater = type === 'service' ? [...services] : [...products];
    if (!updater[index]) return;
    const av = updater[index].agreedValue || emptyAgreedValue();
    av.multiple.slabs = av.multiple.slabs || [];
    av.multiple.slabs.push({ from: '', to: '', type: '', value: '', itemName: updater[index].name || '' });
    updater[index].agreedValue = av;
    type === 'service' ? setServices(updater) : setProducts(updater);
  };

  const removeSlabFromItem = (type, index, slabIndex) => {
    const updater = type === 'service' ? [...services] : [...products];
    if (!updater[index]) return;
    const av = updater[index].agreedValue || emptyAgreedValue();
    av.multiple.slabs = (av.multiple.slabs || []).filter((_, i) => i !== slabIndex);
    updater[index].agreedValue = av;
    type === 'service' ? setServices(updater) : setProducts(updater);
  };

  const updateItemSlab = (type, index, slabIndex, field, value) => {
    const updater = type === 'service' ? [...services] : [...products];
    if (!updater[index]) return;
    const av = updater[index].agreedValue || emptyAgreedValue();
    av.multiple.slabs = av.multiple.slabs || [];
    if (!av.multiple.slabs[slabIndex]) av.multiple.slabs[slabIndex] = { from: '', to: '', type: '', value: '', itemName: updater[index].name || '' };
    av.multiple.slabs[slabIndex][field] = value;
    updater[index].agreedValue = av;
    type === 'service' ? setServices(updater) : setProducts(updater);
  };

  const toggleModeForItem = (type, index, modeVal) => {
    const updater = type === 'service' ? [...services] : [...products];
    if (!updater[index]) return;
    const av = updater[index].agreedValue || emptyAgreedValue();
    av.mode = modeVal;
    updater[index].agreedValue = av;
    type === 'service' ? setServices(updater) : setProducts(updater);
  };
const handleBusinessKYCChange = (field, file) => {
  if (!file) return;

  setBusinessKYC(prev => ({ ...prev, [field]: file }));
  setBusinessKYCPreview(prev => ({ ...prev, [field]: URL.createObjectURL(file) }));
};

  const updateSingleForItem = (type, index, field, value) => {
    const updater = type === 'service' ? [...services] : [...products];
    if (!updater[index]) return;
    const av = updater[index].agreedValue || emptyAgreedValue();
    av.single[field] = value;
    updater[index].agreedValue = av;
    type === 'service' ? setServices(updater) : setProducts(updater);
  };

  // ---------- Single handleDynamicChange ----------
  const handleDynamicChange = (type, index, field, value) => {
    if (type !== 'service' && type !== 'product') return;
    const updater = type === 'service' ? [...services] : [...products];
    const previews = type === 'service' ? [...servicePreviews] : [...productPreviews];

    if (!updater[index]) {
      updater[index] = { name: '', description: '', image: null,  keywords: '', agreedValue: emptyAgreedValue() };
    }

    if (field === 'image') {
      const file = value.target.files[0];
      updater[index].image = file;
      previews[index] = file ? URL.createObjectURL(file) : '';
      if (type === 'service') setServicePreviews(previews);
      else setProductPreviews(previews);
    } else {
      updater[index][field] = value;
    }

    if (type === 'service') setServices(updater);
    else setProducts(updater);
  };

  // Social media handlers
  const handleSocialMediaChange = (index, key, value) => {
    setSocialMediaLinks((prev) => {
      const updated = [...prev];
      if (!updated[index]) updated[index] = { platform: '', url: '', customPlatform: '' };
      if (key === 'platform') {
        updated[index].platform = value;
        if (value !== 'Other') updated[index].customPlatform = '';
      } else {
        updated[index][key] = value;
      }
      return updated;
    });
  };

  const addSocialMediaField = () => setSocialMediaLinks((prev) => [...prev, { platform: '', url: '', customPlatform: '' }]);
  const removeSocialMediaField = (index) => setSocialMediaLinks((prev) => {
    const updated = [...prev];
    updated.splice(index, 1);
    return updated.length ? updated : [{ platform: '', url: '', customPlatform: '' }];
  });

  // Fetch user by UJBCode
  useEffect(() => {
    const fetchUserByPhone = async () => {
      try {
        if (!ujbcode) return;
        const q = query(collection(db, COLLECTIONS.userDetail), where('UJBCode', '==', ujbcode));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const userDoc = snapshot.docs[0];
          const userData = userDoc.data();
          setFormData(userData);
          setDocId(userDoc.id);
// -----------------------------------------
// LOAD PERSONAL KYC PREVIEW (on Refresh)
if (userData.residentStatus) {
  setResidentStatus(userData.residentStatus);
  setTaxSlab(userData.taxSlab || (userData.residentStatus === "Resident" ? "5%" : "20%"));
}

// -----------------------------------------
if (userData.personalKYC) {
  setPersonalKYCPreview({
    aadhaarFront: userData.personalKYC.aadhaarFront?.url || "",
    aadhaarBack: userData.personalKYC.aadhaarBack?.url || "",
    panCard: userData.personalKYC.panCard?.url || "",
    addressProof: userData.personalKYC.addressProof?.url || "",
  });
}

// -----------------------------------------
// LOAD BUSINESS KYC PREVIEW (on Refresh)
// -----------------------------------------
if (userData.businessKYC) {
  setBusinessKYCPreview({
    gst: userData.businessKYC.gst?.url || "",
    shopAct: userData.businessKYC.shopAct?.url || "",
    businessPan: userData.businessKYC.businessPan?.url || "",
    cheque: userData.businessKYC.cheque?.url || "",
    addressProof: userData.businessKYC.addressProof?.url || "",
  });
}
// -----------------------------------------
// LOAD PERSONAL KYC PREVIEW (on Refresh)
// -----------------------------------------
if (userData.personalKYC) {
  setPersonalKYCPreview({
    aadhaarFront: userData.personalKYC.aadhaarFront?.url || "",
    aadhaarBack: userData.personalKYC.aadhaarBack?.url || "",
    panCard: userData.personalKYC.panCard?.url || "",
    addressProof: userData.personalKYC.addressProof?.url || "",
  });
}
if (userData.bankDetails) {
  setBankDetails({
    accountHolderName: decryptData(userData.bankDetails.accountHolderName),
    bankName: decryptData(userData.bankDetails.bankName),
    accountNumber: decryptData(userData.bankDetails.accountNumber),
    ifscCode: decryptData(userData.bankDetails.ifscCode),
  });
}

// -----------------------------------------
// LOAD BUSINESS KYC PREVIEW (on Refresh)
// -----------------------------------------
if (userData.businessKYC) {
  setBusinessKYCPreview({
    gst: userData.businessKYC.gst?.url || "",
    shopAct: userData.businessKYC.shopAct?.url || "",
    businessPan: userData.businessKYC.businessPan?.url || "",
    cheque: userData.businessKYC.cheque?.url || "",
    addressProof: userData.businessKYC.addressProof?.url || "",
  });
}

          if (userData['ProfilePhotoURL']) setProfilePreview(userData['ProfilePhotoURL']);
          if (userData['BusinessLogo']) setBusinessLogoPreview(userData['BusinessLogo']);

          if (userData.services?.length > 0) {
            setServices(userData.services.map(s => ({
              name: s.name || '',
              description: s.description || '',
              keywords: s.keywords || '',
                imageURL: s.imageURL || "", // KEEP OLD IMAGE HERE
              agreedValue: s.agreedValue || emptyAgreedValue()
            })));
          }

          if (userData.products?.length > 0) {
            setProducts(userData.products.map(p => ({
              name: p.name || '',
              description: p.description || '',
              keywords: p.keywords || '',
             
    imageURL: p.imageURL || "", // KEEP OLD IMAGE
              agreedValue: p.agreedValue || emptyAgreedValue()
            })));
          }

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

          const pages = Array.isArray(userData.BusinessSocialMediaPages) ? userData.BusinessSocialMediaPages : [];
          setSocialMediaLinks(pages.length ? pages.map((s) => ({ platform: s.platform || "", url: s.url || "", customPlatform: "" })) : [{ platform: '', url: '', customPlatform: '' }]);
        }
      } catch (err) {
        console.error("Error fetching user:", err);
      }
    };
    fetchUserByPhone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ujbcode]);

  const handlePaymentScreenshotChange = (feeKey, file) => {
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setPayment((p) => ({ ...p, [feeKey]: { ...p[feeKey], screenshotFile: file, screenshotPreview: preview } }));
  };

  const clearPaymentScreenshot = (feeKey) => {
    setPayment((p) => ({ ...p, [feeKey]: { ...p[feeKey], screenshotFile: null, screenshotPreview: p[feeKey].screenshotURL || '' } }));
  };

  const uploadPaymentScreenshot = async (file, feeKey) => {
    if (!file || !docId) return '';
    const timestamp = Date.now();
    const path = `users/${docId}/payments/${feeKey}_screenshot_${timestamp}_${file.name}`;
    const fileRef = ref(storage, path);
    await uploadBytes(fileRef, file);
    return await getDownloadURL(fileRef);
  };

  const handleChange = (e) => {
    const { name, files } = e.target;
    if (name === 'Upload Photo') {
      setProfilePic(files[0]);
      setProfilePreview(URL.createObjectURL(files[0]));
    } else if (name === 'BusinessLogo') {
      setBusinessLogo(files[0]);
      setBusinessLogoPreview(URL.createObjectURL(files[0]));
    } else {
      const { value } = e.target;
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  useEffect(() => {
    const fetchUsers = async () => {
      const snapshot = await getDocs(collection(db, COLLECTIONS.userDetail));
      const users = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        users.push({ name: (data['Name'] || '').trim(), id: docSnap.id, data });
      });
      setAllUsers(users);
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    if (formData['ProfilePhotoURL']) setProfilePreview(formData['ProfilePhotoURL']);
    if (formData['BusinessLogo']) setBusinessLogoPreview(formData['BusinessLogo']);
    if (Array.isArray(formData.services)) {
      setServicePreviews(formData.services.map(s => (s && typeof s === "object" ? s.imageURL || "" : "")));
    }
    if (Array.isArray(formData.products)) {
      setProductPreviews(formData.products.map(p => (p && typeof p === "object" ? p.imageURL || "" : "")));
    }
  }, [formData]);

  const uploadProfilePhoto = async () => {
    if (!profilePic || !docId || !ujbcode) return '';
    // use new naming + base path
    const mobile = formData?.MobileNo || formData?.Mobile || 'nomobile';
    const base = getBasePath(ujbcode, mobile);
    const fileName = generateFileName(ujbcode, 'profile', 'profilephoto', profilePic);
    const fullPath = `${base}/profile/${fileName}`;
    const meta = await uploadWithMeta(profilePic, fullPath);
    Swal.fire({ icon: 'success', title: 'Profile Photo Uploaded!', timer: 1500, showConfirmButton: false });
    return meta.url;
  };

  const uploadImage = async (file, relativePath) => {
    if (!file || !docId || !ujbcode) return '';
    const mobile = formData?.MobileNo || formData?.Mobile || 'nomobile';
    const base = getBasePath(ujbcode, mobile);
    const fileName = generateFileName(ujbcode, relativePath.replace(/\//g, '_'), 'img', file);
    const fullPath = `${base}/${relativePath}/${fileName}`;
    const meta = await uploadWithMeta(file, fullPath);
    Swal.fire({ icon: 'success', title: 'Image Uploaded!', timer: 1200, showConfirmButton: false });
    return meta.url;
  };

  const addField = (type) => {
    if (type === 'service') {
      setServices(prev => [...prev, { name: '', description: '', image: null,  keywords: '', agreedValue: emptyAgreedValue() }]);
    } else {
      setProducts(prev => [...prev, { name: '', description: '', image: null, keywords: '', agreedValue: emptyAgreedValue() }]);
    }
  };
const handlePersonalKYCChange = (field, file) => {
  if (!file) return;

  setPersonalKYC(prev => ({ ...prev, [field]: file }));
  setPersonalKYCPreview(prev => ({ ...prev, [field]: URL.createObjectURL(file) }));
};

  const handleMultiSelect = (name, value) => {
    const existing = formData[name] || [];
    if (existing.includes(value)) {
      setFormData((prev) => ({ ...prev, [name]: existing.filter((v) => v !== value) }));
    } else if (name === 'Skills' && existing.length >= 4) {
      alert('You can select up to 4 skills');
    } else {
      setFormData((prev) => ({ ...prev, [name]: [...existing, value] }));
    }
  };

  // ---------- THE getFields function (fixed & in scope) ----------
  const orbiterFields = [
    'IDType', 'IDNumber', 'Upload Photo',
    'City', 'State', 'Location',
    'Hobbies', 'InterestArea', 'Skills', 'Exclusive Knowledge',
    'Aspirations', 'Health Parameters', 'CurrentHealthCondition',
    'FamilyHistorySummary', 'MaritalStatus', 'ProfessionalHistory',
    'CurrentProfession', 'EducationalBackground', 'LanguagesKnown',
    'ContributionAreainUJustBe', 'ImmediateDesire', 'Mastery',
    'SpecialSocialContribution', 'ProfileStatus',  'BusinessSocialMediaPages',
  ];

  const cosmorbiterFields = [
    ...orbiterFields,
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
    'EstablishedAt'
  ];

  const fieldGroups = {
    'Personal Info': [
      'IDType', 'IDNumber', 'Upload Photo','Upload Photo',
  'PersonalKYC',
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
    return (formData.Category || '').toLowerCase() === 'cosmorbiter'
      ? cosmorbiterFields
      : orbiterFields;
  };

  // dropdowns & options (kept exactly from original)
  const dropdowns = {
    Gender: ['Male', 'Female', 'Transgender', 'Prefer not to say'],
    'IDType': ['Aadhaar', 'PAN', 'Passport', 'Driving License'],
    'InterestArea': ['Business', 'Education', 'Wellness', 'Technology', 'Art', 'Environment', 'Other'],
    'CurrentHealthCondition': ['Excellent', 'Good', 'Average', 'Needs Attention'],
    'MaritalStatus': ['Single', 'Married', 'Widowed', 'Divorced'],
    'EducationalBackground': ['SSC', 'HSC', 'Graduate', 'Post-Graduate', 'PhD', 'Other'],
    'ProfileStatus': ['Pending', 'In process', 'Submitted', 'Verified', 'Inactive'],
    'BusinessDetails (Nature & Type)': ['Product', 'Service', 'Both; Proprietorship', 'LLP', 'Pvt Ltd'],
    'City': ['Mumbai', 'Pune', 'Delhi', 'Bengaluru', 'Hyderabad', 'Chennai', 'Kolkata', 'Ahmedabad', 'Other'],
    'State': ['Maharashtra', 'Karnataka', 'Delhi', 'Telangana', 'Tamil Nadu', 'West Bengal', 'Gujarat', 'Other']
  };

  const skillsOptions = ['Leadership', 'Communication', 'Management', 'Design', 'Coding', 'Marketing'];
  const contributionOptions = ['Referrals', 'Volunteering', 'RHW Activities', 'Content Creation', 'Mentorship'];

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
            <div key={index} style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center' }}>
              <select value={link.platform} onChange={(e) => handleSocialMediaChange(index, 'platform', e.target.value)}>
                <option value="">Select Platform</option>
                {socialPlatforms.map((p) => <option key={p} value={p}>{p}</option>)}
                {link.platform === 'Other' && link.customPlatform && (<option value="Other">Other ({link.customPlatform})</option>)}
              </select>

              {link.platform === 'Other' && (
                <input type="text" placeholder="Enter Custom Platform" value={link.customPlatform || ''} onChange={(e) => handleSocialMediaChange(index, 'customPlatform', e.target.value)} style={{ flex: 1 }} />
              )}

              <input type="url" placeholder="Enter Page URL" value={link.url} onChange={(e) => handleSocialMediaChange(index, 'url', e.target.value)} style={{ flex: 1 }} />

              {socialMediaLinks.length > 1 && <button type="button" onClick={() => removeSocialMediaField(index)} style={{ color: 'red', fontWeight: 'bold' }}>✕</button>}
            </div>
          ))}

          {socialMediaLinks.length < 6 && <button type="button" onClick={addSocialMediaField} className="submitbtn">+ Add</button>}
        </div>
      );
    }

    if (field === 'ContributionAreainUJustBe') {
      return (
        <div className="multi-select">
          {contributionOptions.map((item) => (
            <label key={item}>
              <input type="checkbox" checked={formData[field]?.includes(item) || false} onChange={() => handleMultiSelect(field, item)} />
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
          {dropdowns[field].map((opt) => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      );
    }

    if (field.toLowerCase().includes('upload') || field.toLowerCase().includes('logo')) {
      const preview = field === 'Upload Photo' ? profilePreview : (field === 'BusinessLogo' ? businessLogoPreview : '');
      return (
        <div>
          <label className="upload-label">Choose {field}
            <input type="file" name={field} onChange={handleChange} className="file-input-hidden" accept="image/*" />
          </label>
          {preview && <img src={preview} alt={`${field} Preview`} style={{ width: '100px', marginTop: '10px', borderRadius: '5px' }} />}
        </div>
      );
    }

    return <input type="text" name={field} value={formData[field] || ''} onChange={handleChange} />;
  };

  // Submit handler (uploads images using new naming & saves final doc)
const handleSubmit = async () => {
  try {
    const mobile = formData?.MobileNo || formData?.Mobile || "nomobile";
    const basePath = getBasePath(ujbcode, mobile);

    // -----------------------------------------
    // PROFILE PHOTO
    // -----------------------------------------
    let profileURL = formData.ProfilePhotoURL || "";
    if (profilePic) {
      profileURL = await uploadProfilePhoto();
    }

    // -----------------------------------------
    // PERSONAL KYC (KEEP OLD IF NOT UPDATED)
    // -----------------------------------------
    const personalKycData = {
      aadhaarFront: formData.personalKYC?.aadhaarFront || null,
      aadhaarBack: formData.personalKYC?.aadhaarBack || null,
      panCard: formData.personalKYC?.panCard || null,
      addressProof: formData.personalKYC?.addressProof || null,
    };

    if (personalKYC.aadhaarFront) {
      const fileName = generateFileName(ujbcode, "kyc", "aadhaar_front", personalKYC.aadhaarFront);
      personalKycData.aadhaarFront = await uploadWithMeta(
        personalKYC.aadhaarFront,
        `${basePath}/PersonalKYC/${fileName}`
      );
    }

    if (personalKYC.aadhaarBack) {
      const fileName = generateFileName(ujbcode, "kyc", "aadhaar_back", personalKYC.aadhaarBack);
      personalKycData.aadhaarBack = await uploadWithMeta(
        personalKYC.aadhaarBack,
        `${basePath}/PersonalKYC/${fileName}`
      );
    }

    if (personalKYC.panCard) {
      const fileName = generateFileName(ujbcode, "kyc", "pan", personalKYC.panCard);
      personalKycData.panCard = await uploadWithMeta(
        personalKYC.panCard,
        `${basePath}/PersonalKYC/${fileName}`
      );
    }

    if (personalKYC.addressProof) {
      const fileName = generateFileName(ujbcode, "kyc", "address_proof", personalKYC.addressProof);
      personalKycData.addressProof = await uploadWithMeta(
        personalKYC.addressProof,
        `${basePath}/PersonalKYC/${fileName}`
      );
    }

    // -----------------------------------------
    // BUSINESS KYC (KEEP OLD IF NOT UPDATED)
    // -----------------------------------------
    const businessKycData = {
      gst: formData.businessKYC?.gst || null,
      shopAct: formData.businessKYC?.shopAct || null,
      businessPan: formData.businessKYC?.businessPan || null,
      cheque: formData.businessKYC?.cheque || null,
      addressProof: formData.businessKYC?.addressProof || null,
    };

    if (businessKYC.gst) {
      const fileName = generateFileName(ujbcode, "businessKYC", "gst", businessKYC.gst);
      businessKycData.gst = await uploadWithMeta(
        businessKYC.gst,
        `${basePath}/BusinessKYC/${fileName}`
      );
    }

    if (businessKYC.shopAct) {
      const fileName = generateFileName(ujbcode, "businessKYC", "shop_act", businessKYC.shopAct);
      businessKycData.shopAct = await uploadWithMeta(
        businessKYC.shopAct,
        `${basePath}/BusinessKYC/${fileName}`
      );
    }

    if (businessKYC.businessPan) {
      const fileName = generateFileName(ujbcode, "businessKYC", "pan", businessKYC.businessPan);
      businessKycData.businessPan = await uploadWithMeta(
        businessKYC.businessPan,
        `${basePath}/BusinessKYC/${fileName}`
      );
    }

    if (businessKYC.cheque) {
      const fileName = generateFileName(ujbcode, "businessKYC", "cheque", businessKYC.cheque);
      businessKycData.cheque = await uploadWithMeta(
        businessKYC.cheque,
        `${basePath}/BusinessKYC/${fileName}`
      );
    }

    if (businessKYC.addressProof) {
      const fileName = generateFileName(ujbcode, "businessKYC", "address_proof", businessKYC.addressProof);
      businessKycData.addressProof = await uploadWithMeta(
        businessKYC.addressProof,
        `${basePath}/BusinessKYC/${fileName}`
      );
    }

    // -----------------------------------------
    // BUSINESS LOGO (KEEP OLD IF NOT UPDATED)
    // -----------------------------------------
    let businessLogoURL = formData.BusinessLogo || "";
    if (businessLogo) {
      const logoFileName = generateFileName(ujbcode, "businessLogo", "logo", businessLogo);
      const meta = await uploadWithMeta(
        businessLogo,
        `${basePath}/BusinessLogo/${logoFileName}`
      );
      businessLogoURL = meta.url;
    }

    // -----------------------------------------
    // SERVICES - CLEAN DATA (NO FILE OBJECTS)
    // -----------------------------------------
    const finalServices = await Promise.all(
      services
        .filter(s => s.name.trim() && s.description.trim())
        .map(async (srv, i) => {
          let imageURL = srv.imageURL || "";
          if (srv.image) {
            imageURL = await uploadImage(srv.image, `services/service_${i}`);
          }
          return {
            name: srv.name,
            description: srv.description,
            keywords: srv.keywords || "",
            
            imageURL,
            agreedValue: srv.agreedValue,
          };
        })
    );

    // -----------------------------------------
    // PRODUCTS - CLEAN DATA (NO FILE OBJECTS)
    // -----------------------------------------
    const finalProducts = await Promise.all(
      products
        .filter(p => p.name.trim() && p.description.trim())
        .map(async (prd, i) => {
          let imageURL = prd.imageURL || "";
          if (prd.image) {
            imageURL = await uploadImage(prd.image, `products/product_${i}`);
          }
          return {
            name: prd.name,
            description: prd.description,
            keywords: prd.keywords || "",
         
            imageURL,
            agreedValue: prd.agreedValue,
          };
        })
    );
const encryptedBankDetails = {
  accountHolderName: encryptData(bankDetails.accountHolderName),
  bankName: encryptData(bankDetails.bankName),
  accountNumber: encryptData(bankDetails.accountNumber),
  ifscCode: encryptData(bankDetails.ifscCode),
};

    // -----------------------------------------
    // FINAL DATA (CLEAN + SAFE FOR FIRESTORE)
    // -----------------------------------------
  const finalData = {
  ...formData,

  residentStatus,
  taxSlab,

  ProfilePhotoURL: profileURL,
  BusinessLogo: businessLogoURL,

  personalKYC: personalKycData,
  businessKYC: businessKycData,

  bankDetails: encryptedBankDetails, // 🔐 ENCRYPTED

  services: finalServices,
  products: finalProducts,

  BusinessSocialMediaPages: socialMediaLinks.filter(
    s => s.url && (s.platform || s.customPlatform)
  ),

  payment,
};


    const userRef = doc(db, COLLECTIONS.userDetail, docId);
    await updateDoc(userRef, finalData);

    Swal.fire({
      icon: "success",
      title: "Profile updated successfully!",
      timer: 1500,
      showConfirmButton: false,
    });

  } catch (err) {
    console.error("Error updating profile:", err);
    Swal.fire({ icon: "error", title: "Failed to update profile" });
  }
};





  const handleBusinessApprove = async () => {
    try {
      const today = new Date();
      const startDate = today.toISOString().split('T')[0];
      const nextYear = new Date(today);
      nextYear.setFullYear(today.getFullYear() + 1);
      const nextRenewalDate = nextYear.toISOString().split('T')[0];
      const subscriptionData = { subscription: { startDate, nextRenewalDate, status: 'active' } };
      const userRef = doc(db, COLLECTIONS.userDetail, docId);
      await updateDoc(userRef, subscriptionData);
      Swal.fire({ icon: "success", title: "Business Approved ✅", text: `Next Renewal: ${nextRenewalDate}`, timer: 2000, showConfirmButton: false });
      setFormData((prev) => ({ ...prev, subscription: subscriptionData.subscription }));
    } catch (err) {
      console.error("Subscription update error:", err);
    }
  };

  // ----------------- Render -----------------
  return (
    <section className="c-form box">
      <h2>Orbiter's Profile Setup</h2>
      <button className="m-button-5" onClick={() => window.history.back()}>Back</button>

      <ul>
        {formData && (
          <>
            <div className="step-progress-bar">
              {['Personal Info', 'Health', 'Education', 'BusinessInfo', 'Additional Info','Payment'].map((tab, index) => (
                <div key={tab} className="step-container">
                  <button className={`step ${activeTab === tab ? "active" : ""}`} onClick={() => setActiveTab(tab)}>
                    <span className="step-number">{index + 1}</span>
                  </button>
                  <div className="step-title">{tab}</div>
                </div>
              ))}
            </div>

            {activeTab === 'Personal Info' && (
              <>
              <li className="form-row"><h4>Name</h4><div className="multipleitem"><input type="text" value={formData.Name || formData[' Name'] || ''} readOnly /></div></li>
                <li className="form-row"><h4>Category</h4><div className="multipleitem"><select name="Category" value={formData.Category || ''} onChange={handleChange} required><option value="">Select Category</option><option value="Orbiter">Orbiter</option><option value="CosmOrbiter">CosmOrbiter</option></select></div></li>
                <li className="form-row"><h4>Email</h4><div className="multipleitem"><input type="text" value={formData.Email || ''} readOnly /></div></li>
                <li className="form-row"><h4>Mobile</h4><div className="multipleitem"><input type="text" value={formData['MobileNo'] || formData.Mobile || ''} readOnly /></div></li>
                <li className="form-row">
  <h4>Resident Status</h4>
  <div className="multipleitem">
    <select
      value={residentStatus}
      onChange={(e) => handleResidentStatusChange(e.target.value)}
    >
      <option value="">Select Status</option>
      <option value="Resident">Resident</option>
      <option value="Non-Resident">Non-Resident</option>
    </select>
  </div>
</li>

<li className="form-row">
  <h4>Applicable Tax Slab</h4>
  <div className="multipleitem">
    <input
      type="text"
      value={taxSlab}
      readOnly
    />
  </div>
</li>

   <h3 style={{ marginTop: "25px" }}>KYC Details</h3>

{/* Aadhaar Front */}
<li className="form-row">
  <h4>Aadhaar Front</h4>
  <div>
    <label className="upload-label">
      Choose Aadhaar Front
      <input
        type="file"
        accept="image/*"
        className="file-input-hidden"
        onChange={(e) =>
          handlePersonalKYCChange("aadhaarFront", e.target.files[0])
        }
      />
    </label>

    {personalKYCPreview.aadhaarFront && (
      <img
        src={personalKYCPreview.aadhaarFront}
        style={{ width: "100px", marginTop: "10px", borderRadius: "8px" }}
      />
    )}
  </div>
</li>

{/* Aadhaar Back */}
<li className="form-row">
  <h4>Aadhaar Back</h4>
  <div>
    <label className="upload-label">
      Choose Aadhaar Back
      <input
        type="file"
        accept="image/*"
        className="file-input-hidden"
        onChange={(e) =>
          handlePersonalKYCChange("aadhaarBack", e.target.files[0])
        }
      />
    </label>

    {personalKYCPreview.aadhaarBack && (
      <img
        src={personalKYCPreview.aadhaarBack}
        style={{ width: "100px", marginTop: "10px", borderRadius: "8px" }}
      />
    )}
  </div>
</li>

{/* PAN Card */}
<li className="form-row">
  <h4>PAN Card</h4>
  <div>
    <label className="upload-label">
      Choose PAN Card
      <input
        type="file"
        accept="image/*"
        className="file-input-hidden"
        onChange={(e) =>
          handlePersonalKYCChange("panCard", e.target.files[0])
        }
      />
    </label>

    {personalKYCPreview.panCard && (
      <img
        src={personalKYCPreview.panCard}
        style={{ width: "100px", marginTop: "10px", borderRadius: "8px" }}
      />
    )}
  </div>
</li>

{/* Address Proof */}
<li className="form-row">
  <h4>Address Proof</h4>
  <div>
    <label className="upload-label">
      Choose Address Proof
      <input
        type="file"
        accept="image/*"
        className="file-input-hidden"
        onChange={(e) =>
          handlePersonalKYCChange("addressProof", e.target.files[0])
        }
      />
    </label>

    {personalKYCPreview.addressProof && (
      <img
        src={personalKYCPreview.addressProof}
        style={{ width: "100px", marginTop: "10px", borderRadius: "8px" }}
      />
    )}
  </div>
</li>

<h3 style={{ marginTop: "25px" }}>Bank Details</h3>

<li className="form-row">
  <h4>Account Holder Name</h4>
  <input
    type="text"
    value={bankDetails.accountHolderName}
    onChange={(e) =>
      setBankDetails({ ...bankDetails, accountHolderName: e.target.value })
    }
  />
</li>

<li className="form-row">
  <h4>Bank Name</h4>
  <input
    type="text"
    value={bankDetails.bankName}
    onChange={(e) =>
      setBankDetails({ ...bankDetails, bankName: e.target.value })
    }
  />
</li>

<li className="form-row">
  <h4>Account Number</h4>
  <input
    type="password"
    value={bankDetails.accountNumber}
    onChange={(e) =>
      setBankDetails({ ...bankDetails, accountNumber: e.target.value })
    }
  />
</li>

<li className="form-row">
  <h4>IFSC Code</h4>
  <input
    type="text"
    value={bankDetails.ifscCode}
    onChange={(e) =>
      setBankDetails({ ...bankDetails, ifscCode: e.target.value.toUpperCase() })
    }
  />
</li>


                
              </>
            )}

            {activeTab === 'BusinessInfo' && formData?.Category?.toLowerCase() === 'cosmorbiter' && (
              <>
   <>
  <h3 style={{ marginTop: "25px" }}>Business KYC Documents</h3>

  {/* GST Certificate */}
  <li className="form-row">
    <h4>GST Certificate</h4>
    <div>
      <label className="upload-label">
        Choose GST Certificate
        <input
          type="file"
          accept="image/*,.pdf"
          className="file-input-hidden"
          onChange={(e) => handleBusinessKYCChange("gst", e.target.files[0])}
        />
      </label>

      {businessKYCPreview.gst && (
        <img
          src={businessKYCPreview.gst}
          alt="GST Preview"
          style={{ width: "100px", marginTop: "10px", borderRadius: "8px" }}
        />
      )}
    </div>
  </li>

  {/* Shop Act / Business License */}
  <li className="form-row">
    <h4>Shop Act / Business License</h4>
    <div>
      <label className="upload-label">
        Choose Shop Act / License
        <input
          type="file"
          accept="image/*,.pdf"
          className="file-input-hidden"
          onChange={(e) => handleBusinessKYCChange("shopAct", e.target.files[0])}
        />
      </label>

      {businessKYCPreview.shopAct && (
        <img
          src={businessKYCPreview.shopAct}
          alt="Shop Act Preview"
          style={{ width: "100px", marginTop: "10px", borderRadius: "8px" }}
        />
      )}
    </div>
  </li>

  {/* Business PAN */}
  <li className="form-row">
    <h4>Business PAN Card</h4>
    <div>
      <label className="upload-label">
        Choose Business PAN
        <input
          type="file"
          accept="image/*,.pdf"
          className="file-input-hidden"
          onChange={(e) => handleBusinessKYCChange("businessPan", e.target.files[0])}
        />
      </label>

      {businessKYCPreview.businessPan && (
        <img
          src={businessKYCPreview.businessPan}
          alt="Business PAN Preview"
          style={{ width: "100px", marginTop: "10px", borderRadius: "8px" }}
        />
      )}
    </div>
  </li>

  {/* Cancelled Cheque */}
  <li className="form-row">
    <h4>Cancelled Cheque</h4>
    <div>
      <label className="upload-label">
        Choose Cancelled Cheque
        <input
          type="file"
          accept="image/*,.pdf"
          className="file-input-hidden"
          onChange={(e) => handleBusinessKYCChange("cheque", e.target.files[0])}
        />
      </label>

      {businessKYCPreview.cheque && (
        <img
          src={businessKYCPreview.cheque}
          alt="Cheque Preview"
          style={{ width: "100px", marginTop: "10px", borderRadius: "8px" }}
        />
      )}
    </div>
  </li>

  {/* Business Address Proof */}
  <li className="form-row">
    <h4>Business Address Proof</h4>
    <div>
      <label className="upload-label">
        Choose Business Address Proof
        <input
          type="file"
          accept="image/*,.pdf"
          className="file-input-hidden"
          onChange={(e) => handleBusinessKYCChange("addressProof", e.target.files[0])}
        />
      </label>

      {businessKYCPreview.addressProof && (
        <img
          src={businessKYCPreview.addressProof}
          alt="Address Proof Preview"
          style={{ width: "100px", marginTop: "10px", borderRadius: "8px" }}
        />
      )}
    </div>
  </li>
</>


                <div>
                  <h3>Services (Max 5)</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                    {services.map((service, index) => (
                      <div key={index} style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '8px', width: '100%', maxWidth: '500px', background: '#fafafa' }}>
                        <h4>Service {index + 1}</h4>
                        <div className="form-row"><h4>Service Name</h4><input type="text" value={service.name} onChange={(e) => handleDynamicChange('service', index, 'name', e.target.value)} className="multipleitem" /></div>
                        <div className="form-row"><h4>Service Description</h4><textarea value={service.description} onChange={(e) => handleDynamicChange('service', index, 'description', e.target.value)} className="multipleitem" /></div>
                        <div className="form-row"><h4>Keywords <span style={{ fontWeight: 'normal' }}>(comma-separated)</span></h4><input type="text" value={service.keywords || ''} onChange={(e) => handleDynamicChange('service', index, 'keywords', e.target.value)} className="multipleitem" placeholder="e.g. vastu, residential, consultation" /></div>
                     
                        <div className="form-row"><h4>Service Image (Optional)</h4><input type="file" accept="image/*" onChange={(e) => handleDynamicChange('service', index, 'image', e)} className="multipleitem" />{servicePreviews[index] && <img src={servicePreviews[index]} alt={`Service ${index + 1} Preview`} style={{ width: '100px', marginTop: '10px' }} />}</div>

                        <div style={{ borderTop: '1px solid #eee', marginTop: 12, paddingTop: 12 }}>
                          <h4>Agreed Value</h4>
                          <div className="form-row" style={{ display: 'flex', gap: 12 }}>
                            <label><input type="radio" name={`service-mode-${index}`} value="single" checked={(service.agreedValue?.mode || 'single') === 'single'} onChange={() => toggleModeForItem('service', index, 'single')} /> <span style={{ marginLeft: 6 }}>Single</span></label>
                            <label><input type="radio" name={`service-mode-${index}`} value="multiple" checked={(service.agreedValue?.mode || '') === 'multiple'} onChange={() => toggleModeForItem('service', index, 'multiple')} /> <span style={{ marginLeft: 6 }}>Multiple</span></label>
                          </div>

                          {service.agreedValue?.mode === 'single' && (
                            <div style={{ marginTop: 8 }}>
                              <div className="form-row"><h4>Type</h4><select value={service.agreedValue.single.type || ''} onChange={(e) => updateSingleForItem('service', index, 'type', e.target.value)} className="multipleitem"><option value="">Select</option><option value="percentage">Percentage (%)</option><option value="amount">Amount (Rs)</option></select></div>
                              <div className="form-row"><h4>Value</h4><input type="number" value={service.agreedValue.single.value || ''} onChange={(e) => updateSingleForItem('service', index, 'value', e.target.value)} className="multipleitem" placeholder="Enter value" /></div>
                            </div>
                          )}

                          {service.agreedValue?.mode === 'multiple' && (
                            <div style={{ marginTop: 8 }}>
                              <div style={{ marginBottom: 8 }}><button type="button" className="submitbtn" onClick={() => addSlabToItem('service', index)}>+ Add Slab</button></div>
                              {(service.agreedValue.multiple.slabs || []).map((slab, sIdx) => (
                                <div key={sIdx} style={{ border: '1px dashed #ddd', padding: 8, borderRadius: 6, marginBottom: 8 }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><strong>Slab {sIdx + 1}</strong><button type="button" onClick={() => removeSlabFromItem('service', index, sIdx)} style={{ background: 'red', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: 6 }}>X</button></div>
                                  <div className="form-row"><h4>From</h4><input type="number" className="multipleitem" value={slab.from || ''} onChange={(e) => updateItemSlab('service', index, sIdx, 'from', e.target.value)} /></div>
                                  <div className="form-row"><h4>To</h4><input type="number" className="multipleitem" value={slab.to || ''} onChange={(e) => updateItemSlab('service', index, sIdx, 'to', e.target.value)} /></div>
                                  <div className="form-row"><h4>Type</h4><select value={slab.type || ''} onChange={(e) => updateItemSlab('service', index, sIdx, 'type', e.target.value)} className="multipleitem"><option value="">Select</option><option value="percentage">Percentage (%)</option><option value="amount">Amount (Rs)</option></select></div>
                                  <div className="form-row"><h4>Value</h4><input type="number" className="multipleitem" value={slab.value || ''} onChange={(e) => updateItemSlab('service', index, sIdx, 'value', e.target.value)} /></div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {services.length < 5 && <div style={{ marginTop: '10px' }}><button type="button" className="submitbtn" onClick={() => addField('service')}>+ Add Service</button></div>}

                  <h3 style={{ marginTop: '40px' }}>Products (Max 5)</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                    {products.map((product, index) => (
                      <div key={index} style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '8px', width: '100%', maxWidth: '500px', background: '#fafafa' }}>
                        <h4>Product {index + 1}</h4>
                        <div className="form-row"><h4>Product Name</h4><input type="text" value={product.name} onChange={(e) => handleDynamicChange('product', index, 'name', e.target.value)} className="multipleitem" /></div>
                        <div className="form-row"><h4>Product Description</h4><textarea value={product.description} onChange={(e) => handleDynamicChange('product', index, 'description', e.target.value)} className="multipleitem" /></div>
                        <div className="form-row"><h4>Keywords <span style={{ fontWeight: 'normal' }}>(comma-separated)</span></h4><input type="text" value={product.keywords || ''} onChange={(e) => handleDynamicChange('product', index, 'keywords', e.target.value)} className="multipleitem" placeholder="e.g. skincare, organic, beauty" /></div>
                     
                        <div className="form-row"><h4>Product Image (Optional)</h4><input type="file" accept="image/*" onChange={(e) => handleDynamicChange('product', index, 'image', e)} className="multipleitem" />{productPreviews[index] && <img src={productPreviews[index]} alt={`Product ${index + 1} Preview`} style={{ width: '100px', marginTop: '10px' }} />}</div>

                        <div style={{ borderTop: '1px solid #eee', marginTop: 12, paddingTop: 12 }}>
                          <h4>Agreed Value</h4>
                          <div className="form-row" style={{ display: 'flex', gap: 12 }}>
                            <label><input type="radio" name={`product-mode-${index}`} value="single" checked={(product.agreedValue?.mode || 'single') === 'single'} onChange={() => toggleModeForItem('product', index, 'single')} /> <span style={{ marginLeft: 6 }}>Single</span></label>
                            <label><input type="radio" name={`product-mode-${index}`} value="multiple" checked={(product.agreedValue?.mode || '') === 'multiple'} onChange={() => toggleModeForItem('product', index, 'multiple')} /> <span style={{ marginLeft: 6 }}>Multiple</span></label>
                          </div>

                          {product.agreedValue?.mode === 'single' && (
                            <div style={{ marginTop: 8 }}>
                              <div className="form-row"><h4>Type</h4><select value={product.agreedValue.single.type || ''} onChange={(e) => updateSingleForItem('product', index, 'type', e.target.value)} className="multipleitem"><option value="">Select</option><option value="percentage">Percentage (%)</option><option value="amount">Amount (Rs)</option></select></div>
                              <div className="form-row"><h4>Value</h4><input type="number" value={product.agreedValue.single.value || ''} onChange={(e) => updateSingleForItem('product', index, 'value', e.target.value)} className="multipleitem" placeholder="Enter value" /></div>
                            </div>
                          )}

                          {product.agreedValue?.mode === 'multiple' && (
                            <div style={{ marginTop: 8 }}>
                              <div style={{ marginBottom: 8 }}><button type="button" className="submitbtn" onClick={() => addSlabToItem('product', index)}>+ Add Slab</button></div>
                              {(product.agreedValue.multiple.slabs || []).map((slab, sIdx) => (
                                <div key={sIdx} style={{ border: '1px dashed #ddd', padding: 8, borderRadius: 6, marginBottom: 8 }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><strong>Slab {sIdx + 1}</strong><button type="button" onClick={() => removeSlabFromItem('product', index, sIdx)} style={{ background: 'red', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: 6 }}>X</button></div>
                                  <div className="form-row"><h4>From</h4><input type="number" className="multipleitem" value={slab.from || ''} onChange={(e) => updateItemSlab('product', index, sIdx, 'from', e.target.value)} /></div>
                                  <div className="form-row"><h4>To</h4><input type="number" className="multipleitem" value={slab.to || ''} onChange={(e) => updateItemSlab('product', index, sIdx, 'to', e.target.value)} /></div>
                                  <div className="form-row"><h4>Type</h4><select value={slab.type || ''} onChange={(e) => updateItemSlab('product', index, sIdx, 'type', e.target.value)} className="multipleitem"><option value="">Select</option><option value="percentage">Percentage (%)</option><option value="amount">Amount (Rs)</option></select></div>
                                  <div className="form-row"><h4>Value</h4><input type="number" className="multipleitem" value={slab.value || ''} onChange={(e) => updateItemSlab('product', index, sIdx, 'value', e.target.value)} /></div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {products.length < 5 && <div style={{ marginTop: '10px' }}><button type="button" className="submitbtn" onClick={() => addField('product')}>+ Add Product</button></div>}
                </div>
              </>
            )}

            {activeTab === 'Payment' && (
              <div>
                <h3>Payment Tracking</h3>
                <div className="form-row"><h4>Category</h4><div className="multipleitem"><input type="text" value={formData?.Category || ''} readOnly /></div></div>

                <div style={{ border: '1px solid #ddd', padding: '12px', borderRadius: 8, marginBottom: 12 }}>
                  <h4>Orbiter Fee (₹1000)</h4>

                  <div className="form-row"><h4>Fee Type</h4><div className="multipleitem"><select value={payment.orbiter.feeType || ''} onChange={(e) => {
                    const ft = e.target.value;
                    setPayment((p) => ({ ...p, orbiter: { ...p.orbiter, feeType: ft, amount: 1000, status: ft === 'adjustment' ? 'adjusted' : (p.orbiter.status === 'adjusted' ? 'unpaid' : p.orbiter.status) } }));
                  }}><option value="">Select Fee Type</option><option value="upfront">Upfront</option><option value="adjustment">Adjustment</option></select></div></div>

                  {payment.orbiter.feeType === 'upfront' && <>
                    <div className="form-row"><h4>Paid?</h4><div className="multipleitem"><label><input type="checkbox" checked={payment.orbiter.status === 'paid'} onChange={(e) => setPayment((p) => ({ ...p, orbiter: { ...p.orbiter, status: e.target.checked ? 'paid' : 'unpaid', paidDate: e.target.checked ? (p.orbiter.paidDate || new Date().toISOString().slice(0, 10)) : '' } }))} /> Paid</label></div></div>

                    {payment.orbiter.status === 'paid' && <>
                      <div className="form-row"><h4>Paid Date</h4><div className="multipleitem"><input type="date" value={payment.orbiter.paidDate || ''} onChange={(e) => setPayment((p) => ({ ...p, orbiter: { ...p.orbiter, paidDate: e.target.value } }))} /></div></div>
                      <div className="form-row"><h4>Payment Mode</h4><div className="multipleitem"><select value={payment.orbiter.paymentMode || ''} onChange={(e) => setPayment((p) => ({ ...p, orbiter: { ...p.orbiter, paymentMode: e.target.value } }))}><option value="">Select Mode</option>{paymentModes.map((m) => <option key={m} value={m}>{m}</option>)}</select></div></div>
                      <div className="form-row"><h4>Payment ID / Txn</h4><div className="multipleitem"><input type="text" value={payment.orbiter.paymentId || ''} onChange={(e) => setPayment((p) => ({ ...p, orbiter: { ...p.orbiter, paymentId: e.target.value } }))} /></div></div>
                      <div className="form-row"><h4>Payment Screenshot</h4><div className="multipleitem"><input type="file" accept="image/*" onChange={(e) => handlePaymentScreenshotChange('orbiter', e.target.files[0])} />{payment.orbiter.screenshotPreview && <div style={{ marginTop: 8 }}><img src={payment.orbiter.screenshotPreview} alt="orbiter-screenshot" style={{ width: 120, borderRadius: 6 }} /><div><button type="button" onClick={() => clearPaymentScreenshot('orbiter')}>Clear</button></div></div>}</div></div>
                    </>}
                  </>}

                  {payment.orbiter.feeType === 'adjustment' && <div className="form-row"><h4>Adjustment</h4><div className="multipleitem"><input type="text" value="Adjustment applied (₹1000)" readOnly /></div></div>}
                </div>

                {formData?.Category === 'CosmOrbiter' && (
                  <div style={{ border: '1px solid #ddd', padding: '12px', borderRadius: 8 }}>
                    <h4>CosmOrbiter Fee (₹5000)</h4>
                    <div className="form-row"><h4>Paid?</h4><div className="multipleitem"><label><input type="checkbox" checked={payment.cosmo.status === 'paid'} onChange={(e) => setPayment((p) => ({ ...p, cosmo: { ...p.cosmo, amount: 5000, status: e.target.checked ? 'paid' : 'unpaid', paidDate: e.target.checked ? (p.cosmo.paidDate || new Date().toISOString().slice(0, 10)) : '' } }))} /> Paid</label></div></div>

                    {payment.cosmo.status === 'paid' && <>
                      <div className="form-row"><h4>Paid Date</h4><div className="multipleitem"><input type="date" value={payment.cosmo.paidDate || ''} onChange={(e) => setPayment((p) => ({ ...p, cosmo: { ...p.cosmo, paidDate: e.target.value } }))} /></div></div>
                      <div className="form-row"><h4>Payment Mode</h4><div className="multipleitem"><select value={payment.cosmo.paymentMode || ''} onChange={(e) => setPayment((p) => ({ ...p, cosmo: { ...p.cosmo, paymentMode: e.target.value } }))}><option value="">Select Mode</option>{paymentModes.map((m) => <option key={m} value={m}>{m}</option>)}</select></div></div>
                      <div className="form-row"><h4>Payment ID / Txn</h4><div className="multipleitem"><input type="text" value={payment.cosmo.paymentId || ''} onChange={(e) => setPayment((p) => ({ ...p, cosmo: { ...p.cosmo, paymentId: e.target.value } }))} /></div></div>
                      <div className="form-row"><h4>Payment Screenshot</h4><div className="multipleitem"><input type="file" accept="image/*" onChange={(e) => handlePaymentScreenshotChange('cosmo', e.target.files[0])} />{payment.cosmo.screenshotPreview && <div style={{ marginTop: 8 }}><img src={payment.cosmo.screenshotPreview} alt="cosmo-screenshot" style={{ width: 120, borderRadius: 6 }} /><div><button type="button" onClick={() => clearPaymentScreenshot('cosmo')}>Clear</button></div></div>}</div></div>
                    </>}

                    {formData.Category === 'CosmOrbiter' && payment.cosmo?.status === 'paid' && (
                      <>
                        {!formData.subscription?.startDate ? (
                          <button onClick={handleBusinessApprove} className="approve-btn">Approve Business</button>
                        ) : (
                          <p className="approved-status">✅ Business Approved on {formData.subscription.startDate}<br/>🔄 Renew on {formData.subscription.nextRenewalDate}</p>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab && (
              <>
                {activeTab !== 'Personal Info' && <h3>{activeTab}</h3>}
                {getFields().filter((field) => fieldGroups[activeTab]?.includes(field)).map((field, i) => (
                  <li className="form-row" key={i}><h4>{field}</h4><div className="multipleitem">{renderInput(field)}</div></li>
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
