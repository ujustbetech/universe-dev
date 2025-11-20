import { useEffect, useState } from 'react';
import { db } from '../firebaseConfig';
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { useRouter } from 'next/router';
import { COLLECTIONS } from "/utility_collection";

const ManageEvents = () => {
  const router = useRouter();
  const [conclaves, setConclaves] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchConclavesAndUsers = async () => {
      try {
        const conclaveSnapshot = await getDocs(collection(db, 'Conclaves'));
        const conclaveList = conclaveSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));

        const userSnapshot = await getDocs(collection(db, 'userdetails'));
        const userList = userSnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data()[" Name"],
        }));

        setConclaves(conclaveList);
        setUsers(userList);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Error fetching data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchConclavesAndUsers();
  }, []);

  const getUserNameById = (id) => {
    const user = users.find(u => u.id === id);
    return user ? user.name : 'Unknown';
  };

  const getUserNamesByIds = (ids) => {
    return ids.map(id => getUserNameById(id)).join(', ');
  };

  const handleEdit = (id) => {
    router.push(`/admin/event/editconclave/${id}`);
  };

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this conclave?");
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, "conclaves", id));
      setConclaves(prev => prev.filter(c => c.id !== id));
      alert("Conclave deleted successfully.");
    } catch (error) {
      console.error("Error deleting conclave:", error);
      alert("Failed to delete conclave. Please try again.");
    }
  };
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (isNaN(date)) return 'Invalid Date';
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
  });
};

  return (
    <>
      {loading && <div className='loader'><span className="loader2"></span></div>}
      <section className='c-userslist box'>
        <h2>Manage Conclaves</h2>
        <button className="m-button-5" onClick={() => window.history.back()}>
          Back
        </button>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <table className='table-class'>
          <thead>
            <tr>
              <th>Sr No</th>
              <th>Conclave Name</th>
              <th>Leader</th>
              <th>Start Date</th>
              <th>Initiation Date</th>
              <th>NT Members</th>
              <th># Orbiters</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {conclaves.length > 0 ? (
              conclaves.map((item, index) => (
                <tr key={item.id}>
                  <td>{index + 1}</td>
                  <td>{item.conclaveStream || 'N/A'}</td>
                  <td>{getUserNameById(item.leader)}</td>
                 <td>{formatDate(item.startDate)}</td>
<td>{formatDate(item.initiationDate)}</td>

                  <td>{getUserNamesByIds(item.ntMembers || [])}</td>
                  <td>{item.orbiters?.length || 0}</td>
                  <td>
                    <div className='twobtn'>
                      <button  className="m-button-7" 
    
            style={{ marginLeft: '10px', backgroundColor: '#f16f06', color: 'white' }} onClick={() => handleEdit(item.id)}>✎ Edit</button>
                      <button  className="m-button-7" 
          
            style={{ marginLeft: '10px', backgroundColor: '#FF0000', color: 'white' }} onClick={() => handleDelete(item.id)}>🗑 Delete</button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center' }}>No conclaves found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </>
  );
};

export default ManageEvents;
