// component/referral/FollowupForm.js
import React from "react";

export default function FollowupForm({
  form,
  setForm,
  isEditing,
  onSave,
  onCancel,
}) {
  return (
    <div className="followupForm">
      <h4>{isEditing ? "Edit Follow Up" : "Add Follow Up"}</h4>

      <label>
        Priority:
        <select
          name="priority"
          value={form.priority}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, priority: e.target.value }))
          }
        >
          <option>High</option>
          <option>Medium</option>
          <option>Low</option>
        </select>
      </label>

      <label>
        Next Date:
        <input
          type="date"
          value={form.date}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, date: e.target.value }))
          }
        />
      </label>

      <label>
        Description:
        <textarea
          value={form.description}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, description: e.target.value }))
          }
        />
      </label>

      <label>
        Status:
        <select
          value={form.status}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, status: e.target.value }))
          }
        >
          <option>Pending</option>
          <option>Completed</option>
        </select>
      </label>

      <div className="formButtons">
        <button type="button" onClick={onSave}>
          {isEditing ? "Update Follow Up" : "Save Follow Up"}
        </button>
        <button
          type="button"
          className="cancelBtn"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
