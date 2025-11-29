import React from "react";

const MentorInfo = ({ mentor }) => {
  return (
    <div className="mentor-info">
      <div className="input-group">
        <label>Mentor Name</label>
        <input type="text" value={mentor?.Name || ""} disabled />
      </div>

      <div className="input-group">
        <label>Mentor Phone</label>
        <input type="text" value={mentor?.MobileNo || ""} disabled />
      </div>

      <div className="input-group">
        <label>Mentor Email</label>
        <input type="text" value={mentor?.Email || ""} disabled />
      </div>
    </div>
  );
};

export default MentorInfo;
