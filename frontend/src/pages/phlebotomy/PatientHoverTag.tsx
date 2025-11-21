import React from "react";

type PatientHoverTagProps = {
  name: string;
  labId?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  wardName?: string | null;
};

// Simple age calculator
const calcAge = (dob?: string | null) => {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;

  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;

  return age;
};

const PatientHoverTag: React.FC<PatientHoverTagProps> = ({
  name,
  labId,
  gender,
  dateOfBirth,
  wardName,
}) => {
  const age = calcAge(dateOfBirth);

  return (
    <div className="relative inline-flex group">
      {/* What is always visible */}
      <span className="text-sm font-medium text-blue-700 cursor-help underline-offset-2 group-hover:underline">
        {name}
      </span>

      {/* Hover card */}
      <div className="absolute left-0 top-full mt-2 z-40 hidden w-64 rounded-xl border border-gray-200 bg-white p-3 text-xs shadow-xl group-hover:block">
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold text-gray-800">Patient details</span>
          {labId && (
            <span className="text-[11px] text-gray-400 font-mono">
              Lab ID: {labId}
            </span>
          )}
        </div>

        <dl className="space-y-1">
          <div className="flex justify-between">
            <dt className="text-gray-500">Age</dt>
            <dd className="font-medium text-gray-800">
              {age != null ? `${age} yrs` : "—"}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Gender</dt>
            <dd className="font-medium text-gray-800">
              {gender || "—"}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Ward</dt>
            <dd className="font-semibold text-emerald-700">
              {wardName || "OPD / Walk-in"}
            </dd>
          </div>
        </dl>

        <p className="mt-2 text-[11px] text-gray-400">
          Use the ward to know where to collect the sample.
        </p>
      </div>
    </div>
  );
};

export default PatientHoverTag;
