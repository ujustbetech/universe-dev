import React, { useEffect, useState } from 'react';
import { db } from '../../firebaseConfig';
import { COLLECTIONS } from "/utility_collection";
import { collection, getDocs } from 'firebase/firestore';
import Layout from '../../component/Layout';
import "../../src/app/styles/main.scss";


const AllProfiles = () => {
  const [profiles, setProfiles] = useState([]);

  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'userdetail'));
        const data = querySnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(profile => profile['ID Number']); // ✅ only those with ID Number
        setProfiles(data);
      } catch (error) {
        console.error('Error fetching profiles:', error);
      }
    };

    fetchProfiles();
  }, []);

  return (
    <Layout>
   
      <h2>Updated Profiles</h2>
       <table className='table-class'>
        <thead>
          <tr>
            <th>Sr. No</th>
            <th>Full Name</th>
            <th>Phone</th>
            <th>ID Number</th>
            <th>Business Name</th>
            <th>Locality</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {profiles.map((profile, index) => (
            <tr key={profile.id}>
              <td>{index + 1}</td>
              <td>{profile[' Name'] || '-'}</td>
              <td>{profile['Mobile no'] || '-'}</td>
              <td>{profile['ID Number'] || '-'}</td>
              <td>{profile['Business Name'] || '-'}</td>
              <td>{profile['Locality'] || '-'}</td>
              <td>
                <button onClick={() => console.log('View:', profile.id)}>View</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    
    </Layout>
  );
};

export default AllProfiles;
