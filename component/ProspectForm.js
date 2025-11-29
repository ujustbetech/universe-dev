import React from "react";

const ProspectForm = ({ formData, onChange, onSubmit }) => {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <div className="input-group">
        <label>Prospect Name</label>
        <input
          type="text"
          value={formData.prospectName}
          onChange={(e) => onChange("prospectName", e.target.value)}
          required
        />
      </div>

      <div className="input-group">
        <label>Prospect Phone</label>
        <input
          type="text"
          value={formData.prospectPhone}
          onChange={(e) => onChange("prospectPhone", e.target.value)}
          required
        />
      </div>

      <div className="input-group">
        <label>Prospect Email</label>
        <input
          type="text"
          value={formData.prospectEmail}
          onChange={(e) => onChange("prospectEmail", e.target.value)}
        />
      </div>

      <div className="input-group">
        <label>Occupation</label>
        <select
          value={formData.occupation}
          onChange={(e) => onChange("occupation", e.target.value)}
        >
          <option>Select</option>
          <option>Service</option>
          <option>Student</option>
          <option>Retired</option>
          <option>Business</option>
          <option>Professional</option>
          <option>Housewife</option>
          <option>Other</option>
        </select>
      </div>

      <div className="input-group">
        <label>Hobbies</label>
        <input
          type="text"
          value={formData.hobbies}
          onChange={(e) => onChange("hobbies", e.target.value)}
        />
      </div>

      <div className="input-group">
        <label>Source</label>
        <select
          value={formData.source}
          onChange={(e) => onChange("source", e.target.value)}
        >
          <option value="close_connect">Close Connect</option>
          <option value="colleague">Colleague</option>
          <option value="relative">Relative</option>
          <option value="other">Other</option>
        </select>
      </div>

      <button className="save-button" type="submit">
        Add Prospect
      </button>
    </form>
  );
};

export default ProspectForm;