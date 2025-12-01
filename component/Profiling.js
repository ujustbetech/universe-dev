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


const UserProfileForm = () => {
  const searchParams = useSearchParams();
  const ujbcode = searchParams.get('user');

  const [activeTab, setActiveTab] = useState('Personal Info');
  const [profilePreview, setProfilePreview] = useState('');
  const [businessLogoPreview, setBusinessLogoPreview] = useState('');
  const [servicePreviews, setServicePreviews] = useState([]);
  const [productPreviews, setProductPreviews] = useState([]);

  // ---------- services/products initial state (replaces older declarations) ----------
  const emptyAgreedValue = () => ({
    mode: "single",
    single: { type: "", value: "" },
    multiple: {
      slabs: [],       // { from, to, type, value, itemName? }
      itemSlabs: []    // reserved for future use
    }
  });

  const [services, setServices] = useState([
    { name: '', description: '', image: null, percentage: '', keywords: '', agreedValue: emptyAgreedValue() }
  ]);
  const [products, setProducts] = useState([
    { name: '', description: '', image: null, percentage: '', keywords: '', agreedValue: emptyAgreedValue() }
  ]);

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

  const [socialMediaLinks, setSocialMediaLinks] = useState([
    { platform: '', url: '', customPlatform: '' },
  ]);

  // small list states
  const [allUsers, setAllUsers] = useState([]);
  const [formData, setFormData] = useState({});
  const [docId, setDocId] = useState('');
  const [profilePic, setProfilePic] = useState(null);
  const [businessLogo, setBusinessLogo] = useState(null);

  // --- social platform list ---
  const socialPlatforms = [
    'Facebook',
    'Instagram',
    'LinkedIn',
    'YouTube',
    'Twitter',
    'Pinterest',
    'Other'
  ];

  // helper to ensure service/product exists before mutating
  const ensureItem = (arr, index, template) => {
    const copy = [...arr];
    if (!copy[index]) copy[index] = JSON.parse(JSON.stringify(template));
    return copy;
  };

  // ---------- Per-item agreedValue helpers (place outside useEffect) ----------
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

  const updateSingleForItem = (type, index, field, value) => {
    const updater = type === 'service' ? [...services] : [...products];
    if (!updater[index]) return;
    const av = updater[index].agreedValue || emptyAgreedValue();
    av.single[field] = value;
    updater[index].agreedValue = av;
    type === 'service' ? setServices(updater) : setProducts(updater);
  };

  // ---------- Single handleDynamicChange (keep only this) ----------
  const handleDynamicChange = (type, index, field, value) => {
    if (type !== 'service' && type !== 'product') return;
    const updater = type === 'service' ? [...services] : [...products];
    const previews = type === 'service' ? [...servicePreviews] : [...productPreviews];

    // ensure an item exists
    if (!updater[index]) {
      updater[index] = { name: '', description: '', image: null, percentage: '', keywords: '', agreedValue: emptyAgreedValue() };
    }

    if (field === 'image') {
      updater[index].image = value.target.files[0];
      previews[index] = URL.createObjectURL(value.target.files[0]);
      if (type === 'service') setServicePreviews(previews);
      else setProductPreviews(previews);
    } else {
      // generic field update (name, description, etc.)
      updater[index][field] = value;
    }

    if (type === 'service') setServices(updater);
    else setProducts(updater);
  };

  // --- Social media handlers ---
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

        const q = query(collection(db, COLLECTIONS.userDetail), where('UJBCode', '==', ujbcode));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          const userDoc = snapshot.docs[0];
          const userData = userDoc.data();

          setFormData(userData);
          setDocId(userDoc.id);

          if (userData['ProfilePhotoURL']) setProfilePreview(userData['ProfilePhotoURL']);
          if (userData['BusinessLogo']) setBusinessLogoPreview(userData['BusinessLogo']);

          // SERVICES
          if (userData.services?.length > 0) {
            setServices(
              userData.services.map(s => ({
                name: s.name || '',
                description: s.description || '',
                keywords: s.keywords || '',
                image: null,
                percentage: s.percentage || '',
                agreedValue: s.agreedValue || emptyAgreedValue()
              }))
            );
          }

          // PRODUCTS
          if (userData.products?.length > 0) {
            setProducts(
              userData.products.map(p => ({
                name: p.name || '',
                description: p.description || '',
                keywords: p.keywords || '',
                image: null,
                percentage: p.percentage || '',
                agreedValue: p.agreedValue || emptyAgreedValue()
              }))
            );
          }

          // PAYMENT
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

          // SOCIAL MEDIA LINKS
          const pages = Array.isArray(userData.BusinessSocialMediaPages)
            ? userData.BusinessSocialMediaPages
            : [];

          setSocialMediaLinks(
            pages.length ? pages.map((s) => ({ platform: s.platform || "", url: s.url || "" })) : [{ platform: '', url: '', customPlatform: '' }]
          );

          // (Old global AgreedValue removed — per-item agreedValue loaded above)
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
      const snapshot = await getDocs(collection(db, COLLECTIONS.userDetail));
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

    if (Array.isArray(formData.services)) {
      setServicePreviews(
        formData.services.map(s =>
          s && typeof s === "object" ? s.imageURL || "" : ""
        )
      );
    }

    if (Array.isArray(formData.products)) {
      setProductPreviews(
        formData.products.map(p =>
          p && typeof p === "object" ? p.imageURL || "" : ""
        )
      );
    }
  }, [formData]);

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

  const addField = (type) => {
    if (type === 'service') {
      const updater = [...services];
      updater.push({ name: '', description: '', image: null, percentage: '', keywords: '', agreedValue: emptyAgreedValue() });
      setServices(updater);
    } else if (type === 'product') {
      const updater = [...products];
      updater.push({ name: '', description: '', image: null, percentage: '', keywords: '', agreedValue: emptyAgreedValue() });
      setProducts(updater);
    }
  };

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

  const handleSubmit = async () => {
    const orbiterIsAdjustment = payment.orbiter?.feeType === "adjustment";
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

      // Services + Products Filtering
      const filteredServices = services.filter(s => s.name.trim() && s.description.trim());
      const filteredProducts = products.filter(p => p.name.trim() && p.description.trim());

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
            agreedValue: srv.agreedValue || emptyAgreedValue()
          };
        })
      );

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
            agreedValue: prd.agreedValue || emptyAgreedValue()
          };
        })
      );

      // PAYMENT BLOCK
      const paymentToSave = {
        orbiter: {
          feeType: payment.orbiter?.feeType || "upfront",
          amount: 1000,
          status: orbiterIsAdjustment
            ? "adjusted"
            : payment.orbiter?.status || "unpaid",
          paidDate: orbiterIsAdjustment ? "" : (payment.orbiter?.paidDate || ""),
          paymentMode: orbiterIsAdjustment ? "" : (payment.orbiter?.paymentMode || ""),
          paymentId: orbiterIsAdjustment ? "" : (payment.orbiter?.paymentId || ""),
          screenshotURL: orbiterIsAdjustment ? "" : (payment.orbiter?.screenshotURL || ""),

          // 🔥 NEW: global adjustment fields
          adjustmentRemaining: orbiterIsAdjustment
            ? (payment.orbiter?.adjustmentRemaining ?? 1000) // default 1000 when enabling
            : (payment.orbiter?.adjustmentRemaining ?? 0),
          adjustmentCompleted: orbiterIsAdjustment
            ? false
            : (payment.orbiter?.adjustmentCompleted ?? false),
        },
        cosmo: {
          amount: 5000,
          status: payment.cosmo?.status || "unpaid",
          paidDate: payment.cosmo?.paidDate || "",
          paymentMode: payment.cosmo?.paymentMode || "",
          paymentId: payment.cosmo?.paymentId || "",
          screenshotURL: payment.cosmo?.screenshotURL || "",
        },
      };;

      // FINAL DATA TO SAVE
      const updatedData = {
        ...formData,
        ...(profileURL && { ProfilePhotoURL: profileURL }),
        ...(businessLogoURL && { BusinessLogo: businessLogoURL }),
        ...(serviceData.length > 0 && { services: serviceData }),
        ...(productData.length > 0 && { products: productData }),

        ...(socialMediaLinks.length > 0 && {
          BusinessSocialMediaPages: socialMediaLinks
            .filter((s) => s.url && (s.platform || s.customPlatform))
            .map((s) => ({
              platform: s.platform === 'Other'
                ? (s.customPlatform || 'Other')
                : s.platform,
              url: s.url
            }))
        }),

        payment: paymentToSave
      };

      // FIRESTORE UPDATE
      const userRef = doc(db, COLLECTIONS.userDetail, docId);
      await updateDoc(userRef, updatedData);

      Swal.fire({
        icon: 'success',
        title: 'Profile updated successfully!'
      });

    } catch (err) {
      console.error('Error updating profile:', err);
      Swal.fire({
        icon: 'error',
        title: 'Failed to update profile'
      });
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

      const userRef = doc(db, COLLECTIONS.userDetail, docId);
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
    'CurrentHealthCondition': ['Excellent', 'Good', 'Average', 'Needs Attention'],
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
    'IDType', 'IDNumber', 'Upload Photo',
    'City', 'State', 'Location',
    'Hobbies', 'InterestArea', 'Skills', 'Exclusive Knowledge',
    'Aspirations', 'Health Parameters', 'CurrentHealthCondition',
    'FamilyHistorySummary', 'MaritalStatus', 'ProfessionalHistory',
    'CurrentProfession', 'EducationalBackground', 'LanguagesKnown',
    'ContributionAreainUJustBe', 'ImmediateDesire', 'Mastery',
    'SpecialSocialContribution', 'ProfileStatus', 'BusinessSocialMediaPages',
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
      'SpecialSocialContribution', 'ProfileStatus', 'BusinessSocialMediaPages',
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
                {link.platform === 'Other' && link.customPlatform && (
                  <option value="Other">Other ({link.customPlatform})</option>
                )}
              </select>

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
              {['Personal Info', 'Health', 'Education', 'BusinessInfo', 'Additional Info', 'Payment'].map((tab, index) => (
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
                    <select
                      name="Category"
                      value={formData.Category || ''}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Select Category</option>
                      <option value="Orbiter">Orbiter</option>
                      <option value="CosmOrbiter">CosmOrbiter</option>
                    </select>
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

            {activeTab === 'BusinessInfo' && formData?.Category?.toLowerCase() === 'cosmorbiter' && (
              <>
                <div>
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

                        {/* === AGREED VALUE (per service) === */}
                        <div style={{ borderTop: '1px solid #eee', marginTop: 12, paddingTop: 12 }}>
                          <h4>Agreed Value</h4>

                          <div className="form-row" style={{ display: 'flex', gap: 12 }}>
                            <label>
                              <input
                                type="radio"
                                name={`service-mode-${index}`}
                                value="single"
                                checked={(service.agreedValue?.mode || 'single') === 'single'}
                                onChange={() => toggleModeForItem('service', index, 'single')}
                              /> <span style={{ marginLeft: 6 }}>Single</span>
                            </label>

                            <label>
                              <input
                                type="radio"
                                name={`service-mode-${index}`}
                                value="multiple"
                                checked={(service.agreedValue?.mode || '') === 'multiple'}
                                onChange={() => toggleModeForItem('service', index, 'multiple')}
                              /> <span style={{ marginLeft: 6 }}>Multiple</span>
                            </label>
                          </div>

                          {service.agreedValue?.mode === 'single' && (
                            <div style={{ marginTop: 8 }}>
                              <div className="form-row">
                                <h4>Type</h4>
                                <select
                                  value={service.agreedValue.single.type || ''}
                                  onChange={(e) => updateSingleForItem('service', index, 'type', e.target.value)}
                                  className="multipleitem"
                                >
                                  <option value="">Select</option>
                                  <option value="percentage">Percentage (%)</option>
                                  <option value="amount">Amount (Rs)</option>
                                </select>
                              </div>
                              <div className="form-row">
                                <h4>Value</h4>
                                <input
                                  type="number"
                                  value={service.agreedValue.single.value || ''}
                                  onChange={(e) => updateSingleForItem('service', index, 'value', e.target.value)}
                                  className="multipleitem"
                                  placeholder="Enter value"
                                />
                              </div>
                            </div>
                          )}

                          {service.agreedValue?.mode === 'multiple' && (
                            <div style={{ marginTop: 8 }}>
                              <div style={{ marginBottom: 8 }}>
                                <button type="button" className="submitbtn" onClick={() => addSlabToItem('service', index)}>+ Add Slab</button>
                              </div>

                              {(service.agreedValue.multiple.slabs || []).map((slab, sIdx) => (
                                <div key={sIdx} style={{ border: '1px dashed #ddd', padding: 8, borderRadius: 6, marginBottom: 8 }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <strong>Slab {sIdx + 1}</strong>
                                    <button type="button" onClick={() => removeSlabFromItem('service', index, sIdx)} style={{ background: 'red', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: 6 }}>X</button>
                                  </div>

                                  <div className="form-row">
                                    <h4>From</h4>
                                    <input type="number" className="multipleitem" value={slab.from || ''} onChange={(e) => updateItemSlab('service', index, sIdx, 'from', e.target.value)} />
                                  </div>

                                  <div className="form-row">
                                    <h4>To</h4>
                                    <input type="number" className="multipleitem" value={slab.to || ''} onChange={(e) => updateItemSlab('service', index, sIdx, 'to', e.target.value)} />
                                  </div>

                                  <div className="form-row">
                                    <h4>Type</h4>
                                    <select value={slab.type || ''} onChange={(e) => updateItemSlab('service', index, sIdx, 'type', e.target.value)} className="multipleitem">
                                      <option value="">Select</option>
                                      <option value="percentage">Percentage (%)</option>
                                      <option value="amount">Amount (Rs)</option>
                                    </select>
                                  </div>

                                  <div className="form-row">
                                    <h4>Value</h4>
                                    <input type="number" className="multipleitem" value={slab.value || ''} onChange={(e) => updateItemSlab('service', index, sIdx, 'value', e.target.value)} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        {/* === end AGREED VALUE === */}
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

                        {/* === AGREED VALUE (per product) === */}
                        <div style={{ borderTop: '1px solid #eee', marginTop: 12, paddingTop: 12 }}>
                          <h4>Agreed Value</h4>

                          <div className="form-row" style={{ display: 'flex', gap: 12 }}>
                            <label>
                              <input
                                type="radio"
                                name={`product-mode-${index}`}
                                value="single"
                                checked={(product.agreedValue?.mode || 'single') === 'single'}
                                onChange={() => toggleModeForItem('product', index, 'single')}
                              /> <span style={{ marginLeft: 6 }}>Single</span>
                            </label>

                            <label>
                              <input
                                type="radio"
                                name={`product-mode-${index}`}
                                value="multiple"
                                checked={(product.agreedValue?.mode || '') === 'multiple'}
                                onChange={() => toggleModeForItem('product', index, 'multiple')}
                              /> <span style={{ marginLeft: 6 }}>Multiple</span>
                            </label>
                          </div>

                          {product.agreedValue?.mode === 'single' && (
                            <div style={{ marginTop: 8 }}>
                              <div className="form-row">
                                <h4>Type</h4>
                                <select
                                  value={product.agreedValue.single.type || ''}
                                  onChange={(e) => updateSingleForItem('product', index, 'type', e.target.value)}
                                  className="multipleitem"
                                >
                                  <option value="">Select</option>
                                  <option value="percentage">Percentage (%)</option>
                                  <option value="amount">Amount (Rs)</option>
                                </select>
                              </div>
                              <div className="form-row">
                                <h4>Value</h4>
                                <input
                                  type="number"
                                  value={product.agreedValue.single.value || ''}
                                  onChange={(e) => updateSingleForItem('product', index, 'value', e.target.value)}
                                  className="multipleitem"
                                  placeholder="Enter value"
                                />
                              </div>
                            </div>
                          )}

                          {product.agreedValue?.mode === 'multiple' && (
                            <div style={{ marginTop: 8 }}>
                              <div style={{ marginBottom: 8 }}>
                                <button type="button" className="submitbtn" onClick={() => addSlabToItem('product', index)}>+ Add Slab</button>
                              </div>

                              {(product.agreedValue.multiple.slabs || []).map((slab, sIdx) => (
                                <div key={sIdx} style={{ border: '1px dashed #ddd', padding: 8, borderRadius: 6, marginBottom: 8 }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <strong>Slab {sIdx + 1}</strong>
                                    <button type="button" onClick={() => removeSlabFromItem('product', index, sIdx)} style={{ background: 'red', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: 6 }}>X</button>
                                  </div>

                                  <div className="form-row">
                                    <h4>From</h4>
                                    <input type="number" className="multipleitem" value={slab.from || ''} onChange={(e) => updateItemSlab('product', index, sIdx, 'from', e.target.value)} />
                                  </div>

                                  <div className="form-row">
                                    <h4>To</h4>
                                    <input type="number" className="multipleitem" value={slab.to || ''} onChange={(e) => updateItemSlab('product', index, sIdx, 'to', e.target.value)} />
                                  </div>

                                  <div className="form-row">
                                    <h4>Type</h4>
                                    <select value={slab.type || ''} onChange={(e) => updateItemSlab('product', index, sIdx, 'type', e.target.value)} className="multipleitem">
                                      <option value="">Select</option>
                                      <option value="percentage">Percentage (%)</option>
                                      <option value="amount">Amount (Rs)</option>
                                    </select>
                                  </div>

                                  <div className="form-row">
                                    <h4>Value</h4>
                                    <input type="number" className="multipleitem" value={slab.value || ''} onChange={(e) => updateItemSlab('product', index, sIdx, 'value', e.target.value)} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        {/* === end AGREED VALUE === */}
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

                {/* Orbiter fee section ... (kept intact) */}
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
                              ✅ Business Approved on {formData.subscription.startDate}<br />
                              🔄 Renew on {formData.subscription.nextRenewalDate}
                            </p>
                          )}
                        </>
                      )}
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
