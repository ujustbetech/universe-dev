import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, collection, Timestamp, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { COLLECTIONS } from "/utility_collection";

const TopicSection = (props) => {
  const [sections, setSections] = useState(props?.data?.topicSections || []);
  const [titleOfTheDay, setTitleOfTheDay] = useState(props?.data?.titleOfTheDay || '');
   const [description, setDescription] = useState(props?.data?.description || '');
  const [facilitatorSearch, setFacilitatorSearch] = useState([]);
  const [userList, setUserList] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);

  useEffect(() => {
    setFacilitatorSearch(sections.map(section => section.facilitator || ''));
  }, [sections]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const userRef = collection(db, COLLECTIONS.userDetail);
        const snapshot = await getDocs(userRef);
        const users = snapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data()["Name"],
        }));
        setUserList(users);
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };

    fetchUsers();
  }, []);

  const handleSearchFacilitator = (index, value) => {
    const updatedSearch = [...facilitatorSearch];
    updatedSearch[index] = value;
    setFacilitatorSearch(updatedSearch);

    const matchedUsers = userList.filter(user =>
      user.name?.toLowerCase().includes(value.toLowerCase())
    );

    const updatedFiltered = [...filteredUsers];
    updatedFiltered[index] = matchedUsers;
    setFilteredUsers(updatedFiltered);
  };

  const handleSelectFacilitator = (index, name) => {
    const updatedSearch = [...facilitatorSearch];
    updatedSearch[index] = name;
    setFacilitatorSearch(updatedSearch);
    setFilteredUsers([]);

    setSections(prev =>
      prev.map((sec, i) =>
        i === index ? { ...sec, facilitator: name } : sec
      )
    );
  };

  const handleAddSection = () => {
    setSections([...sections, { id: Date.now(), facilitator: '', Desc: '' }]);
    setFacilitatorSearch([...facilitatorSearch, '']);
  };

  const handleDescChange = (index, value) => {
    setSections(prev => prev.map((sec, i) => i === index ? { ...sec, Desc: value } : sec));
  };

  const handleRemoveSection = async (index) => {
    const sectionToRemove = sections[index];
    if (sectionToRemove.facilitator) {
      try {
        const eventRef = doc(db, COLLECTIONS.monthlyMeeting, props.eventID);
        const docSnap = await getDoc(eventRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          const updatedFacilitators = data.topicSections.filter((_, i) => i !== index);
          await updateDoc(eventRef, { topicSections: updatedFacilitators });
          console.log('Deleted from Firestore');
        }
      } catch (error) {
        console.error('Error deleting section from Firestore:', error);
      }
    }

    const newSections = sections.filter((_, i) => i !== index);
    setSections(newSections);
    setFacilitatorSearch(facilitatorSearch.filter((_, i) => i !== index));
  };

  const updateTopicSections = async () => {
    try {
      const eventRef = doc(db, COLLECTIONS.monthlyMeeting, props.eventID);
      await updateDoc(eventRef, {
        topicSections: sections,
        titleOfTheDay: titleOfTheDay,
         description: description,
      });
      console.log('Topic sections updated successfully');
      props.fetchData(1);
    } catch (error) {
      console.error('Error updating topic sections:', error);
    }
  };

  return (
    <div className='content-wrapper'>
      <h3>Topic of the Day Section</h3>

      {/* Title of the Day Field */}
      <div className='form-row'>
        <label><strong>Title of the Day:</strong><sup>*</sup></label>
        <input
          type="text"
          placeholder="Enter title of the day"
          value={titleOfTheDay}
          onChange={(e) => setTitleOfTheDay(e.target.value)}
          className='title-input'
        />
      </div>
  <div className='form-row'>
        <label><strong>Description:</strong><sup>*</sup></label>
        <input
          type="text"
          placeholder="Enter Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className='title-input'
        />
      </div>
    


      <ul>
        <li className="form-row">
          <div className="multipleitem">
            <button className="submitbtn" onClick={updateTopicSections}>Save</button>
          </div>
        </li>
      </ul>
    </div>
  );
};

export default TopicSection;
