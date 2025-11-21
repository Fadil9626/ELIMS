// src/components/shared/NavCard.jsx
import React from "react";

const NavCard = ({ icon: Icon, label, description, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="
        group flex items-start gap-4 p-4 w-full text-left rounded-xl shadow-sm 
        border border-gray-200 bg-white hover:bg-gray-50 transition
      "
    >
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 ring-1 ring-blue-100">
        <Icon className="h-6 w-6 text-blue-600" />
      </span>

      <div>
        <h3 className="font-semibold text-gray-900">{label}</h3>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
    </button>
  );
};

export default NavCard;
