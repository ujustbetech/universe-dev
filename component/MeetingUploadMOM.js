import React, { useState, useRef,useEffect } from 'react';
import { storage, db } from '../firebaseConfig';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc, arrayUnion ,getDoc} from 'firebase/firestore';
import Swal from 'sweetalert2';
import { useRouter } from 'next/router';

const DocumentUpload = ({ eventID, data = {}, fetchData }) => {
  const [selectedDocs, setSelectedDocs] = useState([]);
  const [docDescription, setDocDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);
  const [documentUploads, setDocumentUploads] = useState([]);

const router = useRouter();
const { conclaveId, id: meetingId } = router.query;

 const fetchDoc = async () => {
  if (!conclaveId || !meetingId) return;
  const docRef = doc(db, 'Conclaves', conclaveId, 'meetings', meetingId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const data = docSnap.data();
    setDocumentUploads(data.documentUploads || []);
  }
};


  useEffect(() => {
    fetchDoc();
  }, [eventID]);

  const handleDocUpload = async () => {
    if (!eventID) {
      console.error("Missing or invalid 'id' prop passed to DocumentUpload");
      alert("Something went wrong. Please try again later.");
      return;
    }
  
    if (selectedDocs.length === 0 || !docDescription) {
      alert("Please select files and enter a description.");
      return;
    }
  
    setLoading(true);
  
    try {
      const uploadedUrls = [];
  
      for (const file of selectedDocs) {
        const fileRef = ref(
          storage,
          `MonthlyMeeting/${eventID}/docs/${Date.now()}_${file.name}`
        );
        await uploadBytes(fileRef, file);
        const url = await getDownloadURL(fileRef);
        uploadedUrls.push({
          name: file.name,
          url,
        });
      }
  
    const eventRef = doc(db, 'Conclaves', conclaveId, 'meetings', meetingId);

  
      await updateDoc(eventRef, {
        documentUploads: arrayUnion({
          description: docDescription,
          files: uploadedUrls,
          timestamp: new Date().toISOString(),
        }),
      });
      fetchData();
      alert('Documents uploaded successfully!');
      setSelectedDocs([]);
      setDocDescription('');
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed. Check console for details.');
    }
  
    setLoading(false);
  };
  const handleDeleteUpload = async (timestampToDelete) => {
    const confirmResult = await Swal.fire({
      title: 'Are you sure?',
      text: "This document upload will be permanently removed!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!',
    });
  
    if (!confirmResult.isConfirmed) return;
  
    try {
      const docRef = doc(db, 'MonthlyMeeting', eventID);
      const docSnap = await getDoc(docRef);
  
      if (docSnap.exists()) {
        const currentUploads = docSnap.data().documentUploads || [];
  
        // Filter out the document with the matching timestamp
        const updatedUploads = currentUploads.filter(
          (upload) => upload.timestamp !== timestampToDelete
        );
  
        await updateDoc(docRef, {
          documentUploads: updatedUploads,
        });
  
        Swal.fire('Deleted!', 'The document has been removed.', 'success');
        fetchDoc(); // Refresh the document list
      }
    } catch (error) {
      console.error('Delete error:', error);
      Swal.fire('Error', 'Failed to delete the document. Check console.', 'error');
    }
  };
  

  return (
    <div>
        <h3 style={{ marginTop: '2rem' }}>Uploaded Documents</h3>

{documentUploads.length === 0 ? (
  <p>No documents uploaded yet.</p>
) : (
  <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
    <thead>
      <tr style={{ backgroundColor: '#f0f0f0' }}>
        <th style={{ border: '1px solid #ddd', padding: '8px' }}>#</th>
        <th style={{ border: '1px solid #ddd', padding: '8px' }}>Description</th>
        <th style={{ border: '1px solid #ddd', padding: '8px' }}>Uploaded On</th>
        <th style={{ border: '1px solid #ddd', padding: '8px' }}>Files</th>
      </tr>
    </thead>
    <tbody>
      {documentUploads.map((upload, index) => (
        <tr key={index}>
          <td style={{ border: '1px solid #ddd', padding: '8px' }}>{index + 1}</td>
          <td style={{ border: '1px solid #ddd', padding: '8px' }}>{upload.description}</td>
          <td style={{ border: '1px solid #ddd', padding: '8px' }}>
            {new Date(upload.timestamp).toLocaleString()}
          </td>
        
          <td style={{ border: '1px solid #ddd', padding: '8px' }}>
  <ul style={{ margin: 0, paddingLeft: '1rem' }}>
    {upload.files.map((file, idx) => (
      <li key={idx}>
        <a href={file.url} target="_blank" rel="noopener noreferrer">
          {file.name}
        </a>
      </li>
    ))}
  </ul>
  <button
    style={{
      marginTop: '0.5rem',
      backgroundColor: '#e74c3c',
      color: 'white',
      border: 'none',
      padding: '6px 10px',
      cursor: 'pointer',
      borderRadius: '4px',
      float: 'right',
    }}
    onClick={() => handleDeleteUpload(upload.timestamp)}
  >
    Delete
  </button>
</td>

        </tr>
      ))}
    </tbody>
  </table>
)}
    <h3>Upload Meeting Documents</h3>
    <ul>
      <li className="form-row">
        <h4>Upload PDF/Word Document:<sup>*</sup></h4>
        <div className="multipleitem">
          <input
            type="file"
            accept=".pdf,.doc,.docx"
            multiple
            ref={fileInputRef}
            onChange={(e) => {
              const files = e.target.files;
              if (files && files.length > 0) {
                setSelectedDocs(Array.from(files));
              }
            }}
            style={{ display: 'none' }}
          />
          <button type="button" onClick={() => fileInputRef.current.click()}>
            Select Files
          </button>
          {selectedDocs.length > 0 && (
            <ul style={{ marginTop: '10px' }}>
              {selectedDocs.map((file, index) => (
                <li key={index}>{file.name}</li>
              ))}
            </ul>
          )}
        </div>
      </li>

      <li className="form-row">
        <h4>Document Description:<sup>*</sup></h4>
        <div className="multipleitem">
          <textarea
            placeholder="Enter description"
            value={docDescription}
            onChange={(e) => setDocDescription(e.target.value)}
            required
          />
        </div>
      </li>

      <li className="form-row">
        <div className="multipleitem">
          <button
            className="submitbtn"
            type="button"
            onClick={handleDocUpload}
            disabled={loading}
          >
            {loading ? 'Uploading...' : 'Submit'}
          </button>
        </div>
      </li>
    </ul>

   
  

  </div>
  );
};

export default DocumentUpload;
