import { useEffect, useState } from 'react';
import { db } from '../firebaseConfig';
import {
  collection,
  getDocs,
  doc,
  getDoc,addDoc,setDoc,
  updateDoc,
  arrayUnion,
  query,
  orderBy,
  onSnapshot,
  where,
  serverTimestamp
} from 'firebase/firestore';
import { useRouter } from 'next/router';
import Layout from './Layout';
import "../src/app/styles/main.scss";
import { IoMdClose } from "react-icons/io";
import { COLLECTIONS } from "/utility_collection";
import ExportToExcel from '../ExporttoExcel';
import Modal from 'react-modal';
import { FaSearch } from "react-icons/fa";

Modal.setAppElement('#__next');

const customStyles = {
  content: { 
    top: '50%',
    left: '50%',
    right: 'auto',
    bottom: 'auto',
    transform: 'translate(-50%, -50%)',
    width: '80%',
    maxWidth: '500px',
    border: '1px solid #ccc',
    borderRadius: '8px',
    padding: '20px',
  },
};

const RegisteredUsers = ({ eventId }) => {
  const router = useRouter();

  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
const CP_ACTIVITY_FOR_MM = {
  activityNo: "071",
  activityName: "MonthlyMeeting Participation",
  points: 100,
  purpose: "Attending and participating in MM",
};

  const [registeredNumberFilter, setRegisteredNumberFilter] = useState('');
  const [userNameFilter, setUserNameFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const [markedAttendance, setMarkedAttendance] = useState({});
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [addFeedbackModalIsOpen, setAddFeedbackModalIsOpen] = useState(false);

  const [selectedUserName, setSelectedUserName] = useState('');
  const [selectedFeedbacks, setSelectedFeedbacks] = useState([]);
  const [currentUserId, setCurrentUserId] = useState('');

  const [predefinedFeedback, setPredefinedFeedback] = useState('');
  const [customFeedback, setCustomFeedback] = useState('');

  const predefinedFeedbacks = [
    "Available",
    "Not Available",
    "Not Connected Yet",
    "Called but no response",
    "Tentative",
    "Other response",
  ];

  // ✅ REAL FIX HERE — Correctly fetch name/category using MobileNo
  useEffect(() => {
    if (!router.isReady || !eventId) return;

    const registeredUsersRef = collection(
      db,
      `${COLLECTIONS.monthlyMeeting}/${eventId}/registeredUsers`
    );

    const usersQuery = query(registeredUsersRef, orderBy('registeredAt', 'desc'));

    const unsubscribe = onSnapshot(usersQuery, async (snapshot) => {
      if (snapshot.empty) {
        setRegisteredUsers([]);
        return;
      }

      const rawUsers = snapshot.docs.map((doc) => ({
        id: doc.id,   // phone number
        ...doc.data(),
      }));

      const enrichedUsers = await Promise.all(
        rawUsers.map(async (user) => {
          const phone = user.id;

          // 🔥 FIX: since userdetails docId = UJB Code, find via MobileNo
          const q = query(
            collection(db, COLLECTIONS.userDetail),
            where("MobileNo", "==", phone)
          );

          const snap = await getDocs(q);
          let userData = {};

          if (!snap.empty) {
            userData = snap.docs[0].data();
          }

          return {
            id: phone,
            name: userData["Name"] || "Unknown",
            ujbcode: userData["UJBCode"] || "Unknown",
            category: userData["Category"] || "Unknown",
            ...user,
          };
        })
      );

      setRegisteredUsers(enrichedUsers);
    });

    return () => unsubscribe();
  }, [router.isReady, eventId]);
const hasCpAlreadyAdded = async (ujbCode, eventId) => {
  const q = query(
    collection(db, "CPBoard", ujbCode, "activities"),
    where("sourceEventId", "==", eventId),
    where("activityNo", "==", CP_ACTIVITY_FOR_MM.activityNo)
  );

  const snap = await getDocs(q);
  return !snap.empty;
};
const addCpPointsForAttendance = async (user) => {
  const ujbCode = user.ujbcode;
  if (!ujbCode) return;

  // ✅ ENSURE CPBOARD USER EXISTS FIRST
  await ensureCpBoardUser(user);

  // 🔐 Prevent duplicate CP
  const q = query(
    collection(db, "CPBoard", ujbCode, "activities"),
    where("sourceEventId", "==", eventId),
    where("activityNo", "==", "071")
  );

  const snap = await getDocs(q);
  if (!snap.empty) return;

  // ✅ ADD ACTIVITY UNDER SAME USER
  await addDoc(collection(db, "CPBoard", ujbCode, "activities"), {
    activityNo: "071",
    activityName: "Participation in Large Group Events",
    points: 100,
    purpose: "Acknowledges consistent presence in monthly community engagements.",
    sourceEventId: eventId,
    source: "MonthlyMeeting",
    month: new Date().toLocaleString("default", {
      month: "short",
      year: "numeric",
    }),
    addedAt: serverTimestamp(),
  });
};
const ensureCpBoardUser = async (user) => {
  const ref = doc(db, "CPBoard", user.ujbcode);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, {
      id: user.ujbcode,
      name: user.name,
      phoneNumber: user.id, // phone number
      role: user.category || "CosmOrbiter",
      createdAt: serverTimestamp(),
    });
  }
};


  // Filters
  useEffect(() => {
    const filtered = registeredUsers.filter((user) =>
      (user.id || '').toLowerCase().includes(registeredNumberFilter.toLowerCase()) &&
      (user.name || '').toLowerCase().includes(userNameFilter.toLowerCase()) &&
      (user.category || '').toLowerCase().includes(categoryFilter.toLowerCase())
    );
    setFilteredUsers(filtered);
  }, [registeredUsers, registeredNumberFilter, userNameFilter, categoryFilter]);

  const handleSearchChange = (e, setter) => setter(e.target.value);

  // Feedback modals
  const openModal = (fb, name) => {
    setSelectedFeedbacks(fb || []);
    setSelectedUserName(name);
    setModalIsOpen(true);
  };

  const closeModal = () => setModalIsOpen(false);

  const openAddFeedbackModal = (id, name) => {
    setCurrentUserId(id);
    setSelectedUserName(name);
    setAddFeedbackModalIsOpen(true);
  };

  const closeAddFeedbackModal = () => {
    setAddFeedbackModalIsOpen(false);
    setPredefinedFeedback('');
    setCustomFeedback('');
  };

  const updateFeedback = async (userId, feedbackEntry) => {
    const ref = doc(
      db,
      `${COLLECTIONS.monthlyMeeting}/${eventId}/registeredUsers`,
      userId
    );

    await updateDoc(ref, {
      feedback: arrayUnion(feedbackEntry),
    });

    alert("Feedback submitted successfully!");
  };

  const submitAddFeedback = async () => {
    if (!predefinedFeedback && !customFeedback) {
      alert("Please provide feedback.");
      return;
    }

    const entry = {
      predefined: predefinedFeedback || "None",
      custom: customFeedback || "None",
      timestamp: new Date().toLocaleString(),
    };

    await updateFeedback(currentUserId, entry);
    closeAddFeedbackModal();
  };

  // Attendance
