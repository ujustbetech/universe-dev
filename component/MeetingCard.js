// components/MeetingCard.js
import Link from 'next/link';
import { convertToDate, formatTimeLeft } from '../utils';
import { useEffect, useState } from 'react';

const MeetingCard = ({ meeting, type }) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const eventDate = convertToDate(meeting.time);
      const msLeft = eventDate - now;
      setTimeLeft(formatTimeLeft(msLeft));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // update every minute
    return () => clearInterval(interval);
  }, [meeting]);

  const eventDate = convertToDate(meeting.time);
  const isJoinable = eventDate > new Date() && eventDate - new Date() <= 60 * 60 * 1000;

  return (
    <div className="meetingBox">
      <div className="suggestionDetails">
        <span className={timeLeft === 'Meeting Ended' ? "meetingLable2" : "meetingLable3"}>
          {timeLeft === 'Meeting Ended' ? 'Meeting Done' : timeLeft}
        </span>
        <span className="suggestionTime">
          {eventDate.toLocaleString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          }).replace(',', ' at')}
        </span>
      </div>
      <div className="meetingDetailsBox">
        <h3 className="eventName">{meeting.Eventname || meeting.name || 'N/A'}</h3>
      </div>
      <div className="meetingBoxFooter">
        <div className="viewDetails">
          <Link href={type === 'monthly' ? `/MonthlyMeeting/${meeting.id}` : `/events/${meeting.id}`}>
            View Details
          </Link>
        </div>
        {isJoinable && meeting.zoomLink && (
          <div className="meetingLink">
            <a href={meeting.zoomLink} target="_blank" rel="noopener noreferrer">
              <span>Join Meeting</span>
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default MeetingCard;
