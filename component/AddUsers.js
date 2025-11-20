import { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { useRouter } from 'next/router';
import { COLLECTIONS } from "/utility_collection";
import "../src/app/styles/main.scss";
import Layout from './Layout';

const AddUser = ({ fetchData, eventId: propEventId, data }) => {
  const router = useRouter();
  const eventId = propEventId || router.query.eventId;

    const [phone, setPhone] = useState('');
    const [name, setName] = useState('');
    const [interests, setInterests] = useState({
        knowledgeSharing: false,
        e2a: false,
        oneToOne: false,
        none: false
    });
    const [type, setType] = useState('');
    const [userList, setUserList] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [userSearch, setUserSearch] = useState('');

    // Fetch users from Firestore
    useEffect(() => {
        const fetchUsers = async () => {
            const userCollection = collection(db,'userdetails');
            const userSnapshot = await getDocs(userCollection);
            const userList = userSnapshot.docs.map(doc => ({
                id: doc.id, 
                name: doc.data()[" Name"], // Ensure correct field name for name
                phone: doc.data()["Mobile no"] // Correctly accessing the 'Mobile no' field for phone number
            }));
            setUserList(userList);
        };
        fetchUsers();
    }, []);

    // Handle Search Input
    const handleSearchUser = (e) => {
        const query = e.target.value;
        setUserSearch(query);
        setFilteredUsers(
            userList.filter(user => user.name?.toLowerCase().includes(query.toLowerCase()))
        );
    };

    // Handle Selecting a User
    const handleSelectUser = (user) => {
        setName(user.name); // Set the selected name
        setPhone(user.phone); // Set the selected phone number
        setUserSearch(''); // Clear the search field
        setFilteredUsers([]); // Clear filtered results
    };

    // Handle Checkbox Changes for Interests
    const handleInterestChange = (e) => {
        const { name, checked } = e.target;
        setInterests(prevState => ({
            ...prevState,
            [name]: checked
        }));
    };

    // Handle Dropdown Change for Type
    const handleTypeChange = (e) => {
        setType(e.target.value);
    };
    const sendWhatsAppMessage = async (userPhone, eventId) => {
        const url = `https://graph.facebook.com/v21.0/527476310441806/messages`;
    
        const payload = {
            messaging_product: "whatsapp",
            to: `91${userPhone}`, 
            type: "template",
            template: {
                name: "register_mm",  // The name of your template
                language: { code: "en" },
                components: [
                    {
                        type: "body",
                        parameters: [
                            {
                                type: "text",
                                text: `https://uspacex.vercel.app/events/${eventId}`
                            }
                        ]
                    }
                ]
            }
        };
    
        try {
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    Authorization: `EAAHwbR1fvgsBOwUInBvR1SGmVLSZCpDZAkn9aZCDJYaT0h5cwyiLyIq7BnKmXAgNs0ZCC8C33UzhGWTlwhUarfbcVoBdkc1bhuxZBXvroCHiXNwZCZBVxXlZBdinVoVnTB7IC1OYS4lhNEQprXm5l0XZAICVYISvkfwTEju6kV4Aqzt4lPpN8D3FD7eIWXDhnA4SG6QZDZD`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });
    
            const result = await response.json();
            if (!response.ok) {
                console.error('WhatsApp API Error:', result);
            } else {
                console.log('Message sent successfully:', result);
            }
        } catch (error) {
            console.error("Failed to send WhatsApp message:", error);
        }
    };
    
    
   
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!name || !phone || !type) {
            alert('Please fill all fields');
            return;
        }

        if (!eventId) {
            alert('Event ID not found in URL');
            return;
        }

        const userRef = doc(db, `MonthlyMeeting/${eventId}/registeredUsers/${phone}`);

        try {
            await setDoc(userRef, {
                name,
                phone,
                interestedIn: interests,
                type,
                registeredAt: new Date()
            });

            await sendWhatsAppMessage(phone, eventId);

            alert('User registered successfully!');
            router.push(`/admin/event/RegisteredUser/${eventId}`);
        } catch (error) {
            console.error("Error registering user:", error);
            alert('Error registering user');
        }
    };
    return (
        <>
            
      
            <div>
                <h2>Add User to Event</h2>
              
                <ul>
                    <li className='form-row'>
                        <h4>Select User:<sup>*</sup></h4>
                        <div className='autosuggest'>
                            <input
                                type="text"
                                placeholder="Search User"
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
                        <h4>Selected Name:<sup>*</sup></h4>
                        <div className='multipleitem'>
                            <p>{name}</p>
                        </div>
                    </li>
                    <li className='form-row'>
                        <h4>Selected Phone:<sup>*</sup></h4>
                        <div className='multipleitem'>
                            <p>{phone}</p>
                        </div>
                    </li>

                    {/* Interests (Multiple Selection) */}
                    <li className='form-row'>
                        <h4>Interested In:</h4>
                        <div className='multipleitem'>
                            <label>
                                <input
                                    type="checkbox"
                                    name="knowledgeSharing"
                                    checked={interests.knowledgeSharing}
                                    onChange={handleInterestChange}
                                />
                                Knowledge Sharing
                            </label>
                            <label>
                                <input
                                    type="checkbox"
                                    name="e2a"
                                    checked={interests.e2a}
                                    onChange={handleInterestChange}
                                />
                                E2A
                            </label>
                            <label>
                                <input
                                    type="checkbox"
                                    name="oneToOne"
                                    checked={interests.oneToOne}
                                    onChange={handleInterestChange}
                                />
                                1:1
                            </label>
                            <label>
                                <input
                                    type="checkbox"
                                    name="none"
                                    checked={interests.none}
                                    onChange={handleInterestChange}
                                />
                                None
                            </label>
                        </div>
                    </li>

                    {/* Type Dropdown */}
                    <li className='form-row'>
                        <h4>Select Type:</h4>
                        <div className='multipleitem'>
                            <select value={type} onChange={handleTypeChange}>
                                <option value="">Select Type</option>
                                <option value="A">Type A</option>
                                <option value="B">Type B</option>
                                <option value="C">Type C</option>
                            </select>
                        </div>
                    </li>
                </ul>
                <ul>
      <li className='form-row'>
        <div className='multipleitem'>   
                <button className='submitbtn' onClick={handleSubmit}>Register & Send</button>
            </div>
            </li>
            </ul>   
            </div>
      
        </>
    );
};

export default AddUser;
