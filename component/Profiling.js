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
const socialPlatforms = [
  'Facebook',
  'Instagram',
  'LinkedIn',
  'YouTube',
  'Twitter',
  'Pinterest',
  'Other' // 👈 Added here
];

const [socialMediaLinks, setSocialMediaLinks] = useState([
  { platform: '', url: '', customPlatform: '' },
]);

const handleSocialMediaChange = (index, key, value) => {
  const updated = [...socialMediaLinks];
  updated[index][key] = value;
  setSocialMediaLinks(updated);
};

const addSocialMediaField = () => {
  setSocialMediaLinks([...socialMediaLinks, { platform: '', url: '', customPlatform: '' }]);
};

const removeSocialMediaField = (index) => {
  const updated = [...socialMediaLinks];
  updated.splice(index, 1);
  setSocialMediaLinks(updated);
};


useEffect(() => {
  const fetchUserByPhone = async () => {
    try {
      if (!ujbcode) return;

      const q = query(collection(db, 'usersdetail'), where('UJBCode', '==', ujbcode));
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

   // Load Business Social Media Pages
if (userData['BusinessSocialMediaPages']?.length > 0) {
  setSocialMediaLinks(
    userData['BusinessSocialMediaPages'].map((s) => ({
      platform: socialPlatforms.includes(s.platform) ? s.platform : 'Other',
      url: s.url,
      customPlatform: !socialPlatforms.includes(s.platform) ? s.platform : '',
    }))
  );
}
      }
    } catch (err) {
      console.error('Error fetching user:', err);
    }
  };

  fetchUserByPhone();
}, [ujbcode]);


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
      const snapshot = await getDocs(collection(db, 'usersdetail'));
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

    // Now declare updatedData
    const updatedData = {
      ...formData,
      ...(profileURL && { 'ProfilePhotoURL': profileURL }),
      ...(businessLogoURL && { 'BusinessLogo': businessLogoURL }),
      ...(serviceData.length > 0 && { services: serviceData }),
      ...(productData.length > 0 && { products: productData }),
      ...(socialMediaLinks.length > 0 && { 
        'BusinessSocialMediaPages': socialMediaLinks
          .filter((s) => s.url)
          .map((s) => ({
            platform: s.platform === 'Other' ? s.customPlatform || 'Other' : s.platform,
            url: s.url
          }))
      }),
    };

    const userRef = doc(db, 'usersdetail', docId);
    await updateDoc(userRef, updatedData);

    alert('Profile updated successfully!');
  } catch (err) {
    console.error('Error updating profile:', err);
    alert('Failed to update profile');
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
          </select>

          {/* 👇 if 'Other' is selected, show an input box for custom name */}
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
  {['Personal Info', 'Health', 'Education', 'Business Info', 'Additional Info'].map((tab, index) => (
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
