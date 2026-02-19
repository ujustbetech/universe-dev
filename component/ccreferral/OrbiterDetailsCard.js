// component/referral/OrbiterDetailsCard.js
import React from "react";

function Avatar({ name, photoURL }) {
  const initial = name?.[0]?.toUpperCase() || "?";
  return (
    <div className="avatarCircle">
      {photoURL ? (
        <img src={photoURL} alt={name || "Avatar"} />
      ) : (
        <span>{initial}</span>
      )}
    </div>
  );
}

export default function OrbiterDetailsCard({ orbiter, referralData }) {
  if (!orbiter) return null;

  const totalEarned =
    Number(referralData?.paidToOrbiter || 0) +
    Number(referralData?.paidToOrbiterMentor || 0);

  const adjustmentRemaining =
    orbiter.payment?.orbiter?.adjustmentRemaining ?? 0;

  return (
    <div className="card orbiterDetailsCard">
      <h3>Orbiter</h3>

      <div className="profileHeaderRow">
        <Avatar name={orbiter.name} photoURL={orbiter.photoURL} />
        <div>
          <p className="profileName">{orbiter.name}</p>
          <p className="profileSub">
            UJB Code: {orbiter.UJBCode || "—"}
          </p>
        </div>
      </div>

      <p>
        <strong>Phone:</strong> {orbiter.phone || "—"}
      </p>
      <p>
        <strong>Email:</strong> {orbiter.email || "—"}
      </p>
      <p>
        <strong>Mentor:</strong> {orbiter.mentorName || "—"}
      </p>

      <hr />

      <p>
        <strong>Total Earned (this referral):</strong>{" "}
        ₹{totalEarned.toLocaleString("en-IN")}
      </p>

      {adjustmentRemaining > 0 && (
        <p>
          <strong>Adjustment Remaining:</strong>{" "}
          ₹{adjustmentRemaining.toLocaleString("en-IN")}
        </p>
      )}
    </div>
  );
}
