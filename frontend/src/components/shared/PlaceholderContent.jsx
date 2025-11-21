// src/components/shared/PlaceholderContent.jsx
import React from "react";
import { HiOutlineInformationCircle } from "react-icons/hi";

const PlaceholderContent = ({ title, note }) => (
  <div className="bg-white p-8 rounded-2xl shadow-sm ring-1 ring-gray-200">
    <div className="flex items-start gap-3">
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gray-50 ring-1 ring-gray-200">
        <HiOutlineInformationCircle className="h-5 w-5 text-gray-600" />
      </span>
      <div>
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        <p className="mt-1 text-gray-600">
          {note || "This feature is under development and will be available soon."}
        </p>
      </div>
    </div>
  </div>
);

export default PlaceholderContent;
