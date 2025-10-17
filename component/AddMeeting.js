import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { db } from '../firebaseConfig';
import {
  doc,
  getDoc,
  updateDoc,
  Timestamp
} from 'firebase/firestore';
import Layout from './Layout';

const EditMeeting = () => {
  const router = useRouter();
  const { id, conclaveId } = router.query;

  const [form, setForm] = useState({
    meetingName: '',
    datetime: '',
    agenda: '',
    mode: 'online',
    link: '',
    venue: ''
  });

  useEffect(() => {
    const fetchMeeting = async () => {
      if (!id || !conclaveId) return;

      try {
        const docRef = doc(db, 'Conclaves', conclaveId, 'meetings', id);
        const snap = await getDoc(docRef);

        if (snap.exists()) {
          const data = snap.data();
          setForm({
            meetingName: data.meetingName || '',
            datetime: data.datetime?.seconds
              ? new Date(data.datetime.seconds * 1000).toISOString().slice(0, 16)
              : '',
            agenda: data.agenda || '',
            mode: data.mode || 'online',
            link: data.link || '',
            venue: data.venue || ''
          });
        } else {
          alert('Meeting not found');
        }
      } catch (err) {
        console.error("Error fetching meeting:", err);
      }
    };

    fetchMeeting();
  }, [id, conclaveId]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();

    try {
      const docRef = doc(db, 'Conclaves', conclaveId, 'meetings', id);
      await updateDoc(docRef, {
        meetingName: form.meetingName,
        datetime: Timestamp.fromDate(new Date(form.datetime)),
        agenda: form.agenda,
        mode: form.mode,
        link: form.mode === 'online' ? form.link : '',
        venue: form.mode === 'offline' ? form.venue : ''
      });

      alert("Meeting updated");
      router.back();
    } catch (err) {
      console.error("Update failed:", err);
      alert("Error updating meeting");
    }
  };

  return (
   <>
      <section className='c-form box'>
        <h2>Edit Meeting</h2>
        <form onSubmit={handleUpdate}>
          <ul>
            <li className="form-row">
              <h4>Meeting Name</h4>
              <div className="multipleitem">
                <input
                  type="text"
                  name="meetingName"
                  value={form.meetingName}
                  onChange={handleChange}
                  required
                />
              </div>
            </li>

            <li className="form-row">
              <h4>Date & Time</h4>
              <div className="multipleitem">
                <input
                  type="datetime-local"
                  name="datetime"
                  value={form.datetime}
                  onChange={handleChange}
                  required
                />
              </div>
            </li>

            <li className="form-row">
              <h4>Agenda</h4>
              <div className="multipleitem">
                <textarea
                  name="agenda"
                  value={form.agenda}
                  onChange={handleChange}
                  required
                />
              </div>
            </li>

            <li className="form-row">
              <h4>Mode</h4>
              <div className="multipleitem">
                <select
                  name="mode"
                  value={form.mode}
                  onChange={handleChange}
                >
                  <option value="online">Online</option>
                  <option value="offline">Offline</option>
                </select>
              </div>
            </li>

            {form.mode === 'online' && (
              <li className="form-row">
                <h4>Meeting Link</h4>
                <div className="multipleitem">
                  <input
                    type="url"
                    name="link"
                    value={form.link}
                    onChange={handleChange}
                    required
                  />
                </div>
              </li>
            )}

            {form.mode === 'offline' && (
              <li className="form-row">
                <h4>Venue</h4>
                <div className="multipleitem">
                  <input
                    type="text"
                    name="venue"
                    value={form.venue}
                    onChange={handleChange}
                    required
                  />
                </div>
              </li>
            )}

            <li className="form-row">
              <div className="multipleitem">
                <button type="submit" className="submitbtn">Update Meeting</button>
              </div>
            </li>
          </ul>
        </form>
      </section>
    </>
  );
};

export default EditMeeting;
