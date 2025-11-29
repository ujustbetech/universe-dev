import React, { useState, useRef ,useEffect} from 'react';
import { storage, db } from '../firebaseConfig';
import { ref, uploadBytes, getDownloadURL,deleteObject, ref as storageRef  } from 'firebase/storage';
import { doc, updateDoc, arrayUnion,getDoc } from 'firebase/firestore';
import { COLLECTIONS } from "/utility_collection";
import Swal from 'sweetalert2';

import 'react-quill/dist/quill.snow.css';
import dynamic from 'next/dynamic';

// Load ReactQuill only on the client side
const ReactQuill = dynamic(() => import('react-quill'), {
  ssr: false,
});



const MultiImageUploadAccordion = ({ eventID, fetchData }) => {
  const [sections, setSections] = useState([
    { id: Date.now(), type: '', image: null, description: '', open: true },
  ]);

  const fileInputRefs = useRef({});
  const [uploadedImages, setUploadedImages] = useState([]);

  const fetchImages = async () => {
    const docRef = doc(db, COLLECTIONS.monthlyMeeting, eventID);
    const docSnap = await getDoc(docRef);
  
    if (docSnap.exists()) {
      const data = docSnap.data();
      setUploadedImages(data.imageUploads || []);
    }
  };
  
  useEffect(() => {
    fetchImages();
  }, []);
  

  const handleInputChange = (index, field, value) => {
    const updatedSections = [...sections];
    updatedSections[index][field] = value;
    setSections(updatedSections);
  };

  const handleFileChange = (index, file) => {
    const updatedSections = [...sections];
    updatedSections[index].image = file;
    setSections(updatedSections);
  };
const handleDeleteImage = async (upload) => {
  const result = await Swal.fire({
    title: 'Are you sure?',
    text: 'This image will be permanently deleted.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6',
    confirmButtonText: 'Yes, delete it!',
  });

  if (result.isConfirmed) {
    try {
      // Delete from Storage
      const fileRef = storageRef(storage, upload.image.url);
      await deleteObject(fileRef);

      // Update Firestore
      const docRef = doc(db, COLLECTIONS.monthlyMeeting, eventID);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const currentUploads = docSnap.data().imageUploads || [];
        const updatedUploads = currentUploads.filter(
          (item) => item.image.url !== upload.image.url
        );
        await updateDoc(docRef, { imageUploads: updatedUploads });
        Swal.fire('Deleted!', 'The image has been deleted.', 'success');
        fetchImages(); // Refresh UI
      }
    } catch (error) {
      console.error('Error deleting image:', error);
      Swal.fire('Error!', 'There was a problem deleting the image.', 'error');
    }
  }
};


  const handleUpload = async (index) => {
    const section = sections[index];

    if (!section.type) {
      alert('Fill all fields before uploading.');
      return;
    }

    try {
      const fileRef = ref(
        storage,
        `COLLECTIONS.monthlyMeeting/${eventID}/${section.type}/${Date.now()}_${section.image.name}`
      );
      await uploadBytes(fileRef, section.image);
      const url = await getDownloadURL(fileRef);

      const eventRef = doc(db, COLLECTIONS.monthlyMeeting, eventID);
      await updateDoc(eventRef, {
        imageUploads: arrayUnion({
          type: section.type,
          description: section.description,
          image: {
            name: section.image.name,
            url,
          },
          timestamp: new Date().toISOString(),
        }),
      });

      alert('Image uploaded successfully!');
      fetchData();
      // Reset this section
      handleInputChange(index, 'type', '');
      handleInputChange(index, 'description', '');
      handleFileChange(index, null);
    } catch (err) {
      console.error(err);
      alert('Upload failed.');
    }
  };

  const toggleSection = (index) => {
    const updatedSections = [...sections];
    updatedSections[index].open = !updatedSections[index].open;
    setSections(updatedSections);
  };

  const addSection = () => {
    setSections([
      ...sections,
      { id: Date.now(), type: '', image: null, description: '', open: true },
    ]);
  };

  const removeSection = (index) => {
    const updatedSections = sections.filter((_, i) => i !== index);
    setSections(updatedSections);
  };

  return (
    <div>
       <div style={{ marginTop: '20px' }}>
  <h3>Uploaded Images</h3>
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
    {uploadedImages.map((upload, index) => (
      <div
        key={index}
        style={{
          border: '1px solid #ccc',
          padding: '10px',
          borderRadius: '8px',
          maxWidth: '300px',
          width: '100%',
        }}
      >
        <p><strong>Type:</strong> {upload.type}</p>
        <div dangerouslySetInnerHTML={{ __html: upload.description }} />
        <img
          src={upload.image.url}
          alt={upload.image.name}
          style={{ width: '100%', height: 'auto', borderRadius: '4px' }}
        />
        <button
  style={{ marginTop: '10px', background: 'red', color: 'white', padding: '5px 10px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
  onClick={() => handleDeleteImage(upload)}
>
  Delete
</button>

      </div>
      
    ))}
    
  </div>
</div>

      {sections.map((section, index) => (
        <div
          key={section.id}
          className="accordion-container"
          style={{
            border: '1px solid #ccc',
            borderRadius: '8px',
            marginBottom: '10px',
          }}
        >
          <div
            className="accordion-header"
            onClick={() => toggleSection(index)}
            style={{
              cursor: 'pointer',
              background: '#f0f0f0',
              padding: '10px',
              fontWeight: 'bold',
            }}
          >
            Upload Image Section {index + 1} {section.open ? '▲' : '▼'}
          </div>

          {section.open && (
            <ul className="accordion-content" style={{ padding: '10px' }}>
              <li className="form-row">
                <h4>Select Type:<sup>*</sup></h4>
                <div className="multipleitem">
                <select
                  value={section.type}
                  onChange={(e) =>
                    handleInputChange(index, 'type', e.target.value)
                  }
                  required
                >
                  <option value="">-- Select Type --</option>
                  <option value="WhatsApp">WhatsApp</option>
                     <option value="Banner">Banner</option>
                  <option value="Email">Email</option>
                </select>
                </div>
              </li>
         
              <li className="form-row">
                <h4>Select Image:<sup>*</sup></h4>
                <div className="multipleitem">
                <input
                  type="file"
                  accept="image/*"
                  ref={(el) => (fileInputRefs.current[section.id] = el)}
                  style={{ display: 'none' }}
                  onChange={(e) =>
                    handleFileChange(index, e.target.files[0])
                  }
                />
                <button
                  type="button"
                  onClick={() =>
                    fileInputRefs.current[section.id].click()
                  }
                >
                  Choose Image
                </button>

                {section.image && (
                  <div style={{ marginTop: '10px' }}>
                    <img
                      src={URL.createObjectURL(section.image)}
                      alt="Preview"
                      style={{ maxWidth: '200px', marginTop: '5px' }}
                    />
                  </div>
                )}
                </div>
              </li>

              <li className="form-row">
  <h4>Description:<sup>*</sup></h4>
  <div className="multipleitem">
    <ReactQuill
      theme="snow"
      value={section.description}
      onChange={(value) => handleInputChange(index, 'description', value)}
      placeholder="Enter image description"
    />
  </div>
</li>


              <ul>
              <li className="form-row" style={{ display: 'flex', gap: '10px' }}>
          <div className="multipleitem">
                <button
                  type="button"
                  className="submitbtn"
                  onClick={() => handleUpload(index)}
                >
                  Upload
                </button>
                </div>
               
                {sections.length > 1 && (
                    <button class="tooltip" onClick={() =>  removeSection(index)}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20" height="25" width="25">
                      <path fill="#6361D9" d="M8.78842 5.03866C8.86656 4.96052 8.97254 4.91663 9.08305 4.91663H11.4164C11.5269 4.91663 11.6329 4.96052 11.711 5.03866C11.7892 5.11681 11.833 5.22279 11.833 5.33329V5.74939H8.66638V5.33329C8.66638 5.22279 8.71028 5.11681 8.78842 5.03866ZM7.16638 5.74939V5.33329C7.16638 4.82496 7.36832 4.33745 7.72776 3.978C8.08721 3.61856 8.57472 3.41663 9.08305 3.41663H11.4164C11.9247 3.41663 12.4122 3.61856 12.7717 3.978C13.1311 4.33745 13.333 4.82496 13.333 5.33329V5.74939H15.5C15.9142 5.74939 16.25 6.08518 16.25 6.49939C16.25 6.9136 15.9142 7.24939 15.5 7.24939H15.0105L14.2492 14.7095C14.2382 15.2023 14.0377 15.6726 13.6883 16.0219C13.3289 16.3814 12.8414 16.5833 12.333 16.5833H8.16638C7.65805 16.5833 7.17054 16.3814 6.81109 16.0219C6.46176 15.6726 6.2612 15.2023 6.25019 14.7095L5.48896 7.24939H5C4.58579 7.24939 4.25 6.9136 4.25 6.49939C4.25 6.08518 4.58579 5.74939 5 5.74939H6.16667H7.16638ZM7.91638 7.24996H12.583H13.5026L12.7536 14.5905C12.751 14.6158 12.7497 14.6412 12.7497 14.6666C12.7497 14.7771 12.7058 14.8831 12.6277 14.9613C12.5495 15.0394 12.4436 15.0833 12.333 15.0833H8.16638C8.05588 15.0833 7.94989 15.0394 7.87175 14.9613C7.79361 14.8831 7.74972 14.7771 7.74972 14.6666C7.74972 14.6412 7.74842 14.6158 7.74584 14.5905L6.99681 7.24996H7.91638Z" clip-rule="evenodd" fill-rule="evenodd"></path>
                    </svg>
                    <span class="tooltiptext">Remove</span>
                  </button>
                )}
               </li>
               </ul>
            </ul>
          )}
        </div>
      ))}

      <button
        type="button"
        onClick={addSection}
       className='m-button-7'
      >
        + Add Image Section
      </button>
     

    </div>
  );
};

export default MultiImageUploadAccordion;
