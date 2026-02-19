// components/referral/ProgressRing.js
import React from "react";

export default function ProgressRing({
  size = 40,
  strokeWidth = 4,
  progress = 0,
}) {
  const clamped = Math.max(0, Math.min(100, progress));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <svg
      width={size}
      height={size}
      className="progressRing"
      viewBox={`0 0 ${size} ${size}`}
    >
      <circle
        className="progressRingTrack"
        strokeWidth={strokeWidth}
        fill="transparent"
        cx={size / 2}
        cy={size / 2}
        r={radius}
      />
      <circle
        className="progressRingFill"
        strokeWidth={strokeWidth}
        fill="transparent"
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
      />
      <text
        x="50%"
        y="50%"
        dominantBaseline="middle"
        textAnchor="middle"
        className="progressRingText"
      >
        {clamped}%
      </text>
    </svg>
  );
}
