// component/referral/CosmoOrbiterDetailsCard.js

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

export default function CosmoOrbiterDetailsCard({ cosmoOrbiter, referralData }) {
  if (!cosmoOrbiter) return null;

  const paidToCosmoMentor = Number(referralData?.paidToCosmoMentor || 0);

  return (
    <div className="card orbiterDetailsCard">
      <h3>Cosmo Orbiter</h3>

      {/* Top Profile */}
      <div className="profileHeaderRow">
        <Avatar name={cosmoOrbiter.name} photoURL={cosmoOrbiter.photoURL} />
        <div>
          <p className="profileName">{cosmoOrbiter.name || "—"}</p>

          <p className="profileSub">
            UJB Code:{" "}
            {cosmoOrbiter.ujbCode || cosmoOrbiter.UJBCode || "—"}
          </p>
        </div>
      </div>

      {/* Details */}
      <p>
        <strong>Phone:</strong> {cosmoOrbiter.phone || "—"}
      </p>

      <p>
        <strong>Email:</strong> {cosmoOrbiter.email || "—"}
      </p>

      <p>
        <strong>Mentor:</strong> {cosmoOrbiter.mentorName || "—"}
      </p>

      <p>
        <strong>Mentor Phone:</strong> {cosmoOrbiter.mentorPhone || "—"}
      </p>

      <hr />

      {/* Payment Info */}
      <p>
        <strong>Total Earned (Cosmo Mentor):</strong>{" "}
        ₹{paidToCosmoMentor.toLocaleString("en-IN")}
      </p>
    </div>
  );
}
