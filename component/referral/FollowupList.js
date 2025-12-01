// components/referral/FollowupList.js
import React, { useState } from "react";

export default function FollowupList({ followups = [], onEdit, onDelete }) {
  const [show, setShow] = useState(true);

  return (
    <div className="followupContainer">
      <div
        className="followupHeader"
        onClick={() => setShow((prev) => !prev)}
      >
        <h2>Follow Ups</h2>
        <span>{show ? "▲" : "▼"}</span>
      </div>

      {show && (
        <div className="followupContent">
          {followups.length > 0 ? (
            followups.map((f, i) => (
              <div className="followupCard" key={i}>
                <div className="followupCardHeader">
                  <span
                    className={`priorityBadge ${f.priority
                      ?.toLowerCase()
                      .trim()}`}
                  >
                    {f.priority}
                  </span>
                  <span className="statusTag">{f.status}</span>
                </div>
                <p>
                  <strong>Date:</strong> {f.date}
                </p>
                <p>
                  <strong>Description:</strong> {f.description}
                </p>
                <div className="followupActions">
                  <button onClick={() => onEdit(i)}>Edit</button>
                  <button onClick={() => onDelete(i)}>Delete</button>
                </div>
              </div>
            ))
          ) : (
            <p className="noFollowupText">No follow-ups yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
