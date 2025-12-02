// component/referral/ReferralInfoCard.js
import React, { useState } from "react";

export default function ReferralInfoCard({ referralData, onUploadLeadDoc }) {
  const [uploading, setUploading] = useState(false);

  const description =
    referralData.description ||
    referralData.dealDescription ||
    referralData.leadDescription ||
    "";

  const leadDocs = (referralData.supportingDocs || []).filter(
    (d) => d.type === "lead"
  );

  const createdAt =
    referralData.createdAt?.seconds
      ? new Date(referralData.createdAt.seconds * 1000).toLocaleString()
      : referralData.createdAt
      ? new Date(referralData.createdAt).toLocaleString()
      : "—";

  const handleLeadDocChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !onUploadLeadDoc) return;
    setUploading(true);
    const res = await onUploadLeadDoc(file);
    if (res?.error) alert(res.error);
    setUploading(false);
  };

  return (
    <div className="card referralInfoCard">
      <h3>Referral Info</h3>

      <p>
        <strong>Referral ID:</strong>{" "}
        {referralData.referralId || referralData.id || "—"}
      </p>

      {description && (
        <p>
          <strong>Deal / Lead Description:</strong>
          <br />
          {description}
        </p>
      )}

      <p>
        <strong>Source:</strong> {referralData.referralSource || "—"}
      </p>

      <p>
        <strong>Created:</strong> {createdAt}
      </p>

      <div className="uploadSection">
        <h4>Lead Documents</h4>

        {leadDocs.length ? (
          <ul className="docList">
            {leadDocs.map((d, i) => (
              <li key={i}>
                <a
                  href={d.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {d.name || `Lead Document ${i + 1}`}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="smallHint">No lead documents uploaded yet.</p>
        )}

        <label className="fileUploadLabel">
          Upload Lead Document
          <input
            type="file"
            accept="application/pdf,image/*"
            onChange={handleLeadDocChange}
            disabled={uploading}
          />
        </label>

        {uploading && (
          <p className="uploadingText">Uploading lead document...</p>
        )}
      </div>
    </div>
  );
}
