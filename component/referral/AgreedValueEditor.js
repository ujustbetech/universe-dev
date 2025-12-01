// components/admin/AgreedValueEditor.jsx
import React from "react";

const emptySingle = { type: "percentage", value: "" };
const makeSlab = () => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  from: "",
  to: "",
  type: "percentage",
  value: "",
});

export default function AgreedValueEditor({ value, onChange, label = "Agreed Value" }) {
  const mode = value?.mode || "single";

  const handleModeChange = (newMode) => {
    if (newMode === "single") {
      onChange({
        mode: "single",
        single: value?.single || { ...emptySingle },
      });
    } else {
      onChange({
        mode: "multiple",
        multiple: {
          slabs: value?.multiple?.slabs?.length
            ? value.multiple.slabs
            : [makeSlab()],
        },
      });
    }
  };

  const single = value?.single || emptySingle;
  const slabs = value?.multiple?.slabs || [];

  const updateSingle = (field, val) => {
    onChange({
      mode: "single",
      single: { ...single, [field]: val },
    });
  };

  const updateSlab = (id, field, val) => {
    const updated = slabs.map((s) =>
      s.id === id ? { ...s, [field]: val } : s
    );
    onChange({
      mode: "multiple",
      multiple: { slabs: updated },
    });
  };

  const addSlab = () => {
    onChange({
      mode: "multiple",
      multiple: { slabs: [...slabs, makeSlab()] },
    });
  };

  const removeSlab = (id) => {
    const updated = slabs.filter((s) => s.id !== id);
    onChange({
      mode: "multiple",
      multiple: { slabs: updated.length ? updated : [makeSlab()] },
    });
  };

  return (
    <div className="card agreedValueEditor">
      <h4>{label}</h4>

      {/* Mode toggle */}
      <div className="modeRow">
        <label>
          <input
            type="radio"
            value="single"
            checked={mode === "single"}
            onChange={() => handleModeChange("single")}
          />
          Single
        </label>
        <label>
          <input
            type="radio"
            value="multiple"
            checked={mode === "multiple"}
            onChange={() => handleModeChange("multiple")}
          />
          Slabs
        </label>
      </div>

      {/* Single mode */}
      {mode === "single" && (
        <div className="singleBlock">
          <label>
            Type
            <select
              value={single.type}
              onChange={(e) => updateSingle("type", e.target.value)}
            >
              <option value="percentage">Percentage (%)</option>
              <option value="amount">Fixed Amount (₹)</option>
            </select>
          </label>

          <label>
            Value
            <input
              type="number"
              min="0"
              value={single.value}
              onChange={(e) => updateSingle("value", e.target.value)}
              placeholder={single.type === "percentage" ? "e.g. 2" : "e.g. 5000"}
            />
          </label>
        </div>
      )}

      {/* Slab mode */}
      {mode === "multiple" && (
        <div className="slabBlock">
          <div className="slabHeader">
            <span>From</span>
            <span>To</span>
            <span>Type</span>
            <span>Value</span>
            <span />
          </div>

          {slabs.map((slab) => (
            <div className="slabRow" key={slab.id}>
              <input
                type="number"
                min="0"
                value={slab.from}
                onChange={(e) => updateSlab(slab.id, "from", e.target.value)}
                placeholder="0"
              />
              <input
                type="number"
                min="0"
                value={slab.to}
                onChange={(e) => updateSlab(slab.id, "to", e.target.value)}
                placeholder="50000"
              />
              <select
                value={slab.type}
                onChange={(e) => updateSlab(slab.id, "type", e.target.value)}
              >
                <option value="percentage">% (of deal)</option>
                <option value="amount">₹ (fixed)</option>
              </select>
              <input
                type="number"
                min="0"
                value={slab.value}
                onChange={(e) => updateSlab(slab.id, "value", e.target.value)}
                placeholder="2 or 5000"
              />
              <button
                type="button"
                className="slabRemoveBtn"
                onClick={() => removeSlab(slab.id)}
              >
                ✕
              </button>
            </div>
          ))}

          <button type="button" className="slabAddBtn" onClick={addSlab}>
            + Add Slab
          </button>
        </div>
      )}
    </div>
  );
}
