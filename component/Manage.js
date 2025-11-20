import { useEffect, useState } from 'react';
import { db } from '../firebaseConfig';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { format } from 'date-fns';
import { COLLECTIONS } from "/utility_collection";
import { FaRegCopy } from "react-icons/fa6";
import { useRouter } from 'next/router';
import { CiEdit } from "react-icons/ci";
import { GrFormView } from "react-icons/gr";

const ManageEvents = () => {
    const router = useRouter();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Fetch all events from the 'monthlymeet' collection
    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const eventCollection = collection(db, COLLECTIONS.monthlyMeeting);
                const eventSnapshot = await getDocs(eventCollection);
                const eventList = eventSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setEvents(eventList);
            } catch (error) {
                console.error('Error fetching events:', error);
                setError('Error fetching events. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        fetchEvents();
    }, []);

    const handleViewUsers = (eventId) => {
        router.push(`/admin/event/RegisteredUser/${eventId}`);
    };

    const handleEditEvent = (eventId) => {
        router.push(`/admin/event/edit/${eventId}`); // Navigate to edit page
    };

    const handleDeleteEvent = async (eventId) => {
        try {
            await deleteDoc(doc(db, COLLECTIONS.monthlyMeeting, eventId));
            setEvents(prevEvents => prevEvents.filter(event => event.id !== eventId));
            alert('Event deleted successfully!');
        } catch (error) {
            console.error('Error deleting event:', error);
            setError('Error deleting event. Please try again.');
        }
    };

    const handleCopyEventLink = (eventId) => {
        const eventLink = `https://uspacex.vercel.app/events/${eventId}`;
        navigator.clipboard.writeText(eventLink).then(() => {
            alert('Event link copied to clipboard!');
        }).catch(err => {
            console.error('Error copying event link:', err);
        });
    };

    const formatTime = (timestamp) => {
        if (timestamp && timestamp.seconds) {
            return format(new Date(timestamp.seconds * 1000), 'dd/MM/yyyy HH:mm');
        }
        return 'Invalid time';
    };
const sortedEvents = [...events].sort((a, b) => {
  const dateA = a.time?.toDate?.();
  const dateB = b.time?.toDate?.();
  return dateB - dateA; // latest to oldest
});

    return (
        <>
          {loading && <div className='loader'> <span className="loader2"></span> </div>}
            <section className='c-userslist box'>
                <h2>Events Listing</h2>
                <button className="m-button-5" onClick={() => window.history.back()}>
                    Back
                </button>
                <table className='table-class'>
                  
                    {error && <p style={{ color: 'red' }}>{error}</p>}
                    
                    {/* Event Table */}
                    <thead>
                        <tr>
                            <th>Sr no</th>
                            <th>Event Name</th>
                            <th>Time</th>
                            <th>Zoom Link</th>
                            <th>Copy Event Link</th> 
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedEvents.map((event, index) => (
                            <tr key={event.id}>
                                <td>{index + 1}</td>
                                <td>{event.Eventname}</td>
                                <td>{formatTime(event.time)}</td>
                                <td>
                                    <a href={event.zoomLink} target="_blank" rel="noreferrer">Join Meeting</a>
                                </td>
                                <td>
                                    
                                    <button 
                                        className="m-button-7" 
                                        onClick={() => handleCopyEventLink(event.id)} 
                                        style={{ marginLeft: '10px', backgroundColor: '#e2e2e2', color: 'black' }}>
                                       <FaRegCopy/> Copy 
                                    </button>
                                </td>
                                <td style={{ padding: '10px', border: '1px solid #ddd' }}>
    <div className="twobtn">
        {/* <button 
            className="m-button-7" 
            onClick={() => handleViewUsers(event.id)} 
            style={{ marginLeft: '10px', backgroundColor: '#e2e2e2', color: 'black' }}>
            <GrFormView/> View
        </button> */}
        <button 
            className="m-button-7" 
            onClick={() => handleEditEvent(event.id)} 
            style={{ marginLeft: '10px', backgroundColor: '#f16f06', color: 'white' }}>
            <CiEdit/> Edit
        </button>
        {/* <button 
            className="m-button-7" 
            onClick={() => router.push(`/admin/addusers/${event.id}`)}
            style={{ marginLeft: '10px',backgroundColor: '#e2e2e2', color: 'black' }}>
             Add User
        </button> */}
    </div>
</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>
        </>
    );
};

export default ManageEvents;
