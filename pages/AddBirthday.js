import { useState, useEffect } from 'react';
import { db, storage } from '../firebaseConfig';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import "../src/app/styles/main.scss";
import Layout from '../component/Layout';
import { COLLECTIONS } from "/utility_collection";

const AddBirthday = () => {
  const [userList, setUserList] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [orbiteremail, setOrbiterEmail] = useState('');
  const [dob, setDob] = useState('');
  const [image, setImage] = useState(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const userRef = collection(db, COLLECTIONS.userDetail);
        const snapshot = await getDocs(userRef);
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data()[" Name"],
          phone: doc.data()["Mobile no"],
          email: doc.data()["Email"],
     dob: convertToInputDateFormat(doc.data()["DOB"])

        }));
        setUserList(data);
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };

    fetchUsers();
  }, []);
const convertToInputDateFormat = (dobStr) => {
  if (!dobStr) return '';
  const [day, month, year] = dobStr.split('/');
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};


  const handleSearchUser = (e) => {
    const value = e.target.value.toLowerCase();
    setUserSearch(value);
    const filtered = userList.filter(user =>
      user.name && user.name.toLowerCase().includes(value)
    );
    setFilteredUsers(filtered);
  };

  const handleSelectUser = (user) => {
    setName(user.name || '');
    setPhone(user.phone || '');
    setOrbiterEmail(user.email || '');
    setDob(user.dob || '');
    setFilteredUsers([]);
    setUserSearch(user.name);
  };

  const handleImageUpload = async (phoneNumber) => {
    if (!image) return null;

    const imageRef = ref(storage, `birthdayImages/${phoneNumber}`);
    await uploadBytes(imageRef, image);
    const url = await getDownloadURL(imageRef);
    return url;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!phone) return alert('Phone number is required');

    try {
      const imageUrl = await handleImageUpload(phone);

      const data = {
        name,
        phone,
        email: orbiteremail,
        dob,
        imageUrl,
        registeredAt: new Date()
      };

      await setDoc(doc(db, COLLECTIONS.birthdayCanva, phone), data);

      alert("User registered successfully in birthdaycanva!");

      // Clear form
      setName('');
      setPhone('');
      setOrbiterEmail('');
      setDob('');
      setImage(null);
      setUserSearch('');
    } catch (error) {
      console.error("Error registering user:", error);
      alert('Error registering user');
    }
  };

  return (
    <Layout>
    <section className='c-form box'>
      <div>
        <h2>Add New Prospects</h2>
        <ul>

          <li className='form-row'>
            <h4>Select MentOrbiter:<sup>*</sup></h4>
            <div className='autosuggest'>
              <input
                type="text"
                placeholder="Search Orbiter"
                value={userSearch}
                onChange={handleSearchUser}
              />
              {filteredUsers.length > 0 && (
                <ul className="dropdown">
                  {filteredUsers.map(user => (
                    <li key={user.id} onClick={() => handleSelectUser(user)}>
                      {user.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </li>

          <li className='form-row'>
            <h4>Selected MentOrbiter Name:<sup>*</sup></h4>
            <div className='multipleitem'><p>{name}</p></div>
          </li>

          <li className='form-row'>
            <h4>Selected MentOrbiter's Phone:<sup>*</sup></h4>
            <div className='multipleitem'><p>{phone}</p></div>
          </li>

          <li className='form-row'>
            <h4>Selected MentOrbiter Email:<sup>*</sup></h4>
            <div className='multipleitem'><p>{orbiteremail}</p></div>
          </li>

          <li className='form-row'>
            <h4>Date of Birth:<sup>*</sup></h4>
            <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
          </li>
<li className='form-row'>
  <h4>Upload Image:<sup>*</sup></h4>
  <input
    type="file"
    accept="image/*"
    style={{ display: 'block', border: '1px solid #ccc', padding: '10px' }}
    onChange={(e) => setImage(e.target.files[0])}
  />
</li>
{image && <img src={URL.createObjectURL(image)} alt="Preview" width="150" />}

          <li className='form-row'>
            <div className='multipleitem'>
              <button className='submitbtn' onClick={handleSubmit}>Register</button>
            </div>
          </li>

        </ul>
      </div>
    </section>
    </Layout>
  );
};

export default AddBirthday;