const markAttendance = async (phone) => {
  const ref = doc(
    db,
    `${COLLECTIONS.monthlyMeeting}/${eventId}/registeredUsers`,
    phone
  );

  await updateDoc(ref, {
    attendanceStatus: true,
    timestamp: serverTimestamp(),
  });

  setMarkedAttendance((prev) => ({ ...prev, [phone]: true }));

  const user = registeredUsers.find((u) => u.id === phone);
  if (user) {
    await addCpPointsForAttendance(user);
  }
};

  useEffect(() => {
    if (!eventId) return;

    const fetchAttendance = async () => {
      const snap = await getDocs(
        collection(db, `${COLLECTIONS.monthlyMeeting}/${eventId}/registeredUsers`)
      );

      const map = {};
      snap.forEach((d) => {
        map[d.id] = d.data().attendanceStatus || false;
      });

      setMarkedAttendance(map);
    };

    fetchAttendance();
  }, [eventId]);

  // Meeting Done → Send thanks message
  const handleMeetingDone = async () => {
    const accessToken = "YOUR_META_TOKEN";
    const phoneNumberId = "527476310441806";

    const q = query(
      collection(db, `${COLLECTIONS.monthlyMeeting}/${eventId}/registeredUsers`),
      where("attendanceStatus", "==", true)
    );

    const snapshot = await getDocs(q);

    for (const docSnap of snapshot.docs) {
      const phone = docSnap.id;

      // find user by phone
      const q2 = query(
        collection(db, COLLECTIONS,userDetail),
        where("MobileNo", "==", phone)
      );

      const snap2 = await getDocs(q2);

      const name = !snap2.empty
        ? snap2.docs[0].data()[" Name"] || "there"
        : "there";

      await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: `91${phone}`,
          type: "template",
          template: {
            name: "post_thankyou_mm",
            language: { code: "en" },
            components: [
              {
                type: "body",
                parameters: [{ type: "text", text: name }],
              },
            ],
          },
        }),
      });
    }

    alert("Thank you messages sent!");
  };

  return (
    <>
      <div className="twobtn">
        <ExportToExcel eventId={eventId} />
        <button className="m-button-7" onClick={handleMeetingDone}>
          Meeting Done
        </button>
      </div>

      <button className="m-button-5" onClick={() => window.history.back()}>
        Back
      </button>

      <table className="table-class">
        <thead>
          <tr>
            <th>Sr No</th>
            <th>Registered Number</th>
            <th>User Name</th>
            <th>Category</th>
            <th>Feedback</th>
            <th>Attendance</th>
          </tr>

          <tr>
            <th></th>

            <th>
              <input
                placeholder="Search Number"
                value={registeredNumberFilter}
                onChange={(e) => handleSearchChange(e, setRegisteredNumberFilter)}
              />
            </th>

            <th>
              <input
                placeholder="Search Name"
                value={userNameFilter}
                onChange={(e) => handleSearchChange(e, setUserNameFilter)}
              />
            </th>

            <th>
              <input
                placeholder="Search Category"
                value={categoryFilter}
                onChange={(e) => handleSearchChange(e, setCategoryFilter)}
              />
            </th>

            <th></th>
            <th></th>
          </tr>
        </thead>

        <tbody>
          {filteredUsers.map((user, index) => (
            <tr key={user.id}>
              <td>{index + 1}</td>
              <td>{user.id}</td>
              <td>{user.name}</td>
              <td>{user.category}</td>

              <td>
                <button onClick={() => openModal(user.feedback, user.name)}>
                  View
                </button>
                <button onClick={() => openAddFeedbackModal(user.id, user.name)}>
                  Add
                </button>
              </td>

              <td>
                {markedAttendance[user.id] ? (
                  <button disabled>Marked</button>
                ) : (
                  <button onClick={() => markAttendance(user.id)}>
                    Mark Present
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* View Feedback Modal */}
      <Modal isOpen={modalIsOpen} onRequestClose={closeModal}>
        <button onClick={closeModal}><IoMdClose /></button>
        <h2>Feedback for {selectedUserName}</h2>

        {selectedFeedbacks.length ? (
          <table>
            <thead>
              <tr>
                <th>Sr No</th>
                <th>Predefined</th>
                <th>Custom</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {selectedFeedbacks.map((fb, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>{fb.predefined}</td>
                  <td>{fb.custom}</td>
                  <td>{fb.timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <>No feedback available.</>
        )}
      </Modal>

      {/* Add Feedback Modal */}
      <Modal isOpen={addFeedbackModalIsOpen} onRequestClose={closeAddFeedbackModal}>
        <button onClick={closeAddFeedbackModal}><IoMdClose /></button>
        <h2>Add Feedback for {selectedUserName}</h2>

        <select
          value={predefinedFeedback}
          onChange={(e) => setPredefinedFeedback(e.target.value)}
        >
          <option value="">Select Feedback</option>
          {predefinedFeedbacks.map((fb, i) => (
            <option key={i}>{fb}</option>
          ))}
        </select>

        <textarea
          value={customFeedback}
          onChange={(e) => setCustomFeedback(e.target.value)}
          placeholder="Custom feedback"
        />

        <button onClick={submitAddFeedback}>Submit</button>
      </Modal>
    </>
  );
};

export default RegisteredUsers;
