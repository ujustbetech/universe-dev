// components/referral/StatusCard.js
import React from "react";

export default function StatusCard({
  formState,
  setFormState,
  onUpdate,
  statusLogs = [],
}) {
  return (
    <div className="card ReferralStatusCard">
      <div className="cardHeader">
        <h2>Referral Details</h2>
        <span className={`statusBadge ${formState.dealStatus
          ?.toLowerCase()
          .replace(/\s/g, "-")}`}>
          {formState.dealStatus || "Pending"}
        </span>
      </div>

      <div className="cardSection">
        <label>
          Deal Status:
          <select
            name="dealStatus"
            value={formState.dealStatus}
            onChange={(e) =>
              setFormState((prev) => ({
                ...prev,
                dealStatus: e.target.value,
              }))
            }
          >
            <option value="Pending">Pending</option>
            <option value="Reject">Reject</option>
            <option value="Not Connected">Not Connected</option>
            <option value="Called but Not Answered">
              Called but Not Answered
            </option>
            <option value="Discussion in Progress">
              Discussion in Progress
            </option>
            <option value="Hold">Hold</option>
            <option value="Deal Won">Deal Won</option>
            <option value="Deal Lost">Deal Lost</option>
            <option value="Work in Progress">Work in Progress</option>
            <option value="Work Completed">Work Completed</option>
            <option value="Received Part Payment and Transferred to UJustBe">
              Received Part Payment and Transferred to UJustBe
            </option>
            <option value="Received Full and Final Payment">
              Received Full and Final Payment
            </option>
            <option value="Agreed % Transferred to UJustBe">
              Agreed % Transferred to UJustBe
            </option>
          </select>
        </label>

        <button onClick={() => onUpdate(formState.dealStatus)}>
          Update Status
        </button>
      </div>

      {statusLogs.length > 0 && (
        <div className="statusHistory">
          <h4>Status History</h4>
          <ul>
            {statusLogs.map((log, i) => {
              const ts = log.updatedAt;
              const dateString =
                ts && ts.seconds
                  ? new Date(ts.seconds * 1000).toLocaleString()
                  : ts
                  ? new Date(ts).toLocaleString()
                  : "";
              return (
                <li key={i}>
                  <div className="timelineDot" />
                  <div className="timelineContent">
                    <span className="statusLabel">{log.status}</span>
                    <span className="statusDate">{dateString}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
